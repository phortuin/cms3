require('dotenv-safe').config()
const s3 = require('s3')
const path = require('path')
const os = require('os')

const sync = function() {
    const client = s3.createClient({
        s3Options: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_KEY,
            region: process.env.AWS_REGION
        }
    });

    var params = {
      localFile: `${os.tmpdir}/cms3_index.html`,
      s3Params: {
        Bucket: process.env.AWS_BUCKET,
        Key: 'index.html',
        ContentEncoding: 'gzip',
      }
    };

    var uploader = client.uploadFile(params);

    uploader.on('error', function(err) {
      console.error("Unable to sync:", err.stack);
    });
    let progress = 0;
    uploader.on('progress', function() {
        // @todo build solid progress indicator, using uploader events
    });
    uploader.on('end', function() {
      console.log(`Synced index.html to ${ process.env.AWS_BUCKET }`);
    });
}

module.exports = { sync };
