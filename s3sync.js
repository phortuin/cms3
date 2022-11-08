// Core
const path = require('path')
const os = require('os')

// NPM
const aws = require('aws-sdk')
require('dotenv-safe').config()

// Constants
const DEFAULT_KEY = 'index.html'

// Initialize S3
const s3 = new aws.S3()

/**
 * Gets S3 object with key name from bucket
 *
 * @param  {String}
 * @param  {String}
 * @return {Promise<Buffer>}
 */
function getHTML(bucket = process.env.AWS_BUCKET_DEFAULT, key = DEFAULT_KEY) {
    const params = {
        Bucket: bucket,
        Key: key,
    }
    return s3.getObject(params).promise()
}

/**
 * Puts an S3 object with key name into bucket, using body as the key’s contents
 *
 * @param  {String} body
 * @param  {String} bucket
 * @param  {String} key
 * @return {Promise}
 */
function putHTML(body, bucket = process.env.AWS_BUCKET_DEFAULT, key = DEFAULT_KEY) {
    const params = {
        Bucket: bucket,
        Key: key,
        ContentType: 'text/html; charset=utf-8',
        ContentEncoding: 'gzip',
        Body: body,
    }
    return s3.putObject(params).promise()
}

module.exports = { getHTML, putHTML, DEFAULT_KEY };
