import fs from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import GPX from 'gpx-parser-builder';
import Waypoint from 'gpx-parser-builder/src/waypoint';
import { getImageCreationDate, saveImageCoords } from './exif';
import { exiftool } from 'exiftool-vendored';


const allowedExtensions = ['.jpg', '.jpeg', '.dng', '.arw'];


// Function to load GPX data from a GPX file
async function loadGPX(gpxPath: string) {
  const gpxContents = await readFile(gpxPath, 'utf-8')
  return GPX.parse(gpxContents);
}

// Function to find coordinates for a given date in GPX data
function findCoordinates(gpxData: GPX, targetTime: string) {
  let closestWaypoint: Waypoint | null = null;
  let minDistance = Infinity;

  for (const gpxFile of gpxData) {
    for (const track of gpxFile.trk) {
      for (const segment of track.trkseg) {
        for (const point of segment.trkpt) {
          const pointTime = new Date(point.time)
          const timeDiff = Math.abs(targetTime - pointTime);

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
      console.log("+ got coords:", coordinates)

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