// Core
import { promisify } from 'node:util';
import { gzip as callbackGzip, gunzip as callbackGunzip } from 'node:zlib';

// Packages
import dotenv from 'dotenv-safe';
import express from 'express';
import multer from 'multer';

// Local modules
import {
    getFile,
    putTextFile,
    putBinaryFile,
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

// Initialise middleware for file upload
const upload = multer();

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
    res.redirect(`/${process.env.AWS_BUCKET_DEFAULT}/${DEFAULT_KEY}`);
});

// Upload file. To make things confusing, the form field
// for the file input is named 'file' which is reflected in 'upload.single('file')'
app.post('/upload/:bucket', upload.single('file'), (req, res, next) => {
    const { bucket } = req.params;
    const { buffer: body, originalname: key } = req.file;
    putBinaryFile(body, key, bucket)
        .then(() => {
            console.log(`Uploaded ${key} to ${bucket}`);
            res.redirect(`/${bucket}/${DEFAULT_KEY}`);
        })
        .catch(next);
})

// Render form for bucket/key
app.get('/:bucket/:key?', (req, res, next) => {
    const { bucket, key = DEFAULT_KEY } = req.params;
    getFile(key, bucket)
        .then((body) => gunzip(body))
        .then(async (gunzippedBody) => { res.send(await render(gunzippedBody, key, bucket)) })
        .catch(async (error) => {
            if (error.Code === 'NoSuchKey') { // Key missing, we’ll allow the user to create a new file
                res.send(await render(null, key, bucket));
            } else {
                next(error);
            }
        });
});

// Post content to bucket/key
app.post('/:bucket/:key?', (req, res, next) => {
    const { bucket, key = DEFAULT_KEY } = req.params;
    gzip(req.body.content)
        .then((gzippedBody) => putTextFile(gzippedBody, key, bucket))
        .then(() => {
            console.log(`Synced ${key} to ${bucket}`);
            res.redirect(`/${bucket}/${key}`);
        })
        .catch(next);
});

// Delete key from bucket
// Destructive action, so no default key
app.delete('/:bucket/:key', (req, res, next) => {
    const { bucket, key } = req.params;
    destroyFile(key, bucket)
        .then((response) => {
            console.log(`Deleted ${key} from ${bucket}`);
            res.redirect(`/${bucket}/${DEFAULT_KEY}`);
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
