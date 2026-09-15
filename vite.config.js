import {cpSync,existsSync} from 'node:fs';

const copyRuntimeAssets={
 name:'copy-runtime-assets',
 closeBundle(){
  const baseline='published/2026-09-14/assets';
  if(existsSync(baseline))cpSync(baseline,'dist/assets',{recursive:true});
  if(existsSync('assets'))cpSync('assets','dist/assets',{recursive:true});
 }
};

export default {base:'./',plugins:[copyRuntimeAssets],server:{host:'0.0.0.0',allowedHosts:['terminal.local']},build:{target:'es2020',rollupOptions:{input:{main:'index.html',motion:'slime-motion.html'}}}};
