// Core
import { promisify } from 'node:util';
import { gzip as callbackGzip, gunzip as callbackGunzip } from 'node:zlib';
import path from 'node:path';

// Packages
import dotenv from 'dotenv-safe';
import express from 'express';

// Local modules
import {
    getFile,
    putFile,
    destroyFile,
    getFilesList,
    DEFAULT_KEY,
} from './s3.js';
// Inject .env variables from config file
dotenv.config();

// Promisify gzip libs
const gzip = promisify(callbackGzip);
const gunzip = promisify(callbackGunzip);

// Initialize Express server
const app = express();
app.use(express.urlencoded({ extended: true }));
app.set('etag', false);
app.use((req, res, next) => { res.removeHeader('X-Powered-By'); next(); });

// Middleware to parse _method field into req.method
app.use((req, res, next) => {
    if (req.body._method) {
        req.originalMethod = req.method;
        req.method = req.body._method;
        delete req.body._method;
    }
    next()
})

// Redirect from root to form
app.get('/', (req, res, next) => {
    res.redirect(`/bucket/${process.env.AWS_BUCKET_DEFAULT}/${DEFAULT_KEY}`);
});

// Render form for bucket/key
app.get('/bucket/:bucket/:key?', (req, res, next) => {
    const { bucket, key = DEFAULT_KEY } = req.params;
    getFile(key, bucket)
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

// Post content to bucket/key
app.post('/bucket/:bucket/:key?', (req, res, next) => {
    const { bucket, key = DEFAULT_KEY } = req.params;
    gzip(req.body.content)
        .then((gzippedBody) => putFile(gzippedBody, key, bucket))
        .then(() => {
            console.log(`Synced ${key} to ${bucket}`);
            res.redirect(`/bucket/${bucket}/${key}`);
        })
        .catch(next);
});

// Delete key from bucket
// Destructive action, so no default key
app.delete('/bucket/:bucket/:key', (req, res, next) => {
    const { bucket, key } = req.params;
    destroyFile(key, bucket)
        .then((response) => {
            console.log(response)
            console.log(`Deleted ${key} from ${bucket}`);
            res.redirect(`/bucket/${bucket}/${DEFAULT_KEY}`);
        })
        .catch(next);
})

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
    const filesList = await getFilesList(bucket);
    const nonBinaries = ['.html', '.css', '.js', '.txt'];
    const files = filesList.Contents.map((item) => {
        const url = nonBinaries.includes(path.extname(item.Key))
            ? `/bucket/${bucket}/${item.Key}`
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
                button { font: 1.25em -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: white; border-radius: 0.25em; border: 0; background: #07f; }
                .button--save { position: fixed; right: 2rem; bottom: 2rem; padding: .5rem 1rem; }
                .button--delete { background: white; font-size: 0.75em; border: 1px solid #07f; color: #07f; }
                .button--delete:hover { color: red; border-color: red; cursor: pointer; background: #fee; }
                textarea { font: 1em "MonoLisa", monospace; width: 100vw; height: 99.5vh; padding: 2rem; resize: none; outline: none; border: none; }
                aside { position: fixed; right: 1rem; top: 1rem; width: 15rem; height: 50vh; box-shadow: 0 0.0625em 0.25em rgba(0, 0, 0, 0.3); padding: 1rem; background: white; overflow-y: auto; border-radius: 0.25rem; }
                aside ul { margin: 0; padding: 0; list-style: none; }
                aside li { display: flex; justify-content: space-between; }
                a { color: #07f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                a[href^=http]:before { content: '↗ '; }
                p { margin: 0 0 0.5rem; padding: 0 0 0.25rem; }
            </style>
        </head>
        <body>
            <form method="post" action="/bucket/${bucket}/${key}">
                <textarea spellcheck="false" name="content" autofocus placeholder="TYPE STUFF">${content || ''}</textarea>
                <button class="button--save">Send to ${bucket}/${key}</button>
            </form>
            <aside>
                <p>Files in bucket:</p>
                <ul><li>${ files.map((file) => `<a href="${file.url}">${file.name}</a><form method="post" action="/bucket/${bucket}/${file.name}" onsubmit="return confirm('100% wanna ditch ${file.name} from bucket ${bucket}?');"><input type="hidden" name="_method" value="delete"><button class="button--delete">DEL</button></form>`).join(`</li><li>`) }</li></ul>
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
