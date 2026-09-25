export const AUDIO_DEFAULT_VERSION='audio-default-50-v1';
const BUNDLE_OLD='r={enabled:!0,volume:.35};try{let e=JSON.parse(localStorage.getItem(`slime.audio.v1`));';
const BUNDLE_NEW='r={enabled:!0,volume:.5};try{let e=JSON.parse(localStorage.getItem(`slime.audio.v1`));';
const HTML_OLD='<label for="audio-volume">ระดับเสียง <output id="audio-level" for="audio-volume">35%</output></label><input id="audio-volume" type="range" min="0" max="100" step="1" value="35" aria-label="ระดับเสียงบรรยากาศป่า">';
const HTML_NEW='<label for="audio-volume">ระดับเสียง <output id="audio-level" for="audio-volume">50%</output></label><input id="audio-volume" type="range" min="0" max="100" step="1" value="50" aria-label="ระดับเสียงบรรยากาศป่า">';
function replaceOne(source,from,to,label){
  const count=source.split(from).length-1;
  if(count!==1)throw Error(`${label}: expected exactly one baseline, found ${count}`);
  return source.replace(from,to);
}
export function applyDefaultAudioVolume(bundle,html){
  return {
    bundle:replaceOne(bundle,BUNDLE_OLD,BUNDLE_NEW,'audio bundle default'),
    html:replaceOne(html,HTML_OLD,HTML_NEW,'audio settings default')
  };
}
