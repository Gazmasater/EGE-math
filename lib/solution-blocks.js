'use strict';

// Keep program indentation and operators separate from mathematical typography.
function renderSolutionBlocks(value, renderMathText, escapeHtml) {
  const text = String(value || '').trim();
  const paragraphs = part => part.trim().split(/\n\s*\n/).filter(Boolean).map(paragraph =>
    `<p>${paragraph.split('\n').map(renderMathText).join('<br>')}</p>`
  ).join('');
  const pattern = /^```(python|kumir)\r?\n([\s\S]*?)\r?\n```[ \t]*(?:\r?\n|$)/gm;
  let result = '', position = 0, match;
  while ((match = pattern.exec(text))) {
    result += paragraphs(text.slice(position, match.index));
    const label = match[1] === 'python' ? 'Программа на Python 3' : 'Алгоритм для Робота';
    result += `<pre class="solution-code" tabindex="0" aria-label="${label}"><code>${escapeHtml(match[2])}</code></pre>`;
    position = pattern.lastIndex;
  }
  return result + paragraphs(text.slice(position));
}

module.exports = { renderSolutionBlocks };
