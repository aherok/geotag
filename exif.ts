import exifr from 'exifr';
import { ExifTool } from 'exiftool-vendored';

type Coords = {
  lat: number,
  lon: number
}
export async function readEXIF(imagePath: string) {
  return exifr.parse(imagePath)
}

export async function getImageCreationDate(imagePath: string) {
  const exifData = await exifr.parse(imagePath)
  return exifData.CreateDate
}
export async function saveImageCoords(imagePath: string, coords: Coords, exiftool: ExifTool) {
  console.info(` + Writing coords to file ${imagePath} [${coords.lat}] ...`)
  return exiftool.write(imagePath, { GPSLatitude: coords.lat, GPSLongitude: coords.lon })
}
