/** Coordinate adapter for the original v100 Neurotoxin cast.
 * Current web combat stores an infection at the target; Godot's visual travels
 * from the owner in 0.16-0.28 seconds. This statically connects that visual only.
 * No mutation, damage, hitbox, poison duration or target changes are made.
 */
export function adaptNeurotoxinCast(source){
 const edits=[
  ['impactStates=new WeakMap();','impactStates=new WeakMap(),castOrigins=new WeakMap();'],
  ['function toxin(t,time){','function toxin(t,time,owner){'],
  ["else if(t.family==='toxin')toxin(t,time);","else if(t.family==='toxin')toxin(t,time,world.player);"],
  ["      toxinSignature(matrix([t.x,.36,t.z],[1.15,1.15,1.15],t.age*3.2),'infection',t.age,alpha*.76);\n      ring(matrix([t.x,.045,t.z],[1, .4,1]),.42,.48,'#8fe85e',alpha*.72);return;",
`      // v100 Neurotoxin is a travelling glob, not a lump hidden in the sprite.
      let start=castOrigins.get(t);if(!start){start=[owner?.[0]??t.x,owner?.[2]??t.z];castOrigins.set(t,start)}
      const duration=clamp(Math.hypot(t.x-start[0],t.z-start[1])/24,.16,.28),q=clamp(t.age/duration);
      const visibility=1-smooth(duration,duration+.07,t.age),size=.72*mix(.68,1.05,smooth(0,.55,q));
      toxinSignature(matrix([mix(start[0],t.x,q),mix(.30,.34,q),mix(start[1],t.z,q)],[size,size,size],t.age*3.2),'infection',t.age,visibility*.92);return;`]
 ];
 for(const [from,to]of edits){if(source.split(from).length!==2)throw Error('Neurotoxin visual adapter anchor changed');source=source.replace(from,to)}
 return source;
}
