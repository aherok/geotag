import { readFile } from 'fs/promises';
import GPX from 'gpx-parser-builder';
import Waypoint from 'gpx-parser-builder/src/waypoint';


type GPXData = {
  $: {},
  metadata: {}[]
  trk: {
    trkseg: {
      name: string
      type: string
      trkpt: {
        $: {
          lat: number,
          lon: number,
        }
        ele?: [number]
        time?: string
        extensions: any[]
      }[]
    }[]
  }[]
}

// Function to load GPX data from a GPX file
export async function loadGPX(gpxPath: string) {
  const gpxContents = await readFile(gpxPath, 'utf-8')
  return GPX.parse(gpxContents);
}

// Function to find coordinates for a given date in GPX data
export function findCoordinates(gpxData: GPXData[], targetTime: Date) {
  let closestWaypoint: Waypoint | null = null;
  let minDistance = Infinity;

  for (const gpxFile of gpxData) {
    for (const track of gpxFile.trk) {
      for (const segment of track.trkseg) {
        for (const point of segment.trkpt) {
          if (!point.time) break
          const pointTime = new Date(point.time)
          const timeDiff = Math.abs(targetTime.valueOf() - pointTime.valueOf());

          if (timeDiff < minDistance) {
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

  if (closestWaypoint && minDistance < 30) {
    return {
      location: closestWaypoint.$,
      timeDiff: minDistance
    }
  }
}
