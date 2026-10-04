// Development server: no runtime packages, bound to the local machine only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs');
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be 1024–65535');
const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.txt':'text/plain; charset=utf-8','.xml':'application/xml' };
http.createServer((request, response) => {
 if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405,{Allow:'GET, HEAD'}).end(); return; }
 try {
  const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { response.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
   response.writeHead(404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   if(request.method==='HEAD') response.end();
   else fs.createReadStream(path.join(root,'404.html')).pipe(response);
   return;
  }
  response.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if (request.method === 'HEAD') response.end(); else fs.createReadStream(file).pipe(response);
 } catch (_) { response.writeHead(400).end('Bad request'); }
}).listen(port,'127.0.0.1',() => console.log(`Preview: http://127.0.0.1:${port}/`));
