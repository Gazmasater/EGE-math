'use strict';

// Public editorial notes about completed work, independent of private feedback.
const updates = [
  {
    taskId: 'C0261C',
    label: 'Исправлена ошибка',
    description: 'Исправили подсчёт точек и пояснили, почему x₆ не входит в ответ. Спасибо посетителю за внимательность!'
  },
  {
    taskId: 'C84642',
    label: 'Добавлен второй способ',
    description: 'По просьбе посетителя добавили геометрическое решение пункта б — через площадь треугольника.'
  }
];

function renderVisitorUpdates(taskId = '') {
  const selected = taskId ? updates.filter(update => update.taskId === taskId) : updates;
  if (!selected.length) return '';
  return `<section class="visitor-updates${taskId ? ' visitor-updates-task' : ''}" aria-labelledby="visitor-updates-title">
    <div class="visitor-updates-heading">
      <div><p class="visitor-updates-eyebrow"><span aria-hidden="true">✓</span> Просьбы выполнены</p>
        <h2 id="visitor-updates-title">${taskId ? 'Решение обновлено' : 'По просьбам посетителей'}</h2>
      </div>
      <time datetime="2026-11-01">1 ноября 2026</time>
    </div>
    <ul class="visitor-updates-list">${selected.map(update => `<li>
      <div class="visitor-update-top"><a class="visitor-update-task" href="${taskId ? '' : `/tasks/${update.taskId}`}#solution-${update.taskId}">Задание ${update.taskId}<span aria-hidden="true"> ↗</span></a><span class="visitor-update-status">Выполнено</span></div>
      <h3>${update.label}</h3><p>${update.description}</p>
      <a class="visitor-update-link" href="${taskId ? '' : `/tasks/${update.taskId}`}#solution-${update.taskId}">${taskId ? 'К обновлённому решению ↓' : 'Посмотреть решение →'}</a>
    </li>`).join('')}</ul>
  </section>`;
}

module.exports = {renderVisitorUpdates};
