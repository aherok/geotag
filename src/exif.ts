import exifr from 'exifr';
import { ExifTool, Tags } from 'exiftool-vendored';

export type Coords = {
  lat: number,
  lon: number
}
type SimpleCoords = [number, number]

/**
 * Safely parse EXIF. Returns null if file format unsupported ("Unknown file format")
 * or file unreadable. Re-throws other unexpected errors.
 */
async function safeParse(imagePath: string): Promise<any | null> {
  try {
    return await exifr.parse(imagePath)
  } catch (e: any) {
    const msg = (e && e.message) || ''
    if (/Unknown file format/i.test(msg)) {
      return null; // unsupported / corrupt file
    }
    // optionally handle other known benign messages here
    throw e; // propagate truly unexpected errors
  }
}

export async function readEXIF(imagePath: string) {
  return safeParse(imagePath)
}

// actually the return type is ExifDateTime .. 
export async function getImageCreationDate(imagePath: string): Promise<Date | null> {
  const exifData = await safeParse(imagePath)
  if (!exifData) return null
  return exifData.CreateDate as Date || null
}

/**
 * Returns coords saved in image EXIF data
 * @param imagePath path to the image
 * @returns Promise with coords array or null if not found
 */
export async function getImageCoords(imagePath: string): Promise<SimpleCoords | null> {
  const exifData = await safeParse(imagePath)
  if (!exifData) return null
  const [lat, lon] = [exifData.GPSLatitude, exifData.GPSLongitude]
  if (lat && lon) return [lat, lon]
  return null
}

export async function saveImageCoords(imagePath: string, coords: Coords, creationDate: Date, exiftool: ExifTool) {
  // console.info(` + Writing coords to file ${imagePath} [${coords.lat}] ...`)
  const data: Tags = {
    GPSLatitude: coords.lat,
    GPSLatitudeRef: coords.lat > 0 ? 'North' : 'South',
    GPSLongitude: coords.lon,
    GPSLongitudeRef: coords.lat > 0 ? 'East' : 'West',
    GPSDateStamp: creationDate.toISOString(),
    GPSTimeStamp: creationDate.toISOString(),
    GPSProcessingMethod: 'GPS',
    GPSAltitudeRef: "0",
  }
  return exiftool.write(imagePath, data)
}
