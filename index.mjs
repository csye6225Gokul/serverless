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

        const statusCode = response.status;
        const contentLength = response.headers['content-length'];
        const contentType = response.headers['content-type'];

        if (statusCode === 200 && contentLength && parseInt(contentLength) > 0) {
           // const fileBuffer = Buffer.from(response.data);

            console.log('File downloaded successfully:', url);

            if (contentType === 'application/zip' || contentType === 'application/x-zip-compressed') {
                const fileBuffer = Buffer.from(response.data);

                console.log('File downloaded successfully:', url);

                
                return fileBuffer;
            } else {
                
                console.error('Invalid content type:', contentType);

                await sendEmail(userEmail, 'Invalid File Type', `The file you attempted to download is not a .zip file. Please check your submission and submit a valid .zip file. Your attempt is ${attempt}, Attempts left: ${maxRetries - attempt}`);
                await recordEmailSent(userEmail, "fail", "success");

               
               
            }
            
        } else {
            
            console.error('Invalid or empty response:', statusCode);
            
            
            await sendEmail(userEmail, 'Assignment Submitted Failed', `Your Assignment has not been able to download and store. Please check your submission and submit again. Your attempt is ${attempt}, Attempts left: ${maxRetries - attempt}`);
            await recordEmailSent(userEmail, "fail", "success");
        }
    
    } catch (error) {
        await sendEmail(userEmail, 'Assignment Submitted Failed', `Your Assignment has not able to downloaded and stored. Please see your submission and submit again.  Your attempt is ${attempt}, Attempt left is ${maxRetries - attempt}`);
        await recordEmailSent(userEmail,"fail","success");
        console.log('Error downloading the release:', error);
        throw error;
    }
};

const storeInGCS = async (filePath, email,attempt,maxRetries,assignmentId) => {
    const bucketName = process.env.BUCKET_NAME;
    const serviceAccountKey = JSON.parse(Buffer.from(process.env.GCP_SERVICE_ACCOUNT_KEY, 'utf-8'));

    const storage = new Storage({
        credentials: serviceAccountKey
    });

    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const fileName = `${email}/${assignmentId}/submission-${attempt}-${timestamp}.zip`;

    try {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(fileName);
        await file.save(filePath);

        const gcsObjectPath = `gs://${bucketName}/${fileName}`;
        console.log('Sending email...');
        await sendEmail(email, 'Assignment Submitted Sucess', `Your Assignment has been downloaded and stored.\n\nYour attempt is ${attempt}, Attempt left is ${maxRetries - attempt}. \n\nGCS Object Path: ${gcsObjectPath}`);

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
        await recordEmailSent(recipient,"success","fail");
        console.log("Email", error)
        throw error
    }

};

const dynamoDB = new AWS.DynamoDB.DocumentClient();

const recordEmailSent = async (email,status,emalstat) => {
    const timestamp = new Date().toISOString();
    const ide = email+timestamp;
    const params = {
        TableName: process.env.TABLE_NAME,
        Item: {
            id: ide,
            email: email,
            status: emalstat,
            download: status,
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
                const { userEmail, githubRepo, attempt, maxRetries, assignmentId } = parsedMessage;

                try {
                    console.log('Starting download...');
                    const releaseData = await downloadRelease(githubRepo,userEmail,attempt,maxRetries);
                    console.log('Download completed');

                    console.log('Storing in GCS...');
                    await storeInGCS(releaseData, userEmail,attempt,maxRetries,assignmentId);

                   // console.log('Sending email...');
                   // await sendEmail(userEmail, 'Assignment Submitted Sucess', `Your Assignment has been downloaded and stored. Your attempt is ${attempt}, Attempt left is ${maxRetries - attempt}`);

                    console.log('Recording email sent...');
                    await recordEmailSent(userEmail,"success","success");
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
