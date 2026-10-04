/* Public GPM guide: local retrieval only. No model requests, storage or secret keys. */
(function(host){
'use strict';
const norm=s=>String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ё/g,'е');
const words=s=>norm(s).match(/[\p{L}\p{N}]{3,}/gu)||[];
// Match a duration together with its unit, before broad quantity words.
const multiYearQuestion = new RegExp([
 '(?:нескольк\\p{L}*|пять|пяти|5|сколько)\\s+лет',
 '(?:several|multiple|five|5|how\\s+many)\\s+(?:tax\\s+)?years?',
 '(?:kelis|kelerius|penkerius|penkis|5|kiek)\\s+(?:mokestinius\\s+)?metus?',
 '(?:kilka|kilku|piec|pieciu|5|ile)\\s+lat',
 '(?:mehrere|mehreren|funf|5|wie\\s+viele)\\s+(?:steuer)?jahren?',
 '(?:кілька|кількох|п[’\u0027ʼ]?ять|п[’\u0027ʼ]?яти|5|скільки)\\s+років',
 '\\b2030\\b'
].map(pattern => `(?:${pattern})`).join('|'), 'u');
function sensitive(s){
 const clean=String(s).replace(/\b301004570\b/g,'');
 return /sk-[\w-]{12,}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b[A-Z]{2}\s?\d{2}(?:\s?[A-Z0-9]){12,30}\b|(?:\d[ -]?){9,}|(?:password|пароль|slaptazodis|haslo)\s*[:=]\s*\S+/i.test(norm(clean));
}
const routes=[
 ['faq-4',/gpm\s?311|декларац.*доход|income.*declar|pajamu.*deklar|deklarac.*dochod|einkommensteuererklar|декларац.*дохід/],
 ['faq-3',/уже.*подав|раньше.*подав|заново|повторн|ранее|already|previous|renew|anks[cč]iau|jau.*teik|ponownie|wczesniej|bereits|erneut|вже.*подав|повторно/],
 ['step-3',multiYearQuestion],
 ['faq-2',/нескольк|раздел|подел|split|several|multiple|keliems|padal|kilku|podziel|mehrere|aufteil|кільк|розділ/],
 ['faq-5',/конфиденц|безопас|личн.*данн|privacy|personal.*data|saug|duomen|prywat|danych|datenschutz|конфіденц|особист.*дан/],
 ['recipient-check',/301004570|провер.*приход|готов.*приход|eligib.*parish|parapij.*status/],
 ['campaign-2027',/срок|когда|до какого|како.*год|2026|2027|deadline|when|dates|which.*year|termin|kada|metai|kiedy|rok|frist|wann|welch.*jahr|коли|термін|яки.*рік/],
 ['calculation',/сколько|рассчит|калькулят|calculate|how much|kiek|skaici|ile|oblicz|wie viel|rechn|скільки|розрах/],
 ['principle-0',/зарплат|salary|wage|atlygin|alga|wynagrodz|gehalt|заробіт/],
 ['faq-0',/дополн.*плат|спиш|снимут|extra.*pay|additional.*pay|papildom.*mok|dodatkow.*plat|zusatz.*zahl|додатков.*плат/],
 ['faq-1',/кто может|пенсион|не работ|за границ|граждан|who can|retir|abroad|citizen|kas gali|pensin|uzsien|kto moze|emeryt|wer kann|rentner|ausland|хто може/],
 ['project-1',/кухн|kitchen|virtuv|kuchni|kuche|кухн/],
 ['project-2',/беседк|хоз[ .]|gazebo|pavesin|altan|pavillon|альтан/],
 ['project-0',/проект|project|projekt|проєкт/],
 ['faq-6',/пожертв|без gpm|bank.*transfer|donat|auka|be gpm|darowizn|spende|ohne gpm|без gpm|пожертв/],
 ['recipient-check',/код.*(?:приход|храм)|реквизит.*gpm|parish.*code|parapij.*kod/],
 ['step-2',/получател|recipient|gavej|odbiorc|empfanger|отримувач/],
 ['video',/видео|video|ziuret|obejrz|відео/],
 ['step-1',/fr\s?0512|где.*форм|найти.*форм|find.*form|rasti.*form|znalez.*form|formular.*finden/],
 ['step-0',/как.*(?:направ|подать|заполн|начать)|войти|how.*(?:allocat|submit|start)|login|log in|kaip.*(?:skirt|pild)|prisijung|jak.*(?:przekaz|wypeln)|anmeld|wie.*(?:zuweis|beantrag)|як.*(?:подат|спряму|заповн)/],
 ['path-0',/что.*(?:такое|означ)|what.*(?:is|mean)|kas (?:tai|yra)|co to|was ist|що.*(?:таке|означ)/]
];
function resolve(query,records){
 const q=norm(query.trim()); if(!q) return [];
 const exact=records.find(r=>norm(r.title).replace(/[^\p{L}\p{N}]/gu,'')===q.replace(/[^\p{L}\p{N}]/gu,''));
 if(exact) return [{record:exact,score:100}];
 if(/^(?:gpm|1[,.]2\s?%?|1[,.]2\s?gpm)[?!.\s]*$/i.test(q)) return [{record:records.find(r=>r.id==='path-0'),score:100}].filter(x=>x.record);
 for(const [id,pattern] of routes) if(pattern.test(q)){const r=records.find(r=>r.id===id);if(r) return [{record:r,score:100}];}
 const stop=new Set(words('как что это для или мне про надо можно такое пожалуйста the how what about please this with from kaip kas yra apie ar tai ir jak czy to jest prosze was wie der die das und bitte який що це для або будь'));
 const terms=[...new Set(words(q).filter(w=>!stop.has(w)))];
 if(!terms.length) return [];
 return records.map(record=>{
  const title=words(record.title),body=words(record.body);
  const score=terms.reduce((s,t)=>s+(title.some(w=>w.startsWith(t)||t.startsWith(w))?8:body.some(w=>w.startsWith(t))?2:0),0);
  return {record,score};
 }).filter(r=>r.score>=4).sort((a,b)=>b.score-a.score).slice(0,3);
}
function campaignStatus(c,date){return date<c.opens?'before':date>c.deadline?'after':'open';}
if(typeof module!=='undefined'&&module.exports) module.exports={norm,words,sensitive,resolve,campaignStatus};
if(!host.document) return;
const dialog=document.getElementById('gpm-helper'),opener=document.querySelector('[data-gpm-open]');
if(!dialog||!opener||typeof dialog.showModal!=='function') return;
const log=dialog.querySelector('[data-gpm-log]'),input=dialog.querySelector('input'),send=dialog.querySelector('[data-gpm-send]');
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
let data=null,loading=null,step=-1;
const ui=JSON.parse(opener.dataset.ui);
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vilnius',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function scroll(){log.scrollTop=log.scrollHeight;}
function block(text,own=false){const n=el('div',null,own?'gh-message gh-own':'gh-message');if(text)n.append(el('p',text));log.append(n);while(log.children.length>24)log.firstElementChild.remove();scroll();return n;}
function link(n,label,url){
 if(!url||!(/^(?:#[a-z0-9-]+)$/.test(url)||data.allowedUrls.includes(url))) return;
 const a=el('a',label);a.href=url;
 if(url[0]==='#')a.addEventListener('click',()=>{dialog.close();});else{a.target='_blank';a.rel='noopener noreferrer';}
 n.append(a);
}
function action(n,text,fn){const b=el('button',text,'gh-choice');b.type='button';b.addEventListener('click',fn);n.append(b);}
function calendar(n){const status=campaignStatus(data.calendar,today());const text=data.status[status];n.append(el('small',text,'gh-important'));}
function answer(r,guided=false){
 if(!r)return;
 const n=block();n.append(el('h3',r.title));
 n.append(el('p',r.id==='campaign-2027'?data.status[campaignStatus(data.calendar,today())]:r.body));
 if(r.id.startsWith('step-')||r.id==='principle-2')calendar(n);
 if(r.id==='step-2'&&data.warning)n.append(el('small',data.warning,'gh-important'));
 link(n,ui.source,r.url);
 for(const ref of r.references||[])link(n,ref.includes('deklaravimas.')?'EDS':'VMI',ref);
 n.append(el('small',ui.date+' '+r.date));
 if(guided){step=Number(r.id.slice(5));const at=step;const nav=el('div',null,'gh-stepnav');
  if(step>0)action(nav,ui.prev,()=>answer(data.records.find(x=>x.id===`step-${at-1}`),true));
  if(step<4)action(nav,ui.next,()=>answer(data.records.find(x=>x.id===`step-${at+1}`),true));
  else action(nav,ui.restart,()=>answer(data.records.find(x=>x.id==='step-0'),true));
  n.append(nav);
 }
 scroll();
}
function choices(records,label){const n=block(label);for(const r of records)action(n,r.title,()=>answer(r,r.id.startsWith('step-')));scroll();}
function welcome(){
 log.replaceChildren();input.value='';step=-1;block(ui.welcome);
 if(data){const n=block();calendar(n);
 if((Date.parse(today())-Date.parse(data.calendar.checkedOn))/86400000>90)n.append(el('small',ui.stale,'gh-important'));
 link(n,'VMI',data.calendar.source);
 }
}
function load(){
 if(data)return Promise.resolve(data);if(window.GPM_HELPER_DATA){data=window.GPM_HELPER_DATA;return Promise.resolve(data);}if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src=opener.dataset.gpmSrc;
  const timeout=setTimeout(()=>{s.remove();loading=null;reject(Error('timeout'));},10000);
  s.onload=()=>{clearTimeout(timeout);if(!window.GPM_HELPER_DATA){loading=null;reject(Error('data'));return;}data=window.GPM_HELPER_DATA;resolve(data);};
  s.onerror=()=>{clearTimeout(timeout);s.remove();loading=null;reject(Error('load'));};document.head.append(s);
 });return loading;
}
async function ready(){try{await load();send.disabled=false;return true;}catch{block(ui.loadError);return false;}}
async function submit(){
 const q=input.value.trim().slice(0,500);if(!q)return;input.value='';
 if(sensitive(q)){block(ui.redacted,true);block(ui.safety);return;}
 block(q,true);if(!await ready())return;
 if(/^(привет|здравствуй(?:те)?|добрый (?:вечер|день)|hello|hi|labas|sveiki|czesc|witaj|hallo|вітаю|привіт)[!?.\s]*$/i.test(norm(q))){block(ui.welcome);return;}
 if(/^(спасибо|thanks|thank you|aciu|dziekuje|danke|дякую)[!?.\s]*$/i.test(norm(q))){block(ui.thanks);return;}
 if(step>=0&&/^(дальше|далее|next|toliau|dalej|weiter|далі)[!?.\s]*$/i.test(norm(q))){answer(data.records.find(r=>r.id===`step-${Math.min(4,step+1)}`),true);return;}
 const hits=resolve(q,data.records);
 if(hits[0]?.score>=100)answer(hits[0].record,hits[0].record.id.startsWith('step-'));
 else if(hits.length)choices(hits.map(x=>x.record),ui.found);
 else{const n=block(ui.noMatch);link(n,ui.contact,'#contact');}
}
opener.hidden=false;
opener.addEventListener('click',async()=>{
 dialog.showModal();opener.setAttribute('aria-expanded','true');document.body.classList.add('gpm-dialog-open');
 if(!log.childElementCount){welcome();send.disabled=true;if(await ready())welcome();}
 input.focus();
});
dialog.addEventListener('close',()=>{document.body.classList.remove('gpm-dialog-open');opener.setAttribute('aria-expanded','false');opener.focus({preventScroll:true});});
dialog.querySelector('[data-gpm-close]').addEventListener('click',()=>dialog.close());
dialog.querySelector('[data-gpm-reset]').addEventListener('click',welcome);
send.addEventListener('click',submit);
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();submit();}});
dialog.querySelectorAll('[data-gpm-topic]').forEach(button=>button.addEventListener('click',async()=>{
 if(!await ready())return;const id=button.dataset.gpmTopic;
 if(id==='faq')choices(data.records.filter(x=>x.id.startsWith('faq-')&&x.kind==='gpm'),ui.faq);
 else if(id==='projects')choices(data.records.filter(x=>x.kind==='parish_support'),ui.projects);
 else answer(data.records.find(x=>x.id===id),id==='step-0');
}));
})(typeof window==='undefined'?globalThis:window);
