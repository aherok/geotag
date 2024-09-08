import fs from 'fs';
import path from 'path';
import { getImageCreationDate, saveImageCoords } from './exif';
import { exiftool } from 'exiftool-vendored';
import { findCoordinates, loadGPX } from './gpx';


const allowedExtensions = ['.jpg', '.jpeg', '.dng', '.arw'];


async function getImages(dir: string) {
  return fs.readdirSync(dir).filter(file => allowedExtensions.some(ext => file.toLowerCase().endsWith(ext)));
}

async function getGPXFiles(dir: string) {
  return fs.readdirSync(dir).filter(file => file.toLowerCase().endsWith('.gpx'));
}

// Main function to geotag files
async function geotagFiles(imageDirectory: string) {
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

    // Iterate through image files
    for (const imageFile of imageFiles) {
      const imagePath = path.join(imageDirectory, imageFile);
      console.log("parsing file: ", imagePath)

      const creationDate = await getImageCreationDate(imagePath)

      // Find coordinates for the creation date in GPX data
      const coordinates = findCoordinates(gpxData, creationDate);
      console.log(" + got coords.")

      if (coordinates) {
        await saveImageCoords(imagePath, coordinates.location, exiftool)
      }

    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log("ending Exiftool")
    exiftool.end()
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);
const imageDirectory = args[0];

if (!imageDirectory) {
  console.error('\n\n! Please provide an image directory as an argument.\n\n');
  process.exit(1);
}

geotagFiles(imageDirectory);