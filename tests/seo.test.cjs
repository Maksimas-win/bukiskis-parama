const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../src/site.config.json');
const root = path.resolve(__dirname,'..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const base = (process.env.SITE_URL || config.publicBaseUrl).replace(/\/?$/, '/');
const decode = text => text.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const canonical = html => html.match(/<link rel="canonical" href="([^"]+)"/)[1];

test('Each public locale has matching canonical, social metadata and a reciprocal hreflang set',()=>{
 for (const lang of config.languages) {
  const t = JSON.parse(read(`src/locales/${lang}.json`));
  const html = read(`docs/${lang}/index.html`);
  assert.equal(canonical(html), `${base}${lang}/index.html`);
  assert.equal(decode(html.match(/<title>(.*?)<\/title>/)[1]), t.title);
  for (const [attribute,name,expected] of [
   ['name','description',t.description], ['property','og:title',t.title],
   ['property','og:description',t.description], ['property','og:url',canonical(html)],
   ['name','twitter:description',t.description],
  ]) {
   assert.equal(decode(html.match(new RegExp(`<meta ${attribute}="${name}" content="([^"]+)"`))[1]), expected);
  }
  const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)];
  assert.equal(alternates.length,config.languages.length+1);
  for(const code of [...config.languages,'x-default']) {
   assert.equal(alternates.find(m=>m[1]===code)?.[2], `${base}${code==='x-default'?config.defaultLanguage:code}/index.html`);
  }
 }
 assert.equal(canonical(read('docs/index.html')), `${base}${config.defaultLanguage}/index.html`);
});

test('Only canonical indexable pages are advertised in sitemap',()=>{
 if (!config.indexingEnabled) {
  assert.equal(fs.existsSync(path.join(root,'docs/sitemap.xml')),false);
  return;
 }
 const xml=read('docs/sitemap.xml');
 const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1]));
 assert.deepEqual(urls, config.languages.map(lang=>canonical(read(`docs/${lang}/index.html`))));
 assert.equal(new Set(urls).size,urls.length);
 assert.equal([...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].filter(m=>m[1]===config.contentUpdated).length,urls.length);
 assert.doesNotMatch(read('docs/robots.txt'),/Disallow:\s*\//);
 assert.ok(read('docs/robots.txt').includes(`Sitemap: ${base}sitemap.xml`));
});

test('Privacy and error pages stay out of search and privacy alternatives remain equivalent',()=>{
 for(const lang of config.languages) {
  const html=read(`docs/${lang}/privacy.html`);
  assert.match(html,/<meta name="robots" content="noindex,follow">/);
  assert.equal(canonical(html),`${base}${lang}/privacy.html`);
  const alternatives=[...html.matchAll(/<link rel="alternate"[^>]+href="([^"]+)"/g)];
  assert.ok(alternatives.every(m=>m[1].endsWith('/privacy.html')));
 }
 assert.match(read('docs/404.html'),/<meta name="robots" content="noindex">/);
});

test('Structured page data is present without weakening CSP or requiring inline scripts',()=>{
 for(const lang of config.languages) {
  const html=read(`docs/${lang}/index.html`);
  assert.match(html,/<main id="main" itemscope itemtype="https:\/\/schema.org\/WebPage">/);
  assert.ok(html.includes(`<meta itemprop="inLanguage" content="${lang}">`));
  assert.ok(html.includes(`<link itemprop="url" href="${base}${lang}/index.html">`));
  assert.match(html,/<h1 itemprop="name">/);
  assert.match(html,/<p class="lead" itemprop="description">/);
  assert.doesNotMatch(html,/unsafe-inline|<script(?![^>]*\bsrc=)[^>]*>/i);
  if(!config.campaign.recipientVerified) assert.match(html,/id="recipient-verification">/);
 }
});

test('Google verification file survives a complete site build and is excluded from sitemap',()=>{
 if(!config.searchConsoleVerificationFile) return;
 const name=config.searchConsoleVerificationFile;
 assert.match(name,/^google[a-f0-9]+\.html$/);
 assert.equal(read(`docs/${name}`),`google-site-verification: ${name}`);
 if(config.indexingEnabled) assert.ok(!read('docs/sitemap.xml').includes(name));
});

test('FAQ answers and page freshness are described with schema.org microdata',()=>{
 for(const lang of config.languages) {
  const html=read(`docs/${lang}/index.html`), t=require(`../src/locales/${lang}.json`);
  assert.ok(html.includes(`<meta itemprop="dateModified" content="${config.contentUpdated}">`));
  assert.match(html,new RegExp(`<span itemprop="isPartOf" itemscope itemtype="https://schema.org/WebSite"><meta itemprop="name" content="[^"]+"><link itemprop="url" href="${base.replace(/[.*+?^${}()|[\]\/]/g,'\$&')}"></span>`));
  assert.equal((html.match(/itemtype="https:\/\/schema.org\/FAQPage"/g)||[]).length,1);
  assert.equal((html.match(/<details itemprop="mainEntity" itemscope itemtype="https:\/\/schema.org\/Question"><summary itemprop="name">/g)||[]).length,t.faq.length);
  assert.equal((html.match(/<p itemprop="acceptedAnswer" itemscope itemtype="https:\/\/schema.org\/Answer"><span itemprop="text">/g)||[]).length,t.faq.length);
 }
});
