import {
    getParsedStudentResponses,
    getParsedSupervisorResponses,
} from "./parse_methods.js";

import { writeToJson, formatAndWriteToJson } from "./write_methods.js";

/**
 * Finds all students that match the given supervisor response, based on whether they share a common acm keyword
 * @func
 * @param {object} supervisorResponse a single parsed supervisor response
 * @param {object[]} parsedStudentResponses an array of parsed student responses
 * @returns {object} {array of student responses found to match the given supervisor response based on acm keywords, the number of matches made to the given supervisor}
 */
const findMatchingStudents = (supervisorResponse, parsedStudentResponses) => {
    var matches = [];
    var takenSpaces = 0;
    parsedStudentResponses.forEach((studentResponse) => {
        studentResponse.acmKeywords.forEach((acmKeyword) => {
            const shareAcmKeyword = supervisorResponse.acmKeywords.includes(
                acmKeyword.acmRecordId
            );
            if (shareAcmKeyword) {
                var alreadyExists = matches.some(
                    (match) =>
                        match.studentResponse.responseId ===
                        studentResponse.responseId
                );

                if (alreadyExists) {
                    matches
                        .find(
                            (match) =>
                                match.studentResponse.responseId ===
                                studentResponse.responseId
                        )
                        .commonAcmKeyword.push(acmKeyword);
                } else {
                    matches.push({
                        studentResponse,
                        commonAcmKeyword: [acmKeyword],
                        studentsChoices: studentResponse.choices,
                    });
                    takenSpaces += 1;
                }
            }
        });
    });
    return { matches, takenSpaces };
};

const getUnmatchedStudents = (parsedStudentResponses, allMatches) => {
    var unused = [];
    var usedStudents = [];
    usedStudents = allMatches
        .map((match) =>
            match.matchedStudentResponses.map(
                (student) => student.studentResponse.responseId
            )
        )
        .flat();
    usedStudents = [...new Set(usedStudents)];

    var allStudents = [];
    allStudents = parsedStudentResponses.map((student) => student.responseId);
    // console.log("USED STUDENT IDS");
    // console.log(usedStudents);
    // console.log("ALL STUDENTS");
    // console.log(allStudents);

    unused = parsedStudentResponses.filter((response) =>
        allStudents
            .filter((student) => !usedStudents.includes(student))
            .includes(response.responseId)
    );

    // console.log("UNUSED STUDENTS");
    // console.log(unused);
    return unused;
};

/**
 * For each supervisor response, finds all students that match, based on whether they share a common acm keyword
 * Keeps track of the amount of matches made to each supervisor to check whether they are under or oversubscribed
 * @func
 * @param {object[]} parsedStudentResponses an array of parsed student responses
 * @param {object[]} parsedSupervisorResponses an array of parsed supervisor responses
 * @returns {object[]} an array of all student response matches to each supervisor response
 */
const findMatches = (parsedStudentResponses, parsedSupervisorResponses) => {
    var allMatches = [];
    parsedSupervisorResponses.forEach((supervisorResponse) => {
        var { matches, takenSpaces } = findMatchingStudents(
            supervisorResponse,
            parsedStudentResponses
        );
        allMatches.push({
            supervisorResponse,
            capacity: supervisorResponse.capacity,
            takenSpaces,
            matchedStudentResponses: matches,
        });
    });
    var unmatchedStudents = getUnmatchedStudents(
        parsedStudentResponses,
        allMatches
    );
    // console.log("UNMATCHED STUDENTS");
    // console.log(unmatchedStudents);
    return { matches: allMatches, unmatchedStudents };
};

const orderMatches = (matches) => {
    matches.forEach((supervisor) => {
        supervisor.matchedStudentResponses.sort((student1, student2) =>
            student1.commonAcmKeyword[0].priority >
            student2.commonAcmKeyword[0].pririty
                ? 1
                : -1
        );
    });
    return matches;
};

const reviewMatches = async (matches, studentsPerSupervisor, remainder) => {
    console.log(`Remainder: ${remainder}`);
    // Take first n from each then let the others assign
    var matchedStudents = [];
    var supervisorsWithNoMatches = [];
    matches.forEach((match, index) => {
        // Find all students from the matches that havent been used yet
        var unchosenStudents = match.matchedStudentResponses.filter(
            (student) =>
                !matchedStudents.includes(student.studentResponse.responseId)
        );

        // If there are still students that have been unmatched
        // Take the top n matches that are still unassigned
        if (unchosenStudents.length > 0) {
            // Reassign the student in the match

            var amountOfMatches =
                studentsPerSupervisor + (index < remainder ? 1 : 0);
            var chosenStudents = unchosenStudents.slice(0, amountOfMatches);

            chosenStudents.forEach((student) =>
                matchedStudents.push(student.studentResponse.responseId)
            );

            match.matchedStudentResponses = chosenStudents;
        } else {
            // Else there is no one left for the supervisor
            //match.matchedStudentResponses = [];
            supervisorsWithNoMatches.push(match.supervisorResponse);
        }
    });

    // Remove matches that include professors that didnt get a match
    matches = matches.filter((match) => {
        var supervisorsWithNoMatchesIds = supervisorsWithNoMatches.map(
            (supervisor) => supervisor.responseId
        );
        return !supervisorsWithNoMatchesIds.includes(
            match.supervisorResponse.responseId
        );
    });
    return { matches, supervisorsWithNoMatches };
};

async function main() {
    const parsedStudentResponses = await getParsedStudentResponses();
    const parsedSupervisorResponses = await getParsedSupervisorResponses();

    const numUniqueStudents = [
        ...new Set(
            parsedStudentResponses.map((response) => response.responseId)
        ),
    ].length;

    const numUniqueSupervisors = [
        ...new Set(
            parsedSupervisorResponses.map((response) => response.responseId)
        ),
    ].length;

    // Give the first pass amount to each supervisor
    const studentsPerSupervisor = Math.floor(
        numUniqueStudents / numUniqueSupervisors
    );

    const remainder = numUniqueStudents % numUniqueSupervisors;

    // Find all possible matches for each supervisor
    var { matches, unmatchedStudents } = findMatches(
        parsedStudentResponses,
        parsedSupervisorResponses
    );

    // Order matches based on the priority of the acm keyword they matched on
    matches = orderMatches(matches);

    // Write to JSON to check
    //formatAndWriteToJson({ matches }, "json/initialMatches.json");

    // Review matches and take first n from each supervisor
    // If the student has already been picked, move to second place etc.

    var review = await reviewMatches(matches, studentsPerSupervisor, remainder);
    matches = review.matches;
    var supervisorsWithNoMatches = review.supervisorsWithNoMatches;

    formatAndWriteToJson({ matches }, "json/afterReviewMatches.json");
    writeToJson({ unmatchedStudents }, "json/unmatchedStudents.json");
    writeToJson({ supervisorsWithNoMatches }, "json/unmatchedSupervisors.json");
}
main();
