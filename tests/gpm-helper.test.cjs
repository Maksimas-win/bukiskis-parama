const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const core=require('../src/assets/gpm-helper.js');
function data(lang='ru'){const box={window:{}};vm.runInNewContext(read(`docs/assets/js/gpm-data-${lang}.js`),box);return box.window.GPM_HELPER_DATA;}
test('Public corpus is complete, current-source derived, and isolated from private drafts',()=>{
 for(const lang of ['ru','lt','en','pl','de','uk']){
  const d=data(lang),t=JSON.parse(read(`src/locales/${lang}.json`));assert.equal(d.records.length,24);assert.equal(new Set(d.records.map(r=>r.id)).size,24);
  assert.equal(d.records[0].body,t.faq[0][1]);assert.equal(d.records.find(r=>r.id==='step-2').body,t.steps[2][1]);assert.equal(d.warning,t.unverified);
  assert.equal(d.calendar.checkedOn,'2026-10-03');assert.equal(d.calendar.deadline,'2027-05-03');
  for(const r of d.records){assert.ok(r.body&&r.url&&r.date);for(const u of r.references)assert.ok(d.allowedUrls.includes(u));}
  const html=read(`docs/${lang}/index.html`);assert.equal((html.match(/id="gpm-helper"/g)||[]).length,1);
  assert.match(html,/data-gpm-src="..\/assets\/js\/gpm-data-/);assert.doesNotMatch(html,/<script src="[^\"]*gpm-data-/);
  assert.match(read(`docs/${lang}/privacy.html`),/data-gpm-privacy/);
  assert.doesNotMatch(JSON.stringify(d),/AZ-Pack|2000_EUR|private\/|pledged|OPENAI_API_KEY|6200|6100/);
 }
});
test('Common GPM questions route to the supported subject, across languages',()=>{
 const r=data().records;
 for(const [q,id] of [
  ['Что такое 1,2%?','path-0'],['Как заполнить FR0512?','step-1'],['Как направить 1,2%?','step-0'],
  ['Какие сроки в 2027 году?','campaign-2027'],['Уже подавал заявление раньше','faq-3'],['Можно разделить между получателями?','faq-2'],
  ['Кто может воспользоваться?','faq-1'],['Нужна декларация GPM311?','faq-4'],['Сколько составляет 1,2%?','calculation'],
  ['код прихода 301004570','recipient-check'],['Kas yra 1,2%?','path-0'],['Kaip skirti 1,2%?','step-0'],
  ['Kada pateikti?','campaign-2027'],['Keliems gavėjams?','faq-2'],['How much?','calculation'],
  ['When is the deadline?','campaign-2027'],['Jak wypełnić FR0512?','step-1'],['Wie viel?','calculation'],['Коли подати?','campaign-2027']
 ])assert.equal(core.resolve(q,r)[0]?.record.id,id,q);
 assert.equal(core.resolve('zzzzqqq',r).length,0);
});
test('Known public recipient code is accepted, credentials and identifiers are blocked',()=>{
 assert.equal(core.sensitive('301004570'),false);assert.equal(core.sensitive('Какой срок 2027?'),false);
 for(const q of ['sk-proj-testsecret0123456789','мой код 12345678901','name@example.com','LT407044060006244432','пароль: example123'])assert.equal(core.sensitive(q),true,q);
});

test('Durations are distinct from recipient counts and existing applications',()=>{
 const questions = {
  ru: ['Можно подать на несколько лет?', 'На сколько лет можно подать?', 'На 5 лет?'],
  lt: ['Ar galima skirti keliems gavėjams penkerius metus?', 'Kiek metų?'],
  en: ['Can I allocate for several years?', 'For how many tax years?'],
  pl: ['Czy można przekazać na kilka lat?', 'Na ile lat?'],
  de: ['Kann ich für mehrere Jahre zuweisen?', 'Für wie viele Steuerjahre?'],
  uk: ['Чи можна подати на кілька років?', 'На скільки років?']
 };
 for (const [lang, queries] of Object.entries(questions)) {
  for (const query of queries) assert.equal(core.resolve(query, data(lang).records)[0]?.record.id, 'step-3', query);
 }
 for (const [query, expected] of [
  ['Можно поддержать нескольких получателей?', 'faq-2'],
  ['Can I support five recipients?', 'step-2'],
  ['Уже подавал на несколько лет', 'faq-3'],
  ['На 5 лет уже подавал раньше', 'faq-3'],
  ['How much GPM?', 'calculation']
 ]) assert.equal(core.resolve(query, data().records)[0]?.record.id, expected, query);
});
test('Campaign boundaries never promise current submission after the deadline',()=>{
 const c=data().calendar;assert.equal(core.campaignStatus(c,'2026-10-03'),'before');
 assert.equal(core.campaignStatus(c,'2027-01-01'),'open');assert.equal(core.campaignStatus(c,'2027-05-03'),'open');assert.equal(core.campaignStatus(c,'2027-05-04'),'after');
});
test('Local helper keeps secrets, storage, calculator values and HTML evaluation out of the AI flow',()=>{
 const js=read('src/assets/gpm-helper.js');assert.doesNotMatch(js,/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML|eval\(|OPENAI_API_KEY|single-result/);
 assert.match(js,/textContent/);assert.match(js,/showModal/);assert.match(js,/Europe\/Vilnius/);
 const ai=read('src/assets/gpm-ai.js');assert.doesNotMatch(ai,/localStorage|sessionStorage|innerHTML|eval\(|OPENAI_API_KEY|GEMINI_API_KEY|single-result|gpm-amount/);
 const html=read('docs/index.html');assert.match(html,/connect-src https:\/\/bukiskis-ai-router\.maksimas1982\.workers\.dev;/);
 assert.match(html,/data-gpm-ai/);assert.doesNotMatch(html,/unsafe-inline|api\.openai\.com|generativelanguage\.googleapis\.com/);
});
