//import { downloadRelease } from './src/services/githubService.mjs';
//import { storeInGCS } from './src/services/googleCloudService.mjs';
//import { sendEmail } from './src/services/emailService.mjs';
//import { recordEmailSent } from './src/services/dynamoDBService.mjs';
import { config } from 'dotenv';
import AWS from 'aws-sdk';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import util from 'util';
import axios from 'axios';

config();


const downloadRelease = async (url, outputFilename, userEmail) => {
    try {
        console.log(url)

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer'
        });

        const fileBuffer = Buffer.from(response.data);

        // const writer = fs.createWriteStream(outputFilename);

        // response.data.pipe(writer);

        console.log(fileBuffer)
       
        return fileBuffer

        // console.log(outputFilename)
        // return new Promise((resolve, reject) => {
        //     writer.on('finish', () => {
        //         console.log('Download complete:', outputFilename);
        //         resolve(outputFilename); // Resolving with the file path
        //     });
        //     writer.on('error', (writeError) => {
        //         console.error('Error writing the file:', writeError);
        //         reject(writeError);
        //     });
        //     response.data.on('error', (streamError) => {
        //         console.error('Error in the data stream:', streamError);
        //         reject(streamError);
        //     });
        // });
    } catch (error) {
        await sendEmail(userEmail, 'Assignment Submitted Failed', 'Your Assignment has not able to downloaded and stored. Please see your submission');

        console.log('Error downloading the release:', error);
        throw error;
    }
};


const readFile = util.promisify(fs.readFile);

const storeInGCS = async (filePath, email) => {
    const bucketName = process.env.BUCKET_NAME;
    const serviceAccountKey = JSON.parse(Buffer.from(process.env.GCP_SERVICE_ACCOUNT_KEY, 'utf-8'));

    const storage = new Storage({
        credentials: serviceAccountKey
    });

    // Include a timestamp in the file name to ensure uniqueness
    const timestamp = new Date().toISOString().replace(/:/g, '-'); // ISO string with colons replaced for compatibility
    const fileName = `${email}-submission-${timestamp}.zip`;

    //const data = await readFile(filePath);  // Read the file's binary content

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
        Source: 'gokul.jaya1999+demo@gmail.com',
    };
    try {
        await ses.sendEmail(params).promise();
    } catch (error) {
        await recordEmailSent(recipient,"fail");
        console.log("Email", error)
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
            //timestamp: new Date().toISOString(),
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


// export const handler = async (event,context) => {
//     try {
//        // const { githubRepo, releaseTag, userEmail } = event;

//         console.log(`Function ${context.functionName} start, execution ${context.awsRequestId}`);
//     if (Array.isArray(event.Records) && event.Records.length > 0) {

//         event.Records.forEach(async (snsRecord) => {
//             const snsMessage = snsRecord.Sns.Message;

//             const parsedMessage = JSON.parse(snsMessage);

//             const { userEmail, githubRepo, releaseTag } = parsedMessage;

//             console.info("Email:", userEmail, "Submission URL:", githubRepo);

//             const accountId = process.env.AWS_ACCOUNT_ID;
//        const roleName = process.env.ROLE_NAME;
//         const roleArn = `arn:aws:iam::${accountId}:role/${roleName}`;

//         console.log(roleArn)

//         // try {
//         //     const sts = new AWS.STS();
//         //     const assumedRole = await sts.assumeRole({
//         //         RoleArn: roleArn,
//         //         RoleSessionName: "AssumeGCPRoleSession"
//         //     }).promise();
//         //     // Continue with your code after assuming the role
//         // } catch (error) {
//         //     console.error("Error assuming role:", error);
//         //     // Handle error or rethrow
//         //     throw error;
//         // }

//         // const releaseData = await downloadRelease(githubRepo, releaseTag).then(() => console.log('Download completed'))
//         // .catch(error => console.error('Download failed', error));;
//         // await storeInGCS(releaseData);
//         // await sendEmail(userEmail, 'Download Completed', 'Your file has been downloaded and stored.');
//         // await recordEmailSent(userEmail);



//         console.log('Starting download...');
//         const releaseData = await downloadRelease(githubRepo, releaseTag);
//         console.log('Download completed');

//         console.log('Storing in GCS...');
//         await storeInGCS(releaseData, userEmail);

//         console.log('Sending email...');
//         await sendEmail(userEmail, 'Assignment Submitted Sucess', 'Your Assignment has been downloaded and stored.');

//         console.log('Recording email sent...');
//         await recordEmailSent(userEmail);

//         console.log('All operations completed successfully');

//         return { status: 'Success' };

//     //     downloadRelease(githubRepo, releaseTag)
//     // .then(releaseData => {
//     //     console.log('Download completed');

//     //     // Chain the other asynchronous operations
//     //     return storeInGCS(releaseData,userEmail)
//     //         .then(() => sendEmail(userEmail, 'Assignment Submitted Sucess', 'Your Assignment has been downloaded and stored.'))
//     //         .then(() => recordEmailSent(userEmail));
//     // })
//     // .then(() => {
//     //     console.log('All operations completed successfully');
//     // })
//     // .catch(error => {
//     //     console.error('An error occurred', error);
//     // });

//     //     return { status: 'Success' };

 
//         });


//     }
//     else {
//         console.error("Event.Records is not an array or is empty:", event.Records);
//     }

        
//     } catch (error) {
//         console.error('Error:', error);
//         throw error;
//     }
// };


export const handler = async (event, context) => {
    try {
        console.log(`Function ${context.functionName} start, execution ${context.awsRequestId}`);

        if (Array.isArray(event.Records) && event.Records.length > 0) {
            for (const snsRecord of event.Records) {
                const snsMessage = snsRecord.Sns.Message;
                const parsedMessage = JSON.parse(snsMessage);
                const { userEmail, githubRepo, releaseTag } = parsedMessage;

                try {
                    console.log('Starting download...');
                    const releaseData = await downloadRelease(githubRepo, releaseTag,userEmail);
                    console.log('Download completed');

                    console.log('Storing in GCS...');
                    await storeInGCS(releaseData, userEmail);

                    console.log('Sending email...');
                    await sendEmail(userEmail, 'Assignment Submitted Sucess', 'Your Assignment has been downloaded and stored.');

                    console.log('Recording email sent...');
                    await recordEmailSent(userEmail,"success");
                } catch (operationError) {
                    console.error('Error in processing record:', operationError);
                    // Handle specific record error
                }
            }
            console.log('All operations completed successfully');
            return { status: 'Success' };
        } else {
            console.log("Event.Records is not an array or is empty:", event.Records);
            // Handle empty records case
        }
    } catch (error) {
        console.log('Error:', error);
        throw error;
    }
};
