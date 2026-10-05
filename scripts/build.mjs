import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const math = require('../src/math.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = name => JSON.parse(fs.readFileSync(path.join(root, 'src', name), 'utf8'));
const config = readJSON('site.config.json');
const media = readJSON('media.json');
const locales = Object.fromEntries(config.languages.map(lang => [lang, readJSON(`locales/${lang}.json`)]));
const out = path.join(root, 'docs');
const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const h = esc;
const ibanDisplay = config.parish.iban.match(/.{1,4}/g).join(' ');
const configuredUrl = String(process.env.SITE_URL || config.publicBaseUrl).trim();
const publicUrl = configuredUrl ? new URL(configuredUrl) : null;
if (publicUrl && (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash)) {
 throw new Error('publicBaseUrl must be an absolute HTTPS URL without credentials, query or fragment');
}
const baseUrl = publicUrl ? publicUrl.href.replace(/\/?$/, '/') : '';
const hasPublicUrl = Boolean(publicUrl);
const pageURL = (lang, privacy=false) => `${baseUrl}${lang}/${privacy?'privacy':'index'}.html`;
if (!/^\d{4}-\d{2}-\d{2}$/.test(config.contentUpdated) || Number.isNaN(Date.parse(config.contentUpdated)) || new Date(config.contentUpdated).toISOString().slice(0,10) !== config.contentUpdated) {
 throw new Error('contentUpdated must be a valid ISO calendar date');
}
if (!math.validIban(config.parish.iban)) throw new Error('IBAN checksum is invalid');
if (config.parish.code !== '301004570') throw new Error('Recipient code changed: review identity before building');
if (!/^[A-Za-z0-9_-]{11}$/.test(config.video.id)) throw new Error('Invalid YouTube ID');
if (config.campaign.lastTaxYear - config.campaign.taxYear !== 4) throw new Error('The example must cover exactly five tax years');
// Search visibility of the guide does not certify a recipient or bank account.
// Those separate factual checks still control the campaign warnings.
if (config.indexingEnabled && !hasPublicUrl) throw new Error('Public indexing requires a public URL');
if (config.searchConsoleVerificationFile && !/^google[a-f0-9]+\.html$/.test(config.searchConsoleVerificationFile)) {
 throw new Error('Invalid Search Console verification filename');
}
function shape(value) {
 if (Array.isArray(value)) return value.map(shape);
 if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, shape(value[k])]));
 return typeof value;
}
const referenceShape = JSON.stringify(shape(locales[config.defaultLanguage]));
for (const [lang, t] of Object.entries(locales)) {
 if (JSON.stringify(shape(t)) !== referenceShape) throw new Error(`Incomplete locale: ${lang}`);
 if (JSON.stringify(t).includes('TODO')) throw new Error(`Unfinished translation: ${lang}`);
}
fs.rmSync(out, { recursive:true, force:true });
fs.mkdirSync(out, { recursive:true });
fs.copyFileSync(path.join(root,'hosting/.htaccess'),path.join(out,'.htaccess'));
for (const directory of ['css','js','img','fonts']) {
 fs.mkdirSync(path.join(out,'assets',directory),{recursive:true});
}
fs.cpSync(path.join(root,'src/assets/images'),path.join(out,'assets/img'),{recursive:true});
fs.cpSync(path.join(root,'src/assets/fonts'),path.join(out,'assets/fonts'),{recursive:true});
for (const entry of fs.readdirSync(path.join(root,'src/assets'),{withFileTypes:true})) {
 if (!entry.isFile()) continue;
 const directory=entry.name.endsWith('.css')?'css':'js';
 fs.copyFileSync(path.join(root,'src/assets',entry.name),path.join(out,'assets',directory,entry.name));
}
for (const name of ['styles.css','app.js','math.js']) {
 const directory=name.endsWith('.css')?'css':'js';
 fs.copyFileSync(path.join(root,'src',name),path.join(out,'assets',directory,name));
}
const iconPaths = {
 arrow:'<path d="M4 12h15M13 6l6 6-6 6"/>',
 back:'<path d="M20 12H5m6-6-6 6 6 6"/>',
 diagonal:'<path d="M6 18 18 6M6 6h12v12"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V4H4v11h4"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
 play:'<path d="m8 5 11 7-11 7Z"/>',
 expand:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 paper:'<path d="M6 3h9l4 4v14H6Z"/><path d="M14 3v5h5M9 12h7M9 16h5"/>',
 person:'<circle cx="12" cy="8" r="3"/><path d="M5 20v-3c0-5 14-5 14 0v3"/>',
 percent:'<path d="m6 19 12-14"/><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/>',
 phone:'<path d="m6 3 4 4-2 3c1 3 3 5 6 6l3-2 4 4c-4 8-21-9-15-15Z"/>',
 link:'<path d="m9 15 6-6m-5-2 2-2a5 5 0 0 1 7 7l-2 2m-3 3-2 2a5 5 0 0 1-7-7l2-2"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.arrow}</svg>`;
const brandMark = '<span class="brand-mark" aria-hidden="true">%</span>';
const external = (url,label,cls='text-link') => `<a class="${cls}" href="${h(url)}" target="_blank" rel="noopener noreferrer">${h(label)}${icon('diagonal')}</a>`;
const appealFilename=media.community.dialogFilename;
if(!/^[a-zA-Z0-9_-]+\.png$/.test(appealFilename)||!fs.existsSync(path.join(root,'src/assets/images',appealFilename))) throw new Error('Parish appeal image is missing or invalid');
const illustrationLabels = {ru:'Иллюстрация',lt:'Iliustracija',en:'Illustration',pl:'Ilustracja',de:'Illustration',uk:'Ілюстрація'};
function mediaURL(key,prefix) {
 const item=media[key];
 return fs.existsSync(path.join(root,'src/assets/images',item.filename)) ? `${prefix}assets/img/${item.filename}` : item.url;
}
function dateLabel(date,locale) {
 return new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
}
function languageLinks(lang,prefix,privacy=false) {
 return config.languages.map(code => `<a href="${prefix}${code}/${privacy?'privacy':'index'}.html" hreflang="${code}" lang="${code}" data-language="${code}"${lang===code?' aria-current="page"':''}><b>${code.toUpperCase()}</b><span>${h(locales[code].langName)}</span></a>`).join('');
}
function header(lang,prefix,privacy=false) {
 const t=locales[lang], home=privacy?'index.html':'';
 return `<a class="skip" href="#main">${h(t.skip)}</a><header class="site-header"><div class="container header-inner"><a class="brand" href="${privacy?'index.html':'#top'}">${brandMark}<span class="brand-text"><strong>${h(t.brand[0])}</strong><small>${h(t.brand[1])}</small></span></a><nav class="desktop-nav" aria-label="${h(t.menu)}">${['guide','video','faq','help'].map((id,i)=>`<a href="${home}#${id}">${h(t.nav[i])}</a>`).join('')}</nav><div class="header-tools"><details class="language" id="language-control"><summary aria-label="${h(t.language)}"><span>${lang.toUpperCase()}</span>${icon('chevron')}</summary><nav class="language-panel" aria-label="${h(t.language)}">${languageLinks(lang,prefix,privacy)}</nav></details><button type="button" class="menu-toggle js-only" aria-expanded="false" aria-controls="mobile-nav" aria-label="${h(t.menu)}">${icon('menu')}</button></div></div><nav class="container mobile-nav" id="mobile-nav" aria-label="${h(t.menu)}" hidden>${['guide','video','faq','help'].map((id,i)=>`<a href="${home}#${id}">${h(t.nav[i])}</a>`).join('')}</nav></header>`;
}
function head(lang,prefix,privacy=false) {
 const t=locales[lang], title=privacy?`${t.privacy} · ${t.brand[0]}`:t.title;
 const description=privacy?t.privacyText:t.description;
 const canonical=hasPublicUrl?pageURL(lang,privacy):'';
 const robots=config.indexingEnabled&&!privacy?'index,follow,max-image-preview:large':'noindex,follow';
 const remoteImages=Object.values(media).some(item=>!fs.existsSync(path.join(root,'src/assets/images',item.filename)));
 const csp="default-src 'self'; base-uri 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:"+(remoteImages?" https://raw.githubusercontent.com":"")+"; frame-src https://www.youtube-nocookie.com; connect-src https://bukiskis-ai-router.maksimas1982.workers.dev; object-src 'none'; form-action 'none'";
 const alternateURL = code => hasPublicUrl?pageURL(code,privacy):`${prefix}${code}/${privacy?'privacy':'index'}.html`;
 return `<!doctype html>
<html lang="${lang}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#275bd5">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Content-Security-Policy" content="${h(csp)}">
<meta name="robots" content="${robots}">
<meta name="asset-base" content="${prefix}assets/">
<title>${h(title)}</title>
<meta name="description" content="${h(description)}">
${canonical?`<link rel="canonical" href="${h(canonical)}"><meta property="og:url" content="${h(canonical)}">`:''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${h(t.brand.join(' · '))}">
<meta property="og:title" content="${h(title)}">
<meta property="og:description" content="${h(description)}">
<meta property="og:locale" content="${h(t.locale.replace('-','_'))}">
${config.languages.filter(code=>code!==lang).map(code=>`<meta property="og:locale:alternate" content="${h(locales[code].locale.replace('-','_'))}">`).join('\n')}
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${h(title)}">
<meta name="twitter:description" content="${h(description)}">
${config.languages.map(code=>`<link rel="alternate" hreflang="${code}" href="${h(alternateURL(code))}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${h(alternateURL(config.defaultLanguage))}">
<link rel="icon" href="${prefix}assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${prefix}assets/css/styles.css">
<script src="${prefix}assets/js/data-${lang}.js" defer></script>
<script src="${prefix}assets/js/math.js" defer></script>
<script src="${prefix}assets/js/app.js" defer></script>
<link rel="stylesheet" href="${prefix}assets/css/cookie-notice.css">
<script src="${prefix}assets/js/cookie-notice.js" defer></script>
</head><body id="top">`;
}
function sectionTop(kicker,title,body,reveal=true) {
 return `<div class="section-top${reveal?' reveal':''}"><div><p class="eyebrow">${h(kicker)}</p><h2>${h(title)}</h2></div><p>${h(body)}</p></div>`;
}
function footer(lang,prefix,privacy=false) {
 const t=locales[lang];
 return `<footer class="site-footer"><div class="container"><div class="footer-main"><div><strong>${h(t.footerThanks)}</strong><small>${h(config.parish.legalName)} · ${config.parish.code}<br>© 2026 · GPM 2027</small></div><div class="footer-tools"><a href="${privacy?'privacy.html':`${prefix}${lang}/privacy.html`}">${h(t.privacy)}</a><button type="button" class="js-only" data-share>${h(t.share)}</button><button type="button" data-cookie-open hidden>${h(t.cookieNotice.reopen)}</button><button type="button" class="js-only" data-print>${h(t.print)}</button></div></div><nav class="footer-languages" aria-label="${h(t.language)}">${config.languages.map(code=>`<a lang="${code}" hreflang="${code}" data-language="${code}" href="${prefix}${code}/${privacy?'privacy':'index'}.html"${code===lang?' aria-current="page"':''}>${h(locales[code].langName)}</a>`).join('')}</nav></div></footer>${cookieNotice(lang,prefix,privacy)}<div class="toast" role="status" aria-live="polite" aria-atomic="true"></div>`;
}
function cookieNotice(lang,prefix,privacy) {
 const t=locales[lang].cookieNotice;
 const privacyUrl=privacy?'privacy.html':prefix+lang+'/privacy.html';
 return `<aside class="cookie-notice" id="cookie-notice" aria-labelledby="cookie-notice-title" hidden><h2 id="cookie-notice-title">${h(t.title)}</h2><p>${h(t.body)}</p><div class="cookie-notice-actions"><button type="button" class="button button-primary button-small" data-cookie-confirm>${h(t.confirm)}</button><a href="${h(privacyUrl)}">${h(t.privacy)}</a></div></aside>`;
}
function supportSection(t) {
 const website = new URL(config.parish.website);
 if (website.protocol !== 'https:' || website.username || website.password) {
  throw new Error('Parish website must use HTTPS without embedded credentials');
 }
 return `<section class="parish-support" id="parish-support" aria-labelledby="parish-support-title"><div class="container"><div class="parish-support-card"><div><h2 id="parish-support-title">${h(t.support.title)}</h2><p>${h(t.support.body)}</p></div><div class="parish-support-actions"><a class="button button-primary" href="#donate">${h(t.support.donate)}${icon('arrow')}</a>${external(website.href,t.support.visit,'button button-outline')}</div></div></div></section>`;
}
function page(lang,prefix) {
 const t=locales[lang], pct=lang==='en'?'1.2':'1,2';
 const mediaKeys=['community','kitchen','shelter'];
 const dateText=dateLabel(config.reviewed,t.locale);
 let result=head(lang,prefix)+header(lang,prefix)+`<noscript><p class="no-js-notice">${h(t.noJs)}</p></noscript><main id="main" itemscope itemtype="https://schema.org/WebPage"><meta itemprop="inLanguage" content="${lang}">${hasPublicUrl?`<link itemprop="url" href="${h(pageURL(lang))}">`:""}<meta itemprop="dateModified" content="${h(config.contentUpdated)}"><span itemprop="isPartOf" itemscope itemtype="https://schema.org/WebSite"><meta itemprop="name" content="${h(t.brand.join(' · '))}">${hasPublicUrl?`<link itemprop="url" href="${h(baseUrl)}">`:""}</span>
 <section class="hero"><div class="container"><div class="hero-grid"><div class="hero-copy"><p class="eyebrow">${h(t.eyebrow)}</p><h1 itemprop="name"><span>${h(t.hero[0])}</span><em>${h(t.hero[1])}</em></h1><p class="lead" itemprop="description">${h(t.lead)}</p><div class="hero-actions"><a class="button button-primary" href="#guide">${h(t.primary)}${icon('arrow')}</a><a class="text-link" href="#video">${icon('play')}${h(t.secondary)}</a></div><p class="hero-small">2026 → 2027 · FR0512 · VMI</p></div><aside class="info-visual" aria-labelledby="info-title"><div class="info-top"><span class="info-label">GPM / INFO</span><span class="info-year">2027</span></div><div class="percent-lockup"><strong class="percent-figure">${pct}<span>%</span></strong><div class="percent-text"><p>${h(t.info.badge)}</p><a class="text-link" href="#calculator">${h(t.info.link)}${icon('arrow')}</a></div></div><div class="hero-explainer"><h2 id="info-title">${h(t.info.title)}</h2>${t.info.items.map((item,i)=>`<details${i===0?' open':''}><summary><span class="info-number">0${i+1}</span><span>${h(item[0])}</span>${icon('chevron')}</summary><p>${h(item[1])}</p></details>`).join('')}</div><p class="info-caption">${h(t.info.caption)}</p></aside></div><div class="facts"><div class="fact"><small>${h(t.facts[0])}</small><strong>${config.campaign.taxYear}</strong></div><div class="fact"><small>${h(t.facts[1])}</small><strong>${h(t.deadline)}</strong></div><div class="fact"><small>${h(t.facts[2])}</small><strong class="fact-form">FR0512</strong></div></div><div class="campaign-notice">${icon('clock')}<p id="campaign-status">${h(t.prelaunch)}</p></div><p class="source-inline">${external(config.sources[0],'VMI · 2027')}</p></div></section>
 <section class="section ways"><div class="container">${sectionTop(t.introKicker,t.introTitle,t.introBody)}<div class="ways-grid">${t.paths.map((item,i)=>`<article class="way reveal"><span class="way-num">0${i+1}</span><div><h3>${h(item[0])}</h3><p>${h(item[1])}</p><span class="tag">${h(item[2])}</span></div></article>`).join('')}</div></div></section>
 <section class="section" id="guide"><div class="container">${sectionTop(t.guideKicker,t.guideTitle,t.guideBody)}<div class="guide-grid"><div class="guide-tabs" role="tablist" aria-label="${h(t.guideTitle)}" aria-orientation="vertical">${t.steps.map((step,i)=>`<button class="guide-tab" type="button" role="tab" id="guide-tab-${i}" data-step="${i}" aria-selected="${i===0}" aria-controls="guide-panel-${i}" tabindex="${i===0?0:-1}"><span class="step-num">0${i+1}</span><span>${h(step[0])}</span>${icon('arrow')}</button>`).join('')}</div><div class="guide-panels">${t.steps.map((step,i)=>`<article id="guide-panel-${i}" class="guide-panel${i===0?' is-active':''}" role="tabpanel" aria-labelledby="guide-tab-${i}"><div class="diagram"><span class="diagram-label">${h(t.diagramLabel)}</span><div class="diagram-card">${icon(['shield','paper','person','percent','check'][i])}<small>${h(step[2])}</small><strong>${h(step[3])}</strong></div><span class="diagram-count" aria-hidden="true">0${i+1}</span></div><h3>${h(step[0])}</h3><p>${h(step[1])}</p></article>`).join('')}<div class="guide-controls"><button type="button" class="button button-outline button-small" data-step-prev disabled>${icon('back')}${h(t.guidePrev)}</button><span id="step-counter" role="status">${h(t.stepWord)} 1 ${h(t.ofWord)} 5</span><button type="button" class="button button-primary button-small" data-step-next>${h(t.guideNext)}${icon('arrow')}</button></div></div></div><div class="guide-bottom"><p class="small-note">${h(t.guideNote)}</p>${external(config.eds,t.edsLink,'button button-outline')}</div><p class="verification-note" id="recipient-verification"${config.campaign.recipientVerified?' hidden':''}>${h(t.unverified)}</p><p class="source-inline">${external(config.sources[2],'VMI · FR0512')}</p></div></section>
 <section class="calculator-section" id="calculator" aria-labelledby="calculator-title"><div class="container calculator-grid"><div><p class="eyebrow">${h(t.calcKicker)}</p><h2 id="calculator-title">${h(t.calcTitle)}</h2><p class="lead">${h(t.calcBody)}</p><div class="calculator-controls"><div class="input-group"><label for="gpm-amount">${h(t.calcTax)}</label><div class="money-input"><input id="gpm-amount" type="text" inputmode="decimal" value="3000" maxlength="15" autocomplete="off" spellcheck="false" aria-describedby="calc-note calc-error"><span aria-hidden="true">€</span></div></div><div class="input-group"><label for="people-count">${h(t.calcPeople)}</label><div class="people-line"><output for="people-count" id="people-output">25</output> <small>${h(t.peopleUnit)}</small></div><input id="people-count" type="range" min="1" max="200" value="25" step="1" aria-describedby="calc-note"></div></div><p id="calc-error" class="calc-error" hidden>${h(t.calcInvalid)}</p><p class="no-js-calculator">3 000 € × ${lang==='en'?'0.012':'0,012'} = 36 € · 25 × 36 € = 900 €</p></div><div class="calc-results"><div id="calculation-output" aria-live="polite" aria-atomic="true"><div class="calc-result-one"><strong id="single-result">${new Intl.NumberFormat(t.locale,{style:'currency',currency:'EUR'}).format(36)}</strong><span>${h(t.calcResult)}</span></div><div class="calc-result-total"><span>${h(t.calcTogether)}</span><strong id="group-result">${new Intl.NumberFormat(t.locale,{style:'currency',currency:'EUR'}).format(900)}</strong></div></div><p class="calc-formula">${h(t.calcFormula)}</p><p class="small-note" id="calc-note">${h(t.calcNote)}</p></div></div></section>
 <section class="video-section" id="video"><div class="container video-grid"><div><div class="video-shell" id="video-shell"><div class="video-placeholder" id="video-placeholder"><span class="video-wordmark">VMI · EDS · FR0512</span><span class="play-icon" aria-hidden="true">${icon('play')}</span><button type="button" class="button js-only" id="load-video" aria-describedby="video-consent-text">${h(t.videoPlay)}</button><p id="video-consent-text">${h(t.videoPrivacy)}</p><noscript>${external(`https://www.youtube.com/watch?v=${config.video.id}`,t.videoExternal)}</noscript></div></div><div class="video-links">${external(`https://www.youtube.com/watch?v=${config.video.id}`,t.videoExternal)}<button class="video-reset" id="stop-video" type="button" hidden>${h(t.videoStop)}</button></div></div><div class="video-copy"><p class="eyebrow">${h(t.videoKicker)}</p><h2>${h(t.videoTitle)}</h2><p class="lead">${h(t.videoBody)}</p><p class="small-note">${h(t.videoCaution)}</p><a class="text-link" href="#guide">${h(t.videoTextLink)}${icon('arrow')}</a></div></div></section>
 <section class="section faq-section" id="faq"><div class="container faq-grid"><div><p class="eyebrow">${h(t.faqKicker)}</p><h2>${h(t.faqTitle)}</h2></div><div class="faq-list" itemscope itemtype="https://schema.org/FAQPage">${t.faq.map(([q,a])=>`<details itemprop="mainEntity" itemscope itemtype="https://schema.org/Question"><summary itemprop="name">${h(q)}</summary><p itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer"><span itemprop="text">${h(a)}</span></p></details>`).join('')}</div></div></section>
 <section id="sources"><div class="container sources"><div><h3>${h(t.sourcesTitle)}</h3><p>${h(t.sourcesBody)}</p><span class="review-date">${h(t.reviewed)} · ${h(dateText)}</span></div><ol>${config.sources.map((url,i)=>`<li>${external(url,t.sourceNames[i],'source-link')}</li>`).join('')}</ol></div></section>
 <section class="section help-section" id="help"><div class="container">${sectionTop(t.helpKicker,t.helpTitle,t.helpBody,false)}<div class="project-grid">${t.projects.map((item,i)=>`<article class="project-card"><div class="project-visual" data-project="${i}"><img src="${h(mediaURL(mediaKeys[i],prefix))}" data-photo-asset="${i+1}"${i===0?` data-dialog-src="${prefix}assets/img/${h(appealFilename)}"`:""} data-fallback="${prefix}assets/img/${i===0?'community':i===1?'kitchen':'shelter'}-outline.svg" data-fallback-caption="${h(illustrationLabels[lang])}" alt="${h(item[0]+' · '+(i===0?t.heroPhotoNote:t.conceptLabel))}" width="720" height="460" loading="lazy" referrerpolicy="no-referrer"><span class="image-caption-chip">${h(i===0?t.heroPhotoNote:t.conceptLabel)}</span><button class="project-preview js-only" type="button" aria-haspopup="dialog" aria-controls="photo-dialog" data-photo="${i+1}" aria-label="${h(t.projectImageLabel+' · '+item[0])}"><span class="project-preview-icon">${icon('expand')}</span></button></div><div class="project-content"><p class="project-kicker">${h(item[1])}</p><h3>${h(item[0])}</h3><p>${h(item[2])}</p><div class="project-actions"><button type="button" class="button button-outline button-small js-only" data-photo="${i+1}" aria-haspopup="dialog" aria-controls="photo-dialog" aria-label="${h(t.projectDetails+' · '+item[0])}">${h(t.projectDetails)}${icon('expand')}</button>${external(config.projectLinks[i],item[3])}</div></div></article>`).join('')}</div><p class="project-note">${h(t.projectNote)}</p></div></section>
 <section class="section" id="donate"><div class="container donate-grid"><div class="donate-intro"><p class="eyebrow">${h(t.donateKicker)}</p><h2>${h(t.donateTitle)}</h2><p class="lead">${h(t.donateBody)}</p><p class="small-note safety-line">${icon('shield')}<span>${h(t.donateSafety)}</span></p><span class="currency-note">EUR · ${h(config.parish.bank)}</span></div><div class="bank-card"><dl>${[config.parish.legalName,config.parish.code,config.parish.bank,ibanDisplay,config.parish.bic,config.parish.purpose].map((value,i)=>`<div class="bank-row${i===3?' bank-row-iban':''}"><dt>${h(t.donateFields[i])}</dt><dd${i===0?' lang="lt"':''}>${h(value)}</dd>${[0,1,3,4,5].includes(i)?`<button type="button" class="icon-button js-only" data-copy="${h(i===3?config.parish.iban:value)}" aria-label="${h(t.copy+' · '+t.donateFields[i])}">${icon('copy')}</button>`:''}</div>`).join('')}</dl><p class="small-note">${h(t.donatePurposeExplain)}</p><button type="button" class="button button-primary js-only" data-copy-details>${icon('copy')}${h(t.copyDetails)}</button><p class="small-note">${h(t.donateNote)}</p></div></div></section>
 <section class="contact-section"><div class="container contact-grid"><div><h2>${h(t.contactTitle)}</h2><p>${h(t.contactBody)}</p></div><div class="contact-actions"><a class="button button-outline" href="tel:${config.parish.phone}" aria-label="${h(t.contact+' · '+config.parish.phoneDisplay)}">${icon('phone')}${h(config.parish.phoneDisplay)}</a>${external(config.parish.website,t.visit)}</div></div></section>
 ${supportSection(t)}
 </main>${footer(lang,prefix)}<nav class="mobile-cta" aria-label="${h(t.introKicker)}"><a class="button button-primary" href="#guide">${h(t.primary)}${icon('arrow')}</a><a class="button button-outline" href="#video">${h(t.secondary)}</a></nav>
 <dialog id="photo-dialog" aria-labelledby="dialog-title"><div class="dialog-inner"><div class="dialog-head"><h2 id="dialog-title"></h2><button type="button" class="icon-button" data-close-dialog aria-label="${h(t.close)}">${icon('close')}</button></div><p class="dialog-text" id="dialog-description"></p><a class="text-link dialog-original" id="dialog-original" href="${prefix}assets/img/${h(appealFilename)}" target="_blank" rel="noopener noreferrer" hidden>${h(t.parishAppeal.openImage)}${icon('diagonal')}</a><div class="dialog-photo"><img id="dialog-image" alt="" width="720" height="460" referrerpolicy="no-referrer"><div id="hotspots" hidden>${t.hotspots.map((item,i)=>`<button type="button" class="hotspot hotspot-${['one','two','three'][i]}" data-hotspot="${i}" aria-label="${h(item[0]+' · '+item[1])}" aria-pressed="${i===0}" aria-controls="hotspot-description">${i+1}</button>`).join('')}</div></div><p class="dialog-caption" id="dialog-caption"></p><div class="hotspot-copy" id="hotspot-description" aria-live="polite" hidden><h3 id="hotspot-title">${h(t.hotspots[0][0])}</h3><p id="hotspot-text">${h(t.hotspots[0][1])}</p></div><section class="dialog-appeal-details" id="dialog-appeal-details" aria-labelledby="appeal-title" hidden><h3 id="appeal-title">${h(t.parishAppeal.heading)}</h3>${t.parishAppeal.paragraphs.map(text=>`<p>${h(text)}</p>`).join('')}<a class="button button-primary button-small" href="#donate" data-close-appeal>${h(t.parishAppeal.donate)}${icon('arrow')}</a></section><div class="dialog-foot"><a id="dialog-project-link" class="text-link" href="${config.parish.website}" target="_blank" rel="noopener noreferrer">${h(t.visit)}${icon('diagonal')}</a><button class="button button-outline button-small" type="button" data-close-dialog>${h(t.close)}</button></div></div></dialog></body></html>`;
 return result;
}
function privacyPage(lang,prefix) {
 const t=locales[lang];
 return head(lang,prefix,true)+header(lang,prefix,true)+`<main id="main" class="section"><div class="container"><p class="eyebrow">${h(t.brand[0])}</p><h1>${h(t.privacy)}</h1><div class="section-top"><div><p>${h(t.privacyText)}</p><p>${h(t.cookieNotice.body)}</p></div></div><div class="sources"><div><h3>${h(t.donateFields[0])}</h3><p lang="lt">${h(config.parish.legalName)}</p><p>${config.parish.code}</p><p><a href="tel:${config.parish.phone}">${h(config.parish.phoneDisplay)}</a></p></div><div><p>${h(t.donateSafety)}</p><p>${h(t.reviewed)}: ${h(dateLabel(config.reviewed,t.locale))}</p><a class="text-link" href="index.html">${icon('back')}${h(t.brand[0])}</a></div></div></div></main>`+footer(lang,prefix,true)+'</body></html>';
}
for (const lang of config.languages) {
 fs.mkdirSync(path.join(out,lang),{recursive:true});
 fs.writeFileSync(path.join(out,lang,'index.html'),page(lang,'../'));
 fs.writeFileSync(path.join(out,lang,'privacy.html'),privacyPage(lang,'../'));
 const data={config,t:locales[lang],lang,illustrationLabel:illustrationLabels[lang]};
 fs.writeFileSync(path.join(out,'assets/js',`data-${lang}.js`),`/* Generated; edit src/locales/${lang}.json and src/site.config.json instead. */\nwindow.PARISH = ${JSON.stringify(data).replace(/</g,'\\u003c')};\n`);
}
fs.writeFileSync(path.join(out,'index.html'),page(config.defaultLanguage,''));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
if (config.searchConsoleVerificationFile) {
 fs.writeFileSync(path.join(out,config.searchConsoleVerificationFile),`google-site-verification: ${config.searchConsoleVerificationFile}`);
}
fs.writeFileSync(path.join(out,'robots.txt'),config.indexingEnabled?`User-agent: *\nAllow: /\n${hasPublicUrl?'Sitemap: '+baseUrl+'sitemap.xml\n':''}`:'User-agent: *\nDisallow: /\n');
if(config.indexingEnabled && hasPublicUrl){
 const pages=config.languages.map(lang=>pageURL(lang));
 const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(url=>`  <url><loc>${h(url)}</loc><lastmod>${config.contentUpdated}</lastmod></url>`).join('\n')}\n</urlset>\n`;
 fs.writeFileSync(path.join(out,'sitemap.xml'),xml);
}else if(fs.existsSync(path.join(out,'sitemap.xml'))) fs.unlinkSync(path.join(out,'sitemap.xml'));
const errorLanguage=config.defaultLanguage, errorText=locales[errorLanguage];
const errorBase=hasPublicUrl?baseUrl:'./';
fs.writeFileSync(path.join(out,'404.html'),`<!doctype html>
<html lang="${errorLanguage}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="theme-color" content="#275bd5"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'none'; script-src 'none'; style-src 'self'; img-src 'self'; object-src 'none'; form-action 'none'"><title>404 · ${h(errorText.notFound.title)}</title><link rel="icon" href="${h(errorBase)}assets/img/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${h(errorBase)}assets/css/styles.css"></head>
<body class="not-found"><main class="container not-found-card"><a class="brand" href="${h(errorBase)}">${brandMark}<span class="brand-text"><strong>${h(errorText.brand[0])}</strong><small>${h(errorText.brand[1])}</small></span></a><p class="not-found-code" aria-hidden="true">404</p><h1>${h(errorText.notFound.title)}</h1><p class="lead">${h(errorText.notFound.body)}</p><a class="button button-primary" href="${h(errorBase)}">${h(errorText.notFound.home)}${icon('arrow')}</a><nav class="not-found-languages" aria-label="${h(errorText.language)}">${config.languages.map(lang=>`<a href="${h(errorBase+lang+'/index.html')}" lang="${lang}" hreflang="${lang}">${h(locales[lang].langName)}</a>`).join('')}</nav></main></body></html>`);
console.log(`Built ${config.languages.length} languages + privacy pages in docs/. Indexing: ${config.indexingEnabled ? 'enabled':'disabled (pre-launch)'}.`);
console.log('Media: '+Object.keys(media).map(k=>`${k}: ${fs.existsSync(path.join(root,'src/assets/images',media[k].filename))?'local':'external with local illustration fallback'}`).join('; '));
