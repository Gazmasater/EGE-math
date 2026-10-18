'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { conditionText } = require('../../lib/seo-text');
const { solutionFile } = require('../../lib/solution-files');

function isDocumentTask(task) {
  return conditionText(task.fragment).startsWith('Создайте в текстовом редакторе документ');
}

function auditDocument(task, record) {
  assert.ok(isDocumentTask(task), task.id + ': not a text document');
  assert.equal(record.answer, 'Документ ODT доступен для скачивания', task.id + ': answer');
  const file = solutionFile(task.id);
  assert.ok(file, task.id + ': missing attachment');
  const bytes = fs.readFileSync(file.path);
  assert.equal(bytes.length, file.bytes, task.id + ': attachment size');
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash, file.sha256, task.id + ': attachment changed');
  for (const required of ['14 пунктов', '1 см', '12 пунктов', '115%', 'Число строк:', 'число столбцов:', 'Проверка и сохранение', '.odt']) {
    assert.ok(record.solution.includes(required), task.id + ': missing document explanation: ' + required);
  }
  const checked = JSON.parse(execFileSync('python3', [path.join(__dirname, 'check-informatics-document.py')], {
    input: JSON.stringify({ fragment: task.fragment, file: file.path }), encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024
  }));
  assert.ok(record.solution.includes(`Число строк: ${checked.tableRows}, число столбцов: ${checked.tableColumns}.`), task.id + ': printed table dimensions');
  assert.ok(record.solution.includes(`Устанавливаем ширину ${checked.tableWidthCm} см`), task.id + ': printed table width');
  assert.ok(record.solution.includes(`Абзацев, выровненных по ширине: ${checked.ordinaryParagraphs}.`), task.id + ': printed paragraph count');
  for (const m of checked.merges) {
    if (m.colspan > 1) assert.ok(record.solution.includes(`В строке ${m.row} объединяем столбцы от ${m.column} до ${m.column + m.colspan - 1}.`), task.id + ': column merge explanation');
    if (m.rowspan > 1) assert.ok(record.solution.includes(`В столбце ${m.column} объединяем строки от ${m.row} до ${m.row + m.rowspan - 1}.`), task.id + ': row merge explanation');
  }
  return { kind: 'document', documentHash: hash, ...checked };
}

module.exports = { isDocumentTask, auditDocument };
