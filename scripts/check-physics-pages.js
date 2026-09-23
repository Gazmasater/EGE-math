// Требуется локальный Chrome/Chromium; HTTP/CDP без сторонних npm-зависимостей.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {readPhysicsCatalog}=require('./lib/physics-catalog');
const {taskMatchesTopic}=require('../lib/physics-topics');
const topicAt=process.argv.indexOf('--topic');
const topic=topicAt<0?'statics':process.argv[topicAt+1];
assert.ok(['statics','kinematics','dynamics','conservation','waves','thermal','electrodynamics','quantum'].includes(topic),'Неизвестный раздел физики');
const {records}=require(`./data/${topic}-solutions`);
const {diagrams}=require(`./data/${topic}-diagrams`);
if(topic==='thermal'){
  records.F717A0=require('./data/waves-solutions').records.F717A0;
  diagrams.F717A0=require('./data/waves-diagrams').diagrams.F717A0;
}
if(topic==='electrodynamics')for(const[id,group]of [['030E68','conservation'],['963FCF','waves']]){
  records[id]=require(`./data/${group}-solutions`).records[id];
  diagrams[id]=require(`./data/${group}-diagrams`).diagrams[id];
}
if(topic==='quantum'){
  records.D6F721=require('./data/thermal-solutions').records.D6F721;
  diagrams.D6F721=require('./data/thermal-diagrams').diagrams.D6F721;
}
const allIds=Object.keys(records).sort();
const topicCode={kinematics:'1.1',statics:'1.3',dynamics:'1.2',conservation:'1.4',waves:'1.5',thermal:'2',electrodynamics:'3',quantum:'4'}[topic];
const catalogIds=[...readPhysicsCatalog().values()].filter(task=>taskMatchesTopic(task,topicCode)).map(task=>task.id).sort();
const solutionsDb=new DatabaseSync(process.env.PHYSICS_DB||path.resolve(__dirname,'../storage/solutions.sqlite'),{readOnly:true});
const publishedIds=new Set(solutionsDb.prepare('SELECT task_id FROM solutions WHERE published=1').all().map(row=>row.task_id));
solutionsDb.close();
const ids=process.env.PHYSICS_TASK_IDS?process.env.PHYSICS_TASK_IDS.split(',').map(s=>s.trim()).sort():allIds;
assert.ok(ids.length&&ids.every(id=>allIds.includes(id)),'Неизвестные ID проверки');
const origin=process.env.PHYSICS_ORIGIN||process.env.STATICS_ORIGIN||'http://127.0.0.1:8765';
const out=path.resolve(process.env.PHYSICS_ARTIFACTS||process.env.STATICS_ARTIFACTS||path.join(os.tmpdir(),`ege-${topic}-audit`));
fs.mkdirSync(out,{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const chrome=process.env.CHROME_BIN||'/opt/google/chrome/chrome';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),`${topic}-browser-`));
const proc=spawn(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--remote-debugging-port=9336',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
const serverFile=process.env.PHYSICS_SERVER||process.env.STATICS_SERVER;
const server=serverFile ? spawn(process.execPath,[serverFile],{env:{...process.env,PORT:new URL(origin).port},stdio:'ignore'}) : null;
async function run() {
  if(server) {
    let ready=false;
    for(let n=0;n<100;n++) {
      try { ready=(await fetch(`${origin}/api/solutions/${ids[0]}`)).ok; } catch {}
      if(ready)break;await delay(100);
    }
    assert.ok(ready,'Сервер предпросмотра не запущен');
  }
  let pages;
  for(let n=0;n<50;n++) {
    try{pages=await (await fetch('http://127.0.0.1:9336/json/list')).json();break;}catch{await delay(100);}
  }
  assert.ok(pages?.length,'Chrome не запущен');
  const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl),pending=new Map();let counter=0;
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const [yes,no]=pending.get(m.id);pending.delete(m.id);m.error?no(new Error(JSON.stringify(m.error))):yes(m.result);}};
  await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
  const call=(method,params={})=>new Promise((yes,no)=>{
    const id=++counter,timer=setTimeout(()=>{pending.delete(id);no(new Error(`CDP timeout: ${method}`));},60000);
    pending.set(id,[r=>{clearTimeout(timer);yes(r);},e=>{clearTimeout(timer);no(e);}]);
    ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;
  };
  await call('Page.enable');await call('Network.enable');
  await call('Network.setBlockedURLs',{urls:['*mc.yandex*','*challenges.cloudflare*']});
  const navigate=async(url,{allImages=true}={})=>{
    await call('Page.navigate',{url});
    for(let n=0;n<120;n++) {
      if(await evaluate(`location.href.split('#')[0]===${JSON.stringify(url)} && document.readyState==='complete'`))break;
      await delay(100);
    }
    await evaluate('document.fonts.ready.then(()=>true)');
    // Hidden catalog pages need no raster decoding. A bounded wait also lets
    // the subsequent brokenImages assertion report failures instead of hanging.
    await evaluate(`Promise.race([Promise.all(Array.from(document.images).filter(i=>${allImages?'true':'i.getClientRects().length>0'}).map(i=>{i.loading='eager';return i.decode().catch(()=>false)})),new Promise(r=>setTimeout(r,10000))])`);
    await delay(150);
  };
  const screenshot=async(file,clip)=>{
    const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,...(clip?{clip}:{})});
    fs.writeFileSync(path.join(out,file),Buffer.from(r.data,'base64'));
  };
  const report={topic,origin,checkedAt:new Date().toISOString(),pages:[],svg:[],errors:[]};
  // Inline SVG проверяется отдельно: bbox подписей и исходные изображения внутри SVG.
  const fixture=`<!doctype html><meta charset="utf-8"><style>body{margin:0;font:18px Arial}article{width:680px;break-inside:avoid}article>svg{width:680px;display:block}h2{margin:10px 24px}</style>`+
    ids.map(id=>`<article id="${id}"><h2>${id}</h2>${diagrams[id]}</article>`).join('');
  const fixturePath=path.join(out,'diagrams.html');fs.writeFileSync(fixturePath,fixture);
  await call('Emulation.setDeviceMetricsOverride',{width:720,height:900,deviceScaleFactor:1,mobile:false});
  const frame=(await call('Page.getFrameTree')).frameTree.frame.id;
  await call('Page.setDocumentContent',{frameId:frame,html:fixture});
  await evaluate('document.fonts.ready.then(()=>true)');
  await delay(300);
  report.svg=await evaluate(`Array.from(document.querySelectorAll('article')).map(a=>{
    const svg=a.querySelector('svg'),vb=svg.viewBox.baseVal;
    const outside=Array.from(svg.querySelectorAll('text')).filter(t=>{const b=t.getBBox();const m=t.getCTM(),sm=svg.getCTM().inverse().multiply(m); const pts=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(sm));return pts.some(p=>p.x<0||p.y<0||p.x>vb.width||p.y>vb.height)}).map(t=>t.textContent);
    const unformatted=Array.from(svg.querySelectorAll('text')).filter(t=>/[⟦⟧¦_]/.test(t.textContent)).map(t=>t.textContent);
    return {id:a.id,outside,unformatted};
  })`);
  for(const item of report.svg)if(item.outside.length)report.errors.push(`${item.id}: подписи за SVG: ${item.outside.join(', ')}`);
  if(['electrodynamics','quantum'].includes(topic))for(const item of report.svg)if(item.unformatted.length)report.errors.push(`${item.id}: неотформатированные подписи SVG: ${item.unformatted.join(', ')}`);
  for(const id of ids) {
    const clip=await evaluate(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return{x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);
    await screenshot(`${id}-diagram.png`,clip);
  }
  for(const [name,width,height] of [['desktop',1280,960],['mobile',390,844]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    for(const id of ids) {
      const response=await fetch(`${origin}/api/solutions/${id}`);assert.equal(response.status,200,`${id}: API`);
      const api=await response.json();assert.equal(api.answer,records[id].answer,`${id}: API answer`);assert.equal(api.solution,records[id].solution,`${id}: API solution`);
      await navigate(`${origin}/tasks/${id}`);
      const info=await evaluate(`(()=>{const solution=document.querySelector('.seo-task-solution');
        const figures=Array.from(document.querySelectorAll('figure img'));return {title:document.title,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,height:document.documentElement.scrollHeight,
        brokenImages:Array.from(document.images).filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.alt),figures:figures.length,
        solutionText:solution?.innerText||'',fractions:solution?.querySelectorAll('.math-fraction').length||0, roots:solution?.querySelectorAll('.math-root').length||0,
        subscripts:Array.from(solution?.querySelectorAll('sub')||[],s=>s.textContent)};})()`);
      if(info.scrollWidth>width+1)report.errors.push(`${id} ${name}: горизонтальный скролл ${info.scrollWidth}>${width}`);
      if(info.brokenImages.length)report.errors.push(`${id} ${name}: не загружены рисунки`);
      if(!info.figures)report.errors.push(`${id} ${name}: отсутствует схема решения`);
      if(info.solutionText.length<600)report.errors.push(`${id} ${name}: отсутствует полный текст решения`);
      if(/[⟦⟧¦/_]/.test(info.solutionText))report.errors.push(`${id} ${name}: неотформатированная формула или индекс`);
      if(records[id].solution.includes('⟦')&&!info.fractions)report.errors.push(`${id} ${name}: нет вертикальных дробей`);
      if(['dynamics','conservation','waves','electrodynamics','quantum'].includes(topic)&&info.roots!==(records[id].answer+records[id].solution+records[id].diagramCaption).split('√').length-1)report.errors.push(`${id} ${name}: область действия корня не отформатирована`);
      const validSubscripts=new Set(['А1','А2','C','D','x','y','А','в','кер','л','пр','д','ж','жидкости','палочки','погр','низ','верх','лев','прав','тр','max','оп','рез','ср','п','тр1','тр2','б','упр','упр1','упр2','min','кр','s','гор','верт','отн']);
      if(topic==='conservation')for(const sub of ['к','τ','θ','Л','тяж','B','i','n','N','z'])validSubscripts.add(sub);
      if(['waves','thermal'].includes(topic))validSubscripts.add('внеш');
      if(topic==='electrodynamics')for(const sub of ['мин','макс','и','рез','Л','внеш','до','после','кон','нач','кат','R','L','r','кз','V','A','B','р','D','си','кип','посл','один','Б','z','n','j','l','э','к','τ','T','α','н','KM','KLM','KNM','AE','CD','NM','KL','KN','LM','S','k','ф'])validSubscripts.add(sub);
      if(topic==='quantum')for(const sub of ['эл','Л','ат','ф','св','пл','зерк','з','кр','нас','гр','кон','нач','He','пр','кас','анод','катод','n','z','Л','Б','внеш','пучка','сум','сум0'])validSubscripts.add(sub);
      for(const sub of new Set(info.subscripts))if(!validSubscripts.has(sub))report.errors.push(`${id} ${name}: некорректная граница индекса ${sub}`);
      delete info.solutionText;
      delete info.subscripts;
      report.pages.push({id,viewport:name,...info});
      fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
      await screenshot(`${id}-${name}.png`,{x:0,y:0,width,height:info.height,scale:1});
    }
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(`${name}: проверены ${ids.length} страниц и API`);
  }
  await navigate(`${origin}/physics?topic=${topicCode}`,{allImages:false});
  // Проверяем все отобранные сервером задачи, включая скрытые текущей страницей пагинации.
  report.catalog=await evaluate(`Array.from(document.querySelectorAll('.qblock')).filter(q=>q.querySelector('.solution-controls')).map(q=>({id:q.id.slice(1).toUpperCase(),published:!!q.querySelector('.solution-published-badge')})).sort((a,b)=>a.id.localeCompare(b.id))`);
  if(JSON.stringify(report.catalog.map(t=>t.id))!==JSON.stringify(catalogIds))report.errors.push('Каталог: набор выбранных задач расходится с проверенной темой');
  for(const item of report.catalog)if(item.published!==publishedIds.has(item.id))report.errors.push(`${item.id}: неверная отметка публикации в каталоге`);
  await screenshot('catalog-mobile.png');
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  ws.close();console.log(JSON.stringify({pages:report.pages.length,diagrams:report.svg.length,errors:report.errors,artifacts:out}));
  assert.deepEqual(report.errors,[],'Проверка страниц и схем');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  const stopped=proc.exitCode!==null?Promise.resolve():new Promise(resolve=>proc.once('exit',resolve));
  proc.kill();server?.kill();await Promise.race([stopped,delay(3000)]);
  await delay(1000);
  await fs.promises.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200}).catch(error=>console.warn('Temporary browser profile retained:',profile,error.code));
});
