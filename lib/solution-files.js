'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { createHash } = require('node:crypto');
const files = require('./solution-files.json');
const documentName = /^OGEINF[A-F0-9]{6}$/u;
const formats = {
  odt: { mime: 'text', label: 'документ' },
  ods: { mime: 'spreadsheet', label: 'таблицу' },
  odp: { mime: 'presentation', label: 'презентацию' }
};

function solutionFile(taskId) {
  if (typeof taskId !== 'string' || !documentName.test(taskId) || !Object.hasOwn(files, taskId)) return null;
  const entry = files[taskId];
  if (!Object.hasOwn(formats, entry.type) || !/^[a-f0-9]{64}$/u.test(entry.sha256)) throw new Error('Invalid solution file manifest');
  const name = taskId + '.' + entry.type;
  return { ...entry, name,
    path: path.join(__dirname, '..', 'solution-files', 'oge-informatics', name),
    url: '/solutions/files/' + name,
    contentType: 'application/vnd.oasis.opendocument.' + formats[entry.type].mime };
}

// Call only for a solution whose published status has already been checked.
function renderSolutionFileLink(taskId) {
  const file = solutionFile(taskId);
  return file ? `<p><a href="${file.url}" download="${file.name}">Скачать ${file.type === 'odt' ? 'готовый' : 'готовую'} ${formats[file.type].label} (${file.type.toUpperCase()})</a></p>` : '';
}

async function serveSolutionFile(req, res, pathname, isPublished) {
  if (!pathname.startsWith('/solutions/files/')) return false;
  const match = pathname.match(/^\/solutions\/files\/(OGEINF[A-F0-9]{6})\.(odt|ods|odp)$/u);
  const file = match && solutionFile(match[1]);
  if (!file || file.type !== match[2] || !isPublished(match[1])) {
    res.writeHead(404, { 'cache-control': 'no-store' }); res.end(); return true;
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { allow: 'GET, HEAD', 'cache-control': 'no-store' }); res.end(); return true;
  }
  let data;
  try { data = await fs.readFile(file.path); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    res.writeHead(404, { 'cache-control': 'no-store' }); res.end(); return true;
  }
  if (data.length !== file.bytes || createHash('sha256').update(data).digest('hex') !== file.sha256) {
    res.writeHead(503, { 'cache-control': 'no-store' }); res.end(); return true;
  }
  const headers = { 'content-type': file.contentType, 'content-disposition': `attachment; filename="${file.name}"`,
    'content-length': data.length, 'x-content-type-options': 'nosniff',
    'cache-control': 'public, max-age=3600', etag: `"${file.sha256}"` };
  if (req.headers['if-none-match'] === headers.etag) {
    delete headers['content-length']; res.writeHead(304, headers); res.end(); return true;
  }
  res.writeHead(200, headers); res.end(req.method === 'HEAD' ? undefined : data); return true;
}

module.exports = { solutionFile, renderSolutionFileLink, serveSolutionFile };
