import fetch from "node-fetch";
globalThis.fetch = fetch;

export const getACMTableRecords = async () => {
    const res = await fetch(
        "https://prod-135.westeurope.logic.azure.com:443/workflows/2d76b948d1df43118b4489fbdd0d6b9e/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=yeGF5nMwSKdhwVrKBtTdivRx6eB8CJrYYP05NHNmBDw"
    );
    const data = await res.json();
    var acmRecords = [];
    data.forEach((acm) =>
        acmRecords.push({
            acmRecordId: acm.team42_acmclassificationcodesid,
            keyword: acm.team42_keyword,
            acmId: acm.team42_id,
        })
    );
    return acmRecords;
};

export const getStudentResponseTableRecords = async () => {
    const res = await fetch(
        "https://prod-169.westeurope.logic.azure.com:443/workflows/bec01dd52fd44c33b39930b39dee5bae/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=n_d6FNb0verwDBftY4VD4En7c-k_Z8Owwb7qLLdV3SE"
    );
    const data = await res.json();
    var studentResponses = [];
    data.forEach((response) =>
        studentResponses.push({
            responseId: response.team42_studentresponsesid,
            choices: [
                response._team42_firstchoiceinterest_value,
                response._team42_secondchoiceinterest_value,
                response._team42_thirdchoiceinterest_value,
            ],
            contact: response._team42_portalcontact_value,
        })
    );
    return studentResponses;
};

export const getTopicToACMMapTableRecords = async () => {
    const res = await fetch(
        "https://prod-208.westeurope.logic.azure.com:443/workflows/7c5dcb17cba24ee2b01756b71aa02c54/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=mzycMViPSU0AUbJ4_9EoWFK54g-9dFR3kHVNi4I7C9Y"
    );
    const data = await res.json();
    var topicToACMMaps = [];
    data.forEach((topictoACM) =>
        topicToACMMaps.push({
            topicMapId: topictoACM.team42_topicacmmapid,
            acmRecordId: topictoACM._team42_acmkeyword_value,
            topicRecordId: topictoACM._team42_topic_value,
        })
    );

    return topicToACMMaps;
};

export const getSupervisorACMTableRecords = async () => {
    const res = await fetch(
        "https://prod-144.westeurope.logic.azure.com:443/workflows/c0820c596ba5487a90039acc9550f4b4/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=-WQ-dwFOTHlUwqqLxM0BDHT_4FDG6t6h4fdXK5RjXEA"
    );
    const data = await res.json();
    var supervisorResponses = [];
    data.forEach((response) =>
        supervisorResponses.push({
            responseId: response._team42_supervisorresponseid_value,
            acmId: response._team42_acmid_value,
        })
    );
    return supervisorResponses;
};
