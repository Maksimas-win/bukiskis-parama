const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'src/site.config.json')));
const copy=JSON.parse(fs.readFileSync(path.join(root,'src/locales/intro3d.json')));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('3D introduction preserves six locales and static content',()=>{
 for(const lang of config.languages){
  assert.equal(copy[lang].title.length,2);
  const html=read(`docs/${lang}/index.html`);
  assert.equal((html.match(/id="intro3d"/g)||[]).length,1);
  assert.match(html,/id="intro3d-content"/);
  assert.match(html,/href="#guide"/); assert.match(html,/href="#calculator"/);
  assert.ok(html.indexOf('id="intro3d"')<html.indexOf('id="intro3d-content"'));
  assert.match(html,/<script src="\.\.\/assets\/js\/intro3d.js" defer>/);
  assert.match(html,/intro3d__fallback/);
  assert.ok(!read(`docs/${lang}/privacy.html`).includes('intro3d:v1'));
 }
 assert.match(read('docs/index.html'),/<script src="assets\/js\/intro3d.js" defer>/);
});
test('fixed numeric meshes have complete finite geometry',()=>{
 const context={window:{}}; vm.runInNewContext(read('src/assets/percent3d-mesh.js'),context);
 const shapes=context.window.Percent3DMesh;
 assert.deepEqual(Object.keys(shapes).sort(),['comma','dot','one','percent','two']);
 for(const shape of Object.values(shapes)){
  assert.ok(shape.advance>0); assert.ok(Number.isFinite(shape.offsetY));
  assert.ok(shape.points.length>2); assert.equal(shape.triangles.length%3,0);
  for(const point of shape.points) assert.ok(point.length===2&&point.every(Number.isFinite));
  for(const index of shape.triangles) assert.ok(Number.isInteger(index)&&index>=0&&index<shape.points.length);
  for(const ring of shape.rings) assert.ok(ring.length>2&&ring.every(i=>i>=0&&i<shape.points.length));
 }
});
test('no external runtime dependency, motion trap or inline executable code',()=>{
 const js=read('src/assets/intro3d.js'), css=read('src/assets/intro3d.css');
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|eval\(|setInterval\(/);
 assert.doesNotMatch(js,/addEventListener\(['"](?:wheel|touchmove)['"]/);
 assert.match(js,/prefers-reduced-motion/); assert.match(js,/webglcontextlost/);
 assert.match(js,/IntersectionObserver/); assert.match(js,/document.hidden/);
 assert.match(css,/@media print/); assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 const html=read('docs/index.html');
 assert.doesNotMatch(html,/<script(?![^>]*src=)[^>]*>/);
 assert.doesNotMatch(html,/<style[\s>]/);
 for(const name of ['intro3d.js','intro3d.css','percent3d-mesh.js','percent3d-LICENSE.txt'])
   assert.equal(read(`docs/assets/${name.endsWith(".css")?"css":"js"}/${name}`),read(`src/assets/${name}`));
});
