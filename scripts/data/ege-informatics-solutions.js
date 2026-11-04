'use strict';

// Complete topic groups or explicitly defined subgroups.
module.exports = ['number-executors', 'file-system', 'search-queries', 'executor-programs', 'recursion', 'number-transform', 'networks', 'combinatorics', 'codes', 'information-volume', 'numeral-systems', 'media-transfer', 'string-executors', 'array-analysis', 'divisors', 'debugging', 'truth-tables', 'logic', 'program-analysis', 'graph-paths', 'plane-executors', 'graph-models', 'games', 'number-sequence', 'strings', 'sorting', 'spreadsheets', 'robot-grid', 'databases', 'processes', 'write-program', 'array-writing', 'pair-writing', 'final-writing', 'inline-databases', 'archive-transfer', 'inline-spreadsheets', 'archive-repair', 'recovered-sequences', 'recovered-spreadsheet', 'recovered-strings', 'recovered-documents', 'recovered-processes', 'recovered-nesting', 'recovered-clusters', 'recovered-databases'].map(name => ({
  name, topic: name === 'recovered-databases' ? 'type.databases' : name === 'recovered-clusters' ? 'type.large-data' : name === 'recovered-nesting' ? 'type.sorting' : name === 'recovered-processes' ? 'type.processes' : name === 'recovered-documents' ? 'type.text-search' : name === 'recovered-strings' ? 'type.strings' : name === 'recovered-spreadsheet' ? 'type.spreadsheets' : name === 'recovered-sequences' ? 'type.number-sequence' : name === 'archive-repair' ? 'type.media-transfer' : name === 'inline-spreadsheets' ? 'type.spreadsheets' : name === 'archive-transfer' ? 'type.media-transfer' : name === 'inline-databases' ? 'type.databases' : ['array-writing','pair-writing','final-writing'].includes(name) ? 'type.write-program' : 'type.' + name,
  ...(name === 'recovered-databases' ? { subgroup: 'official-open-databases' } : {}),
  ...(name === 'recovered-clusters' ? { subgroup: 'official-open-clusters' } : {}),
  ...(name === 'recovered-nesting' ? { subgroup: 'official-open-nesting' } : {}),
  ...(name === 'recovered-processes' ? { subgroup: 'official-open-processes' } : {}),
  ...(name === 'recovered-documents' ? { subgroup: 'official-open-documents' } : {}),
  ...(name === 'recovered-strings' ? { subgroup: 'official-open-strings' } : {}),
  ...(name === 'recovered-spreadsheet' ? { subgroup: 'official-open-table' } : {}),
  ...(name === 'recovered-sequences' ? { subgroup: 'official-open-sequences' } : {}),
  ...(name === 'archive-repair' ? { subgroup: 'source-restored-archives' } : {}),
  ...(name === 'inline-spreadsheets' ? { subgroup: 'inline-formulas-and-intervals' } : {}),
  ...(name === 'archive-transfer' ? { subgroup: 'archive-unambiguous' } : {}),
  ...(name === 'inline-databases' ? { subgroup: 'inline-tables' } : {}),
  ...(name === 'final-writing' ? { subgroup: 'remaining-programs' } : {}),
  ...(name === 'pair-writing' ? { subgroup: 'sequence-pair-programs' } : {}),
  ...(name === 'array-writing' ? { subgroup: 'array-fragments' } : {}),
  ...(name === 'write-program' ? { subgroup: 'fixed-numeric-answers' } : {}),
  ...(name === 'media-transfer' ? { subgroup: 'non-archive' } : {}),
  ...(name === 'games' ? { subgroup: 'standalone-rules' } : {}),
  ...(['number-sequence', 'strings', 'sorting'].includes(name) ? { subgroup: 'local-text-files' } : {}),
  ...(['spreadsheets', 'robot-grid', 'databases', 'processes'].includes(name) ? { subgroup: 'local-ods-files' } : {}),
  records: require('./ege-informatics-' + name + '-records.json'),
  sources: require('./ege-informatics-' + name + '-sources.json')
}));

module.exports.push(...[{"name": "recovered-2022-document", "topic": "type.text-search", "subgroup": "official-open-2022"}, {"name": "recovered-2022-pairs", "topic": "type.strings", "subgroup": "official-open-2022"}, {"name": "recovered-2022-trees", "topic": "type.sorting", "subgroup": "official-open-2022"}, {"name": "recovered-2022-circle", "topic": "type.large-data", "subgroup": "official-open-2022"}].map(batch => ({...batch, records: require('./ege-informatics-' + batch.name + '-records.json'), sources: require('./ege-informatics-' + batch.name + '-sources.json')})));

