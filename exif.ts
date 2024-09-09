import exifr from 'exifr';
import { ExifTool } from 'exiftool-vendored';

type Coords = {
  lat: number,
  lon: number
}
type SimpleCoords = [number, number]

export async function readEXIF(imagePath: string) {
  return exifr.parse(imagePath)
}

// actually the return type is ExifDateTime .. 
export async function getImageCreationDate(imagePath: string): Promise<Date> {
  const exifData = await exifr.parse(imagePath)
  return exifData.CreateDate as Date
}

/**
 * Returns coords saved in image EXIF data
 * @param imagePath path to the image
 * @returns Promise with coords array or null if not found
 */
export async function getImageCoords(imagePath: string): Promise<SimpleCoords | null> {
  const exifData = await exifr.parse(imagePath)
  const [lat, lon] = [exifData.GPSLatitude, exifData.GPSLongitude]
  if (lat && lon) return [lat, lon]
  return null
}

export async function saveImageCoords(imagePath: string, coords: Coords, exiftool: ExifTool) {
  // console.info(` + Writing coords to file ${imagePath} [${coords.lat}] ...`)
  return exiftool.write(imagePath, { GPSLatitude: coords.lat, GPSLongitude: coords.lon })
}
