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

/**
 * Rematches any students that oversubscribed a supevisor with supervisors that
 * had space remaining. Students are orderd on a first come first serve basis
 * Students that still dont get matched to a supervisor are categorised and returned
 * as unmatched
 * @func
 * @param {object[]} students an array of parsed student responses
 * @param {object[]} supervisors an array of parsd supervisor responses
 * @returns {object} {the matches made between the initially unmatched students and supervisors with space remaining, unmatched students}
 */
const matchRemainders = (students, supervisors) => {
    var totalRemainingSpaces = supervisors
        .map((supervisor) => supervisor.capacity)
        .reduce((prev, current) => prev + current, 0);

    // Only keep enough students for the remaining spaces
    if (students.length > totalRemainingSpaces) {
        students = students.slice(0, totalRemainingSpaces);
        var unmatched = students.slice(totalRemainingSpaces);
    }

    var matchesFromRemainders = findMatches(students, supervisors);
    console.log(matchesFromRemainders);
    writeToJson({ matchesFromRemainders }, "json/newMatches.json");
    console.log(unmatched);
    return { matchesFromRemainders, unmatched };
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

const reviewMatches = async (matches) => {
    var matchedStudents = [];
    var supervisorsWithNoMatches = [];
    matches.forEach((match) => {
        // Find all students from the matches that havent been used yet
        var unchosenStudents = match.matchedStudentResponses.filter(
            (student) =>
                !matchedStudents.includes(student.studentResponse.responseId)
        );

        // If there are still students that have been unmatched
        if (unchosenStudents.length > 0) {
            // Reassign the student in the match
            var chosenStudent = unchosenStudents[0];
            matchedStudents.push(chosenStudent.studentResponse.responseId);
            match.matchedStudentResponses = [chosenStudent];
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
    // // Find all possible matches and those students left over with no matches
    // var { matches, unmatchedStudents } = findMatches(
    //     await getParsedStudentResponses(),
    //     await getParsedSupervisorResponses()
    // );
    // writeToJson({ matches }, "json/matches.json");
    // writeToJson({ unmatchedStudents }, "json/unmatchedStudents.json");
    // var leftOverStudents = unmatchedStudents;
    // var rejectedStudents = [];
    // var supervisorsWithLeftOverSpace = [];
    // // 52 across for 12 supervisors
    // // 7 students
    // var totalCapacity = matches
    //     .map((supervisor) => supervisor.capacity)
    //     .reduce((prev, current) => prev + current, 0);
    // console.log(totalCapacity);
    // // Sort student matches by the priority of the acm keyword matched
    // matches.forEach((supervisor) => {
    //     supervisor.matchedStudentResponses.sort((student1, student2) =>
    //         student1.commonAcmKeyword[0].priority >
    //         student2.commonAcmKeyword[0].pririty
    //             ? 1
    //             : -1
    //     );
    //     // almost all of the matches are the same people
    //     //Take first one since most likely has priortiy of 1
    //     supervisor.matchedStudentResponses = [
    //         supervisor.matchedStudentResponses[0],
    //     ];
    //     rejectedStudents = [
    //         ...rejectedStudents,
    //         ...supervisor.matchedStudentResponses.slice(1),
    //     ];
    //     // if (supervisor.takenSpaces > supervisor.capacity) {
    //     //     // Put student over capacity into leftover array
    //     //     var remainders = supervisor.matchedStudentResponses.slice(
    //     //         supervisor.capacity
    //     //     );
    //     //     leftOverStudents = [
    //     //         ...leftOverStudents,
    //     //         ...remainders.map((student) => student.studentResponse),
    //     //     ];
    //     //     // Truncate array of matches based on capacity
    //     //     supervisor.matchedStudentResponses =
    //     //         supervisor.matchedStudentResponses.slice(
    //     //             0,
    //     //             supervisor.capacity
    //     //         );
    //     //     supervisor.takenSpaces = supervisor.capacity;
    //     // }
    //     // if (supervisor.takenSpaces < supervisor.capacity) {
    //     //     var remainingSupervisor = { ...supervisor.supervisorResponse };
    //     //     remainingSupervisor.capacity = supervisor.capacity -=
    //     //         supervisor.takenSpaces;
    //     //     supervisorsWithLeftOverSpace.push(remainingSupervisor);
    //     // }
    // });
    // leftOverStudents = [...new Set(leftOverStudents)];
    // writeToJson(matches, "json/orderedMatches.json");
    // return {
    //     initialMatches: matches,
    //     leftOverStudents,
    //     supervisorsWithLeftOverSpace,
    // };
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
    var parsedStudentResponses = await getParsedStudentResponses();
    var parsedSupervisorResponses = await getParsedSupervisorResponses();

    var uniqueStudents = [
        ...new Set(
            parsedStudentResponses.map((response) => response.responseId)
        ),
    ];

    var uniqueSupervisors = [
        ...new Set(
            parsedSupervisorResponses.map((response) => response.responseId)
        ),
    ];

    // Find all possible matches for each supervisor
    var { matches, unmatchedStudents } = findMatches(
        parsedStudentResponses,
        parsedSupervisorResponses
    );

    // Order matches based on the priority of the acm keyword they matched on
    matches = orderMatches(matches);

    // Write to JSON to check
    formatAndWriteToJson({ matches }, "json/initialMatches.json");
    writeToJson({ unmatchedStudents }, "json/unmatchedStudents.json");

    //Review matches and take first from each supervisor
    // If the student has already been picked, move to second place etc.
    var review = await reviewMatches(matches);
    matches = review.matches;
    var supervisorsWithNoMatches = review.supervisorsWithNoMatches;

    formatAndWriteToJson({ matches }, "json/afterReviewMatches.json");
    writeToJson({ supervisorsWithNoMatches }, "json/unmatchedSupervisors.json");

    // Unmatched students are matched to supervisors that have space left
    //Any leftover students are submitted as not found

    console.log(`There are ${uniqueStudents.length} unique students`);
    console.log(`There are ${uniqueSupervisors.length} unique supervisors`);
    console.log(
        unmatchedStudents.length > 0
            ? "Unmatched students"
            : "All students matched"
    );

    if (unmatchedStudents.length > 0) {
        if (supervisorsWithNoMatches.length > 0) {
            console.log("More matches can be made");
        } else {
            console.log("No supervisors left to match");
        }
    }

    /**
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     */

    // var { initialMatches, leftOverStudents, supervisorsWithLeftOverSpace } =
    //     await reviewMatches();
    // // Rerun with remaining unmatched students and supervisors
    // var { matchesFromRemainders, unmatched } = matchRemainders(
    //     leftOverStudents,
    //     supervisorsWithLeftOverSpace
    // );

    // // Collate old and new matches

    // collateMatches(initialMatches, matchesFromRemainders);

    // writeToJson({ unmatched }, "json/unmatched.json");

    // var finalMatches = await collateMatches(
    //     initialMatches,
    //     matchesFromRemainders
    // );

    // formatAndWriteToJson({ finalMatches }, "json/finalMatches.json");
}

main();
