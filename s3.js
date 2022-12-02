// Core
const path = require('path');
const os = require('os');

// NPM
const {
    S3,
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsCommand,
} = require('@aws-sdk/client-s3');
const mime = require('mime-types');

// Inject .env variables from config file
require('dotenv-safe').config();

// Constants
const DEFAULT_KEY = 'index.html';

// Initialize S3
const s3Client = new S3();

/**
 * Gets S3 object with key name from bucket. Note that with the new SDK,
 * getObjectCommand returns an instance of IncomingMessage while we need a
 * Buffer. This is mitigated by transforming the Readable stream
 * (=IncomingMessage) into a Buffer.
 *
 * @see https://transang.me/modern-fetch-and-how-to-get-buffer-output-from-aws-sdk-v3-getobjectcommand/
 * @param  {String}
 * @param  {String}
 * @return {Promise<Buffer>}
 */
async function getFile(bucket = process.env.AWS_BUCKET_DEFAULT, key = DEFAULT_KEY) {
    const response = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    }));
    const stream = response.Body;
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.once('end', () => resolve(Buffer.concat(chunks)));
        stream.once('error', reject);
    });
}

/**
 * Puts an S3 object with key name into bucket, using body as the key’s contents
 *
 * @param  {String} body
 * @param  {String} bucket
 * @param  {String} key
 * @return {Promise}
 */
function putFile(body, bucket = process.env.AWS_BUCKET_DEFAULT, key = DEFAULT_KEY) {
    return s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: mime.contentType(key) || 'application/octet-stream',
        ContentEncoding: 'gzip',
        Body: body,
    }));
}

/**
 * Gets list of objects from a bucket
 *
 * @param  {String} bucket
 * @return {Promise}
 */
function getFilesList(bucket = process.env.AWS_BUCKET_DEFAULT) {
    return s3Client.send(new ListObjectsCommand({
        Bucket: bucket
    }))
}

module.exports = { getFile, putFile, getFilesList, DEFAULT_KEY };
