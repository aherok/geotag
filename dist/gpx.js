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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGPXFiles = loadGPXFiles;
exports.findCoordinates = findCoordinates;
const promises_1 = require("fs/promises");
const xml2js_1 = require("xml2js");
// Function to load GPX data from a GPX file
function loadGPX(gpxPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const gpxContents = yield (0, promises_1.readFile)(gpxPath, 'utf-8');
        return (yield (0, xml2js_1.parseStringPromise)(gpxContents)).gpx;
    });
}
/**
 * Load all files and prepare them.
 * @WARNING the code assumes simplified GPX files are being loaded, containing only one track.
 * The start & end dates for each GPX file are taken from the first track in the file.
 *
 * @param paths list of gpx files paths
 * @returns
 */
function loadGPXFiles(paths) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield Promise.all(paths.map(gpxFile => loadGPX(gpxFile)));
        return files.map(gpx => {
            const track = gpx.trk[0];
            return Object.assign(Object.assign({}, gpx), { $$: {
                    name: track.name,
                    startDate: track.trkseg[0].trkpt[0].time,
                    endDate: track.trkseg[0].trkpt[track.trkseg[0].trkpt.length - 1].time,
                } });
        });
    });
}
// Function to find coordinates for a given date in GPX data
function findCoordinates(gpxData, targetTime, precision) {
    let closestWaypoint = null;
    let minDistance = Infinity;
    let currentFile;
    // console.log(targetTime, typeof targetTime)
    for (const gpxFile of gpxData) {
        // omit GPX file if the targetDate is not between GPX dates
        // the dates are expanded to the `precision` seconds
        const startDate = new Date(gpxFile.$$.startDate);
        const endDate = new Date(gpxFile.$$.endDate);
        if (precision > 0) {
            startDate.setUTCSeconds(startDate.getUTCSeconds() - precision);
            endDate.setUTCSeconds(endDate.getUTCSeconds() + precision);
        }
        // console.log(` -- Check inside: ${gpxFile.$$.name}
        //   start:  ${startDate.toISOString()}
        //   target: ${targetTime.toISOString()}
        //   end:    ${endDate.toISOString()}
        //   -`)
        if (targetTime < startDate || targetTime > endDate) {
            continue;
        }
        for (const track of gpxFile.trk) {
            for (const segment of track.trkseg) {
                for (const point of segment.trkpt) {
                    if (!point.time)
                        break;
                    const pointTime = new Date(point.time);
                    const timeDiff = Math.abs(targetTime.valueOf() - pointTime.valueOf());
                    if (timeDiff < minDistance) {
                        currentFile = gpxFile;
                        closestWaypoint = point;
                        minDistance = timeDiff;
                        if (minDistance === 0) {
                            break;
                        }
                    }
                }
            }
        }
    }
    // found any roughly close point
    if (closestWaypoint) {
        // @TODO add a condition to return only the same dated values
        // return only if time distance is acceptably small (+2secs)
        if (minDistance <= (precision * 1000)) {
            return {
                location: closestWaypoint.$,
                timeDiff: minDistance
            };
        }
    }
}
//# sourceMappingURL=gpx.js.map