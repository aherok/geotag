"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readEXIF = readEXIF;
exports.getImageCreationDate = getImageCreationDate;
exports.getImageCoords = getImageCoords;
exports.saveImageCoords = saveImageCoords;
const exifr_1 = __importDefault(require("exifr"));
function readEXIF(imagePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return exifr_1.default.parse(imagePath);
    });
}
// actually the return type is ExifDateTime .. 
function getImageCreationDate(imagePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const exifData = yield exifr_1.default.parse(imagePath);
        return exifData.CreateDate;
    });
}
/**
 * Returns coords saved in image EXIF data
 * @param imagePath path to the image
 * @returns Promise with coords array or null if not found
 */
function getImageCoords(imagePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const exifData = yield exifr_1.default.parse(imagePath);
        const [lat, lon] = [exifData.GPSLatitude, exifData.GPSLongitude];
        if (lat && lon)
            return [lat, lon];
        return null;
    });
}
function saveImageCoords(imagePath, coords, creationDate, exiftool) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.info(` + Writing coords to file ${imagePath} [${coords.lat}] ...`)
        const data = {
            GPSLatitude: coords.lat,
            GPSLatitudeRef: coords.lat > 0 ? 'North' : 'South',
            GPSLongitude: coords.lon,
            GPSLongitudeRef: coords.lat > 0 ? 'East' : 'West',
            GPSDateStamp: creationDate.toISOString(),
            GPSTimeStamp: creationDate.toISOString(),
            GPSProcessingMethod: 'GPS',
            GPSAltitudeRef: "0",
        };
        return exiftool.write(imagePath, data);
    });
}
//# sourceMappingURL=exif.js.map