interface JSONACM {
    team42_acmclassificationcodesid: string;
}

interface JSONStudentResponse {
    team42_studentresponsesid?: string;
    _team42_firstchoiceinterest_value?: string;
    _team42_secondchoiceinterest_value?: string;
    _team42_thirdchoiceinterest_value?: string;
    _team42_portalcontact_value?: string;
    team42_available?: string;
}

interface JSONTopicMap {
    team42_topicacmmapid: string;
    _team42_acmkeyword_value: string;
    _team42_topic_value: string;
}

interface JSONSupervisorResponse {
    team42_supervisorresponsesv2id: string;
    team42_capacity?: number;
    team42_available?: boolean;
}

interface JSONSupervisorAcm {
    _team42_supervisorresponseid_value: string;
    _team42_acmid_value?: string;
}

interface StudentResponse {
    responseId: string;
    choices?: string[];
    contact?: string;
    available?: string;
}

interface TopicMap {
    topicMapId: string;
    acmRecordId: string;
    topicRecordId: string;
}

interface SupervisorResponse {
    supervisorId: string;
    capacity?: number;
    available?: boolean;
}

interface SupervisorAcm {
    responseId: string;
    acmRecordId?: string;
}
