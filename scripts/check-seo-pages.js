// Требуется локальный Chrome/Chromium; HTTP/CDP без сторонних npm-зависимостей.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {readPhysicsCatalog}=require('./lib/physics-catalog');
const {taskMatchesTopic,physicsClassification,taskPhysicsTopic}=require('../lib/physics-topics');
const origin=process.env.SEO_ORIGIN||'http://127.0.0.1:8765';
const out=path.resolve(process.env.SEO_ARTIFACTS||path.join(os.tmpdir(),'ege-seo-browser'));
fs.mkdirSync(out,{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const chrome=process.env.CHROME_BIN||'/opt/google/chrome/chrome';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'seo-browser-'));
const proc=spawn(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--remote-debugging-port=9336',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
const serverFile=process.env.SEO_SERVER;
const server=serverFile ? spawn(process.execPath,[serverFile],{env:{...process.env,PORT:new URL(origin).port},stdio:'ignore'}) : null;
async function run() {
  const physics=readPhysicsCatalog();
  const db=new DatabaseSync(path.resolve(__dirname,'../storage/solutions.sqlite'),{readOnly:true});
  const published=new Set(db.prepare('SELECT task_id FROM solutions WHERE published=1').all().map(row=>row.task_id));db.close();
  if(server) {
    let ready=false;
    for(let n=0;n<100;n++) {
      try { ready=(await fetch(`${origin}/robots.txt`)).ok; } catch {}
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
    const id=++counter,timer=setTimeout(()=>{pending.delete(id);no(new Error(`CDP timeout: ${method}`));},30000);
    pending.set(id,[r=>{clearTimeout(timer);yes(r);},e=>{clearTimeout(timer);no(e);}]);
    ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;
  };
  await call('Page.enable');await call('Network.enable');
  await call('Network.setBlockedURLs',{urls:['*mc.yandex*','*challenges.cloudflare*']});
  const navigate=async url=>{
    await call('Page.navigate',{url});
    for(let n=0;n<120;n++) {
      if(await evaluate(`location.href.split('#')[0]===${JSON.stringify(url)} && document.readyState==='complete'`))break;
      await delay(100);
    }
    await evaluate('document.fonts.ready.then(()=>true)');
    await evaluate(`Promise.all(Array.from(document.images,i=>{i.loading='eager';return i.decode().catch(()=>false)}))`);
    await delay(150);
  };
  const screenshot=async(file,clip)=>{
    const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,...(clip?{clip}:{})});
    fs.writeFileSync(path.join(out,file),Buffer.from(r.data,'base64'));
  };
  const report={origin,checkedAt:new Date().toISOString(),pages:[],noJavaScript:[],errors:[]};
  const paths=process.env.SEO_PATHS?process.env.SEO_PATHS.split(','):['/math','/','/planimetry','/parameters','/equations','/inequalities','/optimal','/numbers','/finance',
    '/physics?topic=1.1','/physics?topic=1.3','/physics?topic=4.3','/tasks/083006','/tasks/36135B','/tasks/002D3A','/tasks/92FD74','/tasks/F4D70D'];
  for(const [name,width,height] of [['desktop',1280,960],['mobile',390,844]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    for(const url of paths) {
      await navigate(origin+url);
      const info=await evaluate(`(()=>{const solution=document.querySelector('.seo-task-solution');return {
        title:document.title,scrollWidth:document.documentElement.scrollWidth,width:innerWidth,height:document.documentElement.scrollHeight,
        headings:document.querySelectorAll('h1').length,breadcrumbs:!!document.querySelector('.seo-breadcrumbs'),
        broken:Array.from(document.images).filter(i=>!i.complete||!i.naturalWidth).map(i=>i.alt),
        tasks:document.querySelectorAll('.qblock').length,controls:document.querySelectorAll('.solution-controls').length,
        hiddenByLoading:document.documentElement.classList.contains('page-loading'),solution:solution?.innerText.length||0
      };})()`);
      if(info.scrollWidth>width+1)report.errors.push(`${url} ${name}: горизонтальный скролл`);
      if(info.broken.length)report.errors.push(`${url} ${name}: не загружены изображения`);
      if(info.headings!==1||!info.breadcrumbs||info.hiddenByLoading)report.errors.push(`${url} ${name}: заголовок, крошки или загрузка`);
      if(info.tasks!==info.controls)report.errors.push(`${url} ${name}: задачи и кнопки решения расходятся`);
      const taskId=url.match(/^\/tasks\/([A-Z0-9]+)$/)?.[1];
      if(taskId&&published.has(taskId)&&info.solution<500)report.errors.push(`${url}: не видно полного решения`);
      if(taskId&&!published.has(taskId)&&info.solution)report.errors.push(`${url}: показано неопубликованное решение`);
      if(taskId&&physics.has(taskId)) {
        const classification=physicsClassification(physics.get(taskId)),primary=taskPhysicsTopic(physics.get(taskId));
        if(!info.title.includes(`${primary?.name||'Физика'}:`))report.errors.push(`${url}: неверная основная тема после JavaScript`);
        if(classification.reviewStatus==='reviewed') {
          const links=await evaluate(`Array.from(document.querySelectorAll('.physics-task-topics a'),a=>new URL(a.href).searchParams.get('topic'))`);
          if(JSON.stringify(links)!==JSON.stringify(classification.topicCodes))report.errors.push(`${url}: неверные тематические ссылки`);
        }
      }
      report.pages.push({url,viewport:name,...info});
      const file=url==='/'?'home':url.slice(1).replace(/[^A-Za-z0-9]/g,'-');
      await screenshot(`${file}-${name}.png`,{x:0,y:0,width,height:info.height,scale:1});
      if(url==='/physics?topic=1.1') {
        await evaluate("document.querySelector('.solution-button').click()");
        for(let n=0;n<50;n++){if(await evaluate("!document.querySelector('.solution-modal').hidden"))break;await delay(100);}
        const modal=await evaluate(`(()=>{const m=document.querySelector('.solution-modal');return {open:!m.hidden,length:m.innerText.length,fractions:m.querySelectorAll('.math-fraction').length};})()`);
        if(!modal.open||modal.length<500||!modal.fractions)report.errors.push(`${url} ${name}: окно решения`);
        await screenshot(`kinematics-modal-${name}.png`);
        await evaluate("document.querySelector('.solution-modal-close').click()");
      }
    }
    console.log(`${name}: ${paths.length} страниц, окно решения`);
  }
  await call('Emulation.setScriptExecutionDisabled',{value:true});
  const kinematicsCount=[...readPhysicsCatalog().values()].filter(task=>taskMatchesTopic(task,'1.1')).length;
  for(const [url,count] of [['/physics?topic=1.1',kinematicsCount],['/numbers',51],['/tasks/083006',1]]) {
    await navigate(origin+url);
    const info=await evaluate(`(()=>{const tasks=Array.from(document.querySelectorAll('.qblock'));const solution=document.querySelector('.seo-task-solution');return{
      tasks:tasks.length,visible:tasks.filter(t=>t.getBoundingClientRect().height>0&&getComputedStyle(t).visibility!=='hidden').length,
      links:document.querySelectorAll('.task-permalink').length,solution:solution?.innerText.length||0};})()`);
    if(info.tasks!==count||info.visible!==count||info.links!==count)report.errors.push(`${url}: задачи или ссылки скрыты без JavaScript`);
    if(url.startsWith('/tasks/')&&info.solution<500)report.errors.push(`${url}: решение скрыто без JavaScript`);
    report.noJavaScript.push({url,...info});
  }
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
  ws.close();console.log(JSON.stringify({pages:report.pages.length,noJavaScript:report.noJavaScript.length,errors:report.errors,artifacts:out}));
  assert.deepEqual(report.errors,[],'SEO: браузерная проверка');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{proc.kill();server?.kill();await delay(500);fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
