'use strict';
const {createHash} = require('node:crypto');
const figures = require('./oge-physics-condition-figures.json');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

// User-authorized secondary figures. Keep raw FIPI conditions unchanged and
// fail closed if a condition changes; attribution is visible beside the image.
function restoreOgePhysicsFigures(html) {
  return html.replace(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"][^>]*>[\s\S]*?(?=<div\s+id=['"]i\1['"])/gi, (condition, id) => {
    const f = figures[id.toUpperCase()];
    if (!f || createHash('sha256').update(condition).digest('hex') !== f.conditionHash) return condition;
    if (condition.split(f.placeholder).length !== 2) return condition;
    const attribution = `Рисунок из <a href="${escape(f.page)}" target="_blank" rel="noopener noreferrer">«Решу ОГЭ», № ${f.problem}</a>.`;
    const correction = f.physicsReference ? ` <a href="${escape(f.physicsReference)}" target="_blank" rel="noopener noreferrer">О магнитном переходе Кюри</a>.` : '';
    const image = `<figure class="restored-condition-figure" style="max-width:${f.displayWidth}px;margin:12px auto"><img src="/fipi/${escape(f.asset)}" width="${f.width}" height="${f.height}" alt="${escape(f.alt)}" style="display:block;width:100%;height:auto"><figcaption style="font-size:14px;line-height:1.4;margin-top:8px">${attribution}${correction}</figcaption></figure>`;
    return condition.replace(f.placeholder, image);
  });
}

module.exports = {restoreOgePhysicsFigures};
