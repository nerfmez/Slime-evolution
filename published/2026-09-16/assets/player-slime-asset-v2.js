// Loads the latest user-approved 3x3 directional slime atlas from GitHub text chunks,
// then starts the stability/projection shims and the game only after the atlas is ready.
const API=globalThis.__slimeDirectionalV3||globalThis.__slimeDirectionalV2;
if(!API) throw new Error('Directional slime renderer API unavailable');
const R=API.runtime, img=R.img;
R.ok=0; R.bad=0;
img.onload=null; img.onerror=null;
img.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function bounds(im){
  const c=document.createElement('canvas'),w=im.naturalWidth,h=im.naturalHeight;
  c.width=w;c.height=h;
  const x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(im,0,0);
  const d=x.getImageData(0,0,w,h).data,cw=w/3,ch=h/3,b=[];
  for(let row=0;row<3;row++){
    const line=[];
    for(let col=0;col<3;col++){
      let X=cw,Y=ch,A=0,B=0,hit=0;
      const x0=Math.floor(col*cw),y0=Math.floor(row*ch),x1=Math.ceil((col+1)*cw),y1=Math.ceil((row+1)*ch);
      for(let yy=y0;yy<y1;yy++) for(let xx=x0;xx<x1;xx++){
        if(d[(yy*w+xx)*4+3]>12){hit=1;X=Math.min(X,xx-x0);A=Math.max(A,xx-x0);Y=Math.min(Y,yy-y0);B=Math.max(B,yy-y0)}
      }
      line.push(hit?[X/cw,Y/ch,(A+1)/cw,(B+1)/ch]:[0,0,1,1]);
    }
    b.push(line);
  }
  R.asp=cw/ch;
  return b;
}

async function loadAtlas(){
  const urls=Array.from({length:6},(_,i)=>new URL(`./player-slime-directions-b64/${i}.txt?v=1`,import.meta.url));
  const parts=await Promise.all(urls.map(async u=>{
    const r=await fetch(u,{cache:'no-store'});
    if(!r.ok) throw new Error(`slime atlas chunk ${u} failed: ${r.status}`);
    return (await r.text()).trim();
  }));
  const raw=atob(parts.join(''));
  const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i);
  const url=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
  globalThis.__slimeSpriteObjectUrl=url;
  await new Promise((resolve,reject)=>{
    img.onload=()=>{
      try{R.b=bounds(img)}catch(e){console.warn('slime atlas bounds fallback',e);R.b=null;R.asp=1}
      R.ok=1;R.bad=0;resolve();
    };
    img.onerror=()=>{R.ok=0;R.bad=1;reject(new Error('latest slime atlas decode failed'))};
    img.src=url;
  });
}

try{
  await loadAtlas();
}catch(e){
  console.warn('latest slime atlas unavailable; falling back to bundled atlas',e);
  R.ok=0;R.bad=0;
  await new Promise((resolve,reject)=>{
    img.onload=()=>{try{R.b=bounds(img)}catch{}R.ok=1;R.bad=0;resolve()};
    img.onerror=()=>{R.bad=1;reject(new Error('fallback slime atlas failed'))};
    img.src=new URL('./player-slime-directions.webp?v=3',import.meta.url).href;
  });
}

await import('./player-directional-stability-v1.js?v=3');
await import('./player-directional-projection-fix-v1.js?v=1').catch(()=>{});
await import('./main-critter-v4.js');
