import {
    getACMTableRecords,
    getStudentResponseTableRecords,
    getSupervisorACMTableRecords,
    getTopicToACMMapTableRecords,
    getSupervisorResponseTableRecords,
} from "./get_methods.js";

import { createRequire } from "module";
import { parse } from "path";
import { versions } from "process";
const require = createRequire(import.meta.url);
const fs = require("fs");

const getParsedStudentResponses = async () => {
    var topicToACMMaps = await getTopicToACMMapTableRecords();
    var studentResponses = await getStudentResponseTableRecords();
    var acmRecordIds = await getACMTableRecords();

    var parsedStudentResponses = [];

    studentResponses.forEach((response) => {
        // Ignores student respones that don't contain three choices from the topics list
        if (response.choices.every((choice) => choice !== undefined)) {
            var realACMKeywords = [];
            response.choices.forEach((roughChoiceID, index) => {
                topicToACMMaps
                    .filter(
                        (topicMap) => topicMap.topicRecordId == roughChoiceID
                    )
                    .forEach((topicMap) => {
                        var realACMKeywordId = acmRecordIds.find(
                            (acmRecordId) => acmRecordId == topicMap.acmRecordId
                        );
                        realACMKeywords.push({
                            acmRecordId: realACMKeywordId,
                            priority: index + 1,
                        });
                    });
            });
            parsedStudentResponses.push({
                responseId: response.responseId,
                acmKeywords: realACMKeywords,
                choices: response.choices,
            });
        }
    });
    return parsedStudentResponses;
};

const getParsedSupervisorResponses = async () => {
    // Get the required unparsed supervisor responses and acm keyword data
    var supervisorResponses = await getSupervisorACMTableRecords();
    var supervisorCapacities = await getSupervisorResponseTableRecords();
    var acmRecordIds = await getACMTableRecords();

    var parsedSupervisorResponses = [];

    supervisorResponses.forEach((response) => {
        // Get the actual acm keyword from the acm's GUID
        var realACMKeywordId = acmRecordIds.find(
            (acmRecordId) => acmRecordId == response.acmRecordId
        );

        // If there is already a parsed response with the same ID, append the keyword to that object's array
        var alreadyExists = parsedSupervisorResponses.some(
            (item) => item.responseId === response.responseId
        );

        if (alreadyExists) {
            parsedSupervisorResponses.forEach((item) => {
                item.responseId === response.responseId &&
                    item.acmKeywords.push(realACMKeywordId);
            });
        } else {
            // Else add a new parsed supervisor response object to the array
            parsedSupervisorResponses.push({
                responseId: response.responseId,
                acmKeywords: [realACMKeywordId],
            });
        }
    });

    // Adds the capacity of each supervisor to each parsd supervisor response object
    supervisorCapacities.forEach(({ supervisorId, capacity }) => {
        parsedSupervisorResponses.find(
            (response) => response.responseId == supervisorId
        ).capacity = capacity;
    });

    return parsedSupervisorResponses;
};

const writetoJSON = (matches, fileName) => {
    var json = JSON.stringify(matches);
    fs.writeFile(fileName, json, "utf8", (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved.");
    });
};

(async function match() {
    var parsedStudentResponses = await getParsedStudentResponses();
    //writetoJSON(parsedStudentResponses, "student_responses.json");
    var parsedSupervisorResponses = await getParsedSupervisorResponses();
    //writetoJSON(parsedSupervisorResponses, "supervisor_responses.json");
    var allMatches = [];

    var bins = [];

    parsedSupervisorResponses.forEach((supervisorResponse) => {
        var matches = [];
        var takenSpaces = 0;

        parsedStudentResponses.forEach((studentResponse) => {
            studentResponse.acmKeywords.forEach(({ acmRecordId, priority }) => {
                if (supervisorResponse.acmKeywords.includes(acmRecordId)) {
                    var alreadyExists = matches.some(
                        (match) =>
                            match.studentResponseId ===
                            studentResponse.responseId
                    );

                    if (alreadyExists) {
                        matches
                            .find(
                                (match) =>
                                    match.studentResponseId ===
                                    studentResponse.responseId
                            )
                            .commonACMKeywordId.push(acmRecordId);
                    } else {
                        matches.push({
                            studentResponseId: studentResponse.responseId,
                            commonACMKeywordId: [acmRecordId],
                            studentsChoices: studentResponse.choices,
                        });
                        takenSpaces += 1;
                    }
                }
            });
        });
        allMatches.push({
            supervisorResponseId: supervisorResponse.responseId,
            matchedStudentResponses: matches,
        });
        bins.push({
            supervisorResponseId: supervisorResponse.responseId,
            capacity: supervisorResponse.capacity,
            takenSpaces,
        });
    });
    console.log(bins);
    writetoJSON({ matches: allMatches }, "matches.json");
})();

/*
+----------------------------------------------===USAGE===-----------------------------------------------+
|    Admin will be able to run the code from a page using a button, or triggered by daily automatic flow |
|    When this code is run, the generated JSON is used to populated a 'matches' table                    |
|    Admin is presented with all matches that were made [All initially presented as 'PENDING' status]    | 
|    Admin can manually approve or reject matches                                                        |
|        Approved matches have their status updated to 'APPROVED'                                        |
|        Rejected matches are removed from the table and are sent back into this algorithm               |
|    This repeats until the administrator is satsified with the results                                  |
|    They will also have an option to start again, removing all matches                                  |
=--------------------------------------------------------------------------------------------------------+
*/

/*                                       ===ALGORITHM IDEAS=== 
    Evenly spread matches across the professes based on the supervisers capacity.
    Should match all first choices first then second choices then third choices.


    Make all possible matches then go through and assign students to professors.

*/
