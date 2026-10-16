const test = require('node:test');
const assert = require('node:assert/strict');
const {expandMathmlFences} = require('../lib/mathml-fences');

test('keeps a closed interval and its explicit semicolon', () => {
  const result = expandMathmlFences('<mfenced close="]" open="["><mrow><mn>5</mn><mo>;</mo><mn>6</mn></mrow></mfenced>');
  assert.match(result, /form="prefix">\[<\/mo>/);
  assert.match(result, /form="postfix">\]<\/mo>/);
  assert.equal((result.match(/<mo>;<\/mo>/g)||[]).length, 1);
  assert.ok(!result.includes('separator="true"'));
});
test('preserves nested parentheses, separators and empty delimiters', () => {
  const result = expandMathmlFences('<mfenced open="" close="" separators="; ,"><mi>a</mi><mfenced><mi>b</mi><mi>c</mi></mfenced><mi>d</mi><mi>e</mi></mfenced>');
  assert.ok(!/<\/?mfenced\b/.test(result));
  assert.equal((result.match(/form="prefix"/g)||[]).length, 1);
  assert.equal((result.match(/separator="true">;<\/mo>/g)||[]).length, 1);
  assert.equal((result.match(/separator="true">,<\/mo>/g)||[]).length, 3);
  assert.equal(result.replace(/<[^>]*>/g,''), 'a;(b,c),d,e');
});
test('empty separators, entities and ordinary MathML are preserved', () => {
  assert.equal(expandMathmlFences('<mfenced open="&lt;" close="&gt;" separators=""><mi>x</mi><mi>y</mi></mfenced>').replace(/<[^>]*>/g,''), '&lt;xy&gt;');
  const original='<math><msqrt><mn>3</mn></msqrt><mo>+</mo><mn>8</mn></math>';
  assert.equal(expandMathmlFences(original), original);
});
