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
