const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {webkit, devices} = require(process.env.PLAYWRIGHT_MODULE || path.join(__dirname, 'tools/node_modules/playwright'));
const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:8877';
const out = process.env.UI_ARTIFACTS || path.join(__dirname, 'webkit-preview');
fs.mkdirSync(out, {recursive: true});
const report = {origin, startedAt: new Date().toISOString(), cases: [], errors: [], blockedWrites: 0,
  limitations: ['Linux WebKit with iPhone profile; no physical iPhone or native Yandex Start',
    'Analytics and real ads replaced; all production writes blocked; controlled 600px ad creative']};
const save = () => fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
async function ready(page) {
  await page.waitForFunction(() => document.readyState === 'complete' && !document.documentElement.classList.contains('page-loading'));
  await page.evaluate(() => document.fonts.ready);
}
async function context(browser, width, javascript = true) {
  const c = await browser.newContext({...devices['iPhone 13'], viewport: {width, height: width === 375 ? 667 : 844},
    deviceScaleFactor: 1, javaScriptEnabled: javascript, locale: 'ru-RU', serviceWorkers: 'block'});
  await c.addInitScript(() => {
    window.ym = (id, method, name, params, callback) => {
      if (method === 'reachGoal') {
        const goals = JSON.parse(sessionStorage.getItem('next_test_goals') || '[]');
        goals.push({name, params}); sessionStorage.setItem('next_test_goals', JSON.stringify(goals));
      }
      if (callback && !window.__blockCallback) callback();
    };
  });
  await c.route('**/*', route => {
    const req = route.request(), u = new URL(req.url());
    if (['blob:', 'data:'].includes(u.protocol)) return route.continue();
    if (!['GET', 'HEAD'].includes(req.method())) {report.blockedWrites++; return route.abort();}
    if (u.origin === new URL(origin).origin) return route.continue();
    if (u.hostname === 'yandex.ru' && u.pathname === '/ads/system/context.js') return route.fulfill({contentType: 'application/javascript', body: `
      window.Ya={Context:{AdvManager:{render(opts){const slot=document.getElementById(opts.renderTo);
        const d=document.createElement('div');d.style.cssText='height:600px;background:#e1e7ee';d.textContent='Тестовая реклама';slot.append(d);opts.onRender();}}}};
      (window.yaContextCb||[]).forEach(fn=>fn());`});
    return route.abort();
  });
  return c;
}
async function actionInfo(action) {
  return action.evaluate(a => {
    const r = a.getBoundingClientRect(), nav = a.closest('nav'), s = getComputedStyle(a);
    return {href: a.getAttribute('href'), area: a.dataset.analyticsNavigationArea, width: r.width, height: r.height,
      navWidth: nav.getBoundingClientRect().width, background: s.backgroundColor, color: s.color, first: nav.firstElementChild === a,
      minHeight: s.minHeight, display: s.display, className: a.className};
  });
}
async function screenshot(page, name) {
  await page.screenshot({path: path.join(out, name), type: 'jpeg', quality: 78});
  return name;
}
(async () => {
  const browser = await webkit.launch();
  report.browserVersion = browser.version();
  try {
    for (const width of (process.env.AUDIT_PARTS === 'catalogues' ? [] : [375, 390, 430])) {
      const c = await context(browser, width), page = await c.newPage();
      page.setDefaultTimeout(12000);
      page.on('pageerror', e => report.errors.push({width, message: e.message}));
      try {
        for (const area of ['top', 'after_solution', 'dialog']) {
          await page.goto(origin + '/tasks/FDA042'); await ready(page);
          let selector = `[data-analytics-next-task][data-analytics-navigation-area="${area}"]`;
          if (area === 'dialog') {
            await page.locator('.solution-button:visible').first().tap();
            await page.locator('.solution-modal .solution-text').waitFor({state: 'visible'});
            await page.locator('.solution-modal img').evaluateAll(images => images.forEach(i => {i.loading = 'eager';}));
            await page.waitForFunction(() => [...document.querySelectorAll('.solution-modal img')].every(i => i.complete && i.naturalWidth));
            await page.locator('.solution-modal').evaluate(e => {e.scrollTop=e.scrollHeight;});
            const close = await page.locator('.solution-modal-close').boundingBox();
            assert.ok(close.y >= 0 && close.y + close.height <= page.viewportSize().height, 'Close remains visible after long solution');
            await page.evaluate(() => {window.__blockCallback = true;});
          }
          const action = page.locator(selector);
          await action.scrollIntoViewIfNeeded();
          const info = await actionInfo(action);
          if (area !== 'top') {
            assert.ok(info.height >= 48); assert.ok(info.width >= info.navWidth - 26);
            assert.equal(info.background, 'rgb(24, 49, 83)'); assert.equal(info.color, 'rgb(255, 255, 255)');
            assert.ok(info.first);
          }
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          const test = {width, area, ...info};
          if (width === 390 && area !== 'top') test.screenshot = await screenshot(page, area + '-390.jpg');
          await page.evaluate(() => sessionStorage.setItem('next_test_goals', '[]'));
          if (width === 430) {await action.focus(); await page.keyboard.press('Enter'); test.keyboard = true;}
          else if (width === 390 && area === 'after_solution') {await action.evaluate(a => {a.click(); a.click();}); test.doubleClick = true;}
          else await action.tap();
          await page.waitForURL(origin + info.href); await ready(page);
          const goals = await page.evaluate(() => JSON.parse(sessionStorage.getItem('next_test_goals') || '[]').filter(g => g.name === 'next_task'));
          assert.equal(goals.length, 1); assert.equal(goals[0].params.placement, 'task_page');
          assert.equal(goals[0].params.navigation_area, area);
          await page.goBack(); await ready(page);
          assert.equal(new URL(page.url()).pathname, '/tasks/FDA042');
          assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('next_test_goals')).filter(g => g.name === 'next_task').length), 1);
          report.cases.push({...test, goal: goals[0], passed: true}); save();
          console.log(width, area, 'PASS');
        }
      } finally {await c.close();}
    }
    for (const [route, placement] of [['/?topic=1.2#tasks', 'catalogue_dialog'], ['/oge?topic=all', 'oge_catalogue_dialog'], ['/oge-physics?topic=all', 'oge_catalogue_dialog']]) {
      const c = await context(browser, 390), page = await c.newPage(); page.setDefaultTimeout(12000);
      try {
        await page.goto(origin + route); await ready(page);
        await page.locator('.solution-button:visible').first().tap();
        await page.locator('.solution-modal .solution-text').waitFor({state: 'visible'});
        const next = page.locator('.solution-modal .task-next-action');
        await next.scrollIntoViewIfNeeded();
        const info = await actionInfo(next); console.log('Catalogue action', route, JSON.stringify(info));
        assert.equal(info.area, 'dialog'); assert.ok(info.height >= 48, JSON.stringify(info));
        await page.evaluate(() => sessionStorage.setItem('next_test_goals', '[]'));
        await next.tap(); await page.waitForTimeout(300); await ready(page);
        const goals = await page.evaluate(() => JSON.parse(sessionStorage.getItem('next_test_goals')).filter(g => g.name === 'next_task'));
        assert.equal(goals.length, 1); assert.equal(goals[0].params.placement, placement); assert.equal(goals[0].params.navigation_area, 'dialog');
        report.cases.push({route, goal: goals[0], passed: true}); save(); console.log(route, 'PASS');
      } finally {await c.close();}
    }
    const c = await context(browser, 375, false), page = await c.newPage();
    try {
      await page.goto(origin + '/tasks/FDA042');
      const action = page.locator('.task-sequence-pager--after-solution .task-next-action');
      const href = await action.getAttribute('href'); await action.tap(); await page.waitForURL(origin + href);
      report.cases.push({javascript: false, nextHref: href, passed: true}); console.log('No JavaScript PASS');
    } finally {await c.close();}
  } finally {await browser.close();}
  assert.equal(report.blockedWrites, 0); assert.deepEqual(report.errors, []);
})().catch(error => {report.errors.push({message: error.stack}); process.exitCode = 1;}).finally(() => {
  report.finishedAt = new Date().toISOString(); save();
  process.stdout.write('SUMMARY ' + JSON.stringify({cases: report.cases.length, errors: report.errors.length}) + '\n',
    () => process.exit(process.exitCode || 0));
});
