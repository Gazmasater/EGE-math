const {createHash} = require('node:crypto');
const figures = require('./physics-condition-figures.json');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Restore supplied figures only at presentation time. Raw conditions and their
// classification hashes remain unchanged; a changed condition needs review.
function restorePhysicsFigures(html) {
  return html.replace(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"][^>]*>[\s\S]*?(?=<div\s+id=['"]i\1['"])/gi, (condition, id) => {
    const figure = figures[id.toUpperCase()];
    if (!figure || createHash('sha256').update(condition).digest('hex') !== figure.sourceHash) return condition;
    if (!condition.includes(figure.placeholder)) return condition;
    const image = `<figure class="restored-condition-figure" style="max-width:${figure.width}px;margin:12px auto"><img src="/fipi/${escape(figure.asset)}" width="${figure.width}" height="${figure.height}" alt="${escape(figure.alt)}" style="display:block;max-width:100%;height:auto"></figure>`;
    return condition.replace(figure.placeholder, image);
  });
}

module.exports = {restorePhysicsFigures};
