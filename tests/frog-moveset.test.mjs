import test from 'node:test';
import assert from 'node:assert/strict';
import {frogFacing,frogFrame,frogHopLift,FROG_RENDER_SCALE,thornSpriteCell} from '../thorn-sprite.js';
import {ENEMY_TYPES,EnemyWorld,enemyCanStand} from '../enemies.js';

test('normal Thorn slot is renamed without changing Thorn Alpha stride',()=>{
 assert.equal(ENEMY_TYPES.thorn.name,'Moss Frog');
 assert.equal(ENEMY_TYPES.thorn.eliteName,'Thorn Alpha');
 assert.equal(ENEMY_TYPES.thorn.stride,.42);
});

test('Moss Frog visual is 30 percent smaller in game',()=>{
 assert.equal(FROG_RENDER_SCALE,.714);
 assert.equal(FROG_RENDER_SCALE/1.02,.7);
});

test('approved hit pose is death frame 2',()=>{
 const f=frogFrame({hp:10,hit:.1,walkBlend:1,walkPhase:0,__frogAttackPose:0});
 assert.deepEqual(f.rect,[.25,.25,.25,.25]);
 assert.equal(f.width,1);
});

test('tongue attack uses the separate wide attack strip',()=>{
 const f=frogFrame({hp:10,hit:0,walkBlend:0,walkPhase:0,__frogAttackPose:.1});
 assert.deepEqual(f.rect,[.25,0,.75,.25]);
 assert.equal(f.width,3);
});

test('death sequence keeps exactly five approved frames',()=>{
 const ages=[0,.096,.191,.286,.381];
 const expected=[
  [0,.25,.25,.25],
  [.25,.25,.25,.25],
  [.5,.25,.25,.25],
  [.75,.25,.25,.25],
  [0,0,.25,.25]
 ];
 for(let i=0;i<ages.length;i++){
  const f=frogFrame({hp:0,__frogCorpse:true,__frogDeathAge:ages[i],hit:0});
  assert.deepEqual(f.rect,expected[i]);
 }
});

test('frog mirrors left and right from movement yaw and keeps its side near vertical',()=>{
 const frog={yaw:Math.PI/2};
 assert.equal(frogFacing(frog),1,'world +X / screen-right keeps the authored atlas direction');
 frog.yaw=-Math.PI/2;
 assert.equal(frogFacing(frog),-1,'world -X / screen-left mirrors the atlas');
 frog.yaw=0;
 assert.equal(frogFacing(frog),-1,'near vertical movement keeps the last side instead of flickering');
 frog.yaw=Math.PI/2;
 assert.equal(frogFacing(frog),1,'turning back right restores the original atlas direction');
});

test('frog rises only during the airborne middle of a hop',()=>{
 const frog={hp:10,__frogHopActive:true,__frogAttackPose:0,__frogHopPhase:0};
 assert.equal(frogHopLift(frog),0);
 frog.__frogHopPhase=.5;
 assert.ok(frogHopLift(frog)>.25,'mid-hop must visibly lift above the ground');
 frog.__frogHopPhase=1;
 assert.equal(frogHopLift(frog),0,'landing returns to ground level');
 frog.__frogHopActive=false;
 frog.__frogHopPhase=.5;
 assert.equal(frogHopLift(frog),0,'resting frog stays planted');
});

test('normal Moss Frog moves in hop bursts with still rests between them',()=>{
 let start=null;
 for(let z=-6;z<=6&&!start;z++)for(let x=-6;x<=2;x++){
  if(enemyCanStand(x,z,.3)&&enemyCanStand(x+4,z,.3)){start=[x,z];break;}
 }
 assert.ok(start,'test map needs one open four-metre lane');
 const world=new EnemyWorld();
 world.reset('thorn',0);world.initial=false;
 const frog=world.makeEnemy('thorn',start[0],start[1]);frog.attack=999;
 world.enemies=[frog];
 const player=[start[0]+4,0,start[1]];
 const moved=[];const phases=[];
 for(let i=0;i<36;i++){
  const x=frog.x,z=frog.z;
  world.update(.05,player,1);
  moved.push(Math.hypot(frog.x-x,frog.z-z)>.0001);
  phases.push(frog.__frogHopPhase||0);
 }
 assert.ok(moved.some(Boolean),'frog must travel during a hop');
 assert.ok(moved.some((v,i)=>!v&&i>4&&moved.slice(Math.max(0,i-2),i).some(Boolean)),'frog must visibly pause after a hop');
 assert.ok(phases.some(p=>p>.35&&p<.75),'hop phase must pass through an airborne middle');
});

test('compatibility frame selector stays in the 8-frame jump range',()=>{
 for(let i=0;i<64;i++){
  const cell=thornSpriteCell(0,i/16,8);
  assert.ok(cell>=0&&cell<8);
 }
});
