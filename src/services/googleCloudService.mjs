import { Storage } from '@google-cloud/storage';
import { config } from 'dotenv';
import fs from 'fs';
import util from 'util';

config();
const readFile = util.promisify(fs.readFile);

export const storeInGCS = async (filePath, email) => {
    const bucketName = process.env.BUCKET_NAME;
    const serviceAccountKey = JSON.parse(Buffer.from(process.env.GCP_SERVICE_ACCOUNT_KEY, 'utf-8'));

    const storage = new Storage({
        credentials: serviceAccountKey
    });

    // Include a timestamp in the file name to ensure uniqueness
    const timestamp = new Date().toISOString().replace(/:/g, '-'); // ISO string with colons replaced for compatibility
    const fileName = `${email}-submission-${timestamp}.zip`;

    const data = await readFile(filePath);  // Read the file's binary content

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    await file.save(data);
};