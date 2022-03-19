import fetch from "node-fetch";
globalThis.fetch = fetch;

export const getACMTableRecords = async () => {
    const res = await fetch(
        "https://prod-135.westeurope.logic.azure.com:443/workflows/2d76b948d1df43118b4489fbdd0d6b9e/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=yeGF5nMwSKdhwVrKBtTdivRx6eB8CJrYYP05NHNmBDw"
    );
    const data = await res.json();
    return data.map((acm) => acm.team42_acmclassificationcodesid);
};

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
        }))
        .filter((response) => response.responseId !== undefined);
};

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

export const getSupervisorACMTableRecords = async () => {
    const res = await fetch(
        "https://prod-144.westeurope.logic.azure.com:443/workflows/c0820c596ba5487a90039acc9550f4b4/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=-WQ-dwFOTHlUwqqLxM0BDHT_4FDG6t6h4fdXK5RjXEA"
    );
    const data = await res.json();
    console.log(data);
    return data
        .map((response) => ({
            responseId: response._team42_supervisorresponseid_value,
            acmRecordId: response._team42_acmid_value,
        }))
        .filter((response) => response.responseId !== undefined);
};

export const getSupervisorResponseTableRecords = async () => {
    const res = await fetch(
        "https://prod-83.westeurope.logic.azure.com:443/workflows/dac876dbda68495aa79ed4c5c51fe4ce/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=-OshpHPrkQoqmSiaO3MvyAvThKurFff0LPOIQ0x-4OY"
    );
    const data = await res.json();
    return data
        .map((response) => ({
            supervisorId: response.team42_supervisorresponsesv2id,
            capacity: response.team42_capacity,
        }))
        .filter((response) => response.supervisorId !== undefined)
        .filter((response) => response.capacity !== undefined);
};
