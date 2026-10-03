// Development-only browser QA. Playwright is installed in a temporary directory by CI.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON||'/tmp/intro3d-qa/package.json');
const {chromium}=require('playwright');
const directory=path.join(root,'docs'), output=path.join(root,'qa/intro3d-review');
fs.mkdirSync(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname.endsWith('/')) pathname+='index.html';
 const file=path.resolve(directory,'.'+pathname);
 if(!file.startsWith(directory+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`, results=[];
let browser;
try {
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [name,width,height,lang,motion] of [
  ['desktop',1440,1000,'ru','no-preference'],['laptop',1366,768,'ru','no-preference'],
  ['mobile',390,844,'ru','no-preference'],['small',320,640,'ru','no-preference'],
  ['lt-mobile',390,844,'lt','no-preference'],['de-mobile',390,844,'de','no-preference'],
  ['en-desktop',1440,1000,'en','no-preference'],['pl-mobile',390,844,'pl','no-preference'],
  ['uk-mobile',390,844,'uk','no-preference'],['reduced-motion',1440,1000,'ru','reduce']
 ]) {
  const page=await browser.newPage({viewport:{width,height},reducedMotion:motion,deviceScaleFactor:1});
  const errors=[],external=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon')) errors.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:')) external.push(r.url());});
  await page.goto(`${base}/${lang}/index.html`,{waitUntil:'networkidle'});
  await page.waitForTimeout(1350);
  const info=await page.evaluate(()=>{
   const r=document.querySelector('.intro3d'),a=r.querySelector('.intro3d__actions');
   return {webgl:r.classList.contains('has-webgl'),animated:r.classList.contains('is-animated'),
    overflow:document.documentElement.scrollWidth>innerWidth+1,actionsBottom:a.getBoundingClientRect().bottom,
    viewport:innerHeight,canvas:[r.querySelector('canvas').width,r.querySelector('canvas').height]};
  });
  assert.ok(info.webgl,`${name}: WebGL must initialize in CI`);
  assert.equal(info.overflow,false,`${name}: horizontal overflow`);
  if(info.animated) assert.ok(info.actionsBottom<=height+2,`${name}: actions clipped`);
  if(motion==='reduce') assert.equal(info.animated,false);
  assert.deepEqual(errors,[],`${name}: JS/CSP errors`);assert.deepEqual(external,[],`${name}: external initial request`);
  await page.screenshot({path:path.join(output,`${name}.png`)});
  if(name==='desktop') {
   for(const [label,fraction] of [['scroll',.47],['arrival',.94]]){
    await page.evaluate(f=>{const r=document.querySelector('.intro3d'),pin=r.querySelector('.intro3d__pin');
     window.scrollTo({top:(r.offsetHeight-pin.offsetHeight)*f,behavior:'instant'});},fraction);
    await page.waitForTimeout(600);
    await page.screenshot({path:path.join(output,`${name}-${label}.png`)});
    info[label]=await page.locator('.intro3d').getAttribute('data-progress');
    assert.ok(Math.abs(Number(info[label])-fraction*100)<3,`${label}: scroll does not drive the scene`);
   }
   await page.locator('.intro3d__primary').click();await page.waitForTimeout(800);
   assert.equal(new URL(page.url()).hash,'#guide');
   info.guideTop=await page.locator('#guide').evaluate(el=>el.getBoundingClientRect().top);
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(600);
   assert.ok(Number(await page.locator('.intro3d').getAttribute('data-progress'))<2,'Reverse scroll must reassemble the numerals');
   await page.locator('.intro3d__skip').click();await page.waitForTimeout(800);
   assert.equal(new URL(page.url()).hash,'#intro3d-content');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'intro3d-content');
  }
  results.push({name,...info,errors,external});await page.close();
 }
 for(const variant of ['no-js','no-webgl']){
  const page=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:variant!=='no-js'});
  if(variant==='no-webgl') await page.addInitScript(()=>{
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};
  });
  await page.goto(`${base}/ru/index.html`);await page.waitForTimeout(300);
  assert.ok(await page.locator('.intro3d__fallback').isVisible());
  assert.ok(await page.locator('.intro3d__primary').isVisible());
  assert.equal(await page.locator('.intro3d').evaluate(el=>el.classList.contains('is-animated')),false);
  await page.screenshot({path:path.join(output,variant+'.png')});results.push({name:variant,fallback:true});await page.close();
 }
 console.log(JSON.stringify(results,null,2));
} finally {
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
 if(browser) await browser.close(); await new Promise(resolve=>server.close(resolve));
}
