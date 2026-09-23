// Совместимый вход: проверенный набор всех 30 задач хранится в scripts/data.
// Без --check сохраняется прежний режим применения исправлений.
if (!process.argv.includes('--check')) process.argv.push('--apply');
require('./audit-statics').main();
