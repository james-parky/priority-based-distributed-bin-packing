import {
    getParsedStudentResponses,
    getParsedSupervisorResponses,
} from "./parse_methods.js";

import { writeToJson, formatAndWriteToJson } from "./write_methods.js";
// Default functions for first time matching, man push remaining matches afterwards
const findMatches = async (
    parsedStudentResponses,
    parsedSupervisorResponses,
    outputFile
) => {
    // var parsedStudentResponses = await getParsedStudentResponses();
    // //writetoJSON(parsedStudentResponses, "json/student_responses.json");
    // var parsedSupervisorResponses = await getParsedSupervisorResponses();

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
                            //studentResponseId: studentResponse.responseId,
                            studentResponse,
                            commonACMKeywordId: [acmKeyword],
                            studentsChoices: studentResponse.choices,
                        });
                        takenSpaces += 1;
                    }
                }
            });
        });
        allMatches.push({
            supervisorResponse,
            capacity: supervisorResponse.capacity,
            takenSpaces,
            matchedStudentResponses: matches,
        });
    });
    writeToJson({ matches: allMatches }, outputFile);
    return allMatches;
};

const matchRemainders = async (students, supervisors) => {
    var unmatched = [];

    var totalRemainingSpaces = supervisors
        .map((supervisor) => supervisor.capacity)
        .reduce((prev, current) => prev + current, 0);

    // Only keep enough students for the remaining spaces
    if (students.length > totalRemainingSpaces) {
        students = students.slice(0, totalRemainingSpaces);
        unmatched = students.slice(totalRemainingSpaces);
    }

    var matchesFromRemainders = await findMatches(
        students,
        supervisors,
        "json/newMatches.json"
    );
    return { matchesFromRemainders, unmatched };
};

const reviewMatches = async () => {
    var matches = await findMatches(
        await getParsedStudentResponses(),
        await getParsedSupervisorResponses(),
        "json/matches.json"
    );

    var leftOverStudents = [];
    var supervisorsWithLeftOverSpace = [];

    // sort student matches by the priority of the acm keyword matched
    matches.forEach((supervisor) => {
        supervisor.matchedStudentResponses.sort((student1, student2) =>
            student1.commonACMKeywordId[0].priority >
            student2.commonACMKeywordId[0].pririty
                ? 1
                : -1
        );

        if (supervisor.takenSpaces > supervisor.capacity) {
            // Put student over capacity into leftover array
            var remainders = supervisor.matchedStudentResponses.slice(
                supervisor.capacity
            );

            leftOverStudents = remainders.map(
                (student) => student.studentResponse
            );

            // Truncate array of matches based on capacity
            supervisor.matchedStudentResponses =
                supervisor.matchedStudentResponses.slice(
                    0,
                    supervisor.capacity
                );
            supervisor.takenSpaces = supervisor.capacity;
        }

        if (supervisor.takenSpaces < supervisor.capacity) {
            supervisorsWithLeftOverSpace.push(supervisor.supervisorResponse);
        }
    });

    leftOverStudents = [...new Set(leftOverStudents)];

    // look at left over and run matches again
    writeToJson({ orderedMatches: matches }, "json/orderedMatches.json");
    writeToJson(
        {
            leftovers: {
                students: leftOverStudents,
                supervisors: supervisorsWithLeftOverSpace,
            },
        },
        "json/leftover.json"
    );

    return {
        initialMatches: matches,
        leftOverStudents,
        supervisorsWithLeftOverSpace,
    };
};

const collateMatches = async (initialMatches, matchesFromRemainders) => {
    matchesFromRemainders.forEach((match) => {
        var sameSupervisor = initialMatches.find(
            (initialMatch) =>
                initialMatch.supervisorResponse.responseId ===
                match.supervisorResponse.responseId
        );

        sameSupervisor.matchedStudentResponses = [
            ...sameSupervisor.matchedStudentResponses,
            ...match.matchedStudentResponses,
        ];
    });
    writeToJson(
        { collatedMatches: initialMatches },
        "json/collatedMatches.json"
    );

    return initialMatches;
};

async function main() {
    var { initialMatches, leftOverStudents, supervisorsWithLeftOverSpace } =
        await reviewMatches();
    // Rerun with remaining unmatched students and supervisors
    var { matchesFromRemainders, unmatched } = await matchRemainders(
        leftOverStudents,
        supervisorsWithLeftOverSpace
    );

    // Collate old and new matches

    collateMatches(initialMatches, matchesFromRemainders);

    writeToJson({ unmatched }, "json/unmatched.json");

    var finalMatches = await collateMatches(
        initialMatches,
        matchesFromRemainders
    );

    formatAndWriteToJson({ finalMatches }, "json/finalMatches.json");
}

main();

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


    T

*/
