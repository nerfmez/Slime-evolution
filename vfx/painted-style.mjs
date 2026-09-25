/** Build-time wiring for the painted watercolour skill effects (owner request, 2026-09-25).
 * vfx/painted-renderer.mjs draws every skill, fire included, from new painted shapes. While the
 * owner reviews it, Settings > Test keeps a switch back to the old effects (Godot port + painted
 * fire images), saved per device. Presentation only: no combat value is read-modified.
 */
import {readFileSync} from 'node:fs';
export const PAINTED_VFX_VERSION = 'painted-watercolor-v1';
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');

function replaceOne(source, from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw Error(`${label}: expected exactly one baseline, found ${count}`);
  return source.replace(from, () => to);
}

const STYLE_ON = '(globalThis.__slimeVfxStyle||{on:!0}).on!==!1';
// The restored elemental wrapper (vfx/restore-godot-style.mjs) hosts the new renderer.
const WRAPPER_HEAD = 'function mn(e){\n    const restored=createGodotSkillVfxRenderer(e,';
const QA_HOOK = "if(new URLSearchParams(globalThis.location?.search||'').has('qa'))globalThis.__slimeGodotVfx=restored;";
const WRAPPER_DRAW = 'const extra=restored.draw(a,{...o,player:W.player},s,c,l),u=pn(a,o,c,l);';
// Fire timing comes from the live fire settings, so the new visuals follow the same beats as the damage.
const PAINTED_DRAW = `const wcOn=${STYLE_ON},extra=wcOn?painted.draw(a,{...o,player:W.player},s,c,l,{hideEnemies:Z.active&&!Z.lab.showTargets,blast:Je(j),sunBurst:A.burst,sunSmoke:A.smoke,meteorImpact:k.meteor.impact,cycloneRise:k.cyclone.rise,cycloneFade:k.cyclone.fade}):restored.draw(a,{...o,player:W.player},s,c,l),` +
  'u=pn(a,wcOn?{...o,enemies:(o.enemies||[]).map(e=>e.hp>0&&(e.chill>0||e.frozen>0||e.poisonTime>0)?{...e,chill:0,frozen:0,poisonTime:0}:e)}:o,c,l);';
// The old painted fire renderer only draws when the old style is selected.
const FIRE_OLD = 'let n=Vr.draw(Y,X,W.time,W.camera===`side`?[0,4,18]:W.camera===`top`?[0,21,.1]:[0,12,15],dr,Z.active&&!Z.lab.showTargets?[]:J.enemies,Z.active);';
const FIRE_NEW = `let n=${STYLE_ON}?{calls:0,triangles:0}:Vr.draw(Y,X,W.time,W.camera===\`side\`?[0,4,18]:W.camera===\`top\`?[0,21,.1]:[0,12,15],dr,Z.active&&!Z.lab.showTargets?[]:J.enemies,Z.active);`;

const CONTROLS = '<details id="vfx-style-tools" open><summary>เอฟเฟกต์สกิลแบบใหม่ (รอตรวจ)</summary>' +
  '<label class="check"><input id="vfx-style-on" type="checkbox" checked>สีน้ำวาดมือแบบใหม่ (ปิด = เอฟเฟกต์เดิม)</label>' +
  '<p class="settings-note">บันทึกในเครื่องนี้ · กดปุ่ม “ทดสอบสกิล” เพื่อดูทุกสกิล</p></details>';
// Runs before the game module, so the renderer reads the saved choice on its first frame.
const STATE_SCRIPT = '<script>(()=>{const K="slime.vfxStyle.v2";let s={on:!0};' +
  'try{const v=JSON.parse(localStorage.getItem(K));if(v&&typeof v.on==="boolean")s={on:v.on}}catch{}' +
  'globalThis.__slimeVfxStyle=s;const box=document.getElementById("vfx-style-on");if(!box)return;box.checked=s.on;' +
  'box.onchange=()=>{s.on=box.checked;try{localStorage.setItem(K,JSON.stringify(s))}catch{}}})()</script>';

export function applyPaintedVfx(bundle, html) {
  const renderer = read('./painted-renderer.mjs').replace('export function createPaintedSkillRenderer', 'function createPaintedSkillRenderer');
  if (/\bexport\b|\bimport\b/.test(renderer.replace(/\/\*[\s\S]*?\*\//g, ''))) throw Error('Painted renderer must be self-contained');
  let b = replaceOne(bundle, WRAPPER_HEAD, '/* PAINTED_WATERCOLOR_VFX */\n' + renderer + '\n' + WRAPPER_HEAD, 'painted renderer');
  b = replaceOne(b, QA_HOOK, QA_HOOK + 'const painted=createPaintedSkillRenderer(e);if(new URLSearchParams(globalThis.location?.search||\'\').has(\'qa\'))globalThis.__slimePaintedVfx=painted;', 'painted instance');
  b = replaceOne(b, WRAPPER_DRAW, PAINTED_DRAW, 'painted draw');
  b = replaceOne(b, FIRE_OLD, FIRE_NEW, 'old fire switch');
  const h = replaceOne(replaceOne(html, '<h3>สกิลและภาพเอฟเฟกต์</h3>', '<h3>สกิลและภาพเอฟเฟกต์</h3>' + CONTROLS, 'style controls'),
    '</body></html>', STATE_SCRIPT + '</body></html>', 'style state');
  return {bundle: b, html: h};
}
