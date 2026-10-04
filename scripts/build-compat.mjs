// Retain pre-0.5 asset URLs for visitors with cached HTML or an already open tab.
// Current HTML continues to use the css/js/img directories exclusively.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const assets = fileURLToPath(new URL('../docs/assets/', import.meta.url));
for (const directory of ['js', 'css']) {
  for (const name of fs.readdirSync(path.join(assets, directory))) {
    const source = path.join(assets, directory, name);
    const target = path.join(assets, name);
    if (directory === 'css') {
      fs.writeFileSync(target, fs.readFileSync(source, 'utf8').replaceAll('../img/', 'images/'));
    } else {
      fs.copyFileSync(source, target);
    }
  }
}
fs.cpSync(path.join(assets, 'img'), path.join(assets, 'images'), {recursive: true});
console.log('Preserved legacy asset URLs for cached pages.');
