const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root=path.resolve(__dirname,'..');
const math = require('../src/math.js');
const config=require('../src/site.config.json');
const read = name=>fs.readFileSync(path.join(root,name),'utf8');
test('Amount parsing uses integer cents, including Lithuanian/Russian comma',()=>{
 for(const [value,expected] of [['3000',300000],['3 000,25',300025],['0',0],['1.20',120],['100000000',10000000000]]) assert.equal(math.parseAmountToCents(value),expected);
 for(const value of ['', '-3','NaN','Infinity','3.141','1e3','1,234.5','100000000.01','<script>'])assert.equal(math.parseAmountToCents(value),null);
});
test('One-point-two percent calculations do not depend on floating point rounding',()=>{
 assert.equal(math.supportCents(300000),3600);
 assert.equal(math.supportCents(1000000),12000);
 assert.equal(math.supportCents(0),0);
 assert.equal(math.supportCents(10000000000),120000000);
 assert.equal(math.supportCents(125),2);
 assert.throws(()=>math.supportCents(-1));
 assert.throws(()=>math.supportCents(1.2));
});
test('Campaign never becomes open merely because the year changed',()=>{
 const c=config.campaign;
 assert.equal(math.campaignPhase('2026-09-29',c),'prelaunch');
 assert.equal(math.campaignPhase('2027-01-01',c),'unverified');
 assert.equal(math.campaignPhase('2027-05-03',c),'unverified');
 assert.equal(math.campaignPhase('2027-05-04',c),'closed');
 assert.equal(math.campaignPhase('2027-05-03',{...c,recipientVerified:true,gpmBankAccountVerified:true}),'open');
 assert.throws(()=>math.campaignPhase('not a date',c));
});
test('Parish legal identity, IBAN checksum and five-tax-year interval',()=>{
 assert.equal(config.parish.code,'301004570');
 assert.equal(config.parish.legalName,'Bukiškio stačiatikių Kristaus Gimimo parapija');
 assert.equal(math.validIban(config.parish.iban),true);
 assert.equal(math.validIban('LT407044060006244433'),false);
 assert.equal(config.campaign.lastTaxYear-config.campaign.taxYear+1,5);
 assert.equal(config.campaign.taxYear,2026);
 assert.equal(config.campaign.deadline,'2027-05-03');
});
for(const lang of config.languages){
 test(`${lang}: pre-rendered language, SEO metadata, instructions, donation fields and privacy`,()=>{
  const t=JSON.parse(read(`src/locales/${lang}.json`));
  const html=read(`docs/${lang}/index.html`);
  assert.match(html,new RegExp(`<html lang="${lang}">`));
  assert.ok(html.includes(t.hero[0]));
  assert.ok(html.includes(t.faq[0][0]));
  assert.ok(html.includes('LT40 7044 0600 0624 4432'));
  assert.ok(html.includes('301004570'));
  assert.equal(t.steps.length,5);assert.equal(t.faq.length,7);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,'Unique element IDs');
  assert.ok(read(`docs/${lang}/privacy.html`).includes(t.privacy));
  assert.match(html,config.indexingEnabled?/name="robots" content="index,follow,max-image-preview:large"/:/name="robots" content="noindex,follow"/);
  assert.doesNotMatch(html,/<iframe[\s>]/i,'No iframe before consent');
  assert.doesNotMatch(html,/<form[\s>]/i,'No collection of personal data');
  for(const code of config.languages)assert.ok(html.includes(`hreflang="${code}"`));
 });
}
test('Source scripts do not use tracking, remote fonts, personal-data storage or APIs',()=>{
 const app=read('src/app.js');
 assert.doesNotMatch(app,/localStorage|document\.cookie|\bfetch\(|XMLHttpRequest|sendBeacon|googletag|gtag\(/);
 assert.ok(app.includes('youtube-nocookie.com/embed/'));
 assert.doesNotMatch(read('docs/index.html'),/fonts\.googleapis|googletagmanager|facebook\.net/);
 assert.ok(fs.existsSync(path.join(root,'docs/.nojekyll')));
});
test('Local page and asset links resolve, including six privacy pages',()=>{
 for(const rel of ['index.html',...config.languages.flatMap(l=>[`${l}/index.html`,`${l}/privacy.html`])]){
  const file=path.join(root,'docs',rel),html=fs.readFileSync(file,'utf8');
  for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
   const url=match[1].split('#')[0];
   if(!url || /^(?:https?:|tel:|data:)/.test(url))continue;
   assert.ok(fs.existsSync(path.resolve(path.dirname(file),url)),`${rel}: ${url}`);
  }
 }
});

test('Informational identity replaces religious imagery across all languages',()=>{
 for(const lang of config.languages){
  const html=read(`docs/${lang}/index.html`);
  const hero=html.match(/<section class="hero">([\s\S]*?)<section class="section ways">/)[1];
  assert.doesNotMatch(hero,/<img[\s>]|church-outline|hero-main|[☦✝]/);
  assert.doesNotMatch(hero,/href="#donate"|data-photo|301004570/);
  assert.ok(hero.includes('class="hero-explainer"'));
  assert.ok(hero.includes('class="fact-form">FR0512'));
  assert.ok(hero.includes('href="#guide"') && hero.includes('href="#video"'));
  assert.ok(html.indexOf('id="sources"')<html.indexOf('id="help"'));
  assert.ok(html.indexOf('id="help"')<html.indexOf('id="donate"'));
 }
 assert.doesNotMatch(read('src/styles.css'),/church-outline|hero-main/);
 assert.doesNotMatch(read('docs/assets/img/favicon.svg'),/M32 11v43|M24 11v40|[☦✝]/);
 assert.equal(fs.existsSync(path.join(root,'docs/assets/img/church-outline.svg')),false);
 assert.equal(fs.existsSync(path.join(root,'src/assets/images/church-outline.svg')),false);
});

test('Every stylesheet image URL resolves after removing the former assets',()=>{
 const css=read('docs/assets/css/styles.css');
 for (const match of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) {
  const url=match[1];
  if (/^(?:data:|https?:)/.test(url)) continue;
  assert.ok(fs.existsSync(path.join(root,'docs/assets/css',url)),`Missing CSS asset: ${url}`);
 }
});
