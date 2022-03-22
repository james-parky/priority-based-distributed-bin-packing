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
 * @returns {object} array of student responses found to match the given supervisor response based on acm keywords
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
                        match.studentResponseId === studentResponse.responseId
                );

                if (alreadyExists) {
                    matches
                        .find(
                            (match) =>
                                match.studentResponseId ===
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
    return allMatches;
};

const matchRemainders = (students, supervisors) => {
    var unmatched = [];

    var totalRemainingSpaces = supervisors
        .map((supervisor) => supervisor.capacity)
        .reduce((prev, current) => prev + current, 0);

    // Only keep enough students for the remaining spaces
    if (students.length > totalRemainingSpaces) {
        students = students.slice(0, totalRemainingSpaces);
        unmatched = students.slice(totalRemainingSpaces);
    }

    var matchesFromRemainders = findMatches(students, supervisors);
    return { matchesFromRemainders, unmatched };
};

const reviewMatches = async () => {
    var matches = findMatches(
        await getParsedStudentResponses(),
        await getParsedSupervisorResponses()
    );

    var leftOverStudents = [];
    var supervisorsWithLeftOverSpace = [];

    // sort student matches by the priority of the acm keyword matched
    matches.forEach((supervisor) => {
        supervisor.matchedStudentResponses.sort((student1, student2) =>
            student1.commonAcmKeyword[0].priority >
            student2.commonAcmKeyword[0].pririty
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

    return {
        initialMatches: matches,
        leftOverStudents,
        supervisorsWithLeftOverSpace,
    };
};

const collateMatches = (initialMatches, matchesFromRemainders) => {
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

    return initialMatches;
};

async function main() {
    var { initialMatches, leftOverStudents, supervisorsWithLeftOverSpace } =
        await reviewMatches();
    // Rerun with remaining unmatched students and supervisors
    var { matchesFromRemainders, unmatched } = matchRemainders(
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
