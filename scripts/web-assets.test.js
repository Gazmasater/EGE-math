'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {assetUrl, sharedFipiAssetUrl, serveAsset} = require('../lib/web-assets');
const root = path.join(__dirname, '..');

function request(url, method = 'GET', headers = {}) {
  const result = {};
  result.handled = serveAsset({method, headers}, {
    writeHead(status, responseHeaders) { result.status = status; result.headers = responseHeaders; },
    end(body) { result.body = body; }
  }, url);
  return result;
}

test('Immutable URLs identify their bytes; GET, HEAD and validators agree', () => {
  for (const name of ['site.css', 'site.js', 'catalogue.js', 'catalogue-math.css', 'catalogue-physics.css', 'catalogue-oge.css', 'catalogue-oge-physics.css', 'catalogue-oge-informatics.css']) {
    const url = assetUrl(name), get = request(url), head = request(url, 'HEAD');
    assert.equal(get.status, 200);
    assert.ok(url.includes(createHash('sha256').update(get.body).digest('hex').slice(0, 16)));
    assert.match(get.headers['cache-control'], /max-age=31536000, immutable/);
    assert.equal(Number(get.headers['content-length']), get.body.length);
    assert.equal(head.body, undefined);
    assert.deepEqual(head.headers, get.headers);
    for (const value of [get.headers.etag, 'W/' + get.headers.etag, '*', '"old", ' + get.headers.etag]) {
      const cached = request(url, 'GET', {'if-none-match': value});
      assert.equal(cached.status, 304);
      assert.equal(cached.body, undefined);
    }
    assert.equal(request(url, 'GET', {'if-none-match': '"different"'}).status, 200);
    assert.equal(request(url, 'POST').status, 405);
  }
});

test('Legacy URLs revalidate; invalid paths never expose project files', () => {
  for (const name of ['site.css', 'site.js']) {
    const result = request('/assets/' + name);
    assert.deepEqual(result.body, fs.readFileSync(path.join(root, 'public', name)));
    assert.match(result.headers['cache-control'], /must-revalidate/);
  }
  for (const url of ['/assets/../../server.js', '/assets/missing.1234567890abcdef.js', '/assets/.env', '/assets/site.invalid.css']) {
    assert.equal(request(url).status, 404);
  }
  assert.equal(request('/tasks/30D64C').handled, false);
});

test('All banks share the same legacy resources; source bytes and icon URLs are preserved', () => {
  for (const file of ['styles.css', 'lib/t3utils.js', 'xmodules/os/img/_styles.css']) {
    const url = sharedFipiAssetUrl('/fipi/' + file);
    assert.equal(sharedFipiAssetUrl('/fipi/oge-informatics/' + file), url);
    for (const bank of ['oge', 'oge-physics']) {
      assert.equal(sharedFipiAssetUrl('/fipi/' + bank + '/' + file), url);
      assert.deepEqual(fs.readFileSync(path.join(root, 'fipi-assets', bank, file)), fs.readFileSync(path.join(root, 'fipi-assets', file)));
    }
    if (file !== 'xmodules/os/img/_styles.css') {
      assert.deepEqual(request(url).body, fs.readFileSync(path.join(root, 'fipi-assets', file)));
    } else {
      const css = request(url).body.toString('latin1');
      assert.ok(!css.includes('url("eye.png")') && !css.includes('url("close_button.png")'));
      assert.equal((css.match(/data:image\/svg\+xml/g) || []).length, 3);
      assert.ok(!css.includes('/list.png'), 'the list icon used by OGE task pages is embedded too');
    }
  }
});

test('A version retained on disk remains available after a new release', () => {
  const content = Buffer.from('/* previous release */');
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
  const filename = `asset-regression.${hash}.css`;
  const destination = path.join(root, 'public', 'cache', filename);
  fs.writeFileSync(destination, content);
  try {
    assert.deepEqual(request('/assets/' + filename).body, content);
  } finally { fs.unlinkSync(destination); }
});
