'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { ogeTaskMatchesTopic } = require('../lib/oge-catalog');
const { ogeSourceSignature } = require('../lib/oge-classification');
const { conditionText } = require('../lib/seo-text');
const auditors = require('./lib/audit-ege-informatics-start');
auditors['executor-programs'] = require('./lib/audit-ege-informatics-programs').auditPrograms;
auditors.recursion = require('./lib/audit-ege-informatics-recursion').auditRecursion;
auditors['number-transform'] = require('./lib/audit-ege-informatics-transform').auditTransform;
auditors.networks = require('./lib/audit-ege-informatics-networks').auditNetworks;
auditors.combinatorics = require('./lib/audit-ege-informatics-combinatorics').auditCombinatorics;
auditors.codes = require('./lib/audit-ege-informatics-codes').auditCodes;
auditors['information-volume'] = require('./lib/audit-ege-informatics-volume').auditVolume;
auditors['numeral-systems'] = require('./lib/audit-ege-informatics-numeral').auditNumeral;
auditors['media-transfer'] = require('./lib/audit-ege-informatics-media').auditMedia;
auditors['string-executors'] = require('./lib/audit-ege-informatics-strings').auditStrings;
auditors['array-analysis'] = require('./lib/audit-ege-informatics-arrays').auditArrays;
auditors.divisors = require('./lib/audit-ege-informatics-divisors').auditDivisors;
auditors.debugging = require('./lib/audit-ege-informatics-debugging').auditDebugging;
auditors['truth-tables'] = require('./lib/audit-ege-informatics-truth').auditTruth;
auditors.logic = require('./lib/audit-ege-informatics-logic').auditLogic;
auditors['program-analysis'] = require('./lib/audit-ege-informatics-program-analysis').auditProgramAnalysis;
auditors['graph-paths'] = require('./lib/audit-ege-informatics-graph-paths').auditGraphPaths;
auditors['plane-executors'] = require('./lib/audit-ege-informatics-plane').auditPlane;
auditors['graph-models'] = require('./lib/audit-ege-informatics-graph-models').auditGraphModels;
auditors.games = require('./lib/audit-ege-informatics-games').auditGames;
auditors['number-sequence'] = require('./lib/audit-ege-informatics-number-sequence').auditNumberSequence;
auditors.strings = require('./lib/audit-ege-informatics-string-files').auditStringFiles;
auditors.sorting = require('./lib/audit-ege-informatics-sorting').auditSorting;
auditors.spreadsheets = require('./lib/audit-ege-informatics-spreadsheets').auditSpreadsheets;
auditors['robot-grid'] = require('./lib/audit-ege-informatics-robot-grid').auditRobotGrid;
auditors.databases = require('./lib/audit-ege-informatics-databases').auditDatabases;
auditors.processes = require('./lib/audit-ege-informatics-processes').auditProcesses;
auditors['write-program'] = require('./lib/audit-ege-informatics-write-program').auditWriteProgram;
auditors['array-writing'] = require('./lib/audit-ege-informatics-array-writing').auditArrayWriting;
auditors['pair-writing'] = require('./lib/audit-ege-informatics-pair-writing').auditPairWriting;
auditors['final-writing'] = require('./lib/audit-ege-informatics-final-writing').auditFinalWriting;
auditors['inline-databases'] = require('./lib/audit-ege-informatics-inline-databases').auditInlineDatabases;
auditors['archive-transfer'] = require('./lib/audit-ege-informatics-archive-transfer').auditArchiveTransfer;
auditors['inline-spreadsheets'] = require('./lib/audit-ege-informatics-inline-spreadsheets').auditInlineSpreadsheets;
auditors['archive-repair'] = require('./lib/audit-ege-informatics-archive-repair').auditArchiveRepair;
auditors['recovered-sequences'] = require('./lib/audit-ege-informatics-recovered-sequences').auditRecoveredSequences;
auditors['recovered-spreadsheet'] = require('./lib/audit-ege-informatics-recovered-spreadsheet').auditRecoveredSpreadsheet;
auditors['recovered-strings'] = require('./lib/audit-ege-informatics-recovered-strings').auditRecoveredStrings;
auditors['recovered-documents'] = require('./lib/audit-ege-informatics-recovered-documents').auditRecoveredDocuments;
auditors['local-documents'] = require('./lib/audit-ege-informatics-local-documents').auditLocalDocuments;
auditors['final-restored'] = require('./lib/audit-ege-informatics-final-restored').auditFinalRestored;
auditors['mirror-optimization'] = require('./lib/audit-ege-informatics-mirror-optimization').auditMirrorOptimization;
auditors['mirror-clusters'] = require('./lib/audit-ege-informatics-mirror-clusters').auditMirrorClusters;
auditors['mirror-databases'] = require('./lib/audit-ege-informatics-mirror-databases').auditMirrorDatabases;
auditors['mirror-sorting'] = require('./lib/audit-ege-informatics-mirror-sorting').auditMirrorSorting;
auditors['mirror-sequences'] = require('./lib/audit-ege-informatics-mirror-sequences').auditMirrorSequences;
auditors['mirror-processes'] = require('./lib/audit-ege-informatics-mirror-processes').auditMirrorProcesses;
auditors['mirror-strings'] = require('./lib/audit-ege-informatics-mirror-strings').auditMirrorStrings;
auditors['mirror-spreadsheets'] = require('./lib/audit-ege-informatics-mirror-spreadsheets').auditMirrorSpreadsheets;
auditors['mirror-robot'] = require('./lib/audit-ege-informatics-mirror-robot').auditMirrorRobot;
auditors['mirror-library'] = require('./lib/audit-ege-informatics-mirror-library').auditMirrorLibrary;
for (const name of ["official-demos-spreadsheet", "official-demos-document", "official-demos-string", "official-demos-sequence", "official-demos-boxes"]) auditors[name] = require('./lib/audit-ege-informatics-official-demos').auditOfficialDemos;
for (const name of ["recovered-2021-temperature", "recovered-2021-document", "recovered-2021-robot", "recovered-2021-triples", "recovered-2021-containers", "recovered-2021-string"]) auditors[name] = require('./lib/audit-ege-informatics-recovered-2021').auditRecovered2021;
auditors['recovered-processes'] = require('./lib/audit-ege-informatics-recovered-processes').auditRecoveredProcesses;
auditors['recovered-nesting'] = require('./lib/audit-ege-informatics-recovered-nesting').auditRecoveredNesting;
auditors['recovered-clusters'] = require('./lib/audit-ege-informatics-recovered-clusters').auditRecoveredClusters;
auditors['recovered-databases'] = require('./lib/audit-ege-informatics-recovered-databases').auditRecoveredDatabases;
for (const name of ["recovered-2022-document", "recovered-2022-pairs", "recovered-2022-trees", "recovered-2022-circle"]) auditors[name] = require('./lib/audit-ege-informatics-recovered-2022').auditRecovered2022;
auditors['linked-games'] = require('./lib/audit-ege-informatics-linked-games').auditLinkedGames;
auditors['restored-game-links'] = require('./lib/audit-ege-informatics-restored-game-links').auditRestoredGameLinks;
const batches = require('./data/ege-informatics-solutions');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const option = key => { const i = args.indexOf(key); return i < 0 ? null : args[i + 1]; };
const tasks = readOgeCatalog(root, 'ege-informatics').tasks;
const byId = new Map(tasks.map(t => [t.id, t]));
const records = batches.flatMap(b => b.records);
const checks = [], matches = {};
assert.equal(new Set(records.map(r => r.id)).size, records.length, 'Duplicate solution');
for (const batch of batches) {
  const topicTasks = tasks.filter(t => ogeTaskMatchesTopic(t, batch.topic, 'ege-informatics'));
  let selected = topicTasks;
  if (batch.subgroup) {
    if (batch.name === 'media-transfer') {
      assert.equal(batch.subgroup, 'non-archive', 'Unknown media subgroup');
      // The archive conditions still require a separate review of their rates.
      selected = topicTasks.filter(t => !conditionText(t.fragment).includes('архиватор'));
      assert.equal(topicTasks.length - selected.length, 54, 'Changed archive subgroup');
    } else if (batch.name === 'restored-game-links') {
      assert.equal(batch.subgroup,'restored-links');
      const selectedIds=["EGEINFF931BC", "EGEINF904C34", "EGEINF319677", "EGEINF0BFCDC"];
      selected=topicTasks.filter(t=>selectedIds.includes(t.id));
      assert.equal(selected.length,selectedIds.length);
    } else if (batch.name === 'linked-games') {
      assert.equal(batch.subgroup, 'explicit-source-group');
      const referenced = topicTasks.filter(t => conditionText(t.fragment).includes('Для игры, описанной в задании 19'));
      selected = referenced.filter(t => /data-game-group=["'][A-F0-9]+["']/i.test(t.fragment) && t.fragment.includes('class="game-source"'));
      assert.equal(selected.length, 84);
      assert.equal(referenced.length - selected.length, 4);
    } else if (batch.name === 'games') {
      assert.equal(batch.subgroup, 'standalone-rules', 'Unknown games subgroup');
      selected = topicTasks.filter(t => !conditionText(t.fragment).includes('Для игры, описанной в задании 19'));
      assert.equal(selected.length, 79, 'Changed full-rule games subgroup');
      assert.equal(topicTasks.length - selected.length, 88, 'Changed missing-rule games subgroup');
    } else if (batch.name === 'recovered-sequences') {
      assert.equal(batch.subgroup, 'official-open-sequences');
      selected = topicTasks.filter(t => ['EGEINFFCE3BE','EGEINF42A7D2','EGEINF8C5A88','EGEINF8FBD47'].includes(t.id));
      assert.equal(selected.length, 4);
    } else if (batch.name === 'number-sequence') {
      assert.equal(batch.subgroup, 'local-text-files', 'Unknown sequence subgroup');
      selected = topicTasks.filter(t => !t.fragment.includes('/docs/official-open/') && !t.fragment.includes('/restored-2021/') && !t.fragment.includes('/restored-final/') && !t.fragment.includes('/restored-optimization/') && !t.fragment.includes('/restored-clusters/') && !t.fragment.includes('/restored-databases/') && !t.fragment.includes('/restored-sorting/') && !t.fragment.includes('/restored-sequences/') && !t.fragment.includes('/restored-processes/') && !t.fragment.includes('/restored-strings/') && !t.fragment.includes('/restored-spreadsheets/') && !t.fragment.includes('/restored-robot/') && !t.fragment.includes('/restored-library/')).filter(t => /href=["']\/fipi\/ege-informatics\/[^"']+\.txt["']/u.test(t.fragment));
      assert.equal(selected.length, 6, 'Changed local sequence data subgroup');
      assert.equal(topicTasks.length - selected.length, 31, 'Changed tasks outside original sequence batch');
    } else if (['strings', 'sorting', 'spreadsheets', 'robot-grid', 'databases', 'processes'].includes(batch.name)) {
      assert.equal(batch.subgroup, ['spreadsheets', 'robot-grid', 'databases', 'processes'].includes(batch.name) ? 'local-ods-files' : 'local-text-files', 'Unknown local-file subgroup');
      const filePattern = ['spreadsheets', 'robot-grid', 'databases', 'processes'].includes(batch.name)
        ? /href=["']\/fipi\/ege-informatics\/[^"']+\.ods["']/u
        : /href=["']\/fipi\/ege-informatics\/[^"']+\.txt["']/u;
      selected = topicTasks.filter(t => !t.fragment.includes('/docs/official-open/') && !t.fragment.includes('/restored-2021/') && !t.fragment.includes('/restored-final/') && !t.fragment.includes('/restored-optimization/') && !t.fragment.includes('/restored-clusters/') && !t.fragment.includes('/restored-databases/') && !t.fragment.includes('/restored-sorting/') && !t.fragment.includes('/restored-sequences/') && !t.fragment.includes('/restored-processes/') && !t.fragment.includes('/restored-strings/') && !t.fragment.includes('/restored-spreadsheets/') && !t.fragment.includes('/restored-robot/') && !t.fragment.includes('/restored-library/')).filter(t => filePattern.test(t.fragment));
      assert.equal(selected.length, batch.name === 'processes' ? 16 : 6, 'Changed local data subgroup ' + batch.name);
      assert.equal(topicTasks.length - selected.length, { strings: 43, sorting: 39, spreadsheets: 94, 'robot-grid': 55, databases: 78, processes: 24 }[batch.name], 'Changed tasks outside original file batch ' + batch.name);
    } else if (batch.name.startsWith('official-demos-')) {
      assert.equal(batch.subgroup, 'official-demos-2023-2026');
      const selectedIds = {"official-demos-spreadsheet": ["EGEINF6DD746", "EGEINF9F8A0F", "EGEINF0C0B2B"], "official-demos-document": ["EGEINF98C674", "EGEINF350771"], "official-demos-string": ["EGEINFD6DFE2", "EGEINFACDF4D"], "official-demos-sequence": ["EGEINF995419", "EGEINF6EA065"], "official-demos-boxes": ["EGEINF553F80"]}[batch.name];
      assert.ok(selectedIds);
      selected = topicTasks.filter(t => selectedIds.includes(t.id));
      assert.equal(selected.length, selectedIds.length);
    } else if (batch.name.startsWith('recovered-2021-')) {
      assert.equal(batch.subgroup, 'preserved-open-2021');
      const selectedId = {"recovered-2021-temperature": "EGEINFDA74F1", "recovered-2021-document": "EGEINF68E9C5", "recovered-2021-robot": "EGEINFF3A05F", "recovered-2021-triples": "EGEINF028200", "recovered-2021-containers": "EGEINFBDC5D0", "recovered-2021-string": "EGEINF896732"}[batch.name];
      assert.ok(selectedId);
      selected = topicTasks.filter(t => t.id === selectedId);
      assert.equal(selected.length, 1);
    } else if (batch.name.startsWith('recovered-2022-')) {
      assert.equal(batch.subgroup, 'official-open-2022');
      const selectedId = {"recovered-2022-document": "EGEINF010B55", "recovered-2022-pairs": "EGEINF29B59D", "recovered-2022-trees": "EGEINF5AF3A3", "recovered-2022-circle": "EGEINFBED6E1"}[batch.name];
      assert.ok(selectedId);
      selected = topicTasks.filter(t => t.id === selectedId);
      assert.equal(selected.length, 1);
    } else if (batch.name === 'recovered-databases') {
      assert.equal(batch.subgroup, 'official-open-databases');
      selected = topicTasks.filter(t => ['EGEINF3028C5','EGEINFE9DA10','EGEINF0BB9A5','EGEINFBBF678'].includes(t.id));
      assert.equal(selected.length, 4);
    } else if (batch.name === 'recovered-clusters') {
      assert.equal(batch.subgroup, 'official-open-clusters');
      selected = topicTasks.filter(t => ['EGEINFAAB9D2','EGEINFEAFDD5'].includes(t.id));
      assert.equal(selected.length, 2);
    } else if (batch.name === 'recovered-nesting') {
      assert.equal(batch.subgroup, 'official-open-nesting');
      selected = topicTasks.filter(t => ['EGEINFCBF8FC','EGEINF8091A9'].includes(t.id));
      assert.equal(selected.length, 2);
    } else if (batch.name === 'recovered-processes') {
      assert.equal(batch.subgroup, 'official-open-processes');
      selected = topicTasks.filter(t => ['EGEINF24353E','EGEINF7EB528'].includes(t.id));
      assert.equal(selected.length, 2);
    } else if (batch.name === 'mirror-library') {
      assert.equal(batch.subgroup, 'restored-library');
      const selectedIds = ["EGEINFD5BE4B", "EGEINFE3554C", "EGEINFEBA2F3", "EGEINFBF2E0E", "EGEINFC8A009", "EGEINF59D97F", "EGEINF8B2678", "EGEINF06D6B0", "EGEINF093BB8", "EGEINFF8F51A", "EGEINF0A7C1C", "EGEINF154C1F", "EGEINF1DCD1C", "EGEINFDE2926", "EGEINFC3C2DE", "EGEINF9362D2", "EGEINFE3BDDD", "EGEINF9C6456", "EGEINF350E54", "EGEINF2E66AE", "EGEINF93DEAB", "EGEINFF1D0CC", "EGEINF2011C7", "EGEINFE7EEC9", "EGEINF86A2CD", "EGEINF8F19C3", "EGEINF239591", "EGEINF0040E4", "EGEINF783CED", "EGEINF504BEE", "EGEINFE460E4", "EGEINFE11AE0", "EGEINFE86AE6", "EGEINF35ADEF", "EGEINF8E41ED", "EGEINF1C0762", "EGEINF26006B", "EGEINF50F763", "EGEINF5CEB68", "EGEINFADF16F", "EGEINF0CF934", "EGEINF672C3F", "EGEINF659E38", "EGEINF0D8887", "EGEINF578B80"];
      selected = topicTasks.filter(t => selectedIds.includes(t.id));
      assert.equal(selected.length, selectedIds.length);
    } else if (batch.name === 'mirror-robot') {
      assert.equal(batch.subgroup, 'restored-robot');
      const selectedIds = ["EGEINFEAAB4F", "EGEINF4B5A0B", "EGEINFD99C0C", "EGEINFE02E70", "EGEINF52AC1E", "EGEINF3FC4D2", "EGEINF01C951", "EGEINF0FC0A9", "EGEINFB2DDED", "EGEINF2E6CE7", "EGEINFA83833", "EGEINF15F347", "EGEINF4392F7", "EGEINFAE95F0", "EGEINFEE71F0", "EGEINFFF6D0E", "EGEINF35A500", "EGEINF49567F", "EGEINFD1737A", "EGEINF94107F", "EGEINF9E5F77", "EGEINF6303B2", "EGEINFDE9F28", "EGEINFE30D28", "EGEINF49E2DA", "EGEINF1D7ADE", "EGEINF03EB51", "EGEINF8A7C55", "EGEINF4272A3", "EGEINF081BA4", "EGEINF0452A1", "EGEINFA12AAD", "EGEINF6999A7", "EGEINFF4E6CC", "EGEINFF7EDCC", "EGEINF2285C9", "EGEINFE705C5", "EGEINFB898EB", "EGEINF5D4CE0", "EGEINFC82367", "EGEINFE45868", "EGEINFD0BC8A"];
      selected = topicTasks.filter(t => selectedIds.includes(t.id));
      assert.equal(selected.length, selectedIds.length);
    } else if (batch.name === 'mirror-spreadsheets') {
      assert.equal(batch.subgroup, 'restored-spreadsheets');
      const selectedIds = ["EGEINFF7E942", "EGEINFB9BE47", "EGEINF90D64F", "EGEINFDF08FE", "EGEINFC466F7", "EGEINF9EF0FE", "EGEINF6602F5", "EGEINF82E1FA", "EGEINF264608", "EGEINF5FFD03", "EGEINFE20F0A", "EGEINF40F07C", "EGEINFB42173", "EGEINF63A072", "EGEINF749EB4", "EGEINF57DBBA", "EGEINF4C4814", "EGEINF0AE210", "EGEINFE7EB1F", "EGEINF16B528", "EGEINF34A02C", "EGEINF8CD22D", "EGEINF8FBE26", "EGEINF1013DD", "EGEINFC2ECD2", "EGEINF310856", "EGEINF475BA8", "EGEINF163FA9", "EGEINFE06AA0", "EGEINF03FCC2", "EGEINF98BEC9", "EGEINF4F0194", "EGEINF651C96", "EGEINF8A869F", "EGEINF8E4395", "EGEINF52D2E1", "EGEINF958FE2", "EGEINF0A616C", "EGEINFB7E261", "EGEINF17A761", "EGEINF74ED34", "EGEINF97883C", "EGEINFEDBE37", "EGEINF34BD36", "EGEINFB32E8E", "EGEINFAAAD85", "EGEINFC9738B"];
      selected = topicTasks.filter(t => selectedIds.includes(t.id));
      assert.equal(selected.length, selectedIds.length);
    } else if (batch.name === 'mirror-strings') {
      assert.equal(batch.subgroup, 'restored-strings');
      const selectedIds = ["EGEINF6AB929", "EGEINF5605A0", "EGEINF4FD865", "EGEINF907644", "EGEINFA520F8", "EGEINFB92F00", "EGEINF685605", "EGEINF0491B1", "EGEINFB31CB5", "EGEINF4D2418", "EGEINFF04010", "EGEINF2AB916", "EGEINF98C518", "EGEINF6B121E", "EGEINF8A991E", "EGEINF281D2A", "EGEINF347F22", "EGEINFBAC4D1", "EGEINF361E52", "EGEINF0CF4C0", "EGEINFCF38C4", "EGEINFC00CCB", "EGEINF7E659E", "EGEINF2F6892", "EGEINF7663E0", "EGEINF3380E0", "EGEINFBDE963", "EGEINFDD0C38", "EGEINFC2DB39", "EGEINF199381", "EGEINF2B1F8E", "EGEINF532082", "EGEINFAA7E8A"];
      selected = topicTasks.filter(t => selectedIds.includes(t.id));
      assert.equal(selected.length, selectedIds.length);
    } else if (batch.name === 'mirror-processes') {
      assert.equal(batch.subgroup, 'restored-processes');
      const selectedIds = ["EGEINF2332FB", "EGEINF096055", "EGEINF159297", "EGEINFABAA67", "EGEINF102242", "EGEINFE923FA", "EGEINF3133F6", "EGEINFA3580C", "EGEINF777B78", "EGEINF10A671", "EGEINF38557E", "EGEINFE5D7BF", "EGEINFE4C7B9", "EGEINFE32519", "EGEINFDAB821", "EGEINF3E352F", "EGEINF42A2E4", "EGEINFFABCEC", "EGEINFA8AC39", "EGEINFB63883"];
      selected = topicTasks.filter(t => selectedIds.includes(t.id));
      assert.equal(selected.length, selectedIds.length);
    } else if (batch.name === 'mirror-sequences') {
      assert.equal(batch.subgroup, 'restored-sequences');
      const selectedIds = ["EGEINF45744A", "EGEINFB8744D", "EGEINF7478FE", "EGEINFCF2AF3", "EGEINFF61272", "EGEINF133D72", "EGEINF9C8813", "EGEINF655816", "EGEINFBCC52D", "EGEINF38FB28", "EGEINF0C76DB", "EGEINF53A3A5", "EGEINF8CC6CF", "EGEINF1F0F94", "EGEINF212692", "EGEINFE1539C", "EGEINF064AEA", "EGEINF446B6B", "EGEINFF3296A", "EGEINF42698B", "EGEINFCE3C83", "EGEINFE89C8A"];
      selected = topicTasks.filter(t => selectedIds.includes(t.id));
      assert.equal(selected.length, selectedIds.length);
    } else if (batch.name === 'mirror-sorting') {
      assert.equal(batch.subgroup, 'restored-sorting');
      const selectedIds = ["EGEINF6689F3", "EGEINFEDE407", "EGEINFB1F57A", "EGEINFAD6F70", "EGEINF7257B4", "EGEINFD8A5BB", "EGEINF72EC10", "EGEINFEB601E", "EGEINFB42224", "EGEINFC3D450", "EGEINF38235A", "EGEINFFC12A4", "EGEINF05BFA6", "EGEINFBE60AB", "EGEINFBD5ECE", "EGEINFA9339F", "EGEINF623F91", "EGEINF4522EF", "EGEINF9A0AE4", "EGEINF584C6A", "EGEINF64AB6F", "EGEINF0C1433", "EGEINFE53C3B", "EGEINF3B2A3F", "EGEINF4A2884", "EGEINF70B483", "EGEINF97FA8B"];
      selected = topicTasks.filter(t => selectedIds.includes(t.id));
      assert.equal(selected.length, selectedIds.length);
    } else if (batch.name === 'mirror-databases') {
      assert.equal(batch.subgroup, 'restored-databases');
      const selectedIds = ["EGEINFF73FFB", "EGEINF110205", "EGEINFAAF80B", "EGEINF407572", "EGEINF9B0179", "EGEINF576CB8", "EGEINFF17829", "EGEINF929DD5", "EGEINF37FA59", "EGEINF4CD2A9", "EGEINFB4A5AC", "EGEINFAF13C5", "EGEINFB6D495", "EGEINF2A2297", "EGEINF98DD9A", "EGEINF0389EB", "EGEINF56FDE6", "EGEINF3E5DE4", "EGEINF3864EE", "EGEINF8600ED", "EGEINF4CD46A", "EGEINFF5FE67", "EGEINF09166C", "EGEINFD4976F", "EGEINF923765", "EGEINF02143E", "EGEINFB5393D", "EGEINF1CA281", "EGEINFD4A383", "EGEINF583387"];
      selected = topicTasks.filter(t => selectedIds.includes(t.id));
      assert.equal(selected.length, selectedIds.length);
    } else if (batch.name === 'mirror-clusters') {
      assert.equal(batch.subgroup, 'restored-clusters');
      const selectedIds = ["EGEINFB5FB72", "EGEINF76B8BD"];
      selected = topicTasks.filter(t => selectedIds.includes(t.id));
      assert.equal(selected.length, selectedIds.length);
    } else if (batch.name === 'mirror-optimization') {
      assert.equal(batch.subgroup, 'restored-optimization');
      const selectedIds = ["EGEINFA6A247", "EGEINF952F46", "EGEINF38414E", "EGEINF0348F9", "EGEINFC2D70A", "EGEINF377100", "EGEINF494D7D", "EGEINF13F17F", "EGEINF2E1A79", "EGEINFE8867C", "EGEINF69BBBF", "EGEINFF13E1D", "EGEINFBDD715", "EGEINFF291D4", "EGEINF522BD9", "EGEINF9F4BD8", "EGEINF6E6BDD", "EGEINF072D53", "EGEINF1D695E", "EGEINF519CA0", "EGEINFA47CA1", "EGEINF48B0C6", "EGEINF12C4CF", "EGEINF3169CC", "EGEINF5ABB91", "EGEINF30C294", "EGEINFDD9960", "EGEINFEF3033", "EGEINF549B82"];
      selected = topicTasks.filter(t => selectedIds.includes(t.id));
      assert.equal(selected.length, selectedIds.length);
    } else if (batch.name === 'final-restored') {
      assert.equal(batch.subgroup, 'restored-final');
      const selectedIds = ["EGEINF03A0E6", "EGEINF1CFE4F", "EGEINF204C0F", "EGEINF37C121", "EGEINF4CC10E", "EGEINF5121AE", "EGEINF5994E6", "EGEINF6E4E0E", "EGEINF776E36", "EGEINF79DEC1", "EGEINF82E6AD", "EGEINF9C8C86", "EGEINF9D82E5", "EGEINFA8C919", "EGEINFAC92AB", "EGEINFAE45C9", "EGEINFAEB8BB", "EGEINFB1238C", "EGEINFC22345", "EGEINFC6FBAB", "EGEINFD89EC7", "EGEINFD9CFB2", "EGEINFE083FC", "EGEINFE207E9", "EGEINFEAAB94", "EGEINFEFEAB3", "EGEINFFA6C24", "EGEINFFAFE1B", "EGEINFFE814D"];
      selected = topicTasks.filter(t => selectedIds.includes(t.id));
      assert.equal(selected.length, selectedIds.length);
    } else if (batch.name === 'local-documents') {
      assert.equal(batch.subgroup, 'local-odt-chapters');
      selected = topicTasks.filter(t => ["EGEINF84794C", "EGEINF9904F2", "EGEINF65F4A0", "EGEINFE47ECF", "EGEINFB8E563"].includes(t.id));
      assert.equal(selected.length, 5);
    } else if (batch.name === 'recovered-documents') {
      assert.equal(batch.subgroup, 'official-open-documents');
      selected = topicTasks.filter(t => ['EGEINF1DD018','EGEINF1BA106','EGEINF943BC5','EGEINFE0E9F5'].includes(t.id));
      assert.equal(selected.length, 4);
    } else if (batch.name === 'recovered-strings') {
      assert.equal(batch.subgroup, 'official-open-strings');
      selected = topicTasks.filter(t => ['EGEINFA9D03C','EGEINFE74424','EGEINF931D9C'].includes(t.id));
      assert.equal(selected.length, 3);
    } else if (batch.name === 'recovered-spreadsheet') {
      assert.equal(batch.subgroup, 'official-open-table');
      selected = topicTasks.filter(t => t.id === 'EGEINF34D0FC');
      assert.equal(selected.length, 1);
    } else if (batch.name === 'inline-spreadsheets') {
      assert.equal(batch.subgroup, 'inline-formulas-and-intervals');
      selected = topicTasks.filter(t => /Из ячейки|ячейке [A-Z]\d+ записана формула|Рассматривается множество/u.test(conditionText(t.fragment)));
      assert.equal(selected.length, 38, 'Changed inline spreadsheet subgroup');
      assert.equal(topicTasks.length - selected.length, 62, 'Changed other spreadsheet subgroup');
    } else if (batch.name === 'archive-repair') {
      assert.equal(batch.subgroup, 'source-restored-archives');
      selected = topicTasks.filter(t => ['EGEINFC8ED0E','EGEINF35DF04'].includes(t.id));
      assert.equal(selected.length, 2, 'Changed source-restored archive subgroup');
      assert.equal(topicTasks.filter(t => /составляет 22[0-4]\s*бит/u.test(conditionText(t.fragment))).length, 7, 'Changed remaining ambiguous rates');
    } else if (batch.name === 'archive-transfer') {
      assert.equal(batch.subgroup, 'archive-unambiguous');
      const archives = topicTasks.filter(t => conditionText(t.fragment).includes('архиватор'));
      assert.equal(archives.length, 54, 'Changed archive subgroup');
      selected = archives.filter(t => !/составляет 22[0-4]\s*бит/u.test(conditionText(t.fragment)) && !['EGEINFC8ED0E','EGEINF35DF04'].includes(t.id));
      assert.equal(selected.length, 45, 'Changed unambiguous archive subgroup');
      assert.equal(archives.length - selected.length, 9, 'Changed tasks outside original archive batch');
    } else if (batch.name === 'inline-databases') {
      assert.equal(batch.subgroup, 'inline-tables');
      selected = topicTasks.filter(t => !/href=["']/u.test(t.fragment));
      assert.equal(selected.length, 40, 'Changed inline-table subgroup');
      assert.equal(topicTasks.length - selected.length, 44, 'Changed file database subgroup');
    } else if (batch.name === 'final-writing') {
      assert.equal(batch.subgroup, 'remaining-programs');
      const prior = new Set(batches.filter(b => ['write-program','array-writing','pair-writing'].includes(b.name)).flatMap(b => b.records.map(r => r.id)));
      selected = topicTasks.filter(t => !prior.has(t.id));
      assert.equal(selected.length, 6, 'Changed remaining program subgroup');
      assert.equal(topicTasks.length - selected.length, 80, 'Changed previous program-writing tasks');
    } else if (batch.name === 'pair-writing') {
      assert.equal(batch.subgroup, 'sequence-pair-programs');
      selected = topicTasks.filter(t => conditionText(t.fragment).includes('Рассматриваются все пары'));
      assert.equal(selected.length, 28, 'Changed pair program subgroup');
      assert.equal(topicTasks.length - selected.length, 58, 'Changed other program-writing tasks');
    } else if (batch.name === 'array-writing') {
      assert.equal(batch.subgroup, 'array-fragments');
      selected = topicTasks.filter(t => /^(?:Дан целочисленный массив|Опишите на русском языке)/u.test(conditionText(t.fragment)));
      assert.equal(selected.length, 32, 'Changed array fragment subgroup');
      assert.equal(topicTasks.length - selected.length, 54, 'Changed other program-writing tasks');
    } else if (batch.name === 'write-program') {
      assert.equal(batch.subgroup, 'fixed-numeric-answers');
      selected = topicTasks.filter(t => conditionText(t.fragment).startsWith('Впишите правильный ответ.'));
      assert.equal(selected.length, 20, 'Changed fixed numeric subgroup');
      assert.equal(topicTasks.length - selected.length, 66, 'Changed program-writing remainder');
    } else assert.fail('Unknown subgroup ' + batch.name);
  }
  assert.deepEqual(batch.records.map(r => r.id).sort(), selected.map(t => t.id).sort(), 'Incomplete topic or subgroup ' + batch.topic);
  for (const record of batch.records) {
    const task = byId.get(record.id), source = batch.sources[record.id];
    assert.ok(task && source && record.id.startsWith('EGEINF'));
    assert.equal(ogeSourceSignature(task), source.sourceHash, record.id + ': changed FIPI source');
    assert.equal(conditionText(task.fragment), source.fipiCondition);
    assert.ok(source.reviewed && ['exact', 'variant', 'method'].includes(source.match));
    assert.match(source.url, /^https:\/\/inf-ege\.sdamgia\.ru\/problem\?id=\d+$/u);
    assert.ok(source.comparison.length > 100);
    assert.equal(record.answer, source.expectedAnswer);
    if (source.match === 'exact' && source.answerKind !== 'debug') assert.equal(record.answer.toLowerCase(), source.externalAnswer.toLowerCase());
    if (source.answerKind === 'debug') assert.ok(['number-transform', 'debugging'].includes(batch.name));
    if (source.discrepancy) {
      assert.equal(source.discrepancy.status, 'resolved');
      assert.ok(source.discrepancy.resolution.length > 100);
    }
    matches[source.match] = (matches[source.match] || 0) + 1;
    assert.equal(record.diagram_svg, ''); assert.equal(record.diagram_caption, '');
    if (/<img|ShowPicture/u.test(task.fragment.split('КЭС:')[0])) {
      if (batch.name.startsWith('recovered-2022-') || batch.name.startsWith('recovered-2021-') || batch.name.startsWith('official-demos-')) {
        require('./lib/ege-informatics-number-sequence-machine').auditPrimaryImage(task, source, root);
      } else if (batch.name === 'program-analysis') {
        require('./lib/ege-informatics-program-machine').auditPrimaryImage(task, source, root);
      } else if (batch.name === 'graph-paths') {
        require('./lib/ege-informatics-graph-paths-machine').auditPrimaryImage(task, source, root);
      } else if (batch.name === 'plane-executors') {
        require('./lib/ege-informatics-plane-machine').auditPrimaryImage(task, source, root);
      } else if (batch.name === 'graph-models') {
        require('./lib/ege-informatics-graph-models-machine').auditPrimaryImage(task, source, root);
      } else if (['number-sequence', 'recovered-sequences', 'recovered-documents', 'local-documents', 'final-restored', 'mirror-optimization', 'mirror-clusters', 'mirror-databases', 'mirror-sorting', 'mirror-sequences', 'mirror-processes', 'mirror-strings', 'mirror-spreadsheets', 'mirror-robot', 'mirror-library', 'recovered-clusters'].includes(batch.name)) {
        require('./lib/ege-informatics-number-sequence-machine').auditPrimaryImage(task, source, root);
      } else if (['strings', 'recovered-strings'].includes(batch.name)) {
        require('./lib/ege-informatics-string-files-machine').auditPrimaryImage(task, source, root);
      } else if (['sorting', 'recovered-nesting'].includes(batch.name)) {
        require('./lib/ege-informatics-sorting-machine').auditPrimaryImage(task, source, root);
      } else if (['spreadsheets', 'recovered-spreadsheet'].includes(batch.name)) {
        require('./lib/ege-informatics-spreadsheets-machine').auditPrimaryImage(task, source, root);
      } else if (batch.name === 'robot-grid') {
        require('./lib/ege-informatics-robot-grid-machine').auditPrimaryImage(task, source, root);
      } else if (['processes', 'recovered-processes'].includes(batch.name)) {
        require('./lib/ege-informatics-processes-machine').auditPrimaryImage(task, source, root);
      } else if (['databases', 'recovered-databases'].includes(batch.name)) {
        require('./lib/ege-informatics-databases-machine').auditPrimaryImage(task, source, root);
      } else {
        assert.equal(batch.name, 'numeral-systems', record.id + ': primary image needs review');
        require('./lib/audit-ege-informatics-numeral').auditNumeralPrimaryImage(task, source, root);
      }
    }
    assert.ok(record.solution.length > 800 && record.solution.includes('Проверка'));
    assert.ok(record.solution.endsWith('Ответ: ' + record.answer + '.'));
    const prose = batch.name === 'debugging'
      ? record.solution.replace(/^```(?:python|pascal)\n[\s\S]*?\n```[ \t]*(?:\n|$)/gmu, '')
      : record.solution;
    if (['logic', 'program-analysis', 'plane-executors', 'games', 'number-sequence', 'strings', 'sorting', 'spreadsheets', 'robot-grid', 'databases', 'processes', 'write-program', 'array-writing', 'pair-writing', 'final-writing', 'inline-databases', 'archive-transfer', 'inline-spreadsheets', 'archive-repair', 'recovered-sequences', 'recovered-spreadsheet', 'recovered-strings', 'recovered-documents', 'local-documents', 'final-restored', 'mirror-optimization', 'mirror-clusters', 'mirror-databases', 'mirror-sorting', 'mirror-sequences', 'mirror-processes', 'mirror-strings', 'mirror-spreadsheets', 'mirror-robot', 'mirror-library', 'recovered-processes', 'recovered-nesting', 'recovered-clusters', 'recovered-databases', 'recovered-2022-document', 'recovered-2022-pairs', 'recovered-2022-trees', 'recovered-2022-circle', 'linked-games', 'restored-game-links', 'recovered-2021-temperature', 'recovered-2021-document', 'recovered-2021-robot', 'recovered-2021-triples', 'recovered-2021-containers', 'recovered-2021-string', 'official-demos-spreadsheet', 'official-demos-document', 'official-demos-string', 'official-demos-sequence', 'official-demos-boxes'].includes(batch.name)) {
      // Comparisons, including Python <= and >=, are escaped by the server.
      // Require spaces around them so they cannot be authored HTML tags.
      assert.ok(!/[<>]/u.test(record.answer));
      assert.ok(!/<(?!=?\s)|(?<!\s)>/u.test(prose));
    } else assert.ok(!/[<>]/u.test(record.answer + prose));
    assert.ok(!/\/|undefined/u.test(record.answer + record.solution));
    const stack = [];
    for (const char of record.solution) {
      if (char === '⟦') stack.push(0);
      if (char === '¦') { assert.ok(stack.length); stack[stack.length - 1]++; }
      if (char === '⟧') assert.equal(stack.pop(), 1);
    }
    assert.equal(stack.length, 0);
    const auditFunction = auditors[batch.name];
    assert.ok(auditFunction, 'Missing independent audit: ' + batch.name);
    const audit = (task, record) => auditFunction(task, record, source);
    const checked = audit(task, record, source);
    assert.throws(() => audit(task, { ...record, answer: record.answer + 'а' }), /answer/u);
    const wrongAnswer = batch.name === 'number-executors'
      ? ['1'.repeat(record.answer.length), '2'.repeat(record.answer.length)].find(p => !checked.validPrograms.includes(p))
      : batch.name === 'file-system' ? String(Number(record.answer) % 4 + 1)
        : /^\d+$/u.test(record.answer) ? String(Number(record.answer) + 1)
          : batch.name === 'logic' ? (record.answer === 'А' ? 'В' : 'А') : [...record.answer].reverse().join('');
    assert.ok(wrongAnswer);
    assert.throws(() => audit(task, { ...record, answer: wrongAnswer }), /answer/u);
    if (['information-volume', 'numeral-systems', 'media-transfer', 'string-executors', 'array-analysis', 'divisors', 'debugging', 'truth-tables', 'logic', 'program-analysis', 'graph-paths', 'plane-executors', 'graph-models', 'games', 'number-sequence', 'strings', 'sorting', 'spreadsheets', 'robot-grid', 'databases', 'processes', 'write-program', 'array-writing', 'pair-writing', 'final-writing', 'inline-databases', 'archive-transfer', 'inline-spreadsheets', 'archive-repair', 'recovered-sequences', 'recovered-spreadsheet', 'recovered-strings', 'recovered-documents', 'local-documents', 'final-restored', 'mirror-optimization', 'mirror-clusters', 'mirror-databases', 'mirror-sorting', 'mirror-sequences', 'mirror-processes', 'mirror-strings', 'mirror-spreadsheets', 'mirror-robot', 'mirror-library', 'recovered-processes', 'recovered-nesting', 'recovered-clusters', 'recovered-databases', 'recovered-2022-document', 'recovered-2022-pairs', 'recovered-2022-trees', 'recovered-2022-circle', 'linked-games', 'restored-game-links', 'recovered-2021-temperature', 'recovered-2021-document', 'recovered-2021-robot', 'recovered-2021-triples', 'recovered-2021-containers', 'recovered-2021-string', 'official-demos-spreadsheet', 'official-demos-document', 'official-demos-string', 'official-demos-sequence', 'official-demos-boxes'].includes(batch.name)) {
      checked.rejectedEdits = 0;
      for (const line of new Set(checked.lines)) {
        const corrupted = /\d/u.test(line)
          ? line.replace(/\d+/u, n => String(Number(n) + 1))
          : line + ' [искажено]';
        const changed = record.solution.replaceAll(line, corrupted);
        assert.notEqual(changed, record.solution);
        if (/\d/u.test(line)) {
          assert.throws(() => audit(task, { ...record, solution: changed }), record.id + ': corrupted proof accepted');
        } else {
          assert.throws(() => audit(task, { ...record, solution: record.solution.replaceAll(line, '') }), record.id + ': missing reasoning accepted');
        }
        checked.rejectedEdits++;
      }
      // A bitstream with a non-integral byte count has seven required lines;
      // its answer is in bits, so there must be no integer byte conversion.
      assert.ok(checked.rejectedEdits >= (batch.name === 'numeral-systems' ? 4 : 7), record.id + ': insufficient proof checks');
      delete checked.lines;
    }
    if (batch.name === 'codes') {
      const lines = record.solution.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let corrupted = lines[i];
        if (/^Длина \d+:/u.test(corrupted)) {
          corrupted = corrupted.includes(' — подходит')
            ? corrupted.replace(' — подходит', ' — не оставляет места другим символам')
            : corrupted.replace(/^(Длина )(\d+)/u, (_, a, n) => a + (Number(n) + 1));
        } else if (/^После ветви/u.test(corrupted)) {
          corrupted = corrupted.replace(/(: )(\d+)/u, (_, a, n) => a + (Number(n) + 1));
        } else if (/^[A-ZА-ЯЁ]: код /u.test(corrupted)) {
          corrupted = corrupted.replace(/(= )(\d+)\.$/u, (_, a, n) => a + (Number(n) + 1) + '.');
        } else if (/^Вариант \d: [01]+\.$/u.test(corrupted)) {
          corrupted = corrupted.replace(/(: )([01])/u, (_, a, n) => a + (n === '0' ? '1' : '0'));
        } else if (/^(1101₂ =|1000₂ =)/u.test(corrupted)) {
          corrupted = corrupted.replace(/(= )(\d+)([,.])/u, (_, a, n, b) => a + (Number(n) + 1) + b);
        } else if (/^После исключения занятых ветвей/u.test(corrupted)) {
          corrupted = corrupted.replace(/(: )([01])/u, (_, a, n) => a + (n === '0' ? '1' : '0'));
        }
        if (corrupted !== lines[i]) {
          const changed = [...lines]; changed[i] = corrupted;
          assert.throws(() => audit(task, { ...record, solution: changed.join('\n') }), record.id + ': corrupted coding proof accepted');
          checked.rejectedEdits++;
        }
      }
      assert.ok(checked.rejectedEdits >= 2, record.id + ': insufficient negative coding checks');
    }
    if (batch.name === 'combinatorics') {
      const lines = record.solution.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let corrupted = lines[i];
        if (/^Начало «/u.test(corrupted)) {
          corrupted = corrupted.replace(/([А-ЯЁ]: )(\d+)/u, (_, a, n) => a + (Number(n) + 1));
        } else if (/^Первая [А-ЯЁ]:/u.test(corrupted)) {
          corrupted = corrupted.replace(/(: )(\d+)/u, (_, a, n) => a + (Number(n) + 1));
        } else if (/^i = \d+: a =/u.test(corrupted)) {
          corrupted = corrupted.replace(/(значения )(\d+)/u, (_, a, n) => a + (Number(n) + 1));
        } else if (/^(Место \d+:|Способов =|Число способов =|Подстановка: Q =)/u.test(corrupted)) {
          corrupted = corrupted.replace(/(= )(\d+)\.$/u, (_, a, n) => a + (Number(n) + 1) + '.');
        } else if (/^Вариант \d,/u.test(corrupted)) {
          corrupted = corrupted.replace(/(: )(да|нет)/u, (_, a, v) => a + (v === 'да' ? 'нет' : 'да'));
        } else if (/^(Для (пяти|шести) сигналов|2[⁰¹²³⁴⁵⁶⁷⁸⁹]+ =)/u.test(corrupted)) {
          corrupted = corrupted.replace(/(= )(\d+)([ .])/u, (_, a, n, b) => a + (Number(n) + 1) + b);
        }
        if (corrupted !== lines[i]) {
          const changed = [...lines]; changed[i] = corrupted;
          assert.throws(() => audit(task, { ...record, solution: changed.join('\n') }), record.id + ': corrupted combinatorial derivation accepted');
          checked.rejectedEdits++;
        }
      }
      assert.ok(checked.rejectedEdits > 0, record.id + ': insufficient negative checks');
    }
    if (batch.name === 'networks') {
      const lines = record.solution.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let corrupted = lines[i];
        if (/^Октет \d:/u.test(corrupted) || /^(Узел|Сеть), октет /u.test(corrupted)) {
          corrupted = corrupted.replace(/(= )(\d+)([.₂])/u, (_, a, n, b) => a + (BigInt(n) + 1n) + b);
        } else if (/^p = \d+: M = /u.test(corrupted)) {
          corrupted = corrupted.replace(/(нулей )(\d+)/u, (_, a, n) => a + (Number(n) + 1));
        } else if (/^k = \d+: w/u.test(corrupted)) {
          corrupted = corrupted.replace(/(\) = )(\d+)/u, (_, a, n) => a + (Number(n) + 1));
        } else if (/^[1-7]\. .*: буква [А-Ж]\.$/u.test(corrupted)) {
          corrupted = corrupted.replace(/буква ([А-Ж])/u, (_, c) => 'буква ' + (c === 'А' ? 'Б' : 'А'));
        } else if (/^Итак, \d+ ≤ p ≤ \d+\.$/u.test(corrupted)) {
          corrupted = corrupted.replace(/(≤ p ≤ )(\d+)/u, (_, a, n) => a + (Number(n) + 1));
        }
        if (corrupted !== lines[i]) {
          const changed = [...lines]; changed[i] = corrupted;
          assert.throws(() => audit(task, { ...record, solution: changed.join('\n') }), record.id + ': corrupted network calculation accepted');
          checked.rejectedEdits++;
        }
      }
      assert.ok(checked.rejectedEdits >= 4);
    }
    if (batch.name === 'number-transform') {
      const tableStart = record.solution.indexOf('В каждой паре сначала указан вход N, затем результат R:\n');
      if (tableStart >= 0) {
        const tableEnd = record.solution.indexOf('\n\n', tableStart);
        const table = record.solution.slice(tableStart, tableEnd);
        for (const m of table.matchAll(/N = \d+, R = (\d+)/gu)) {
          const position = tableStart + m.index;
          const changed = record.solution.slice(0, position) + m[0].replace(/R = \d+$/u, 'R = ' + (Number(m[1]) + 1)) + record.solution.slice(position + m[0].length);
          assert.throws(() => audit(task, { ...record, solution: changed }), /table arithmetic/u);
          checked.rejectedEdits++;
        }
        const changed = record.solution.replace(/(формул[аы]: R = |общая формула R = )([^\d]*)(\d+)/u, (_, a, b, n) => a + b + (Number(n) + 1));
        assert.notEqual(changed, record.solution);
        assert.throws(() => audit(task, { ...record, solution: changed }), /formula/u);
        checked.rejectedEdits++;
      } else if (checked.kind.startsWith('debug')) {
        for (const m of record.solution.matchAll(/^Правильная строка: (.+)$/gmu)) {
          const changed = record.solution.slice(0, m.index) + m[0].replace(m[1], 'pass') + record.solution.slice(m.index + m[0].length);
          assert.throws(() => audit(task, { ...record, solution: changed }), /debug correction/u);
          checked.rejectedEdits++;
        }
      } else {
        const changed = record.solution.replace('237 и 732', '238 и 732');
        assert.throws(() => audit(task, { ...record, solution: changed }), /decimal proof/u);
        checked.rejectedEdits++;
      }
      assert.ok(checked.rejectedEdits > 0);
    }
    if (batch.name === 'recursion') {
      const lines = record.solution.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let corrupted = null;
        if (/^(?:[FG]\(\d+\)|R) = /u.test(lines[i])) {
          corrupted = lines[i].replace(/(= )(-?\d+)((?: · C)?\.)(?: |$)/u, (_, a, n, b) => a + (BigInt(n) + 1n) + b + ' ');
          if (corrupted === lines[i]) corrupted = lines[i].replace(/(^[^=]+ = \D*?)(\d+)/u, (_, a, n) => a + (BigInt(n) + 1n));
        } else if (/^S\(-?\d+\) = /u.test(lines[i])) {
          corrupted = lines[i].replace(/(?:«(-?\d+)»|ε)\.$/u, (_, n) => '«' + (n === undefined ? '1' : BigInt(n) + 1n) + '».');
        } else if (/^\d+\. [FG]\(-?\d+\)/u.test(lines[i])) {
          corrupted = lines[i].replace(/([FG]\()(-?\d+)(\))/u, (_, a, n, b) => a + (Number(n) + 1) + b);
        }
        if (corrupted && corrupted !== lines[i]) {
          const changed = [...lines]; changed[i] = corrupted;
          assert.throws(() => audit(task, { ...record, solution: changed.join('\n') }), record.id + ': corrupted derivation accepted');
          checked.rejectedEdits++;
        }
      }
      assert.ok(checked.rejectedEdits >= 2, record.id + ': insufficient negative checks');
    }
    if (batch.name === 'executor-programs') {
      const lines = record.solution.split('\n');
      const arithmetic = lines.findIndex(line => /^[FGH]\(\d+\) = .* = .* = \d+\.$/u.test(line));
      assert.ok(arithmetic >= 0);
      lines[arithmetic] = lines[arithmetic].replace(/= (\d+)\.$/u, (_, n) => '= ' + (Number(n) + 1) + '.');
      assert.throws(() => audit(task, { ...record, solution: lines.join('\n') }), /arithmetic/u);
      const swapped = record.solution.replace(/^Обязательные числа: (.+)\.\nЗапрещённые числа: (.+)\.$/mu,
        (_, required, forbidden) => 'Обязательные числа: ' + forbidden + '.\nЗапрещённые числа: ' + required + '.');
      if (swapped !== record.solution) {
        assert.throws(() => audit(task, { ...record, solution: swapped }));
        checked.rejectedEdits++;
      }
      checked.rejectedEdits++;
    }
    if (record.solution.match(/^N\(.+\) = [\d +−]+ = \d+\.$/mu)) {
      const corrupted = record.solution.replace(/(^N\(.+\) = [\d +−]+ = )(\d+)(\.)$/mu, (_, before, n, end) => before + (Number(n) + 1) + end);
      assert.throws(() => audit(task, { ...record, solution: corrupted }), batch.name === 'graph-paths' ? /changed verified graph derivation/u : /arithmetic/u);
    }
    checks.push({ id: record.id, ...checked });
  }
}
assert.ok(records.length > 0 && records.length <= tasks.length);
let changed = 0, published = null, integrity = null, preserved = null;
if (!args.includes('--content-only')) {
  const apply = args.includes('--apply');
  const target = path.resolve(option('--db') || path.join(root, 'storage/solutions.sqlite'));
  const baselinePath = option('--baseline') && path.resolve(option('--baseline'));
  if (apply) assert.ok(baselinePath && baselinePath !== target && fs.existsSync(baselinePath), 'Apply requires a separate baseline snapshot');
  const db = new DatabaseSync(target, { readOnly: !apply });
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
        insert.run(record.id, record.answer, record.solution, record.diagram_svg, record.diagram_caption, now, now);
        row = read.get(record.id); changed++;
      }
      assert.ok(row, record.id + ': unpublished');
      for (const key of ['answer', 'solution', 'diagram_svg', 'diagram_caption']) assert.equal(row[key], record[key], record.id + ': ' + key);
      assert.equal(row.published, 1);
    }
    if (baselinePath) {
      const baseline = new DatabaseSync(baselinePath, { readOnly: true });
      try {
        const rows = baseline.prepare('SELECT * FROM solutions').all();
        for (const row of rows) assert.deepEqual(readExact.get(row.task_id), row, row.task_id + ': previous row changed');
        preserved = rows.length;
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
const report = { catalog: tasks.length, prepared: records.length, matches, changed, published,
  remaining: published === null ? null : tasks.length - published, preserved, integrity, checks,
  rejectedEdits: checks.reduce((n, c) => n + c.rejectedEdits, 0), rejectedWrongAnswers: records.length * 2, status: 'ok' };
if (option('--report')) fs.writeFileSync(option('--report'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, checks: checks.length }));
