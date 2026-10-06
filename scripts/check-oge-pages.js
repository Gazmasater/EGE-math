// Uses the same local Chrome/CDP approach as the existing page checks.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { ogeBank, ogeTopicStats, ogeTaskMatchesTopic } = require('../lib/oge-catalog');
const section = process.argv[2] || 'oge';
const bank = ogeBank(section);

const origin = process.env.OGE_SITE_ORIGIN || 'http://127.0.0.1:8877';
const output = path.resolve(process.env.OGE_BROWSER_REPORT || `storage/${section}-browser`);
const chrome = process.env.CHROME_BIN || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/opt/google/chrome/chrome');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'oge-browser-'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const processChrome = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--disable-sync', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true });
let launchError;
processChrome.on('error', error => { launchError = error; });
let socket;

async function main() {
  fs.mkdirSync(output, { recursive: true });
  let port;
  for (let i = 0; i < 100; i++) {
    if (launchError) throw launchError;
    try { port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch {}
    if (port) break;
    await delay(100);
  }
  assert.ok(port, 'Chrome не запустился');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  const pending = new Map();
  let counter = 0;
  socket.onmessage = event => {
    const data = JSON.parse(event.data);
    if (pending.has(data.id)) { const [resolve, reject] = pending.get(data.id); pending.delete(data.id); data.error ? reject(new Error(JSON.stringify(data.error))) : resolve(data.result); }
  };
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++counter;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome timeout: ${method}`)); }, 30000);
    pending.set(id, [result => { clearTimeout(timer); resolve(result); }, error => { clearTimeout(timer); reject(error); }]);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  await call('Page.enable'); await call('Network.enable');
  await call('Network.setBlockedURLs', { urls: ['*mc.yandex*', '*challenges.cloudflare*'] });
  const waitForPage = async url => {
    let ready = false;
    for (let i = 0; i < 150; i++) {
      ready = await evaluate(`location.href.split('#')[0] === ${JSON.stringify(url)} && document.readyState === 'complete'`);
      if (ready) break;
      await delay(100);
    }
    assert.ok(ready, `Страница не загрузилась: ${url}`);
    await evaluate(`Promise.all(Array.from(document.images, image => { image.loading = 'eager'; return image.decode().catch(() => false); }))`);
    await evaluate('document.fonts.ready.then(() => true)');
  };
  const navigate = async url => { await call('Page.navigate', { url: origin + url }); await waitForPage(origin + url); };
  const screenshot = async name => {
    const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, name), Buffer.from(result.data, 'base64'));
  };
  const { tasks } = readOgeCatalog(undefined, section);
  const stats = ogeTopicStats(tasks, section);
  const picture = tasks.find(task => task.fragment.includes('class="fipi-picture"'));
  const shared = tasks.find(task => ogeTaskMatchesTopic(task, 'practical', section));
  const sampleTopic = bank.topics.flatMap(group => group.children.map(([code]) => code)).find(code => stats.counts[code] > 12);
  const lastPage = Math.ceil(tasks.length / 12);
  const report = { pages: [], interactions: [], noJavaScript: [], errors: [] };
  const answerTypes = [...new Set(tasks.map(task => task.answerType))];
  const representatives = answerTypes.map(type => tasks.find(task => task.answerType === type));
  const paths = [...new Set([bank.path, `${bank.path}?topic=all`, `${bank.path}?topic=${sampleTopic}&page=2`, `${bank.path}?topic=all&page=${lastPage}`, ...(shared ? [`${bank.path}?topic=practical`, `/tasks/${shared.id}`] : []), `${bank.path}?topic=all&q=${tasks[0].sourceId}`, `/tasks/${picture.id}`, ...representatives.map(task => `/tasks/${task.id}`)])];
  for (const width of [1280, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const url of paths) {
      await navigate(url);
      const info = await evaluate(`({ title: document.title, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        h1: document.querySelectorAll('h1').length, tasks: document.querySelectorAll('.qblock[id]').length,
        controls: document.querySelectorAll('.solution-controls').length, images: Array.from(document.images).filter(image => image.src.includes(${JSON.stringify(bank.assetPrefix)})).length,
        broken: Array.from(document.images).filter(image => image.src.includes(${JSON.stringify(bank.assetPrefix)}) && !image.naturalWidth).map(image => image.src),
        clipped: Array.from(document.querySelectorAll('.qblock[id]')).flatMap(task => {
          const bounds = task.getBoundingClientRect();
          return Array.from(task.querySelectorAll('form, p, input[type="text"], select, .fipi-picture')).filter(element => {
            const rect = element.getBoundingClientRect();
            // Wide source data tables scroll locally, so every column stays accessible.
            const table = element.closest('table.MsoNormalTable');
            if (table && getComputedStyle(table).overflowX === 'auto') return false;
            return rect.width > 0 && (rect.right > bounds.right + 1 || rect.left < bounds.left - 1 || element.scrollWidth > element.clientWidth + 1);
          }).map(element => ({ task: task.id, tag: element.tagName, width: element.clientWidth, scrollWidth: element.scrollWidth }));
        }),
        hidden: document.documentElement.classList.contains('page-loading') })`);
      if (info.h1 !== 1 || info.hidden || info.tasks !== info.controls || info.scrollWidth > width + 1 || info.broken.length || info.clipped.length) report.errors.push({ url, width, info });
      report.pages.push({ url, width, ...info });
      if (url === bank.path || url === `/tasks/${picture.id}` || (shared && url === `/tasks/${shared.id}`)) {
        if (url.startsWith('/tasks/')) await evaluate(`(() => {
          const header = document.querySelector('.local-header');
          const offset = getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height + 12 : 12;
          window.scrollTo(0, document.querySelector('.qblock[id]').getBoundingClientRect().top + window.scrollY - offset);
        })()`);
        await screenshot(`${url === bank.path ? 'hub' : url.slice(7)}-${width}.png`);
      }
    }
    await navigate(bank.path + '?topic=all');
    await evaluate(`document.querySelector('.oge-pager a[rel="next"]').click()`);
    await waitForPage(origin + bank.path + '?topic=all&page=2');
    assert.equal(await evaluate('document.querySelectorAll(".qblock[id]").length'), 12);
    report.interactions.push({ width, action: 'next-page', passed: true });
    await evaluate(`document.querySelector('#oge-query').value = ${JSON.stringify(tasks[0].sourceId)}; document.querySelector('#oge-query').form.requestSubmit()`);
    await waitForPage(origin + `${bank.path}?topic=all&q=${tasks[0].sourceId}`);
    assert.equal(await evaluate('document.querySelectorAll(".qblock[id]").length'), 1);
    report.interactions.push({ width, action: 'search', passed: true });
    await evaluate('document.querySelector(".solution-button").click()');
    let unavailable = false;
    for (let i = 0; i < 50; i++) {
      unavailable = await evaluate('document.querySelector(".solution-result")?.textContent.includes("Решение ещё не опубликовано.")');
      if (unavailable) break;
      await delay(100);
    }
    assert.ok(unavailable, 'Честное сообщение об отсутствии решения');
    report.interactions.push({ width, action: 'unpublished-solution', passed: true });
    await call('Emulation.setScriptExecutionDisabled', { value: true });
    for (const url of [bank.path + (shared ? '?topic=practical' : '?topic=all'), `/tasks/${shared?.id || picture.id}`]) {
      await navigate(url);
      const info = await evaluate(`({ tasks: document.querySelectorAll('.qblock[id]').length,
        shared: document.querySelectorAll('.oge-shared-condition').length,
        visible: Array.from(document.querySelectorAll('.qblock[id]')).every(task => task.getBoundingClientRect().height > 0 && getComputedStyle(task).visibility !== 'hidden'),
        broken: Array.from(document.images).filter(image => image.src.includes(${JSON.stringify(bank.assetPrefix)}) && !image.naturalWidth).length })`);
      assert.ok(info.visible && (!shared || info.shared === info.tasks) && info.broken === 0, `${url}: условие и рисунки без JavaScript`);
      report.noJavaScript.push({ width, url, ...info });
    }
    await call('Emulation.setScriptExecutionDisabled', { value: false });
    console.log(`width=${width} pages=${paths.length} interactions=3 noJavaScript=2`);
  }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify({ pages: report.pages.length, interactions: report.interactions.length, noJavaScript: report.noJavaScript.length, errors: 0, artifacts: output }));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  socket?.close();
  // Preserve the isolated profile with the report; no shared browser data is touched.
  if (processChrome.exitCode === null) {
    const stopped = new Promise(resolve => processChrome.once('exit', resolve));
    processChrome.kill();
    await stopped;
  }
});
