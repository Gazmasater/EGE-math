const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { solutionFile, renderSolutionFileLink, serveSolutionFile } = require('../lib/solution-files');
const manifest = require('../lib/solution-files.json');

test('only registered document identifiers produce a download path', () => {
  for (const value of ['__proto__', '../storage/solutions.sqlite', 'OGEINF000000', 'OGEINFC97A45/../../x', 'OGEINFC97A45.odt', '', null]) {
    assert.equal(solutionFile(value), null);
    assert.equal(renderSolutionFileLink(value), '');
  }
});

test('downloads enforce publication, preserve bytes and handle HEAD and caching', async () => {
  const http = require('node:http');
  const id = 'OGEINFC97A45', file = solutionFile(id);
  const server = http.createServer((req,res) => {
    serveSolutionFile(req,res,new URL(req.url,'http://localhost').pathname,task => task===id)
      .then(served => { if(!served){res.writeHead(404);res.end();} })
      .catch(error => { res.writeHead(500); res.end(String(error)); });
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(base + file.url), data = Buffer.from(await response.arrayBuffer());
    assert.equal(response.status,200);
    assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256);
    assert.equal(response.headers.get('content-type'),file.contentType);
    assert.equal(response.headers.get('content-disposition'),`attachment; filename="${file.name}"`);
    const head=await fetch(base+file.url,{method:'HEAD'});
    assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),String(file.bytes));
    assert.equal((await head.arrayBuffer()).byteLength,0);
    assert.equal((await fetch(base+file.url,{headers:{'If-None-Match':response.headers.get('etag')}})).status,304);
    assert.equal((await fetch(base+file.url,{method:'POST'})).status,405);
    for(const pathname of ['/solutions/files/OGEINFB88508.odt','/solutions/files/OGEINF000000.odt','/solutions/files/%2e%2e%2fstorage%2fsolutions.sqlite']) {
      assert.equal((await fetch(base+pathname)).status,404);
    }
  } finally {
    server.closeAllConnections();await new Promise(resolve => server.close(resolve));
  }
});

test('all ODF attachments match the reviewed bytes and format', () => {
  assert.equal(Object.keys(manifest).length, 206);
  const kinds = { odt: 'text', ods: 'spreadsheet', odp: 'presentation' };
  for (const id of Object.keys(manifest)) {
    const file = solutionFile(id), bytes = fs.readFileSync(file.path);
    assert.equal(bytes.length, file.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
    assert.equal(file.contentType, 'application/vnd.oasis.opendocument.' + kinds[file.type]);
    assert.equal(file.url, `/solutions/files/${id}.${file.type}`);
    assert.ok(renderSolutionFileLink(id).includes(`download="${id}.${file.type}"`));
  }
});

test('spreadsheet and presentation downloads require the registered extension and publication', async () => {
  const http = require('node:http');
  const ids = ['OGEINFF3EC43','OGEINFDCAD4C'];
  const server=http.createServer((req,res)=>serveSolutionFile(req,res,new URL(req.url,'http://localhost').pathname,id=>ids.includes(id)).then(served=>{if(!served){res.writeHead(404);res.end();}}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const id of ids){
      const file=solutionFile(id), response=await fetch(base+file.url), bytes=Buffer.from(await response.arrayBuffer());
      assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),file.contentType);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
      assert.equal((await fetch(base+file.url.replace(/\.[^.]+$/u,'.odt'))).status,404);
    }
    assert.equal((await fetch(base+'/solutions/files/OGEINF7E9007.ods')).status,404);
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
