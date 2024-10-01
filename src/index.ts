#! /usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Coords, getImageCoords, getImageCreationDate, saveImageCoords } from './exif';
import { ExifTool } from 'exiftool-vendored';
import { findCoordinates, loadGPXFiles } from './gpx';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import cliProgress from 'cli-progress'


const allowedExtensions = ['.jpg', '.jpeg', '.dng', '.arw'];


async function getImages(dir: string) {
  return fs.readdirSync(dir).filter(file => allowedExtensions.some(ext => file.toLowerCase().endsWith(ext)));
}

async function getGPXFiles(dir: string) {
  return fs.readdirSync(dir).filter(file => file.toLowerCase().endsWith('.gpx'));
}

// Main function to geotag files
async function geotagFiles(imageDirectory: string, gpxDir: string, onlyNew: boolean, precision: number, defaultCoords: Coords, removeOriginal: boolean) {
  const coordsPrint = defaultCoords && defaultCoords.lat + ',' + defaultCoords.lon || '(?)'
  console.log(`Starting geotagger...
 * Working dir    : ${imageDirectory}
 * GPX dir        : ${gpxDir}
 * precision      : ${precision}
 * defaultCoords  : ${coordsPrint}
 * removeOriginal : ${removeOriginal}
`)

  const opts = removeOriginal ? { 'writeArgs': ['-overwrite_original'] } : {}
  const et = new ExifTool(opts)

  try {
    // Read all GPX files in the same directory as the images
    const imageFiles = await getImages(imageDirectory)
    console.log(`Found ${imageFiles.length} photos to process...`)

    // Read all GPX files in the same directory as the images
    const gpxFiles = await getGPXFiles(gpxDir)
    console.log(`Found ${gpxFiles.length} GPX files...`)

    // // Load GPX data from all GPX files
    const gpxData = await loadGPXFiles(gpxFiles.map(f => path.join(gpxDir, f)))

    console.log("Parsed GPX files. Starting processing photos...")

    const unchangedList: string[] = []
    const updatedList: string[] = []
    const notFoundCoordsList: string[] = []
    const saveDefaultList: string[] = []

    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_grey);
    bar.start(imageFiles.length, 0);

    // Iterate through image files
    for (const imageFile of imageFiles) {
      const imagePath = path.join(imageDirectory, imageFile);

      const creationDate = await getImageCreationDate(imagePath)
      const imageCoords = await getImageCoords(imagePath)

      // save new coords only if there are no coords already or the onlyNew flag is false
      if (!imageCoords || !onlyNew) {

        // Find coordinates for the creation date in GPX data
        const coordinates = findCoordinates(gpxData, creationDate as Date, precision);

        if (coordinates) {
          await saveImageCoords(imagePath, coordinates.location, creationDate, et)
          updatedList.push(imagePath)
        } else {
          // console.log(`Coords not found for file:\n - ${imagePath}\n - ${creationDate.toISOString()}`)

          if (defaultCoords) {
            await saveImageCoords(imagePath, defaultCoords, creationDate, et)
            saveDefaultList.push(imagePath)
          } else {
            notFoundCoordsList.push(imagePath)

          }
        }
      }
      if (imageCoords && onlyNew) {
        // opposite
        unchangedList.push(imagePath)
      }
      bar.increment()
    }
    bar.stop();

    if (notFoundCoordsList.length) {
      console.log(`\nFiles with no found coordinates:\n  - ${notFoundCoordsList.join('\n  - ')}\n`)
    }
    if (saveDefaultList.length) {
      console.log(`\nSaved default coordinates:\n  - ${saveDefaultList.join('\n  - ')}\n`)
    }

    console.log(`Updated ${updatedList.length} files.`)


  } catch (error) {
    console.error('Error:', error);
  } finally {
    et.end()
  }
}

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <image-directory> --gpxDir <gpx_dir_name> --onlyNew <true|false> --precision <seconds> --defaultCoords <lat,lon>')
  .example([
    ['$0 ~/photos/', 'geotag all images in the specified dir using the GPX files found there.'],
    ['$0 ~/photos/ --only-new 1 --gpx-dir ~/gpx/ --precision 3600 --default-coords 18.2,50,5', 'Fully fledged example']
  ])
  .options({
    'gpx-dir': {
      default: null,
      describe: 'Specify where to look for source GPX files. If none specified, the images directory will be searched through.',
    },
    'only-new': {
      default: false,
      describe: 'If true, the script will omit images that already contain geo data.',
      type: 'boolean'
    },
    'precision': {
      default: 60,
      describe: 'Specify the time difference (in seconds) between the image timestamp and GPX timestamps to be still acceptable.',
    },
    'default-coords': {
      default: null,
      describe: 'Coordinates to set if not found in any GPX file. Treat it as a last resort or when you want to manually set the coordinates.',
      coerce: coords => {
        if (!coords) return null
        const [lat, lon] = coords.split(',').map(parseFloat)
        return { lat, lon } as Coords
      }
    },
    'remove-original': {
      alias: 'rm',
      default: false,
      describe: 'By default, Exiftool keeps the original file copy by appending `_original` to the file name. If set to true, the copy will not be created.'
    }
  })
  .parseSync();

const imageDirectory: string = argv['_'][0] as string
const onlyNew: boolean = !!argv['onlyNew']
const precision: number = argv['precision']
const defaultCoords = argv['defaultCoords']
const gpxDir: string = argv['gpxDir'] || imageDirectory
const removeOriginal: boolean = !!argv['removeOriginal']

if (!imageDirectory) {
  console.error('\n\n! Please provide an image directory as an argument.\n\n');
  process.exit(1);
}

if (precision < 60) {
  console.info(`\nNOTICE: Setting the precision to a value lower than 1 minute (${precision} secs) may result 
in lower effectiveness.\n`)
}

geotagFiles(imageDirectory, gpxDir, onlyNew, precision, defaultCoords!, removeOriginal);
