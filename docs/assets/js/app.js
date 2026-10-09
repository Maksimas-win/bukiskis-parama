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
  const comfortableReading = () => document.documentElement.dataset.reading === 'comfortable';
  let toastTimer;

  function announce(message) {
    const box = $('.toast');
    if (!box) return;
    window.clearTimeout(toastTimer);
    box.textContent = message;
    box.classList.add('is-visible');
    toastTimer = window.setTimeout(() => box.classList.remove('is-visible'), 4200);
  }
  async function copy(value, button) {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      if (button) {
        button.classList.add('is-copied');
        window.setTimeout(() => button.classList.remove('is-copied'), 2200);
      }
      announce(t.copied);
    } catch (_) {
      // Never report a successful copy when the browser denied permission.
      announce(t.copyError);
    }
  }
  $$('[data-copy]').forEach(button => button.addEventListener('click', () => copy(button.dataset.copy, button)));
  $$('[data-copy-details]').forEach(button => button.addEventListener('click', () => {
    const p = config.parish;
    const values = [p.legalName, p.code, p.bank, p.iban, p.bic, p.purpose];
    copy(values.map((value, i) => `${t.donateFields[i]}: ${value}`).join('\n'), button);
  }));

  // Navigation itself does not persist preferences or identifiers.
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
    const thresholdNote = $('#calc-threshold-note');
    const groupLabel = $('#group-result-label');
    function updateSlider(count) {
      const min = Number(people.min) || 1, max = Number(people.max) || 200;
      const pct = Math.max(0, Math.min(100, ((count - min) / (max - min)) * 100));
      people.style.setProperty('--val', pct.toFixed(1) + '%');
    }
    function calculate() {
      const cents = math.parseAmountToCents(amount.value);
      const count = Math.max(1, Math.min(200, Number.parseInt(people.value, 10) || 1));
      updateSlider(count);
      $('#people-output').textContent = String(count);
      $('#calc-error').hidden = cents !== null;
      amount.setAttribute('aria-invalid', String(cents === null));
      if (thresholdNote) thresholdNote.hidden = true;
      if (groupLabel) groupLabel.textContent = t.calcTogether;
      if (cents === null) {
        $('#single-result').textContent = '—';
        $('#group-result').textContent = '—';
        $('.calc-results').classList.remove('long-numbers');
        return;
      }
      const one = math.supportCents(cents);
      const transferable = math.transferableSupportCents(cents);
      $('.calc-results').classList.toggle('long-numbers', transferable * count >= 10000000);
      $('#single-result').textContent = money.format(one / 100);
      $('#group-result').textContent = money.format(transferable * count / 100);
      if (one < 300) {
        if (thresholdNote) thresholdNote.hidden = false;
        if (groupLabel) groupLabel.textContent = t.calcGroupBelowMinimum;
      }
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
    function finishDialogClose() {
      // A queued close event from an earlier view must not disturb a reopened dialog.
      if (dialog.open) return;
      document.body.classList.remove('modal-open');
      const trigger = dialogTrigger;
      dialogTrigger = undefined;
      trigger?.focus({ preventScroll: true });
    }
    function closeDialog() {
      if (!dialog.open) return;
      dialog.close();
      finishDialogClose();
    }
    function openProject(button) {
      if (dialog.open) return;
      const index = Number(button.dataset.photo);
      const source = $(`[data-photo-asset="${index}"]`);
      if (!source) return;
      const project = Math.max(0, index - 1);
      const item = t.projects[project];
      const image = $('#dialog-image');
      const isFallback = source.dataset.usingFallback === 'true';
      const isParishPhoto = index === 1 && !isFallback;
      const showHotspots = index === 2 && !isFallback;
      image.src = isParishPhoto && source.dataset.dialogSrc ? source.dataset.dialogSrc : source.currentSrc || source.src;
      image.alt = source.alt;
      image.width = isFallback ? 720 : source.naturalWidth || source.width;
      image.height = isFallback ? 460 : source.naturalHeight || source.height;
      dialog.classList.toggle('is-parish-photo', isParishPhoto);
      const original = $('#dialog-original');
      if (original) { original.href = image.src; original.hidden = !isParishPhoto; }
      $('#dialog-title').textContent = item[0];
      $('#dialog-description').textContent = item[2];
      $('#dialog-caption').textContent = isFallback ? data.illustrationLabel : isParishPhoto ? t.parishAppeal.caption : t.conceptLabel;
      $('#dialog-project-link').href = config.projectLinks[project];
      $('#dialog-project-link').firstChild.textContent = item[3];
      $('#hotspots').hidden = !showHotspots;
      $('#hotspot-description').hidden = !showHotspots;
      setHotspot(0);
      document.body.classList.add('modal-open');
      dialogTrigger = button;
      dialog.showModal();
    }
    $$('[data-photo]').forEach(button => button.addEventListener('click', () => openProject(button)));
    function setHotspot(index) {
      $$('[data-hotspot]').forEach(item => item.setAttribute('aria-pressed', String(Number(item.dataset.hotspot) === index)));
      $('#hotspot-title').textContent = t.hotspots[index][0];
      $('#hotspot-text').textContent = t.hotspots[index][1];
    }
    $$('[data-hotspot]').forEach(button => button.addEventListener('click', () => setHotspot(Number(button.dataset.hotspot))));
    $('#dialog-image').addEventListener('error', () => { $('#dialog-caption').textContent = t.imageUnavailable; });
    $$('[data-close-dialog]').forEach(button => button.addEventListener('click', closeDialog));
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeDialog();
    });
    dialog.addEventListener('close', finishDialogClose);
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
  if (!reducedMotion.matches && !comfortableReading() && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('will-reveal');
      observer.unobserve(entry.target);
    }), { threshold: 0.08 });
    document.body.classList.add('motion-ready');
    // Reveal the remaining content blocks too; nested candidates follow their container.
    const blocks = $$('.section-top, .way, .guide-grid, .calculator-grid, .video-grid, .faq-list details, .sources, .project-card, .donate-intro, .bank-card, .parish-support-card');
    blocks.filter(element => !blocks.some(other => other !== element && other.contains(element)))
      .forEach(element => element.classList.add('reveal'));
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

  // Depth: surfaces follow a mouse or pen with tilt and light. Touch and reduced motion keep the flat design.
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (finePointer.matches && !reducedMotion.matches && !comfortableReading()) {
    document.body.classList.add('depth-ready');
    $$('.hero, .info-visual, .project-visual, .diagram, .bank-card, .parish-support-card, .calculator-section').forEach(surface => {
      let frame = 0;
      surface.addEventListener('pointermove', event => {
        if (comfortableReading() || reducedMotion.matches) return;
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          if (comfortableReading() || reducedMotion.matches) return;
          const box = surface.getBoundingClientRect();
          if (!box.width || !box.height) return;
          surface.style.setProperty('--px', ((event.clientX - box.left) / box.width - 0.5).toFixed(3));
          surface.style.setProperty('--py', ((event.clientY - box.top) / box.height - 0.5).toFixed(3));
          surface.classList.add('is-tilting');
        });
      });
      surface.addEventListener('pointerleave', () => {
        window.cancelAnimationFrame(frame);
        surface.classList.remove('is-tilting');
        surface.style.removeProperty('--px');
        surface.style.removeProperty('--py');
      });
    });
    reducedMotion.addEventListener?.('change', event => {
      if (event.matches) document.body.classList.remove('depth-ready');
    });
  }

  document.addEventListener('gpm:reading-mode-change', event => {
    if (!event.detail?.enabled) return;
    document.body.classList.remove('depth-ready', 'motion-ready');
    $$('.will-reveal').forEach(element => element.classList.remove('will-reveal'));
    $$('.is-tilting').forEach(element => element.classList.remove('is-tilting'));
    $('.calc-results')?.classList.remove('is-bump');
  });

  // The example total gives a short visual response when its inputs change.
  const results = $('.calc-results');
  if (results && !reducedMotion.matches) {
    $$('#gpm-amount, #people-count').forEach(input => input.addEventListener('input', () => {
      if (comfortableReading() || reducedMotion.matches) return;
      results.classList.remove('is-bump');
      void results.offsetWidth;
      results.classList.add('is-bump');
    }));
  }
})();
