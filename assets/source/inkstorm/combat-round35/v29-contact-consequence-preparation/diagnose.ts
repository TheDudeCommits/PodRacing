import { Matrix4, Quaternion, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { prepareHero, disposeSources, race, step } from '../settled-pose-diagnosis/fixture';
import { GalacticEffectsView } from '/Users/amir/Projects/PodRacing/src/render/galactic/GalacticEffectsView';
const art = await prepareHero(), sim = race(), fx = new GalacticEffectsView();
const observation = JSON.parse(readFileSync('output/playwright/round35-combat-v28/solo-chase-observations.json', 'utf8'));
const nativeEyeSamples = observation.samples.filter((s: { cueKind: string; cueAge: number; paused: boolean }) => s.cueKind === 'wreck' && !s.paused);
const rows: unknown[] = [];
try {
  for (let frame = 1; frame <= 910; frame++) step(sim, frame);
  const body = new Matrix4(), m = new Matrix4(), p = new Vector3(), q = new Quaternion(), scale = new Vector3();
  for (const age of [.075, .0833333333, .1, .13, .18]) {
    const pose = art.cache.update(sim.state.entries[0]!.vehicle, 2.15 - age, sim.terrain);
    art.breakup.update(pose, 2.15 - age, sim.terrain);
    const contact = pose.groundContact, f = contact?.footprint;
    if (!contact || !f) { rows.push({ age, contact: false }); continue; }
    fx.clearEffects(); fx.emitWreckGroundContact(0, contact.position, contact.direction, f);
    const chosen = nativeEyeSamples.reduce((a: { cueAge: number }, b: { cueAge: number }) => Math.abs(a.cueAge - .8) < Math.abs(b.cueAge - .8) ? a : b);
    const plates: unknown[] = [];
    for (const effectAge of [.05, .3, .7]) {
      fx.update(effectAge);
      for (let i = 0; i < fx.explosionPlates.count; i++) {
        fx.explosionPlates.getMatrixAt(i, m);m.decompose(p, q, scale);
        const normal = new Vector3(0, 0, 1).applyQuaternion(q), eyeDirection = new Vector3(...chosen.cameraPosition).sub(p).normalize();
        plates.push({ effectAge, position: p.toArray(), fullDimensions: [scale.x * 2, scale.y * 2], normal: normal.toArray(),
          absoluteFaceCosine: Math.abs(normal.dot(eyeDirection)), kind: fx.explosionPlates.geometry.getAttribute('aEffectSurface').getX(i),
          opacity: fx.explosionPlates.geometry.getAttribute('aEffectSurface').getY(i) });
      }
    }
    rows.push({ age, contact: true, witness: contact.position.toArray(), direction: contact.direction.toArray(), footprint: { center: f.center.toArray(), axis: f.axis.toArray(), halfLength: f.halfLength, halfWidth: f.halfWidth, edges: f.edges?.map(e => e.toArray()) },
      recordedCamera: { frame: chosen.frame, wallMs: chosen.wallMs, cueAge: chosen.cueAge, position: chosen.cameraPosition }, plates });
  }
} finally { fx.dispose(); art.breakup.reset(); disposeSources(); }
export default { scope: 'Five source poses at explicit ages on the existing frozen hero fixture, one existing source bind; no full-source sweep. Recorded V28 chase eye position provides an angle diagnostic only, not reconstructed native orientation or pixel accuracy.', rows };
