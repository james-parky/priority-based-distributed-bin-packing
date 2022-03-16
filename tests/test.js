getTopicToACMMapTableRecords().then((topicToACMMaps) => {
    // Get all rough topic to real acm keyword mappings for that table
    // [team42_acmclassificationcodesid, team42_keyword, team42_id]
    getStudentResponseTableRecords().then((studentResponses) => {
        // Get all student response records from that table
        // [ response.team42_studentresponsesid, _team42_firstchoiceinterest_value,
        //  _team42_secondchoiceinterest_value, _team42_thirdchoiceinterest_value, _team42_portalcontact_value]
        getACMTableRecords().then((acmRecords) => {
            // Get all acm keywords records from that table
            // [acm.team42_acmclassificationcodesid, team42_keyword, team42_id]
            studentResponses.forEach((response) => {
                // Log which response has this acm choosing and what student it was
                console.log(`Student Response ID: ${response[0]}`);
                console.log(`From student: ${response[4]}`);

                // Match the responses rough choices to all corresponding real acm keywords
                var realACMKeywords = [];
                response.slice(1, 4).forEach((roughChoiceID, index) => {
                    topicToACMMaps
                        .filter((topicMap) => topicMap[2] == roughChoiceID)
                        .forEach((topicMap) => {
                            var realACMKeyword = acmRecords.find(
                                (acm) => acm[0] == topicMap[1]
                            );
                            realACMKeywords.push([
                                realACMKeyword[2],
                                index + 1,
                            ]);
                        });
                });
                console.log(realACMKeywords);
            });
        });
    });
});

const extractACMKeywordsFromSupervisorResponse = () => {
    var supervisorResponsesKeywords = [];
    getSupervisorACMTableRecords().then((supervisorResponses) => {
        getACMTableRecords().then((acmRecords) => {
            supervisorResponses.forEach((response) => {
                // console.log(`Supervisor Response ID: ${response[0]}`);
                var realACMKeyword = acmRecords.find(
                    (acm) => acm[0] == response[1]
                );
                //console.log(`ACM Keyword: ${realACMKeyword[2]}`);
                supervisorResponsesKeywords.push([
                    response[0],
                    realACMKeyword[2],
                ]);
            });
            console.log(supervisorResponsesKeywords);
        });
    });
};

//real-acm ends in 000d3ade82ee / 000d3ade8db5
//rough-type-acm in 00d3ab9b418
//topic-acm-map ends in 00d3ab5a989
//response-id ends in 281878971cb3

/*WALKTHROUGH 
                
                Student submits three rough-type choices (00d3ab9b418)
                For each rough-type choice, a student-ACM record is made for every acm keyword mapped to that choice
                
                */

// const getStudentACMTableRecords = async () => {
//     const res = await fetch(
//         "https://prod-63.westeurope.logic.azure.com:443/workflows/deec5fab94664fad9ab5fc7d3891e5db/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=KcmrSkL2bj_eJtPNCySaHXH958abrebVe5-0ajq1hKw"
//     );
//     const data = await res.json();
//     return data;
// };

// // getStudentACMTableRecords().then((data) => {
// //     console.log("Student-ACM Table Data: ");
// //     console.log(data[0]);
// //     console.log(
// //         data.map((student_acm) => [
// //             student_acm.team42_studentacmid,
// //             student_acm._team42_acmkeywordid_value,
// //         ])[0]
// //     );
// // });
