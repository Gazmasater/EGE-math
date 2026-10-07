const { createHash } = require('node:crypto');
const review = require('./oge-topic-assignments.json');
const cache = new WeakMap();

// Original KES labels remain in the FIPI source. The review is a separate,
// versioned assignment of study topics and is valid only for this condition.
function ogeSourceSignature(task) {
  const content = String(task.fragment || '').split(/<div\s+id=['"]i[A-Z0-9]+['"]/i)[0];
  // Keep MathML and markup: flattening text can lose inequalities and fractions.
  return createHash('sha256').update(content).digest('hex');
}

function reviewedOgeAssignment(task, section) {
  if (!task?.id) return null;
  const previous = cache.get(task);
  if (previous?.section === section && previous.fragment === task.fragment) return previous.assignment;
  const candidate = review.banks[section]?.tasks[task.id];
  const assignment = candidate && candidate.sourceSignature === ogeSourceSignature(task) ? candidate : null;
  cache.set(task, { section, fragment: task.fragment, assignment });
  return assignment;
}

module.exports = { ogeSourceSignature, reviewedOgeAssignment };
