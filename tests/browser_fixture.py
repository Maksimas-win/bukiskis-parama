from playwright.sync_api import sync_playwright
from pathlib import Path
from bs4 import BeautifulSoup
import base64,json
ROOT=Path(__file__).resolve().parents[1]
def fixture(lang='ru',privacy=False):
 doc=ROOT/'docs'/lang/('privacy.html' if privacy else 'index.html')
 soup=BeautifulSoup(doc.read_text(),'html.parser')
 for el in soup.select('script, link[rel="stylesheet"],meta[http-equiv="Content-Security-Policy"]'):el.decompose()
 style=soup.new_tag('style');style.string=(ROOT/'src/styles.css').read_text();soup.head.append(style)
 def embed(path):
  f=(doc.parent/path).resolve();mime='image/svg+xml' if f.suffix=='.svg' else 'image/webp'
  return f'data:{mime};base64,'+base64.b64encode(f.read_bytes()).decode()
 for img in soup.select('img[data-fallback]'):
  src=img['src'];img['data-fallback']=embed(img['data-fallback'])
  img['src']=embed(src) if not src.startswith('https:') else 'data:image/png;base64,AA=='
 return str(soup)
def load(page,lang='ru',privacy=False,js=True):
 page.set_content(fixture(lang,privacy),wait_until='load')
 if js:
  page.evaluate((ROOT/'docs/assets/js'/f'data-{lang}.js').read_text())
  page.evaluate((ROOT/'src/math.js').read_text())
  page.evaluate((ROOT/'src/app.js').read_text())
 page.wait_for_timeout(150)
