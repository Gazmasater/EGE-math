// Browser verification of newly prepared mathematics, using Chrome CDP.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const {readMathematicsCatalog}=require('./lib/mathematics-catalog');
const batches=require('./data/math-completion-batches');
const origin=process.env.MATH_ORIGIN||'http://127.0.0.1:8878';
const out=path.resolve(process.env.MATH_ARTIFACTS||path.join(os.tmpdir(),'ege-math-pages'));
fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ege-math-browser-'));
const chrome=spawn(process.env.CHROME_BIN||'/opt/google/chrome/chrome',['--headless','--no-sandbox','--disable-gpu','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
const closed=new Promise(resolve=>chrome.once('exit',resolve));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={origin,checkedAt:new Date().toISOString(),pages:[],apis:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');

async function run(){
  let port;
  for(let n=0;n<100;n++){
    try{port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break;}catch{await delay(100);}
  }
  assert.ok(port,'Chrome did not start');
  const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl),pending=new Map();let nextId=0;
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const [yes,no]=pending.get(m.id);pending.delete(m.id);m.error?no(new Error(JSON.stringify(m.error))):yes(m.result);}};
  await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
  const call=(method,params={})=>new Promise((yes,no)=>{
    const id=++nextId,timer=setTimeout(()=>{pending.delete(id);no(new Error('CDP timeout: '+method));},30000);
    pending.set(id,[r=>{clearTimeout(timer);yes(r);},e=>{clearTimeout(timer);no(e);}]);ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await call('Page.enable');await call('Network.enable');
  await call('Network.setBlockedURLs',{urls:['*mc.yandex*','*challenges.cloudflare*']});
  const selected=process.env.MATH_TASK_IDS?new Set(process.env.MATH_TASK_IDS.split(',')):null;
  const active=batches.filter(b=>!process.env.MATH_BATCH||b.name===process.env.MATH_BATCH);
  const tasks=[...readMathematicsCatalog().values()].flatMap(t=>{
    if(selected&&!selected.has(t.id))return [];
    const expected=active.map(b=>b.solve(t)).find(Boolean);return expected?[{...t,expected}]:[];
  }).sort((a,b)=>a.id.localeCompare(b.id));
  assert.ok(tasks.length,'No tasks selected');
  for(const task of tasks){
    const expected=task.expected;
    const response=await fetch(`${origin}/api/solutions/${task.id}`);assert.equal(response.status,200,task.id);
    const api=await response.json();
    assert.equal(api.answer,expected.answer,`${task.id}: API answer`);assert.equal(api.solution,expected.solution,`${task.id}: API solution`);
    assert.equal(api.diagramSvg,expected.diagram_svg,`${task.id}: API diagram`);
    report.apis.push(task.id);
    for(const [name,width,height] of [['desktop',1280,960],['mobile',390,844]]){
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      const url=`${origin}/tasks/${task.id}`;await call('Page.navigate',{url});
      let ready=false;
      for(let n=0;n<150;n++){
        ready=await evaluate(`location.href.split('#')[0]===${JSON.stringify(url)}&&document.readyState==='complete'`);
        if(ready)break;await delay(100);
      }
      assert.ok(ready,`${task.id}: load timeout`);
      await evaluate('document.fonts.ready.then(()=>true)');
      await evaluate(`Promise.race([Promise.all(Array.from(document.images,i=>i.decode().catch(()=>false))),new Promise(r=>setTimeout(r,8000))])`);
      const info=await evaluate(`(()=>{const box=document.querySelector('.seo-task-solution'),formatted=box?.querySelector('.formatted-solution');return {
        title:document.title,headings:document.querySelectorAll('h1').length,scrollWidth:document.documentElement.scrollWidth,width:innerWidth,height:document.documentElement.scrollHeight,
        solutionHtml:formatted?.innerHTML||'',text:box?.innerText||'',fractions:box?.querySelectorAll('.math-fraction').length||0,
        broken:Array.from(document.images).filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),
        contentOverflow:Array.from(document.querySelectorAll('.qblock > form, .qblock .cell_0, .qblock .cell_0 p, .qblock input[type="text"], .formatted-solution p')).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<0||e.scrollWidth>e.clientWidth+2);}).map(e=>e.tagName+'.'+e.className),
        visible:!!box&&box.getBoundingClientRect().height>0&&getComputedStyle(box).visibility!=='hidden'
      };})()`);
      const clean=s=>s.replace(/\r/g,'').trim();
      assert.equal(clean(info.solutionHtml),clean(api.solutionHtml),`${task.id}: page differs from API`);
      assert.ok(info.visible&&info.headings===1&&info.title.includes(task.id),`${task.id}: missing visible solution`);
      assert.ok(info.scrollWidth<=width+1,`${task.id} ${name}: horizontal overflow`);
      assert.deepEqual(info.contentOverflow,[],`${task.id} ${name}: clipped condition or solution`);
      assert.deepEqual(info.broken,[],`${task.id}: broken source images`);
      assert.ok(!/[⟦⟧¦/^]/.test(info.text),`${task.id}: math formatting`);
      assert.equal(info.fractions,(expected.answer+expected.solution).split('⟦').length-1,`${task.id}: missing vertical fractions`);
      const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.min(info.height,6000),scale:1}});
      fs.writeFileSync(path.join(out,`${task.id}-${name}.png`),Buffer.from(shot.data,'base64'));
      report.pages.push({id:task.id,viewport:name,width,height:info.height,fractions:info.fractions,textLength:info.text.length});save();
    }
    if(report.apis.length%10===0)console.log(`Verified ${report.apis.length}/${tasks.length} tasks`);
  }
  ws.close();console.log(JSON.stringify({tasks:report.apis.length,pages:report.pages.length,errors:report.errors,out}));
}
run().catch(error=>{report.errors.push(error.stack);console.error(error);process.exitCode=1;}).finally(async()=>{
  save();chrome.kill();await closed;await delay(1000);
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});}catch(error){report.cleanupWarning=String(error);save();}
});
