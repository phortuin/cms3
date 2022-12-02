// Core
const { promisify } = require('util');
const gzip = promisify(require('zlib').gzip);
const gunzip = promisify(require('zlib').gunzip);
const path = require('path');

// Inject .env variables from config file
require('dotenv-safe').config();

// NPM
const express = require('express');

// Local
const {
    getFile,
    putFile,
    getFilesList,
    DEFAULT_KEY,
} = require('./s3.js');

// Initialize Express server
const app = express();
app.use(express.urlencoded({ extended: true }));
app.set('etag', false);
app.use((req, res, next) => { res.removeHeader('X-Powered-By'); next(); });

// Redirect from root to form
app.get('/', (req, res, next) => {
    res.redirect(`/bucket/${process.env.AWS_BUCKET_DEFAULT}/${DEFAULT_KEY}`);
});

// Render form
app.get('/bucket/:bucket/:key?', (req, res, next) => {
    const { bucket, key = DEFAULT_KEY } = req.params;
    getFile(bucket, key)
        .then((body) => gunzip(body))
        .then(async (gunzippedBody) => { res.send(await render(gunzippedBody, bucket, key)) })
        .catch(async (error) => {
            if (error.Code === 'NoSuchKey') { // Key missing, we’ll allow the user to create a new file
                res.send(await render(null, bucket, key));
            } else {
                next(error);
            }
        });
});

// Post form
app.post('/bucket/:bucket/:key?', (req, res, next) => {
    const { bucket, key = DEFAULT_KEY } = req.params;
    gzip(req.body.content)
        .then((gzippedBody) => putFile(gzippedBody, bucket, key))
        .then(() => {
            console.log(`Synced ${key} to ${bucket}`);
            res.redirect(`/bucket/${bucket}/${key}`);
        })
        .catch(next);
});

// Errors
app.use((err, req, res, next) => {
    err.message = err.message || err.error;
    res.status(err.status || 500).send(`${err.message || 'Internal Server Error'}`);
    if (app.get('env') === 'development') {
        console.error(err);
    }
});

// Not found
app.use((req, res, next) => res.status(404).send('404'));

// $RUN
const port = process.env.PORT || 3012;
app.listen(port, () => {
    if (app.get('env') === 'development') {
        console.log(`Development server available on http://localhost:${port}`);
    }
});

/**
 * Render HTML Form with S3 bucket name and file name embedded in the form,
 * and the key’s body (HTML) as textarea value so we can send it back to S3
 * as a new HTML file
 *
 * @param  {String} content
 * @param  {String} bucket, S3 bucket name
 * @param  {String} key, file name eg. index.html
 * @return {String}
 */
async function render(content, bucket, key) {
    const filesList = await getFilesList();
    const nonBinaries = ['.html', '.css', '.js', '.txt'];
    const files = filesList.Contents.map((item) => {
        const url = nonBinaries.includes(path.extname(item.Key))
            ? item.Key
            : getResourceUrl(item.Key, bucket);
        return {
            url,
            name: item.Key
        }
    });
    return `
        <!doctype html>
        <html>
        <head>
            <title>cmS3</title>
            <style>
                * { box-sizing: border-box }
                body { margin: 0; font: 1em -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.3; }
                button { position: fixed; right: 2rem; bottom: 2rem; padding: .5rem 1rem; font: 1.25em -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: white; border-radius: 0.25em; border: 0; background: #00f; }
                textarea { font: 1em "MonoLisa", monospace; width: 100vw; height: 100vh; padding: 2rem; resize: none; outline: none; border: none; }
                aside { position: fixed; right: 1rem; top: 1rem; width: 15rem; height: 50vh; box-shadow: 0 0.0625em 0.25em rgba(0, 0, 0, 0.3); padding: 1rem; background: white; overflow-y: auto; border-radius: 0.25rem; }
                aside ul { margin: 0; padding: 0; list-style: none; }
                aside li { white-space: nowrap; word-break; overflow: hidden; text-overflow: ellipsis; }
                a { color: #00f; }
                a[href^=http]:before { content: '↗ '; }
                p { margin: 0 0 0.5rem; padding: 0 0 0.25rem; }
            </style>
        </head>
        <body>
            <form method="post" action="/bucket/${bucket}/${key}">
                <textarea spellcheck="false" name="content" autofocus placeholder="TYPE STUFF">${content || ''}</textarea>
                <button>Send to ${bucket}/${key}</button>
            </form>
            <aside>
                <p>Files in bucket:</p>
                <ul><li>${ files.map((file) => `<a href="${file.url}">${file.name}</a>`).join(`</li><li>`) }</li></ul>
            </aside>
        </body>
        </html>
    `;
}

/**
 * String together a resource URL for an S3 object
 *
 * @param  {String} key
 * @param  {String} bucket
 * @return {String}
 */
function getResourceUrl(key, bucket) {
    return `https://s3.${process.env.AWS_REGION}.amazonaws.com/${bucket}/${key}`
}
