'use strict';

const { DatabaseSync } = require('node:sqlite');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function renderStudyRequest(exam = 'ЕГЭ', subject = 'математика') {
  return `<section class="study-request" id="study-request" aria-labelledby="study-request-title">
    <div class="study-request-copy"><p class="study-request-eyebrow">Обратная связь</p>
      <h2 id="study-request-title">Есть вопрос по подготовке?</h2>
      <p>Выберите экзамен и предмет, напишите, с чем нужна помощь. Оставьте контакт для ответа.</p>
    </div>
    <div class="study-request-body">
      <form class="study-request-form" method="post" action="/api/study-leads">
        <input type="hidden" name="formStartedAt" value="0">
        <label class="study-request-trap" aria-hidden="true">Ваш сайт<input name="website" tabindex="-1" autocomplete="off"></label>
        <div class="study-request-grid">
          <label>Ваше имя<input class="ym-disable-keys" name="name" autocomplete="given-name" required minlength="2" maxlength="70" placeholder="Как к вам обращаться?"></label>
          <label>Контакт для ответа<input class="ym-disable-keys" name="contact" required maxlength="120" placeholder="Телефон, email или @telegram" aria-describedby="study-contact-hint"></label>
          <label>Экзамен<select name="exam"><option${exam === 'ЕГЭ' ? ' selected' : ''}>ЕГЭ</option><option${exam === 'ОГЭ' ? ' selected' : ''}>ОГЭ</option></select></label>
          <label>Предмет<select name="subject"><option value="математика"${subject !== 'физика' ? ' selected' : ''}>Математика</option><option value="физика"${subject === 'физика' ? ' selected' : ''}>Физика</option></select></label>
        </div>
        <p id="study-contact-hint" class="study-request-hint">Достаточно одного способа связи.</p>
        <label>Ваш вопрос<textarea class="ym-disable-keys" name="message" required minlength="5" maxlength="2000" rows="3" placeholder="Например: нужна помощь с задачами по механике"></textarea></label>
        <label class="study-request-consent"><input type="checkbox" name="consent" value="yes" required><span>Согласен на обработку данных для ответа на обращение. <a href="/privacy" target="_blank" rel="noopener">Как используются данные</a></span></label>
        <p class="study-request-error" role="alert" hidden></p>
        <button class="study-request-submit" type="submit">Отправить обращение <span aria-hidden="true">→</span></button>
      </form>
      <div class="study-request-success" role="status" tabindex="-1" hidden><h3>Обращение принято</h3><p>Ваш вопрос сохранён. Для ответа используем указанный контакт.</p><button type="button" data-study-again>Написать ещё</button></div>
    </div>
  </section>`;
}

function validateStudyLead(form) {
  const get = key => String(form.get(key) || '').trim();
  const lead = {name: get('name'), contact: get('contact'), exam: get('exam'), subject: get('subject'), message: get('message')};
  if (lead.name.length < 2 || lead.name.length > 70 || /[<>\x00-\x1f]/.test(lead.name)) return {error: 'Укажите имя от 2 до 70 символов.'};
  const phone = /^\+?[\d\s()\-]{10,25}$/.test(lead.contact) && /^\d{10,15}$/.test(lead.contact.replace(/\D/g, ''));
  const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(lead.contact);
  const telegram = /^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(lead.contact);
  if (lead.contact.length > 120 || !(phone || email || telegram)) return {error: 'Укажите телефон, email или имя Telegram в формате @username.'};
  if (!['ЕГЭ','ОГЭ'].includes(lead.exam) || !['математика','физика'].includes(lead.subject)) return {error: 'Выберите экзамен и предмет.'};
  if (lead.message.length < 5 || lead.message.length > 2000) return {error: 'Напишите вопрос от 5 до 2000 символов.'};
  if (get('consent') !== 'yes') return {error: 'Нужно согласие на обработку данных для ответа.'};
  return {lead};
}

