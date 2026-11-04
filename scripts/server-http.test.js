'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const {spawn} = require('node:child_process');
const {once} = require('node:events');

test('isolated HTTP server: authentication, forms, redirects and catalogue routes', {timeout: 90000}, async t => {
  const root = path.resolve(__dirname, '..');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ege-http-test-'));
  const password = 'local-test-password';
  const passwordFile = path.join(directory, 'admin-password');
  fs.writeFileSync(passwordFile, password);
  // Exercise the update failure path without contacting FIPI or replacing any
  // source file. A delayed failure also makes concurrent updates observable.
  const preload = path.join(directory, 'offline-fipi.cjs');
  fs.writeFileSync(preload, `
    const https = require('node:https');
    const {EventEmitter} = require('node:events');
    https.request = () => {
      const request = new EventEmitter();
      request.write = () => {};
      request.destroy = error => request.emit('error', error);
      request.end = () => {
        console.log('AUDIT_FIPI_STARTED');
        setTimeout(() => request.emit('error', new Error('<script>internal-error</script> /private/path')), 500);
      };
      return request;
    };
  `);
  const probe = net.createServer().listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['--require', preload, 'server.js'], {
    cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: {...process.env, PORT: String(port), TURNSTILE_ENABLED: '0',
      TELEGRAM_BOT_TOKEN: '', TELEGRAM_ORDERS_CHAT_ID: '',
      EGE_ADMIN_PASSWORD_FILE: passwordFile,
      EGE_SOLUTIONS_DB: path.join(directory, 'solutions.sqlite'),
      EGE_LEADS_DB: path.join(directory, 'leads.sqlite')}
  });
  let output = '';
  child.stdout.on('data', chunk => {output += chunk;});
  child.stderr.on('data', chunk => {output += chunk;});
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
    // Only the exact temporary directory created by this test is removed.
    fs.rmSync(directory, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
  });
  const origin = `http://127.0.0.1:${port}`;
  const send = async (route, options = {}) => {
    const response = await fetch(origin + route, {redirect: 'manual', signal: AbortSignal.timeout(20000), ...options});
    return {status: response.status, headers: response.headers, body: await response.text()};
  };
  for (let attempt = 0; ; attempt++) {
    if (output.includes(`http://localhost:${port}`)) break;
    if (child.exitCode !== null || attempt >= 200) throw new Error('Server did not start: ' + output);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  const post = (route, body = '', headers = {}) => send(route, {
    method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded', origin, ...headers}, body
  });

  await t.test('anonymous and cross-site requests cannot update source banks', async () => {
    for (const route of ['/update', '/admin/update']) assert.equal((await post(route)).status, 403);
    assert.equal((await send('/admin/update')).status, 405);
    for (const route of ['/admin/login', '/admin/logout', '/admin/solutions/ABCD']) {
      assert.equal((await post(route, '', {origin: 'https://other.invalid'})).status, 403);
    }
  });

  let adminCookie;
  await t.test('admin authentication uses a secure, private session', async () => {
    const login = await post('/admin/login', new URLSearchParams({password}));
    assert.equal(login.status, 303);
    const cookie = login.headers.get('set-cookie');
    assert.match(cookie, /; Secure;/);
    assert.match(cookie, /; HttpOnly;/);
    adminCookie = cookie.split(';')[0];
    const page = await send('/admin', {headers: {cookie: adminCookie}});
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('cache-control'), 'no-store');
    assert.equal(page.headers.get('x-frame-options'), 'DENY');
    assert.doesNotMatch(page.body, /mc\.yandex|metrika\/tag/);
    assert.doesNotMatch((await send('/admin/login')).body, /mc\.yandex|metrika\/tag/);
    assert.match(page.body, /action="\/admin\/update"/);
    assert.equal((await post('/admin/update', 'section=unknown', {cookie: adminCookie})).status, 400);
    assert.equal((await post('/admin/update', '', {cookie: adminCookie, origin: 'https://other.invalid'})).status, 403);
  });

  await t.test('oversized forms return 413 and leave the service usable', async () => {
    const response = await post('/api/study-leads', 'message=' + 'x'.repeat(17000));
    assert.equal(response.status, 413);
    assert.match(response.body, /16 КБ/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await send('/robots.txt')).status, 200);
  });

  await t.test('updates are serialized and recover after an upstream failure without exposing internals', async () => {
    const original = fs.readFileSync(path.join(root, 'mathematics-1.raw.html'));
    const first = post('/admin/update', 'section=mathematics', {cookie: adminCookie});
    for (let attempt = 0; !output.includes('AUDIT_FIPI_STARTED'); attempt++) {
      if (attempt > 100) throw new Error('Update did not reach the offline FIPI stub');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal((await post('/admin/update', 'section=mathematics', {cookie: adminCookie})).status, 409);
    const failed = await first;
    assert.equal(failed.status, 500);
    assert.doesNotMatch(failed.body, /script|internal-error|private\/path/);
    assert.equal((await post('/admin/update', 'section=mathematics', {cookie: adminCookie})).status, 500, 'failure releases the update lock');
    assert.ok(fs.readFileSync(path.join(root, 'mathematics-1.raw.html')).equals(original));
  });

  await t.test('malformed asset URLs are client errors with no stack or file paths', async () => {
    for (const route of ['/fipi/%ZZ', '/fipi/%00']) {
      const response = await send(route);
      assert.equal(response.status, 400);
      assert.doesNotMatch(response.body, /Error:|server\.js|node:|C:\\|<pre>/);
    }
  });

  await t.test('editor saves Python division and still rejects unformatted mathematical fractions', async () => {
    const solution = 'Вычислим целую часть.\n\n```python\nprint(5 // 2)\nprint(5 / 2)\n```';
    assert.equal((await post('/admin/solutions/EGEINFABCDEF', new URLSearchParams({solution, answer: '2'}), {cookie: adminCookie})).status, 303);
    const editor = await send('/admin/solutions/EGEINFABCDEF', {headers: {cookie: adminCookie}});
    assert.ok(editor.body.includes('print(5 // 2)'));
    assert.equal((await post('/admin/solutions/ABCDEF', 'solution=1%2F2', {cookie: adminCookie})).status, 422);
    assert.equal((await send('/api/solutions/EGEINFABCDEF')).status, 404, 'draft stays private');
  });

  await t.test('account redirects cannot become external URLs or invalid response headers', async () => {
    const registration = await post('/account/register', new URLSearchParams({full_name: 'Тестовый Пользователь', city: 'Москва', email: 'http-test@example.test', password: 'test-password-123', consent: '1'}));
    assert.equal(registration.status, 303);
    const cookie = registration.headers.getSetCookie().find(value => value.startsWith('ege_math_user=')).split(';')[0];
    for (const next of ['/\t/evil.test', '/a/..//evil.test']) {
      const response = await send('/account/login?next=' + encodeURIComponent(next), {headers: {cookie}});
      assert.equal(response.status, 303);
      assert.equal(response.headers.get('location'), '/');
    }
    const response = await send('/account/login?next=' + encodeURIComponent('/search?q=корень'), {headers: {cookie}});
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), '/search?q=%D0%BA%D0%BE%D1%80%D0%B5%D0%BD%D1%8C');
    assert.equal((await send('/account/login', {headers: {cookie: 'ege_math_user=' + '9'.repeat(400) + '.9999999999.fake'}})).status, 200);
  });

  await t.test('catalogues and not-found pages preserve their public HTTP contract', async () => {
    for (const route of ['/', '/ege', '/physics', '/oge', '/oge-physics', '/oge-informatics', '/ege-informatics']) {
      const page = await send(route);
      assert.equal(page.status, 200, route);
      assert.match(page.body, /lang="ru"/);
      assert.equal((page.body.match(/<h1(?:\s|>)/g) || []).length, 1, route);
    }
    for (const route of ['/', '/physics', '/oge', '/about', '/fipi/styles.css']) {
      assert.equal((await post(route)).status, 405, route);
    }
    for (const route of ['/unknown', '/oge?page=0', '/oge?topic=unknown', '/tasks/UNKNOWN']) {
      assert.equal((await send(route)).status, 404, route);
    }
  });

  await t.test('admin login is throttled even with spoofed forwarded prefixes', async () => {
    for (let attempt = 0; attempt < 11; attempt++) {
      const response = await post('/admin/login', 'password=wrong', {'x-forwarded-for': `192.0.2.${attempt + 1}, 198.51.100.1`});
      assert.equal(response.status, attempt < 10 ? 401 : 429);
    }
  });
});
