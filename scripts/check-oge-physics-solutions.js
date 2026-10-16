const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const batches = require('./data/oge-physics-solutions');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oge-expected-'));
try {
  const file = path.join(dir, 'records.json');
  fs.writeFileSync(file, JSON.stringify(batches.map(({name,records}) => ({name,records}))));
  const result = spawnSync(process.execPath, [path.join(__dirname, 'check-physics-completion-pages.js')], {
    env: {...process.env, PHYSICS_EXPECTED_FILE:file}, stdio:'inherit',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally { fs.rmSync(dir, {recursive:true, force:true}); }
