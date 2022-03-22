import {
    getACMTableRecords,
    getStudentResponseTableRecords,
    getSupervisorACMTableRecords,
    getTopicToACMMapTableRecords,
    getSupervisorResponseTableRecords,
} from "./get_methods.js";

/**
 * @typedef {object} AcmKeyword
 * @property {string} recordId record id of the acm keyword
 * @property {int} priority priority assigned by the student in their response
 */

/**
 * @typedef {object} StudentResponse
 * @property {string} responseId the responseid of the response
 * @property {AcmKeyword[]} acmKeywords acm keywords and assoiciated priority value
 * @property {string[]} choices the three topics that the student chose in their response
 */

/**
 * @typedef {object} SupervisorResponse
 * @property {string} responseId the responseid of the response
 * @property {string[]} acmKeywords the recordids of all associated acm keywords
 * @property {int} capacity the total number of supervisees possible
 */
/**
 * Gets all appropriate data to form a student response object
 * Removes any student responses that do not have three choices selected
 * Gets all acm keywords associated with the responses three choices
 * Assigns priorities to each of the acm keywords
 * Repeats for every record in the student responses table
 * Formats the data into a JavaScript Object Notation (JSON) object
 * @exports
 * @async
 * @method
 * @returns {StudentResponse} the parsed student responses data
 */
export const getParsedStudentResponses = async () => {
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

/**
 * Gets all appropriate data to form a supervisor response object
 * Removes any supervisor responses that do not have three choices selected
 * Collates multiple supervisor response records into one per supervisor responseid
 * Gets the associated capacity for each supervisor response
 * Repeats for every record in the the supervisor acm table
 * Formats the data into a JavaScript Object Notation (JSON) object
 * @exports
 * @async
 * @method
 * @returns {SupervisorResponse} the parsed supervisor responses data
 */
export const getParsedSupervisorResponses = async () => {
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
        const sameResponse = parsedSupervisorResponses.find(
            (response) => response.responseId === supervisorId
        );
        if (sameResponse) {
            sameResponse.capacity = capacity;
        }
    });

    return parsedSupervisorResponses;
};
