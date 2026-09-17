const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const outputDir = process.argv[2];
if (!outputDir) throw new Error('Укажите каталог для временных файлов аудита');
fs.mkdirSync(outputDir, { recursive: true });

const db = new DatabaseSync(path.join(__dirname, '..', 'storage', 'solutions.sqlite'));
const rows = db.prepare(`
  SELECT task_id, diagram_svg, diagram_caption
  FROM solutions
  WHERE published = 1 AND trim(diagram_svg) <> ''
  ORDER BY task_id
`).all();

for (const row of rows) {
  const page = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>${row.task_id}</title>
    <style>body{margin:0;padding:18px;background:#f4f6f8;color:#183153;font:16px Arial,sans-serif}main{max-width:700px;margin:auto;background:#fff;padding:18px;border-radius:8px}h1{margin:0 0 12px;font-size:24px}img{display:block;width:100%;height:auto;border:1px solid #cbd7e4;border-radius:4px}p{line-height:1.45}</style>
    <main><h1>${row.task_id}</h1><img src="data:image/svg+xml;base64,${Buffer.from(row.diagram_svg).toString('base64')}" alt="Схема"><p>${row.diagram_caption}</p></main></html>`;
  fs.writeFileSync(path.join(outputDir, `${row.task_id}.html`), page, 'utf8');
  fs.writeFileSync(path.join(outputDir, `${row.task_id}.svg`), row.diagram_svg, 'utf8');
}

for (let offset = 0; offset < rows.length; offset += 9) {
  const cards = rows.slice(offset, offset + 9).map(row => `<article><h2>${row.task_id}</h2>
    <img src="data:image/svg+xml;base64,${Buffer.from(row.diagram_svg).toString('base64')}" alt="Схема ${row.task_id}">
    <p>${row.diagram_caption}</p></article>`).join('');
  const index = Math.floor(offset / 9) + 1;
  const page = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>Аудит схем ${index}</title>
    <style>body{margin:0;padding:16px;background:#e8edf2;color:#183153;font:13px/1.35 Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}article{background:#fff;border-radius:7px;padding:10px;box-shadow:0 1px 5px #0002}h2{margin:0 0 6px;font-size:19px}img{display:block;width:100%;height:190px;object-fit:contain;border:1px solid #cbd7e4;border-radius:4px}p{margin:7px 0 0}</style>
    <main class="grid">${cards}</main></html>`;
  fs.writeFileSync(path.join(outputDir, `batch-${index}.html`), page, 'utf8');
}
console.log(`Экспортировано схем для проверки: ${rows.length}`);
