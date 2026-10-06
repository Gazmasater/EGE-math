// Real browser checks for shared navigation, landing CTAs and responsive layouts.
// Run on a separate preview first. No account creation, analytics requests or ad impressions.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:8876';
const out = path.resolve(process.env.UI_ARTIFACTS || '/tmp/ege-catalogue-check');
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

  await call('Page.addScriptToEvaluateOnNewDocument', {source: `window.__goals=[];window.ym=function(...args){if(args[1]==='reachGoal'){window.__goals.push({name:args[2],params:args[3]});try{sessionStorage.setItem('catalogue_goals',JSON.stringify(window.__goals));}catch{}}};`});
  const capture = async name => {
    const shot=await call('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:false});
    fs.writeFileSync(path.join(out,name+'.jpg'),Buffer.from(shot.data,'base64'));
  };
  const visibleId = ()=>evaluate(`[...document.querySelectorAll('.qblock')].find(e=>e.checkVisibility())?.id.slice(1).toUpperCase()`);
  const goals = ()=>evaluate(`window.__goals.filter(g=>g.name==='next_task')`);
  const forward = ()=>evaluate(`[...document.querySelectorAll('#local-pager-top button')].find(e=>e.textContent==='Вперёд →').click()`);
  const openVisible = async()=>{const id=await evaluate(`[...document.querySelectorAll('.qblock')].find(e=>e.checkVisibility()).id`);await click('#'+id+' .solution-button');await waitFor(`!!document.querySelector('.solution-modal:not([hidden]) .solution-answer')`);};
  const routes=['/?topic=all','/?topic=vectors','/?topic=2.1','/?topic=applied.trigonometry','/physics?topic=1.1','/physics?topic=kinematics','/physics?topic=measurement.direct','/physics?topic=molecular.gas','/physics?topic=dynamics.forces','/physics'];
  for(const width of (process.env.CATALOGUE_INTERACTIONS_ONLY ? [] : [390,1280])){
    await viewport(width);
    for(const [i,route]of routes.entries()){
      await navigate(route+(route.includes('?')?'#tasks':''));
      const info=await evaluate(`(()=>{const n=performance.getEntriesByType('navigation')[0];return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,headings:document.querySelectorAll('h1').length,tasks:document.querySelectorAll('.qblock').length,shown:[...document.querySelectorAll('.qblock')].filter(e=>e.checkVisibility()).length,broken:[...document.images].filter(e=>e.checkVisibility()&&(!e.complete||!e.naturalWidth)).length,domContentLoaded:n.domContentLoadedEventEnd,load:n.loadEventEnd,bytes:n.decodedBodySize,nodes:document.querySelectorAll('*').length}})()`);
      assert.equal(info.headings,1);assert.ok(info.scrollWidth<=width+1,route+' overflow');assert.equal(info.broken,0,route+' images');assert.ok(info.tasks<=12,route+' bounded DOM');
      if(route!='/physics')assert.equal(info.shown,1,route+' visible condition');
      report.pages.push({route,width,...info});await capture(width+'-'+i);console.log(width,route,'OK');
    }
  }
  await viewport(390);await navigate('/?topic=vectors&utm_source=catalogue-test');
  assert.ok(await evaluate(`location.search.includes('utm_source=catalogue-test')`),'campaign parameters survive initial rendering');
  await navigate('/?topic=vectors#tasks');
  const data=await evaluate(`JSON.parse(document.getElementById('catalogue-data').textContent)`);
  assert.equal(await visibleId(),data.ids[0]);
  await openVisible();await capture('modal-next');
  assert.ok(await evaluate(`document.querySelector('.catalogue-next-task').href.includes('topic=vectors')`));
  await click('.catalogue-next-task');assert.equal(await visibleId(),data.ids[1]);assert.equal((await goals()).length,1);assert.equal((await goals())[0].params.placement,'catalogue_dialog');
  await evaluate('history.back()');await waitFor(`location.hash.includes('${data.ids[0]}') || location.hash==='#tasks'`);assert.equal(await visibleId(),data.ids[0]);assert.equal((await goals()).length,1,'history is not a new action');
  await navigate('/?topic=vectors#task-'+data.ids[11]);assert.equal(await visibleId(),data.ids[11]);
  await evaluate(`window.__goals=[];sessionStorage.removeItem('catalogue_goals')`);await openVisible();await click('.catalogue-next-task');await waitFor(`location.search.includes('page=2') && document.readyState==='complete' && !!document.getElementById('catalogue-data') && !document.documentElement.classList.contains('page-loading')`);await waitFor(`[...document.querySelectorAll('.qblock')].some(e=>e.id.slice(1).toUpperCase()==='${data.ids[12]}')`);
  assert.equal(await visibleId(),data.ids[12]);assert.equal(await evaluate(`JSON.parse(sessionStorage.getItem('catalogue_goals')).filter(g=>g.name==='next_task').length`),1,'cross-chunk action recorded once despite blocked callback');
  await call('Page.navigate', {url:origin+'/?topic=vectors#page=14'});await waitFor(`location.search.includes('page=2') && location.hash.includes('${data.ids[13]}') && document.readyState==='complete' && !!document.getElementById('catalogue-data') && !document.documentElement.classList.contains('page-loading')`);assert.equal(await visibleId(),data.ids[13]);assert.equal((await goals()).length,0,'legacy hash migration is not a user action');
  await navigate('/?topic=7.5#tasks');assert.equal(await evaluate('location.search'),'?topic=vectors');
  await navigate('/?topic=applied.trigonometry#task-72B193');await openVisible();assert.ok(await evaluate(`!!document.querySelector('.catalogue-complete a')`));assert.ok(!await evaluate(`!!document.querySelector('.catalogue-next-task')`));await capture('modal-last');
  await navigate('/physics?topic=measurement.direct#tasks');await evaluate(`document.querySelector('#catalogue-query').value='амперметра'`);await click('.catalogue-search button');await waitFor(`location.search.includes('q=') && document.readyState==='complete' && !!document.getElementById('catalogue-data') && !document.documentElement.classList.contains('page-loading')`);
  assert.ok(await evaluate(`document.querySelector('.qblock').innerText.toLowerCase().includes('амперметра')`));assert.equal(await evaluate(`document.querySelector('meta[name=robots]').content`),'noindex,follow');await capture('scoped-search');
  await navigate('/physics?topic=measurement.direct&q=zzznomatch');assert.equal(await evaluate(`document.querySelectorAll('.qblock').length`),0);
  await navigate('/about');await call('Emulation.setScriptExecutionDisabled',{value:true});await navigate('/?topic=all');
  assert.equal(await evaluate(`[...document.querySelectorAll('.qblock')].filter(e=>e.checkVisibility()).length`),12);
  await click('#local-pager-top a[rel=next]');await waitFor(`location.search.includes('page=2') && document.readyState==='complete'`);
  assert.equal(await evaluate(`document.querySelectorAll('.qblock').length`),12);assert.ok(await evaluate(`document.querySelector('link[rel=canonical]').href.endsWith('topic=all&page=2')`));await capture('no-js-page-2');
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  report.interactions.push({modalNext:true,lastTask:true,crossChunk:true,legacyHash:true,history:true,scopedSearch:true,emptySearch:true,noJavaScript:true});
}
run().catch(error => {report.errors.push(error.stack); process.exitCode = 1; console.error(error);}).finally(async () => {
  fs.writeFileSync(path.join(out, 'ui-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({pages: report.pages.length, interactions: report.interactions.length, errors: report.errors.length}));
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({id: 999999, method: 'Browser.close'}));
  await Promise.race([new Promise(resolve => {if (browser.exitCode !== null || browser.signalCode) resolve(); else browser.once('exit', resolve);}), delay(5000)]);
  if (browser.exitCode === null && !browser.signalCode) browser.kill('SIGTERM');
  ws?.close();
  try {fs.rmSync(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});}
  catch (error) {console.warn('Temporary Chrome profile retained:', profile, error.code);}
});
