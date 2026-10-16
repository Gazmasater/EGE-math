// Real-browser regression for OGE continuation and separate page-navigation goals.
// Run on a separate preview first. No account creation, analytics requests or ad impressions.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:8876';
const out = path.resolve(process.env.UI_ARTIFACTS || '/tmp/ege-oge-navigation-check');
const report = {origin, checkedAt: new Date().toISOString(), pages: [], interactions: [], errors: []};
fs.mkdirSync(out, {recursive: true});
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ege-ui-'));
const browser = spawn(process.env.CHROME_BIN || '/opt/google/chrome/chrome', [
  '--headless', '--no-sandbox', '--disable-gpu', '--disable-extensions', '--disable-background-networking',
  '--disable-component-update', '--disable-sync', '--no-first-run', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, 'about:blank'
], {stdio: 'ignore'});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
async function run() {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break;} catch {}
    await delay(100);
  }
  assert.ok(port, 'Chrome started');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  const pending = new Map(), loaded = new Set(); let sequence = 0;
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Page.lifecycleEvent' && message.params.name === 'load') loaded.add(message.params.loaderId);
    if (message.method === 'Runtime.exceptionThrown') report.errors.push(message.params.exceptionDetails.text);
    const handler = pending.get(message.id);
    if (handler) {pending.delete(message.id); message.error ? handler.reject(Error(JSON.stringify(message.error))) : handler.resolve(message.result);}
  };
  await new Promise((resolve, reject) => {ws.onopen = resolve; ws.onerror = reject;});
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence, timer = setTimeout(() => {pending.delete(id); reject(Error('CDP timeout: ' + method));}, 30000);
    pending.set(id, {resolve: value => {clearTimeout(timer); resolve(value);}, reject: error => {clearTimeout(timer); reject(error);}});
    ws.send(JSON.stringify({id, method, params}));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 150; attempt++) {
      try {if (await evaluate(expression)) return;} catch (error) {if (!/context|navigated/i.test(error.message)) throw error;}
      await delay(100);
    }
    throw Error('Wait failed: ' + expression);
  };
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Page.setLifecycleEventsEnabled', {enabled: true});
  await call('Network.setBlockedURLs', {urls: ['*mc.yandex*', '*challenges.cloudflare*', '*yandex.ru/ads/system/*', '*an.yandex*']});
  const navigate = async route => {
    const result = await call('Page.navigate', {url: origin + route});
    assert.ok(!result.errorText, result.errorText);
    if (result.loaderId) {
      for (let attempt = 0; attempt < 200 && !loaded.has(result.loaderId); attempt++) await delay(100);
      assert.ok(loaded.has(result.loaderId), route + ' finished loading');
    }
    await waitFor('document.readyState === "complete" && !document.documentElement.classList.contains("page-loading")');
    await evaluate('document.fonts.ready');
    await evaluate(`Promise.all([...document.images].filter(image => image.checkVisibility()).map(image => {image.loading = 'eager'; return image.decode().catch(() => false);} ))`);
    await delay(100);
  };
  const viewport = width => call('Emulation.setDeviceMetricsOverride', {width, height: width < 700 ? 844 : 960, deviceScaleFactor: 1, mobile: width < 700});
  const click = async selector => {
    const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing click target');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await call('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...point});
    await call('Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, ...point});
    await delay(100);
  };

  await call('Page.addScriptToEvaluateOnNewDocument', {source: `window.__docId=Math.random();window.__goals=[];window.ym=function(...args){if(args[1]==='reachGoal'){const goals=JSON.parse(sessionStorage.getItem('oge_goals')||'[]');goals.push({name:args[2],params:args[3]});sessionStorage.setItem('oge_goals',JSON.stringify(goals));if(args[4]&&!window.__blockMetricaCallback)args[4]();}};`});
  const capture = async name => {
    const shot=await call('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:false});
    fs.writeFileSync(path.join(out,name+'.jpg'),Buffer.from(shot.data,'base64'));
  };
  const events = () => evaluate("JSON.parse(sessionStorage.getItem('oge_goals')||'[]')");
  const resetEvents = () => evaluate("sessionStorage.setItem('oge_goals','[]')");
  const countEvent = async name => (await events()).filter(g=>g.name===name).length;
  const idsOnPage = () => evaluate("[...document.querySelectorAll('.qblock[id]')].map(e=>e.id.slice(1))");
  const openTask = async id => {await click('#q'+id+' .solution-button');await waitFor("document.querySelector('.solution-modal')?.hidden===false");};
  const nextInModal = '.solution-modal .task-sequence-pager a';
  async function waitNavigation(previous, fragment='') {
    await waitFor(`window.__docId!==${previous} && document.readyState==='complete' && document.querySelector('.solution-button') && location.hash===${JSON.stringify(fragment)}`);
  }
  for (const width of [390,1280]) {
    await viewport(width);
    for (const section of ['oge','oge-physics']) {
      const route='/'+section+'?topic=all';
      await navigate(route);
      const ids=await idsOnPage();assert.equal(ids.length,12);
      const firstDoc=await evaluate('window.__docId');
      await resetEvents();await openTask(ids[0]);
      assert.equal(await countEvent('solution_open'),1);
      assert.equal(await evaluate(`new URL(document.querySelector(${JSON.stringify(nextInModal)}).href).hash`),'#q'+ids[1]);
      await evaluate(`document.querySelector(${JSON.stringify(nextInModal)}).scrollIntoView({block:'center'})`);
      await capture(width+'-'+section+'-continue');
      await evaluate(`(()=>{const link=document.querySelector(${JSON.stringify(nextInModal)});link.click();link.click();})()`);
      await waitFor(`document.querySelector('.solution-modal').hidden && location.hash===${JSON.stringify('#q'+ids[1])}`);
      assert.equal(await evaluate('window.__docId'),firstDoc,'same-page continuation does not reload');
      assert.equal(await countEvent('next_task'),1,'double click counts once');
      assert.equal(await countEvent('catalogue_page_next'),0);
      assert.equal(await evaluate('document.activeElement.id'),'q'+ids[1]);
      const position=await evaluate(`(()=>{const e=document.getElementById('q'+${JSON.stringify(ids[1])});return {top:e.getBoundingClientRect().top,header:document.querySelector('.local-header').getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
      assert.ok(position.top>=position.header-1,'next condition below sticky header');assert.equal(position.overflow,false);
      await capture(width+'-'+section+'-next-condition');
      await evaluate('history.back()');await delay(200);assert.equal(await countEvent('next_task'),1);
      await resetEvents();await openTask(ids.at(-1));
      const destination=await evaluate(`new URL(document.querySelector(${JSON.stringify(nextInModal)}).href).hash`);
      await evaluate(`window.__blockMetricaCallback=true;(()=>{const link=document.querySelector(${JSON.stringify(nextInModal)});link.click();link.click();})()`);
      await waitNavigation(firstDoc,destination);
      assert.equal(await evaluate("new URL(location.href).searchParams.get('page')"),'2');
      assert.equal('#q'+(await idsOnPage())[0],destination,'cross-page continuation lands on first next condition');
      assert.equal(await countEvent('next_task'),1);assert.equal(await countEvent('catalogue_page_next'),0);
      await resetEvents();const page2Doc=await evaluate('window.__docId');
      await evaluate("window.__blockMetricaCallback=true;const a=document.querySelector('.oge-pager a[rel=next]');a.click();a.click()");
      await waitNavigation(page2Doc);
      assert.equal(await evaluate("new URL(location.href).searchParams.get('page')"),'3');
      assert.equal(await countEvent('catalogue_page_next'),1);assert.equal(await countEvent('next_task'),0);
      const pageGoal=(await events())[0];assert.equal(pageGoal.params.section,section);assert.equal(pageGoal.params.page,3);
      const page3Doc=await evaluate('window.__docId');await click('.oge-pager a[rel=prev]');await waitNavigation(page3Doc);
      assert.equal(await countEvent('catalogue_page_next'),1,'back link is not a forward goal');
      // A filtered result must retain its exact query across the 12-item boundary.
      const query=section==='oge'?'число':'тело';
      await navigate(route+'&q='+encodeURIComponent(query));const filtered=await idsOnPage();assert.equal(filtered.length,12);
      await resetEvents();await openTask(filtered.at(-1));const searchDoc=await evaluate('window.__docId');
      const searchTarget=await evaluate(`new URL(document.querySelector(${JSON.stringify(nextInModal)}).href).hash`);
      await click(nextInModal);await waitNavigation(searchDoc,searchTarget);
      assert.equal(await evaluate("new URL(location.href).searchParams.get('q')"),query);
      assert.equal(await evaluate("new URL(location.href).searchParams.get('topic')"),'all');
      assert.equal('#q'+(await idsOnPage())[0],searchTarget);assert.equal(await countEvent('next_task'),1);
      // A single-result selection ends with a route back to the same subject.
      await navigate(route+'&q='+ids[0].replace(/^OGEPHYS/,''));assert.equal((await idsOnPage()).length,1);
      await openTask(ids[0]);assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(nextInModal)})`),false);
      assert.equal(await evaluate("new URL(document.querySelector('.solution-modal .catalogue-complete a').href).pathname"),'/'+section);
      report.interactions.push({width,section,samePage:true,crossPage:true,filteredSearch:true,endOfSelection:true,pageGoal:true,backNoGoal:true,blockedCallback:true,doubleClick:true,position});
      console.log(width,section,'OK');
    }
  }
  // The native server pager remains usable when no JavaScript can run.
  await call('Emulation.setScriptExecutionDisabled',{value:true});
  for(const section of ['oge','oge-physics']){
    await navigate('/'+section+'?topic=all');
    const href=await evaluate("document.querySelector('.oge-pager a[rel=next]').getAttribute('href')");
    assert.equal((await idsOnPage()).length,12);
    await navigate(href);assert.equal((await idsOnPage()).length,12);
    assert.equal(await evaluate("new URL(location.href).searchParams.get('page')"),'2');
    report.interactions.push({section,noJavaScript:true});
  }
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  assert.deepEqual(report.errors,[]);
  report.status='ok';fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  // Close Chrome cleanly so its temporary profile is not still being written.
  await call('Browser.close').catch(()=>{});
}
run().catch(error=>{report.status='failed';report.failure=String(error.stack||error);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.error(error);process.exitCode=1;}).finally(async()=>{ws?.close();if(browser.exitCode===null)browser.kill('SIGTERM');await delay(1000);try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:20,retryDelay:200});}catch(error){console.error('Temporary browser profile cleanup:',error.message);}});
