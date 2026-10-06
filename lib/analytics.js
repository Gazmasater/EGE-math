const {randomBytes} = require('node:crypto');

// This non-identifying, short-lived marker is set only after a successful INSERT.
function registrationAnalyticsCookie() {
  return `ege_registration_success=${randomBytes(16).toString('hex')}; Max-Age=120; Path=/; Secure; SameSite=Lax`;
}

// Serialized into the shared document head; keep this function self-contained.
function analyticsBootstrap() {
  if (window.egeAnalytics) return;
  const counter = 112561663;
  let technical = !!navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
  try {
    const url = new URL(location.href);
    const setting = url.searchParams.get('analytics_technical');
    technical = technical || setting === '1';
    try {
      if (setting === '1') localStorage.setItem('ege_analytics_technical', '1');
      if (setting === '0') localStorage.removeItem('ege_analytics_technical');
      technical = technical || localStorage.getItem('ege_analytics_technical') === '1';
    } catch { /* The explicit setting still applies to this visit. */ }
    if (setting === '1' || setting === '0') {
      url.searchParams.delete('analytics_technical');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
  } catch { /* Storage restrictions must not affect the site. */ }

  function goal(name, params, callback) {
    try {
      if (typeof window.ym === 'function') window.ym(counter, 'reachGoal', name, params, callback);
    } catch { /* Analytics must never block navigation or account creation. */ }
  }
  window.egeAnalytics = {goal, visitParams: {traffic_kind: technical ? 'technical' : 'public'}};

  function consumeRegistration() {
    const marker = document.cookie.match(/(?:^|;\s*)ege_registration_success=([a-f0-9]{32})(?:;|$)/);
    if (!marker) return;
    document.cookie = 'ege_registration_success=; Max-Age=0; Path=/; Secure; SameSite=Lax';
    // Also protect against cookie deletion being restricted by a browser.
    try {
      if (sessionStorage.getItem('ege_registration_sent') === marker[1]) return;
      sessionStorage.setItem('ege_registration_sent', marker[1]);
    } catch {}
    goal('registration_success', {placement: 'registration_redirect'});
  }

  function ready() {
    consumeRegistration();
    document.addEventListener('click', function (event) {
      const link = event.target.closest && event.target.closest('a[data-analytics-next-task]');
      if (!link || event.defaultPrevented || event.button !== 0) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === '_blank') {
        goal('next_task', {placement: 'task_page', task_id: link.dataset.analyticsNextTask});
        return;
      }
      event.preventDefault();
      if (link.dataset.analyticsNavigating) return;
      link.dataset.analyticsNavigating = '1';
      let navigated = false;
      const navigate = function () {
        if (navigated) return;
        navigated = true;
        location.assign(link.href);
      };
      // The counter callback normally wins; blockers still permit navigation.
      setTimeout(navigate, 250);
      goal('next_task', {placement: 'task_page', task_id: link.dataset.analyticsNextTask}, navigate);
    });
    window.addEventListener('pageshow', function () {
      document.querySelectorAll('[data-analytics-navigating]').forEach(link => delete link.dataset.analyticsNavigating);
    });

    const heading = document.querySelector('.seo-task-solution h2');
    if (!heading || !('IntersectionObserver' in window)) return;
    let visible = false, timer;
    function schedule() {
      clearTimeout(timer);
      if (!visible || document.visibilityState !== 'visible') return;
      timer = setTimeout(function () {
        observer.disconnect();
        document.removeEventListener('visibilitychange', schedule);
        goal('solution_open', {placement: 'task_page', task_id: heading.id.replace(/^solution-/, '')});
      }, 1000);
    }
    const observer = new IntersectionObserver(function (entries) {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5);
      schedule();
    }, {threshold: [0, 0.5]});
    observer.observe(heading);
    document.addEventListener('visibilitychange', schedule);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once: true});
  else ready();
}

const ANALYTICS_SCRIPT = `(${analyticsBootstrap.toString()})();`;
module.exports = {ANALYTICS_SCRIPT, registrationAnalyticsCookie};
