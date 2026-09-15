import {cpSync,existsSync} from 'node:fs';

const copyRuntimeAssets={
 name:'copy-runtime-assets',
 closeBundle(){
  if(existsSync('assets'))cpSync('assets','dist/assets',{recursive:true});
 }
};

export default {base:'./',plugins:[copyRuntimeAssets],server:{host:'0.0.0.0',allowedHosts:['terminal.local']},build:{target:'es2020',rollupOptions:{input:{main:'index.html',motion:'slime-motion.html'}}}};
