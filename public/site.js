'use strict';

document.addEventListener('DOMContentLoaded', () => {
  if (location.pathname === '/study-request/sent' && document.cookie.split('; ').includes('ege_study_accepted=1')) {
    document.cookie = 'ege_study_accepted=; Max-Age=0; Path=/; Secure; SameSite=Lax';
    window.egeAnalytics?.goal('study_lead_accepted');
  }
  document.querySelectorAll('.study-request-form').forEach(form => {
    const section = form.closest('.study-request');
    const success = section.querySelector('.study-request-success');
    const error = form.querySelector('.study-request-error');
    const button = form.querySelector('[type="submit"]');
    const resetTime = () => { form.elements.formStartedAt.value = String(Date.now()); };
    resetTime();
    section.querySelector('[data-study-again]').addEventListener('click', () => {
      success.hidden = true;
      form.hidden = false;
      resetTime();
      form.elements.name.focus();
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = 'Отправляем…';
      error.hidden = true;
      try {
        const response = await fetch(form.action, {
          method: 'POST', headers: {Accept: 'application/json'},
          body: new URLSearchParams(new FormData(form)), signal: AbortSignal.timeout(15000)
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || 'Не удалось отправить обращение. Попробуйте ещё раз.');
        form.reset();
        form.hidden = true;
        success.hidden = false;
        success.focus({preventScroll: true});
        if (result.accepted) window.egeAnalytics?.goal('study_lead_accepted');
      } catch (failure) {
        error.textContent = failure.name === 'TimeoutError' || failure instanceof TypeError
          ? 'Нет ответа от сервера. Проверьте соединение и попробуйте ещё раз.' : failure.message;
        error.hidden = false;
      } finally {
        button.disabled = false;
        button.textContent = 'Отправить обращение →';
      }
    });
  });
});

// Native details keep menus and examples usable without JavaScript.
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const menus = [...header.querySelectorAll('.site-dropdown, .site-mobile-menu')];
  const closeMenus = except => menus.forEach(menu => { if (menu !== except) menu.open = false; });
  menus.forEach(menu => menu.addEventListener('toggle', () => {
    if (menu.open) closeMenus(menu);
  }));
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) closeMenus();
    if (header.contains(event.target) && event.target.closest('a')) closeMenus();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = menus.find(menu => menu.open);
    if (open) {
      closeMenus();
      open.querySelector('summary').focus({preventScroll: true});
    }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', () => closeMenus());
});

// One inline banner after the introduction. Never start automatic placements.
document.addEventListener('DOMContentLoaded', () => {
  const ad = document.querySelector('[data-site-ad]');
  if (!ad) return;
  const slot = ad.querySelector('.site-ad-slot');
  let requested = false;
  const collapse = reason => {
    ad.dataset.adState = 'empty';
    ad.dataset.adEmptyReason = reason;
    ad.setAttribute('aria-hidden', 'true');
    // Release space only below the viewport. Collapsing a visible slot moves
    // the task the reader is looking at; retain that reservation on this page.
    if (ad.getBoundingClientRect().top >= window.innerHeight) ad.hidden = true;
  };
  const load = () => {
    if (requested) return;
    requested = true;
    ad.dataset.adState = 'loading';
    window.yaContextCb = window.yaContextCb || [];
    window.yaContextCb.push(() => {
      if (!ad.isConnected || ad.hidden) return;
      try {
        window.Ya.Context.AdvManager.render({
          blockId: ad.dataset.siteAd,
          renderTo: slot.id,
          onError: error => { if (error.type === 'error') collapse(error.code || 'sdk-error'); },
          onRender: () => {
            ad.dataset.adState = 'ready';
            ad.removeAttribute('aria-hidden');
            delete ad.dataset.adEmptyReason;
            ad.querySelector('.site-ad-label').hidden = false;
          }
        }, () => collapse('no-offer'));
      } catch {
        collapse('render-error');
      }
    });
    const src = 'https://yandex.ru/ads/system/context.js';
    if (!document.querySelector(`script[src="${src}"]`)) {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.addEventListener('error', () => collapse('loader-error'), {once: true});
      document.head.append(script);
    }
  };
  load();
});
