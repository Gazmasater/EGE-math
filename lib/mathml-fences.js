const {decodeEntities} = require('./seo-text');

// mfenced is legacy MathML. MathML Core browsers need explicit mrow/mo.
// Expand its delimiters and separators without changing the source files.
function expandMathmlFences(html) {
  const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const pattern = /<mfenced\b([^>]*)>((?:(?!<mfenced\b)[\s\S])*?)<\/mfenced\s*>/gi;
  function expand(_, attributes, body) {
    const values = {open:'(', close:')', separators:','};
    const inherited = attributes.replace(/\b(open|close|separators)\s*=\s*(["'])(.*?)\2/gi,
      (_, name, quote, value) => { values[name.toLowerCase()] = decodeEntities(value); return ''; });
    const children = []; let depth = 0, start = 0;
    for (const token of body.matchAll(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g)) {
      const text = token[0];
      if (text.startsWith('<!--')) continue;
      if (!text.startsWith('<')) {
        if (!depth && text.trim()) children.push(text);
        continue;
      }
      if (text.startsWith('</')) depth--;
      else {
        if (!depth) start = token.index;
        if (!text.endsWith('/>')) depth++;
      }
      if (!depth) children.push(body.slice(start, token.index + text.length));
    }
    const separators = Array.from(values.separators.replace(/\s/g, ''));
    const content = children.map((child, i) => (i && separators.length
      ? '<mo separator="true">' + escape(separators[Math.min(i-1, separators.length-1)]) + '</mo>' : '') + child).join('');
    const fence = (value, form) => value.trim() ? '<mo fence="true" form="'+form+'">'+escape(value.trim())+'</mo>' : '';
    return '<mrow data-legacy-mfenced="true"'+inherited+'>'+fence(values.open,'prefix')+'<mrow>'+content+'</mrow>'+fence(values.close,'postfix')+'</mrow>';
  }
  let previous;
  do { previous = html; html = html.replace(pattern, expand); } while (html !== previous);
  return html;
}

module.exports = {expandMathmlFences};
