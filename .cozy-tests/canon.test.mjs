import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {treeHash} from '../scripts/canon.mjs';
test('canonical byte tree matches Git and detects changed or missing files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'frog-canon-'));
 try{
  const game=join(dir,'game');await mkdir(join(game,'assets'),{recursive:true});
  await writeFile(join(game,'index.html'),'<html>frog</html>');await writeFile(join(game,'assets','a.bin'),Buffer.from([0,1,2,255]));
  const git=args=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
  git(['init','-q']);git(['add','game']);const tree=git(['write-tree']);const line=git(['ls-tree',tree,'game']);
  const expected=line.split(/\s+/)[2];assert.equal(await treeHash(game),expected);
  await writeFile(join(game,'assets','a.bin'),Buffer.from([0,1,2,254]));assert.notEqual(await treeHash(game),expected);
  await rm(join(game,'assets','a.bin'));assert.notEqual(await treeHash(game),expected);
 }finally{await rm(dir,{recursive:true,force:true});}
});
