// Real browser checks for shared navigation, landing CTAs and responsive layouts.
// Run on a separate preview first. No account creation, analytics requests or ad impressions.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:8876';
const out = path.resolve(process.env.UI_ARTIFACTS || '/tmp/ege-ui-check');
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
  await call('Network.setBlockedURLs', {urls: ['*mc.yandex*', '*challenges.cloudflare*', '*yandex.ru/ads/system/*']});
  const navigate = async route => {
    const result = await call('Page.navigate', {url: origin + route});
    assert.ok(!result.errorText, result.errorText);
    if (result.loaderId) {
      for (let attempt = 0; attempt < 200 && !loaded.has(result.loaderId); attempt++) await delay(100);
      assert.ok(loaded.has(result.loaderId), route + ' finished loading');
    }
    await waitFor('document.readyState === "complete" && !document.documentElement.classList.contains("page-loading")');
    await evaluate('document.fonts.ready'); await delay(100);
  };
  const viewport = width => call('Emulation.setDeviceMetricsOverride', {width, height: width < 700 ? 844 : 960, deviceScaleFactor: 1, mobile: width < 700});
  const click = async selector => {
    const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing click target');e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await call('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...point});
    await call('Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, ...point});
    await delay(100);
  };
  const capture = async name => {
    const height = await evaluate('document.documentElement.scrollHeight');
    const width = await evaluate('innerWidth');
    const shot = await call('Page.captureScreenshot', {format: 'jpeg', quality: 82, captureBeyondViewport: true, clip: {x: 0, y: 0, width, height: Math.min(height, 16000), scale: 1}});
    fs.writeFileSync(path.join(out, name + '.jpg'), Buffer.from(shot.data, 'base64'));
  };
  const checkLayout = async (route, width) => {
    const info = await evaluate(`(()=>{
      const header=document.querySelector('.site-header'), h=header.getBoundingClientRect();
      const broken=Array.from(document.images).filter(i=>i.getBoundingClientRect().height>0&&(!i.complete||!i.naturalWidth));
      const overflow=Array.from(document.querySelectorAll('.site-header a,.study-hero,.study-preview-card,.study-button,.math-topic-group,.page-heading,.topic-card,.subject-card,.site-footer')).filter(e=>{if(!e.checkVisibility())return false;const r=e.getBoundingClientRect();return r.width&&r.height&&(r.left<-1||r.right>innerWidth+1)}).map(e=>e.className);
      return {title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,headings:document.querySelectorAll('h1').length,headerHeight:h.height,overflow,broken:broken.length,footer:!!document.querySelector('.site-footer'),styled:getComputedStyle(header).display==='flex'};
    })()`);
    report.pages.push({route, viewport: width, ...info});
    assert.equal(info.headings, 1, route + ': one H1');
    assert.ok(info.styled && info.footer, route + ': shared UI loaded');
    assert.ok(info.scrollWidth <= width + 1, route + ': page overflow');
    assert.deepEqual(info.overflow, [], route + ': element overflow');
    assert.equal(info.broken, 0, route + ': images');
    assert.ok(info.headerHeight <= 90, route + ': compact header');
  };
  const routes = process.env.UI_PATHS ? process.env.UI_PATHS.split(',') : [
    '/', '/ege', '/physics', '/ege/math', '/ege/physics', '/math', '/about',
    '/search?q=процент', '/account/login', '/tasks/6D1598', '/physics?topic=kinematics#tasks'
  ];
  for (const width of [390, 1280]) {
    await viewport(width);
    for (const route of routes) {
      await navigate(route);
      await capture(width + '-' + (route === '/' ? 'home' : route.slice(1).replace(/[^a-zA-Z0-9]/g, '-')));
      await checkLayout(route, width);
      console.log(width, route, 'OK');
    }
  }
  for (const width of [320, 360, 768, 1024, 1440]) {
    await viewport(width); await navigate('/'); await checkLayout('/', width); await capture(width + '-home');
  }
  for (const width of [390, 1280]) {
    await viewport(width); await navigate('/');
    await click('.study-actions .study-button');
    const position = await evaluate(`({hash:location.hash,top:document.querySelector('#practice').getBoundingClientRect().top,headerBottom:document.querySelector('.site-header').getBoundingClientRect().bottom})`);
    assert.equal(position.hash, '#practice'); assert.ok(position.top >= position.headerBottom - 2 && position.top < 844, 'CTA reveals catalog below sticky header');
    assert.ok(position.headerBottom >= 65 && position.headerBottom <= 90, 'header stays visible while the catalog is scrolled');
    await navigate('/'); await click('.study-demo-answer>summary');
    assert.ok(await evaluate('document.querySelector(".study-demo-answer").open'), 'example opens');
    assert.ok(await evaluate('document.querySelector(".study-demo-answer").innerText.includes("120")'), 'real example answer');
    if (width < 900) {
      await click('.site-mobile-menu>summary');
      await click('.site-mobile-panel>details>summary');
      assert.ok(await evaluate(`document.querySelector('.site-mobile-panel a[href="/numbers"]').checkVisibility()`), 'second part accessible on mobile');
    } else {
      await click('.site-desktop-nav .site-dropdown>summary');
      assert.ok(await evaluate(`document.querySelector('.site-desktop-nav a[href="/numbers"]').checkVisibility()`), 'second part accessible on desktop');
    }
    const shot = await call('Page.captureScreenshot', {format: 'jpeg', quality: 85});
    fs.writeFileSync(path.join(out, width + '-menu.jpg'), Buffer.from(shot.data, 'base64'));
    await call('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape'});
    assert.equal(await evaluate('document.querySelectorAll(".site-dropdown[open],.site-mobile-menu[open]").length'), 0, 'Escape closes menu');
    assert.ok(await evaluate('document.activeElement.tagName === "SUMMARY"'), 'focus returns to menu trigger');
    await click('.site-search>summary');
    await evaluate('document.querySelector("#header-search").value="6D1598"');
    await click('.site-search-panel button');
    // Exact IDs intentionally redirect straight to the task instead of a result list.
    await waitFor(`location.pathname === '/tasks/6D1598' && document.readyState === 'complete' && !!document.querySelector('.seo-task-solution')`);
    await navigate('/tasks/6D1598#solution-6D1598');
    const solution = await evaluate(`(()=>{const r=document.querySelector('#solution-6D1598').getBoundingClientRect();return {hash:location.hash,top:r.top,header:document.querySelector('.site-header').getBoundingClientRect().bottom,pagers:[...document.querySelectorAll('.local-pager')].some(e=>e.checkVisibility())}})()`);
    assert.equal(solution.hash, '#solution-6D1598');
    assert.ok(solution.top >= solution.header - 2 && solution.top < 844, 'solution link reaches visible solution');
    assert.ok(solution.header >= 65 && solution.header <= 90, 'header stays visible on a scrolled task');
    assert.equal(solution.pagers, false, 'individual task has no redundant catalog pager');
    report.interactions.push({width, cta: true, sample: true, secondPartMenu: true, escapeAndFocus: true, search: true, solutionAnchor: true});
  }
  // Native mobile menus, catalog accordions and the sample remain usable without JS.
  await viewport(390); await navigate('/about'); await call('Emulation.setScriptExecutionDisabled', {value: true});
  await navigate('/'); await click('.study-demo-answer>summary');
  assert.ok(await evaluate('document.querySelector(".study-demo-answer").open'));
  await click('.site-mobile-menu>summary'); await click('.site-mobile-panel>details:nth-of-type(2)>summary');
  await click('.site-mobile-panel a[href="/physics#practice"]');
  await waitFor('location.pathname === "/physics" && document.readyState === "complete"');
  assert.ok(await evaluate('document.querySelectorAll(".math-topic-group").length > 0'));
  report.interactions.push({noJavaScript: true, sample: true, mobileSubjectNavigation: true});
  await call('Emulation.setScriptExecutionDisabled', {value: false});
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
