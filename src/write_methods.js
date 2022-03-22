import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fs = require("fs");

/**
 * Outputs the given object as a .json file with the given file name
 * @exports
 * @func
 * @param {object} matches JavaScript Object Notation (JSON) object of matches made between supervisors and students
 * @param {string} fileName filename
 * @throws {NodeJS.ErrnoException}
 */
export const writeToJson = (matches, fileName) => {
    var json = JSON.stringify(matches);
    fs.writeFile(fileName, json, "utf8", (err) => {
        if (err) {
            throw err;
        }
    });
};

/**
 * Formats matches made between supervisors and students into a more human-readable format
 * @func
 * @param {object} unformattedMatches JavaScript Object Notation (JSON) object of matches made between supervisors and students
 * @returns {object} a human-readble version of the unformattedMatches paramter
 */
const formatMatches = (unformattedMatches) => {
    // Only include the supervisorResponseId, capacity of that supervisor, and the matches made with them
    var formattedMatches = [];
    unformattedMatches.matches.forEach((supervisor) => {
        var matches = [];
        supervisor.matchedStudentResponses.forEach((student) => {
            matches.push({
                studentResponseId: student.studentResponse.responseId,
                commonAcmKeyword: student.commonAcmKeyword,
            });
        });
        formattedMatches.push({
            supervisorResponseId: supervisor.supervisorResponse.responseId,
            capacity: supervisor.supervisorResponse.capacity,
            matches,
        });
    });
    return formattedMatches;
};

/**
 * Formats matches made between supervisors and students into a more human-readable format
 * and outputs the result to a .json file with the given file Name
 * @xports
 * @func
 * @param {object} unformattedMatches JavaScript Object Notation (JSON) object of matches made between supervisors and students
 * @param {string} fileName filename
 */
export const formatAndWriteToJson = (unformattedMatches, fileName) => {
    writeToJson(formatMatches(unformattedMatches), fileName);
};
