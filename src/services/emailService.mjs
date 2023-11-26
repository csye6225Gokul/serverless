import AWS from 'aws-sdk';

const ses = new AWS.SES();

export const sendEmail = async (recipient, subject, body) => {
    const params = {
        Destination: { ToAddresses: [recipient] },
        Message: {
            Body: { Text: { Data: body } },
            Subject: { Data: subject },
        },
        Source: 'gokul.jaya1999+demo@gmail.com',
    };

    await ses.sendEmail(params).promise();
};
