// Placeholder for GitHub API interaction


import axios from 'axios';
import fs from 'fs';

export const downloadRelease = async (url, outputFilename) => {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(outputFilename);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(outputFilename)); // Resolving with the file path
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading the release:', error);
        throw error;
    }
};