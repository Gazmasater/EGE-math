// Validate official downloads without repeatedly downloading large archives.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const https = require('node:https');
const {readOgeCatalog} = require('./lib/oge-catalog');
const {OGE_ORIGIN, ogeIsExternalAsset} = require('../lib/oge-catalog');

const section = process.argv[2] || 'oge-informatics';
const {tasks, assets} = readOgeCatalog(undefined, section);
const urls = [...assets].filter(file => ogeIsExternalAsset(file, section))
  .map(file => OGE_ORIGIN + '/' + file.split('/').map(encodeURIComponent).join('/'));
const links = tasks.flatMap(task => [...task.fragment.matchAll(/class="fipi-attachment" href="([^"]+)"/g)].map(match => match[1]));
assert.deepEqual(new Set(links), new Set(urls), 'Все архивы должны иметь обычные ссылки в условиях');

function check(url, attempt = 1) {
  return new Promise((resolve, reject) => {
    // Scoped to the official OGE host, whose certificate chain is incomplete.
    assert.equal(new URL(url).origin, OGE_ORIGIN);
    const request = https.request(url, {method: 'HEAD', timeout: 30000, rejectUnauthorized: false}, response => {
      response.resume();
      const bytes = Number(response.headers['content-length']);
      if (response.statusCode !== 200 || !(bytes > 0) || /text\/html/i.test(response.headers['content-type'] || '')) {
        reject(new Error(`${url}: HTTP ${response.statusCode}, bytes=${bytes}`));
      } else resolve({url, status: response.statusCode, bytes});
    });
    request.on('error', reject);
    request.on('timeout', () => request.destroy(new Error(`Timeout: ${url}`)));
    request.end();
  }).catch(error => attempt < 3 ? check(url, attempt + 1) : Promise.reject(error));
}

async function main() {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({length: 4}, async () => {
    while (next < urls.length) {
      results.push(await check(urls[next++]));
      if (results.length % 100 === 0) console.log(`attachments=${results.length}/${urls.length}`);
    }
  }));
  const report = {section, checkedAt: new Date().toISOString(), attachments: urls.length, errors: 0, results: results.sort((a, b) => a.url.localeCompare(b.url))};
  fs.mkdirSync('storage', {recursive: true});
  fs.writeFileSync(`storage/${section}-attachments-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({section, attachments: urls.length, errors: 0}));
}
main().catch(error => {console.error(error); process.exitCode = 1;});
