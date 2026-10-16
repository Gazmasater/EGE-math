const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { ogeTaskMatchesTopic } = require('../lib/oge-catalog');
const { ogeSourceSignature } = require('../lib/oge-classification');
const { conditionText } = require('../lib/seo-text');
const { auditArithmetic } = require('./lib/audit-oge-math-arithmetic');
const { auditProbability } = require('./lib/audit-oge-math-probability');
const { auditProbabilityBasic } = require('./lib/audit-oge-math-probability-basic');
const { auditFractions } = require('./lib/audit-oge-math-fractions');
const { auditRealNumbers } = require('./lib/audit-oge-math-real-numbers');
const { auditPolynomials } = require('./lib/audit-oge-math-polynomials');
const { auditProgressions } = require('./lib/audit-oge-math-progressions');
const { auditPowers } = require('./lib/audit-oge-math-powers');
const { auditRoots } = require('./lib/audit-oge-math-roots');
const { auditExpressions } = require('./lib/audit-oge-math-expressions');
const { auditEquations } = require('./lib/audit-oge-math-equations');
const { auditInequalities } = require('./lib/audit-oge-math-inequalities');
const { auditNumberLine } = require('./lib/audit-oge-math-number-line');
const { auditCoordinatePlane } = require('./lib/audit-oge-math-coordinate-plane');
const { auditFunctions } = require('./lib/audit-oge-math-functions');
const { auditGeometryBasics } = require('./lib/audit-oge-math-geometry-basics');
const { auditTriangles } = require('./lib/audit-oge-math-triangles');
const { auditQuadrilaterals } = require('./lib/audit-oge-math-quadrilaterals');
const { auditGeometryRemaining } = require('./lib/audit-oge-math-geometry-remaining');
const { auditWordProblems } = require('./lib/audit-oge-math-word-problems');
const batches = require('./data/oge-math-solutions');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const option = key => { const i = args.indexOf(key); return i < 0 ? null : args[i + 1]; };
const tasks = readOgeCatalog(root).tasks;
const byId = new Map(tasks.map(t => [t.id, t]));
const records = batches.flatMap(b => b.records);
assert.equal(new Set(records.map(r => r.id)).size, records.length, 'Duplicate solution');
for (const batch of batches) {
  const topicIds = tasks.filter(t => ogeTaskMatchesTopic(t, batch.topic)).map(t => t.id).sort();
  assert.ok(topicIds.length, 'Unknown or empty topic');
  assert.deepEqual(records.filter(r => topicIds.includes(r.id)).map(r => r.id).sort(), topicIds, 'Incomplete topic '+batch.topic);
  for (const record of batch.records) {
    const task = byId.get(record.id), source = batch.sources[record.id];
    assert.ok(task && source, record.id);
    assert.equal(ogeSourceSignature(task), source.sourceHash, record.id+': changed FIPI source');
    const text = conditionText(task.fragment);
    assert.equal(text, source.fipiCondition, record.id+': condition');
    assert.ok(source.reviewed && ['exact', 'variant', 'method'].includes(source.match));
    assert.match(source.url, /^https:\/\/math-oge\.sdamgia\.ru\/problem\?id=\d+$/);
    assert.ok(source.comparison.length > 100, record.id+': source comparison');
    assert.equal(record.answer, source.expectedAnswer, record.id+': checked answer');
    if (source.discrepancy) {
      assert.equal(source.discrepancy.status, 'resolved', record.id+': unresolved source discrepancy');
      assert.ok(source.discrepancy.resolution.length > 100);
    } else if (source.match === 'exact') assert.equal(record.answer, source.externalAnswer);
    // Include the images emitted at runtime by the original FIPI helper, in
    // document order. Do not rewrite the primary fragment or its source hash.
    const primaryImages = task.fragment.split('КЭС:')[0].replace(/<script\b[^>]*>\s*ShowPictureQ\(\s*(['"])(docs\/[^'"]+)\1(?:\s*,[^)]*)?\)\s*;?\s*<\/script>/gi, (_, quote, file) => {
      assert.ok(!file.split('/').includes('..'), record.id+': invalid primary image path');
      return '<img src="/fipi/oge/'+file.split('/').map(encodeURIComponent).join('/')+'">';
    });
    assert.ok(!/<script\b[^>]*>\s*ShowPicture/i.test(primaryImages), record.id+': unhandled primary image');
    const imageUrls = [...primaryImages.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m=>m[1]);
    assert.deepEqual(source.images.map(i=>i.src), imageUrls, record.id+': all primary images must be reviewed');
    if (imageUrls.length) {
      assert.ok(source.visualReview?.reviewed && source.visualReview.notes.length>50);
      for (const asset of source.images) {
        assert.ok(asset.reviewed && ['formula','diagram'].includes(asset.role));
        assert.match(asset.src,/^\/fipi\/oge\/[A-Za-z0-9_./-]+$/);
        const local = path.resolve(root, asset.src.replace(/^\/fipi\//,'fipi-assets/'));
        assert.ok(local.startsWith(path.join(root,'fipi-assets','oge')+path.sep));
        assert.equal(createHash('sha256').update(fs.readFileSync(local)).digest('hex'),asset.sha256,record.id+': changed image');
      }
    }
    assert.ok(record.solution.length > 400 && record.solution.includes('Проверка'), record.id+': detailed explanation');
    assert.ok(record.solution.endsWith('Ответ: '+record.answer+'.'));
    const forbiddenText = ['inequalities', 'functions', 'geometry-basics'].includes(batch.name) ? /\/|<\/?[a-z][^>]*>|undefined/i : /[\/<>]|undefined/;
    assert.ok(!forbiddenText.test(record.answer+record.solution), record.id+': plain text');
    const stack = [];
    for (const char of record.answer+record.solution) {
      if (char === '⟦') stack.push(0);
      if (char === '¦') { assert.ok(stack.length); stack[stack.length-1]++; }
      if (char === '⟧') assert.equal(stack.pop(), 1);
    }
    assert.equal(stack.length, 0, record.id+': fraction balance');
    // Read the primary condition independently of the explanation generator.
    const value = Number(record.answer.replace(',', '.').replace('−', '-'));
    // Equation answers may contain signed roots, radicals or coordinate pairs;
    // their values and complete solution sets are checked against the source below.
    if (!['polynomials', 'equations', 'inequalities', 'functions', 'triangles', 'quadrilaterals', 'geometry-remaining'].includes(batch.name)) {
      assert.ok(Number.isFinite(value));
      if (batch.name === 'progressions' && source.model.kind === 'cooling') assert.ok(value < 0);
      else if (batch.name !== 'arithmetic' && !(batch.name === 'expressions' && ['celsius-to-fahrenheit','fahrenheit-to-celsius'].includes(source.model.kind))) assert.ok(value > 0);
    }
    if (batch.name === 'formulas') {
      if (text.includes('колодца')) {
        const [,fixed,rate] = text.match(/C=(\d+)\+(\d+)n/);
        const n = Number(text.match(/колодца из (\d+) колец/)[1]);
        let sum = Number(fixed);
        for (let i=0; i<n; i++) sum += Number(rate);
        assert.equal(value, sum, record.id+': repeated addition');
        assert.equal((value-Number(fixed))/Number(rate), n);
      } else if (text.includes('Центростремительное')) {
        assert.ok(text.includes('a=ω²R'));
        const omega = Number(text.match(/скорость равна (\d+)/)[1]);
        const acceleration = Number(text.match(/ускорение равно (\d+)/)[1]);
        assert.ok(Math.abs(omega*omega*value-acceleration)<1e-10, record.id+': reverse substitution');
        if (record.id === '7C8727') {
          assert.equal(source.externalAnswer, '13');
          assert.equal(omega*omega*Number(source.externalAnswer), 468);
          assert.notEqual(468, acceleration, 'External answer contradicts the primary condition');
        }
      } else {
        assert.ok(text.includes('P=I²R'));
        const power = Number(text.match(/мощность составляет (\d+)/)[1]);
        const current = Number(text.match(/сила тока равна (\d+)/)[1]);
        assert.equal(current*current*value, power, record.id+': reverse substitution');
      }
    } else if (batch.name === 'combinatorics') {
      if (record.id === '27FFA4') {
        assert.ok(text.includes('3, 4 или 5'));
        let good = 0, total = 0;
        for (let first=1;first<=6;first++) for (let second=1;second<=6;second++) {
          total++; if ([3,4,5].includes(first+second)) good++;
        }
        assert.equal(value, good/total);
      } else if (record.id === '039E6A') {
        assert.ok(text.includes('20 раз') && text.includes('8 раз') && text.includes('тринадцатом'));
        // Exhaust all 2^20 sequences, retaining exactly eight heads. Bit 12
        // is the thirteenth throw. This checks conditioning, not a frequency
        // shortcut or the unconditioned probability of a fair coin.
        let good = 0, total = 0;
        for (let mask=0;mask<2**20;mask++) {
          let bits=mask,heads=0;
          while (bits) { bits &= bits-1; heads++; }
          if (heads!==8) continue;
          total++; if (!(mask & (1<<12))) good++;
        }
        assert.equal(total, 125970); assert.equal(good, 75582);
        assert.equal(value, good/total);
      } else throw new Error('Unknown combinatorics task '+record.id);
    } else if (batch.name === 'arithmetic') {
      auditArithmetic(task,source,record,text);
    } else if (batch.name === 'probability-diagrams') {
      auditProbability(task,source,record,text);
    } else if (batch.name === 'probability-basic') {
      auditProbabilityBasic(task,source,record,text);
    } else if (batch.name === 'fractions') {
      auditFractions(task,source,record,text);
    } else if (batch.name === 'real-numbers') {
      auditRealNumbers(task,source,record);
    } else if (batch.name === 'polynomials') {
      auditPolynomials(task,source,record);
    } else if (batch.name === 'progressions') {
      auditProgressions(task,source,record);
    } else if (batch.name === 'powers') {
      auditPowers(task,source,record);
    } else if (batch.name === 'roots') {
      auditRoots(task,source,record);
    } else if (batch.name === 'expressions') {
      auditExpressions(task,source,record);
    } else if (batch.name === 'equations') {
      auditEquations(task,source,record);
    } else if (batch.name === 'inequalities') {
      auditInequalities(task,source,record);
    } else if (batch.name === 'number-line') {
      auditNumberLine(task,source,record);
    } else if (batch.name === 'coordinate-plane') {
      auditCoordinatePlane(task,source,record);
    } else if (batch.name === 'functions') {
      auditFunctions(task,source,record);
    } else if (batch.name === 'geometry-basics') {
      auditGeometryBasics(task,source,record);
    } else if (batch.name === 'triangles') {
      // This batch includes exact radicals, lists of side lengths and proofs.
      // Its audit checks values geometrically and pins the reviewed proofs.
      auditTriangles(task,source,record);
    } else if (batch.name === 'quadrilaterals') {
      auditQuadrilaterals(task,source,record);
    } else if (batch.name === 'geometry-remaining') {
      auditGeometryRemaining(task,source,record);
    } else if (batch.name === 'word-problems') {
      auditWordProblems(task,source,record);
    } else throw new Error('Missing independent checks for '+batch.name);
  }
}
let changed = 0, published = null, integrity = null;
if (!args.includes('--content-only')) {
  const apply = args.includes('--apply');
  const target = path.resolve(option('--db') || path.join(root, 'storage/solutions.sqlite'));
  const baselinePath = option('--baseline') && path.resolve(option('--baseline'));
  if (apply) assert.ok(baselinePath && baselinePath !== target && fs.existsSync(baselinePath), 'Apply requires a separate baseline snapshot');
  const db = new DatabaseSync(target, {readOnly: !apply});
  let transaction = false;
  try {
    if (apply) { db.exec('BEGIN IMMEDIATE'); transaction = true; }
    const read = db.prepare('SELECT * FROM solutions WHERE upper(task_id)=?');
    const readExact = db.prepare('SELECT * FROM solutions WHERE task_id=?');
    const insert = apply && db.prepare('INSERT INTO solutions(task_id,answer,solution,diagram_svg,diagram_caption,published,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)');
    for (const record of records) {
      let row = read.get(record.id);
      if (!row && apply) {
        const now = new Date().toISOString();
        insert.run(record.id,record.answer,record.solution,record.diagram_svg,record.diagram_caption,now,now);
        row = read.get(record.id); changed++;
      }
      assert.ok(row, record.id+': unpublished');
      for (const key of ['answer','solution','diagram_svg','diagram_caption']) assert.equal(row[key],record[key],record.id+': '+key);
      assert.equal(row.published, 1);
    }
    if (baselinePath) {
      const baseline = new DatabaseSync(baselinePath, {readOnly:true});
      try {
        for (const row of baseline.prepare('SELECT * FROM solutions').all()) assert.deepEqual(readExact.get(row.task_id), row, row.task_id+': previous row changed');
      } finally { baseline.close(); }
    }
    integrity = Object.values(db.prepare('PRAGMA integrity_check').get())[0];
    assert.equal(integrity, 'ok');
    const ids = new Set(db.prepare('SELECT task_id FROM solutions WHERE published=1').all().map(r => r.task_id));
    published = tasks.filter(t => ids.has(t.id)).length;
    if (apply) { db.exec('COMMIT'); transaction = false; }
  } catch (error) { if (transaction) db.exec('ROLLBACK'); throw error; }
  finally { db.close(); }
}
console.log(JSON.stringify({catalog:tasks.length,prepared:records.length,changed,published,
  remaining:published === null ? null : tasks.length-published,integrity,status:'ok'}));
