require('dotenv-safe').config()
const aws = require('aws-sdk')
const path = require('path')
const os = require('os')

const putHTML = async function(body, bucket) {
    let s3 = new aws.S3()
    let params = {
        Bucket: bucket || process.env.AWS_BUCKET_DEFAULT,
        Key: 'index.html',
        ContentType: 'text/html; charset=utf-8',
        ContentEncoding: 'gzip',
        Body: body
    }
    try {
        await s3.putObject(params).promise()
        console.log(`Synced index.html to ${ bucket || process.env.AWS_BUCKET_DEFAULT }`);
    } catch(err) {
        console.error(err)
    }
}

module.exports = { putHTML };
