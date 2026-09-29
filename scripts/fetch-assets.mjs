// Optional one-time localization of public parish images. Requires internet access.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const media=JSON.parse(await fs.readFile(path.join(root,'src/media.json'),'utf8'));
const directory=path.join(root,'src/assets/images');
let failed=0;
for (const [key,item] of Object.entries(media)) {
 const destination=path.join(directory,item.filename);
 try {
  await fs.access(destination); console.log(`${key}: already local; unchanged`); continue;
 } catch (_) { /* Download absent files only. */ }
 try {
  if (!/^[a-zA-Z0-9_.-]+$/.test(item.filename)) throw new Error('Unsafe filename');
  const url=new URL(item.url);
  if(url.protocol!=='https:' || !['bukiski-hram.org','raw.githubusercontent.com'].includes(url.hostname)) throw new Error('Unapproved media host');
  const response=await fetch(url,{signal:AbortSignal.timeout(25000),redirect:'error'});
  if(!response.ok) throw new Error(`HTTP ${response.status}`);
  if(!/^image\//.test(response.headers.get('content-type')||'')) throw new Error('Response is not an image');
  const chunks=[];let length=0;
  for await (const chunk of response.body){length+=chunk.length;if(length>15_000_000)throw new Error('Image exceeds 15 MB');chunks.push(chunk);}
  const bytes=Buffer.concat(chunks);
  if(bytes.length<100)throw new Error('Image file is too small');
  if(item.gitBlobSha){
   const digest=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
   if(digest!==item.gitBlobSha)throw new Error('The source image has changed; review before replacing it');
  }
  await fs.writeFile(destination,bytes,{flag:'wx'});
  console.log(`${key}: saved ${bytes.length} bytes`);
 }catch(error){failed++;console.error(`${key}: ${error.message}. The build retains an external image with a labelled illustration fallback.`);}
}
console.log('Run npm run build after localizing images.');
if(failed)process.exitCode=1;
