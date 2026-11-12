// Public read-only browser audit. Analytics, paid ads and all writes are intercepted.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const pw = require(process.env.PLAYWRIGHT_MODULE || path.join(__dirname, 'tools/node_modules/playwright'));
const root = process.env.AUDIT_ARTIFACTS || __dirname;
const origin = process.env.AUDIT_ORIGIN || 'https://ege-fipi.ru';
const label = process.env.AUDIT_LABEL || 'baseline';
const report = {startedAt: new Date().toISOString(), origin, label, cases: [], errors: [],
  limitations: ['Linux WebKit with iPhone profile, not physical iOS or the Yandex Start native application',
    'Real ad SDK/impressions and analytics blocked; controlled ad rendering, errors and timing',
    'Viewport resize simulates available space, not the native dynamic address bar; no physical gestures']};
fs.mkdirSync(path.join(root, 'screens'), {recursive: true});
const save = () => fs.writeFileSync(path.join(root, label + '.json'), JSON.stringify(report, null, 2) + '\n');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const slug = x => x.replace(/[^a-z0-9]/gi, '-');

async function makeContext(browser, engine, mode, viewport) {
  const device = engine === 'webkit' ? pw.devices['iPhone 13'] : pw.devices['Pixel 7'];
  const context = await browser.newContext({...device, viewport, deviceScaleFactor: 1,
    locale: 'ru-RU', timezoneId: 'Europe/Moscow', serviceWorkers: 'block'});
  const network = {blockedWrites: 0, blockedExternal: {}, solutionRequests: 0};
  let failSolution = mode === 'api-error';
  await context.addInitScript(({mode}) => {
    window.__auditGoals = [];
    window.__auditAdReady = false;
    window.ym = (id, method, event, params, callback) => {
      if (method === 'reachGoal') window.__auditGoals.push({event, params});
      if (typeof callback === 'function') callback();
    };
    window.__adMode = mode;
  }, {mode});
  await context.route('**/*', async route => {
    const request = route.request();
    const u = new URL(request.url());
    if (['blob:', 'data:'].includes(u.protocol)) return route.continue();
    if (!['GET', 'HEAD'].includes(request.method())) {
      network.blockedWrites++;
      return route.abort();
    }
    if (u.origin === new URL(origin).origin) {
      if (/^\/api\/solutions\//.test(u.pathname)) {
        network.solutionRequests++;
        if (failSolution) {
          failSolution = false;
          return route.fulfill({status: 503, contentType: 'application/json', body: '{}'});
        }
        if (mode === 'slow-api') await wait(1500);
      }
      if (process.env.AUDIT_CATALOGUE_JS && /\/assets\/catalogue\.[a-f0-9]+\.js$/.test(u.pathname)) {
        return route.fulfill({contentType: 'application/javascript', body: fs.readFileSync(process.env.AUDIT_CATALOGUE_JS)});
      }
      return route.continue();
    }
    if (u.hostname === 'yandex.ru' && u.pathname === '/ads/system/context.js') {
      if (mode === 'loader-error') return route.abort();
      const body = `window.Ya={Context:{AdvManager:{render(opts,empty){
        window.__auditAdReady=true;
        if(window.__adMode==='empty'||window.__adMode==='api-error'||window.__adMode==='slow-api'){setTimeout(empty,50);return;}
        window.__fillAd=()=>{const slot=document.getElementById(opts.renderTo);slot.replaceChildren();
          const creative=document.createElement('div');creative.style.cssText='height:600px;width:100%;background:#dce6f0;display:grid;place-items:center';
          creative.textContent='Тестовый рекламный блок 600 px';slot.append(creative);opts.onRender();};
        if(window.__adMode==='filled')setTimeout(window.__fillAd,50);
      }}}};(window.yaContextCb||[]).forEach(fn=>fn());`;
      return route.fulfill({contentType: 'application/javascript', body});
    }
    network.blockedExternal[u.hostname] = (network.blockedExternal[u.hostname] || 0) + 1;
    return route.abort();
  });
  return {context, network};
}

