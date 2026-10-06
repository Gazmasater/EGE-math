const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {ANALYTICS_SCRIPT, registrationAnalyticsCookie} = require('../lib/analytics');

function browser({cookie = '', storageBlocked = false, url = 'https://ege-fipi.ru/', webdriver = false} = {}) {
  const calls = [], listeners = {}, storage = new Map();
  const document = {readyState: 'loading', visibilityState: 'visible',
    addEventListener(name, handler) {listeners[name] = handler;}, querySelector() {return null;}};
  Object.defineProperty(document, 'cookie', {get: () => cookie, set: value => {
    cookie = value.includes('Max-Age=0') ? '' : value;
  }});
  const localStorage = {getItem(key) {if (storageBlocked) throw Error('blocked'); return storage.get(key);},
    setItem(key, value) {if (storageBlocked) throw Error('blocked'); storage.set(key, value);},
    removeItem(key) {storage.delete(key);}};
  const context = {document, URL, location: {href: url}, history: {replaceState() {}},
    navigator: {webdriver, userAgent: 'Chrome'}, localStorage, sessionStorage: localStorage,
    setTimeout, clearTimeout, addEventListener() {}, ym: (...args) => calls.push(args)};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(ANALYTICS_SCRIPT, context);
  return {context, calls, ready: () => listeners.DOMContentLoaded(), reload: () => {
    delete context.egeAnalytics; vm.runInContext(ANALYTICS_SCRIPT, context); listeners.DOMContentLoaded();
  }};
}

test('Registration marker is anonymous, short lived and consumed only once across reloads', () => {
  const cookie = registrationAnalyticsCookie();
  assert.match(cookie, /^ege_registration_success=[a-f0-9]{32}; Max-Age=120; Path=\/; Secure; SameSite=Lax$/);
  const b = browser({cookie: cookie.split(';')[0]});
  b.ready(); b.reload();
  assert.equal(b.calls.length, 1);
  assert.equal(b.calls[0][2], 'registration_success');
});

test('No goal on registration page view, failed registration or invalid marker', () => {
  for (const cookie of ['', 'ege_registration_success=bad', 'another_cookie=1']) {
    const b = browser({cookie}); b.ready(); assert.equal(b.calls.length, 0);
  }
});

test('Blocked storage and blocked counter do not break the page', () => {
  const b = browser({storageBlocked: true}); b.ready();
  b.context.ym = () => {throw Error('blocked');};
  assert.doesNotThrow(() => b.context.egeAnalytics.goal('next_task', {}));
});

test('Technical traffic is tagged while ordinary visits remain public', () => {
  assert.equal(browser().context.egeAnalytics.visitParams.traffic_kind, 'public');
  assert.equal(browser({webdriver: true}).context.egeAnalytics.visitParams.traffic_kind, 'technical');
  assert.equal(browser({url: 'https://ege-fipi.ru/?analytics_technical=1'}).context.egeAnalytics.visitParams.traffic_kind, 'technical');
  assert.equal(browser({url: 'https://ege-fipi.ru/?analytics_technical=1', storageBlocked: true}).context.egeAnalytics.visitParams.traffic_kind, 'technical');
});

test('Repeated bootstrap does not replace helper or attach duplicate handlers', () => {
  const b = browser(); const original = b.context.egeAnalytics;
  vm.runInContext(ANALYTICS_SCRIPT, b.context);
  assert.equal(b.context.egeAnalytics, original);
});
