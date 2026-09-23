const {test} = require('node:test');
const assert = require('node:assert/strict');
const {decodeEntities, seoPlainText, conditionText} = require('../lib/seo-text');

test('ФИПИ: именованные, числовые и повторно экранированные символы', () => {
  assert.equal(decodeEntities('&alpha; &pi; &#x22C5; &#8211; &amp;beta;'), 'α π ⋅ – β');
  assert.equal(decodeEntities('&#x110000; &#0; &#55296;'), '� � �');
  assert.equal(decodeEntities('&constructor; &unknown;'), '&constructor; &unknown;');
});
test('Условие без метаданных, служебного текста и содержимого скриптов', () => {
  assert.equal(conditionText(`<div class="qblock"><div>Дайте развернутый ответ.</div><p>Найдите x &lt; 5.</p><script>secret()</script></div><div id='i083006'><div>1.1.6 КЭС</div></div>`), 'Найдите x < 5.');
  assert.equal(seoPlainText('<p>&lt;script&gt;текст&lt;/script&gt;</p>'), '<script>текст</script>');
});
test('Вложенные формулы сохраняют степени, знаменатель и область корня', () => {
  assert.equal(seoPlainText(`<m:math><m:msqrt><m:mfrac><m:msup><m:mi>v</m:mi><m:mn>2</m:mn></m:msup><m:mrow><m:mn>2</m:mn><m:mi>g</m:mi></m:mrow></m:mfrac></m:msqrt></m:math>`), '√((v²) ÷ (2g))');
  assert.equal(seoPlainText('10<sup>–7</sup> м; h<sub>0</sub>=1,6 м; &alpha;=60&deg;'), '10⁻⁷ м; h₀=1,6 м; α=60°');
  assert.equal(seoPlainText('<math><msup><mi>x</mi><mrow><mi>n</mi><mo>+</mo><mn>1</mn></mrow></msup></math>'), 'x^(n+1)');
});
