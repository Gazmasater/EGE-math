// Visual research fixture: untouched FIPI rasters, grouped for human inspection.
const fs=require('node:fs'),path=require('node:path');
const snapshot=require('./data/thermal-catalog.json');
const out=process.argv[2];if(!out)throw Error('Output directory required');
// Keep the completion batch reproducible after its publication.
const tasks=snapshot.filter(t=>['pending','completion'].includes(t.status)&&t.images.length);
for(let start=0;start<tasks.length;start+=6){
  const html='<!doctype html><meta charset="utf-8"><style>body{margin:0;font:20px Arial;background:white}.grid{display:grid;grid-template-columns:600px 600px}article{box-sizing:border-box;height:550px;padding:14px;border:1px solid #aaa}h2{margin:0 0 12px;font-size:23px}img{max-width:565px;max-height:400px;object-fit:contain;margin:5px;vertical-align:top}</style><div class="grid">'+tasks.slice(start,start+6).map(t=>`<article><h2>${t.id}</h2>${t.images.map(src=>`<img src="file://${path.resolve(__dirname,'../fipi-assets',src)}">`).join('')}</article>`).join('')+'</div>';
  const file=path.join(out,`originals-${String(start/6+1).padStart(2,'0')}.html`);fs.writeFileSync(file,html);
  console.log(file,tasks.slice(start,start+6).map(t=>t.id).join(','));
}
