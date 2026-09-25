export const AUDIO_DEFAULT_VERSION='audio-default-50-boost3-v2';
const BUNDLE_OLD='r={enabled:!0,volume:.35};try{let e=JSON.parse(localStorage.getItem(`slime.audio.v1`));';
const BUNDLE_NEW='r={enabled:!0,volume:.5};try{let e=JSON.parse(localStorage.getItem(`slime.audio.v1`));';
const HTML_OLD='<label for="audio-volume">ระดับเสียง <output id="audio-level" for="audio-volume">35%</output></label><input id="audio-volume" type="range" min="0" max="100" step="1" value="35" aria-label="ระดับเสียงบรรยากาศป่า">';
const HTML_NEW='<label for="audio-volume">ระดับเสียง <output id="audio-level" for="audio-volume">50%</output></label><input id="audio-volume" type="range" min="0" max="100" step="1" value="50" aria-label="ระดับเสียงบรรยากาศป่า">';
const GAIN_OLD='function v(e,t=.35){if(!a)return;let n=i.currentTime;a.gain.cancelScheduledValues(n),a.gain.setValueAtTime(a.gain.value,n),a.gain.linearRampToValueAtTime(e,n+t)}';
const GAIN_NEW='function v(e,t=.35){if(!a)return;let n=i.currentTime,r=e*3;a.gain.cancelScheduledValues(n),a.gain.setValueAtTime(a.gain.value,n),a.gain.linearRampToValueAtTime(r,n+t)}';
const OUTPUT_OLD='i=new e,a=i.createGain(),a.gain.value=0,a.connect(i.destination),i.onstatechange=_';
const OUTPUT_NEW='i=new e,a=i.createGain(),a.gain.value=0,(()=>{let e=i.createDynamicsCompressor();e.threshold.value=-10,e.knee.value=12,e.ratio.value=5,e.attack.value=.003,e.release.value=.18,a.connect(e),e.connect(i.destination)})(),i.onstatechange=_';
function replaceOne(source,from,to,label){
  const count=source.split(from).length-1;
  if(count!==1)throw Error(`${label}: expected exactly one baseline, found ${count}`);
  return source.replace(from,to);
}
export function applyDefaultAudioVolume(bundle,html){
  return {
    bundle:replaceOne(replaceOne(replaceOne(bundle,BUNDLE_OLD,BUNDLE_NEW,'audio bundle default'),GAIN_OLD,GAIN_NEW,'audio master gain'),OUTPUT_OLD,OUTPUT_NEW,'audio peak limiter'),
    html:replaceOne(html,HTML_OLD,HTML_NEW,'audio settings default')
  };
}
