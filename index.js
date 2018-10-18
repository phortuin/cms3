const bodyParser = require('body-parser')
const express = require('express')
const promisify = require('bluebird').promisify
const gzip = promisify(require('zlib').gzip)
const gunzip = promisify(require('zlib').gunzip)
const s3sync = require('./s3sync.js')
const app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.set('etag', false)
app.use((req, res, next) => { res.removeHeader('X-Powered-By'); next() })

function render(content, bucket) {
    return `
        <!doctype html>
        <html>
        <head>
            <title>cmS3</title>
            <style>
                * { box-sizing: border-box }
                body { margin: 0 }
                button { position: fixed; right: 2rem; bottom: 2rem; padding: .5rem 1rem; font: 1.25em 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: white; border-radius: 0.25em; border: 0; background: #4a49eb; }
                textarea { font: 1em "iA Writer Duospace", monospace; }
                textarea { width: 100vw; height: 100vh; padding: 2rem; resize: none; outline: none; border: none; }
            </style>
        </head>
        <body>
            <form method="post" action="/bucket/${ bucket }">
                <textarea spellcheck="false" name="content" autofocus placeholder="TYPE STUFF">${ content || '' }</textarea>
                <button>Send to ${bucket}</button>
            </form>
        </body>
        </html>
    `
}

app.get('/', (req, res, next) => {
    res.redirect(`/bucket/${process.env.AWS_BUCKET_DEFAULT}`)
})

app.get('/bucket/:bucket', (req, res, next) => {
    let bucket = req.params.bucket
    s3sync.getHTML(bucket)
        .then(data => gunzip(data.Body))
        .then(gunzippedBody => res.send(render(gunzippedBody, bucket)))
        .catch(next)
})

app.post('/bucket/:bucket', (req, res, next) => {
    let bucket = req.params.bucket
    gzip(req.body.content)
        .then(gzippedBody => s3sync.putHTML(gzippedBody, bucket))
        .then(() => {
            console.log(`Synced index.html to ${bucket}`)
            res.redirect(`/bucket/${ bucket }`)
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
let port = process.env.PORT || 3012
app.listen(port, () => {
    if (app.get('env') === 'development') {
        console.log(`Development server available on http://localhost:${port}`)
    }
})
