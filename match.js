import {
    getACMTableRecords,
    getStudentResponseTableRecords,
    getSupervisorACMTableRecords,
    getTopicToACMMapTableRecords,
} from "./get_methods.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fs = require("fs");

const getParsedStudentResponses = async () => {
    var topicToACMMaps = await getTopicToACMMapTableRecords();
    var studentResponses = await getStudentResponseTableRecords();
    var acmRecords = await getACMTableRecords();

    var parsedStudentResponses = [];

    studentResponses.forEach((response) => {
        var realACMKeywords = [];
        response.choices.forEach((roughChoiceID, index) => {
            topicToACMMaps
                .filter((topicMap) => topicMap.topicRecordId == roughChoiceID)
                .forEach((topicMap) => {
                    var realACMKeyword = acmRecords.find(
                        (acm) => acm.acmRecordId == topicMap.acmRecordId
                    );
                    realACMKeywords.push({
                        keyword: realACMKeyword.acmId,
                        priority: index + 1,
                    });
                });
        });
        parsedStudentResponses.push({
            responseId: response.responseId,
            contactName: response.contact,
            acmKeywords: realACMKeywords,
            choices: response.choices,
        });
    });
    return parsedStudentResponses;
};

const getParsedSupervisorResponses = async () => {
    // Get the required unparsed supervisor responses and acm keyword data
    var supervisorResponses = await getSupervisorACMTableRecords();
    var acmRecords = await getACMTableRecords();

    var parsedSupervisorResponses = [];

    supervisorResponses.forEach((response) => {
        // Get the actual acm keyword from the acm's GUID
        var realACMKeyword = acmRecords.find(
            (acm) => acm.acmRecordId == response.acmId
        );

        // If there is already a parsed response with the same ID, append the keyword to that object's array
        var alreadyExists = parsedSupervisorResponses.some(
            (item) => item.responseId === response.responseId
        );

        if (alreadyExists) {
            parsedSupervisorResponses.forEach((item) => {
                item.responseId === response.responseId &&
                    item.acmKeywords.push(realACMKeyword.acmId);
            });
        } else {
            // Else add a new parsed supervisor response object to the array
            parsedSupervisorResponses.push({
                responseId: response.responseId,
                acmKeywords: [realACMKeyword.acmId],
            });
        }
    });
    return parsedSupervisorResponses;
};

const writeMatches = (matches) => {
    var json = JSON.stringify(matches);
    fs.writeFile("matches.json", json, "utf8", (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved.");
    });
};

(async function match() {
    var parsedStudentResponses = await getParsedStudentResponses();
    var parsedSupervisorResponses = await getParsedSupervisorResponses();
    var allMatches = [];

    parsedSupervisorResponses.forEach((supervisorResponse) => {
        var matches = [];

        parsedStudentResponses.forEach((studentResponse) => {
            studentResponse.acmKeywords.forEach((acmKeyword) => {
                supervisorResponse.acmKeywords.includes(acmKeyword.keyword) &&
                    matches.push({
                        studentResponseId: studentResponse.responseId,
                        commonACMKeyword: acmKeyword.keyword,
                        studentsChoices: studentResponse.choices,
                    });
            });
        });
        allMatches.push({
            supervisorResponseId: supervisorResponse.responseId,
            matchedStudentResponses: matches,
        });
    });
    console.log(allMatches);
    writeMatches({ matches: allMatches });
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
