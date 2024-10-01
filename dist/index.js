#! /usr/bin/env node
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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const exif_1 = require("./exif");
const exiftool_vendored_1 = require("exiftool-vendored");
const gpx_1 = require("./gpx");
const yargs_1 = __importDefault(require("yargs/yargs"));
const helpers_1 = require("yargs/helpers");
const cli_progress_1 = __importDefault(require("cli-progress"));
const allowedExtensions = ['.jpg', '.jpeg', '.dng', '.arw'];
function getImages(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        return fs_1.default.readdirSync(dir).filter(file => allowedExtensions.some(ext => file.toLowerCase().endsWith(ext)));
    });
}
function getGPXFiles(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        return fs_1.default.readdirSync(dir).filter(file => file.toLowerCase().endsWith('.gpx'));
    });
}
// Main function to geotag files
function geotagFiles(imageDirectory, gpxDir, onlyNew, precision, defaultCoords) {
    return __awaiter(this, void 0, void 0, function* () {
        const coordsPrint = defaultCoords && defaultCoords.lat + ',' + defaultCoords.lon || '(?)';
        console.log(`Starting geotagger...
 * Working dir   : ${imageDirectory}
 * GPX dir       : ${gpxDir}
 * precision     : ${precision}
 * defaultCoords : ${coordsPrint}
`);
        try {
            // Read all GPX files in the same directory as the images
            const imageFiles = yield getImages(imageDirectory);
            console.log(`Found ${imageFiles.length} photos to process...`);
            // Read all GPX files in the same directory as the images
            const gpxFiles = yield getGPXFiles(gpxDir);
            console.log(`Found ${gpxFiles.length} GPX files...`);
            // // Load GPX data from all GPX files
            const gpxData = yield (0, gpx_1.loadGPXFiles)(gpxFiles.map(f => path_1.default.join(gpxDir, f)));
            console.log("Parsed GPX files. Starting processing photos...");
            const unchangedList = [];
            const updatedList = [];
            const notFoundCoordsList = [];
            const saveDefaultList = [];
            const bar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_grey);
            bar.start(imageFiles.length, 0);
            // Iterate through image files
            for (const imageFile of imageFiles) {
                const imagePath = path_1.default.join(imageDirectory, imageFile);
                const creationDate = yield (0, exif_1.getImageCreationDate)(imagePath);
                const imageCoords = yield (0, exif_1.getImageCoords)(imagePath);
                // save new coords only if there are no coords already or the onlyNew flag is false
                if (!imageCoords || !onlyNew) {
                    // Find coordinates for the creation date in GPX data
                    const coordinates = (0, gpx_1.findCoordinates)(gpxData, creationDate, precision);
                    if (coordinates) {
                        yield (0, exif_1.saveImageCoords)(imagePath, coordinates.location, creationDate, exiftool_vendored_1.exiftool);
                        updatedList.push(imagePath);
                    }
                    else {
                        // console.log(`Coords not found for file:\n - ${imagePath}\n - ${creationDate.toISOString()}`)
                        if (defaultCoords) {
                            yield (0, exif_1.saveImageCoords)(imagePath, defaultCoords, creationDate, exiftool_vendored_1.exiftool);
                            saveDefaultList.push(imagePath);
                        }
                        else {
                            notFoundCoordsList.push(imagePath);
                        }
                    }
                }
                if (imageCoords && onlyNew) {
                    // opposite
                    unchangedList.push(imagePath);
                }
                bar.increment();
            }
            bar.stop();
            if (notFoundCoordsList.length) {
                console.log(`\nFiles with no found coordinates:\n  - ${notFoundCoordsList.join('\n  - ')}\n`);
            }
            if (saveDefaultList.length) {
                console.log(`\nSaved default coordinates:\n  - ${saveDefaultList.join('\n  - ')}\n`);
            }
            console.log(`Updated ${updatedList.length} files.`);
        }
        catch (error) {
            console.error('Error:', error);
        }
        finally {
            exiftool_vendored_1.exiftool.end();
        }
    });
}
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
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
            if (!coords)
                return null;
            const [lat, lon] = coords.split(',').map(parseFloat);
            return { lat, lon };
        }
    },
})
    .parseSync();
const imageDirectory = argv['_'][0];
const onlyNew = argv['onlyNew'];
const precision = argv['precision'];
const defaultCoords = argv['defaultCoords'];
const gpxDir = argv['gpxDir'] || imageDirectory;
if (!imageDirectory) {
    console.error('\n\n! Please provide an image directory as an argument.\n\n');
    process.exit(1);
}
if (precision < 60) {
    console.info(`\nNOTICE: Setting the precision to a value lower than 1 minute (${precision} secs) may result 
in lower effectiveness.\n`);
}
geotagFiles(imageDirectory, gpxDir, onlyNew, precision, defaultCoords);
//# sourceMappingURL=index.js.map