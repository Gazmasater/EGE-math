const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ogeTaskCodes, ogeTaskMatchesTopic, ogeTopicStats, ogeCataloguePath, ogePageNumber, normalizeOgeSourceHtml, ogeAssetPaths } = require('../lib/oge-catalog');

const task = (codes, condition = '') => ({ fragment: `<div class="qblock">${condition}</div><div class="task-info-content"><table><tr><td>КЭС:</td><td>${codes.map(code => `<div>${code} Тема</div>`).join('')}</td></tr></table></div>` });

test('КЭС ОГЭ берётся из свойств задания, включая родительские коды 7 и 8', () => {
  const example = task(['7', '8.2'], '<p>Числа 1.1, 3.2 и 8.1 встречаются в условии.</p>');
  assert.deepEqual(ogeTaskCodes(example), ['7', '8.2']);
  assert.equal(ogeTaskMatchesTopic(example, '1.1'), false);
  assert.equal(ogeTaskMatchesTopic(example, '7'), true);
  assert.equal(ogeTaskMatchesTopic(example, '7.1'), false);
  assert.equal(ogeTaskMatchesTopic(example, '8'), true);
});

test('Вложенные и смешанные КЭС не теряют задания и не удваивают счётчики', () => {
  const example = task(['7.2.1', '7.2.1', '7.4']);
  assert.equal(ogeTaskMatchesTopic(example, '7.2'), true);
  assert.equal(ogeTaskMatchesTopic(example, '7.1'), false);
  const stats = ogeTopicStats([example, task([])]);
  assert.equal(stats.total, 2);
  assert.equal(stats.counts['7'], 1);
  assert.equal(stats.counts['7.2'], 1);
  assert.equal(stats.counts['7.4'], 1);
  assert.equal(stats.counts.unclassified, 1);
});

test('Пагинация сохраняет тему и поиск; первая страница имеет базовый URL', () => {
  const url = new URL(ogeCataloguePath({ topic: '3.1', query: 'x & y', page: 2 }), 'http://localhost');
  assert.equal(url.pathname, '/oge');
  assert.equal(url.searchParams.get('topic'), '3.1');
  assert.equal(url.searchParams.get('q'), 'x & y');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(ogeCataloguePath({ topic: 'all', page: 1 }), '/oge?topic=all');
  assert.equal(ogeCataloguePath({ added: true, page: 2 }), '/added?section=oge&page=2');
});

test('Ошибочные страницы не округляются и не превращаются в первую страницу', () => {
  for (const value of ['0', '-1', '01', '1.2', '2x', 'Infinity', '9007199254740992']) assert.equal(ogePageNumber(value), null);
  assert.equal(ogePageNumber(null), 1);
  assert.equal(ogePageNumber('324'), 324);
});

test('Общее условие прикреплено к каждому вопросу блока и не попадает в предыдущий', () => {
  const html = `<html><body><div class="qblock" id="qAAAA01">Предыдущая задача</div><div id="iAAAA01"></div>
    <div class="qblock"><script>files_abs_location='docs/shared/';</script><p>План квартиры</p><script>ShowPicture('plan.png');</script></div>
    <div class="qblock" id="qBBBB02">Первый вопрос</div><div id="iBBBB02"></div>
    <div class="qblock" id="qCCCC03">Второй вопрос</div><div id="iCCCC03"></div>
    <div class="qblock"><script>files_abs_location='docs/tyres/';</script><p>Маркировка шин</p></div>
    <div class="qblock" id="qDDDD04">Третий вопрос</div><div id="iDDDD04"></div></body></html>`;
  const normalized = normalizeOgeSourceHtml(html);
  const starts = [...normalized.matchAll(/<div class="qblock" id="q[A-Z0-9]+">/g)];
  const fragments = starts.map((match, index) => normalized.slice(match.index, starts[index + 1]?.index));
  assert.ok(!fragments[0].includes('План квартиры'));
  for (const fragment of fragments.slice(1, 3)) {
    assert.ok(fragment.includes('План квартиры'));
    assert.ok(fragment.includes('src="/fipi/oge/docs/shared/plan.png"'));
    assert.ok(!fragment.includes('Маркировка шин'));
    assert.equal(ogeTaskMatchesTopic({ fragment }, 'practical'), true);
  }
  assert.ok(fragments[3].includes('Маркировка шин'));
  assert.ok(!fragments[3].includes('План квартиры'));
  assert.ok(ogeAssetPaths(html).has('docs/shared/plan.png'));
});

test('Рисунок ФИПИ доступен без JavaScript и берётся из первого аргумента', () => {
  const normalized = normalizeOgeSourceHtml(`<body><div class="qblock hide-form" id='qAAAA01'><script language='javascript'> ShowPictureQ('docs/task/picture.png', 'ignored');</script></div></body>`);
  assert.match(normalized, /<img[^>]*src="\/fipi\/oge\/docs\/task\/picture.png"/);
  assert.ok(!normalized.includes('ShowPictureQ'));
  assert.throws(() => normalizeOgeSourceHtml('<body><div class="qblock" id="qAAAA01"><script>ShowPictureQ("docs/../secret.png");</script></div></body>'));
});
