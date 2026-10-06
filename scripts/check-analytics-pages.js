// Browser regression with the real site code and a local Metrica stub.
// All Yandex requests are blocked. Registration runs only on isolated port 8876.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const origin = process.env.ANALYTICS_ORIGIN || 'http://127.0.0.1:8876';
const out = process.env.ANALYTICS_ARTIFACTS || '/dev/shm/ege-analytics-browser';
fs.mkdirSync(out, {recursive: true});
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ege-analytics-chrome-'));
const chrome = spawn('/opt/google/chrome/chrome', ['--headless', '--no-sandbox', '--disable-gpu',
  '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--no-first-run', '--remote-debugging-port=9338', `--user-data-dir=${profile}`, 'about:blank'], {stdio: 'ignore'});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = {origin, checkedAt: new Date().toISOString(), checks: [], pages: [], errors: []};
let ws;
async function run() {
  let pages;
  for (let i = 0; i < 80; i++) {
    try {pages = await (await fetch('http://127.0.0.1:9338/json/list')).json(); break;} catch {await delay(100);}
  }
  assert.ok(pages?.length, 'Chrome started');
  ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  const pending = new Map(); let seq = 0;
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') report.errors.push(message.params.exceptionDetails.text);
    const handler = pending.get(message.id);
    if (handler) {pending.delete(message.id); message.error ? handler.reject(Error(JSON.stringify(message.error))) : handler.resolve(message.result);}
  };
  await new Promise((resolve, reject) => {ws.onopen = resolve; ws.onerror = reject;});
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => {pending.delete(id); reject(Error('CDP timeout: ' + method));}, 20000);
    pending.set(id, {resolve: value => {clearTimeout(timer); resolve(value);}, reject: error => {clearTimeout(timer); reject(error);}});
    ws.send(JSON.stringify({id, method, params}));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 100; i++) {
      try {if (await evaluate(expression)) return;} catch (error) {if (!/context|navigated/i.test(error.message)) throw error;}
      await delay(100);
    }
    throw Error('Wait failed: ' + expression);
  };
  await call('Page.enable'); await call('Network.enable'); await call('Runtime.enable');
  await call('Network.setBlockedURLs', {urls: ['*mc.yandex*', '*challenges.cloudflare*', '*yandex.ru/ads/system/*', '*an.yandex*']});
  await call('Page.addScriptToEvaluateOnNewDocument', {source: `
    window.__testDocumentId = Math.random().toString(36);
    window.ym = function(id, method, name, params, callback) {
      if (method === 'init') window.__metrikaInitCount = (window.__metrikaInitCount || 0) + 1;
      if (method === 'reachGoal') {
        const goals = JSON.parse(sessionStorage.getItem('test_goals') || '[]');
        goals.push({name, params, documentId: window.__testDocumentId}); sessionStorage.setItem('test_goals', JSON.stringify(goals));
        if (callback && !window.__blockMetricaCallback) callback();
      }
    };`});
  const navigate = async route => {
    const previousDocument = await evaluate('window.__testDocumentId || ""');
    const navigation = await call('Page.navigate', {url: origin + route});
    // A pathname alone also matches the old page during a same-URL reload.
    if (!navigation.loaderId) await call('Page.reload', {ignoreCache: true});
    await waitFor(`window.__testDocumentId && window.__testDocumentId !== ${JSON.stringify(previousDocument)} && location.pathname === ${JSON.stringify(new URL(origin + route).pathname)} && document.readyState === 'complete' && !!window.egeAnalytics`);
    await evaluate('document.fonts.ready'); await delay(250);
  };
  const goals = () => evaluate("JSON.parse(sessionStorage.getItem('test_goals') || '[]')");
  const reset = () => evaluate("sessionStorage.setItem('test_goals', '[]')");
  const count = async (name, placement) => (await goals()).filter(g => g.name === name && (!placement || g.params.placement === placement)).length;
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const capture = async name => {
    const shot = await call('Page.captureScreenshot', {format: 'png'});
    fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(shot.data, 'base64'));
  };

  await call('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
  await navigate('/?topic=1.2#tasks'); await reset();
  assert.equal(await evaluate('window.__metrikaInitCount'), 1);
  await evaluate(`window.__originalFetch = window.fetch; window.fetch = (...args) =>
    String(args[0]).startsWith('/api/solutions/') ? Promise.resolve({status:404,ok:false}) : window.__originalFetch(...args);`);
  await click('.solution-button'); await delay(200);
  assert.equal(await count('solution_open'), 0, '404 solution must not count');
  await evaluate('window.fetch = window.__originalFetch');
  await click('.solution-button');
  await waitFor("!document.querySelector('.solution-modal').hidden");
  assert.equal(await count('solution_open', 'dialog'), 1);
  await capture('390-solution-dialog');
  await click('.solution-modal-close'); await click('.solution-button');
  assert.equal(await count('solution_open', 'dialog'), 2, 'one goal for each deliberate cached reopening');
  await click('.solution-modal-close');
  await evaluate("Array.from(document.querySelectorAll('#local-pager-top button')).find(b=>b.textContent==='Вперёд →').click()");
  assert.equal(await count('next_task'), 1);
  await evaluate("Array.from(document.querySelectorAll('#local-pager-top button')).find(b=>b.textContent==='← Назад').click()");
  await call('Emulation.setDeviceMetricsOverride', {width: 360, height: 800, deviceScaleFactor: 1, mobile: true});
  await delay(350);
  assert.equal(await count('next_task'), 1, 'back and resize must not count as forward');
  report.checks.push('One counter init; failed solution=0; open/reopen=1 each; forward=1; back/resize=0');

  for (const width of [360, 390, 1280]) {
    await call('Emulation.setDeviceMetricsOverride', {width, height: width === 1280 ? 960 : 844, deviceScaleFactor: 1, mobile: width < 600});
    for (const route of ['/ege', '/ege/math', '/ege/physics', '/tasks/6F97FE', '/tasks/083006', '/tasks/36135B', '/physics?topic=1.1#tasks', '/?topic=1.2#tasks']) {
      await navigate(route);
      if (route.startsWith('/tasks/')) {
        assert.equal(await evaluate("document.querySelectorAll('.task-sequence-pager--after-solution').length"), 1);
      }
      await evaluate(`Promise.all(Array.from(document.images).filter(i=>i.getBoundingClientRect().height>0).map(i=>i.decode().catch(()=>false)))`);
      const info = await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
        brokenImages:Array.from(document.images).filter(i=>i.getBoundingClientRect().height>0&&(!i.complete||!i.naturalWidth)).length,
        initCount:window.__metrikaInitCount,loading:document.documentElement.classList.contains('page-loading')})`);
      report.pages.push({width, route, ...info});
      assert.ok(info.scrollWidth <= width + 1, route + ' horizontal overflow at ' + width);
      assert.equal(info.brokenImages, 0); assert.equal(info.initCount, 1); assert.equal(info.loading, false);
      if (width === 390 && route.startsWith('/tasks/')) {
        await evaluate("document.querySelector('.qblock').scrollIntoView({block:'start'})");
        await capture('390-condition-' + route.split('/').pop());
        await reset();
        await navigate(route);
        await evaluate("document.querySelector('.seo-task-solution h2').scrollIntoView({block:'center'})");
        await delay(1300);
        assert.equal(await count('solution_open', 'task_page'), 1);
        await capture('390-static-solution-' + route.split('/').pop());
        if (route === '/tasks/36135B') {
          await evaluate("document.querySelector('.seo-task-solution figure').scrollIntoView({block:'center'})");
          await capture('390-physics-diagram');
        }
        await evaluate('window.scrollTo(0,0)'); await delay(100);
        await evaluate("document.querySelector('.seo-task-solution h2').scrollIntoView({block:'center'})");
        await delay(1200);
        assert.equal(await count('solution_open', 'task_page'), 1, 'static solution only once per page');
      }
    }
  }
  report.checks.push('24 page/viewport checks: EGE and subject hubs, conditions, figures, static solution; no overflow, missing images or duplicate view goals');
  await navigate('/tasks/6F97FE'); await reset();
  const nextPath = await evaluate("document.querySelector('[data-analytics-next-task]').getAttribute('href')");
  assert.equal(await evaluate("document.querySelector('.task-sequence-pager--after-solution [data-analytics-next-task]').getAttribute('href')"), nextPath);
  await call('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
  await evaluate("document.querySelector('.task-sequence-pager--after-solution').scrollIntoView({block:'center'})");
  await capture('390-next-after-solution');
  await click('.solution-button');
  await waitFor("!document.querySelector('.solution-modal').hidden");
  assert.equal(await evaluate("document.querySelector('.solution-modal [data-analytics-next-task]').getAttribute('href')"), nextPath);
  await evaluate("document.querySelector('.solution-modal [data-analytics-next-task]').scrollIntoView({block:'center'})");
  await capture('390-next-in-dialog');
  await evaluate('window.__blockMetricaCallback = true');
  await click('.solution-modal [data-analytics-next-task]');
  await waitFor(`location.pathname === ${JSON.stringify(nextPath)} && document.readyState === 'complete'`);
  assert.equal(await count('next_task', 'task_page'), 1);
  report.checks.push('Next links after static solution and in dialog agree; dialog next navigation succeeds even without a Metrica callback');

  if (origin === 'http://127.0.0.1:8876') {
    await navigate('/account/register'); await reset();
    const invalid = await fetch(origin + '/account/register', {method: 'POST', redirect: 'manual',
      headers: {'Content-Type': 'application/x-www-form-urlencoded', Origin: origin}, body: 'email=bad'});
    assert.equal(invalid.status, 422); assert.equal(invalid.headers.get('set-cookie'), null);
    const email = `analytics-${Date.now()}@example.test`;
    await evaluate(`(() => {
      const form = document.querySelector('form[action="/account/register"]');
      const values = ${JSON.stringify({full_name: 'Тест Аналитики', city: 'Тестовый', password: 'TemporaryTest_123', next: '/account'})};
      values.email = ${JSON.stringify(email)};
      for (const [key,value] of Object.entries(values)) form.elements[key].value = value;
      form.elements.consent.checked = true; form.requestSubmit();
    })()`);
    await waitFor("location.pathname === '/account' && document.readyState === 'complete'");
    assert.equal(await count('registration_success'), 1);
    await navigate('/account'); assert.equal(await count('registration_success'), 1, 'refresh must not repeat registration');
    assert.equal(await evaluate("document.cookie.includes('ege_registration_success')"), false);
    const values = {full_name: 'Тест Аналитики', city: 'Тестовый', email, password: 'TemporaryTest_123', consent: '1'};
    const duplicate = await fetch(origin + '/account/register', {method: 'POST', redirect: 'manual',
      headers: {'Content-Type': 'application/x-www-form-urlencoded', Origin: origin}, body: new URLSearchParams(values)});
    assert.equal(duplicate.status, 409); assert.equal(duplicate.headers.get('set-cookie'), null);
    const login = await fetch(origin + '/account/login', {method: 'POST', redirect: 'manual',
      headers: {'Content-Type': 'application/x-www-form-urlencoded', Origin: origin}, body: new URLSearchParams(values)});
    assert.equal(login.status, 303); assert.ok(!login.headers.get('set-cookie').includes('ege_registration_success'));
    assert.ok(!JSON.stringify(await goals()).includes(email));
    report.checks.push('Isolated DB: invalid registration 422=0 goals; successful native POST+redirect=1; refresh=0 extra; duplicate 409=0; login=0; no personal data in goal');
  }
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
}
run().catch(error => {report.errors.push(error.stack); console.error(error); process.exitCode = 1;}).finally(async () => {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  ws?.close(); chrome.kill(); await delay(500);
  fs.rmSync(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
});
