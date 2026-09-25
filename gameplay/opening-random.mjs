export const OPENING_RANDOM_VERSION='opening-crypto-v2';
const OLD='initialCards(){let e=Object.keys(F),t=[];for(;t.length<3;){let n=e.splice(Math.floor(this.random()*e.length),1)[0];t.push(`${n}:${F[n].branches[Math.floor(this.random()*3)]}`)}return t}';
const NEW='openingRandom(){if(globalThis.crypto?.getRandomValues){let e=new Uint32Array(1);return globalThis.crypto.getRandomValues(e),e[0]/4294967296}return Math.random()}initialCards(){let e=Object.keys(F),t=[];for(;t.length<3;){let n=e.splice(Math.floor(this.openingRandom()*e.length),1)[0];t.push(`${n}:${F[n].branches[Math.floor(this.openingRandom()*3)]}`)}return t}';
// Restart re-rolls the opening cards, but reset() used to zero `revision`, so the choice
// screen (which redraws only on a revision change) kept the old, now-unclickable cards.
// Carry the revision forward instead so every restart forces a redraw.
const RESET_OLD='var Nt=class extends bt{reset(){super.reset(),this.equipped=[]';
const RESET_NEW='var Nt=class extends bt{reset(){let r=(this.revision||0)+1;super.reset(),this.revision=r,this.equipped=[]';
function replaceOne(source,from,to,label){
  const count=source.split(from).length-1;
  if(count!==1)throw Error(`${label} baseline changed: expected 1 hook, found ${count}`);
  return source.replace(from,to);
}
export function applyOpeningRandom(source){
  return replaceOne(replaceOne(source,OLD,NEW,'Opening skill'),RESET_OLD,RESET_NEW,'Opening reset revision');
}
