import fs from 'node:fs';
import {slimeWalkGeometry} from '../slime-walk.js';
import {readClip,sampleKeys} from '../slime-keyframes.js';
const data=JSON.parse(fs.readFileSync('public/assets/slime/approved-motion.json')),clip=readClip(data);
const frames=Array.from({length:16},(_,i)=>slimeWalkGeometry(data.baseMotion?i/16:0,56,36,{...clip.baseSettings,regions:sampleKeys(clip.keys,i/16,clip.smooth).regions}));
fs.writeFileSync('/tmp/slime-motion-geometry.json',JSON.stringify(frames));