async function settled(page) {
  await page.waitForFunction(() => document.readyState === 'complete' && !document.documentElement.classList.contains('page-loading'));
  await page.evaluate(() => document.fonts.ready);
}

async function modalReady(page) {
  await page.locator('.solution-modal:not([hidden]) .solution-text').waitFor({state: 'visible'});
  await page.locator('.solution-modal').evaluate(e => e.querySelectorAll('img').forEach(i => {i.loading = 'eager';}));
  await page.waitForFunction(() => [...document.querySelectorAll('.solution-modal img')].every(i => i.complete && i.naturalWidth > 0));
}

async function geometry(page) {
  return page.evaluate(() => {
    const modal = document.querySelector('.solution-modal');
    const close = document.querySelector('.solution-modal-close');
    const rect = close?.getBoundingClientRect();
    const dialog = document.querySelector('.solution-modal-dialog');
    return {width: innerWidth, height: innerHeight, pageY: scrollY, pageWidth: document.documentElement.scrollWidth,
      modalScroll: modal?.scrollTop, modalHeight: modal?.scrollHeight, modalClient: modal?.clientHeight,
      close: rect ? {x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        accessible: rect.y >= 0 && rect.bottom <= innerHeight && close.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))} : null,
      dialogOverflow: dialog && getComputedStyle(dialog).overflow,
      visibleTask: [...document.querySelectorAll('.qblock')].find(e => e.getBoundingClientRect().height > 0)?.id,
      loading: document.documentElement.classList.contains('page-loading'),
      adState: document.querySelector('[data-site-ad]')?.dataset.adState};
  });
}

async function endOfSolution(page) {
  await page.locator('.solution-modal').evaluate(e => {
    const body = e.querySelector('.solution-modal-body');
    e.scrollTop = e.scrollHeight;
    body.scrollTop = body.scrollHeight;
  });
  await page.waitForTimeout(120);
  const g = await geometry(page);
  assert.ok(g.close.accessible, 'Close button must remain visible and hit-testable at the end: ' + JSON.stringify(g));
  assert.ok(g.pageWidth <= g.width + 1, 'No page horizontal overflow');
  return g;
}

async function scenario(page, engine, mode, route, viewport, network) {
  const info = {engine, mode, route, viewport};
  if (route === '/tasks/FDA042') {
    await page.goto(origin + '/ege/math');
    await settled(page);
    await page.locator('.site-search>summary').tap();
    await page.locator('#header-search').fill('FDA042');
    await page.locator('.site-search-panel button').tap();
    await page.waitForURL('**/tasks/FDA042');
    info.headerSearch = true;
  } else await page.goto(origin + route);
  await settled(page);
  const opener = page.locator('.solution-button:visible').first();
  await opener.tap();
  if (mode === 'api-error') {
    await page.locator('.solution-result:not([hidden])').first().waitFor({state: 'visible'});
    await page.waitForFunction(() => !document.querySelector('.solution-button:disabled'));
    info.apiRetry = true;
    await opener.tap();
  }
  await modalReady(page);
  if (mode === 'delayed') {
    await page.waitForFunction(() => typeof window.__fillAd === 'function');
    await page.evaluate(() => window.__fillAd());
    await page.waitForTimeout(150);
  }
  info.end = await endOfSolution(page);
  const beforeClose = await page.evaluate(() => scrollY);
  await page.locator('.solution-modal-close').tap();
  await page.locator('.solution-modal').waitFor({state: 'hidden'});
  info.afterClose = await geometry(page);
  info.closeScrollDelta = info.afterClose.pageY - beforeClose;
  assert.ok(Math.abs(info.closeScrollDelta) <= 2, 'Closing the modal changes the document scroll');
  // Cached reopen and the existing next-task link must both work after closure.
  const previousRequests = network.solutionRequests;
  await opener.tap();
  await modalReady(page);
  assert.equal(network.solutionRequests, previousRequests, 'Reopening uses the loaded solution');
  if (route === '/tasks/FDA042') {
    const original = page.viewportSize();
    await page.setViewportSize({width: original.width, height: 520});
    info.shortViewport = await endOfSolution(page);
    await page.setViewportSize({width: 844, height: 390});
    info.landscape = await endOfSolution(page);
    await page.setViewportSize(original);
    info.portrait = await endOfSolution(page);
    if (mode === 'delayed' || mode === 'empty') {
      const filename = `${label}-${engine}-${mode}-${viewport.width}-end.jpg`;
      await page.screenshot({path: path.join(root, 'screens', filename), type: 'jpeg', quality: 78});
      info.screenshot = 'screens/' + filename;
    }
  }
  const next = page.locator('.solution-modal .task-sequence-pager a');
  assert.ok(await next.count(), 'Expected next-task action');
  const before = await geometry(page);
  const href = await next.getAttribute('href');
  await next.tap();
  await page.waitForFunction(({oldUrl, oldTask}) => location.href !== oldUrl ||
    [...document.querySelectorAll('.qblock')].some(e => e.id !== oldTask && e.getBoundingClientRect().height > 0),
    {oldUrl: origin + route, oldTask: before.visibleTask});
  await settled(page);
  info.nextHref = href;
  info.afterNext = await geometry(page);
  assert.ok(!info.afterNext.loading, 'Next task is not stuck behind a loading screen');
  if (new URL(href, origin).pathname !== new URL(route, origin).pathname) {
    await page.goBack();
    await settled(page);
    info.afterBack = await geometry(page);
    assert.ok(!info.afterBack.loading, 'Browser back restores a visible page');
    const close = page.locator('.solution-modal-close:visible');
    if (await close.count()) await close.tap();
    await page.locator('.solution-button:visible').first().tap();
    await modalReady(page);
    await page.locator('.solution-modal-close').tap();
  }
  info.network = JSON.parse(JSON.stringify(network));
  return info;
}

