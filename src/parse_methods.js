import {
    getACMTableRecords,
    getStudentResponseTableRecords,
    getSupervisorACMTableRecords,
    getTopicToACMMapTableRecords,
    getSupervisorResponseTableRecords,
} from "./get_methods.js";

/**
 * Find all acm keywords associated with each of the students response's three choices
 * Assign a prioirty to each acm keyword based on the choice that it is associated to
 * @method
 * @param {object} studentResponse an unparsed student response table record
 * @param {object[]} topicToAcmMaps the records of the maps of choices to actual acm keywords
 * @param {object[]} acmRecordIds all of the acm keyword records
 * @returns {object} the actual acm keywords associated to the given student response
 */
const getAssociatedAcmKeywords = (
    studentResponse,
    topicToAcmMaps,
    acmRecordIds
) => {
    var realAcmKeywords = [];
    studentResponse.choices.forEach((choiceId, index) => {
        // Find all real acm keywords that are associated to each student response choice
        topicToAcmMaps
            .filter((topicMap) => topicMap.topicRecordId == choiceId)
            .forEach((topicMap) => {
                var realAcmRecordId = acmRecordIds.find(
                    (acmRecordId) => acmRecordId == topicMap.acmRecordId
                );
                realAcmKeywords.push({
                    acmRecordId: realAcmRecordId,
                    priority: index + 1,
                });
            });
    });
    return realAcmKeywords;
};

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
 * @returns {Promise<object[]>} the parsed student responses data
 */
export const getParsedStudentResponses = async () => {
    const studentResponses = await getStudentResponseTableRecords();
    const topicToAcmMaps = await getTopicToACMMapTableRecords();
    const acmRecordIds = await getACMTableRecords();

    var parsedStudentResponses = [];

    studentResponses.forEach((response) => {
        // Ignores student respones that don't contain three choices from the topics list
        if (response.choices.every((choice) => choice !== undefined)) {
            var realAcmKeywords = getAssociatedAcmKeywords(
                response,
                topicToAcmMaps,
                acmRecordIds
            );
            parsedStudentResponses.push({
                responseId: response.responseId,
                acmKeywords: realAcmKeywords,
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
 * @returns {Promise<object[]>} the parsed supervisor responses data
 */
export const getParsedSupervisorResponses = async () => {
    // Get the required unparsed supervisor responses and acm keyword data
    var supervisorResponses = await getSupervisorACMTableRecords();
    var supervisorCapacities = await getSupervisorResponseTableRecords();

    var parsedSupervisorResponses = [];

    supervisorResponses.forEach((response) => {
        const alreadyExists = parsedSupervisorResponses.some(
            (item) => item.responseId === response.responseId
        );
        // If there is already a parsed response with the same ID, append the keyword to that object's array
        if (alreadyExists) {
            parsedSupervisorResponses
                .find((item) => item.responseId === response.responseId)
                .acmKeywords.push(response.acmRecordId);
        } else {
            // Else add a new parsed supervisor response object to the array
            parsedSupervisorResponses.push({
                responseId: response.responseId,
                acmKeywords: [response.acmRecordId],
            });
        }
    });

    // Adds the capacity of each supervisor to each parsed supervisor response object
    supervisorCapacities.forEach(({ supervisorId, capacity }) => {
        const sameResponse = parsedSupervisorResponses.find(
            (response) => response.responseId === supervisorId
        );
        sameResponse && (sameResponse.capacity = capacity);
    });

    return parsedSupervisorResponses;
};
