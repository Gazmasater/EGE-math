// Read-only visual contact sheets of browser captures, generated through HTML.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const dir=path.resolve(process.argv[2]),kind=process.argv[3]||'diagram';
const ids=require('./data/thermal-catalog.json').map(t=>t.id).sort();
const first=Number(process.env.THERMAL_SHEET_FIRST||1),last=Number(process.env.THERMAL_SHEET_LAST||35);
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'thermal-review-'));
const chrome=spawn('/opt/google/chrome/chrome',['--headless','--no-sandbox','--disable-gpu','--remote-debugging-port=9338',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
 let pages;for(let i=0;i<50;i++){try{pages=await(await fetch('http://127.0.0.1:9338/json/list')).json();break}catch{await pause(100)}}
 const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl),pending=new Map();let serial=0;
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const[yes,no]=pending.get(m.id);pending.delete(m.id);m.error?no(Error(JSON.stringify(m.error))):yes(m.result)}};
 await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no});
 const call=(method,params={})=>new Promise((yes,no)=>{let id=++serial;pending.set(id,[yes,no]);ws.send(JSON.stringify({id,method,params}))});
 await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1360,height:2360,deviceScaleFactor:1,mobile:false});
 for(let i=(first-1)*4;i<Math.min(ids.length,last*4);i+=4){
  const batch=ids.slice(i,i+4),num=String(i/4+1).padStart(2,'0');
  const imageTag=(id,k)=>{const file=path.join(dir,`${id}-${k}.png`);if(!fs.existsSync(file))throw Error('Missing '+file);return`<img src="data:image/png;base64,${fs.readFileSync(file).toString('base64')}">`};
  const html='<!doctype html><meta charset="utf-8"><style>body{margin:0;font:24px Arial;background:#ddd}.grid{display:grid;grid-template-columns:680px 680px}article{background:white;height:1180px;box-sizing:border-box;border:1px solid #888;padding:10px}h2{margin:0 0 5px;height:32px}img{width:658px;height:1115px;object-fit:contain;object-position:top}.pair{display:flex}.pair img{width:329px}</style><div class="grid">'+batch.map(id=>`<article><h2>${id} · ${kind==='page-pair'?'1280 / 390 px':kind}</h2>${kind==='page-pair'?`<div class="pair">${imageTag(id,'desktop')}${imageTag(id,'mobile')}</div>`:imageTag(id,kind)}</article>`).join('')+'</div>';
  const frame=(await call('Page.getFrameTree')).frameTree.frame.id;
  await call('Page.setDocumentContent',{frameId:frame,html});
  await call('Runtime.evaluate',{expression:'Promise.all(Array.from(document.images,i=>i.decode()))',awaitPromise:true});
  const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  fs.writeFileSync(path.join(dir,`review-${kind}-${num}.png`),Buffer.from(shot.data,'base64'));
  console.log(num,batch.join(','));
 }
 await call('Browser.close');ws.close();
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{chrome.kill();await pause(1500);await fs.promises.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200}).catch(error=>console.warn('Temporary profile retained:',profile,error.code))});
