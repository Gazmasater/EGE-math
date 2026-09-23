const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../server.js'),'utf8');
const configuration=source.slice(source.indexOf('const TURNSTILE_ENABLED ='),source.indexOf('const PUBLIC_SECTIONS ='));
const functions=source.slice(source.indexOf('async function verifyTurnstile('),source.indexOf('function renderAdminShell('));
assert.ok(configuration.includes('TURNSTILE_HOSTNAMES'));
assert.ok(functions.includes('function renderTurnstileScript()'));

function setup(env={},fetchImpl=async()=>{throw new Error('Unexpected external request');}) {
  const context={process:{env},URLSearchParams,AbortSignal,fetch:fetchImpl,escapeHtml:s=>String(s)};
  vm.createContext(context);
  vm.runInContext(configuration+functions,context);
  return context;
}

test('Явное отключение убирает виджет и скрипт, сервер не требует токен и не вызывает Cloudflare',async()=>{
  for(const keys of [{},{TURNSTILE_SITE_KEY:'test-site',TURNSTILE_SECRET_KEY:'test-secret'}]) {
    let calls=0;
    const c=setup({...keys,TURNSTILE_ENABLED:'0'},async()=>{calls++;throw new Error('Must not call Cloudflare');});
    assert.equal(c.renderTurnstileWidget(),'');
    assert.equal(c.renderTurnstileScript(),'');
    for(const token of ['', 'ignored-token']) {
      const result=await c.verifyTurnstile(new URLSearchParams({'cf-turnstile-response':token}));
      assert.equal(result.ok,true);
    }
    assert.equal(calls,0);
  }
});

test('По умолчанию и при неверном переключателе защита остаётся включённой',async()=>{
  for(const flag of [undefined,'1','','false','off','00']) {
    const env={TURNSTILE_SITE_KEY:'test-site',TURNSTILE_SECRET_KEY:'test-secret'};
    if(flag!==undefined) env.TURNSTILE_ENABLED=flag;
    const c=setup(env);
    assert.ok(c.renderTurnstileWidget().includes('data-turnstile-widget'));
    assert.ok(c.renderTurnstileScript().includes('challenges.cloudflare.com/turnstile/v0/api.js'));
    const result=await c.verifyTurnstile(new URLSearchParams());
    assert.equal(result.ok,false);
    assert.equal(result.status,400);
  }
});

test('При включённой защите отсутствие ключа не разрешает отправку формы',async()=>{
  const c=setup();
  const result=await c.verifyTurnstile(new URLSearchParams());
  assert.equal(result.ok,false);
  assert.equal(result.status,503);
  assert.ok(c.renderTurnstileWidget().includes('role="alert"'));
  assert.equal(c.renderTurnstileScript(),'');
});

test('После включения снова проверяются токен, HTTP-ответ и hostname Cloudflare',async()=>{
  for(const [httpOK,success,hostname,expected] of [
    [true,true,'ege-fipi.ru',true],
    [true,true,'www.ege-fipi.ru',true],
    [true,true,'other.invalid',false],
    [true,false,'ege-fipi.ru',false],
    [false,true,'ege-fipi.ru',false],
  ]) {
    let calls=0;
    const c=setup({TURNSTILE_ENABLED:'1',TURNSTILE_SECRET_KEY:'test-secret'},async(url,options)=>{
      calls++;
      assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
      assert.equal(options.method,'POST');
      assert.equal(options.body.get('secret'),'test-secret');
      assert.equal(options.body.get('response'),'test-token');
      return {ok:httpOK,json:async()=>({success,hostname})};
    });
    const result=await c.verifyTurnstile(new URLSearchParams({'cf-turnstile-response':'test-token'}));
    assert.equal(result.ok,expected);
    assert.equal(calls,1);
  }
});

test('Сетевая ошибка при включённой защите не разрешает отправку формы',async()=>{
  const c=setup({TURNSTILE_ENABLED:'1',TURNSTILE_SECRET_KEY:'test-secret'},async()=>{throw new Error('Network failure');});
  const result=await c.verifyTurnstile(new URLSearchParams({'cf-turnstile-response':'test-token'}));
  assert.equal(result.ok,false);
  assert.equal(result.status,503);
});
