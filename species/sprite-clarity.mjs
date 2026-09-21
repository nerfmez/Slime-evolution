// Build-time shader refinement. Original image bytes, alpha and geometry stay intact.
export const CLARITY_GLSL=`
vec4 creatureSample(sampler2D tex,vec4 frame,vec2 uv){
 vec4 center=texture(tex,uv);
 vec2 texel=1./vec2(textureSize(tex,0));
 // Use a screen-sized neighbourhood when a large source atlas is minified.
 vec2 stepUV=max(texel,fwidth(uv)*.75);
 vec2 lo=frame.xy+texel*.5,hi=frame.xy+frame.zw-texel*.5;
 vec4 a=texture(tex,clamp(uv+vec2(stepUV.x,0.),lo,hi));
 vec4 b=texture(tex,clamp(uv-vec2(stepUV.x,0.),lo,hi));
 vec4 c=texture(tex,clamp(uv+vec2(0.,stepUV.y),lo,hi));
 vec4 d=texture(tex,clamp(uv-vec2(0.,stepUV.y),lo,hi));
 float weight=a.a+b.a+c.a+d.a;
 vec3 average=(a.rgb*a.a+b.rgb*b.a+c.rgb*c.a+d.rgb*d.a)/max(weight,.0001);
 // Alpha-weighted colour avoids dark matte fringes; retain the original silhouette.
 vec3 detail=clamp(center.rgb-average,vec3(-.08),vec3(.08));
 center.rgb=clamp(center.rgb+detail*CLARITY_AMOUNT*smoothstep(.25,.85,center.a)*step(.1,weight),0.,1.);
 return center;
}
`;
export function applySpriteClarity(source,amount=.8,coordinate='u',skipPandaDust=false){
 const sample=`texture(atlas,rect.xy+${coordinate}*rect.zw)`;
 if(source.split(sample).length!==2)throw Error('Creature clarity: expected one atlas sample');
 const marker='out vec4 color;';
 // Insert next to this sample's fragment output, never the vertex shader.
 const at=source.indexOf(sample),start=source.lastIndexOf(marker,at);
 if(start<0)throw Error('Creature clarity: missing fragment output');
 const shader=CLARITY_GLSL.replace('CLARITY_AMOUNT',skipPandaDust?`(frame.x>.74&&frame.y<.01?0.:${amount.toFixed(2)})`:amount.toFixed(2));
 return (source.slice(0,start+marker.length)+shader+source.slice(start+marker.length)).replace(sample,`creatureSample(atlas,rect,rect.xy+${coordinate}*rect.zw)`);
}
