'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {renderSolutionBlocks}=require('../lib/solution-blocks');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('strategy tables retain every branch and escape authored cells',()=>{
 const html=renderSolutionBlocks('До.\n```table\nПартия | Петя | Ваня\n1 | (2; 3) | (5; 3)\n2 | <script>x</script> | 13\n```\nПосле.',escape,escape);
 assert.equal((html.match(/<tr>/g)||[]).length,3);
 assert.match(html,/<th scope="col">Петя<\/th>/);
 assert.match(html,/&lt;script&gt;x&lt;\/script&gt;/);assert.ok(!html.includes('<script>'));
 assert.match(html,/tabindex="0" role="region"/);assert.match(html,/До\./);assert.match(html,/После\./);
});
test('malformed tables preserve all original values as escaped prose',()=>{
 const html=renderSolutionBlocks('```table\nА | Б\n1 | 2 | <extra>\n```',escape,escape);
 assert.ok(!html.includes('<table'));assert.match(html,/1 \| 2 \| &lt;extra&gt;/);
});
test('table and code blocks keep separate rendering with surrounding prose',()=>{
 const html=renderSolutionBlocks('```table\nA | B\n1 | 2\n```\nТекст.\n```python\nif a < b:\n    print(a // b)\n```\n```table\nC | D\n3 | 4\n```',escape,escape);
 assert.equal((html.match(/<table /g)||[]).length,2);
 assert.match(html,/if a &lt; b:\n    print\(a \/\/ b\)/);assert.match(html,/<p>Текст\.<\/p>/);
});
