const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const config=JSON.parse(read('src/site.config.json'));
const helper=require('../src/assets/gpm-helper.js');

test('Pages, local answers and the deployed single-file Worker share the audited facts',()=>{
 const knowledge=JSON.parse(read('workers/ai-router/knowledge.json'));
 const embedded=JSON.parse(read('workers/ai-router/worker.mjs').split('const KNOWLEDGE = ')[1].trim().replace(/;$/,''));
 assert.deepEqual(embedded,knowledge);
 assert.equal(knowledge.checkedOn,config.reviewed);
 for(const lang of config.languages){
  const locale=JSON.parse(read(`src/locales/${lang}.json`));
  const sandbox={window:{}};vm.runInNewContext(read(`docs/assets/js/gpm-data-${lang}.js`),sandbox);
  const {records}=sandbox.window.GPM_HELPER_DATA;
  assert.equal(locale.sourceNames.length,config.sources.length);
  assert.equal(locale.faq.length,config.faqSourceIndices.length);
  locale.faq.forEach(([title,body],i)=>{
   const record=records.find(r=>r.id===`faq-${i}`);
   assert.equal(record.title,title);assert.equal(record.body,body);
   if(lang===config.defaultLanguage)assert.equal(knowledge.records.find(r=>r.id===record.id).body,body);
  });
  assert.match(locale.steps[1][1],/Pildyti formą → Dažniausiai pildomos formos → Prašymas skirti paramą/);
  assert.match(locale.faq[5][1],/Cloudflare.*OpenAI/);
 }
 assert.equal(config.campaign.recipientVerified,false);
 assert.equal(config.campaign.gpmBankAccountVerified,false);
});

test('Correction, transfer, tax base and retirement questions do not hit broad date or declaration routes',()=>{
 const samples={
  ru:['Как исправить заявление в 2027 году?','Когда перечислят деньги?','Доплата по GPM311 — это база?','Может ли пенсионер участвовать?','Можно религиозной общине?'],
  lt:['Kaip tikslinti prašymą 2027 m.?','Kada pervedama parama?','Nuo kokios sumos skaičiuojama?','Ar pensininkas gali skirti?','Ar religinei bendruomenei?'],
  en:['How can I amend my application in 2027?','When is support transferred?','Is my tax refund the base?','Can a retired person participate?','Can a religious community receive support?'],
  pl:['Jak zmienić wniosek w 2027?','Kiedy przekazują wsparcie?','Od jakiej kwoty liczyć?','Czy emeryt może uczestniczyć?','Czy wspólnota religijna może otrzymać wsparcie?'],
  de:['Kann ich den Antrag ändern?','Wann wird die Unterstützung überwiesen?','Ist die Nachzahlung die Grundlage?','Kann ein Rentner teilnehmen?','Darf eine religiöse Gemeinschaft Unterstützung erhalten?'],
  uk:['Як виправити заяву у 2027 році?','Коли перекажуть гроші?','Від якої суми рахувати?','Чи може пенсіонер брати участь?','Чи може релігійна громада отримати підтримку?']
 };
 for(const [lang,questions] of Object.entries(samples)){
  const box={window:{}};vm.runInNewContext(read(`docs/assets/js/gpm-data-${lang}.js`),box);
  questions.forEach((q,i)=>assert.equal(helper.resolve(q,box.window.GPM_HELPER_DATA.records)[0]?.record.id,['faq-8','faq-9','faq-10','faq-11','faq-7'][i],q));
 }
});
