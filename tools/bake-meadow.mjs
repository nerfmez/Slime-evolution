// Rebuild this cache whenever proceduralMeadow changes. Reuses the actual GLSL.
import {execFileSync} from 'node:child_process';
import {copyFileSync} from 'node:fs';
const env={...process.env,SCENE_BAKE:'1'};
delete env.SCENE_BENCH;
execFileSync(process.execPath,['tools/export-scene.mjs'],{env,stdio:'inherit'});
execFileSync('python3',['tools/render-scene.py'],{env,stdio:'inherit'});
copyFileSync('/tmp/meadow-native.png','public/assets/meadow-pigment-cache.png');
