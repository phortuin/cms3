# cmS3

Syncs content of textarea as a gzipped file to an S3 bucket of your choice.

## Set up
- Install dependencies with `npm i`
- Copy the `.env.example` file and name it `.env`
- Fill in the AWS key, secret, region & default bucket name<sup>[1](#fn1)</sup>
- Run with `npm start`

An Express server will run on `localhost:3012` and show a full screen textarea, a file list, and a Save button. When clicking the Save button, the content of the textarea is gzipped and uploaded to your bucket with the right headers. The textarea automatically gets prefilled with the content of the files (already) on your bucket<sup>[2](#fn2)</sup>. You can delete files too!

Simple websites made simple!

---
1. <a name="fn1"></a> Switch buckets by putting them in the URL: `localhost:3012/bucket/my-bucket`
2. <a name="fn2"></a> The default is `index.html` but you can send any text file to your bucket by putting it in the URL: `localhost:3012/bucket/my-bucket/styles.css`
