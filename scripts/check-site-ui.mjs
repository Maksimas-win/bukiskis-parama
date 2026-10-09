// Regression checks for optional parish content, calculator thresholds, reading mode and asset compatibility.
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
const readingSelector='.reading-toggle[data-reading-toggle]';
const readingKey='gpm:reading-mode:v1';
const locale=lang=>JSON.parse(fs.readFileSync(path.join(root,`src/locales/${lang}.json`),'utf8'));
function observe(page) {
 const errors=[],missing=[],requests=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)missing.push(response.url());});
 page.on('request',request=>requests.push(request.url()));
 return {errors,missing,requests};
}
async function assertFits(page,message) {
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),message);
}
async function assertReading(page,enabled,t) {
 await page.waitForFunction(enabled=>(document.documentElement.dataset.reading==='comfortable')===enabled,enabled);
 const button=page.locator(readingSelector);
 assert.ok(await button.isVisible(),'The reading control must remain visible');
 assert.equal(await button.getAttribute('aria-pressed'),String(enabled));
 if(t) {
  assert.equal(await button.getAttribute('aria-label'),t.reading.toggle);
  assert.equal(await button.getAttribute('title'),t.reading.toggle);
  assert.equal(await button.locator('.reading-label').textContent(),t.reading.label);
 }
}
function assertClean(observations) {
 assert.deepEqual(observations.errors,[]);
 assert.deepEqual(observations.missing,[]);
 assert.ok(!observations.requests.some(url=>/youtube|googlevideo|doubleclick/.test(url)),'YouTube must remain unloaded without consent');
}
fs.mkdirSync(output,{recursive:true});
let browser;
try {
 browser=await chromium.launch({headless:true});
 for(const lang of ['ru','lt','en','pl','de','uk']) {
  for(const width of [1440,320]) {
   const context=await browser.newContext({viewport:{width,height:800},reducedMotion:'reduce'});
   const page=await context.newPage(), observations=observe(page), t=locale(lang);
   await page.goto(`${base}/${lang}/index.html`);
   const notice=page.locator('#cookie-notice'), dialog=page.locator('#photo-dialog');
   await notice.waitFor({state:'visible'});
   assert.ok(!await dialog.isVisible(),'First entry must not open a parish dialog');
   assert.equal(await page.locator('.dialog-appeal-details').count(),0,'The old dialog appeal must be removed');
   assert.equal(await page.evaluate(()=>scrollY),0,'First entry must begin at the top of the guide');
   await assertReading(page,false,t);
   await assertFits(page,'The initial guide and cookie notice must fit the screen');
   await page.screenshot({path:path.join(output,`notice-${lang}-${width}.png`)});
   await page.locator('[data-cookie-confirm]').click();
   assert.ok(!await notice.isVisible());
   await page.reload();
   assert.ok(!await dialog.isVisible(),'Reload must not open a parish dialog');
   assert.ok(!await notice.isVisible(),'Acknowledgement should survive a reload');

   const appeal=page.locator('.parish-appeal');
   assert.ok(await appeal.isVisible(),'The parish appeal must be ordinary page content');
   assert.equal(await appeal.locator('#parish-appeal-title').innerText(),t.parishAppeal.heading);
   assert.deepEqual((await appeal.locator('.parish-appeal-copy > p').allTextContents()).map(text=>text.trim()),t.parishAppeal.paragraphs);
   const inlinePhoto=appeal.locator('.parish-appeal-photo img');
   await inlinePhoto.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{
    const image=document.querySelector('.parish-appeal-photo img');
    return image.complete&&image.naturalWidth===2048&&image.naturalHeight===1152;
   });
   assert.match(await inlinePhoto.getAttribute('src'),/parish-roof\.webp$/);
   assert.equal(await inlinePhoto.getAttribute('alt'),t.parishAppeal.imageAlt);
   assert.equal(await appeal.locator('figcaption').innerText(),t.parishAppeal.caption);
   await assertFits(page,'The translated parish appeal and photo must fit the screen');
   await appeal.screenshot({path:path.join(output,`parish-${lang}-${width}.png`)});

   for(const index of [1,2,3]) {
    const opener=page.locator(`.project-preview[data-photo="${index}"]`);
    await opener.click();
    await dialog.waitFor({state:'visible'});
    assert.equal(await page.locator('#dialog-title').innerText(),t.projects[index-1][0]);
    assert.equal(await page.locator('#dialog-description').innerText(),t.projects[index-1][2]);
    assert.equal(await page.locator('.dialog-appeal-details').count(),0);
    if(index===1) {
     await page.waitForFunction(()=>{
      const image=document.querySelector('#dialog-image');
      return image.complete&&image.naturalWidth===2048&&image.naturalHeight===1153;
     });
     assert.match(await page.locator('#dialog-image').getAttribute('src'),/parish-exterior\.webp$/);
     assert.ok(await page.locator('#dialog-original').isVisible());
     assert.match(await page.locator('#dialog-original').getAttribute('href'),/parish-exterior\.webp$/);
     assert.equal(await page.locator('#dialog-caption').innerText(),t.parishAppeal.caption);
     const dimensions=await page.locator('#dialog-image').evaluate(image=>({width:image.clientWidth,height:image.clientHeight}));
     assert.ok(Math.abs(dimensions.width/dimensions.height-2048/1153)<0.02,'The parish photograph must retain its aspect ratio');
    } else {
     assert.ok(!await page.locator('#dialog-original').isVisible(),'Only the parish photograph has an original-photo link');
    }
    if(index===2) {
     await page.locator('[data-hotspot="1"]').click();
     assert.equal(await page.locator('#hotspot-title').innerText(),t.hotspots[1][0]);
     assert.equal(await page.locator('[data-hotspot="1"]').getAttribute('aria-pressed'),'true');
    }
    await assertFits(page,'Project dialogs must not cause horizontal page overflow');
    await page.keyboard.press('Escape');
    await dialog.waitFor({state:'hidden'});
    assert.ok(await opener.evaluate(el=>el===document.activeElement),'Closing a dialog must restore its opener focus');
   }
   const details=page.locator('.project-actions [data-photo="2"]');
   await details.focus();await page.keyboard.press('Enter');
   await dialog.waitFor({state:'visible'});
   assert.equal(await page.locator('#hotspot-title').innerText(),t.hotspots[0][0]);
   await page.keyboard.press('Tab');
   assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)),'Keyboard focus must stay inside an open modal');
   await page.screenshot({path:path.join(output,`project-${lang}-${width}.png`)});
   await page.locator('#photo-dialog [data-close-dialog]').first().click();
   await dialog.waitFor({state:'hidden'});
   // close() hides the dialog before its queued close event restores the opener focus.
   try {
    await page.waitForFunction(selector=>document.querySelector(selector)===document.activeElement,'.project-actions [data-photo="2"]',{timeout:2000});
   } catch(error) {
    if(error.name!=='TimeoutError') throw error;
    const active=await page.evaluate(()=>{
     const element=document.activeElement;
     return element?{tag:element.tagName,id:element.id,className:element.className,dataPhoto:element.getAttribute('data-photo'),text:element.textContent?.trim().slice(0,120)}:null;
    });
    assert.fail(`${lang}/${width}: Closing the dialog did not restore focus to .project-actions [data-photo="2"] within 2000 ms. Active element: ${JSON.stringify(active)}`);
   }
   assert.ok(await details.evaluate(el=>el===document.activeElement));
   await page.locator('[data-cookie-open]').click();
   assert.ok(await notice.isVisible());
   await page.locator('[data-cookie-confirm]').click();
   assert.ok(await page.locator('[data-cookie-open]').evaluate(el=>el===document.activeElement));

   const amount=page.locator('#gpm-amount'), slider=page.locator('#people-count');
   await amount.focus();
   await page.keyboard.press('Tab');
   assert.ok(await slider.evaluate(el=>el===document.activeElement),'The slider must be keyboard reachable');
   assert.ok(await slider.evaluate(el=>{const style=getComputedStyle(el);return style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0;}),'The focused slider must have a visible outline');
   await page.keyboard.press('Home');
   await page.keyboard.press('ArrowRight');
   assert.equal(await page.locator('#people-output').innerText(),'2','Keyboard changes must update the calculator');
   const count=Number(await slider.inputValue()), money=new Intl.NumberFormat(t.locale,{style:'currency',currency:'EUR'});
   await amount.fill('100');
   assert.equal(await page.locator('#single-result').innerText(),money.format(1.2));
   assert.equal(await page.locator('#group-result').innerText(),money.format(0));
   assert.ok(await page.locator('#calc-threshold-note').isVisible(),'Below-minimum allocations need a visible explanation');
   assert.equal(await page.locator('#calc-threshold-note').innerText(),t.calcBelowMinimum);
   assert.equal(await page.locator('#group-result-label').innerText(),t.calcGroupBelowMinimum);
   await assertFits(page,'The minimum-transfer explanation must fit the screen');
   await amount.fill('250');
   assert.equal(await page.locator('#single-result').innerText(),money.format(3));
   assert.equal(await page.locator('#group-result').innerText(),money.format(3*count));
   assert.ok(!await page.locator('#calc-threshold-note').isVisible(),'Exactly 3 EUR must qualify for transfer');
   assert.equal(await page.locator('#group-result-label').innerText(),t.calcTogether);
   await amount.fill('invalid');
   assert.equal(await amount.getAttribute('aria-invalid'),'true');
   assert.ok(await page.locator('#calc-error').isVisible());
   assert.equal(await page.locator('#single-result').innerText(),'—');
   assert.equal(await page.locator('#group-result').innerText(),'—');
   assert.ok(!await page.locator('#calc-threshold-note').isVisible(),'An invalid amount must not retain a threshold warning');
   assert.equal(await page.locator('#group-result-label').innerText(),t.calcTogether);
   await amount.fill('3000');
   await assertFits(page,'Calculator and controls must fit the screen');
   assert.equal(await page.locator('.menu-toggle').isVisible(),width<961,'Show the menu button only at mobile widths');

   const reading=page.locator(readingSelector);
   await reading.focus();await page.keyboard.press('Enter');
   await assertReading(page,true,t);
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),readingKey),'comfortable');
   assert.equal(await page.locator('[data-reading-status]').textContent(),t.reading.enabled);
   await assertFits(page,'Comfortable reading must not introduce horizontal overflow');
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:path.join(output,`reading-${lang}-${width}.png`)});
   await page.reload();
   await assertReading(page,true,t);
   assert.ok(!await dialog.isVisible());
   assert.ok(!await notice.isVisible(),'Changing reading mode must preserve privacy acknowledgement');
   await assertFits(page,'Restored reading preferences must fit the screen');
   const nextLang=lang==='ru'?'lt':'ru', nextT=locale(nextLang);
   await page.locator('#language-control summary').click();
   await page.locator(`#language-control [data-language="${nextLang}"]`).click();
   await page.waitForURL(url=>url.pathname===`/${nextLang}/`);
   await page.waitForLoadState();
   await assertReading(page,true,nextT);
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),readingKey),'comfortable');
   assert.ok(!await dialog.isVisible(),'Changing language must not open a parish dialog');
   assert.ok(!await notice.isVisible());
   await assertFits(page,'Reading mode must fit after a language change');
   await page.locator(readingSelector).click();
   await assertReading(page,false,nextT);
   assert.equal(await page.locator('[data-reading-status]').textContent(),nextT.reading.disabled);
   assert.notEqual(await page.evaluate(key=>localStorage.getItem(key),readingKey),'comfortable');
   await page.reload();
   await assertReading(page,false,nextT);
   await page.goto(`${base}/${lang}/privacy.html`);
   assert.equal(await page.locator('#photo-dialog').count(),0,'The privacy page must remain directly accessible');
   await assertFits(page,'Translated privacy headings must fit the screen');
   assertClean(observations);
   results.push({lang,width,dialogs:3,inlineParish:true,calculatorThreshold:true,reading:true,acknowledgement:true,passed:true});
   await context.close();
  }
 }
 for(const scenario of ['cached-assets','storage-blocked']) {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  if(scenario==='storage-blocked') await context.addInitScript(()=>{
   for(const key of ['localStorage','sessionStorage']) Object.defineProperty(window,key,{get(){throw new DOMException('Blocked','SecurityError');}});
  });
  const page=await context.newPage(), observations=observe(page), t=locale('ru');
  if(scenario==='cached-assets') {
   const legacy=fs.readFileSync(path.join(directory,'ru/index.html'),'utf8').replaceAll('assets/js/','assets/').replaceAll('assets/css/','assets/').replaceAll('assets/img/','assets/images/');
   await page.route(`${base}/ru/index.html`,route=>route.fulfill({contentType:'text/html',body:legacy}));
  }
  await page.goto(`${base}/ru/index.html`);
  assert.ok(!await page.locator('#photo-dialog').isVisible(),'Compatibility scenarios must also start without a modal');
  assert.equal(await page.evaluate(()=>scrollY),0);
  await page.locator('#cookie-notice').waitFor({state:'visible'});
  await page.locator('[data-cookie-confirm]').click();
  assert.ok(!await page.locator('#cookie-notice').isVisible());
  await page.locator('.project-preview[data-photo="2"]').click();
  await page.locator('#photo-dialog').waitFor({state:'visible'});
  await page.keyboard.press('Escape');
  await page.locator('#photo-dialog').waitFor({state:'hidden'});
  await page.locator('[data-gpm-open]').click();
  await page.waitForFunction(()=>!!window.GPM_HELPER_DATA);
  await page.locator('[data-gpm-topic="step-0"]').click();
  assert.match(await page.locator('[data-gpm-log]').innerText(),/EDS/);
  await page.keyboard.press('Escape');
  await page.locator('#gpm-helper').waitFor({state:'hidden'});
  assert.ok(await page.locator('[data-gpm-open]').evaluate(el=>el===document.activeElement));
  await page.locator(readingSelector).click();
  await assertReading(page,true,t);
  await assertFits(page,`${scenario}: reading mode must fit the screen`);
  if(scenario==='cached-assets') assert.equal(await page.evaluate(key=>localStorage.getItem(key),readingKey),'comfortable');
  await page.reload();
  assert.ok(!await page.locator('#photo-dialog').isVisible());
  await assertReading(page,scenario==='cached-assets',t);
  if(scenario==='storage-blocked') {
   await page.locator('#cookie-notice').waitFor({state:'visible'});
   await page.locator('[data-cookie-confirm]').click();
   await page.locator(readingSelector).click();
   await assertReading(page,true,t);
   await page.locator(readingSelector).click();
   await assertReading(page,false,t);
  } else {
   assert.ok(!await page.locator('#cookie-notice').isVisible());
  }
  assertClean(observations);
  results.push({scenario,reading:true,helper:true,passed:true});await context.close();
 }
 console.log(JSON.stringify(results,null,2));
} finally {
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
 if(browser) await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
