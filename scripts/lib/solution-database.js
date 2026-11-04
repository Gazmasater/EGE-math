'use strict';

const path = require('node:path');

function solutionDatabaseFile(args = process.argv.slice(2), env = process.env) {
  const index = args.indexOf('--db');
  if (index >= 0 && (!args[index + 1] || args[index + 1].startsWith('--'))) throw new Error('Укажите путь после --db.');
  return path.resolve(index >= 0 ? args[index + 1] : env.EGE_SOLUTIONS_DB || path.join(__dirname, '../../storage/solutions.sqlite'));
}

module.exports = {solutionDatabaseFile};
