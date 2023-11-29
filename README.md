# serverless
# Node.js AWS and GCP Integration

## Overview
This project provides an example of integrating AWS and Google Cloud Platform (GCP) services using Node.js. It includes code to download files, store them in Google Cloud Storage (GCS), send emails via AWS Simple Email Service (SES), and record actions in AWS DynamoDB.

## Features
- Download files from a provided URL.
- Store downloaded files in GCS.
- Send emails using AWS SES.
- Record email status and download status in DynamoDB.

## Prerequisites
- Node.js installed.
- AWS account with SES and DynamoDB configured.
- GCP account with a configured storage bucket.
- `dotenv` package for environment variable management.

## Installation
1. Clone the repository.
2. Install dependencies using `npm install`.
3. Set up your `.env` file with the necessary AWS and GCP credentials.

## Environment Variables
The following environment variables are required:
- `BUCKET_NAME`: Name of the GCS bucket.
- `GCP_SERVICE_ACCOUNT_KEY`: Service account key for GCP (base64 encoded).
- `SES_SENDER_EMAIL`: Email address for AWS SES sender.
- `TABLE_NAME`: Name of the DynamoDB table.

## Usage
To run the script, execute `node [script_name].js`. Ensure that the environment variables are set correctly in your `.env` file.

## Functions
- `downloadRelease(url, userEmail, attempt, maxRetries)`: Downloads a file from the given URL and handles retries and errors.
- `storeInGCS(filePath, email, attempt, maxRetries)`: Stores a file in GCS.
- `sendEmail(recipient, subject, body)`: Sends an email using AWS SES.
- `recordEmailSent(email, status, emailStat)`: Records email and download status in DynamoDB.
- `handler(event, context)`: AWS Lambda handler function to process events.

