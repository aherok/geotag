import fs from 'fs';
import path from 'path';
import { getImageCoords, getImageCreationDate, saveImageCoords } from './exif';
import { exiftool } from 'exiftool-vendored';
import { findCoordinates, loadGPX } from './gpx';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

type Coords = {
  lat: number,
  lon: number
}

const allowedExtensions = ['.jpg', '.jpeg', '.dng', '.arw'];


async function getImages(dir: string) {
  return fs.readdirSync(dir).filter(file => allowedExtensions.some(ext => file.toLowerCase().endsWith(ext)));
}

async function getGPXFiles(dir: string) {
  return fs.readdirSync(dir).filter(file => file.toLowerCase().endsWith('.gpx'));
}

// Main function to geotag files
async function geotagFiles(imageDirectory: string, onlyNew: boolean, defaultCoords?: Coords | null) {
  try {
    // Read all GPX files in the same directory as the images
    const imageFiles = await getImages(imageDirectory)
    console.log(`Found ${imageFiles.length} photos to process...`)

    // Read all GPX files in the same directory as the images
    const gpxFiles = await getGPXFiles(imageDirectory)
    console.log(`Found ${gpxFiles.length} GPX files...`)

    // // Load GPX data from all GPX files
    const gpxData = await Promise.all(gpxFiles.map(gpxFile => loadGPX(path.join(imageDirectory, gpxFile))));

    console.log("parsed GPX. start processing photos")

    const unchangedList: string[] = []
    const updatedList: string[] = []
    const notFoundCoordsList: string[] = []

    // Iterate through image files
    for (const imageFile of imageFiles) {
      const imagePath = path.join(imageDirectory, imageFile);

      const creationDate = await getImageCreationDate(imagePath)
      const imageCoords = await getImageCoords(imagePath)

      // save new coords only if there are no coords already and the onlyNew flag is false
      if (!imageCoords || !onlyNew) {

        // Find coordinates for the creation date in GPX data
        const coordinates = findCoordinates(gpxData, creationDate as Date);

        if (coordinates) {
          await saveImageCoords(imagePath, coordinates.location, exiftool)
          updatedList.push(imagePath)
        } else {
          console.log(`Coords not found for file:\n - ${imagePath}\n - ${creationDate.toISOString()}`)
          notFoundCoordsList.push(imagePath)
        }
      }
      if (imageCoords && onlyNew) {
        // opposite
        console.info("Corrds found in file, omitting...")
      }
    }

    console.log(`Updated ${updatedList.length} files. Not found: ${notFoundCoordsList.length}`)


  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log("ending Exiftool")
    exiftool.end()
  }
}

const argv = yargs(hideBin(process.argv)).argv
const imageDirectory = argv['_'][0]
const defaultCoordsArg: string = argv['defaultCoords']
const onlyNew: boolean = !!argv['onlyNew']
let defaultCoords: Coords | null = null;

if (!imageDirectory) {
  console.error('\n\n! Please provide an image directory as an argument.\n\n');
  process.exit(1);
}
if (defaultCoordsArg) {
  const spl = defaultCoordsArg.split(',')
  defaultCoords = { lat: parseFloat(spl[0]), lon: parseFloat(spl[1]) }
}

if (defaultCoords) {
  console.error('\n\n! --defaultCoords not implemented yet. Turn it off.\n\n');
  process.exit(1);
}
geotagFiles(imageDirectory, onlyNew, defaultCoords);
