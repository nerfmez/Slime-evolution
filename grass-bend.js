// One compact world-space field, shared by every grass/flower vertex.
// Costs one texture lookup per vertex rather than a loop over all monsters.
export const BEND_SIZE=96;
export function createGrassBend(){
 const burn=new Float32Array(BEND_SIZE*BEND_SIZE);
 const field=new Float32Array(BEND_SIZE*BEND_SIZE*3),pixels=new Uint8Array(BEND_SIZE*BEND_SIZE*4),step=72/BEND_SIZE;
 function update(actors,dt,player=null,fire=null){
  for(let i=0;i<burn.length;i++)burn[i]=Math.max(0,burn[i]-Math.max(0,dt));
  function scorch(x,z,r,strength=1){
   const cx=(x+36)/step,cz=(z+36)/step,n=Math.ceil(r/step)+1;
   for(let j=Math.max(0,Math.floor(cz-n));j<=Math.min(BEND_SIZE-1,Math.ceil(cz+n));j++)for(let i=Math.max(0,Math.floor(cx-n));i<=Math.min(BEND_SIZE-1,Math.ceil(cx+n));i++){
    const d=Math.hypot((i+.5)*step-36-x,(j+.5)*step-36-z),edge=Math.max(0,Math.min(1,(r+.25-d)/.45));
    if(edge>0)burn[j*BEND_SIZE+i]=Math.max(burn[j*BEND_SIZE+i],9*edge*strength);
   }
  }
  if(fire){
   for(const f of fire.fx)if(['blast','meteor','sun'].includes(f.type)&&f.age<.22)scorch(f.x,f.z,f.r);
   for(const p of fire.patches)scorch(p.x,p.z,p.r);
   for(const c of fire.cyclones)scorch(c.x,c.z,c.r);
   for(const p of fire.projectiles)scorch(p.x,p.z,p.ember?.16:.30,p.ember?.18:1);
  }
  const decay=Math.exp(-Math.max(0,dt)*12);
  for(let i=0;i<field.length;i++)field[i]*=decay;
  for(const a of actors){
   if(player&&(Math.abs(a.x-player[0])>24||Math.abs(a.z-player[2])>24))continue;
   const radius=a.radius+.36,cx=(a.x+36)/step,cz=(a.z+36)/step,reach=Math.ceil(radius/step)+1;
   for(let z=Math.max(0,Math.floor(cz-reach));z<=Math.min(BEND_SIZE-1,Math.ceil(cz+reach));z++)for(let x=Math.max(0,Math.floor(cx-reach));x<=Math.min(BEND_SIZE-1,Math.ceil(cx+reach));x++){
    const dx=(x+.5)*step-36-a.x,dz=(z+.5)*step-36-a.z,d=Math.hypot(dx,dz);if(d>=radius)continue;
    let q=Math.max(0,Math.min(1,(radius-d)/(radius*.85)));q=q*q*(3-2*q)*.38;
    const i=(z*BEND_SIZE+x)*3;if(q<field[i+2])continue;
    field[i]=dx/Math.max(.08,d)*q;field[i+1]=dz/Math.max(.08,d)*q;field[i+2]=q;
   }
  }
  for(let i=0,j=0;i<field.length;i+=3,j+=4){pixels[j]=Math.round(128+field[i]*127);pixels[j+1]=Math.round(128+field[i+1]*127);pixels[j+2]=Math.round(field[i+2]*255);pixels[j+3]=Math.round(Math.max(0,1-burn[j/4]/3)*255);}
  return pixels;
 }
 update([],0);return {update,pixels,reset(){burn.fill(0);field.fill(0);update([],0);}};
}
