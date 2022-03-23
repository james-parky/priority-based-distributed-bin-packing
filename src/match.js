import {
    getParsedStudentResponses,
    getParsedSupervisorResponses,
} from "./parse_methods.js";

import {
    writeToJson,
    formatAndWriteToJson,
    formatMatches,
} from "./write_methods.js";

import { postToDataverse } from "./http_methods.js";

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
            // If the student shares a common acm keyword with the given supervisor,
            // add them to the list of matches, unless they are already there,
            // in which case append to the list of common acm keywords
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
    return { matchedStudentResponses: matches, takenSpaces };
};

/**
 * Finds all students that did not get matched to any supervisors
 * @func
 * @param {object[]} parsedStudentResponses an array of parsed student responses
 * @param {object[]} allMatches an array of all preliminary matches made between supervisors and students
 * @returns {object[]} an array of student responses of those that didnt have any matches
 */
const getUnmatchedStudents = (parsedStudentResponses, allMatches) => {
    // Get all unqiue student response Ids that appear in the list of matches
    var matchedStudents = [];
    matchedStudents = allMatches
        .map((match) =>
            match.matchedStudentResponses.map(
                (student) => student.studentResponse.responseId
            )
        )
        .flat();
    matchedStudents = [...new Set(matchedStudents)];

    // Gets the student response for all students without a match
    var unmatched = [];
    var allStudents = [];
    allStudents = parsedStudentResponses.map((student) => student.responseId);
    unmatched = parsedStudentResponses.filter((response) =>
        allStudents
            .filter((student) => !matchedStudents.includes(student))
            .includes(response.responseId)
    );
    return unmatched;
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
    var matches = [];
    parsedSupervisorResponses.forEach((supervisorResponse) => {
        var { matchedStudentResponses, takenSpaces } = findMatchingStudents(
            supervisorResponse,
            parsedStudentResponses
        );
        matches.push({
            supervisorResponse,
            capacity: supervisorResponse.capacity,
            takenSpaces,
            matchedStudentResponses,
        });
    });
    var unmatchedStudents = getUnmatchedStudents(
        parsedStudentResponses,
        matches
    );
    return { matches, unmatchedStudents };
};

/**
 * Order each supervisors students matches by the priority that the student gave to the acm keyword that they matched on
 * @func
 * @param {object[]} matches an array of all supervisor student matches already made
 * @returns {object[]} an array of all supervisor student matches with the student orderd by priority
 */
const orderMatches = (matches) => {
    matches.forEach((supervisor) => {
        // The lower the priority the better
        supervisor.matchedStudentResponses.sort((student1, student2) =>
            student1.commonAcmKeyword[0].priority >
            student2.commonAcmKeyword[0].pririty
                ? 1
                : -1
        );
    });
    return matches;
};

/**
 * Removes any matches from the array that dont actually contain any students
 * @func
 * @param {object[]} matches an array of all supervisor student matches already made
 * @param {*} supervisorsWithNoMatches an array of supervisor responses of supervisors with no matches
 * @returns {object[]} an array of all supervisor student matches that actually contain students
 */
const removeUnmatchedSupervisors = (matches, supervisorsWithNoMatches) => {
    matches = matches.filter((match) => {
        var supervisorsWithNoMatchesIds = supervisorsWithNoMatches.map(
            (supervisor) => supervisor.responseId
        );
        return !supervisorsWithNoMatchesIds.includes(
            match.supervisorResponse.responseId
        );
    });
    return matches;
};

/**
 * Reviews all possible matches found and distributes them across the supervisors
 * @async
 * @func
 * @param {object[]} matches an array of all possible supervisor student matches found
 * @param {int} studentsPerSupervisor the minimum amount of students per supervisor for a fair distribution
 * @param {int} remainder the amount of students remaining after each supervisor is assigned the minimum number
 * @returns {object} {the revised array of matches between supervisors and students, an array of all supervisor responses that have no matches associated with them}
 */
const reviewMatches = async (matches, studentsPerSupervisor, remainder) => {
    var matchedStudents = [];
    var supervisorsWithNoMatches = [];

    matches.forEach((match, index) => {
        // Get all students matched to the current supervisor, that have not been used in another match yet
        var unmatchedStudents = match.matchedStudentResponses.filter(
            (student) =>
                !matchedStudents.includes(student.studentResponse.responseId)
        );
        // If the supervisor still has unmatched students as possible matches
        // Take the correct amount of students from the list of potential matches and confirm them
        // Else add the supervisor response the list of ones with no matches
        if (unmatchedStudents.length > 0) {
            var amountOfMatches =
                studentsPerSupervisor + (index < remainder ? 1 : 0);
            var chosenStudents = unmatchedStudents.slice(0, amountOfMatches);

            chosenStudents.forEach((student) =>
                matchedStudents.push(student.studentResponse.responseId)
            );

            match.matchedStudentResponses = chosenStudents;
        } else {
            supervisorsWithNoMatches.push(match.supervisorResponse);
        }
    });

    // Remove matches that include supervisors that didnt get a match
    matches = removeUnmatchedSupervisors(matches, supervisorsWithNoMatches);
    return { matches, supervisorsWithNoMatches };
};

async function main() {
    const parsedStudentResponses = await getParsedStudentResponses();
    const parsedSupervisorResponses = await getParsedSupervisorResponses();

    // Find all possible matches for each supervisor and student
    var { matches, unmatchedStudents } = findMatches(
        parsedStudentResponses,
        parsedSupervisorResponses
    );

    // Order matches based on the priority of the acm keyword they matched on
    matches = orderMatches(matches);

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
    // All supervisors get a minimum amount of students, being the integer division of students / supervisors
    const studentsPerSupervisor = Math.floor(
        numUniqueStudents / numUniqueSupervisors
    );
    // The remaining n students are distributed across the first n supervisors
    const remainder = numUniqueStudents % numUniqueSupervisors;
    var review = await reviewMatches(matches, studentsPerSupervisor, remainder);
    matches = review.matches;
    var unmatchedSupervisors = review.supervisorsWithNoMatches;

    formatAndWriteToJson({ matches }, "json/afterReviewMatches.json");
    writeToJson({ matches }, "json/rawMatches.json");
    writeToJson({ unmatchedStudents }, "json/unmatchedStudents.json");
    writeToJson({ unmatchedSupervisors }, "json/unmatchedSupervisors.json");

    // Post to Supervisor-Student Pairs table
    postToDataverse(
        formatMatches({ matches }),
        unmatchedStudents,
        unmatchedSupervisors
    );
}
main();
