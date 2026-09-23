// Browser-rendered review sheets, not image retouching. Original files are read-only.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const out=path.resolve(process.argv[2]),kind=process.argv[3]||'original';
assert.ok(['original','diagram','page-pair'].includes(kind));fs.mkdirSync(out,{recursive:true});
const selected=process.env.ELECTRO_REVIEW_IDS?.split(',');
if(selected)assert.ok(selected.every(id=>/^[A-F0-9]{6}$/.test(id)));
const reviewTopic=process.env.PHYSICS_REVIEW_TOPIC||'electrodynamics';
assert.ok(['electrodynamics','quantum'].includes(reviewTopic));
const prefix=process.env.ELECTRO_ARTIFACT_PREFIX||'';
assert.ok(['','tasks-'].includes(prefix));
const enlarge=process.env.ELECTRO_ENLARGE==='1';
const sourceDirs=(process.env.ELECTRO_ARTIFACT_DIRS||out).split(',').map(p=>path.resolve(p));
function artifact(file){const f=sourceDirs.map(p=>path.join(p,prefix+file)).find(p=>fs.existsSync(p));assert.ok(f,'Missing artifact '+file);return f;}
const catalog=selected&&kind!=='original'?selected.map(id=>({id})):require('./data/'+reviewTopic+'-catalog.json').filter(t=>(kind!=='original'||t.images.length)&&(!selected||selected.includes(t.id)));
const first=Number(process.env.ELECTRO_SHEET_FIRST||1),last=Number(process.env.ELECTRO_SHEET_LAST||Math.ceil(catalog.length/4));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),reviewTopic+'-review-'));
const chrome=spawn(process.env.CHROME_BIN||'/opt/google/chrome/chrome',['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--remote-debugging-port=9338','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
 let pages;for(let n=0;n<50;n++){try{pages=await(await fetch('http://127.0.0.1:9338/json/list')).json();break}catch{await delay(100)}}
 assert.ok(pages?.length);const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl),pending=new Map();let serial=0;
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const[yes,no]=pending.get(m.id);pending.delete(m.id);m.error?no(Error(JSON.stringify(m.error))):yes(m.result)}};
 await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no});
 const call=(method,params={})=>new Promise((yes,no)=>{const id=++serial,t=setTimeout(()=>{pending.delete(id);no(Error(method+' timed out'))},60000);pending.set(id,[r=>{clearTimeout(t);yes(r)},e=>{clearTimeout(t);no(e)}]);ws.send(JSON.stringify({id,method,params}))});
 await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1360,height:2000,deviceScaleFactor:1,mobile:false});
 const img=file=>{const b=fs.readFileSync(file),mime=b[0]===137?'png':b[0]===71?'gif':'jpeg';return '<img src="data:image/'+mime+';base64,'+b.toString('base64')+'">'};
 const manifest=[];
 for(let i=(first-1)*4;i<Math.min(catalog.length,last*4);i+=4){
  const tasks=catalog.slice(i,i+4),num=String(i/4+1).padStart(2,'0');
  const html='<!doctype html><meta charset="utf-8"><style>body{margin:0;font:22px Arial}.grid{display:grid;grid-template-columns:680px 680px}article{height:1000px;box-sizing:border-box;border:1px solid #aaa;padding:15px}h2{margin:0 0 12px;font-size:28px}.original{display:flex;flex-wrap:wrap;align-items:flex-start;gap:18px}.original img{max-width:640px;max-height:430px;object-fit:contain}.diagram img{width:648px;height:930px;object-fit:contain;object-position:top}.page-pair{display:flex}.page-pair img{width:324px;height:930px;object-fit:contain;object-position:top}</style><div class="grid">'+tasks.map(t=>'<article><h2>'+t.id+'</h2><div class="'+kind+'">'+(kind==='original'?t.images.map(file=>img(path.resolve(__dirname,'../fipi-assets',file))).join(''):kind==='page-pair'?['desktop','mobile'].map(k=>img(artifact(t.id+'-'+k+'.png'))).join(''):img(artifact(t.id+'-diagram.png')))+'</div></article>').join('')+'</div>';
  const frame=(await call('Page.getFrameTree')).frameTree.frame.id;await call('Page.setDocumentContent',{frameId:frame,html:enlarge?html.replace('.original img{','.original img{width:600px;'):html});
  await call('Runtime.evaluate',{expression:'Promise.all(Array.from(document.images,i=>i.decode()))',awaitPromise:true});
  const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true}),file='review-'+kind+'-'+num+'.png';fs.writeFileSync(path.join(out,file),Buffer.from(r.data,'base64'));
  manifest.push({file,ids:tasks.map(t=>t.id)});console.log(file,tasks.map(t=>t.id).join(','));
 }
 fs.writeFileSync(path.join(out,'review-'+kind+'-'+first+'-'+last+'.json'),JSON.stringify(manifest,null,2));
 // Chrome may close CDP before replying; the finalizer owns shutdown.
 ws.close();
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{const stopped=chrome.exitCode!==null?Promise.resolve():new Promise(r=>chrome.once('exit',r));chrome.kill();await Promise.race([stopped,delay(3000)]);await delay(1000);await fs.promises.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200}).catch(e=>console.warn('Profile retained:',profile,e.code))});