module.exports = {pw, makeContext, scenario, geometry, modalReady};

if (require.main === module) (async () => {
  for (const engine of (process.env.AUDIT_ENGINES || 'chromium,webkit').split(',')) {
    let browser;
    try {
      browser = await (engine === 'webkit' ? pw.webkit.launch() : pw.chromium.launch({
        executablePath: '/opt/google/chrome/chrome', args: ['--no-sandbox', '--disable-background-networking']}));
      report[engine + 'Version'] = browser.version();
      for (const mode of ['empty', 'filled', 'delayed', 'loader-error', 'slow-api', 'api-error']) {
        const viewport = {width: 390, height: 844};
        const {context, network} = await makeContext(browser, engine, mode, viewport);
        const page = await context.newPage();
        page.setDefaultTimeout(12000);
        page.setDefaultNavigationTimeout(25000);
        page.on('pageerror', error => report.errors.push({engine, mode, type: 'javascript', message: error.message}));
        const routes = ['empty', 'delayed', 'filled'].includes(mode)
          ? ['/tasks/FDA042', '/tasks/6EFCFF', '/oge?topic=all'] : ['/tasks/FDA042'];
        for (const route of routes) {
          try {
            const result = await scenario(page, engine, mode, route, viewport, network);
            report.cases.push({...result, passed: true});
            console.log(engine, mode, route, 'PASS');
          } catch (error) {
            const failure = {engine, mode, route, message: error.message, geometry: await geometry(page).catch(() => null)};
            report.errors.push(failure);
            console.log(engine, mode, route, 'FAIL', error.message.slice(0, 250));
            await page.screenshot({path: path.join(root, 'screens', `${label}-${engine}-${mode}-${slug(route)}-failure.jpg`), type: 'jpeg', quality: 78}).catch(() => {});
          }
          save();
        }
        await context.close();
      }
    } catch (error) {
      report.errors.push({engine, type: 'launch', message: error.message.slice(0, 2000)});
      console.log(engine, 'LAUNCH FAIL', error.message.slice(0, 180));
    } finally {if (browser) await browser.close();}
  }
})().catch(error => report.errors.push({type: 'fatal', message: error.stack})).finally(() => {
  report.finishedAt = new Date().toISOString();
  save();
  console.log('SUMMARY', JSON.stringify({cases: report.cases.length, errors: report.errors.length}));
  if (report.errors.length) process.exitCode = 1;
});
