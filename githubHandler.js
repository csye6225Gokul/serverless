import { downloadRelease } from './src/services/githubService.js';
import { storeInGCS } from './src/services/googleCloudService.js';
import { sendEmail } from './src/services/emailService.js';
import { recordEmailSent } from './src/services/dynamoDBService.js';
import { config } from 'dotenv';

config();

export const handler = async (event) => {
    try {
        const { githubRepo, releaseTag, userEmail } = event;

        const accountId = process.env.AWS_ACCOUNT_ID;
       const roleName = process.env.ROLE_NAME;
        const roleArn = `arn:aws:iam::${accountId}:role/${roleName}`;

        const sts = new AWS.STS();
     const assumedRole = await sts.assumeRole({
           RoleArn: roleArn,
            RoleSessionName: "AssumeGCPRoleSession"
                     }).promise();

        // const releaseData = await downloadRelease(githubRepo, releaseTag).then(() => console.log('Download completed'))
        // .catch(error => console.error('Download failed', error));;
        // await storeInGCS(releaseData);
        // await sendEmail(userEmail, 'Download Completed', 'Your file has been downloaded and stored.');
        // await recordEmailSent(userEmail);

        downloadRelease(githubRepo, releaseTag)
    .then(releaseData => {
        console.log('Download completed');

        // Chain the other asynchronous operations
        return storeInGCS(releaseData,userEmail)
            .then(() => sendEmail(userEmail, 'Assignment Submitted Sucess', 'Your Assignment has been downloaded and stored.'))
            .then(() => recordEmailSent(userEmail));
    })
    .then(() => {
        console.log('All operations completed successfully');
    })
    .catch(error => {
        console.error('An error occurred', error);
    });

        return { status: 'Success' };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};
