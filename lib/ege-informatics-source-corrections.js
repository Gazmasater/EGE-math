const { createHash } = require('node:crypto');
const { tasks } = require('./ege-informatics-source-corrections.json');

// Corrections are tied to the entire original condition, including MathML.
// Keep downloaded FIPI files unchanged and never guess an unknown operator.
function correctEgeInformaticsSource(fragment, id) {
  const review = tasks[id];
  if (!review) return fragment;
  const content = fragment.split(/<div\s+id=['"]i[A-Z0-9]+['"]/i)[0];
  const hash = createHash('sha256').update(content).digest('hex');
  if (hash !== review.sourceHash) return fragment;
  if (review.encoding === 'stray-angle-before-text') {
    const { originalSnippet, correctedSnippet } = review;
    if (originalSnippet !== 'ребёнке <и об одном из его родителей.' || correctedSnippet !== 'ребёнке и об одном из его родителей.' || review.count !== 1) return fragment;
    if (fragment.split(originalSnippet).length - 1 !== 1) return fragment;
    const corrected = fragment.replace(originalSnippet, correctedSnippet);
    const correctedContent = corrected.split(/<div\s+id=['"]i[A-Z0-9]+['"]/i)[0];
    return createHash('sha256').update(correctedContent).digest('hex') === review.correctedHash ? corrected : fragment;
  }
  if (review.encoding === 'flattened-rate-exponent') {
    const { originalSnippet, correctedSnippet, ratePower } = review;
    if (![22, 23].includes(ratePower) || review.count !== 1) return fragment;
    if (originalSnippet !== 'составляет 2' + ratePower + ' бит' || correctedSnippet !== 'составляет 2<sup>' + ratePower + '</sup> бит') return fragment;
    if (fragment.split(originalSnippet).length - 1 !== 1) return fragment;
    const corrected = fragment.replace(originalSnippet, correctedSnippet);
    const correctedContent = corrected.split(/<div\s+id=['"]i[A-Z0-9]+['"]/i)[0];
    return createHash('sha256').update(correctedContent).digest('hex') === review.correctedHash ? corrected : fragment;
  }
  const legacyMembership = review.encoding === 'legacy-membership';
  const broken = legacyMembership ? '<span>&Icirc;</span>' : '<m:mi>&#xFFFD;</m:mi>';
  if (fragment.split(broken).length - 1 !== review.count) return fragment;
  const entities = { '·': '&#x00B7;', '∈': '&#x2208;', '∧': '&#x2227;' };
  const entity = entities[review.operator || '·'];
  if (!entity) return fragment;
  if (legacyMembership && review.operator !== '∈') return fragment;
  const corrected = fragment.replaceAll(broken, legacyMembership ? `<span>${entity}</span>` : `<m:mo>${entity}</m:mo>`);
  const correctedContent = corrected.split(/<div\s+id=['"]i[A-Z0-9]+['"]/i)[0];
  return createHash('sha256').update(correctedContent).digest('hex') === review.correctedHash ? corrected : fragment;
}

module.exports = { correctEgeInformaticsSource };
