/* Only the acknowledgement is stored locally. This never enables external services. */
(function () {
  'use strict';
  const notice = document.getElementById('cookie-notice');
  if (!notice) return;
  const confirm = notice.querySelector('[data-cookie-confirm]');
  const reopen = document.querySelectorAll('[data-cookie-open]');
  const key = 'bukiskis-parama:privacy-notice:v1';
  let trigger;
  function show() {
    notice.hidden = false;
    document.body.classList.add('cookie-notice-visible');
  }
  function hide() {
    notice.hidden = true;
    document.body.classList.remove('cookie-notice-visible');
  }
  let acknowledged = false;
  try { acknowledged = window.localStorage.getItem(key) === 'acknowledged'; } catch (_) {}
  if (!acknowledged) {
    const welcome = document.getElementById('photo-dialog');
    if (welcome?.open) welcome.addEventListener('close', show, {once: true});
    else show();
  }
  confirm.addEventListener('click', () => {
    try { window.localStorage.setItem(key, 'acknowledged'); } catch (_) {}
    hide();
    trigger?.focus({preventScroll: true});
  });
  reopen.forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      trigger = button;
      show();
      confirm.focus({preventScroll: true});
    });
  });
})();
