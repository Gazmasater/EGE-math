// Same-origin window.name preserves only synthetic test events across navigation.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pw, makeContext, scenario} = require('./audit.cjs');
const output = process.env.AUDIT_ARTIFACTS || __dirname;
const label = process.env.AUDIT_LABEL || 'narrow-goals';
const result = {startedAt: new Date().toISOString(), cases: [], errors: [],
  note: '375px viewport, analytics stub; goal counts are test instrumentation, not real Metrica requests'};
(async () => {
  for (const engine of (process.env.AUDIT_ENGINES || 'chromium,webkit').split(',')) {
    const browser = await (engine === 'webkit' ? pw.webkit.launch() : pw.chromium.launch({executablePath: '/opt/google/chrome/chrome', args: ['--no-sandbox']}));
    try {
      for (const mode of ['empty', 'delayed']) {
        const viewport = {width: 375, height: 667};
        const {context, network} = await makeContext(browser, engine, mode, viewport);
        await context.addInitScript(() => {
          document.addEventListener('DOMContentLoaded', () => {
            const ym = window.ym;
            window.ym = (...args) => {
              if (args[1] === 'reachGoal') {
                const events = JSON.parse(window.name || '[]');
                events.push({event: args[2], params: args[3]});
                window.name = JSON.stringify(events);
              }
              return ym(...args);
            };
          });
        });
        const page = await context.newPage();
        page.setDefaultTimeout(12000);
        try {
          const test = await scenario(page, engine, mode, '/tasks/FDA042', viewport, network);
          const goals = await page.evaluate(() => JSON.parse(window.name || '[]'));
          const next = goals.filter(x => x.event === 'next_task');
          const opened = goals.filter(x => x.event === 'solution_open' && x.params?.placement === 'dialog');
          assert.equal(next.length, 1, 'Exactly one next_task for one forward action');
          assert.equal(opened.length, 3, 'Three dialog openings; the inline task_page view is a separate supported placement');
          assert.ok(network.blockedWrites === 0, 'No production writes attempted');
          result.cases.push({...test, goals, passed: true});
          console.log(engine, mode, '375px and goal counts PASS');
        } catch (error) {
          result.errors.push({engine, mode, message: error.message,
            instrumentation: await page.evaluate(() => ({persisted: JSON.parse(window.name || '[]'),
              currentDocument: window.__auditGoals, url: location.pathname + location.search,
              navigationType: performance.getEntriesByType('navigation')[0]?.type})).catch(() => null)});
          console.log(engine, mode, 'FAIL', error.message.slice(0, 200));
        } finally {await context.close();}
      }
    } finally {await browser.close();}
  }
})().catch(error => result.errors.push({message: error.stack})).finally(() => {
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, label + '.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('SUMMARY', JSON.stringify({cases: result.cases.length, errors: result.errors.length}));
  if (result.errors.length) process.exitCode = 1;
});
