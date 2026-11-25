'use strict';

const EXAMPLES = [
  {id: '097E41', topic: '1.2', name: 'Дроби'},
  {id: 'AEA848', topic: '3.1', name: 'Уравнения'},
  {id: '46334D', topic: '8.2', name: 'Вероятность'}
];
const QUICK_TOPICS = [
  ['1.2', 'Дроби и проценты'], ['3.1', 'Уравнения'], ['3.3', 'Текстовые задачи'],
  ['7', 'Геометрия'], ['8.2', 'Вероятность']
];

// Conditions and solutions come from the same published records as task pages.
// This adds a way into the existing bank; it does not create another catalogue.
function renderOgeMathStart({catalog, published, conditionHtml, solutionHtml, escapeHtml, topicUrl, matchesTopic}) {
  const examples = EXAMPLES.flatMap(example => {
    const task = catalog.byId.get(example.id);
    if (!task || !published.has(task.id)) return [];
    const condition = conditionHtml(task);
    const solution = solutionHtml(task.id, example.name);
    if (!condition || !solution) return [];
    const selection = catalog.tasks.filter(task => matchesTopic(task, example.topic));
    const index = selection.findIndex(task => task.id === example.id);
    const next = selection[index + 1];
    return [{...example, condition, solution, next, nextUrl: next ? topicUrl(example.topic, index + 1, next.id) : ''}];
  });
  const quickTopics = QUICK_TOPICS.filter(([code]) => catalog.counts[code]);
  const start = `<section class="oge-practice-start" aria-label="Быстрый старт">
    <div class="oge-start-actions"><a class="oge-start-primary" href="/oge?topic=all#tasks">Начать решать</a>${examples.length ? '<a href="#oge-examples">Примеры с решениями</a>' : ''}<a href="#oge-topics-title">Все темы</a></div>
    <nav class="oge-quick-topics" aria-label="Быстрый выбор темы">${quickTopics.map(([code, name]) => `<a href="${escapeHtml(topicUrl(code))}">${escapeHtml(name)}</a>`).join('')}</nav>
  </section>`;
  const exampleSection = examples.length ? `<section class="oge-start-examples" id="oge-examples" aria-labelledby="oge-examples-title">
    <h2 id="oge-examples-title">Попробуйте решить</h2><p>Прочитайте условие и найдите ответ. Затем раскройте пошаговый разбор и продолжите задания той же темы.</p>
    <div class="oge-example-grid">${examples.map(example => `<article class="oge-start-example" aria-labelledby="oge-example-${example.id}">
      <header><h3 id="oge-example-${example.id}">${escapeHtml(example.name)}</h3><a href="/tasks/${example.id}">ФИПИ ${example.id}</a></header>
      <div class="oge-example-condition">${example.condition}</div>
      <details data-oge-example="${example.id}"><summary>Ответ и решение</summary>
        ${example.solution}
        <div class="oge-example-actions">${example.next ? `<a class="oge-example-next" href="${escapeHtml(example.nextUrl)}" data-analytics-next-task="${example.next.id}" data-analytics-placement="oge_hub_example" data-analytics-section="oge" data-analytics-navigation-area="after_solution">Продолжить тему</a>` : ''}<a href="/tasks/${example.id}#solution-${example.id}">Открыть отдельной страницей</a></div>
      </details>
    </article>`).join('')}</div>
  </section>` : '';
  return {start, examples: exampleSection, items: examples.map(example => ({id: example.id, sourceId: example.id})), script: examples.length ? `<script>
    document.querySelectorAll('details[data-oge-example]').forEach(function (example) {
      example.addEventListener('toggle', function () {
        if (example.open) window.egeAnalytics?.goal('solution_open', {placement: 'oge_hub_example', section: 'oge', task_id: example.dataset.ogeExample});
      });
    });
  </script>` : ''};
}

const OGE_MATH_START_STYLE = `<style>
  .oge-practice-start,.oge-start-examples{font-family:var(--ui-font);color:var(--ui-ink)}
  .oge-practice-start{margin:0 0 26px}
  .oge-start-actions{display:flex;align-items:center;flex-wrap:wrap;gap:10px 18px}
  .oge-start-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:46px;font-size:15px;font-weight:650;color:#1d6096}
  .oge-start-actions a.oge-start-primary{padding:12px 22px;border:1px solid #183153;border-radius:9px;background:#183153;color:#fff;text-decoration:none}
  .oge-start-primary:hover{background:#254a79}
  .oge-quick-topics{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
  .oge-quick-topics a{display:inline-flex;align-items:center;min-height:44px;padding:9px 12px;border:1px solid #d8e1eb;border-radius:8px;background:#fff;color:#183153;font-size:14px;text-decoration:none}
  .oge-quick-topics a:hover{border-color:#183153;background:#edf3f7}
  #oge-topics-title,#oge-examples{scroll-margin-top:20px}
  .oge-start-examples{margin:28px 0}
  .oge-start-examples>h2{font-size:26px;line-height:1.3;margin:0 0 10px}
  .oge-start-examples>p{margin:0 0 18px;font-size:16px;line-height:1.6;color:var(--ui-muted)}
  .oge-example-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:start;gap:14px}
  .oge-start-example{min-width:0;padding:20px;border:1px solid #d8e1eb;border-radius:12px;background:#fff}
  .oge-start-example header{margin-bottom:16px}
  .oge-start-example h3{margin:0 0 6px;font-size:19px;line-height:1.3}
  .oge-start-example header a{display:inline-flex;align-items:center;min-height:32px;color:#1d6096;font-size:14px}
  .oge-example-condition{font-size:16px;line-height:1.65;overflow-wrap:break-word}
  .oge-example-condition p{margin:0 0 12px;text-align:left!important}
  .oge-start-example details{margin-top:16px;border-top:1px solid #d8e1eb}
  .oge-start-example summary{padding:14px 0;min-height:48px;cursor:pointer;font-size:16px;font-weight:700;color:#1d6096}
  .oge-start-example details[open] summary{margin-bottom:4px}
  .oge-example-solution{font-size:16px;line-height:1.65}
  .oge-example-solution h4{margin:0 0 12px;font-size:17px}
  .oge-example-solution figure{margin:16px 0}
  .oge-example-solution img{max-width:100%;height:auto}
  .oge-example-actions{display:grid;gap:10px;margin-top:16px;font-size:14px}
  .oge-example-actions a{display:inline-flex;align-items:center;min-height:44px;color:#1d6096}
  .oge-example-actions .oge-example-next{justify-content:center;padding:11px 14px;border-radius:8px;background:#183153;color:#fff;text-decoration:none;font-size:15px;font-weight:650}
  .oge-start-example :focus-visible,.oge-practice-start :focus-visible{outline:3px solid #c58b00;outline-offset:3px}
  @media(max-width:900px){.oge-example-grid{grid-template-columns:minmax(0,1fr)}}
  @media(max-width:600px){.oge-start-actions .oge-start-primary{flex-basis:100%}.oge-start-actions{gap:4px 18px}.oge-practice-start{margin-bottom:22px}.oge-start-example{padding:18px}.oge-start-examples>h2{font-size:23px}}
</style>`;

module.exports = {renderOgeMathStart, OGE_MATH_START_STYLE};
