'use strict';

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
  const introduction = document.querySelector('.study-hero, .exam-intro, .math-hub-intro, .page-heading');
  if (introduction) introduction.after(ad);
  const slot = ad.querySelector('.site-ad-slot');
  let requested = false;
  const collapse = reason => {
    ad.dataset.adState = 'empty';
    ad.dataset.adEmptyReason = reason;
    ad.hidden = true;
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
