/** Build-time wiring for the painted watercolour skill effects (owner request, 2026-09-25).
 * vfx/painted-renderer.mjs draws every skill, fire included, from new painted shapes. While the
 * owner reviews it, Settings > Test keeps a switch back to the old effects (Godot port + painted
 * fire images), saved per device. Presentation only: no combat value is read-modified.
 */
import {readFileSync} from 'node:fs';
export const PAINTED_VFX_VERSION = 'painted-watercolor-v2';
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

// Review shortcut (owner request, 2026-09-26): ?lab=<skill> opens the skill lab straight on that skill, repeating, with
// the target monsters hidden, so the owner can check an effect on the iPad in one tap. Presentation only: it clicks the
// same buttons a player would (Start, the first opening card, Skill test) and never changes combat values.
const LAB_LINK_SCRIPT = '<script>(()=>{const q=new URLSearchParams(location.search);if(!q.has("lab"))return;const want=q.get("lab"),t0=Date.now();' +
  'const $=id=>document.getElementById(id);const go=()=>{if(Date.now()-t0>30000)return;' +
  'const menu=$("start-menu"),play=$("start-play");if(menu&&!menu.hidden&&play){play.click();return setTimeout(go,200)}' +
  'const card=document.querySelector(".skill-card"),test=$("skill-test"),lab=$("skill-lab");if(!test)return setTimeout(go,200);' +
  'if(!lab||lab.hidden){if(card)card.click();test.click();return setTimeout(go,300)}' +
  'const pre=$("lab-preset"),tg=$("lab-targets"),rp=$("lab-repeat");' +
  'if(pre&&want&&[...pre.options].some(o=>o.value===want)&&pre.value!==want){pre.value=want;pre.dispatchEvent(new Event("change"))}' +
  'if(tg&&tg.checked){tg.checked=false;tg.dispatchEvent(new Event("change"))}if(rp&&!rp.checked){rp.checked=true;rp.dispatchEvent(new Event("change"))}};' +
  'addEventListener("load",()=>setTimeout(go,300))})()</script>';

export function applyPaintedVfx(bundle, html) {
  const renderer = read('./painted-renderer.mjs').replace('export function createPaintedSkillRenderer', 'function createPaintedSkillRenderer');
  if (/\bexport\b|\bimport\b/.test(renderer.replace(/\/\*[\s\S]*?\*\//g, ''))) throw Error('Painted renderer must be self-contained');
  let b = replaceOne(bundle, WRAPPER_HEAD, '/* PAINTED_WATERCOLOR_VFX */\n' + renderer + '\n' + WRAPPER_HEAD, 'painted renderer');
  b = replaceOne(b, QA_HOOK, QA_HOOK + 'const painted=createPaintedSkillRenderer(e);if(new URLSearchParams(globalThis.location?.search||\'\').has(\'qa\'))globalThis.__slimePaintedVfx=painted;', 'painted instance');
  b = replaceOne(b, WRAPPER_DRAW, PAINTED_DRAW, 'painted draw');
  b = replaceOne(b, FIRE_OLD, FIRE_NEW, 'old fire switch');
  // Owner request (2026-09-26): the Sunfall sun takes 1 s to fall (was .5 s), so it is clearly seen sinking. Its damage lands when it does.
  b = replaceOne(b, 'fall:.5,burst:.72,smoke:1.18', 'fall:1,burst:.72,smoke:1.18', 'Sunfall fall time');
  // Owner request (2026-09-26), water evolutions:
  // - AQUA RAILGUN is a giant ball of water flying down the line: the shot lives .8 s, the ball travels the line in the first
  //   60% of it (about 25 units/s) and each foe is hit once, when the ball reaches it (the renderer draws the ball at the same spot).
  // - PRESSURE JET cuts like a laser: each jet lasts until the next cast (cooldown + .06 s), so the stream never stops. The damage
  //   per cast is unchanged (it is split over more ticks), so damage per second stays the same.
  // - TIDAL SURGE lasts 1.1 s (was .8 s) so the wave can be seen rising, rushing and crashing; it still hits each foe once.
  b = replaceOne(b, 'length:12.2+.58*s.flow,life:.3,damage:L(o.ref*1.15)', 'length:12.2+.58*s.flow,life:.8,damage:L(o.ref*1.15)', 'railgun life');
  b = replaceOne(b, 'c>-t.radius&&c<i.length+t.radius&&l<i.r+t.radius', 'c>-t.radius&&c<(i.kind===`beam`?i.length*Math.min(1,i.age/(i.life*.6)):i.length)+t.radius&&l<i.r+t.radius', 'railgun ball reach');
  b = replaceOne(b, 'c===`burst`){let n=(.56+.05*s.burst)*o.D,', 'c===`burst`){let n=Math.max((.56+.05*s.burst)*o.D,o.cooldown+.06),', 'continuous jet');
  b = replaceOne(b, 'speed:5+.25*s.flow,life:.8,damage:L(o.ref*1.02)', 'speed:5+.25*s.flow,life:1.1,damage:L(o.ref*1.02)', 'tidal surge life');
  // Owner request (2026-09-26): the game's own burnt-grass map marks the ground under fire, so the painted effects draw no
  // crater of their own. The burn is stamped deepest at the centre and the ground shows it in stepped layers (light
  // scorch, burnt, charred), with the grass shortest where it burnt deepest; the layers shrink toward the centre as it heals.
  b = replaceOne(b, 'e[l*96+s]=Math.max(e[l*96+s],9*c*a)', 'e[l*96+s]=Math.max(e[l*96+s],9*c*a*(.42+.58*Math.max(0,1-o/(i+.25))))', 'layered burn stamp');
  b = replaceOne(b, 'Math.round(Math.max(0,1-e[i/4]/3)*255)', 'Math.round(Math.max(0,1-e[i/4]/9)*255)', 'burn depth range');
  // The grass keeps its old response: it is burnt away (height 0) wherever the burn reaches a third of full, as before the layers.
  b = replaceOne(b, 'p.y*=1.-bend.b*h*.85;p.y*=bend.a;', 'p.y*=1.-bend.b*h*.85;p.y*=clamp(1.-(1.-bend.a)*3.,0.,1.);', 'burnt grass height');
  b = replaceOne(b, '&&vBurn>.98)discard;', '&&vBurn*3.>.98)discard;', 'burnt grass removal');
  b = replaceOne(b, 'c=mix(c,vec3(.24,.20,.13),vBurn*.7);', 'c=mix(c,vec3(.24,.20,.13),min(1.,vBurn*3.)*.7);', 'burnt grass tint');
  b = replaceOne(b, 'c=mix(c,vec3(.19,.15,.115),burned*.78);', 'burned+=sin(vWorld.x*3.1+vWorld.z*1.3)*sin(vWorld.z*2.7-vWorld.x*.9)*.035;c=mix(c,vec3(.45,.38,.25),smoothstep(.02,.16,burned)*.55);c=mix(c,vec3(.27,.21,.145),smoothstep(.28,.48,burned)*.8);c=mix(c,vec3(.15,.11,.085),smoothstep(.62,.82,burned)*.9);', 'layered burnt ground');
  const h = replaceOne(replaceOne(html, '<h3>สกิลและภาพเอฟเฟกต์</h3>', '<h3>สกิลและภาพเอฟเฟกต์</h3>' + CONTROLS, 'style controls'),
    '</body></html>', STATE_SCRIPT + LAB_LINK_SCRIPT + '</body></html>', 'style state');
  return {bundle: b, html: h};
}
