/* Build a public-only index from the already approved source of truth. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'src',p),'utf8'));
const config=read('site.config.json'),labels=read('locales/gpm-helper.ui.json');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const expected=Object.keys(labels.ru).sort().join();
// The content audit date is shared by pages, local answers and the server snapshot.
const calendar={opens:config.campaign.start,deadline:config.campaign.deadline,taxYear:config.campaign.taxYear,
 applicationYear:config.campaign.year,checkedOn:config.reviewed,source:config.sources[0]};
for(const lang of config.languages){
 const t=read(`locales/${lang}.json`),ui=labels[lang];
 if(!ui||Object.keys(ui).sort().join()!==expected||Object.values(ui).some(x=>typeof x!=='string'||!x.trim()))throw Error('Incomplete helper locale: '+lang);
 const r=(id,title,body,url,refs=[],kind='gpm',date=config.reviewed)=>({id,title,body,url,references:refs,kind,date});
 const warning=(!config.campaign.recipientVerified||!config.campaign.gpmBankAccountVerified)?t.unverified:'';
 const records=[
  ...t.faq.map(([a,b],i)=>r(`faq-${i}`,a,b,i===6?'#donate':'#faq',config.faqSourceIndices[i].map(index=>config.sources[index]),i===6?'parish_support':'gpm')),
  ...t.steps.map(([a,b],i)=>r(`step-${i}`,a,b,'#guide',[i===0?config.eds:config.sources[2]])),
  ...t.info.items.map(([a,b],i)=>r(`principle-${i}`,a,b,i===0?'#calculator':'#guide',[config.sources[0]])),
  ...t.paths.map(([a,b],i)=>r(`path-${i}`,a,b,i===0?'#guide':'#donate',i===0?[config.sources[0]]:[],i===0?'gpm':'parish_support')),
  r('campaign-2027',ui.dates,t.openStatus,'#guide',[config.sources[0]],'gpm',calendar.checkedOn),
  r('video',t.videoTitle,t.videoBody+' '+t.videoCaution,'#video',[config.video.source]),
  r('recipient-check',ui.recipient,warning||t.steps[2][1],'#guide',[config.eds,config.sources[1]]),
  r('calculation',t.calcTitle,t.calcBody+' '+t.calcFormula+'. '+t.calcNote,'#calculator',[config.sources[0]]),
  ...t.projects.map(([a,s,b],i)=>r(`project-${i}`,a,s+'. '+b+' '+t.projectNote,config.projectLinks[i],[],'parish_support'))
 ];
 const allowedUrls=[...new Set([config.eds,calendar.source,...records.flatMap(x=>[...x.references,...(x.url.startsWith('https:')?[x.url]:[])])])];
 for(const u of allowedUrls)if(!/^https:\/\/[^\s]+$/.test(u))throw Error('Invalid public source');
 const data={records,calendar,warning,status:{before:t.prelaunch,open:t.openStatus,after:t.closedStatus},allowedUrls};
 if(lang===config.defaultLanguage){
  // Keep the single-file Cloudflare deployment aligned with the public source text.
  const knowledge={checkedOn:config.reviewed,calendar,warning,records:records.map(({id,title,body,kind,references})=>({id,title,body,kind,references}))};
  const json=JSON.stringify(knowledge,null,2);
  fs.writeFileSync(path.join(root,'workers/ai-router/knowledge.json'),json+'\n');
  const workerFile=path.join(root,'workers/ai-router/worker.mjs');
  const worker=fs.readFileSync(workerFile,'utf8');
  const marker='const KNOWLEDGE = ';
  if(worker.split(marker).length!==2)throw Error('Worker knowledge marker is missing or ambiguous');
  fs.writeFileSync(workerFile,worker.slice(0,worker.indexOf(marker))+marker+json+';\n');
 }
 fs.writeFileSync(path.join(root,'docs/assets/js',`gpm-data-${lang}.js`),'window.GPM_HELPER_DATA='+JSON.stringify(data).replace(/</g,'\\u003c')+';\n');
 // Extend the existing privacy notice in generated HTML, using localized source text.
 const privacy=path.join(root,`docs/${lang}/privacy.html`);
 let html=fs.readFileSync(privacy,'utf8');
 if(!html.includes('data-gpm-privacy'))html=html.replace(`<p>${esc(t.privacyText)}</p>`,`<p>${esc(t.privacyText)}</p><p data-gpm-privacy>${esc(ui.privacyNote)}</p>`);
 fs.writeFileSync(privacy,html);
}
for(const [rel,lang,prefix] of [['index.html',config.defaultLanguage,''],...config.languages.map(l=>[`${l}/index.html`,l,'../'])]){
 const ui=labels[lang],file=path.join(root,'docs',rel);let html=fs.readFileSync(file,'utf8');
 if(html.includes('id="gpm-helper"'))continue;
 html=html.replace('<!-- reading-mode:styles -->',`<link rel="stylesheet" href="${prefix}assets/css/gpm-helper.css"><script src="${prefix}assets/js/gpm-ai.js" defer></script><script src="${prefix}assets/js/gpm-helper.js" defer></script><!-- reading-mode:styles -->`);
 const topics=[['path-0','meaning'],['step-0','guide'],['campaign-2027','dates'],['step-2','recipient'],['faq','faq'],['projects','projects']];
 const widget=`<button hidden class="gh-launch" type="button" data-gpm-open data-ui="${esc(JSON.stringify(ui))}" data-gpm-src="${prefix}assets/js/gpm-data-${lang}.js" data-gpm-privacy="${prefix}${lang}/privacy.html" aria-haspopup="dialog" aria-controls="gpm-helper" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/></svg>${esc(ui.title)}</button>
<dialog class="gh-dialog" id="gpm-helper" aria-labelledby="gh-title" aria-describedby="gh-notice"><div class="gh-shell"><div class="gh-heading"><div><h2 id="gh-title">${esc(ui.title)}</h2><small>${esc(ui.mode)}</small></div><button class="gh-close" type="button" data-gpm-close aria-label="${esc(ui.close)}">×</button></div><p class="gh-notice" id="gh-notice">${esc(ui.notice)}</p><div class="gh-topics">${topics.map(([id,key])=>`<button type="button" data-gpm-topic="${id}">${esc(ui[key])}</button>`).join('')}</div><div class="gh-log" data-gpm-log role="log" aria-live="polite" aria-relevant="additions"></div><div class="gh-input" role="search"><label for="gh-query">${esc(ui.label)}</label><div class="gh-input-row"><input id="gh-query" maxlength="500" autocomplete="off" placeholder="${esc(ui.placeholder)}" enterkeyhint="send"><button class="gh-send" type="button" data-gpm-send>${esc(ui.send)}</button></div><div class="gh-ai-actions"><button hidden class="gh-ai-send" type="button" data-gpm-ai>${esc(ui.aiSend)}</button><button hidden class="gh-ai-cancel" type="button" data-gpm-cancel>${esc(ui.aiCancel)}</button><button class="gh-reset" type="button" data-gpm-reset>${esc(ui.reset)}</button></div></div></div></dialog>`;
 html=html.replace('<section class="contact-section">','<section class="contact-section" id="contact">');
 html=html.replace('</body>',widget+'</body>');fs.writeFileSync(file,html);
}
console.log('Public GPM helper and Worker knowledge rebuilt from reviewed translations. No client secrets.');
