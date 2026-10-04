const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const config=require('../src/site.config.json');
const root=path.resolve(__dirname,'../docs');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Published assets are separated by purpose and lazy scripts resolve',()=>{
 for(const directory of ['css','js','img','fonts']) assert.ok(fs.statSync(path.join(root,'assets',directory)).isDirectory());
 for(const lang of config.languages) assert.doesNotMatch(read(`${lang}/index.html`),/(?:src|href)="\.\.\/assets\/(?:app|styles|data-|gpm-helper)/);
 for(const lang of config.languages) {
  const html=read(`${lang}/index.html`);
  for(const match of html.matchAll(/(?:data-gpm-src|data-fallback)="([^"]+)"/g)) {
   assert.ok(fs.existsSync(path.resolve(root,lang,match[1])),`${lang}: ${match[1]}`);
  }
 }
});

test('404 uses the site design and has absolute recovery links for nested missing paths',()=>{
 const html=read('404.html');
 const base=(process.env.SITE_URL||config.publicBaseUrl).replace(/\/?$/,'/');
 assert.match(html,/<main class="container not-found-card">/);
 assert.match(html,/<meta name="robots" content="noindex">/);
 assert.ok(html.includes(`href="${base}assets/css/styles.css"`));
 for(const lang of config.languages) assert.ok(html.includes(`href="${base}${lang}/index.html"`));
 assert.doesNotMatch(html,/<script|unsafe-inline|style=/);
});

test('Cached pages retain their script, lazy corpus, stylesheet and image URLs',()=>{
 for(const name of fs.readdirSync(path.join(root,'assets/js'))) {
  assert.equal(read(`assets/${name}`),read(`assets/js/${name}`));
 }
 assert.equal(read('assets/styles.css'),read('assets/css/styles.css').replaceAll('../img/','images/'));
 for(const name of fs.readdirSync(path.join(root,'assets/img'))) {
  assert.deepEqual(fs.readFileSync(path.join(root,'assets/images',name)),fs.readFileSync(path.join(root,'assets/img',name)));
 }
});

test('Support information and privacy notice remain localized without hiding the cards',()=>{
 for(const lang of config.languages) {
  const t=require(`../src/locales/${lang}.json`), html=read(`${lang}/index.html`);
  assert.equal((html.match(/class="project-card"/g)||[]).length,3);
  assert.equal((html.match(/class="project-actions"/g)||[]).length,3);
  assert.ok(html.includes(t.cookieNotice.body));
  assert.ok(read(`${lang}/privacy.html`).includes(t.cookieNotice.body));
  for(const project of t.projects) assert.ok(html.includes(project[2]));
 }
});
