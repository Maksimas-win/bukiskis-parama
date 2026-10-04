// Regression checks for project dialogs, cached asset URLs and privacy acknowledgement.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const directory=path.join(root,'docs'), output=path.join(root,'qa/site-ui');
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON||'/tmp/site-qa/package.json')('playwright');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(directory,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!file.startsWith(directory+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()) {res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain'});fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const results=[];
fs.mkdirSync(output,{recursive:true});
let browser;
try {
 browser=await chromium.launch({headless:true});
 for(const lang of ['ru','lt','en','pl','de','uk']) {
  for(const width of [1440,320]) {
   const context=await browser.newContext({viewport:{width,height:800},reducedMotion:'reduce'});
   const page=await context.newPage(), errors=[], missing=[], requests=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)missing.push(response.url());});
   page.on('request',request=>requests.push(request.url()));
   await page.goto(`${base}/${lang}/index.html`);
   const notice=page.locator('#cookie-notice');
   assert.ok(await notice.isVisible());
   assert.ok(!requests.some(url=>/youtube|googlevideo|doubleclick/.test(url)));
   assert.ok(!requests.some(url=>url.includes('parish-support-appeal.png')),'Poster must not load before its dialog opens');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(output,`notice-${lang}-${width}.png`)});
   await page.locator('[data-cookie-confirm]').click();
   assert.ok(!await notice.isVisible());
   await page.reload();
   assert.ok(!await notice.isVisible(),'Acknowledgement should survive a reload');
   const t=JSON.parse(fs.readFileSync(path.join(root,`src/locales/${lang}.json`),'utf8'));
   for(const index of [1,2,3]) {
    const opener=page.locator(`.project-preview[data-photo="${index}"]`);
    await opener.click();
    assert.ok(await page.locator('#photo-dialog').isVisible());
    assert.equal(await page.locator('#dialog-title').innerText(),t.projects[index-1][0]);
    assert.equal(await page.locator('#dialog-description').innerText(),t.projects[index-1][2]);
    if(index===1) {
     await page.waitForFunction(()=>document.querySelector('#dialog-image').complete&&document.querySelector('#dialog-image').naturalWidth===2750);
     assert.match(await page.locator('#dialog-image').getAttribute('src'),/parish-support-appeal\.png$/);
     assert.ok(await page.locator('#dialog-original').isVisible());
     assert.match(await page.locator('#dialog-appeal-details').innerText(),new RegExp(t.parishAppeal.heading));
     const dimensions=await page.locator('#dialog-image').evaluate(image=>({width:image.clientWidth,height:image.clientHeight}));
     assert.ok(Math.abs(dimensions.width/dimensions.height-2750/1938)<0.02,'The complete poster must retain its aspect ratio');
    } else {
     assert.ok(!await page.locator('#dialog-appeal-details').isVisible());
     assert.ok(!await page.locator('#dialog-original').isVisible());
    }
    if(index===2) {
     await page.locator('[data-hotspot="1"]').click();
     assert.equal(await page.locator('#hotspot-title').innerText(),t.hotspots[1][0]);
    }
    await page.keyboard.press('Escape');
    assert.ok(!await page.locator('#photo-dialog').isVisible());
    assert.ok(await opener.evaluate(el=>el===document.activeElement));
   }
   const details=page.locator('.project-actions [data-photo="2"]');
   await details.focus();await page.keyboard.press('Enter');
   assert.ok(await page.locator('#photo-dialog').isVisible());
   assert.equal(await page.locator('#hotspot-title').innerText(),t.hotspots[0][0]);
   await page.screenshot({path:path.join(output,`project-${lang}-${width}.png`)});
   await page.locator('#photo-dialog [data-close-dialog]').first().click();
   await page.locator('[data-cookie-open]').click();
   assert.ok(await notice.isVisible());
   await page.locator('[data-cookie-confirm]').click();
   assert.ok(await page.locator('[data-cookie-open]').evaluate(el=>el===document.activeElement));
   assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
   results.push({lang,width,dialogs:3,acknowledgement:true,passed:true});
   await context.close();
  }
 }
 for(const scenario of ['cached-assets','storage-blocked']) {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  if(scenario==='storage-blocked') await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
  const page=await context.newPage();
  if(scenario==='cached-assets') {
   const legacy=fs.readFileSync(path.join(directory,'ru/index.html'),'utf8').replaceAll('assets/js/','assets/').replaceAll('assets/css/','assets/').replaceAll('assets/img/','assets/images/');
   await page.route(`${base}/ru/index.html`,route=>route.fulfill({contentType:'text/html',body:legacy}));
  }
  await page.goto(`${base}/ru/index.html`);
  await page.locator('[data-cookie-confirm]').click();
  assert.ok(!await page.locator('#cookie-notice').isVisible());
  await page.locator('.project-preview[data-photo="2"]').click();
  assert.ok(await page.locator('#photo-dialog').isVisible());
  await page.keyboard.press('Escape');
  await page.locator('[data-gpm-open]').click();
  await page.waitForFunction(()=>!!window.GPM_HELPER_DATA);
  await page.locator('[data-gpm-topic="step-0"]').click();
  assert.match(await page.locator('[data-gpm-log]').innerText(),/EDS/);
  results.push({scenario,passed:true});await context.close();
 }
 console.log(JSON.stringify(results,null,2));
} finally {
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
 if(browser) await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
