import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'src/site.config.json'),'utf8'));
const copy=JSON.parse(fs.readFileSync(path.join(root,'src/locales/intro3d.json'),'utf8'));
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keys=['kicker','title','description','primary','secondary','skip','scroll','arrival','arrivalNote'];
for(const lang of config.languages){
  const t=copy[lang];
  if(!t||Object.keys(t).sort().join()!==[...keys].sort().join()) throw Error(`Incomplete 3D locale: ${lang}`);
  for(const key of keys){
    const expected=(key==='title'||key==='arrival')?2:1;
    const strings=Array.isArray(t[key])?t[key]:[t[key]];
    if(strings.length!==expected||strings.some(s=>typeof s!=='string'||!s.trim())) throw Error(`Invalid 3D locale: ${lang}.${key}`);
  }
}
function markup(lang){
  const t=copy[lang], number=lang==='en'?'1.2':'1,2';
  return `\n<!-- intro3d:v1: native WebGL, progressively enhanced, no scroll interception -->\n<section class="intro3d" id="intro3d" aria-labelledby="intro3d-title">
 <div class="intro3d__pin">
  <div class="intro3d__ambient" aria-hidden="true"></div>
  <div class="intro3d__top"><span>GPM / INFO</span><p>${esc(t.kicker)}</p><a class="intro3d__skip" href="#intro3d-content" data-intro-skip>${esc(t.skip)}<span aria-hidden="true">↓</span></a></div>
  <div class="intro3d__stage" aria-hidden="true">
   <canvas class="intro3d__canvas" width="1000" height="360" aria-hidden="true"></canvas>
   <div class="intro3d__fallback">${number}<small>%</small></div>
   <div class="intro3d__arrival"><p>${esc(t.arrival[0])}<span>${esc(t.arrival[1])}</span></p><small>${esc(t.arrivalNote)}</small></div>
  </div>
  <div class="intro3d__copy"><h2 id="intro3d-title">${esc(t.title[0])}<span>${esc(t.title[1])}</span></h2><p>${esc(t.description)}</p></div>
  <div class="intro3d__actions"><a class="intro3d__primary" href="#guide">${esc(t.primary)}<span aria-hidden="true">↗</span></a><a class="intro3d__secondary" href="#calculator">${esc(t.secondary)}</a></div>
  <div class="intro3d__footer"><span class="intro3d__hint"><i class="intro3d__mouse" aria-hidden="true"></i>${esc(t.scroll)}</span><span class="intro3d__progress" aria-hidden="true"><span class="intro3d__progress-fill"></span></span><span class="intro3d__meta">FR0512 · VMI · EDS</span></div>
 </div>
</section>\n`;
}
const files=[['index.html',config.defaultLanguage,''],...config.languages.map(lang=>[`${lang}/index.html`,lang,'../'])];
for(const [relative,lang,prefix] of files){
  const file=path.join(root,'docs',relative);
  let html=fs.readFileSync(file,'utf8');
  if(html.includes('<!-- intro3d:v1:')) continue;
  if(!html.includes('<section class="hero">')||!html.includes('</head>')) throw Error(`Unexpected template: ${relative}`);
  html=html.replace('</head>',`<link rel="stylesheet" href="${prefix}assets/css/intro3d.css"><script src="${prefix}assets/js/percent3d-mesh.js" defer></script><script src="${prefix}assets/js/intro3d.js" defer></script></head>`);
  html=html.replace('<section class="hero">',markup(lang)+'<div id="intro3d-content" tabindex="-1"></div><section class="hero">');
  fs.writeFileSync(file,html);
}
console.log('Added the 3D percent introduction to the root and all six languages.');
