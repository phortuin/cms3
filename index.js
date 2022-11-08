// Core
const { promisify } = require('util')
const gzip = promisify(require('zlib').gzip)
const gunzip = promisify(require('zlib').gunzip)

// NPM
const express = require('express')

// Local
const {
    getHTML,
    putHTML,
    DEFAULT_KEY,
} = require('./s3sync.js')

// Initialize Express server
const app = express()
app.use(express.urlencoded({ extended: true }))
app.set('etag', false)
app.use((req, res, next) => { res.removeHeader('X-Powered-By'); next() })

// Redirect from root to form
app.get('/', (req, res, next) => {
    res.redirect(`/bucket/${process.env.AWS_BUCKET_DEFAULT}/${DEFAULT_KEY}`)
})

// Render form
app.get('/bucket/:bucket/:key?', (req, res, next) => {
    const bucket = req.params.bucket
    const key = req.params.key || DEFAULT_KEY
    getHTML(bucket, key)
        .then((data) => gunzip(data.Body))
        .then((gunzippedBody) => res.send(render(gunzippedBody, bucket, key)))
        .catch((error) => {
            if (error.code === 'NoSuchKey') {
                res.send(render(null, bucket, key))
            } else {
                next(error)
            }
        })
})

// Post form
app.post('/bucket/:bucket/:key?', (req, res, next) => {
    const bucket = req.params.bucket
    const key = req.params.key || DEFAULT_KEY
    gzip(req.body.content)
        .then((gzippedBody) => putHTML(gzippedBody, bucket, key))
        .then(() => {
            console.log(`Synced ${key} to ${bucket}`)
            res.redirect(`/bucket/${ bucket }/${ key }`)
        })
        .catch(next)
})

// Errors
app.use((err, req, res, next) => {
    err.message = err.message || err.error
    res.status(err.status || 500).send(`${err.message || 'Internal Server Error'}`)
    if (app.get('env') === 'development') {
        console.error(err)
    }
})

// Not found
app.use((req, res, next) => res.status(404).send('404'))

// $RUN
const port = process.env.PORT || 3012
app.listen(port, () => {
    if (app.get('env') === 'development') {
        console.log(`Development server available on http://localhost:${port}`)
    }
})

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
function render(content, bucket, key) {
    return `
        <!doctype html>
        <html>
        <head>
            <title>cmS3</title>
            <style>
                * { box-sizing: border-box }
                body { margin: 0 }
                button { position: fixed; right: 2rem; bottom: 2rem; padding: .5rem 1rem; font: 1.25em 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: white; border-radius: 0.25em; border: 0; background: #4a49eb; }
                textarea { font: 1em "MonoLisa", monospace; }
                textarea { width: 100vw; height: 100vh; padding: 2rem; resize: none; outline: none; border: none; }
            </style>
        </head>
        <body>
            <form method="post" action="/bucket/${ bucket }/${key}">
                <textarea spellcheck="false" name="content" autofocus placeholder="TYPE STUFF">${ content || '' }</textarea>
                <button>Send to ${bucket}/${key}</button>
            </form>
        </body>
        </html>
    `
}
