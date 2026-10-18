'use strict';

(() => {
  const pageConfig = JSON.parse(document.getElementById('catalogue-config').textContent);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('DOMContentLoaded', function () {
    let currentPage = 1;
    let resizeTimer;
    let pages = [];
    const isSingleTaskPage = pageConfig.isSingleTaskPage;
    const catalogue = JSON.parse(document.getElementById('catalogue-data')?.textContent || 'null');
    let catalogueIndex = catalogue?.offset || 0;
    let catalogueNavigating = false;
    const publishedSolutionIds = new Set(pageConfig.publishedSolutionIds);
    const emptyCatalogueMessage = pageConfig.emptyCatalogueMessage;
    // Состав раздела уже отфильтрован сервером; браузер только разбивает его на страницы.
    // Старый HTML банка неидеален. Собираем пары по устойчивому идентификатору
    // самого задания, а не по родительскому элементу панели: мобильные браузеры
    // могут по-разному восстанавливать вложенность такой разметки.
    const allTasks = Array.from(document.querySelectorAll('.qblock[id^="q"]')).map(content => {
      const id = content.id.slice(1);
      const header = id ? document.getElementById('i' + id) : null;
      return header ? { id, header, content } : null;
    }).filter(Boolean);
    const tasks = allTasks;

    let modalOpener = null;
    const solutionModal = document.createElement('section');
    solutionModal.className = 'solution-modal';
    solutionModal.hidden = true;
    solutionModal.setAttribute('role', 'dialog');
    solutionModal.setAttribute('aria-modal', 'true');
    solutionModal.setAttribute('aria-labelledby', 'solution-modal-title');
    solutionModal.innerHTML = '<div class="solution-modal-dialog"><header class="solution-modal-header"><h2 class="solution-modal-title" id="solution-modal-title"></h2><button class="solution-modal-close" type="button" aria-label="Закрыть решение">×</button></header><div class="solution-modal-body" tabindex="0"></div></div>';
    document.body.appendChild(solutionModal);
    const modalTitle = solutionModal.querySelector('.solution-modal-title');
    const modalBody = solutionModal.querySelector('.solution-modal-body');
    const modalClose = solutionModal.querySelector('.solution-modal-close');

    function closeSolutionModal() {
      solutionModal.hidden = true;
      if (modalOpener) modalOpener.focus({ preventScroll: true });
      modalOpener = null;
    }

    function revealOgeTask(id) {
      const target = document.getElementById('q' + id);
      if (!target) return;
      const header = document.querySelector('.local-header');
      target.style.scrollMarginTop = (header && getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height + 12 : 12) + 'px';
      target.tabIndex = -1;
      target.scrollIntoView({block: 'start'});
      target.focus({preventScroll: true});
    }

    function modalCommentElement(comment, taskId) {
      const article = document.createElement('article');
      article.className = 'solution-comment';
      const header = document.createElement('header');
      const author = document.createElement('strong');
      author.textContent = comment.fullName;
      const city = document.createElement('span');
      city.textContent = comment.city;
      const time = document.createElement('time');
      time.dateTime = comment.createdAt;
      const date = new Date(comment.createdAt);
      time.textContent = Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
      const body = document.createElement('p');
      body.textContent = comment.body;
      header.append(author, city, time);
      article.append(header, body);
      if (comment.isOwn) {
        const form = document.createElement('form');
        form.className = 'solution-comment-delete-form';
        form.method = 'post';
        form.action = '/account/comments/' + encodeURIComponent(comment.id) + '/delete';
        const next = document.createElement('input');
        next.type = 'hidden';
        next.name = 'next';
        next.value = location.pathname + location.search + '#comments';
        const button = document.createElement('button');
        button.type = 'submit';
        button.textContent = 'Удалить мой комментарий';
        form.append(next, button);
        article.appendChild(form);
      }
      return article;
    }

    function appendSolutionComments(solution, taskId) {
      const section = document.createElement('section');
      section.className = 'solution-comments';
      const heading = document.createElement('h3');
      heading.textContent = 'Комментарии к решению';
      const list = document.createElement('div');
      list.className = 'solution-comments-list';
      const comments = Array.isArray(solution.comments) ? solution.comments : [];
      if (comments.length) {
        comments.forEach(comment => list.appendChild(modalCommentElement(comment, taskId)));
      } else {
        const empty = document.createElement('p');
        empty.className = 'solution-comments-empty';
        empty.textContent = 'Комментариев пока нет. Будьте первым.';
        list.appendChild(empty);
      }
      section.append(heading, list);
      if (!solution.viewer) {
        const hint = document.createElement('p');
        hint.className = 'solution-comments-login';
        const prefix = document.createTextNode('Чтобы оставить комментарий, ');
        const login = document.createElement('a');
        login.href = '/account/login?next=' + encodeURIComponent(location.pathname + location.search + '#comments');
        login.textContent = 'войдите';
        const middle = document.createTextNode(' или ');
        const register = document.createElement('a');
        register.href = '/account/register?next=' + encodeURIComponent(location.pathname + location.search + '#comments');
        register.textContent = 'зарегистрируйтесь';
        hint.append(prefix, login, middle, register, '.');
        section.appendChild(hint);
        return section;
      }
      const form = document.createElement('form');
      form.className = 'solution-comment-form';
      const label = document.createElement('label');
      const inputId = 'modal-comment-' + taskId;
      label.htmlFor = inputId;
      label.textContent = 'Ваш комментарий';
      const field = document.createElement('textarea');
      field.id = inputId;
      field.name = 'body';
      field.maxLength = pageConfig.maxCommentLength;
      field.required = true;
      field.placeholder = 'Напишите вопрос или дополнение к решению';
      const button = document.createElement('button');
      button.type = 'submit';
      button.textContent = 'Отправить комментарий';
      const error = document.createElement('p');
      error.className = 'comment-error';
      error.hidden = true;
      form.append(label, field, button, error);
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        error.hidden = true;
        button.disabled = true;
        try {
          const response = await fetch('/tasks/' + encodeURIComponent(taskId) + '/comments', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ body: field.value }).toString()
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload.comment) throw new Error(payload.error || 'Не удалось отправить комментарий.');
          solution.comments = comments;
          solution.comments.push(payload.comment);
          list.querySelector('.solution-comments-empty')?.remove();
          list.appendChild(modalCommentElement(payload.comment, taskId));
          document.dispatchEvent(new Event('comments:changed'));
          field.value = '';
        } catch (requestError) {
          error.textContent = requestError.message || 'Не удалось отправить комментарий.';
          error.hidden = false;
        } finally {
          button.disabled = false;
        }
      });
      section.appendChild(form);
      return section;
    }

    function openSolutionModal(solution, taskId, opener) {
      modalOpener = opener;
      modalTitle.textContent = 'Решение задания ' + taskId;
      modalBody.replaceChildren();
      if (solution.answer) {
        const answer = document.createElement('p');
        answer.className = 'solution-answer';
        if (solution.answerHtml) {
          answer.innerHTML = '<strong>Ответ:</strong> ' + solution.answerHtml;
        } else {
          answer.textContent = 'Ответ: ' + solution.answer;
        }
        modalBody.appendChild(answer);
      }
      const title = document.createElement('p');
      title.textContent = 'Решение:';
      modalBody.appendChild(title);
      const text = document.createElement('div');
      text.className = 'solution-text';
      if (solution.solutionHtml) {
        text.innerHTML = solution.solutionHtml;
      } else {
        text.textContent = solution.solution;
      }
      modalBody.appendChild(text);
      if (solution.diagramSvg) {
        const figure = document.createElement('figure');
        figure.className = 'solution-figure';
        const diagram = document.createElement('img');
        diagram.className = 'solution-diagram';
        diagram.alt = 'Схема к решению задания ' + taskId;
        diagram.src = URL.createObjectURL(new Blob([solution.diagramSvg], { type: 'image/svg+xml' }));
        figure.appendChild(diagram);
        if (solution.diagramCaption) {
          const caption = document.createElement('figcaption');
          caption.className = 'solution-diagram-caption';
          if (solution.diagramCaptionHtml) {
            caption.innerHTML = 'Обозначения: ' + solution.diagramCaptionHtml;
          } else {
            caption.textContent = 'Обозначения: ' + solution.diagramCaption;
          }
          figure.appendChild(caption);
        }
        modalBody.appendChild(figure);
      }
      const nextIndex = catalogue ? catalogue.ids.indexOf(taskId) + 1 : -1;
      const ogeNext = pageConfig.ogeNavigation?.[taskId];
      const nextTaskId = catalogue ? catalogue.ids[nextIndex] || '' : ogeNext?.id || pageConfig.nextTaskId;
      if (nextTaskId) {
        const navigation = document.createElement('nav');
        navigation.className = 'task-sequence-pager';
        navigation.setAttribute('aria-label', 'Навигация после решения');
        const nextLink = document.createElement('a');
        nextLink.href = catalogue ? catalogueTaskUrl(nextIndex) : ogeNext ? ogeNext.href : '/tasks/' + nextTaskId;
        if (catalogue) {
          nextLink.className = 'catalogue-next-task';
          nextLink.addEventListener('click', function (event) {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
              window.egeAnalytics?.goal('next_task', {placement: 'catalogue_dialog', task_id: nextTaskId});
              return;
            }
            event.preventDefault();
            closeSolutionModal();
            showCatalogueTask(nextIndex, {scroll: true, track: true, placement: 'catalogue_dialog', historyMode: 'push'});
          });
        } else {
          nextLink.dataset.analyticsNextTask = nextTaskId;
          if (ogeNext) {
            nextLink.dataset.analyticsPlacement = 'oge_catalogue_dialog';
            nextLink.dataset.analyticsSection = pageConfig.ogeSection;
            nextLink.addEventListener('click', function (event) {
              if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
              // Cross-page and modified clicks use the shared tracked-link handler.
              if (!document.getElementById('q' + nextTaskId)) return;
              event.preventDefault();
              if (nextLink.dataset.analyticsNavigating) return;
              nextLink.dataset.analyticsNavigating = '1';
              closeSolutionModal();
              history.pushState(null, '', ogeNext.href);
              revealOgeTask(nextTaskId);
              window.egeAnalytics?.goal('next_task', {placement: 'oge_catalogue_dialog', section: pageConfig.ogeSection, task_id: nextTaskId});
            });
          }
        }
        nextLink.textContent = 'Следующее задание →';
        navigation.appendChild(nextLink);
        modalBody.appendChild(navigation);
      }
      if ((catalogue || pageConfig.ogeNavigation) && !nextTaskId) {
        const done = document.createElement('p');
        done.className = 'catalogue-complete';
        done.textContent = 'Это последнее задание подборки. ';
        const returnLink = document.createElement('a');
        returnLink.href = catalogue ? catalogue.hubPath : pageConfig.ogeHubPath;
        returnLink.textContent = 'Выбрать другую тему';
        done.appendChild(returnLink);
        modalBody.appendChild(done);
      }
      modalBody.appendChild(appendSolutionComments(solution, taskId));
      modalBody.scrollTop = 0;
      solutionModal.scrollTop = 0;
      solutionModal.hidden = false;
      modalClose.focus({ preventScroll: true });
      window.egeAnalytics?.goal('solution_open', {placement: 'dialog', task_id: taskId});
    }

    modalClose.addEventListener('click', closeSolutionModal);
    solutionModal.addEventListener('click', event => {
      if (event.target === solutionModal) closeSolutionModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !solutionModal.hidden) closeSolutionModal();
    });

    function addSolutionControls() {
      tasks.forEach(task => {
        const sourceTaskId = task.content?.id?.replace(/^q/, '') || '';
        const taskId = sourceTaskId.toUpperCase();
        if (!/^[A-Z0-9]{4,32}$/i.test(sourceTaskId) || task.content.querySelector('.solution-controls')) return;

        const controls = document.createElement('section');
        controls.className = 'solution-controls';
        const hasPublishedSolution = publishedSolutionIds.has(taskId);
        if (hasPublishedSolution) controls.classList.add('has-published-solution');
        const button = document.createElement('button');
        button.className = 'solution-button';
        button.type = 'button';
        button.textContent = hasPublishedSolution ? 'Открыть решение' : 'Решение';
        button.setAttribute('aria-haspopup', 'dialog');
        const result = document.createElement('div');
        result.className = 'solution-result';
        result.hidden = true;
        const discussionLink = document.createElement('a');
        discussionLink.className = 'solution-discussion-link';
        discussionLink.href = '/tasks/' + encodeURIComponent(taskId) + '#comments';
        discussionLink.textContent = 'Комментарии к решению';
        const feedbackLink = document.createElement('button');
        feedbackLink.className = 'solution-feedback-link';
        feedbackLink.type = 'button';
        feedbackLink.dataset.feedbackModalOpen = '';
        feedbackLink.dataset.taskId = taskId;
        feedbackLink.textContent = 'Ошибка или пожелание';
        if (hasPublishedSolution) {
          const badge = document.createElement('span');
          badge.className = 'solution-published-badge';
          badge.textContent = '✓ Решение опубликовано';
          controls.append(badge);
        }
        controls.append(button);
        if (catalogue) {
          const taskLink = document.createElement('a');
          taskLink.className = 'solution-discussion-link solution-task-link';
          taskLink.href = '/tasks/' + encodeURIComponent(taskId);
          taskLink.textContent = 'Задание ' + taskId + ' на отдельной странице';
          controls.append(taskLink);
        }
        controls.append(discussionLink, feedbackLink, result);
        task.content.appendChild(controls);

        button.addEventListener('click', async function () {
          if (controls.dataset.loaded === 'true') {
            openSolutionModal(controls.solutionData, taskId, button);
            return;
          }

          button.disabled = true;
          button.textContent = 'Загрузка…';
          result.hidden = false;
          result.replaceChildren();
          const loading = document.createElement('p');
          loading.textContent = 'Загружаем решение…';
          result.appendChild(loading);

          try {
            const response = await fetch('/api/solutions/' + encodeURIComponent(taskId), { headers: { Accept: 'application/json' } });
            if (response.status === 404) {
              result.replaceChildren();
              const message = document.createElement('p');
              message.textContent = 'Решение ещё не опубликовано.';
              result.appendChild(message);
              return;
            }
            if (!response.ok) throw new Error('Не удалось загрузить решение.');
            const solution = await response.json();
            result.replaceChildren();
            result.hidden = true;
            controls.solutionData = solution;
            openSolutionModal(solution, taskId, button);
            controls.dataset.loaded = 'true';
            button.textContent = 'Открыть решение';
          } catch {
            result.replaceChildren();
            const message = document.createElement('p');
            message.textContent = 'Не удалось загрузить решение. Попробуйте ещё раз.';
            result.appendChild(message);
          } finally {
            button.disabled = false;
            if (controls.dataset.loaded !== 'true') button.textContent = hasPublishedSolution ? 'Открыть решение' : 'Решение';
          }
        });
      });
    }

    if (pageConfig.ogeMath || pageConfig.ogeSection === 'oge-informatics') {

    // Source tables preserve the original rows and headings.
    // On narrow screens make their existing native scrolling discoverable.
    const sourceTables = pageConfig.ogeSection === 'oge-informatics'
      ? '.qblock .cell_0 table:is(.MsoNormalTable, .MsoTableGrid)'
      : '.qblock .cell_0 table.MsoNormalTable';
    document.querySelectorAll(sourceTables).forEach(table => {
      const hint = document.createElement('p');
      hint.className = 'fipi-table-scroll-hint';
      hint.textContent = 'Прокрутите таблицу вправо, чтобы увидеть все столбцы →';
      hint.hidden = true;
      table.before(hint);
      function updateTableScroll() {
        const scrollable = table.clientWidth > 0 && table.scrollWidth > table.clientWidth + 2 && getComputedStyle(table).overflowX === 'auto';
        hint.hidden = !scrollable;
        table.classList.toggle('fipi-table-scrollable', scrollable);
        if (scrollable) {
          table.tabIndex = 0;
          table.setAttribute('aria-label', 'Таблица условия с горизонтальной прокруткой');
        } else {
          table.removeAttribute('tabindex');
          table.removeAttribute('aria-label');
        }
      }
      const observer = new ResizeObserver(updateTableScroll);
      observer.observe(table);
      if (table.tBodies[0]) observer.observe(table.tBodies[0]);
      updateTableScroll();
    });

}
    addSolutionControls();
    document.documentElement.classList.remove('added-loading');
    if (pageConfig.serverCatalogue) {
      document.documentElement.classList.remove('page-loading');
      const revealFromHash = () => {
        const id = location.hash.match(/^#q([a-z0-9]+)$/i)?.[1];
        if (id) revealOgeTask(id.toUpperCase());
      };
      requestAnimationFrame(revealFromHash);
      window.addEventListener('load', revealFromHash, {once: true});
      window.addEventListener('hashchange', revealFromHash);
      return;
    }
    const top = document.getElementById('local-pager-top') || document.createElement('nav');
    top.hidden = isSingleTaskPage;
    top.id = 'local-pager-top';
    top.className = 'local-pager local-pager--top';
    top.setAttribute('aria-label', 'Навигация по страницам заданий');
    const catalogueStart = document.getElementById('tasks');
    if (catalogueStart) catalogueStart.appendChild(top);
    else document.querySelector('.local-header').insertAdjacentElement('afterend', top);
    const bottom = document.getElementById('local-pager-bottom') || document.createElement('nav');
    bottom.hidden = isSingleTaskPage;
    bottom.id = 'local-pager-bottom';
    bottom.className = 'local-pager';
    bottom.setAttribute('aria-label', 'Навигация по страницам заданий');
    const footer = document.querySelector('.site-footer');
    if (footer) footer.before(bottom); else document.body.appendChild(bottom);
    const pagers = [top, bottom];
    if (!tasks.length) {
      pagers.forEach(pager => { pager.textContent = emptyCatalogueMessage; });
      document.documentElement.classList.remove('page-loading');
      return;
    }

    function catalogueTaskUrl(index) {
      const url = new URL(catalogue.basePath, location.origin);
      if (catalogue.query) url.searchParams.set('q', catalogue.query);
      const serverPage = Math.floor(index / catalogue.pageSize) + 1;
      if (serverPage > 1) url.searchParams.set('page', serverPage);
      url.hash = 'task-' + catalogue.ids[index];
      return url.pathname + url.search + url.hash;
    }

    function catalogueInitialIndex() {
      const id = location.hash.match(/^#(?:task-|q)([a-z0-9]+)$/i)?.[1]?.toUpperCase();
      const byId = id ? catalogue.ids.indexOf(id) : -1;
      if (byId >= 0) return byId;
      // Old catalogue links used viewport-dependent #page=N. Preserve their
      // mobile meaning (one task per page) and redirect into the right chunk.
      const oldPage = Number(location.hash.match(/^#page=(\d+)$/)?.[1]);
      return oldPage > 0 ? Math.min(oldPage - 1, catalogue.total - 1) : catalogue.offset;
    }

    function drawCataloguePager(container) {
      container.replaceChildren();
      container.setAttribute('aria-label', 'Навигация по заданиям подборки');
      const add = (label, index, disabled = false, active = false) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.disabled = disabled;
        if (active) {button.className = 'active';button.setAttribute('aria-current', 'true');}
        button.addEventListener('click', () => showCatalogueTask(index, {scroll: true, track: true, historyMode: 'push'}));
        container.appendChild(button);
      };
      add('← Назад', catalogueIndex - 1, catalogueIndex === 0);
      const numbers = [...new Set([0, catalogueIndex - 1, catalogueIndex, catalogueIndex + 1, catalogue.total - 1])]
        .filter(index => index >= 0 && index < catalogue.total).sort((a, b) => a - b);
      numbers.forEach((index, position) => {
        if (position && index - numbers[position - 1] > 1) {
          const gap = document.createElement('span');gap.textContent = '…';gap.setAttribute('aria-hidden', 'true');container.appendChild(gap);
        }
        add(String(index + 1), index, false, index === catalogueIndex);
      });
      add('Вперёд →', catalogueIndex + 1, catalogueIndex === catalogue.total - 1);
      const label = document.createElement('span');label.className = 'local-page-label';
      label.textContent = 'Задание ' + (catalogueIndex + 1) + ' из ' + catalogue.total;
      container.appendChild(label);
    }

    function showCatalogueTask(index, {scroll = false, track = false, placement = 'catalogue', historyMode = 'replace'} = {}) {
      index = Math.max(0, Math.min(catalogue.total - 1, index));
      const previous = catalogueIndex;
      const id = catalogue.ids[index];
      const task = tasks.find(item => item.id.toUpperCase() === id);
      const targetUrl = catalogueTaskUrl(index);
      const countForward = callback => {
        if (track && index > previous) window.egeAnalytics?.goal('next_task', {placement, page: index + 1, task_id: id}, callback);
        else callback?.();
      };
      if (!task) {
        if (catalogueNavigating) return;
        catalogueNavigating = true;
        let navigated = false;
        const navigate = () => {if (navigated) return;navigated = true;historyMode === 'push' ? location.assign(targetUrl) : location.replace(targetUrl);};
        setTimeout(navigate, 250);
        countForward(navigate);
        return;
      }
      catalogueIndex = index;
      tasks.forEach(item => {
        const hidden = item !== task;
        item.header.classList.toggle('local-task-hidden', hidden);
        item.content.classList.toggle('local-task-hidden', hidden);
      });
      pagers.forEach(drawCataloguePager);
      if (historyMode !== 'none') {
        // Preserve #tasks on entry so the existing start CTA remains stable.
        const url = !scroll && location.hash === '#tasks' ? location.pathname + location.search + '#tasks' : targetUrl;
        if (location.pathname + location.search + location.hash !== url) history[historyMode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
      }
      if (scroll) {
        const header = document.querySelector('.local-header');
        catalogueStart.style.scrollMarginTop = (getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height + 12 : 12) + 'px';
        catalogueStart.scrollIntoView({block: 'start'});
        task.content.tabIndex = -1;
        task.content.focus({preventScroll: true});
      }
      countForward();
    }

    if (catalogue) {
      const initialHash = location.hash;
      showCatalogueTask(catalogueInitialIndex(), {historyMode: 'none'});
      document.documentElement.classList.remove('page-loading');
      const reveal = () => {
        if (initialHash && !catalogueNavigating) showCatalogueTask(catalogueInitialIndex(), {scroll: true, historyMode: 'none'});
      };
      requestAnimationFrame(() => requestAnimationFrame(reveal));
      window.addEventListener('load', reveal, {once: true});
      window.addEventListener('popstate', () => {
        if (!solutionModal.hidden) closeSolutionModal();
        showCatalogueTask(catalogueInitialIndex(), {scroll: true, historyMode: 'none'});
      });
      window.addEventListener('pageshow', () => {catalogueNavigating = false;});
      return;
    }

    function drawPager(container, current) {
      const pageCount = pages.length;
      container.replaceChildren();
      const add = (label, page, disabled, active) => {
        const button = document.createElement('button');
        button.textContent = label;
        button.disabled = disabled;
        if (active) button.className = 'active';
        button.addEventListener('click', () => showPage(page, true));
        container.appendChild(button);
      };
      add('← Назад', current - 1, current === 1, false);
      const pageLinks = [];
      const addPage = (page) => {
        if (!pageLinks.includes(page) && page >= 1 && page <= pageCount) pageLinks.push(page);
      };
      addPage(1);
      addPage(current - 1);
      addPage(current);
      addPage(current + 1);
      addPage(pageCount);
      pageLinks.sort((a, b) => a - b).forEach((page, index, pagesToShow) => {
        if (index && page - pagesToShow[index - 1] > 1) {
          const gap = document.createElement('span');
          gap.textContent = '…';
          gap.setAttribute('aria-hidden', 'true');
          container.appendChild(gap);
        }
        add(String(page), page, false, page === current);
      });
      add('Вперёд →', current + 1, current === pageCount, false);
      const label = document.createElement('span');
      label.className = 'local-page-label';
      label.textContent = 'Страница ' + current + ' из ' + pageCount + ' · заданий: ' + tasks.length;
      container.appendChild(label);
    }

    function showPage(page, scroll) {
      const pageCount = pages.length;
      page = Math.max(1, Math.min(pageCount, page));
      const previousPage = currentPage;
      currentPage = page;
      const visible = new Set(pages[page - 1]);
      tasks.forEach((task, index) => {
        const hidden = !visible.has(index);
        task.header.classList.toggle('local-task-hidden', hidden);
        if (task.content) task.content.classList.toggle('local-task-hidden', hidden);
      });
      pagers.forEach(pager => drawPager(pager, page));
      if (!isSingleTaskPage) history.replaceState(null, '', '#page=' + page);
      if (scroll && page > previousPage) {
        window.egeAnalytics?.goal('next_task', {placement: 'catalogue', page: page,
          task_id: tasks[pages[page - 1]?.[0]]?.content?.id.slice(1)});
      }
      // Переключение страницы не должно менять вертикальную позицию пользователя.
    }

    function measureAndBuildPages(anchorTask) {
      if (catalogueStart) {
        const header = document.querySelector('.local-header');
        catalogueStart.style.scrollMarginTop = (getComputedStyle(header).position === 'sticky'
          ? header.getBoundingClientRect().height + 12 : 12) + 'px';
      }
      // Сначала показываем все блоки, чтобы измерить их фактическую высоту
      // при текущей ширине окна и масштабе браузера.
      tasks.forEach(task => {
        task.header.classList.remove('local-task-hidden');
        if (task.content) task.content.classList.remove('local-task-hidden');
      });

      const chromeHeight = document.querySelector('.local-header').getBoundingClientRect().height
        + top.getBoundingClientRect().height + bottom.getBoundingClientRect().height + 120;
      const available = Math.max(320, window.innerHeight - chromeHeight);
      const heights = tasks.map(task => {
        const headerRect = task.header.getBoundingClientRect();
        const contentRect = task.content ? task.content.getBoundingClientRect() : headerRect;
        return Math.max(headerRect.height + contentRect.height, contentRect.bottom - headerRect.top) + 28;
      });

      pages = [];
      let page = [];
      let used = 0;
      heights.forEach((height, index) => {
        if (page.length && used + height > available) {
          pages.push(page);
          page = [];
          used = 0;
        }
        page.push(index);
        used += height;
      });
      if (page.length) pages.push(page);

      // Нулевые размеры во время восстановления страницы из кэша браузера
      // раньше объединяли весь каталог в «Страницу 1 из 1». В таком случае
      // сохраняем рабочую постраничную навигацию: по одному заданию на страницу.
      if (pages.length === 1 && tasks.length > 1) {
        pages = tasks.map((_, index) => [index]);
      }

      const nextPage = Math.max(0, pages.findIndex(group => group.includes(anchorTask))) + 1;
      showPage(nextPage, false);
    }

    function adaptToViewport() {
      const anchorTask = pages[currentPage - 1]?.[0] || 0;
      measureAndBuildPages(anchorTask);
    }

    const jumpToTasks = location.hash === '#tasks';
    const initial = Number((location.hash.match(/page=(\d+)/) || [])[1]) || 1;
    measureAndBuildPages(0);
    showPage(initial, false);
    // Показываем интерфейс сразу, не ожидая загрузки всех ресурсов скрытых страниц.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.remove('page-loading');
        if (jumpToTasks && catalogueStart) catalogueStart.scrollIntoView({ block: 'start' });
      });
    });
    // После загрузки видимых картинок незаметно уточняем разбиение.
    window.addEventListener('load', function () {
      adaptToViewport();
    }, { once: true });
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(adaptToViewport, 160);
    });
    window.addEventListener('pageshow', function () {
      // Восстановление страницы из истории браузера может вернуть устаревшее DOM-состояние.
      requestAnimationFrame(function () {
        if (pages.length) adaptToViewport();
        document.documentElement.classList.remove('page-loading', 'added-loading');
      });
    });
  });
})();
