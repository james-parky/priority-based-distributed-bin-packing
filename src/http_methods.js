import fetch from "node-fetch";
globalThis.fetch = fetch;

/**
 * Gets the table data from the ACM Keywords table and formats it to a JavaScript Object Notation (JSON) object
 * @exports
 * @async
 * @method
 * @returns {object} the data pulled from the table formatted to a JavaScript Object Notation (JSON) object
 */
export const getACMTableRecords = async () => {
    const res = await fetch(
        "https://prod-135.westeurope.logic.azure.com:443/workflows/2d76b948d1df43118b4489fbdd0d6b9e/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=yeGF5nMwSKdhwVrKBtTdivRx6eB8CJrYYP05NHNmBDw"
    );
    const data = await res.json();
    return data.map((acm) => acm.team42_acmclassificationcodesid);
};

/**
 * Gets the table data from the Student Responses table, formats it to a JavaScript Object Notation (JSON) object
 * and removes any records that have no responseid
 * @exports
 * @async
 * @method
 * @returns {object} the data pulled from the table formatted to a JavaScript Object Notation (JSON) object
 */
export const getStudentResponseTableRecords = async () => {
    const res = await fetch(
        "https://prod-169.westeurope.logic.azure.com:443/workflows/bec01dd52fd44c33b39930b39dee5bae/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=n_d6FNb0verwDBftY4VD4En7c-k_Z8Owwb7qLLdV3SE"
    );
    const data = await res.json();
    return data
        .map((response) => ({
            responseId: response.team42_studentresponsesid,
            choices: [
                response._team42_firstchoiceinterest_value,
                response._team42_secondchoiceinterest_value,
                response._team42_thirdchoiceinterest_value,
            ],
            contact: response._team42_portalcontact_value,
            available: response.team42_available,
        }))
        .filter((response) => response.responseId !== undefined)
        .filter((response) => response.available);
};

/**
 * Gets the table data from the Topic To ACM Map table and formats it to a JavaScript Object Notation (JSON) object
 * @exports
 * @async
 * @method
 * @returns {object} the data pulled from the table formatted to a JavaScript Object Notation (JSON) object
 */
export const getTopicToACMMapTableRecords = async () => {
    const res = await fetch(
        "https://prod-208.westeurope.logic.azure.com:443/workflows/7c5dcb17cba24ee2b01756b71aa02c54/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=mzycMViPSU0AUbJ4_9EoWFK54g-9dFR3kHVNi4I7C9Y"
    );
    const data = await res.json();
    return data.map((topicToAcm) => ({
        topicMapId: topicToAcm.team42_topicacmmapid,
        acmRecordId: topicToAcm._team42_acmkeyword_value,
        topicRecordId: topicToAcm._team42_topic_value,
    }));
};

/**
 * Gets the table data from the Supervisor ACM table, formats it to a JavaScript Object Notation (JSON) object
 * and removes any records that have no responseid
 * @exports
 * @async
 * @method
 * @returns {object} the data pulled from the table formatted to a JavaScript Object Notation (JSON) object
 */
export const getSupervisorACMTableRecords = async () => {
    const res = await fetch(
        "https://prod-144.westeurope.logic.azure.com:443/workflows/c0820c596ba5487a90039acc9550f4b4/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=-WQ-dwFOTHlUwqqLxM0BDHT_4FDG6t6h4fdXK5RjXEA"
    );
    const data = await res.json();
    return data
        .map((response) => ({
            responseId: response._team42_supervisorresponseid_value,
            acmRecordId: response._team42_acmid_value,
        }))
        .filter((response) => response.responseId !== undefined);
};

/**
 * Gets the tables data from the Supervisor Resposne table, formats it to a JavaScript Object Notation (JSON) object
 * and removes any records that have either no responseid or no capacity value
 * @exports
 * @async
 * @method
 * @returns {object} the data pulled from the table formatted to a JavaScript Object Notation (JSON) object
 */
export const getSupervisorResponseTableRecords = async () => {
    const res = await fetch(
        "https://prod-83.westeurope.logic.azure.com:443/workflows/dac876dbda68495aa79ed4c5c51fe4ce/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=-OshpHPrkQoqmSiaO3MvyAvThKurFff0LPOIQ0x-4OY"
    );
    const data = await res.json();
    return data
        .map((response) => ({
            supervisorId: response.team42_supervisorresponsesv2id,
            capacity: response.team42_capacity,
            available: response.team42_available,
        }))
        .filter((response) => response.supervisorId !== undefined)
        .filter((response) => response.capacity !== undefined)
        .filter((response) => response.available);
};

export const postToDataverse = async (
    matches,
    unmatchedStudents,
    unmatchedSupervisors
) => {
    await fetch(
        "https://prod-189.westeurope.logic.azure.com:443/workflows/a0a223a950e04c969920c1e43b22d8c5/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=J6S-qD7JVGn4H4b7F-U7Ho55zIQShtJbWPx8-ERJMTg",
        {
            method: "POST",
            headers: { "Content-type": "application/json" },
            body: JSON.stringify(matches),
        }
    );
};
