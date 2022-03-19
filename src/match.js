import {
    getParsedStudentResponses,
    getParsedSupervisorResponses,
} from "./parse_methods.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fs = require("fs");

const writetoJSON = (matches, fileName) => {
    var json = JSON.stringify(matches);
    fs.writeFile(fileName, json, "utf8", (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved.");
    });
};

const findMatches = async () => {
    var parsedStudentResponses = await getParsedStudentResponses();
    //writetoJSON(parsedStudentResponses, "json/student_responses.json");
    var parsedSupervisorResponses = await getParsedSupervisorResponses();
    //writetoJSON(parsedSupervisorResponses, "json/supervisor_responses.json");
    var allMatches = [];

    parsedSupervisorResponses.forEach((supervisorResponse) => {
        var matches = [];
        var takenSpaces = 0;

        parsedStudentResponses.forEach((studentResponse) => {
            studentResponse.acmKeywords.forEach((acmKeyword) => {
                if (
                    supervisorResponse.acmKeywords.includes(
                        acmKeyword.acmRecordId
                    )
                ) {
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
                            .commonACMKeywordId.push(acmKeyword);
                    } else {
                        matches.push({
                            studentResponseId: studentResponse.responseId,
                            commonACMKeywordId: [acmKeyword],
                            studentsChoices: studentResponse.choices,
                        });
                        takenSpaces += 1;
                    }
                }
            });
        });
        allMatches.push({
            supervisorResponseId: supervisorResponse.responseId,
            capacity: supervisorResponse.capacity,
            takenSpaces,
            matchedStudentResponses: matches,
        });
    });
    writetoJSON({ matches: allMatches }, "json/matches.json");
    return allMatches;
};

const reviewMatches = async () => {
    const matches = await findMatches();
    console.log(matches);
};

reviewMatches();

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



    make first priority matches then second then third
    see whos is left over and what the capacities are like

*/
