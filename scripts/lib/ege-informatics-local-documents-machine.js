'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { conditionText } = require('../../lib/seo-text');
const root = path.resolve(__dirname, '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function model(condition) {
  assert.ok(condition.includes('Куприна «Поединок»'));
  const chapter = condition.match(/главы ([IVX]+) /u)?.[1];
  const terms = [...condition.matchAll(/«([^»]+)»/gu)].slice(0, 2).map(m => m[1]);
  assert.ok(chapter && terms.length === 2 && terms[0][0].toUpperCase() + terms[0].slice(1) === terms[1]);
  const wholeOnly = !condition.includes('только в составе других слов');
  assert.ok(wholeOnly || condition.includes('только в составе других слов'));
  return { chapter, terms, wholeOnly };
}

function scope(paragraphs, chapter) {
  const headings = paragraphs.map((s, i) => ({ s: s.trim(), i })).filter(x => /^[IVXLCDM]+$/u.test(x.s));
  const matches = headings.filter(x => x.s === chapter);
  assert.equal(matches.length, 1, 'ambiguous chapter');
  const startParagraph = matches[0].i;
  const endParagraph = headings.find(x => x.i > startParagraph)?.i ?? paragraphs.length;
  return { startParagraph, endParagraph, text: paragraphs.slice(startParagraph + 1, endParagraph).join('\n') };
}

// Walk every position and inspect neighbours; independent of Python tokenization.
function count(text, m) {
  const letter = ch => !!ch && /\p{L}/u.test(ch);
  const joins = i => letter(text[i]) || (['-', '‑'].includes(text[i]) && letter(text[i - 1]) && letter(text[i + 1]));
  const allPositions = [], wholePositions = [], selectedPositions = [];
  const caseCounts = Object.fromEntries(m.terms.map(t => [t, 0]));
  for (let i = 0; i < text.length; i++) {
    const term = m.terms.find(t => text.startsWith(t, i));
    if (!term) continue;
    allPositions.push(i);
    const whole = !joins(i - 1) && !joins(i + term.length);
    if (whole) wholePositions.push(i);
    if (m.wholeOnly === whole) { selectedPositions.push(i); caseCounts[term]++; }
  }
  return { allOccurrences: allPositions.length, wholeWords: wholePositions.length, answer: selectedPositions.length, selectedPositions, caseCounts };
}

function solve(paragraphs, m) {
  const { text, ...bounds } = scope(paragraphs, m.chapter);
  return { ...bounds, ...count(text, m) };
}

function compute(task, data, readFile = fs.readFileSync) {
  const condition = conditionText(task.fragment);
  assert.equal(condition, data.condition, 'changed condition');
  const m = model(condition);
  assert.deepEqual(m, data.model, 'changed model');
  const urls = [...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.odt)["']/gu)].map(x => x[1]);
  assert.deepEqual(urls, [data.url], 'changed attachment');
  const filename = path.resolve(root, data.url.slice(1).replace(/^fipi\//u, 'fipi-assets/'));
  assert.ok(filename.startsWith(root + '/fipi-assets/ege-informatics/'));
  const bytes = readFile(filename);
  assert.equal(sha(bytes), data.fileSha256, 'changed file');
  const parsed = JSON.parse(execFileSync('python3', [path.join(__dirname, 'read-ege-informatics-odt.py')], { input: bytes, encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024 }));
  assert.equal(parsed.notes, 0, 'unexpected notes');
  assert.equal(sha(JSON.stringify(parsed.paragraphs)), data.paragraphsSha256);
  const result = solve(parsed.paragraphs, m);
  assert.deepEqual(result, data.result, 'changed calculation');
  return result;
}
module.exports = { model, scope, count, solve, compute };
