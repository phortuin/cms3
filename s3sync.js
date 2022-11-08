require('dotenv-safe').config()
const aws = require('aws-sdk')
const path = require('path')
const os = require('os')

let s3 = new aws.S3()
const DEFAULT_KEY = 'index.html'

const getHTML = function(bucket = process.env.AWS_BUCKET_DEFAULT, key = DEFAULT_KEY) {
    let params = {
        Bucket: bucket,
        Key: key,
    }
    return s3.getObject(params).promise()
}

const putHTML = function(body, bucket = process.env.AWS_BUCKET_DEFAULT, key = DEFAULT_KEY) {
    let params = {
        Bucket: bucket,
        Key: key,
        ContentType: 'text/html; charset=utf-8',
        ContentEncoding: 'gzip',
        Body: body,
    }
    return s3.putObject(params).promise()
}

module.exports = { getHTML, putHTML, DEFAULT_KEY };
