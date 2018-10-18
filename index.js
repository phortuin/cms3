const bodyParser = require('body-parser')
const express = require('express')
const os = require('os')
const s3sync = require('./s3sync.js')
const promisify = require('bluebird').promisify
const createDir = promisify(require('mkdirp'))
const gzip = promisify(require('zlib').gzip)
const writeFile = promisify(require('fs').writeFile)
const app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.set('etag', false)
app.use((req, res, next) => { res.removeHeader('X-Powered-By'); next() })

function render(content) {
    return `
        <!doctype html>
        <html>
        <head><title>CMS3</title><style>* { box-sizing: border-box } body { margin: 0 } body, textarea, button { font: 1em "iA Writer Duospace", monospace; } textarea { display: block; resize: none; width: 100vw; height: 100vh; outline: none; border: none; padding: 2rem } button { border: 0; background: #00f; color: white; padding: .5rem 1rem; position: fixed; right: 2rem; bottom: 2rem; }</style></head>
        <body>
            <form method="post" action="/">
                <textarea spellcheck="false" name="content" autofocus placeholder="TYPE STUFF">${ content || '' }</textarea>
                <button>Save</button>
            </form>
        </body>
        </html>
    `
}

app.get('/', (req, res, next) => {
    res.send(render(res.locals.content))
})

app.post('/', (req, res, next) => {
    res.locals.content = req.body.content
    gzip(req.body.content)
        .then(gzippedBody => writeFile(`${os.tmpdir}/cms3_index.html`, gzippedBody))
        .then(() => s3sync.sync())
    res.send(render(res.locals.content))
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
