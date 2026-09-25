export const OPENING_RANDOM_VERSION='opening-crypto-v1';
const OLD='initialCards(){let e=Object.keys(F),t=[];for(;t.length<3;){let n=e.splice(Math.floor(this.random()*e.length),1)[0];t.push(`${n}:${F[n].branches[Math.floor(this.random()*3)]}`)}return t}';
const NEW='openingRandom(){if(globalThis.crypto?.getRandomValues){let e=new Uint32Array(1);return globalThis.crypto.getRandomValues(e),e[0]/4294967296}return Math.random()}initialCards(){let e=Object.keys(F),t=[];for(;t.length<3;){let n=e.splice(Math.floor(this.openingRandom()*e.length),1)[0];t.push(`${n}:${F[n].branches[Math.floor(this.openingRandom()*3)]}`)}return t}';
export function applyOpeningRandom(source){
  const count=source.split(OLD).length-1;
  if(count!==1)throw Error(`Opening skill baseline changed: expected 1 hook, found ${count}`);
  return source.replace(OLD,NEW);
}
