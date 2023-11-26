import AWS from 'aws-sdk';

const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const recordEmailSent = async (email) => {
    const params = {
        TableName: 'emai-webapp',
        Item: {
            email: email,
            timestamp: new Date().toISOString(),
        },
    };

    await dynamoDB.put(params).promise();
};
