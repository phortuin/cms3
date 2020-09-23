# cmS3

Syncs content of textarea as a gzipped `index.html` file to an S3 bucket of your choice.

## Set up
- Install dependencies with `npm i`
- Copy the `.env.example` file and name it `.env`
- Fill in the AWS key, secret, region & default bucket name<sup>[1](#fn1)</sup>
- Run with `npm start`

An Express server will run on `localhost:3012` and show a full screen textarea + Save button. When clicking the button, the content of the textarea is gzipped and uploaded to your bucket with the right headers. The textarea automatically gets prefilled with the content of the `index.html` file (already) on your bucket.

Simple websites made simple!

## Todo

- [x] BUG: If no index.html is found or is not gzipped, `getHTML` fails

---
1. <a name="fn1"></a> Switch buckets by putting them in the URL: `localhost:3012/bucket/my-bucket`
