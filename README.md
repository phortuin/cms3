# CMS3

Syncs content of textarea as a gzipped `index.html` file to an S3 bucket of your choice.

## Set up
- Install dependencies with `npm i`
- Copy the `.env.example` file and name it `.env`
- Fill in the AWS key, secret, region & bucket name
- Run with `npm start`

An Express server will run on `localhost:3012` and show a full screen textarea + Save button. When clicking the button, the content of the textarea is gzipped and uploaded to your bucket with the right headers.

Simple websites made simple!
