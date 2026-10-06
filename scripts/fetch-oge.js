const fs = require('node:fs/promises');
const path = require('node:path');
const https = require('node:https');
const { OGE_ORIGIN, OGE_BANKS, ogeBank, ogePublicTaskId, ogeAssetPaths } = require('../lib/oge-catalog');
const bank = ogeBank(process.argv[2] || 'oge');
const ownPagePattern = new RegExp(`^${bank.filePrefix}-\\d+\\.raw\\.html$`, 'i');

const root = path.resolve(__dirname, '..');
const assetRoot = path.join(root, 'fipi-assets', bank.section);
const decoder = new TextDecoder('windows-1251');
const taskPattern = /<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([0-9A-Z]+)['"]/gi;

async function request(url, body, attempts = 3) {
  const target = new URL(url);
  if (target.origin !== OGE_ORIGIN) throw new Error('Unexpected FIPI origin');
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        // Same incomplete FIPI certificate chain as the existing EGE importer.
        const req = https.request(target, { method: body ? 'POST' : 'GET', rejectUnauthorized: false, timeout: 30000,
          headers: body ? { 'content-type': 'application/x-www-form-urlencoded' } : {} }, res => {
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('error', reject);
          res.on('end', () => res.statusCode === 200 ? resolve(Buffer.concat(chunks)) : reject(new Error(`HTTP ${res.statusCode}: ${url}`)));
        });
        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error(`Timeout: ${url}`)));
        req.end(body);
      });
    } catch (error) {
      if (attempt === attempts) throw error;
      console.warn(`Retry ${attempt}: ${error.message}`);
    }
  }
}

async function main() {
  const pages = [];
  const ids = new Set();
  let expectedTotal;
  const assets = new Set();
  for (let page = 0; page < 100; page++) {
    const form = new URLSearchParams({ search: '1', pagesize: '100', proj: bank.project });
    if (page) form.set('page', String(page));
    const bytes = await request(`${OGE_ORIGIN}/bank/questions.php`, form.toString());
    const html = decoder.decode(bytes);
    const pageIds = [...html.matchAll(taskPattern)].map(match => match[1].toUpperCase());
    const reportedTotal = Number(html.match(/setQCount\((\d+)/)?.[1]);
    if (!pageIds.length || !reportedTotal) throw new Error(`Empty or invalid FIPI page ${page + 1}`);
    expectedTotal ??= reportedTotal;
    if (expectedTotal !== reportedTotal) throw new Error('FIPI bank changed during download; retry the import');
    for (const id of pageIds) {
      if (ids.has(id)) throw new Error(`Duplicate task ${id} on page ${page + 1}`);
      ids.add(id);
    }
    for (const relative of ogeAssetPaths(html, bank.section)) assets.add(relative);
    pages.push(bytes);
    console.log(`page=${page + 1} tasks=${pageIds.length} total=${ids.size}/${expectedTotal}`);
    if (ids.size === expectedTotal) break;
    if (pageIds.length !== 100 || ids.size > expectedTotal) throw new Error('Incomplete FIPI page sequence');
  }
  if (ids.size !== expectedTotal) throw new Error(`Downloaded ${ids.size} of ${expectedTotal} tasks`);

  // Public task URLs and solution IDs are shared with EGE; never shadow an existing task.
  const publicIds = new Set([...ids].map(id => ogePublicTaskId(id, bank.section)));
  for (const name of await fs.readdir(root)) {
    if (!name.endsWith('.raw.html') || ownPagePattern.test(name)) continue;
    const html = decoder.decode(await fs.readFile(path.join(root, name)));
    const sourceBank = Object.values(OGE_BANKS).find(item => new RegExp(`^${item.filePrefix}-\\d+\\.raw\\.html$`, 'i').test(name));
    for (const match of html.matchAll(taskPattern)) {
      const existingId = sourceBank ? ogePublicTaskId(match[1], sourceBank.section) : match[1].toUpperCase();
      if (publicIds.has(existingId)) throw new Error(`FIPI task ID collision with ${name}: ${match[1]}`);
    }
  }

  let downloadedAssets = 0;
  const queue = [...assets];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const relative = queue.shift();
      const target = path.resolve(assetRoot, ...relative.split('/'), ...(relative.endsWith('/') ? ['index.html'] : []));
      if (!target.startsWith(`${assetRoot}${path.sep}`)) throw new Error(`Invalid asset path: ${relative}`);
      if (relative.endsWith('/')) {
        const directory = path.dirname(target);
        try {
          if ((await fs.stat(directory)).isFile()) {
            // Recover the old directory response without discarding the downloaded HTML.
            const staging = await fs.mkdtemp(path.join(assetRoot, '.oge-document-'));
            await fs.rename(directory, path.join(staging, 'index.html'));
            await fs.mkdir(directory);
            await fs.rename(path.join(staging, 'index.html'), target);
            await fs.rmdir(staging);
          }
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      try { const stat = await fs.stat(target); if (stat.size) continue; } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const bytes = await request(`${OGE_ORIGIN}/${relative.split('/').map(encodeURIComponent).join('/')}`);
      if (!bytes.length) throw new Error(`Empty asset: ${relative}`);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(`${target}.new`, bytes);
      await fs.rename(`${target}.new`, target);
      downloadedAssets++;
      if (downloadedAssets % 100 === 0) console.log(`assets=${downloadedAssets}/${assets.size}`);
    }
  }));
  // Replace pages only after all pages and assets have been validated/downloaded.
  const names = pages.map((_, index) => `${bank.filePrefix}-${index + 1}.raw.html`);
  for (const [index, name] of names.entries()) await fs.writeFile(path.join(root, `${name}.new`), pages[index]);
  for (const name of names) await fs.rename(path.join(root, `${name}.new`), path.join(root, name));
  for (const name of await fs.readdir(root)) {
    if (ownPagePattern.test(name) && !names.includes(name)) await fs.unlink(path.join(root, name));
  }
  console.log(JSON.stringify({ section: bank.section, pages: pages.length, tasks: ids.size, assets: assets.size, downloadedAssets }));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
