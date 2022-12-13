// Core
import { promisify } from 'node:util';
import { gzip as callbackGzip, gunzip as callbackGunzip } from 'node:zlib';

// Packages
import dotenv from 'dotenv-safe';
import express from 'express';

// Local modules
import {
    getFile,
    putFile,
    destroyFile,
    DEFAULT_KEY,
} from './s3.js';
import render from './render.js';
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
