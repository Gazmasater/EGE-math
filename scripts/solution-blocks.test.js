const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderSolutionBlocks } = require('../lib/solution-blocks');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const math = s => escape(s).replace('x_1', 'x<sub>1</sub>');

test('Existing paragraphs retain their mathematical formatting and line breaks', () => {
  assert.equal(renderSolutionBlocks('  x_1\nsecond\n\nthird  ', math, escape), '<p>x<sub>1</sub><br>second</p><p>third</p>');
});

test('Program indentation, blank lines and operators survive without becoming HTML or formulas', () => {
  const code = 'x_1 = 2 ** 3\n\nif x_1 < 9:\n    print("<script>&")';
  const result = renderSolutionBlocks('Before\n```python\n' + code + '\n```\n\nAfter x_1', math, escape);
  assert.equal(result, '<p>Before</p><pre class="solution-code" tabindex="0" aria-label="Программа на Python 3"><code>' + escape(code) + '</code></pre><p>After x<sub>1</sub></p>');
  assert.ok(!result.includes('<script>'));
});

test('Several code blocks preserve their order; an unclosed block remains ordinary escaped text', () => {
  const result = renderSolutionBlocks('```kumir\nнц пока справа свободно\n  вправо\nкц\n```\nBetween\n```python\nprint(1)\n```', math, escape);
  assert.equal((result.match(/<pre /g) || []).length, 2);
  assert.ok(result.includes('кц</code></pre><p>Between</p><pre'));
  assert.equal(renderSolutionBlocks('```python\n<script>', math, escape), '<p>```python<br>&lt;script&gt;</p>');
});
