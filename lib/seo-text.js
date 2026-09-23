// HTML5 character references (html-entities.json: the standard named-character table).
const entities = require('./html-entities.json');

function decodeEntities(value) {
  let text = String(value || '');
  // Some FIPI fragments contain double-escaped references. Decode a bounded number of layers.
  for (let pass = 0; pass < 3; pass++) {
    const next = text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (whole, name) => {
      if (name[0] !== '#') return Object.hasOwn(entities, name) ? entities[name] : whole;
      const n = /^#x/i.test(name) ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '�';
    });
    if (next === text) break;
    text = next;
  }
  return text;
}

const superscripts = Object.fromEntries(Array.from('0123456789+-−–=()').map((c, i) => [c, Array.from('⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁻⁻⁼⁽⁾')[i]]));
const subscripts = Object.fromEntries(Array.from('0123456789+-−–=()').map((c, i) => [c, Array.from('₀₁₂₃₄₅₆₇₈₉₊₋₋₋₌₍₎')[i]]));
function indexText(value, upper) {
  const text = decodeEntities(value).replace(/\s+/g, ''), alphabet = upper ? superscripts : subscripts;
  return text && Array.from(text).every(c => alphabet[c])
    ? Array.from(text, c => alphabet[c]).join('')
    : `${upper ? '^' : '_'}(${text})`;
}

function mathText(markup) {
  const root = {tag: 'root', children: []}, stack = [root];
  for (const token of markup.match(/<[^>]*>|[^<]+/g) || []) {
    if (!token.startsWith('<')) { stack.at(-1).children.push(decodeEntities(token)); continue; }
    const match = token.match(/^<(\/?)(?:m:)?([\w-]+)/i);
    if (!match) continue;
    if (match[1]) { if (stack.length > 1) stack.pop(); }
    else {
      const node = {tag: match[2].toLowerCase(), children: []};
      stack.at(-1).children.push(node);
      if (!token.endsWith('/>')) stack.push(node);
    }
  }
  function render(node) {
    if (typeof node === 'string') return node.replace(/\s+/g, ' ');
    const children = node.children.map(render).filter(s => s.trim()), joined = children.join('');
    if (node.tag === 'mfrac') return `(${children[0] || ''}) ÷ (${children[1] || ''})`;
    if (node.tag === 'msup') return `${children[0] || ''}${indexText(children[1], true)}`;
    if (node.tag === 'msub') return `${children[0] || ''}${indexText(children[1], false)}`;
    if (node.tag === 'msubsup') return `${children[0] || ''}${indexText(children[1], false)}${indexText(children[2], true)}`;
    if (node.tag === 'msqrt') return `√(${joined})`;
    if (node.tag === 'mroot') return `${indexText(children[1], true)}√(${children[0] || ''})`;
    if (node.tag === 'mfenced') return `(${children.join('; ')})`;
    if (node.tag === 'annotation') return '';
    return joined;
  }
  return render(root);
}

function seoPlainText(html) {
  const stripped = String(html || '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(?:m:)?math\b[^>]*>[\s\S]*?<\/(?:m:)?math>/gi, mathText)
    .replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_, s) => indexText(s.replace(/<[^>]*>/g, ''), true))
    .replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, (_, s) => indexText(s.replace(/<[^>]*>/g, ''), false))
    .replace(/<\/?(?:span|i|b|em|strong|font)\b[^>]*>/gi, '')
    .replace(/<[^>]*>/g, ' ');
  return decodeEntities(stripped).replace(/[\u00ad\u200b\ufeff]/g, '').replace(/\s+/g, ' ').trim();
}

function conditionText(fragment) {
  // The task's metadata follows its question block and must never enter a search snippet.
  const content = String(fragment || '').split(/<div\s+id=['"]i[A-Z0-9]+['"]/i)[0];
  return seoPlainText(content).replace(/^Дайте разв[её]рнутый ответ\.?\s*/i, '').trim();
}

module.exports = {decodeEntities, seoPlainText, conditionText};
