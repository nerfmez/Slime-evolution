import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const enemies=readFileSync('enemies.js','utf8');
const main=readFileSync('main.js','utf8');
const combat=readFileSync('fire-combat.js','utf8');
const sprites=readFileSync('stage1-animals.js','utf8');
const atlas=readFileSync('public/assets/enemies/stage1-animals.svg','utf8');
const html=readFileSync('index.html','utf8');

test('Stage 1 exposes five real-animal-derived families',()=>{
 for(const name of ['Moss Frog','Spark Hedgehog','Pond Turtle','Water Calf','Forest Panda'])assert.match(enemies,new RegExp(name));
 assert.match(enemies,/STAGE1_FAMILIES=\['thorn','moss','petal','crystal','panda'\]/);
});

test('each animal has a distinct skill identity',()=>{
 for(const skill of ['poison_tongue','chain_spark','shell_guard','water_shot','panda_roll'])assert.match(enemies,new RegExp(skill));
 assert.match(combat,/guardTime>0/);
 assert.match(combat,/panda:9/);
});

test('walk hit cast and death frames are wired to the shared atlas',()=>{
 assert.match(sprites,/if\(e\.__animalCorpse\|\|e\.hp<=0\)return 5/);
 assert.match(sprites,/if\(e\.hit>0\)return 2/);
 assert.match(sprites,/skillWindup/);
 assert.match(sprites,/return \(\(Math\.floor/);
 for(const id of ['hedge','turtle','elephant','panda'])assert.match(atlas,new RegExp(`id="${id}"`));
});

test('main renderer and test menu use the five-animal pass',()=>{
 assert.match(main,/createStageOneAnimalSprites/);
 assert.match(main,/STAGE1_SPRITE_TYPES/);
 assert.match(html,/ทดสอบครบ 5 ชนิด/);
 assert.match(html,/Water Calf · Water Shot/);
 assert.match(html,/Forest Panda · Roll/);
});
