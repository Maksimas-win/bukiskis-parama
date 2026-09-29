"""Capture the tested isolated page. External media use labelled fallbacks.
Screenshots demonstrate rendering, not a deployed website or live YouTube playback.
"""
from browser_fixture import *
import os,shutil
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or p.chromium.executable_path,headless=True,args=['--no-sandbox'])
 for width,height,name in [(1440,1080,'desktop'),(390,1250,'mobile')]:
  page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
  load(page,'ru');page.screenshot(path=str(ROOT/'preview'/f'{name}.png'))
  if name=='desktop':
   for section in ['guide','help']:
    page.evaluate('(id)=>window.scrollTo(0, document.getElementById(id).getBoundingClientRect().top+scrollY-110)',section)
    page.wait_for_timeout(150);page.screenshot(path=str(ROOT/'preview'/f'{section}.png'))
  page.close()
 browser.close()
print('Preview screenshots saved; sources: isolated local browser fixture')
