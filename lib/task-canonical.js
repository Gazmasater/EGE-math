'use strict';

const {createHash} = require('node:crypto');
const manifest = require('./task-canonical.json');
const reviews = new Map();
const targets = new Set(manifest.groups.map(group => group.canonicalId));
for (const group of manifest.groups) {
  if (!/^[A-Z0-9]+$/.test(group.canonicalId) || !group.evidence[group.canonicalId]) {
    throw new Error('Invalid reviewed canonical target');
  }
  for (const alias of group.aliases) {
    if (!/^[A-Z0-9]+$/.test(alias) || targets.has(alias) || reviews.has(alias) || !group.evidence[alias]) {
      throw new Error('Invalid or chained task canonical alias');
    }
    reviews.set(alias, group);
  }
}

const sha256 = value => createHash('sha256').update(value).digest('hex');
function conditionFingerprint(fragment) {
  return sha256(String(fragment || '').split(/<div\s+id=['"]i[A-Z0-9]+['"]/i)[0].trim());
}
function solutionFingerprint(solution) {
  return sha256(JSON.stringify([solution?.answer || '', solution?.solution || '', solution?.diagram_svg || '', solution?.diagram_caption || '']));
}
function reviewedTaskTarget(taskId) {
  return reviews.get(taskId)?.canonicalId || null;
}
function reviewedTaskIds(taskId) {
  const group = manifest.groups.find(item => item.canonicalId === taskId || item.aliases.includes(taskId));
  return group ? [group.canonicalId, ...group.aliases] : [taskId];
}
function reviewedCanonicalId(taskId, {fragment, solution, targetFragment, targetSolution} = {}) {
  const group = reviews.get(taskId);
  if (!group) return taskId;
  // A source or solution edit invalidates the review for both HTTP and sitemap.
  // Keep the individual URL canonical until the pair is reviewed again.
  const matches = (id, content, record) => Boolean(content && record?.published === 1
    && conditionFingerprint(content) === group.evidence[id].conditionSha256
    && solutionFingerprint(record) === group.evidence[id].solutionSha256);
  return matches(taskId, fragment, solution) && matches(group.canonicalId, targetFragment, targetSolution)
    ? group.canonicalId : taskId;
}

module.exports = {reviewedTaskTarget, reviewedTaskIds, reviewedCanonicalId, conditionFingerprint, solutionFingerprint};
