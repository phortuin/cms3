require('dotenv-safe').config();
const s3 = require('s3');
const path = require('path');

const sync = function() {
    const client = s3.createClient({
        s3Options: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_KEY,
            region: process.env.AWS_REGION
        }
    });

    var params = {
      localDir: "dist",
      deleteRemoved: true, // default false, whether to remove s3 objects
                           // that have no corresponding local file.

      getS3Params: (localFile, stat, cb) => {
        const fileName = path.basename(localFile)
        const fileExt = path.extname(localFile)
        let s3Params = {}
        if (/\.(css|html)/.test(fileExt)) {
            s3Params['ContentEncoding'] = 'gzip'
        }
        if (fileExt === '.woff2') {
            s3Params['ContentType'] = 'application/font-woff2'
        }
        if (fileName === '.DS_Store') {
            s3Params = null
        }
        cb(undefined, s3Params) // undefined = error, when error arises. but how
      },
      s3Params: {
        Prefix: '', // If omitted, will still upload localDir to bucket root, but deleteRemoved=true has no effect
        Bucket: process.env.AWS_BUCKET
      }
    };

    var uploader = client.uploadDir(params);

    uploader.on('error', function(err) {
      console.error("Unable to sync:", err.stack);
    });
    let progress = 0;
    uploader.on('progress', function() {
        // @todo build solid progress indicator, using uploader events
    });
    uploader.on('end', function() {
      console.log(`Synced dist folder to ${ process.env.AWS_BUCKET }`);
    });
}

module.exports = { sync };
