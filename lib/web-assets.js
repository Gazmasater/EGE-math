'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const catalogueStyles = require('./catalogue-styles');
const root = path.join(__dirname, '..');
const cacheDirectory = path.join(root, 'public', 'cache');
const assets = new Map();
const urls = new Map();
fs.mkdirSync(cacheDirectory, {recursive: true});

function register(name, source) {
  const content = Buffer.from(source);
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
  const filename = name.replace(/\.(css|js)$/, `.${hash}.$1`);
  const url = `/assets/${filename}`;
  const destination = path.join(cacheDirectory, filename);
  // Retain earlier versions so an already open page can still load its assets.
  if (!fs.existsSync(destination)) fs.writeFileSync(destination, content);
  urls.set(name, url);
  assets.set(url, content);
}

for (const name of ['site.css', 'site.js', 'catalogue.js']) {
  register(name, fs.readFileSync(path.join(root, 'public', name)));
}
for (const subject of ['math', 'physics', 'oge', 'oge-physics']) {
  register(`catalogue-${subject}.css`, catalogueStyles(subject));
}

const icons = {
  'list.png': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M9 6h12M9 12h12M9 18h12" fill="none" stroke="#005d65" stroke-width="2"/><g fill="#005d65"><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></g></svg>',
  'close_button.png': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="m6 6 12 12M6 18 18 6" fill="none" stroke="#005d65" stroke-width="2"/></svg>',
  'eye.png': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" fill="none" stroke="#005d65" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="#005d65"/></svg>'
};
const fipiAssets = new Map([
  ['styles.css', 'fipi-base.css'],
  ['xmodules/os/img/_styles.css', 'fipi-ui.css'],
  ['lib/t3utils.js', 'fipi-utils.js']
]);
for (const [sourcePath, name] of fipiAssets) {
  let content = fs.readFileSync(path.join(root, 'fipi-assets', sourcePath));
  if (name === 'fipi-ui.css') {
    // Replace ASCII URLs without transcoding the legacy source's bytes.
    content = Buffer.from(content.toString('latin1').replace(/url\(["']?([^)'"\s]+)["']?\)/g, (_, file) => {
      if (icons[file]) return `url("data:image/svg+xml,${encodeURIComponent(icons[file])}")`;
      return `url("/fipi/xmodules/os/img/${file}")`;
    }), 'latin1');
  }
  register(name, content);
}

function assetUrl(name) {
  const url = urls.get(name);
  if (!url) throw new Error(`Unknown web asset: ${name}`);
  return url;
}

function sharedFipiAssetUrl(url) {
  const sourcePath = url.replace(/^\/fipi\/(?:oge\/|oge-physics\/)?/i, '');
  return assetUrl(fipiAssets.get(sourcePath));
}

function serveAsset(req, res, pathname) {
  if (!pathname.startsWith('/assets/')) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {allow: 'GET, HEAD'});
    res.end();
    return true;
  }
  const legacyName = pathname.slice('/assets/'.length);
  const legacy = legacyName === 'site.css' || legacyName === 'site.js';
  const url = legacy ? assetUrl(legacyName) : pathname;
  let content = assets.get(url);
  if (!content && /^\/assets\/[a-z0-9-]+\.[a-f0-9]{16}\.(?:css|js)$/.test(url)) {
    try { content = fs.readFileSync(path.join(cacheDirectory, path.basename(url))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!content) {
    res.writeHead(404, {'cache-control': 'no-store'});
    res.end();
    return true;
  }
  const etag = `"${path.basename(url)}"`;
  const headers = {
    'content-type': url.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8',
    'cache-control': legacy ? 'public, max-age=0, must-revalidate' : 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    etag
  };
  const tags = String(req.headers['if-none-match'] || '').split(',').map(value => value.trim().replace(/^W\//, ''));
  if (tags.includes(etag) || tags.includes('*')) {
    res.writeHead(304, headers);
    res.end();
  } else {
    res.writeHead(200, {...headers, 'content-length': content.length});
    res.end(req.method === 'HEAD' ? undefined : content);
  }
  return true;
}

module.exports = {assetUrl, sharedFipiAssetUrl, serveAsset};
