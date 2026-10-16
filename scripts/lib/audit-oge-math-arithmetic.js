const assert = require('node:assert/strict');
const { decodeEntities } = require('../../lib/seo-text');

// Exact arithmetic used only by the audit. Explanations were calculated
// independently with Python Fraction; this evaluator reads primary MathML.
const q = (n, d = 1n) => { assert.notEqual(d, 0n); return d < 0n ? [-n, -d] : [n, d]; };
const add = (a,b) => q(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const neg = a => q(-a[0],a[1]);
const mul = (a,b) => q(a[0]*b[0],a[1]*b[1]);
const div = (a,b) => q(a[0]*b[1],a[1]*b[0]);
const cmp = (a,b) => a[0]*b[1] < b[0]*a[1] ? -1 : a[0]*b[1] > b[0]*a[1] ? 1 : 0;
function decimal(value) {
  const s = String(value).trim().replace('−','-').replace(',','.');
  assert.match(s, /^-?\d+(?:\.\d+)?$/);
  return q(BigInt(s.replace('.','')), 10n**BigInt((s.split('.')[1] || '').length));
}
function evaluate(expression) {
  const s = expression.replace(/\s+/g,'').replaceAll('−','-').replace(/[⋅·]/g,'*').replace(/[:÷]/g,'/');
  const tokens = s.match(/\d+(?:[,.]\d+)?|[()+*/-]/g) || [];
  assert.equal(tokens.join(''),s,'Unexpected expression token');
  let i=0;
  function atom() {
    if (tokens[i]==='-') { i++; return neg(atom()); }
    if (tokens[i]==='+') { i++; return atom(); }
    if (tokens[i]==='(') { i++; const result=sum(); assert.equal(tokens[i++],')'); return result; }
    return decimal(tokens[i++]);
  }
  function product() {
    let result=atom();
    while (['*','/'].includes(tokens[i])) { const op=tokens[i++], b=atom(); result=op==='*' ? mul(result,b) : div(result,b); }
    return result;
  }
  function sum() {
    let result=product();
    while (['+','-'].includes(tokens[i])) { const op=tokens[i++], b=product(); result=add(result,op==='+' ? b : neg(b)); }
    return result;
  }
  const result=sum(); assert.equal(i,tokens.length); return result;
}
function mathExpression(markup) {
  const root={name:'root',children:[]}, stack=[root];
  for (const token of markup.match(/<[^>]*>|[^<]+/g) || []) {
    if (!token.startsWith('<')) { if (token.trim()) stack.at(-1).children.push(decodeEntities(token).trim()); continue; }
    const match=token.match(/^<(\/?)(?:m:)?([\w-]+)/i); assert.ok(match);
    if (match[1]) { assert.equal(stack.pop().name,match[2].toLowerCase()); }
    else { const node={name:match[2].toLowerCase(),children:[]}; stack.at(-1).children.push(node); if (!token.endsWith('/>')) stack.push(node); }
  }
  assert.equal(stack.length,1);
  function render(node) {
    if (typeof node==='string') return node;
    if (node.name==='annotation') return '';
    if (node.name==='mfrac') { assert.equal(node.children.length,2); return '(('+render(node.children[0])+')/('+render(node.children[1])+'))'; }
    assert.ok(['root','math','mstyle','semantics','mrow','mn','mo','mi'].includes(node.name),node.name);
    return node.children.map(render).join('');
  }
  return render(root);
}

function auditArithmetic(task, source, record, text) {
  const answer=decimal(record.answer);
  if (text.includes('Найдите значение выражения')) {
    const math=task.fragment.match(/<(?:m:)?math\b[^>]*>[\s\S]*?<\/(?:m:)?math>/gi) || [];
    assert.equal(math.length,1,task.id+': primary MathML expression');
    assert.equal(cmp(evaluate(mathExpression(math[0])),answer),0,task.id+': exact primary calculation');
  } else if (text.includes('На координатной прямой точки')) {
    assert.deepEqual(source.visualReview.pointOrder,['A','B','C','D']);
    const values=text.split('числам ')[1].split('. Какой')[0].split(';').map(decimal);
    const target=decimal(text.split('соответствует число ')[1].split('?')[0]);
    assert.equal(values.length,4);
    // Count smaller coordinates; this does not use the generator's sorting.
    assert.equal(cmp(answer,q(BigInt(values.filter(v=>cmp(v,target)<0).length+1))),0);
    assert.equal(values.filter(v=>cmp(v,target)===0).length,1);
  } else if (text.includes('Одно из чисел')) {
    const [lo,hi]=source.visualReview.intervalTenths;
    assert.equal(hi-lo,1); assert.ok(lo>=0 && hi<=10);
    const options=[...text.matchAll(/\d\) \((\d+)\) ÷ \((\d+)\)/g)].map(m=>q(BigInt(m[1]),BigInt(m[2])));
    assert.equal(options.length,4);
    const good=options.flatMap((v,i)=>cmp(q(BigInt(lo),10n),v)<0 && cmp(v,q(BigInt(hi),10n))<0 ? [i+1] : []);
    assert.equal(good.length,1,task.id+': unique graph option');
    assert.equal(cmp(answer,q(BigInt(good[0]))),0);
  } else {
    assert.ok(text.includes('Какое из следующих чисел'));
    const bounds=[...text.matchAll(/\((\d+)\) ÷ \((\d+)\)/g)].map(m=>q(BigInt(m[1]),BigInt(m[2])));
    assert.equal(bounds.length,2); bounds.sort(cmp);
    const options=[...text.matchAll(/\d\) ([\d,]+)/g)].map(m=>decimal(m[1])); assert.equal(options.length,4);
    const good=options.flatMap((v,i)=>cmp(bounds[0],v)<0 && cmp(v,bounds[1])<0 ? [i+1] : []);
    assert.equal(good.length,1); assert.equal(cmp(answer,q(BigInt(good[0]))),0);
  }
  assert.ok(source.methodSource && source.methodSource.reviewed);
  assert.match(source.methodSource.url,/^https:\/\/math-oge\.sdamgia\.ru\/problem\?id=\d+$/);
  assert.ok(source.methodSource.steps.length>80);
}
module.exports={auditArithmetic,evaluate,mathExpression,decimal,cmp};
