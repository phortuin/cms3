require('dotenv-safe').config()
const aws = require('aws-sdk')
const path = require('path')
const os = require('os')

let s3 = new aws.S3()
let key = 'index.html'

const getHTML = async function(bucket = process.env.AWS_BUCKET_DEFAULT) {
    let params = {
        Bucket: bucket,
        Key: key,
    }
    try {
        return await s3.getObject(params).promise()
    } catch(err) {
        console.error(err)
    }
}

const putHTML = async function(body, bucket = process.env.AWS_BUCKET_DEFAULT) {
    let params = {
        Bucket: bucket,
        Key: key,
        ContentType: 'text/html; charset=utf-8',
        ContentEncoding: 'gzip',
        Body: body,
    }
    try {
        return await s3.putObject(params).promise()
    } catch(err) {
        console.error(err)
    }
}

module.exports = { getHTML, putHTML };
