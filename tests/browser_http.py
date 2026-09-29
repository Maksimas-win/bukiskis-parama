"""Serve the built site unchanged (including CSP) and test it in Chromium.
External project images are blocked to exercise their labelled fallback. YouTube
is replaced with an inert document when explicitly enabled; playback is NOT tested.
"""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json, os, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'docs')))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
results=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or p.chromium.executable_path,headless=True,args=['--no-sandbox'])
  context=browser.new_context(reduced_motion='reduce',permissions=['clipboard-read','clipboard-write'])
  context.route('https://raw.githubusercontent.com/**',lambda r:r.abort())
  context.route('https://www.youtube-nocookie.com/**',lambda r:r.fulfill(status=200,content_type='text/html',body='<!doctype html><title>Test fixture — no playback</title>'))
  for lang in ['ru','lt','en','pl','de','uk']:
   for width in [1440,768,390,320]:
    for name in ['index','privacy']:
     page=context.new_page();page.set_viewport_size({'width':width,'height':900})
     errors=[];csp=[]
     page.on('pageerror',lambda e:errors.append(str(e)))
     page.on('console',lambda msg:csp.append(msg.text) if ('Content Security Policy' in msg.text or 'violates the following' in msg.text) else None)
     response=page.goto(f'{base}/{lang}/{name}.html',wait_until='load')
     assert response.status==200
     page.wait_for_timeout(60)
     assert page.locator('body').evaluate('(e)=>e.classList.contains("enhanced")')
     overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth')
     assert not overflow,(lang,name,width,'overflow')
     assert not errors,(lang,name,width,errors)
     assert not csp,(lang,name,width,csp)
     if name=='index':
      assert page.locator('.hero img').count()==0
      assert page.locator('.hero-explainer details').count()==3
      page.locator('.hero-explainer details').nth(1).locator('summary').click()
      assert page.locator('.hero-explainer details').nth(1).evaluate('(e)=>e.open')
      assert page.locator('iframe').count()==0
      # Expanded explanatory cards must not break the small-screen layout.
      assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
     results.append({'language':lang,'page':name,'width':width,'httpStatus':response.status,'horizontalOverflow':overflow,'jsErrors':errors,'cspErrors':csp})
     page.close()
  page=context.new_page();page.set_viewport_size({'width':1280,'height':950})
  page.goto(f'{base}/ru/index.html',wait_until='load')
  page.locator('#gpm-amount').fill('10000');assert '120,00' in page.locator('#single-result').inner_text()
  page.locator('[data-step="2"]').click();assert page.locator('#guide-panel-2').is_visible()
  assert 'Пример' in page.locator('#guide-panel-2').inner_text()
  page.locator('#guide-tab-2').press('ArrowDown');assert page.locator('#guide-panel-3').is_visible()
  page.locator('[data-copy="301004570"]').click()
  assert page.evaluate('navigator.clipboard.readText()')=='301004570'
  assert page.locator('.toast').inner_text()=='Скопировано'
  page.locator('[data-photo="2"]').click();assert page.locator('#hotspots').is_visible()
  page.locator('[data-hotspot="1"]').click();assert page.locator('#hotspot-title').inner_text()=='Хранение'
  page.keyboard.press('Escape');assert not page.locator('#photo-dialog').is_visible()
  page.locator('#load-video').click();assert page.locator('#vmi-video').count()==1
  assert page.locator('#vmi-video').get_attribute('src').startswith('https://www.youtube-nocookie.com/embed/MXLFmLWIQr8')
  page.locator('#stop-video').click();assert page.locator('iframe').count()==0
  page.close()
  # Output screenshots from the unmodified HTTP-served site, not a recreated mockup.
  for width,height,name in [(1440,1080,'desktop'),(390,1250,'mobile')]:
   page=context.new_page();page.set_viewport_size({'width':width,'height':height})
   page.goto(f'{base}/ru/index.html',wait_until='load');page.wait_for_timeout(100)
   page.screenshot(path=str(ROOT/'preview'/f'{name}.png'))
   if name=='desktop':
    page.locator('#guide').scroll_into_view_if_needed();page.wait_for_timeout(150)
    page.screenshot(path=str(ROOT/'preview/guide.png'))
    page.locator('#help').scroll_into_view_if_needed();page.wait_for_timeout(150)
    page.screenshot(path=str(ROOT/'preview/help.png'))
   page.close()
  context.close();browser.close()
 (ROOT/'qa/http-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
 print(f'HTTP/CSP checks passed: {len(results)} pages/viewports. Real localhost clipboard API passed. Video playback was NOT tested.')
finally:
 server.shutdown();server.server_close()
