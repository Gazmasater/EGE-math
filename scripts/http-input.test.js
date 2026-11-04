'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {PassThrough} = require('node:stream');
const {safeRedirectPath, readForm, createRateLimiter} = require('../lib/http-input');
const {hasUnformattedDivision} = require('../lib/solution-blocks');

test('redirects stay local after browser URL normalization', () => {
  for (const value of ['//evil.test', '/\t/evil.test', '/\n/evil.test', '/\\evil.test', '/a/..//evil.test', '/%2e//evil.test', 'https://evil.test']) {
    assert.equal(safeRedirectPath(value, '/account'), '/account', JSON.stringify(value));
  }
  assert.equal(safeRedirectPath('/tasks/ABCD?q=1#solution'), '/tasks/ABCD?q=1#solution');
  assert.equal(safeRedirectPath('/search?q=корень'), '/search?q=%D0%BA%D0%BE%D1%80%D0%B5%D0%BD%D1%8C');
});

test('form limits count bytes and reject without destroying the response socket', async () => {
  const request = new PassThrough();
  const body = readForm(request, 8);
  request.write(Buffer.from('a=12345'));
  request.end(Buffer.from('67'));
  await assert.rejects(body, error => error.status === 413);
  const valid = new PassThrough();
  const result = readForm(valid, 8);
  valid.end(Buffer.from('a=123456'));
  assert.equal((await result).get('a'), '123456');
});

test('aborted forms settle instead of leaving a pending request', async () => {
  const request = new PassThrough();
  const body = readForm(request);
  request.emit('aborted');
  await assert.rejects(body, error => error.status === 400);
  request.destroy();
});

const request = (peer, forwarded) => ({socket: {remoteAddress: peer}, headers: {'x-forwarded-for': forwarded}});

test('rate limits cannot be bypassed by prepending spoofed proxy addresses', () => {
  const limited = createRateLimiter();
  assert.equal(limited(request('127.0.0.1', '192.0.2.1, 198.51.100.1'), 'login', 1, 1000), false);
  assert.equal(limited(request('127.0.0.1', '192.0.2.2, 198.51.100.1'), 'login', 1, 1000), true);
  assert.equal(limited(request('198.51.100.2', '192.0.2.3'), 'login', 1, 1000), false);
  assert.equal(limited(request('198.51.100.2', '192.0.2.4'), 'login', 1, 1000), true);
});

test('expired rate-limit clients are reclaimed and live limits survive capacity pressure', () => {
  let time = 0;
  const limited = createRateLimiter({now: () => time, maxEntries: 2});
  const check = ip => limited(request(ip), 'login', 1, 100);
  assert.equal(check('192.0.2.1'), false);
  assert.equal(check('192.0.2.2'), false);
  assert.equal(check('192.0.2.3'), true);
  assert.equal(check('192.0.2.1'), true);
  time = 100;
  assert.equal(check('192.0.2.3'), false);
  assert.equal(check('192.0.2.1'), false);
});

test('program operators are allowed only in complete supported code blocks', () => {
  assert.equal(hasUnformattedDivision('Метод.\n\n```python\nx = 5 // 2\ny = 5 / 2\n```\n\nОтвет.'), false);
  for (const text of ['a/b', '```python\nx = 5 / 2', '```other\na/b\n```', '```python\nx = 5 / 2\n```\n\na/b']) {
    assert.equal(hasUnformattedDivision(text), true);
  }
});
