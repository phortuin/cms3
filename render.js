// Core
import path from 'node:path';

// Local modules
import {
	getFilesList,
} from './s3.js';

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
export default async function render(content, key, bucket) {
    const filesList = await getFilesList(bucket);
    const nonBinaries = ['.html', '.css', '.js', '.txt'];
    const files = filesList.Contents.map((item) => {
        const url = nonBinaries.includes(path.extname(item.Key))
            ? `/${bucket}/${item.Key}`
            : getResourceUrl(item.Key, bucket);
        return {
            url,
            name: item.Key
        }
    });
    return `
        <!doctype html>
        <html class="nojs">
        <head>
            <title>cmS3</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
            <link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Ctext%20x='0'%20y='14'%3E🪣%3C/text%3E%3C/svg%3E" type="image/svg+xml" />
            <style>
                * { box-sizing: border-box }
                body { margin: 0; font: 1em -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.3; }
                button { font: 1.25em -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: white; border-radius: 0.25em; border: 0; background: #07f; }
                .button--save { position: fixed; right: 2rem; bottom: 2rem; padding: .5rem 1rem; }
                .button--tiny { background: white; font-size: 0.75em; border: 1px solid #07f; color: #07f; }
                .button--tiny:hover { color: red; border-color: red; cursor: pointer; background: #fee; }
                .button--choose, .button--upload { width: 100%; margin-top: 0.25em; }
                .button--choose:hover { color: #090; border-color: #090; background: #dfd; }
                textarea { font: 1em "MonoLisa", monospace; width: 100vw; height: 99.5vh; padding: 2rem; resize: none; outline: none; border: none; }
                aside { position: fixed; right: 1rem; top: 1rem; display: flex; flex-direction: column; justify-content: space-between; width: 15rem; height: 50vh; box-shadow: 0 0.0625em 0.25em rgba(0, 0, 0, 0.3); padding: 1rem; background: white; overflow-y: auto; border-radius: 0.25rem; }
                aside ul { margin: 0; padding: 0; list-style: none; }
                aside li { display: flex; justify-content: space-between; }
                a { color: #07f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                a[href^=http]:before { content: '↗ '; }
                p { margin: 0 0 0.5rem; padding: 0 0 0.25rem; }
                input[type=file] { max-width: 100%; }
                html.js input[type=file] { display: none; }
                html.js [data-upload-file] { display: none; }
                html.nojs [data-select-file] { display: none; }
            </style>
            <script>
                document.documentElement.classList.remove('nojs');
                document.documentElement.classList.add('js');
                window.addEventListener('DOMContentLoaded', () => {
                    const fileInput = document.querySelector('input[type=file]');
                    const selectFileButton = document.querySelector('[data-select-file]');
                    const uploadButton = document.querySelector('[data-upload-file]');
                    selectFileButton.addEventListener('click', () => {
                        fileInput.click();
                    });
                    fileInput.addEventListener('change', () => {
                        if (fileInput.value) {
                            const filename = fileInput.value.split("\\\\").pop();
                            uploadButton.innerText = 'Upload ' + filename;
                            uploadButton.style.display = 'block';
                        } else {
                            uploadButton.style.display = 'none';
                        }
                    })
                });
            </script>
        </head>
        <body>
            <form method="post" action="/${bucket}/${key}">
                <textarea spellcheck="false" name="content" autofocus placeholder="TYPE STUFF">${content || ''}</textarea>
                <button class="button--save">Save to ${bucket}/${key}</button>
            </form>
            <aside>
                <div>
                    <p>Files in bucket:</p>
                    <ul><li>${ files.map((file) => `<a href="${file.url}">${file.name}</a><form method="post" action="/${bucket}/${file.name}" onsubmit="return confirm('100% wanna ditch ${file.name} from bucket ${bucket}?');"><input type="hidden" name="_method" value="delete"><button class="button--tiny">DEL</button></form>`).join(`</li><li>`) }</li></ul>
                </div>
                <form method="post" action="/upload/${bucket}" enctype="multipart/form-data">
                    <input type="file" name="file">
                    <button class="button--tiny button--choose" type="button" data-select-file>Open file picker dialog</button>
                    <button class="button--tiny button--upload" type="submit" data-upload-file>Upload file</button>
                </form>
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