function openStudyLeads(filename) {
  fs.mkdirSync(path.dirname(filename), {recursive: true});
  const db = new DatabaseSync(filename);
  fs.chmodSync(filename, 0o600);
  db.exec(`PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS study_leads (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL, exam TEXT NOT NULL,
      subject TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL,
      consent_at TEXT NOT NULL, fingerprint TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS study_leads_fingerprint ON study_leads(fingerprint, created_at);`);
  // Existing admin-only inquiries must not be sent retrospectively by this migration.
  const columns = new Set(db.prepare('PRAGMA table_info(study_leads)').all().map(column => column.name));
  for (const [name, definition] of Object.entries({
    telegram_status: "TEXT NOT NULL DEFAULT 'not_requested'",
    telegram_attempts: 'INTEGER NOT NULL DEFAULT 0',
    telegram_next_attempt_at: 'TEXT',
    telegram_sent_at: 'TEXT'
  })) {
    if (!columns.has(name)) db.exec(`ALTER TABLE study_leads ADD COLUMN ${name} ${definition}`);
  }
  const duplicate = db.prepare('SELECT id FROM study_leads WHERE fingerprint=? AND created_at>=? LIMIT 1');
  const insert = db.prepare("INSERT INTO study_leads(name,contact,exam,subject,message,created_at,consent_at,fingerprint,telegram_status) VALUES(?,?,?,?,?,?,?,?,'pending')");
  return {
    save(lead) {
      const now = new Date().toISOString();
      const fingerprint = createHash('sha256').update(JSON.stringify(lead)).digest('hex');
      if (duplicate.get(fingerprint, new Date(Date.now() - 10 * 60 * 1000).toISOString())) return false;
      insert.run(lead.name, lead.contact, lead.exam, lead.subject, lead.message, now, now, fingerprint);
      return true;
    },
    list(page = 1) {return db.prepare('SELECT id,name,contact,exam,subject,message,created_at,telegram_status,telegram_attempts FROM study_leads ORDER BY id DESC LIMIT 50 OFFSET ?').all((page - 1) * 50);},
    pending(now) {return db.prepare("SELECT * FROM study_leads WHERE telegram_status='pending' AND (telegram_next_attempt_at IS NULL OR telegram_next_attempt_at<=?) ORDER BY id LIMIT 10").all(now);},
    sent(id, now) {db.prepare("UPDATE study_leads SET telegram_status='sent',telegram_sent_at=?,telegram_next_attempt_at=NULL,telegram_attempts=telegram_attempts+1 WHERE id=?").run(now,id);},
    retry(id, next) {db.prepare('UPDATE study_leads SET telegram_attempts=telegram_attempts+1,telegram_next_attempt_at=? WHERE id=?').run(next,id);},
    count() {return db.prepare('SELECT COUNT(*) AS total FROM study_leads').get().total;},
    close() {db.close();}
  };
}

function renderStudyLeadsAdmin(store, page) {
  const total = store.count();
  const rows = store.list(page).map(lead => {
    const delivery = lead.telegram_status === 'sent' ? 'Отправлено в Telegram'
      : lead.telegram_status === 'pending' ? (lead.telegram_attempts ? 'Ожидает повторной отправки в Telegram' : 'Ожидает отправки в Telegram') : 'Сохранено до подключения Telegram';
    return `<article class="card"><h2>№ ${lead.id} · ${escape(lead.exam)} · ${escape(lead.subject)}</h2><p>${escape(lead.created_at.replace('T',' ').slice(0,16))} UTC · ${delivery}</p><p><strong>${escape(lead.name)}</strong><br>${escape(lead.contact)}</p><p style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(lead.message)}</p></article>`;
  }).join('');
  return `<section class="card"><h1>Обращения с сайта</h1><p>Всего: ${total}. Контакты доступны только администратору.</p></section>${rows || '<p>Обращений пока нет.</p>'}<nav>${page > 1 ? `<a href="/admin/leads?page=${page-1}">← Новее</a> ` : ''}${page * 50 < total ? `<a href="/admin/leads?page=${page+1}">Старее →</a>` : ''}</nav>`;
}

function createStudyLeadDelivery(store, {token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_ORDERS_CHAT_ID, fetch: request = globalThis.fetch, now = Date.now} = {}) {
  let running = null;
  const flush = () => {
    if (running) return running;
    if (!token || !chatId) return Promise.resolve();
    running = (async () => {
      for (const lead of store.pending(new Date(now()).toISOString())) {
        const text = ['📚 ЕГЭ / ОГЭ · ege-fipi.ru', `Новое обращение № ${lead.id}`, '',
          `Имя: ${lead.name}`, `Контакт: ${lead.contact}`, `Экзамен: ${lead.exam}`,
          `Предмет: ${lead.subject}`, '', lead.message, '',
          `Время: ${new Date(lead.created_at).toLocaleString('ru-RU', {timeZone: 'Europe/Moscow'})}`,
          'Заявки: https://ege-fipi.ru/admin/leads'].join('\n');
        try {
          const response = await request(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: {'content-type': 'application/json'},
            body: JSON.stringify({chat_id: chatId, text, disable_web_page_preview: true}),
            signal: AbortSignal.timeout(10000)
          });
          const result = await response.json();
          if (!response.ok || !result.ok) throw new Error('Telegram rejected delivery');
          store.sent(lead.id, new Date(now()).toISOString());
        } catch {
          // Keep the inquiry in the admin inbox; never log contacts or token-bearing URLs.
          const delay = Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** Math.min(lead.telegram_attempts, 6));
          store.retry(lead.id, new Date(now() + delay).toISOString());
        }
      }
    })().catch(() => {
      console.error('Study inquiry delivery queue unavailable; retry scheduled.');
    }).finally(() => {running = null;});
    return running;
  };
  return {flush};
}

module.exports = {renderStudyRequest, validateStudyLead, openStudyLeads, renderStudyLeadsAdmin, createStudyLeadDelivery};
