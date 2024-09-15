import fs from 'fs';
import path from 'path';
import { Coords, getImageCoords, getImageCreationDate, saveImageCoords } from './exif';
import { exiftool } from 'exiftool-vendored';
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
async function geotagFiles(imageDirectory: string, gpxDir: string, onlyNew: boolean, approxHours, defaultCoords?: Coords) {
  console.log(`Starting geotagger...
 * Working dir   : ${imageDirectory}
 * GPX dir       : ${gpxDir}
 * approxHours   : ${approxHours}
 * defaultCoords : [${defaultCoords?.lat},${defaultCoords?.lon}]
`)

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
        const coordinates = findCoordinates(gpxData, creationDate as Date, approxHours);

        if (coordinates) {
          await saveImageCoords(imagePath, coordinates.location, creationDate, exiftool)
          updatedList.push(imagePath)
        } else {
          // console.log(`Coords not found for file:\n - ${imagePath}\n - ${creationDate.toISOString()}`)

          if (defaultCoords) {
            await saveImageCoords(imagePath, defaultCoords, creationDate, exiftool)
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
    exiftool.end()
  }
}

const argv = yargs(hideBin(process.argv)).argv
const imageDirectory = argv['_'][0]
const onlyNew: boolean = !!argv['onlyNew']
const approxHours: number = argv['approxHours'] || 0
const defaultCoordsArg: string = argv['defaultCoords']
const gpxDir: string = argv['gpxDir'] || imageDirectory

if (!imageDirectory) {
  console.error('\n\n! Please provide an image directory as an argument.\n\n');
  process.exit(1);
}

let defaultCoords: Coords
if (defaultCoordsArg) {
  try {
    const [lat, lon] = defaultCoordsArg.split(',').map(parseFloat)
    defaultCoords = { lat, lon }
  } catch (err) {
    console.error("Could not parse defaultCoords param: ", err)
  }
}


geotagFiles(imageDirectory, gpxDir, onlyNew, approxHours, defaultCoords!);
