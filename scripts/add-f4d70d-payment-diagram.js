const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const taskId = 'F4D70D';
const databaseFile = path.join(__dirname, '..', 'storage', 'solutions.sqlite');
const marker = 'Графическая схема платежей:';
const diagram = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 470" role="img" aria-labelledby="title description">
  <title id="title">Схема платежей по кредиту задания F4D70D</title>
  <desc id="description">Три одинаковых платежа по 54 000 рублей. После каждого январского увеличения долга на 20 процентов показан остаток долга.</desc>
  <style>
    .title { fill:#183153; font:700 24px Arial,sans-serif; }
    .year { fill:#183153; font:700 18px Arial,sans-serif; }
    .label { fill:#40566d; font:15px Arial,sans-serif; }
    .value { fill:#124c5c; font:700 20px Arial,sans-serif; }
    .small { fill:#40566d; font:14px Arial,sans-serif; }
    .debt { fill:#e8f1f8; stroke:#5b7d9c; stroke-width:1.4; }
    .payment { fill:#e8f5e9; stroke:#2a6c3a; stroke-width:1.4; }
    .arrow { stroke:#40566d; stroke-width:2.2; fill:none; marker-end:url(#arrow); }
    .growth { fill:#8c5c10; font:700 14px Arial,sans-serif; }
  </style>
  <defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0L9,4.5L0,9Z" fill="#40566d"/></marker></defs>
  <rect width="900" height="470" fill="#fff"/>
  <rect x="24" y="20" width="852" height="426" rx="12" fill="#f8fbfe" stroke="#cbd7e4"/>
  <text x="56" y="58" class="title">Схема погашения кредита</text>
  <text x="56" y="88" class="label">Сумма кредита S=113 750 рублей; каждый платёж P=54 000 рублей.</text>

  <text x="103" y="138" text-anchor="middle" class="year">Июль 2026</text>
  <rect x="48" y="160" width="110" height="70" rx="8" class="debt"/>
  <text x="103" y="187" text-anchor="middle" class="label">взято</text>
  <text x="103" y="214" text-anchor="middle" class="value">113 750</text>

  <path d="M158 195H235" class="arrow"/>
  <text x="197" y="176" text-anchor="middle" class="growth">+20%</text>
  <text x="280" y="138" text-anchor="middle" class="year">2027 год</text>
  <rect x="225" y="160" width="110" height="70" rx="8" class="debt"/>
  <text x="280" y="187" text-anchor="middle" class="label">долг</text>
  <text x="280" y="214" text-anchor="middle" class="value">136 500</text>
  <path d="M280 230V270" class="arrow"/>
  <rect x="225" y="285" width="110" height="70" rx="8" class="payment"/>
  <text x="280" y="312" text-anchor="middle" class="label">после P</text>
  <text x="280" y="339" text-anchor="middle" class="value">82 500</text>

  <path d="M335 320H442" class="arrow"/>
  <text x="388" y="301" text-anchor="middle" class="growth">+20%</text>
  <text x="497" y="138" text-anchor="middle" class="year">2028 год</text>
  <rect x="442" y="160" width="110" height="70" rx="8" class="debt"/>
  <text x="497" y="187" text-anchor="middle" class="label">долг</text>
  <text x="497" y="214" text-anchor="middle" class="value">99 000</text>
  <path d="M497 230V270" class="arrow"/>
  <rect x="442" y="285" width="110" height="70" rx="8" class="payment"/>
  <text x="497" y="312" text-anchor="middle" class="label">после P</text>
  <text x="497" y="339" text-anchor="middle" class="value">45 000</text>

  <path d="M552 320H659" class="arrow"/>
  <text x="605" y="301" text-anchor="middle" class="growth">+20%</text>
  <text x="714" y="138" text-anchor="middle" class="year">2029 год</text>
  <rect x="659" y="160" width="110" height="70" rx="8" class="debt"/>
  <text x="714" y="187" text-anchor="middle" class="label">долг</text>
  <text x="714" y="214" text-anchor="middle" class="value">54 000</text>
  <path d="M714 230V270" class="arrow"/>
  <rect x="659" y="285" width="110" height="70" rx="8" class="payment"/>
  <text x="714" y="312" text-anchor="middle" class="label">после P</text>
  <text x="714" y="339" text-anchor="middle" class="value">0</text>

  <text x="56" y="406" class="small">Три платежа: 54 000+54 000+54 000=162 000 рублей.</text>
</svg>`;
const caption = 'После каждого январского увеличения долга на 20 процентов вносится платёж 54 000 рублей. Третий платёж полностью погашает кредит.';

const db = new DatabaseSync(databaseFile);
const row = db.prepare('SELECT solution FROM solutions WHERE task_id = ? AND published = 1').get(taskId);
if (!row) throw new Error(`Не найдено опубликованное решение ${taskId}.`);
const solution = row.solution.includes(marker)
  ? row.solution
  : `${row.solution}\n\n${marker}\nНа схеме ниже показано изменение долга после каждого начисления процентов и очередного платежа.`;
const result = db.prepare(`
  UPDATE solutions
  SET solution = ?, diagram_svg = ?, diagram_caption = ?, updated_at = ?
  WHERE task_id = ? AND published = 1
`).run(solution, diagram, caption, new Date().toISOString(), taskId);
if (result.changes !== 1) throw new Error(`Не удалось обновить ${taskId}.`);
console.log(JSON.stringify({ taskId, changes: result.changes, textUpdated: solution !== row.solution }));
