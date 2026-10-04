/* Progressive enhancement. All substantive text remains readable without JavaScript. */
(function () {
  'use strict';
  const data = window.PARISH;
  const math = window.ParishMath;
  if (!data || !math) return;
  const { config, t, lang } = data;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let toastTimer;

  function announce(message) {
    const box = $('.toast');
    if (!box) return;
    window.clearTimeout(toastTimer);
    box.textContent = message;
    box.classList.add('is-visible');
    toastTimer = window.setTimeout(() => box.classList.remove('is-visible'), 4200);
  }
  async function copy(value) {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      announce(t.copied);
    } catch (_) {
      // Never report a successful copy when the browser denied permission.
      announce(t.copyError);
    }
  }
  $$('[data-copy]').forEach(button => button.addEventListener('click', () => copy(button.dataset.copy)));
  $$('[data-copy-details]').forEach(button => button.addEventListener('click', () => {
    const p = config.parish;
    const values = [p.legalName, p.code, p.bank, p.iban, p.bic, p.purpose];
    copy(values.map((value, i) => `${t.donateFields[i]}: ${value}`).join('\n'));
  }));

  // Navigation: no personal preferences or identifiers are persisted.
  const language = $('#language-control');
  const mobileNav = $('#mobile-nav');
  const menu = $('.menu-toggle');
  function closeMenu() {
    if (mobileNav) mobileNav.hidden = true;
    if (menu) menu.setAttribute('aria-expanded', 'false');
  }
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    mobileNav.hidden = !open;
  });
  mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('click', event => {
    if (language?.open && !language.contains(event.target)) language.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (language?.open) { language.open = false; language.querySelector('summary')?.focus(); }
    if (menu?.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
  });
  const languageLinks = $$('[data-language]');
  function syncLanguageLinks() {
    languageLinks.forEach(link => { link.hash = window.location.hash; });
  }
  syncLanguageLinks();
  window.addEventListener('hashchange', syncLanguageLinks);

  function vilniusDate() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const part = type => parts.find(p => p.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  const status = $('#campaign-status');
  if (status) {
    const phase = math.campaignPhase(vilniusDate(), config.campaign);
    status.textContent = ({ prelaunch: t.prelaunch, open: t.openStatus, closed: t.closedStatus, unverified: t.unverified })[phase];
    status.dataset.phase = phase;
  }

  // The inputs are hypothetical figures, processed exclusively in this browser.
  const amount = $('#gpm-amount');
  const people = $('#people-count');
  if (amount && people) {
    const money = new Intl.NumberFormat(t.locale, { style: 'currency', currency: 'EUR' });
    function calculate() {
      const cents = math.parseAmountToCents(amount.value);
      const count = Math.max(1, Math.min(200, Number.parseInt(people.value, 10) || 1));
      $('#people-output').textContent = String(count);
      $('#calc-error').hidden = cents !== null;
      amount.setAttribute('aria-invalid', String(cents === null));
      if (cents === null) {
        $('#single-result').textContent = '—';
        $('#group-result').textContent = '—';
        return;
      }
      const one = math.supportCents(cents);
      $('.calc-results').classList.toggle('long-numbers', one * count >= 10000000);
      $('#single-result').textContent = money.format(one / 100);
      $('#group-result').textContent = money.format(one * count / 100);
    }
    amount.addEventListener('input', calculate);
    people.addEventListener('input', calculate);
    calculate();
  }

  const tabs = $$('.guide-tab');
  let currentStep = 0;
  function setStep(index, focus = false) {
    currentStep = Math.max(0, Math.min(tabs.length - 1, index));
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === currentStep));
      tab.tabIndex = i === currentStep ? 0 : -1;
      const panel = $(`#guide-panel-${i}`);
      panel.classList.toggle('is-active', i === currentStep);
      panel.hidden = i !== currentStep;
    });
    $('[data-step-prev]').disabled = currentStep === 0;
    $('[data-step-next]').disabled = currentStep === tabs.length - 1;
    $('#step-counter').textContent = `${t.stepWord} ${currentStep + 1} ${t.ofWord} ${tabs.length}`;
    if (focus) tabs[currentStep].focus({ preventScroll: true });
  }
  if (tabs.length) {
    const smallGuide = window.matchMedia('(max-width: 730px)');
    const orient = () => $('.guide-tabs').setAttribute('aria-orientation', smallGuide.matches ? 'horizontal' : 'vertical');
    orient(); smallGuide.addEventListener?.('change', orient);
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => setStep(index));
      tab.addEventListener('keydown', event => {
        const move = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (move) { event.preventDefault(); setStep((currentStep + move + tabs.length) % tabs.length, true); }
        if (event.key === 'Home') { event.preventDefault(); setStep(0, true); }
        if (event.key === 'End') { event.preventDefault(); setStep(tabs.length - 1, true); }
      });
    });
    $('[data-step-prev]').addEventListener('click', () => setStep(currentStep - 1));
    $('[data-step-next]').addEventListener('click', () => setStep(currentStep + 1));
    setStep(0);
  }

  // No YouTube iframe, remote thumbnail or Google request exists before this explicit action.
  const loadVideo = $('#load-video');
  const stopVideo = $('#stop-video');
  loadVideo?.addEventListener('click', () => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(config.video.id) || $('#vmi-video')) return;
    const iframe = document.createElement('iframe');
    iframe.id = 'vmi-video';
    iframe.title = t.videoTitleFrame;
    iframe.src = `https://www.youtube-nocookie.com/embed/${config.video.id}?playsinline=1&rel=0`;
    iframe.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    $('#video-placeholder').hidden = true;
    $('#video-shell').append(iframe);
    stopVideo.hidden = false;
    stopVideo.focus({ preventScroll: true });
  });
  stopVideo?.addEventListener('click', () => {
    $('#vmi-video')?.remove();
    $('#video-placeholder').hidden = false;
    stopVideo.hidden = true;
    loadVideo.focus({ preventScroll: true });
  });

  function fallbackImage(image) {
    if (image.dataset.usingFallback === 'true') return;
    image.dataset.usingFallback = 'true';
    image.alt = image.dataset.fallbackCaption || data.illustrationLabel;
    image.closest('.project-visual')?.classList.add('is-fallback');
    const chip = image.closest('.project-visual')?.querySelector('.image-caption-chip');
    if (chip) chip.textContent = data.illustrationLabel;
    image.src = image.dataset.fallback;
  }
  $$('img[data-fallback]').forEach(image => {
    image.addEventListener('error', () => fallbackImage(image));
    if (image.complete && !image.naturalWidth) fallbackImage(image);
  });

  const dialog = $('#photo-dialog');
  let dialogTrigger;
  if (dialog && typeof dialog.showModal === 'function') {
    function closeDialog() { dialog.close(); }
    $$('[data-photo]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.photo);
      const source = $(`[data-photo-asset="${index}"]`);
      if (!source) return;
      const project = Math.max(0, index - 1);
      const item = t.projects[project];
      const image = $('#dialog-image');
      const isFallback = source.dataset.usingFallback === 'true';
      const showHotspots = index === 2 && !isFallback;
      image.src = source.currentSrc || source.src;
      image.alt = source.alt;
      $('#dialog-title').textContent = item[0];
      $('#dialog-description').textContent = item[2];
      $('#dialog-caption').textContent = isFallback ? data.illustrationLabel : index <= 1 ? t.heroPhotoNote : t.conceptLabel;
      $('#dialog-project-link').href = config.projectLinks[project];
      $('#dialog-project-link').firstChild.textContent = item[3];
      $('#hotspots').hidden = !showHotspots;
      $('#hotspot-description').hidden = !showHotspots;
      document.body.classList.add('modal-open');
      dialogTrigger = button;
      dialog.showModal();
    }));
    $$('[data-hotspot]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.hotspot);
      $$('[data-hotspot]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      $('#hotspot-title').textContent = t.hotspots[index][0];
      $('#hotspot-text').textContent = t.hotspots[index][1];
    }));
    $('#dialog-image').addEventListener('error', () => { $('#dialog-caption').textContent = t.imageUnavailable; });
    $$('[data-close-dialog]').forEach(button => button.addEventListener('click', closeDialog));
    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      dialogTrigger?.focus({ preventScroll: true });
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog();
    });
  } else {
    $$('[data-photo]').forEach(button => button.remove());
  }

  $$('[data-share]').forEach(button => button.addEventListener('click', async () => {
    if (!/^https?:$/.test(location.protocol)) { announce(t.copyError); return; }
    const url = document.querySelector('link[rel="canonical"]')?.href || location.href;
    if (navigator.share) {
      try { await navigator.share({ title: t.title, text: t.description, url }); }
      catch (error) { if (error.name !== 'AbortError') copy(url); }
    } else copy(url);
  }));
  function printPage() {
    // Printing should expose every instructional step and FAQ answer.
    const faq = $$('.faq-list details');
    const opened = faq.map(item => item.open);
    faq.forEach(item => { item.open = true; });
    $$('.guide-panel').forEach(panel => { panel.hidden = false; });
    const restore = () => {
      faq.forEach((item, i) => { item.open = opened[i]; });
      if (tabs.length) setStep(currentStep);
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }
  $$('[data-print]').forEach(button => button.addEventListener('click', printPage));

  document.body.classList.add('enhanced');
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('will-reveal');
      observer.unobserve(entry.target);
    }), { threshold: 0.08 });
    document.body.classList.add('motion-ready');
    $$('.reveal').forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight + 80) {
        element.classList.add('will-reveal');
        observer.observe(element);
      }
    });
    // Never hide content when a visitor enables reduced motion mid-session.
    reducedMotion.addEventListener?.('change', event => {
      if (event.matches) { $$('.will-reveal').forEach(el => el.classList.remove('will-reveal')); observer.disconnect(); }
    });
  }
})();
