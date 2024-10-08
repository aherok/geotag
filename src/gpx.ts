import { readFile } from 'fs/promises';
import { parseStringPromise } from 'xml2js'


type Waypoint = {
  $: {
    lat: number,
    lon: number,
  }
  ele?: [number]
  time?: Date
  extensions: any[]
}

type GPXData = {
  $: {},
  metadata: {}[]
  trk: {
    name: string
    type: string
    trkseg: {
      trkpt: Waypoint[]
    }[]
  }[]
}

type ParsedMeta = {
  name: string
  startDate: Date
  endDate: Date
}

interface ParsedGPXData extends GPXData {
  $$: ParsedMeta
}


// Function to load GPX data from a GPX file
async function loadGPX(gpxPath: string): Promise<GPXData> {
  const gpxContents = await readFile(gpxPath, 'utf-8')
  return (await parseStringPromise(gpxContents)).gpx;
}

/**
 * Load all files and prepare them. 
 * @WARNING the code assumes simplified GPX files are being loaded, containing only one track.
 * The start & end dates for each GPX file are taken from the first track in the file.
 * 
 * @param paths list of gpx files paths
 * @returns 
 */
export async function loadGPXFiles(paths: string[]): Promise<ParsedGPXData[]> {
  const files = await Promise.all(paths.map(gpxFile => loadGPX(gpxFile)));


  return files.map(gpx => {
    const track = gpx.trk[0]
    return {
      ...gpx,
      $$: {
        name: track.name,
        startDate: track.trkseg[0].trkpt[0].time!,
        endDate: track.trkseg[0].trkpt[track.trkseg[0].trkpt.length - 1].time!,
      }
    }
  })
}

// Function to find coordinates for a given date in GPX data
export function findCoordinates(gpxData: ParsedGPXData[], targetTime: Date, precision: number) {
  let closestWaypoint: Waypoint | null = null;
  let minDistance = Infinity;
  let currentFile: ParsedGPXData;


  // console.log(targetTime, typeof targetTime)
  for (const gpxFile of gpxData) {

    // omit GPX file if the targetDate is not between GPX dates
    // the dates are expanded to the `precision` seconds
    const startDate = new Date(gpxFile.$$.startDate)
    const endDate = new Date(gpxFile.$$.endDate)

    if (precision > 0) {
      startDate.setUTCSeconds(startDate.getUTCSeconds() - precision);
      endDate.setUTCSeconds(endDate.getUTCSeconds() + precision);
    }

    // console.log(` -- Check inside: ${gpxFile.$$.name}
    //   start:  ${startDate.toISOString()}
    //   target: ${targetTime.toISOString()}
    //   end:    ${endDate.toISOString()}
    //   -`)

    if (targetTime < startDate || targetTime > endDate) {
      continue
    }

    for (const track of gpxFile.trk) {
      for (const segment of track.trkseg) {
        for (const point of segment.trkpt) {
          if (!point.time) break
          const pointTime = new Date(point.time)
          const timeDiff = Math.abs(targetTime.valueOf() - pointTime.valueOf());

          if (timeDiff < minDistance) {
            currentFile = gpxFile;
            closestWaypoint = point;
            minDistance = timeDiff;

            if (minDistance === 0) {
              break
            }
          }
        }
      }
    }
  }

  // found any roughly close point
  if (closestWaypoint) {
    // @TODO add a condition to return only the same dated values
    // return only if time distance is acceptably small (+2secs)

    if (minDistance <= (precision * 1000)) {
      return {
        location: closestWaypoint.$,
        timeDiff: minDistance
      }
    }
  }
}
