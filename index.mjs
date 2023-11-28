import { config } from 'dotenv';
import AWS from 'aws-sdk';
import { Storage } from '@google-cloud/storage';
import axios from 'axios';

config();

const downloadRelease = async (url, userEmail, attempt,maxRetries) => {
    try {
        console.log(url)

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer'
        });

        const fileBuffer = Buffer.from(response.data);


        console.log(fileBuffer)
       
        return fileBuffer
    } catch (error) {
        await sendEmail(userEmail, 'Assignment Submitted Failed', `Your Assignment has not able to downloaded and stored. Please see your submission and submit again.  Your attempt is ${attempt}, Attempt left is ${maxRetries - attempt}`);
        await recordEmailSent(userEmail,"fail");
        console.log('Error downloading the release:', error);
        throw error;
    }
};

const storeInGCS = async (filePath, email) => {
    const bucketName = process.env.BUCKET_NAME;
    const serviceAccountKey = JSON.parse(Buffer.from(process.env.GCP_SERVICE_ACCOUNT_KEY, 'utf-8'));

    const storage = new Storage({
        credentials: serviceAccountKey
    });

    
    const timestamp = new Date().toISOString().replace(/:/g, '-'); // ISO string with colons replaced for compatibility
    const fileName = `${email}-submission-${timestamp}.zip`;

    try {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(fileName);
        await file.save(filePath);
    } catch (error) {

        console.log("Error",error)
        throw error
    }

   
};


const ses = new AWS.SES();

const sendEmail = async (recipient, subject, body) => {
    const params = {
        Destination: { ToAddresses: [recipient] },
        Message: {
            Body: { Text: { Data: body } },
            Subject: { Data: subject },
        },
        Source: process.env.SES_SENDER_EMAIL,
    };
    try {
        await ses.sendEmail(params).promise();
    } catch (error) {
        await recordEmailSent(recipient,"fail");
        console.log("Email", error)
        throw error
    }

};

const dynamoDB = new AWS.DynamoDB.DocumentClient();

const recordEmailSent = async (email,status) => {
    const timestamp = new Date().toISOString();
    const ide = email+timestamp;
    const params = {
        TableName: process.env.TABLE_NAME,
        Item: {
            id: ide,
            email: email,
            status: status,
            timestamp: timestamp
        },
    };
    try {
        console.log(params)
        await dynamoDB.put(params).promise();
        console.log('Record successfully written to DynamoDB');
    } catch (error) {
        console.log(error)
        throw error
    }

   
};

export const handler = async (event, context) => {
    try {
        console.log(`Function ${context.functionName} start, execution ${context.awsRequestId}`);

        if (Array.isArray(event.Records) && event.Records.length > 0) {
            for (const snsRecord of event.Records) {
                const snsMessage = snsRecord.Sns.Message;
                const parsedMessage = JSON.parse(snsMessage);
                const { userEmail, githubRepo, attempt, maxRetries } = parsedMessage;

                try {
                    console.log('Starting download...');
                    const releaseData = await downloadRelease(githubRepo,userEmail,attempt,maxRetries);
                    console.log('Download completed');

                    console.log('Storing in GCS...');
                    await storeInGCS(releaseData, userEmail);

                    console.log('Sending email...');
                    await sendEmail(userEmail, `Assignment Submitted Sucess', 'Your Assignment has been downloaded and stored. Your attempt is ${attempt}, Attempt left is ${maxRetries - attempt}`);

                    console.log('Recording email sent...');
                    await recordEmailSent(userEmail,"success");
                } catch (operationError) {
                    console.error('Error in processing record:', operationError);
                    
                }
            }
            console.log('All operations completed successfully');
            return { status: 'Success' };
        } else {
            console.log("Event.Records is not an array or is empty:", event.Records);
            
        }
    } catch (error) {
        console.log('Error:', error);
        throw error;
    }
};
