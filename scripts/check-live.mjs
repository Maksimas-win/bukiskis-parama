// Compare the deployed artifact with the build that passed CI. No browser packages.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'docs');
const config=JSON.parse(fs.readFileSync(path.join(root,'src/site.config.json'),'utf8'));
const base=new URL(process.env.SITE_URL||config.publicBaseUrl);
if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash) throw Error('A public HTTPS site URL is required');
const files=[];
function collect(folder) {
 for(const entry of fs.readdirSync(folder,{withFileTypes:true})) {
  if(entry.name.startsWith('.')) continue;
  const file=path.join(folder,entry.name);
  if(entry.isDirectory()) collect(file);
  else if(entry.isFile()) files.push(path.relative(directory,file).split(path.sep).join('/'));
 }
}
collect(directory);
const digest=(bytes,file)=>createHash('sha256').update(/\.(?:html|css|js|json|xml|txt|svg)$/.test(file)?bytes.toString('utf8').replace(/\r\n/g,'\n'):bytes).digest('hex');
async function check(file) {
 try {
  const response=await fetch(new URL(file,base),{signal:AbortSignal.timeout(15000),headers:{'Cache-Control':'no-cache'}});
  const body=Buffer.from(await response.arrayBuffer());
  return {path:file,status:response.status,matches:response.status===200&&digest(body,file)===digest(fs.readFileSync(path.join(directory,file)),file)};
 } catch(error) { return {path:file,status:'error',matches:false,error:error.message}; }
}
let results=[];
for(let attempt=1;attempt<=8;attempt++) {
 results=[];
 for(let offset=0;offset<files.length;offset+=6) results.push(...await Promise.all(files.slice(offset,offset+6).map(check)));
 const failed=results.filter(row=>!row.matches);
 console.log(`Live verification ${attempt}/8: ${results.length-failed.length}/${results.length} files match the tested build.`);
 if(!failed.length) break;
 if(attempt<8) await delay(8000);
}
const report={base:base.href,commit:process.env.GITHUB_SHA||null,checkedAt:new Date().toISOString(),files:results};
const reportDir=path.join(root,'qa/live');
fs.mkdirSync(reportDir,{recursive:true});
fs.writeFileSync(path.join(reportDir,'report.json'),JSON.stringify(report,null,2)+'\n');
const failed=results.filter(row=>!row.matches);
if(failed.length) { console.error(JSON.stringify(failed,null,2));process.exitCode=1; }
