const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
// Exercise the actual pure server formatter without starting HTTP or opening SQLite.
const source=fs.readFileSync(require.resolve('../server.js'),'utf8');
const code=source.slice(source.indexOf('function renderMathAtoms('),source.indexOf('function renderMathSolution('));
const context={escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')};
vm.createContext(context);vm.runInContext(code,context);
test('Индексы ЭДС и границы соседних множителей',()=>{
 assert.equal(context.renderMathText('ℰ_си = −L · I_L'), 'ℰ<sub>си</sub> = −L · I<sub>L</sub>');
 assert.equal(context.renderMathText('I_V · R_р'), 'I<sub>V</sub> · R<sub>р</sub>');
});
test('Индекс ЭДС внутри вертикальной дроби и безопасный текст',()=>{
 const result=context.renderMathText('⟦ℰ_и¦R⟧ < 1');
 assert.ok(result.includes('class="math-fraction"'));
 assert.ok(result.includes('ℰ<sub>и</sub>'));
 assert.ok(result.endsWith('&lt; 1'));
 assert.ok(!/[⟦⟧¦_]/.test(result));
});
test('Корень охватывает вложенные скобки, степени и вертикальную дробь',()=>{
 const result=context.renderMathText('√((5 А)² − (3 А)²) + √(⟦a¦b(c+d)⟧)');
 assert.equal((result.match(/class="math-root"/g)||[]).length,2);
 assert.ok(result.includes('class="math-radicand">(5 А)² − (3 А)²</span>'));
 assert.ok(result.includes('class="math-radicand"><span class="math-fraction">'));
 assert.ok(result.includes('<span>b(c+d)</span>'));
});
test('Вложенные корни, короткий корень и незакрытая скобка',()=>{
 const result=context.renderMathText('√(a + √(b + c)) + √14v');
 assert.equal((result.match(/class="math-root"/g)||[]).length,3);
 assert.ok(result.endsWith('<span class="math-radicand">14</span></span>v'));
 assert.equal(context.renderMathText('√(a + (b)'), '√(a + (b)');
 assert.ok(context.renderMathText('√((x) + <script>)').includes('&lt;script&gt;'));
});
test('Десятичные и дробные показатели степени',()=>{
 assert.equal(context.renderMathText('5^(0,06) + 7^(−2x+4)'), '5<sup>0,06</sup> + 7<sup>−2x+4</sup>');
 const result=context.renderMathText('4^(⟦1¦5⟧)');
 assert.ok(result.startsWith('4<sup><span class="math-fraction">'));
 assert.ok(result.endsWith('</span></sup>'));
 assert.equal(context.renderMathText('2^(<script>)'),'2<sup>&lt;script&gt;</sup>');
 assert.equal(context.renderMathText('2^(x+1'), '2^(x+1');
});
test('Вложенные скобки и степени внутри показателя',()=>{
 assert.equal(context.renderMathText('3^(log₃(log₃x))'), '3<sup>log₃(log₃x)</sup>');
 assert.equal(context.renderMathText('2^(x^(2)+1)'), '2<sup>x<sup>2</sup>+1</sup>');
 const result=context.renderMathText('3^(log₃(⟦a¦b⟧))');
 assert.ok(result.startsWith('3<sup>log₃(<span class="math-fraction">'));
 assert.ok(result.endsWith('</span>)</sup>'));
 assert.equal(context.renderMathText('2^(x\n+1)'), '2^(x\n+1)');
 assert.equal(context.renderMathText('3^(log₃(<script>))'), '3<sup>log₃(&lt;script&gt;)</sup>');
});
