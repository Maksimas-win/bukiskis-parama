from browser_fixture import *
import os,shutil
import json
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or p.chromium.executable_path,headless=True,args=['--no-sandbox'])
 for lang in ['ru','lt','en','pl','de','uk']:
  for width in [1440,768,390,320]:
   page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   load(page,lang)
   assert page.locator('.hero-explainer details').count()==3
   explainer=page.locator('.hero-explainer details').nth(1)
   explainer.locator('summary').click()
   assert explainer.evaluate('(e)=>e.open')
   explainer.locator('summary').press('Enter')
   assert not explainer.evaluate('(e)=>e.open')
   overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth')
   results.append({'language':lang,'width':width,'horizontalOverflow':overflow,'errors':errors})
   if overflow:
    print('OVERFLOW',lang,width,page.evaluate('''Array.from(document.querySelectorAll('body *')).filter(x=>{let b=x.getBoundingClientRect();return b.width>0&&(b.right>innerWidth+1||b.left< -1)}).map(x=>({tag:x.tagName,cls:x.className,id:x.id,left:Math.round(x.getBoundingClientRect().left),right:Math.round(x.getBoundingClientRect().right),text:x.textContent.trim().slice(0,40)})).slice(0,10)'''))
   assert not errors,(lang,width,errors)
   assert not overflow,(lang,width,'horizontal overflow')
   page.close()
 page=browser.new_page(viewport={'width':1280,'height':900},reduced_motion='reduce')
 load(page,'ru')
 amount=page.locator('#gpm-amount'); amount.fill('10000'); assert '120' in page.locator('#single-result').inner_text()
 amount.fill('bad'); assert page.locator('#calc-error').is_visible(); assert page.locator('#single-result').inner_text()=='—'
 amount.fill('0'); assert '0,00' in page.locator('#single-result').inner_text()
 amount.fill('3000,25'); assert '36,00' in page.locator('#single-result').inner_text()
 page.locator('#people-count').fill('100'); assert '3\u00a0600,00' in page.locator('#group-result').inner_text()
 page.locator('[data-step="2"]').click(); assert page.locator('#guide-panel-2').is_visible(); assert not page.locator('#guide-panel-0').is_visible()
 page.locator('[data-step="2"]').press('ArrowDown'); assert page.locator('#guide-panel-3').is_visible()
 page.locator('[data-step="3"]').press('End'); assert page.locator('#guide-panel-4').is_visible(); assert page.locator('[data-step-next]').is_disabled()
 assert page.locator('iframe').count()==0
 page.locator('#load-video').click(); assert page.locator('#vmi-video').get_attribute('src').startswith('https://www.youtube-nocookie.com/embed/MXLFmLWIQr8')
 assert page.locator('#stop-video').is_visible()
 page.locator('#stop-video').click(); assert page.locator('iframe').count()==0
 page.locator('.project-visual [data-photo="2"]').click(); assert page.locator('#photo-dialog').is_visible();assert page.locator('#hotspots').is_visible()
 page.locator('[data-hotspot="1"]').click(); assert page.locator('[data-hotspot="1"]').get_attribute('aria-pressed')=='true'
 page.keyboard.press('Escape'); assert not page.locator('#photo-dialog').is_visible();assert page.locator('.project-visual [data-photo="2"]').evaluate('(e)=>e===document.activeElement')
 # Exercise clipboard handler with a browser API stub, never claim permission was tested.
 page.evaluate('''Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text}}});Object.defineProperty(window,'isSecureContext',{configurable:true,value:true});''')
 page.locator('[data-copy-details]').click();assert 'LT407044060006244432' in page.evaluate('window.__copied')
 assert page.locator('.toast').inner_text()=='Скопировано'
 # Screenshots are optional; these tests do not alter the production files.
 page.close()
 page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 load(page,'ru',js=False)
 assert page.locator('#guide-panel-4').is_visible()
 assert not page.locator('[data-copy-details]').is_visible()
 assert 'Bukiškio' in page.locator('.bank-card').inner_text()
 page.close()
 for lang in ['ru','lt','en','pl','de','uk']:
  page=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
  load(page,lang,privacy=True)
  assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),(lang+' privacy overflow',page.evaluate('({scroll:document.documentElement.scrollWidth,inner:innerWidth,offenders:[...document.querySelectorAll("body *")].filter(x=>x.getBoundingClientRect().right>innerWidth+1).map(x=>[x.tagName,x.className,x.textContent.slice(0,30)])})'))
  page.close()
 browser.close()
(ROOT/'qa/browser-results.json').write_text(json.dumps(results,indent=2))
print('Interactive checks passed; viewport overflows:',sum(r['horizontalOverflow'] for r in results))
