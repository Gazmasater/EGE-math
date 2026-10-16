const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {DatabaseSync}=require('node:sqlite');
const {openStudyLeads,createStudyLeadDelivery}=require('../lib/study-leads');
const lead={name:'Тест',contact:'test@example.invalid',exam:'ОГЭ',subject:'физика',message:'Проверка доставки'};
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ege-delivery-'));const file=path.join(dir,'leads.sqlite');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return file;}
test('migration preserves old inquiries and does not forward them',async t=>{
 const file=fixture(t);const db=new DatabaseSync(file);
 db.exec("CREATE TABLE study_leads(id INTEGER PRIMARY KEY,name TEXT,contact TEXT,exam TEXT,subject TEXT,message TEXT,created_at TEXT,consent_at TEXT,fingerprint TEXT);INSERT INTO study_leads VALUES(1,'Тест','test@example.invalid','ЕГЭ','математика','Историческая запись','2026-01-01','2026-01-01','old')");db.close();
 const store=openStudyLeads(file);assert.equal(store.count(),1);assert.equal(store.list()[0].telegram_status,'not_requested');
 let sends=0;const delivery=createStudyLeadDelivery(store,{token:'test-token',chatId:'test-chat',fetch:async()=>{sends++;return Response.json({ok:true});}});await delivery.flush();assert.equal(sends,0);store.close();
 const again=openStudyLeads(file);assert.equal(again.count(),1);again.close();
});
test('new inquiry sent once with its number and all fields; concurrent flush and duplicate do not resend',async t=>{
 const file=fixture(t);const store=openStudyLeads(file);assert.equal(store.save(lead),true);assert.equal(store.save(lead),false);
 const sent=[];const delivery=createStudyLeadDelivery(store,{token:'test-token',chatId:'test-chat',fetch:async(url,options)=>{assert.equal(url,'https://api.telegram.org/bottest-token/sendMessage');sent.push(JSON.parse(options.body));await new Promise(r=>setTimeout(r,20));return Response.json({ok:true});}});
 await Promise.all([delivery.flush(),delivery.flush()]);await delivery.flush();assert.equal(sent.length,1);assert.equal(sent[0].chat_id,'test-chat');
 for(const value of ['ege-fipi.ru','№ 1',...Object.values(lead)])assert.ok(sent[0].text.includes(value));
 assert.ok(!('parse_mode' in sent[0]));assert.ok(sent[0].text.length<4096);assert.equal(store.list()[0].telegram_status,'sent');assert.equal(store.list()[0].telegram_attempts,1);store.close();
});
test('API rejection retains inquiry and retries after backoff, including after restart',async t=>{
 const file=fixture(t);let store=openStudyLeads(file);store.save(lead);let clock=Date.now(),sends=0;
 let delivery=createStudyLeadDelivery(store,{token:'test',chatId:'test',now:()=>clock,fetch:async()=>{sends++;return Response.json({ok:false});}});
 await delivery.flush();assert.equal(store.count(),1);assert.equal(store.list()[0].telegram_status,'pending');assert.equal(store.list()[0].telegram_attempts,1);
 await delivery.flush();assert.equal(sends,1);store.close();
 store=openStudyLeads(file);clock+=61000;
 delivery=createStudyLeadDelivery(store,{token:'test',chatId:'test',now:()=>clock,fetch:async()=>{sends++;return Response.json({ok:true});}});
 await delivery.flush();assert.equal(sends,2);assert.equal(store.list()[0].telegram_status,'sent');store.close();
});
test('network failure, malformed response and missing credentials do not lose inquiries',async t=>{
 const file=fixture(t);const store=openStudyLeads(file);store.save(lead);let clock=Date.now(),sends=0;
 await createStudyLeadDelivery(store,{token:'',chatId:'',fetch:async()=>{throw Error('must not call')}}).flush();assert.equal(store.list()[0].telegram_attempts,0);
 const delivery=createStudyLeadDelivery(store,{token:'test',chatId:'test',now:()=>clock,fetch:async()=>{sends++;if(sends===1)throw Error('private-token-bearing error');return new Response('not json',{status:502});}});
 await delivery.flush();clock+=61000;await delivery.flush();assert.equal(sends,2);assert.equal(store.count(),1);assert.equal(store.list()[0].telegram_attempts,2);assert.equal(store.list()[0].telegram_status,'pending');store.close();
});
