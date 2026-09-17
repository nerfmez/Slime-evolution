import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export const REQUIRED = [
  'assets/grass-painted.png', 'assets/tree-reference-b.png',
  'assets/pond-painted.png', 'assets/pond-northern.png',
  'assets/clearing-painted.png', 'assets/meadow-pigment-cache.png',
  'assets/vfx/inferno-flame-paint.png', 'assets/enemies/water-calf-atlas.webp'
];
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.png':'image/png', '.webp':'image/webp',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif',
  '.svg':'image/svg+xml', '.ogg':'audio/ogg', '.mp3':'audio/mpeg',
  '.wav':'audio/wav', '.woff2':'font/woff2', '.bin':'application/octet-stream' };
export const digest = data => createHash('sha256').update(data).digest('hex');
async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes:true })) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) out.push(...await files(p));
    else if (e.isFile()) out.push(p);
    else throw Error(`Unsupported release entry: ${p}`);
  }
  return out.sort();
}
function assertImage(bytes, path) {
  const ext=extname(path);
  if (ext==='.png' && !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw Error(`Invalid PNG: ${path}`);
  if (ext==='.webp' && !(bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP')) throw Error(`Invalid WebP: ${path}`);
}
export function assertHTML(html, path='index.html') {
  if (/<base\b/i.test(html)) throw Error(`Forbidden base tag / CDN wrapper: ${path}`);
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)) {
    if (/^(?:https?:)?\/\//i.test(m[1])) throw Error(`External release dependency: ${m[1]}`);
  }
}
export async function auditDist(root, publicRoot=null) {
  root=resolve(root);
  const all=await files(root), entries=new Map();
  for (const p of all) {
    const path=relative(root,p).split(sep).join('/');
    const data=await readFile(p);
    if (!data.length) throw Error(`Empty release file: ${path}`);
    assertImage(data,path);
    if (/^assets\/enemies\/crystal(?:[.-]|\/)/.test(path)) throw Error(`Removed Crystal asset returned: ${path}`);
    entries.set(path,data);
  }
  for (const path of ['index.html',...REQUIRED]) if (!entries.has(path)) throw Error(`Missing release asset: ${path}`);
  for (const entry of ['index.html','slime-motion.html']) {
    if (!entries.has(entry)) throw Error(`Missing entry: ${entry}`);
    const html=entries.get(entry).toString(); assertHTML(html,entry);
    for (const match of html.matchAll(/(?:src|href)=["']([^"'#?]+(?:\.js|\.css))["']/g)) {
      const path=match[1].replace(/^\.\//,'').replace(/^\//,'');
      if (!entries.has(path)) throw Error(`Missing entry dependency: ${path}`);
    }
  }
  // Vite does not validate URLs assembled by fetch()/Image(). Catch concrete URLs in emitted code.
  for (const [path,data] of entries) if (/^assets\/.*\.(?:js|css)$/.test(path)) {
    const text=data.toString();
    if (/cdn\.jsdelivr\.net\/gh\/nerfmez\/Slime-evolution|raw\.githubusercontent\.com\/nerfmez\/Slime-evolution/.test(text)) throw Error(`Source/CDN dependency in ${path}`);
    for (const m of text.matchAll(/["'`]((?:\.\/|\/)?assets\/[\w./%-]+\.(?:png|webp|jpe?g|gif|json|bin|ogg|mp3|wav)(?:\?[^"'`]*)?)["'`]/g)) {
      const asset=m[1].split('?')[0].replace(/^\.\//,'').replace(/^\//,'');
      if (!entries.has(asset)) throw Error(`Missing runtime URL: ${asset} in ${path}`);
    }
  }
  if (publicRoot) for (const path of await files(resolve(publicRoot,'assets'))) {
    const rel=relative(publicRoot,path).split(sep).join('/');
    const original=await readFile(path);
    if (!entries.get(rel)?.equals(original)) throw Error(`public -> dist mismatch: ${rel}`);
  }
  return entries;
}
export async function seal(root, sha, publicRoot=null) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw Error('A full source commit SHA is required');
  root=resolve(root);
  await auditDist(root,publicRoot);
  for (const entry of ['index.html','slime-motion.html']) {
    const p=resolve(root,entry);
    let html=(await readFile(p,'utf8')).replace(/<meta name="slime-build"[^>]*>\s*/g,'');
    html=html.replace('</head>',`<meta name="slime-build" content="${sha}"></head>`);
    await writeFile(p,html);
  }
  const entries=await auditDist(root,publicRoot);
  const manifest={schema:1,commit:sha,source:'root-vite',required:REQUIRED,files:[]};
  for (const [path,data] of entries) if (path!=='release.json') manifest.files.push({path,size:data.length,sha256:digest(data)});
  await writeFile(resolve(root,'release.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(`Sealed ${sha}: ${manifest.files.length} files (source + public only)`);
  return manifest;
}
function safePath(path) {
  return typeof path==='string' && path.length>0 && !path.startsWith('/') && !path.includes('\\') && !path.split('/').some(p=>p==='..'||p==='.') && !/[?#:]/.test(path);
}
export async function verifyRemote(url,sha) {
  if (!/^[a-f0-9]{40}$/.test(sha||'')) throw Error('EXPECTED_COMMIT must be the independently known source SHA');
  const base=new URL(url); if (!['http:','https:'].includes(base.protocol)) throw Error('HTTP(S) URL required');
  if (!base.pathname.endsWith('/')) throw Error('Use the deployment root URL ending in /');
  const headers={'cache-control':'no-cache'};
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers['x-vercel-protection-bypass']=process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  async function get(path, type=null) {
    if (!safePath(path)) throw Error(`Unsafe manifest path: ${path}`);
    const target=new URL(path,base); target.searchParams.set('release_check',sha);
    const response=await fetch(target,{headers,signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw Error(`HTTP ${response.status}: ${target.pathname}`);
    if (new URL(response.url).origin!==base.origin) throw Error(`Cross-origin redirect: ${target.pathname}`);
    const mime=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if (type && mime!==type) throw Error(`Wrong MIME ${mime} (expected ${type}): ${path}`);
    if (extname(path)!=='.html' && mime==='text/html') throw Error(`HTML fallback disguised as asset: ${path}`);
    return Buffer.from(await response.arrayBuffer());
  }
  const html=(await get('index.html','text/html')).toString();
  assertHTML(html);
  if (!html.includes(`<meta name="slime-build" content="${sha}">`)) throw Error(`Wrong/stale deployed HTML; expected ${sha}`);
  const manifest=JSON.parse((await get('release.json','application/json')).toString());
  if (manifest.schema!==1 || manifest.source!=='root-vite' || manifest.commit!==sha) throw Error('Wrong deployed manifest/version');
  if (!Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length>5000) throw Error('Invalid manifest files');
  const paths=new Set(manifest.files.map(f=>f.path));
  if(paths.size!==manifest.files.length)throw Error('Duplicate manifest paths');
  for (const path of ['index.html',...REQUIRED]) if (!paths.has(path)) throw Error(`Missing manifest asset: ${path}`);
  let next=0;
  await Promise.all(Array.from({length:6},async()=>{
    while(next<manifest.files.length){
      const f=manifest.files[next++];
      if (!Number.isInteger(f.size)||f.size<1||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error(`Invalid entry: ${f.path}`);
      const ext=extname(f.path),type=['.png','.webp','.json','.html','.css'].includes(ext)?TYPES[ext]:null;
      const data=await get(f.path,type);
      if (data.length!==f.size || digest(data)!==f.sha256) throw Error(`Mixed/stale/corrupt deployment file: ${f.path}`);
      assertImage(data,f.path);
    }
  }));
  console.log(`REMOTE VERIFIED ${base.origin} commit=${sha} files=${manifest.files.length}`);
  return manifest;
}
export function serve(root,port=4173) {
  root=resolve(root);
  const server=createServer(async(req,res)=>{
    try{
      let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'');
      if(!path)path='index.html';
      if(!safePath(path)) {res.writeHead(400);res.end('Bad path');return;}
      const absolute=resolve(root,path);
      if(!absolute.startsWith(root+sep))throw Error('Outside root');
      const data=await readFile(absolute);
      res.writeHead(200,{'Content-Type':TYPES[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
      res.end(req.method==='HEAD'?undefined:data);
    }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
  });
  return new Promise(resolve=>server.listen(port,'127.0.0.1',()=>resolve(server)));
}
async function main(){
  const command=process.argv[2];
  if(command==='build'){
    execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{stdio:'inherit'});
    const sha=process.env.GITHUB_SHA||process.env.VERCEL_GIT_COMMIT_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
    await seal('dist',sha,'public');
  }else if(command==='verify'){
    await verifyRemote(process.env.SMOKE_URL||process.argv[3],process.env.EXPECTED_COMMIT);
  }else if(command==='serve'){
    const server=await serve('dist',Number(process.env.PORT||4173));
    console.log(`Strict static server listening on ${server.address().port}`);
  }else throw Error('Usage: release-guard.mjs build|verify|serve');
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) main().catch(e=>{console.error(e.stack);process.exitCode=1;});
