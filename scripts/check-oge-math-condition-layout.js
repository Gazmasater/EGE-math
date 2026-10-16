// Render every OGE math condition with live page styles and detect overlapping content.
// LAYOUT_IDS + LAYOUT_SCREENSHOTS additionally check actual task URLs.
const fs=require('fs'),os=require('os'),path=require('path'),{spawn}=require('child_process');
const {expandMathmlFences}=require('../lib/mathml-fences');
const {decodeEntities}=require('../lib/seo-text');
const base=path.resolve(process.env.LAYOUT_ARTIFACTS||path.join(os.tmpdir(),'oge-condition-layout'));fs.mkdirSync(base,{recursive:true});
const origin=process.env.LAYOUT_ORIGIN||'http://127.0.0.1:8879';
const tasks=require('./lib/oge-catalog').readOgeCatalog().tasks;
const selected=process.env.LAYOUT_IDS?.split(',');
const active=selected?tasks.filter(t=>selected.includes(t.id)):tasks;
if(!active.length || selected?.some(id=>!active.some(t=>t.id===id)))throw Error('Unknown or empty selection of OGE tasks');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'oge-layout-'));
const chrome=spawn('/opt/google/chrome/chrome',['--headless','--no-sandbox','--disable-gpu','--disable-extensions','--disable-background-networking','--disable-sync','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
const closed=new Promise(r=>chrome.once('exit',r));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const report={origin,checkedAt:new Date().toISOString(),checked:0,fencesChecked:0,findings:[],scrollableTables:[],errors:[]};
const out=process.env.LAYOUT_REPORT||base+'/report.json';
let ws;
async function run(){
 let port;for(let n=0;n<100;n++){try{port=fs.readFileSync(profile+'/DevToolsActivePort','utf8').split('\n')[0];break;}catch{}await delay(100);}
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 const pending=new Map();let counter=0;ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p[1](Error(JSON.stringify(m.error))):p[0](m.result);}};
 const call=(method,params={})=>new Promise((r,j)=>{const id=++counter,timer=setTimeout(()=>j(Error('Timeout '+method)),45000);pending.set(id,[v=>{clearTimeout(timer);r(v);},v=>{clearTimeout(timer);j(v);}]);ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const checkFences=async batch=>{
  const expected=batch.map(t=>({id:t.id,fences:[...t.fragment.matchAll(/<(?:m:)?mfenced\b([^>]*)>/gi)].map(m=>{
   const attr=name=>{const v=m[1].match(new RegExp('\\b'+name+'\\s*=\\s*(["\x27])(.*?)\\1','i'));return v?decodeEntities(v[2]).trim():name==='open'?'(':')';};
   return {open:attr('open'),close:attr('close')};
  })}));
  const count=await evaluate(`(()=>{let count=0;for(const t of ${JSON.stringify(expected)}){
   const q=document.getElementById('q'+t.id);if(!q)throw Error(t.id+': missing condition');
   if(q.querySelector('mfenced'))throw Error(t.id+': legacy mfenced is not expanded');
   const nodes=Array.from(q.querySelectorAll('[data-legacy-mfenced]'));
   if(nodes.length!==t.fences.length)throw Error(t.id+': fence count');
   nodes.forEach((node,i)=>{for(const [name,form] of [['open','prefix'],['close','postfix']]){
    const fence=Array.from(node.children).find(c=>c.localName==='mo'&&c.getAttribute('form')===form);
    if((fence?.textContent||'')!==t.fences[i][name])throw Error(t.id+': altered '+name+' fence');
    if(fence){const r=fence.getBoundingClientRect();if(r.width<=0||r.height<=0)throw Error(t.id+': invisible fence');}
   }});count+=nodes.length;
  }return count;})()`);report.fencesChecked+=count;
 };
 await call('Page.enable');await call('Network.enable');await call('Network.setBlockedURLs',{urls:['*mc.yandex*','*challenges.cloudflare*','*yandex.ru/ads*','*an.yandex*']});
 await call('Page.navigate',{url:origin+'/tasks/6EFCFF'});
 let loaded=false;
 for(let n=0;n<200;n++){loaded=await evaluate('location.pathname==="/tasks/6EFCFF"&&document.readyState==="complete"&&!!document.querySelector(".qblock")');if(loaded)break;await delay(100);}
 if(!loaded)throw Error('Initial page did not load');
 await evaluate('document.fonts.ready');
 const measure=()=>{
  const results=[],scrollableTables=[];
  for(const q of document.querySelectorAll('.qblock')){
   const hits=[],overflow=[],rects=[];
   for(const cell of q.querySelectorAll('.cell_0,.varinats-block')){
    const walker=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT);
    let n;while(n=walker.nextNode()){
     if(!n.textContent.trim()||n.parentElement.closest('script,style,math,select,textarea,button,sub,sup'))continue;
     const range=document.createRange();range.selectNodeContents(n);
     for(const r of range.getClientRects())if(r.width>2&&r.height>2)rects.push({x:r.x,y:r.y,right:r.right,bottom:r.bottom,text:n.textContent.trim().slice(0,90),kind:'text'});
    }
    for(const el of cell.querySelectorAll('math,img')){
     const r=el.getBoundingClientRect();if(r.width>2&&r.height>2)rects.push({x:r.x,y:r.y,right:r.right,bottom:r.bottom,text:el.tagName==='IMG'?el.getAttribute('src'):el.textContent,kind:el.tagName});
    }
    for(const el of cell.querySelectorAll('p,td,table,img')){
     const r=el.getBoundingClientRect();if(r.width>0&&(r.right>innerWidth-8||r.x<0)){
      // A wide data table may scroll inside a viewport that itself fits the page.
      let scroller=null;
      for(let parent=el.parentElement;parent&&parent!==cell;parent=parent.parentElement){
       const box=parent.getBoundingClientRect();
       if(['auto','scroll'].includes(getComputedStyle(parent).overflowX)&&parent.scrollWidth>parent.clientWidth&&box.left>=0&&box.right<=innerWidth-8){scroller=parent;break;}
      }
      if(scroller){
       const old=scroller.scrollLeft;scroller.scrollLeft=scroller.scrollWidth;
       const reachable=scroller.scrollLeft>=scroller.scrollWidth-scroller.clientWidth-1;
       scroller.scrollLeft=old;
       if(reachable){if(!scrollableTables.some(s=>s.id===q.id.slice(1)))scrollableTables.push({id:q.id.slice(1),clientWidth:scroller.clientWidth,scrollWidth:scroller.scrollWidth});continue;}
      }
      overflow.push({tag:el.tagName,text:el.textContent.slice(0,70),left:r.x,right:r.right});
     }
    }
   }
   for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
    const a=rects[i],b=rects[j],x=Math.min(a.right,b.right)-Math.max(a.x,b.x),y=Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y);
    if(x>3.5&&y>3.5)hits.push({a:a.text,b:b.text,kinds:[a.kind,b.kind],x,y});
   }
   const brokenImages=Array.from(q.querySelectorAll('.cell_0 img,.varinats-block img')).filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute('src'));
   if(hits.length||overflow.length||brokenImages.length)results.push({id:q.id.slice(1),hits:hits.slice(0,12),overflow:overflow.slice(0,8),brokenImages});
  }
  return {findings:results,scrollableTables};
 };
 for(const width of (process.env.LAYOUT_WIDTHS||'320,390,1280').split(',').map(Number)){
  await call('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:false});
  if(process.env.LAYOUT_SCREENSHOTS){
   fs.mkdirSync(process.env.LAYOUT_SCREENSHOTS,{recursive:true});
   for(const task of active){
    await call('Page.navigate',{url:origin+'/tasks/'+task.id});
    loaded=false;
    for(let n=0;n<200;n++){loaded=await evaluate('location.pathname==='+JSON.stringify('/tasks/'+task.id)+'&&document.readyState==="complete"&&!!document.querySelector(".qblock")');if(loaded)break;await delay(100);}
    if(!loaded)throw Error(task.id+': page did not load');
    await evaluate('(async()=>{await document.fonts.ready;for(const i of document.images)i.loading="eager";await Promise.all(Array.from(document.images,i=>i.decode().catch(()=>false)));return true;})()');
    await checkFences([task]);
    if(process.env.LAYOUT_CHECK_COMMENTS){
     const comments=await evaluate(`(()=>{
      const widget=document.querySelector('.comments-widget'),trigger=widget?.querySelector('.comments-widget-trigger'),panel=widget?.querySelector('.comments-widget-panel'),q=document.querySelector('.qblock');
      if(!widget||!trigger||!panel||!q)throw Error('Missing comments control');
      if(innerWidth<=700){
       for(const y of [0,q.offsetTop, q.offsetTop+q.offsetHeight/2]){
        scrollTo(0,y);const t=trigger.getBoundingClientRect(),r=q.getBoundingClientRect();
        if(t.bottom>0&&t.top<innerHeight&&Math.min(t.right,r.right)>Math.max(t.left,r.left)&&Math.min(t.bottom,r.bottom)>Math.max(t.top,r.top))throw Error('Comments button covers condition');
       }
      }
      trigger.scrollIntoView({block:'start'});trigger.click();const r=panel.getBoundingClientRect();
      if(panel.hidden||trigger.getAttribute('aria-expanded')!=='true'||r.width<=0||r.left<0||r.right>innerWidth+1)throw Error('Comments panel not accessible: '+JSON.stringify({hidden:panel.hidden,expanded:trigger.getAttribute('aria-expanded'),left:r.left,right:r.right,width:r.width,viewport:innerWidth,display:getComputedStyle(panel).display,widgetDisplay:getComputedStyle(widget).display}));
      widget.querySelector('.comments-widget-close').click();
      if(!panel.hidden||trigger.getAttribute('aria-expanded')!=='false')throw Error('Comments panel did not close');
      scrollTo(0,0);return {opened:true,closed:true,mobileConditionUncovered:innerWidth<=700};
     })()`);
     (report.comments ||= []).push({id:task.id,width,...comments});
     if(width===320&&task.id===active[0].id){
      await evaluate(`(()=>{const t=document.querySelector('.comments-widget-trigger');t.scrollIntoView({block:'start'});t.click();return true;})()`);
      const panelShot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      fs.writeFileSync(path.join(process.env.LAYOUT_SCREENSHOTS,task.id+'-'+width+'-comments.png'),Buffer.from(panelShot.data,'base64'));
      await evaluate(`(()=>{document.querySelector('.comments-widget-close').click();scrollTo(0,0);return true;})()`);
     }
    }
    const measured=await evaluate('('+measure.toString()+')()');report.findings.push(...measured.findings.map(f=>({...f,width})));report.scrollableTables.push(...measured.scrollableTables.map(f=>({...f,width})));report.checked++;
    const clip=await evaluate('(()=>{const r=document.querySelector(".qblock").getBoundingClientRect();return {x:0,y:Math.max(0,r.top+scrollY-8),width:innerWidth,height:Math.min(4000,r.height+16),scale:1};})()');
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});fs.writeFileSync(path.join(process.env.LAYOUT_SCREENSHOTS,task.id+'-'+width+'.png'),Buffer.from(shot.data,'base64'));
    if(measured.scrollableTables.length){
     await evaluate('(()=>{for(const t of document.querySelectorAll(".qblock table"))if(["auto","scroll"].includes(getComputedStyle(t).overflowX))t.scrollLeft=t.scrollWidth;})()');
     const right=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});fs.writeFileSync(path.join(process.env.LAYOUT_SCREENSHOTS,task.id+'-'+width+'-scrolled.png'),Buffer.from(right.data,'base64'));
    }
    fs.writeFileSync(out,JSON.stringify(report,null,2));
   }
   continue;
  }
  for(let start=0;start<active.length;start+=80){
   const batch=active.slice(start,start+80);
   const html=batch.map(t=>{
    // Some answer pictures are still emitted by FIPI's document.write helper.
    // Mirror its IMG markup before discarding scripts in this batch harness.
    const fragment=t.fragment.replace(/<script\b[^>]*>\s*ShowPictureQ\(\s*(['"])(docs\/[^'"]+)\1(?:\s*,[^)]*)?\)\s*;?\s*<\/script>/gi,(_,quote,file)=>{
     if(file.split('/').includes('..'))throw Error('Invalid FIPI image path');
     return '<img loading="lazy" src="/fipi/oge/'+file.split('/').map(encodeURIComponent).join('/')+'" align="absmiddle" alt="" border="0"> ';
    });
    if(/<script\b[^>]*>\s*ShowPicture/i.test(fragment))throw Error(t.id+': unhandled dynamic FIPI picture');
    return expandMathmlFences(fragment.replaceAll('<m:','<').replaceAll('</m:','</')).replace(/<math\b[^>]*>[\s\S]*?<\/math>/gi,f=>'<span class="fipi-math-scroll">'+f+'</span>').replace(/<script\b[\s\S]*?<\/script>/gi,'');
   }).join('\n');
   await evaluate('(async()=>{document.body.innerHTML='+JSON.stringify(html)+';for(const i of document.images)i.loading="eager";await Promise.all(Array.from(document.images,i=>i.decode().catch(()=>false)));return true;})()');
   await checkFences(batch);
   const measured=await evaluate('('+measure.toString()+')()');report.findings.push(...measured.findings.map(f=>({...f,width})));report.scrollableTables.push(...measured.scrollableTables.map(f=>({...f,width})));report.checked+=batch.length;
   fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(width,start+batch.length,'findings',measured.findings.length);
  }
 }
}
run().then(()=>{if(report.findings.length)process.exitCode=1;}).catch(e=>{report.errors.push(e.stack);process.exitCode=1;}).finally(async()=>{
 fs.writeFileSync(out,JSON.stringify(report,null,2));ws?.close();chrome.kill('SIGTERM');await closed;
 try{await fs.promises.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:300});}
 catch(error){report.cleanupWarning={profile,message:error.message};fs.writeFileSync(out,JSON.stringify(report,null,2));console.warn('Chrome profile cleanup:',error.message);}
});
