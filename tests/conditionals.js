// Original

// If there is already a parsed response with the same ID, append the keyword to that object's array
var alreadyExists = parsedSupervisorResponses.some(
    (item) => item.responseId === response.responseId
);

if (alreadyExists) {
    parsedSupervisorResponses.forEach((item) => {
        item.responseId === response.responseId &&
            item.acmKeywords.push(realACMKeyword.acmId);
    });
} else {
    // Else add a new parsed supervisor response object to the array
    parsedSupervisorResponses.push({
        responseId: response.responseId,
        acmKeywords: [realACMKeyword.acmId],
    });
}

// Ternary
parsedSupervisorResponses.some(
    (item) => item.responseId === response.responseId
)
    ? parsedSupervisorResponses.forEach((item) => {
          item.responseId === response.responseId &&
              item.acmKeywords.push(realACMKeyword.acmId);
      })
    : parsedSupervisorResponses.push({
          responseId: response.responseId,
          acmKeywords: [realACMKeyword.acmId],
      });
