/* Optional reading preference. No identifiers, content, or calculator data are stored. */
(() => {
  'use strict';
  const html = document.documentElement;
  const key = 'gpm:reading-mode:v1';
  const buttons = Array.from(document.querySelectorAll('[data-reading-toggle]'));
  const statuses = Array.from(document.querySelectorAll('[data-reading-status]'));
  const enabled = () => html.dataset.reading === 'comfortable';

  function readPreference() {
    try { return window.localStorage.getItem(key) === 'comfortable'; }
    catch (_) { return false; }
  }

  function apply(preference, announce = false) {
    const changed = enabled() !== preference;
    if (preference) html.dataset.reading = 'comfortable';
    else delete html.dataset.reading;
    const text = window.PARISH?.t?.reading || {};
    buttons.forEach(button => {
      button.hidden = false;
      button.setAttribute('aria-pressed', String(preference));
      if (text.toggle) {
        button.setAttribute('aria-label', text.toggle);
        button.title = text.toggle;
      }
      const label = button.querySelector('.reading-label');
      if (label && text.label) label.textContent = text.label;
    });
    if (announce) {
      statuses.forEach(status => { status.textContent = (preference ? text.enabled : text.disabled) || ''; });
    }
    if (changed) document.dispatchEvent(new CustomEvent('gpm:reading-mode-change', { detail: { enabled: preference } }));
  }

  apply(readPreference());
  html.classList.add('reading-ready');
  buttons.forEach(button => button.addEventListener('click', () => {
    const preference = !enabled();
    apply(preference, true);
    try {
      if (preference) window.localStorage.setItem(key, 'comfortable');
      else window.localStorage.removeItem(key);
    } catch (_) {
      // Blocked browser storage must not prevent changing the current page.
    }
  }));
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(readPreference(), true);
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) apply(readPreference());
  });
})();
