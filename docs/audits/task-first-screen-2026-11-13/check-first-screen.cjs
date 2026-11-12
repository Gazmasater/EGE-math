const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const pw = require(process.env.PLAYWRIGHT_MODULE || path.join(__dirname, 'tools/node_modules/playwright'));
const origin = process.env.SITE_ORIGIN || 'http://127.0.0.1:8877';
const engine = process.env.AUDIT_ENGINE || 'chromium';
const baselineMode = process.env.CAPTURE_BASELINE === '1';
const root = __dirname, out = process.env.AUDIT_ARTIFACTS || path.join(root, baselineMode ? 'baseline' : engine + '-preview');
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'fixtures.json')));
const baseline = baselineMode ? null : JSON.parse(fs.readFileSync(path.join(root, 'baseline/report.json')));
const report = {origin, engine, baselineMode, startedAt: new Date().toISOString(), cases: [], interactions: [], errors: [], blockedWrites: 0,
  limitations: ['Linux browsers with phone profiles, not a physical iPhone or Yandex Start', 'Analytics and paid ads intercepted; 600px ad simulated']};
fs.mkdirSync(out, {recursive: true});
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const save = () => fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
async function context(browser, width, javascript = true) {
  const c = await browser.newContext({...pw.devices['iPhone 13'], viewport: {width, height: width === 320 ? 568 : width === 375 ? 667 : width >= 1000 ? 960 : 844},
    deviceScaleFactor: 1, isMobile: width < 1000, javaScriptEnabled: javascript, locale: 'ru-RU', serviceWorkers: 'block'});
  await c.addInitScript(() => {
    window.ym = (id, method, name, params, callback) => {
      if (method === 'reachGoal') {
        const goals = JSON.parse(sessionStorage.getItem('test_goals') || '[]'); goals.push({name, params}); sessionStorage.setItem('test_goals', JSON.stringify(goals));
      }
      callback?.();
    };
  });
  await c.route('**/*', route => {
    const req = route.request(), u = new URL(req.url());
    if (['blob:', 'data:'].includes(u.protocol)) return route.continue();
    if (!['GET', 'HEAD'].includes(req.method())) {report.blockedWrites++; return route.abort();}
    if (u.origin === new URL(origin).origin) return route.continue();
    if (u.hostname === 'yandex.ru' && u.pathname === '/ads/system/context.js') return route.fulfill({contentType: 'application/javascript', body:
      `window.Ya={Context:{AdvManager:{render(opts){const e=document.createElement('div');e.style.cssText='height:600px;background:#dce6f0';e.textContent='Тестовая реклама 600 px';document.getElementById(opts.renderTo).append(e);opts.onRender();}}}};(window.yaContextCb||[]).forEach(fn=>fn());`});
    return route.abort();
  });
  return c;
}
async function ready(page) {
  await page.waitForFunction(() => document.readyState === 'complete' && !document.documentElement.classList.contains('page-loading'));
  await page.evaluate(() => document.fonts.ready);
}
async function inspect(page) {
  return page.evaluate(() => {
    const condition = document.querySelector('.qblock'), cell = condition.querySelector('.cell_0') || condition;
    const clean = cell.cloneNode(true); clean.querySelectorAll('script').forEach(e => e.remove());
    const promo = document.querySelector('.prep-banner'), solution = document.querySelector('.seo-task-solution');
    const primary = document.querySelector('.task-heading .task-solution-jump');
    const meta = {title: document.title, canonical: document.querySelector('link[rel="canonical"]').href,
      description: document.querySelector('meta[name="description"]').content,
      structuredData: [...document.querySelectorAll('script[type="application/ld+json"]')].map(e => JSON.parse(e.textContent))};
    return {width: innerWidth, height: innerHeight, conditionY: condition.getBoundingClientRect().top,
      conditionBottom: condition.getBoundingClientRect().bottom, promoY: promo.getBoundingClientRect().top,
      solutionBottom: solution?.getBoundingClientRect().bottom, h1Count: document.querySelectorAll('h1').length,
      adCount: document.querySelectorAll('[data-site-ad]').length, promoCount: document.querySelectorAll('.prep-banner').length,
      editorialY: document.querySelector('.visitor-updates')?.getBoundingClientRect().top,
      overflow: document.documentElement.scrollWidth > innerWidth + 1, hasSolution: !!solution,
      primary: primary ? {href: primary.getAttribute('href'), height: primary.getBoundingClientRect().height, y: primary.getBoundingClientRect().y,
        background: getComputedStyle(primary).backgroundColor} : null,
      topic: document.querySelector('.task-heading-topic')?.textContent.trim(),
      content: {text: clean.textContent.replace(/\s+/g, ' ').trim(), mathCount: clean.querySelectorAll('math').length,
        fractions: clean.querySelectorAll('mfrac').length, roots: clean.querySelectorAll('msqrt,mroot').length}, meta};
  });
}
(async () => {
  const browser = engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({executablePath: '/opt/google/chrome/chrome', args: ['--no-sandbox']});
  report.browserVersion = browser.version();
  try {
    const matrix = baselineMode ? fixtures.map(id => [id, 390]) : engine === 'webkit'
      ? [...fixtures.map(id => [id, 390]), ['FDA042', 375], ['083006', 430]]
      : [...fixtures.flatMap(id => [[id, 390], [id, 1280]]), ['FDA042', 320], ['FDA042', 375], ['083006', 430], ['C0261C', 375]];
    const contexts = new Map();
    try {
      for (const [id, width] of matrix) {
        if (!contexts.has(width)) contexts.set(width, await context(browser, width));
        const page = await contexts.get(width).newPage(); page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(30000);
        page.on('pageerror', e => report.errors.push({id, width, message: e.message}));
        try {
          const response = await page.goto(origin + '/tasks/' + id); assert.equal(response.status(), 200); await ready(page);
          const info = await inspect(page); const contentHash = hash(info.content), metaHash = hash(info.meta);
          const record = {id, ...info, contentHash, metaHash}; delete record.content; delete record.meta;
          if (!baselineMode) {
            const previous = baseline.cases.find(c => c.id === id);
            assert.equal(contentHash, previous.contentHash, 'Original condition content and MathML preserved: ' + id);
            assert.equal(metaHash, previous.metaHash, 'SEO title/canonical/description/JSON-LD preserved: ' + id);
            assert.equal(info.h1Count, 1); assert.equal(info.adCount, 1); assert.equal(info.promoCount, 1); assert.equal(info.overflow, false);
            assert.ok(info.conditionY < Math.min(info.height - 100, 600), 'Condition visible on first screen: ' + JSON.stringify({id, width, y: info.conditionY}));
            assert.ok(info.promoY > (info.solutionBottom || info.conditionBottom), 'Promotion follows the main task and explanation');
            if (info.editorialY !== undefined) assert.ok(info.editorialY > info.conditionBottom);
            assert.ok(info.topic);
            if (info.hasSolution) {assert.ok(info.primary); assert.ok(info.primary.height >= 48); assert.equal(info.primary.background, 'rgb(24, 49, 83)');}
            else {assert.equal(info.primary, null); record.unpublishedHandled = true;}
          }
          if (width === 390 && ['FDA042', '083006', 'EGEINF1F25B2'].includes(id)) {
            record.screenshot = id + '-390.jpg'; await page.screenshot({path: path.join(out, record.screenshot), type: 'jpeg', quality: 80});
          }
          if (!baselineMode && width === 390 && id === 'FDA042') {
            await page.evaluate(() => sessionStorage.setItem('test_goals', '[]'));
            await page.locator('.task-heading .task-solution-jump').tap(); await page.waitForTimeout(1250);
            const result = await page.evaluate(() => ({y: document.querySelector('.seo-task-solution h2').getBoundingClientRect().y,
              headerBottom: document.querySelector('.site-header').getBoundingClientRect().bottom,
              goals: JSON.parse(sessionStorage.getItem('test_goals')).filter(g => g.name === 'solution_open' && g.params.placement === 'task_page')}));
            assert.ok(result.y >= result.headerBottom - 1); assert.ok(result.y < 844); assert.equal(result.goals.length, 1);
            await page.goBack(); await ready(page);
            await page.locator('.solution-button:visible').first().tap(); await page.locator('.solution-modal .solution-text').waitFor();
            const next = page.locator('.solution-modal .task-next-action'), href = await next.getAttribute('href');
            await page.evaluate(() => sessionStorage.setItem('test_goals', '[]'));
            await next.tap(); await page.waitForURL(origin + href); await ready(page);
            const goals = await page.evaluate(() => JSON.parse(sessionStorage.getItem('test_goals')).filter(g => g.name === 'next_task'));
            assert.equal(goals.length, 1); assert.equal(goals[0].params.navigation_area, 'dialog');
            report.interactions.push({type: 'native-solution-jump-back-modal-next', width, anchorY: result.y, nextGoal: goals[0]});
          }
          report.cases.push({...record, passed: true}); save(); console.log(id, width, 'PASS', Math.round(info.conditionY));
        } finally {await page.close();}
      }
    } finally {for (const c of contexts.values()) await c.close();}
    if (!baselineMode && engine === 'webkit') {
      const c = await context(browser, 375, false), page = await c.newPage();
      try {
        await page.goto(origin + '/tasks/FDA042'); const action = page.locator('.task-heading .task-solution-jump');
        await action.tap(); assert.ok(new URL(page.url()).hash.startsWith('#solution-'));
        report.cases.push({id: 'FDA042', width: 375, javascript: false, passed: true}); console.log('No JavaScript PASS');
      } finally {await c.close();}
    }
    assert.equal(report.blockedWrites, 0); assert.deepEqual(report.errors, []);
  } finally {await browser.close();}
})().catch(e => {report.errors.push({message: e.stack}); process.exitCode = 1;}).finally(() => {
  report.finishedAt = new Date().toISOString(); save();
  process.stdout.write('SUMMARY ' + JSON.stringify({cases: report.cases.length, errors: report.errors.length}) + '\n', () => process.exit(process.exitCode || 0));
});
