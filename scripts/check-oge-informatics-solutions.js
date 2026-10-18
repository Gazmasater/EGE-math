// Browser verification of newly prepared informatics, using Chrome CDP.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {solutionFile}=require('../lib/solution-files');
const {readOgeCatalog}=require('./lib/oge-catalog');
const batches=require('./data/oge-informatics-solutions');
const origin=process.env.OGE_INF_ORIGIN||'http://127.0.0.1:8888';
const concurrency=Number(process.env.OGE_BROWSER_TABS||1);
assert.ok(Number.isInteger(concurrency)&&concurrency>=1&&concurrency<=2,'OGE_BROWSER_TABS must be 1 or 2');
const out=path.resolve(process.env.OGE_INF_ARTIFACTS||path.join(os.tmpdir(),'oge-informatics-pages'));
fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'oge-informatics-browser-'));
const chrome=spawn(process.env.CHROME_BIN||'/opt/google/chrome/chrome',['--headless','--no-sandbox','--disable-gpu','--disable-extensions','--disable-background-networking','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-component-update','--disable-sync','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
const closed=new Promise(resolve=>chrome.once('exit',resolve));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={origin,checkedAt:new Date().toISOString(),pages:[],apis:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');

async function run(){
  let port;
  for(let n=0;n<100;n++){
    try{port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);if(Number.isInteger(port)&&port>0&&port<65536)break;}catch{}await delay(100);
  }
  assert.ok(port,'Chrome did not start');
  const selected=process.env.OGE_INF_TASK_IDS?new Set(process.env.OGE_INF_TASK_IDS.split(',')):null;
  const batchNames=process.env.OGE_INF_BATCH?new Set(process.env.OGE_INF_BATCH.split(',')):null;
  const active=batches.filter(b=>!batchNames||batchNames.has(b.name));
  const tasks=readOgeCatalog(undefined,'oge-informatics').tasks.flatMap(t=>{
    if(selected&&!selected.has(t.id))return [];
    const expected=active.flatMap(b=>b.records).find(r=>r.id===t.id);return expected?[{...t,expected}]:[];
  }).sort((a,b)=>a.id.localeCompare(b.id));
  assert.ok(tasks.length,'No tasks selected');
  if(selected)assert.deepEqual(tasks.map(t=>t.id).sort(),[...selected].sort(),'Unknown task ID or task outside selected batches');
  const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const targets=[pages.find(p=>p.type==='page')];
  for(let n=1;n<Math.min(concurrency,tasks.length);n++){
    const response=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});
    assert.ok(response.ok,'Could not create browser tab');targets.push(await response.json());
  }
  let nextTask=0,completed=0,firstError,captureQueue=Promise.resolve();
  async function worker(target){
  const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let nextId=0;
  try{
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const [yes,no]=pending.get(m.id);pending.delete(m.id);m.error?no(new Error(JSON.stringify(m.error))):yes(m.result);}};
  await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
  const call=(method,params={})=>new Promise((yes,no)=>{
    const id=++nextId,timer=setTimeout(()=>{pending.delete(id);no(new Error('CDP timeout: '+method+(params.expression?' '+params.expression.slice(0,140):'')));},60000);
    pending.set(id,[r=>{clearTimeout(timer);yes(r);},e=>{clearTimeout(timer);no(e);}]);ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const screenshot=params=>{
    const capture=captureQueue.then(async()=>{await call('Page.bringToFront');return call('Page.captureScreenshot',{optimizeForSpeed:false,...params});});
    captureQueue=capture.catch(()=>{});
    return capture;
  };
  await call('Page.enable');await call('Network.enable');
  await call('Network.setBlockedURLs',{urls:['*mc.yandex*','*yandex.ru/ads/*','*yandex.ru/ads*','*an.yandex*','*yastatic.net/*','*adfox*','*doubleclick*','*challenges.cloudflare*']});
  while(nextTask<tasks.length&&!firstError){
    const task=tasks[nextTask++];
    const expected=task.expected;
    const expectedPrograms=[...expected.solution.matchAll(/^```(?:python|kumir)\n([\s\S]*?)\n```[ \t]*(?:\n|$)/gm)].map(m=>m[1]);
    // Screenshots can outlast the server's keep-alive timeout between API reads.
    const response=await fetch(`${origin}/api/solutions/${task.id}`,{headers:{connection:'close'}});assert.equal(response.status,200,task.id);
    const api=await response.json();
    assert.equal(api.answer,expected.answer,`${task.id}: API answer`);assert.equal(api.solution,expected.solution,`${task.id}: API solution`);
    assert.equal(api.diagramSvg,expected.diagram_svg,`${task.id}: API diagram`);
    const attachment=solutionFile(task.id);
    if(attachment){
      const download=await fetch(origin+attachment.url,{headers:{connection:'close'}});assert.equal(download.status,200,task.id+': file download');
      assert.equal(download.headers.get('content-type'),attachment.contentType,task.id+': file media type');
      assert.equal(download.headers.get('content-disposition'),`attachment; filename="${attachment.name}"`,task.id+': file name');
      const data=Buffer.from(await download.arrayBuffer());
      assert.equal(data.length,attachment.bytes,task.id+': downloaded file size');
      assert.equal(createHash('sha256').update(data).digest('hex'),attachment.sha256,task.id+': downloaded file contents');
      (report.downloads ||= []).push({id:task.id,bytes:data.length,sha256:attachment.sha256});
    }
    report.apis.push(task.id);
    for(const [name,width,height] of [['desktop',1280,960],['mobile',390,844]]){
      const startedAt=Date.now();
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      const url=`${origin}/tasks/${task.id}`;await call('Page.navigate',{url});
      let ready=false;
      for(let n=0;n<600;n++){
        ready=await evaluate(`location.href.split('#')[0]===${JSON.stringify(url)}&&document.readyState==='complete'`);
        if(ready)break;await delay(100);
      }
      assert.ok(ready,`${task.id}: load timeout`);
      await evaluate('document.fonts.ready.then(()=>true)');
      await evaluate(`(async()=>{for(const img of document.querySelectorAll('img[loading=lazy]'))img.loading='eager';await Promise.race([Promise.all(Array.from(document.images,i=>i.decode().catch(()=>false))),new Promise(r=>setTimeout(r,30000))]);scrollTo(0,0);return true;})()`);
      const info=await evaluate(`(()=>{const box=document.querySelector('.seo-task-solution'),formatted=box?.querySelector('.formatted-solution');return {
        title:document.title,headings:document.querySelectorAll('h1').length,scrollWidth:document.documentElement.scrollWidth,width:innerWidth,height:document.documentElement.scrollHeight,
        solutionTop:box?box.getBoundingClientRect().top+scrollY:0,solutionHeight:box?.getBoundingClientRect().height||0,
        solutionHtml:formatted?.innerHTML||'',text:box?.innerText||'',fractions:box?.querySelectorAll('.math-fraction').length||0,
        downloads:Array.from(box?.querySelectorAll('a[download]')||[],a=>({url:a.getAttribute('href'),name:a.getAttribute('download')})),
        programs:Array.from(box?.querySelectorAll('.solution-code')||[],p=>{const range=p.scrollWidth-p.clientWidth;p.scrollLeft=p.scrollWidth;const atEnd=p.scrollLeft;p.scrollLeft=0;return {text:p.textContent,tabIndex:p.tabIndex,space:getComputedStyle(p).whiteSpace,scroll:getComputedStyle(p).overflowX,range,atEnd,left:p.getBoundingClientRect().left,right:p.getBoundingClientRect().right};}),
        broken:Array.from(document.images).filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),
        contentOverflow:Array.from(document.querySelectorAll('.qblock > form, .qblock .cell_0, .qblock .cell_0 p, .qblock input[type="text"], .formatted-solution p')).filter(e=>{
          const r=e.getBoundingClientRect();
          if(r.width<=0)return false;
          // Native table scrolling is checked separately through its full range.
          // Text overflowing its own paragraph remains an error in every case.
          if(e.scrollWidth>e.clientWidth+2)return true;
          const host=e.closest('table.fipi-table-scrollable');
          if(host&&host.scrollWidth>host.clientWidth+2&&getComputedStyle(host).overflowX==='auto')return false;
          return r.right>innerWidth+1||r.left<0;
        }).map(e=>e.tagName+'.'+e.className),
        optionOverlaps:Array.from(document.querySelectorAll('.distractors-table > tbody > tr')).flatMap((row,i)=>{
          const cells=Array.from(row.children).filter(c=>c.textContent.trim()),bad=[];
          for(let j=1;j<cells.length;j++){
            const range=document.createRange();range.selectNodeContents(cells[j-1]);
            if(range.getBoundingClientRect().right>cells[j].getBoundingClientRect().left+1)bad.push('row '+i+' columns');
          }
          const next=row.nextElementSibling;
          if(next)for(const m of row.querySelectorAll('math'))if(m.getBoundingClientRect().bottom>next.getBoundingClientRect().top+1)bad.push('row '+i+' fraction');
          return bad;
        }),
        visible:!!box&&box.getBoundingClientRect().height>0&&getComputedStyle(box).visibility!=='hidden'
      };})()`);
      const loadedAt=Date.now();
      // Retain the failing viewport too; it is needed to diagnose source layout.
      const shot=await screenshot({format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:info.height,scale:1}});
      fs.writeFileSync(path.join(out,`${task.id}-${name}.png`),Buffer.from(shot.data,'base64'));
      const clean=s=>s.replace(/\r/g,'').trim();
      // Compare DOM serializations: HTML parsing turns &quot; in text nodes into quotes.
      const apiDomHtml=await evaluate(`(()=>{const t=document.createElement('template');t.innerHTML=${JSON.stringify(api.solutionHtml)};return t.innerHTML;})()`);
      assert.equal(clean(info.solutionHtml),clean(apiDomHtml),`${task.id}: page differs from API`);
      assert.deepEqual(info.downloads,attachment?[{url:attachment.url,name:attachment.name}]:[],task.id+': visible download link');
      assert.ok(info.visible&&info.headings===1,`${task.id}: missing visible solution`);
      assert.ok(info.title.includes(task.sourceId)&&info.title.includes('информатике'),`${task.id}: title must use the original FIPI number`);
      assert.ok(info.scrollWidth<=width+1,`${task.id} ${name}: horizontal overflow`);
      assert.deepEqual(info.contentOverflow,[],`${task.id} ${name}: clipped condition or solution`);
      assert.deepEqual(info.optionOverlaps,[],`${task.id} ${name}: overlapping answer options`);
      assert.deepEqual(info.broken,[],`${task.id}: broken source images`);
      assert.deepEqual(info.programs.map(p=>p.text),expectedPrograms,`${task.id}: program characters or indentation changed`);
      for(const p of info.programs)assert.ok(p.tabIndex===0&&p.space==='pre'&&p.scroll==='auto'&&p.left>=0&&p.right<=width+1,`${task.id}: program must fit and support keyboard scrolling`);
      for(const p of info.programs)assert.ok(p.atEnd>=p.range-1,`${task.id}: complete program must be accessible by scrolling`);
      assert.ok(!/[⟦⟧¦/]|\^(?:\d|\()/.test(info.text),`${task.id}: math formatting`);
      // A literal caret is a code symbol in informatics, not an exponent.
      assert.equal((info.text.match(/\^/g)||[]).length,(expected.answer+expected.solution+expected.diagram_caption).split('^').length-1,`${task.id}: code symbols must survive formatting`);
      assert.equal(info.fractions,(expected.answer+expected.solution+expected.diagram_caption).split('⟦').length-1,`${task.id}: missing vertical fractions`);
      report.pages.push({id:task.id,viewport:name,width,height:info.height,solutionTop:info.solutionTop,solutionHeight:info.solutionHeight,fractions:info.fractions,textLength:info.text.length,loadMs:loadedAt-startedAt,screenshotMs:Date.now()-loadedAt});save();
      const tableCount=await evaluate(`document.querySelectorAll('table.fipi-table-scrollable').length`);
      for(let index=0;index<tableCount;index++){
        const table=await evaluate(`(()=>{
          const t=document.querySelectorAll('table.fipi-table-scrollable')[${index}],r=t.getBoundingClientRect();
          const hint=t.previousElementSibling,range=t.scrollWidth-t.clientWidth;
          t.scrollLeft=t.scrollWidth;
          const last=t.rows[0].cells[t.rows[0].cells.length-1].getBoundingClientRect();
          return {range,atEnd:t.scrollLeft,tabIndex:t.tabIndex,hint:hint?.classList.contains('fipi-table-scroll-hint')&&!hint.hidden,
            contained:r.left>=0&&r.right<=innerWidth+1,lastColumnVisible:last.right<=r.right+1&&last.left>=r.left-1,
            clip:{x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:1}};
        })()`);
        assert.ok(table.range>2&&table.atEnd>=table.range-1&&table.contained&&table.lastColumnVisible&&table.hint&&table.tabIndex===0,`${task.id} ${name}: inaccessible table columns`);
        const tableShot=await screenshot({format:'png',captureBeyondViewport:true,clip:table.clip});
        fs.writeFileSync(path.join(out,`${task.id}-${name}-table-${index+1}-end.png`),Buffer.from(tableShot.data,'base64'));
        await evaluate(`document.querySelectorAll('table.fipi-table-scrollable')[${index}].scrollLeft=0;true`);
        (report.scrollTables ||= []).push({id:task.id,viewport:name,index,range:table.range,lastColumnVisible:true});save();
      }
      await evaluate(`document.querySelector('.solution-button').click();true`);
      let modalReady=false;
      for(let n=0;n<300;n++){
        modalReady=await evaluate(`!!document.querySelector('.solution-modal:not([hidden]) .solution-text')`);
        if(modalReady)break;await delay(100);
      }
      assert.ok(modalReady,task.id+': solution modal');
      const modal=await evaluate(`(()=>{const m=document.querySelector('.solution-modal:not([hidden])');return {html:m.querySelector('.solution-text').innerHTML,overflow:m.scrollWidth>innerWidth+1,programs:Array.from(m.querySelectorAll('.solution-code'),p=>({text:p.textContent,space:getComputedStyle(p).whiteSpace,left:p.getBoundingClientRect().left,right:p.getBoundingClientRect().right}))};})()`);
      assert.equal(clean(modal.html),clean(apiDomHtml),task.id+': modal differs from API');
      assert.ok(!modal.overflow,task.id+': modal overflow');
      assert.deepEqual(modal.programs.map(p=>p.text),expectedPrograms,task.id+': modal program');
      for(const p of modal.programs)assert.ok(p.space==='pre'&&p.left>=0&&p.right<=width+1,task.id+': modal program layout');
      const modalShot=await screenshot({format:'png',captureBeyondViewport:false});
      fs.writeFileSync(path.join(out,`${task.id}-${name}-modal.png`),Buffer.from(modalShot.data,'base64'));
      await evaluate(`document.querySelector('.solution-modal-close').click();true`);
      assert.ok(await evaluate(`document.querySelector('.solution-modal').hidden`),task.id+': modal close');
      (report.modals ||= []).push({id:task.id,viewport:name});save();

    }
    completed++;
    if(completed%10===0)console.log(`Verified ${completed}/${tasks.length} tasks`);
  }
  }catch(error){firstError ||= error;throw error;}finally{ws.close();}
  }
  const results=await Promise.allSettled(targets.map(worker));
  const failed=results.find(result=>result.status==='rejected');
  if(failed)throw firstError||failed.reason;
  assert.equal(completed,tasks.length,'Incomplete browser run');
  console.log(JSON.stringify({tasks:report.apis.length,pages:report.pages.length,errors:report.errors,out}));
}
run().catch(error=>{report.errors.push(error.stack);console.error(error);process.exitCode=1;}).finally(async()=>{
  save();chrome.kill();await closed;await delay(1000);
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});}catch(error){report.cleanupWarning=String(error);save();}
});