module.exports.push({name: 'linked-games', topic: 'type.games', subgroup: 'explicit-source-group', records: require('./ege-informatics-linked-games-records.json'), sources: require('./ege-informatics-linked-games-sources.json')});

module.exports.push({name: 'local-documents', topic: 'type.text-search', subgroup: 'local-odt-chapters', records: require('./ege-informatics-local-documents-records.json'), sources: require('./ege-informatics-local-documents-sources.json')});

module.exports.push(...[{"name": "recovered-2021-temperature", "topic": "type.spreadsheets", "subgroup": "preserved-open-2021"}, {"name": "recovered-2021-document", "topic": "type.text-search", "subgroup": "preserved-open-2021"}, {"name": "recovered-2021-robot", "topic": "type.robot-grid", "subgroup": "preserved-open-2021"}, {"name": "recovered-2021-triples", "topic": "type.large-data", "subgroup": "preserved-open-2021"}, {"name": "recovered-2021-containers", "topic": "type.sorting", "subgroup": "preserved-open-2021"}, {"name": "recovered-2021-string", "topic": "type.strings", "subgroup": "preserved-open-2021"}].map(batch => ({...batch, records: require('./ege-informatics-' + batch.name + '-records.json'), sources: require('./ege-informatics-' + batch.name + '-sources.json')})));

module.exports.push(...[{"name": "official-demos-spreadsheet", "topic": "type.spreadsheets", "subgroup": "official-demos-2023-2026"}, {"name": "official-demos-document", "topic": "type.text-search", "subgroup": "official-demos-2023-2026"}, {"name": "official-demos-string", "topic": "type.strings", "subgroup": "official-demos-2023-2026"}, {"name": "official-demos-sequence", "topic": "type.number-sequence", "subgroup": "official-demos-2023-2026"}, {"name": "official-demos-boxes", "topic": "type.sorting", "subgroup": "official-demos-2023-2026"}].map(batch => ({...batch, records: require('./ege-informatics-' + batch.name + '-records.json'), sources: require('./ege-informatics-' + batch.name + '-sources.json')})));

module.exports.push({name:'mirror-library',topic:'type.text-search',subgroup:'restored-library',records:require('./ege-informatics-mirror-library-records.json'),sources:require('./ege-informatics-mirror-library-sources.json')});

module.exports.push({name:'mirror-robot',topic:'type.robot-grid',subgroup:'restored-robot',records:require('./ege-informatics-mirror-robot-records.json'),sources:require('./ege-informatics-mirror-robot-sources.json')});

module.exports.push({name:'mirror-spreadsheets',topic:'type.spreadsheets',subgroup:'restored-spreadsheets',records:require('./ege-informatics-mirror-spreadsheets-records.json'),sources:require('./ege-informatics-mirror-spreadsheets-sources.json')});

module.exports.push({name:'mirror-strings',topic:'type.strings',subgroup:'restored-strings',records:require('./ege-informatics-mirror-strings-records.json'),sources:require('./ege-informatics-mirror-strings-sources.json')});

module.exports.push({name:'mirror-processes',topic:'type.processes',subgroup:'restored-processes',records:require('./ege-informatics-mirror-processes-records.json'),sources:require('./ege-informatics-mirror-processes-sources.json')});

module.exports.push({name:'mirror-sequences',topic:'type.number-sequence',subgroup:'restored-sequences',records:require('./ege-informatics-mirror-sequences-records.json'),sources:require('./ege-informatics-mirror-sequences-sources.json')});

module.exports.push({name:'mirror-sorting',topic:'type.sorting',subgroup:'restored-sorting',records:require('./ege-informatics-mirror-sorting-records.json'),sources:require('./ege-informatics-mirror-sorting-sources.json')});

module.exports.push({name:'mirror-databases',topic:'type.databases',subgroup:'restored-databases',records:require('./ege-informatics-mirror-databases-records.json'),sources:require('./ege-informatics-mirror-databases-sources.json')});

module.exports.push({name:'mirror-clusters',topic:'type.large-data',subgroup:'restored-clusters',records:require('./ege-informatics-mirror-clusters-records.json'),sources:require('./ege-informatics-mirror-clusters-sources.json')});

module.exports.push({name:'mirror-optimization',topic:'type.large-data',subgroup:'restored-optimization',records:require('./ege-informatics-mirror-optimization-records.json'),sources:require('./ege-informatics-mirror-optimization-sources.json')});

module.exports.push({name:'final-restored',topic:'all',subgroup:'restored-final',records:require('./ege-informatics-final-restored-records.json'),sources:require('./ege-informatics-final-restored-sources.json')});

module.exports.push({name:'restored-game-links',topic:'type.games',subgroup:'restored-links',records:require('./ege-informatics-restored-game-links-records.json'),sources:require('./ege-informatics-restored-game-links-sources.json')});
