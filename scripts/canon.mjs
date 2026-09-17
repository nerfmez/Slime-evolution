import { readFile, writeFile, readdir, stat, lstat, cp, rm, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve, join, extname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const digest = (b, algo = 'sha256') => createHash(algo).update(b).digest('hex');
const gitObject = (type, data) => digest(Buffer.concat([Buffer.from(`${type} ${data.length}\0`), data]), 'sha1');
export async function treeHash(dir) {
  const entries = await Promise.all((await readdir(dir)).map(async name => {
    const path = join(dir, name), s = await lstat(path);
    if (s.isSymbolicLink()) throw new Error(`Symlink forbidden: ${path}`);
    if (!s.isFile() && !s.isDirectory()) throw new Error(`Unsupported file: ${path}`);
    return {name, dir: s.isDirectory(), mode: s.isDirectory() ? '40000' : (s.mode & 0o111) ? '100755' : '100644', hash: s.isDirectory() ? await treeHash(path) : gitObject('blob', await readFile(path))};
  }));
  entries.sort((a,b) => Buffer.compare(Buffer.from(a.name + (a.dir ? '/' : '')), Buffer.from(b.name + (b.dir ? '/' : ''))));
  return gitObject('tree', Buffer.concat(entries.map(e => Buffer.concat([Buffer.from(`${e.mode} ${e.name}\0`), Buffer.from(e.hash, 'hex')]))));
}
export async function files(dir, prefix = '') {
  const out = [];
  for (const name of (await readdir(join(dir,prefix))).sort()) {
    const path = prefix ? `${prefix}/${name}` : name;
    const s = await lstat(join(dir,path));
    if (s.isDirectory()) out.push(...await files(dir,path));
    else if (s.isFile()) out.push(path);
    else throw new Error(`Unsupported file: ${path}`);
  }
  return out;
}
async function lock() { return JSON.parse(await readFile(join(root,'CANON.json'),'utf8')); }
export async function build() {
  const c = await lock(), game = join(root,'game'), dist = join(root,'dist');
  const hash = await treeHash(game);
  if (hash !== c.tree) throw new Error(`Wrong game baseline: ${hash}; locked Moss Frog tree is ${c.tree}. Do not fill gaps from another version.`);
  for (const name of ['main.js','enemies.js','public','published','vite.config.js']) {
    if (await stat(join(root,name)).catch(() => null)) throw new Error(`Ambiguous legacy root: ${name}`);
  }
  const html = await readFile(join(game,'index.html'),'utf8');
  if (/<base\b/i.test(html) || /cdn\.jsdelivr|raw\.githubusercontent/i.test(html)) throw new Error('External game wrapper forbidden');
  const bundle = await readFile(join(game,'assets/main-critter-v4.js'),'utf8');
  for (const marker of ['Moss Frog','__slimeFrogFrame','__slimeFrogFacing','__slimeFrogHopLift','frogHopActive']) if (!bundle.includes(marker)) throw new Error(`Missing finished frog feature: ${marker}`);
  const manifest = [];
  for (const path of await files(game)) {
    const bytes = await readFile(join(game,path));
    if (/\.(png|webp|jpg|jpeg)$/i.test(path)) {
      const image = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || (bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') || (bytes[0]===255 && bytes[1]===216);
      if (!image) throw new Error(`Invalid image bytes: ${path}`);
    }
    manifest.push({path, bytes:bytes.length, sha256:digest(bytes)});
  }
  await rm(dist,{recursive:true,force:true});
  await cp(game,dist,{recursive:true});
  if (await treeHash(dist) !== hash) throw new Error('Copy changed canonical game bytes');
  let commit = process.env.GITHUB_SHA;
  if (!commit) commit = execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  await writeFile(join(dist,'release.json'),JSON.stringify({canonicalCommit:c.commit,canonicalTree:c.tree,repositoryCommit:commit,files:manifest.length},null,2)+'\n');
  await writeFile(join(dist,'asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  await mkdir(join(root,'test-results'),{recursive:true});
  await writeFile(join(root,'test-results/integrity.json'),JSON.stringify({canonicalTree:hash,repositoryCommit:commit,files:manifest.length,bytes:manifest.reduce((s,f)=>s+f.bytes,0),gameBytesUnchanged:true},null,2));
  console.log(`CANON VERIFIED: tree=${hash}, ${manifest.length} files, game -> dist byte-identical`);
}
export function serve(dir = join(root,'dist'), port = 4173) {
  const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.bin':'application/octet-stream'};
  const server = createServer(async (req,res) => {
    try {
      const u = new URL(req.url,'http://localhost'), relative = decodeURIComponent(u.pathname);
      const path = resolve(dir,'.'+relative+(relative.endsWith('/')?'index.html':''));
      if (!path.startsWith(resolve(dir)+sep)) { res.writeHead(403); res.end('Forbidden'); return; }
      const body = await readFile(path);
      res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
    } catch { res.writeHead(404,{'content-type':'text/plain'});res.end('Not found'); }
  });
  return server.listen(port,'127.0.0.1',() => console.log(`Strict canonical server: http://127.0.0.1:${server.address().port}`));
}
export async function audit(url) {
  const c = await lock(), base = new URL(url);
  if (base.hostname !== '127.0.0.1' && base.origin !== c.production.url) throw new Error('Only the selected original production site may be audited');
  const manifest = JSON.parse(await readFile(join(root,'dist/asset-manifest.json'),'utf8'));
  const failures = [], results = []; let next = 0;
  async function worker() {
    while (next < manifest.length) {
      const item = manifest[next++];
      try {
        const r = await fetch(new URL(item.path,base),{signal:AbortSignal.timeout(45000)});
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = Buffer.from(await r.arrayBuffer()), actual = digest(data);
        if (actual !== item.sha256) throw new Error(`different bytes: expected ${item.sha256}, got ${actual}`);
        results.push(item.path);
      } catch(e) { failures.push({path:item.path,error:e.message}); }
    }
  }
  await Promise.all(Array.from({length:8},worker));
  const report = {url:base.href,canonicalCommit:c.commit,canonicalTree:c.tree,expected:manifest.length,matching:results.length,failures};
  await mkdir(join(root,'test-results'),{recursive:true});
  await writeFile(join(root,'test-results/live-audit.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,failures:failures.slice(0,30)},null,2));
  if (failures.length) throw new Error(`Live game is NOT the locked canonical release: ${failures.length}/${manifest.length} mismatches. Do not claim deployed.`);
  console.log('LIVE CANON VERIFIED: all canonical files match, not merely HTTP 200');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command==='build') await build();
  else if (command==='serve') serve();
  else if (command==='audit') await audit(process.argv[3]||(await lock()).production.url);
  else throw new Error('Usage: node scripts/canon.mjs build|serve|audit [url]');
}
