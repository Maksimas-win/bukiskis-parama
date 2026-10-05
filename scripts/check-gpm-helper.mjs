import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON||'/tmp/gpm-qa/package.json');
const {chromium}=require('playwright');
const dir=path.join(root,'docs'),out=path.join(root,'qa/gpm-review');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 if(p.endsWith('/'))p+='index.html';const file=path.resolve(dir,'.'+p);
 if(!file.startsWith(dir+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain'});fs.createReadStream(file).pipe(res);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base=`http://127.0.0.1:${server.address().port}`;let browser;const result=[];
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [lang,w,h] of [['ru',1440,960],['ru',390,844],['lt',390,844],['en',1366,768],['pl',390,844],['de',390,844],['uk',390,844],['ru',320,640],['ru',844,390]]){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
  page.on('request',r=>requests.push(r.url()));
  await page.goto(`${base}/${lang}/index.html`,{waitUntil:'networkidle'});
  if(await page.locator('#photo-dialog').isVisible()) {
   await page.keyboard.press('Escape');
   await page.locator('#cookie-notice').waitFor({state:'visible'});
  }
  if(await page.locator('[data-cookie-confirm]').isVisible()) await page.locator('[data-cookie-confirm]').click();await page.waitForTimeout(250);
  assert.ok(!requests.some(u=>u.includes('gpm-data-')),'corpus must be lazy');
  await page.locator('[data-gpm-open]').click();await page.waitForFunction(()=>!!window.GPM_HELPER_DATA);
  await page.locator('[data-gpm-topic="step-0"]').click();
  await page.locator('.gh-stepnav button').last().click();assert.match(await page.locator('[data-gpm-log]').innerText(),/FR0512/);
  if(lang==='ru'){
   await page.locator('#gh-query').fill('Какие сроки в 2027 году?');await page.locator('#gh-query').press('Enter');
   assert.match(await page.locator('[data-gpm-log]').innerText(),/3 мая 2027/);
   await page.locator('#gh-query').fill('301004570');await page.locator('#gh-query').press('Enter');
   assert.match(await page.locator('[data-gpm-log]').innerText(),/ещё подтверждается/);
  }
  await page.screenshot({path:path.join(out,`${lang}-${w}x${h}.png`)});
  const dims=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,win:innerWidth,inputBottom:document.querySelector('#gh-query').getBoundingClientRect().bottom}));
  assert.ok(dims.scrollWidth<=w+1,JSON.stringify(dims));assert.ok(dims.inputBottom<=h+1,JSON.stringify(dims));
  const before=requests.length;
  await page.locator('#gh-query').fill('name@example.com');await page.locator('#gh-query').press('Enter');
  assert.ok(!(await page.locator('[data-gpm-log]').innerText()).includes('name@example.com'));
  await page.locator('#gh-query').fill('<img onerror=alert(1)>');await page.locator('#gh-query').press('Enter');
  assert.equal(await page.locator('.gh-log img').count(),0);await page.waitForTimeout(100);
  assert.equal(requests.length,before,'no questions may be sent to any server');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('gpm-helper').open && document.querySelector('[data-gpm-open]').getAttribute('aria-expanded')==='false');assert.equal(await page.locator('[data-gpm-open]').getAttribute('aria-expanded'),'false');
  assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-gpm-open')),true);
  assert.deepEqual(errors,[]);assert.ok(requests.every(u=>u.startsWith(base+'/')),JSON.stringify(requests));
  result.push({lang,width:w,height:h,passed:true,requests:requests.length,errors});await page.close();
 }
 const page=await browser.newPage({javaScriptEnabled:false});await page.goto(base+'/');
  if(await page.locator('#photo-dialog').isVisible()) {
   await page.keyboard.press('Escape');
   await page.locator('#cookie-notice').waitFor({state:'visible'});
  }
  if(await page.locator('[data-cookie-confirm]').isVisible()) await page.locator('[data-cookie-confirm]').click();
 assert.equal(await page.locator('[data-gpm-open]').isHidden(),true);assert.equal(await page.locator('#faq').isVisible(),true);
 result.push({scenario:'no-JavaScript',passed:true});await page.close();
 // Mock only the model endpoint: the served HTML, CSP and application JS are unchanged.
 const endpoint='https://bukiskis-ai-router.maksimas1982.workers.dev/api/chat';
 const ui=JSON.parse(fs.readFileSync(path.join(root,'src/locales/gpm-helper.ui.json'),'utf8'));
 for(const lang of Object.keys(ui)){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const calls=[];let mode='ok',release,heldResolve;
  const held=new Promise(resolve=>{heldResolve=resolve;});
  await page.route(endpoint,async route=>{
   const request=route.request();
   const headers={'Access-Control-Allow-Origin':base,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type'};
   if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
   calls.push(request.postDataJSON());
   if(mode==='hold')await new Promise(resolve=>{release=resolve;heldResolve();});
   if(mode==='rate'){await route.fulfill({status:429,headers,json:{error:{code:'RATE_LIMITED'}}});return;}
   await route.fulfill({status:200,headers,json:{answer:'A source-based answer <img src=x onerror=alert(1)>',provider:'openai',sourceSnapshotDate:'2026-10-05',sources:[
    {title:'VMI',url:'https://www.vmi.lt/evmi/paramos-skyrimas-34-str.-1'},
    {title:'Unsafe',url:'javascript:alert(1)'}]}}).catch(()=>{});
  });
  await page.goto(`${base}/${lang}/index.html`,{waitUntil:'networkidle'});
  if(await page.locator('#photo-dialog').isVisible()){
   await page.keyboard.press('Escape');
   await page.locator('#cookie-notice').waitFor({state:'visible'});
  }
  if(await page.locator('[data-cookie-confirm]').isVisible())await page.locator('[data-cookie-confirm]').click();
  await page.locator('#gpm-amount').fill('9876.54');
  await page.locator('[data-gpm-open]').click();
  await page.locator('#gh-query').fill('What is 1.2%?');
  await page.locator('[data-gpm-ai]').click();
  await page.getByRole('button',{name:ui[lang].aiAccept,exact:true}).waitFor();
  assert.equal(calls.length,0,'nothing leaves before consent');
  await page.screenshot({path:path.join(out,`consent-${lang}.png`)});
  await page.getByRole('button',{name:ui[lang].aiAccept,exact:true}).click();
  await page.getByRole('heading',{name:ui[lang].aiAnswer+' · OpenAI',exact:true}).waitFor();
  assert.deepEqual(calls[0],{message:'What is 1.2%?',language:lang,history:[],consent:true});
  assert.equal(await page.locator('.gh-log img').count(),0);
  assert.equal(await page.locator('.gh-log a[href^="javascript:"]').count(),0);
  await page.locator('#gh-query').fill('And how do I submit it?');
  await page.locator('[data-gpm-ai]').click();
  await page.getByRole('heading',{name:ui[lang].aiAnswer+' · OpenAI',exact:true}).nth(1).waitFor();
  assert.equal(calls[1].history.length,2);assert.equal(calls[1].history[0].text,'What is 1.2%?');
  assert.ok(!JSON.stringify(calls).includes('9876'),'calculator never included');
  mode='rate';await page.locator('#gh-query').fill('What is the deadline?');await page.locator('[data-gpm-ai]').click();
  await page.getByText(ui[lang].aiRateLimit,{exact:true}).waitFor();
  await page.getByRole('button',{name:ui[lang].aiLocal,exact:true}).click();
  await page.locator('[data-gpm-reset]').click();
  await page.locator('#gh-query').fill('name@example.com');await page.locator('[data-gpm-ai]').click();
  assert.equal(calls.length,3);assert.ok(!(await page.locator('[data-gpm-log]').innerText()).includes('name@example.com'));
  mode='hold';await page.locator('#gh-query').fill('What is GPM?');await page.locator('[data-gpm-ai]').click();
  await page.getByRole('button',{name:ui[lang].aiAccept,exact:true}).click();
  await held;
  await page.waitForFunction(()=>!document.querySelector('[data-gpm-cancel]').hidden);
  await page.locator('[data-gpm-cancel]').click();
  if(release)release();
  await page.getByText(ui[lang].aiCancelled,{exact:true}).waitFor();
  await page.keyboard.press('Escape');await page.locator('[data-gpm-open]').click();
  await page.locator('#gh-query').fill('What is GPM?');await page.locator('[data-gpm-ai]').click();
  await page.getByRole('button',{name:ui[lang].aiAccept,exact:true}).waitFor();
  result.push({scenario:'consent-ai-history-errors-cancel',lang,passed:true});
  await page.close();
 }
}finally{
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));if(browser)await browser.close();await new Promise(ok=>server.close(ok));
}
console.log(JSON.stringify(result,null,2));
