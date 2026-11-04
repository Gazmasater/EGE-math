'use strict';

// Keep program indentation and operators separate from mathematical typography.
function renderSolutionBlocks(value, renderMathText, escapeHtml) {
  const text = String(value || '').trim();
  const paragraphs = part => part.trim().split(/\n\s*\n/).filter(Boolean).map(paragraph =>
    `<p>${paragraph.split('\n').map(renderMathText).join('<br>')}</p>`
  ).join('');
  const pattern = /^```(python|kumir|pascal|table)\r?\n([\s\S]*?)\r?\n```[ \t]*(?:\r?\n|$)/gm;
  let result = '', position = 0, match;
  while ((match = pattern.exec(text))) {
    result += paragraphs(text.slice(position, match.index));
    if (match[1] === 'table') {
      const rows = match[2].split(/\r?\n/).map(line => line.split('|').map(cell => cell.trim()));
      const width = rows[0].length;
      if (rows.length >= 2 && width >= 2 && rows.every(row => row.length === width)) {
        const head = rows[0].map(cell => `<th scope="col">${renderMathText(cell)}</th>`).join('');
        const body = rows.slice(1).map(row => `<tr>${row.map(cell => `<td>${renderMathText(cell)}</td>`).join('')}</tr>`).join('');
        result += `<div class="solution-table-scroll" tabindex="0" role="region" aria-label="Таблица решения"><table class="solution-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
      } else {
        // Preserve malformed authored data as escaped text instead of dropping cells.
        result += paragraphs(match[0]);
      }
      position = pattern.lastIndex;
      continue;
    }
    const label = { python: 'Программа на Python 3', kumir: 'Алгоритм для Робота', pascal: 'Программа на Паскале' }[match[1]];
    result += `<pre class="solution-code" tabindex="0" aria-label="${label}"><code>${escapeHtml(match[2])}</code></pre>`;
    position = pattern.lastIndex;
  }
  return result + paragraphs(text.slice(position));
}

module.exports = { renderSolutionBlocks };
