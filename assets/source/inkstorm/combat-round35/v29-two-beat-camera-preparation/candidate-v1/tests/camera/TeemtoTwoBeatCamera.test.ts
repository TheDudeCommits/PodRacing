import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CinematicCamera, type CameraSubject } from '../../src/camera/CinematicCamera';
import { WRECK_PRESENTATION_DURATION, type WreckVisualPose } from '../../src/render/combat/WreckVisualPose';
import { fixture, matrices, race, step, variants } from '../fixtures/teemtoActualCamera';

function heading(rig: CinematicCamera) {
  const back = new Vector3(0, 0, 1).applyQuaternion(rig.camera.quaternion);
  return Math.atan2(back.x, back.z);
}
function angleDelta(a: number, b: number) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
function framingSubject(): CameraSubject {
  const full = [], impact = [];
  for (const x of [-8, 8]) for (const y of [0, 5]) for (const z of [-10, 18]) full.push(new Vector3(x, y, z));
  for (const x of [0, 8]) for (const y of [0, 5]) for (const z of [2, 18]) impact.push(new Vector3(x, y, z));
  return { position: new Vector3(), forward: new Vector3(0, 0, 1), velocity: new Vector3(), speed: 0,
    combatFocus: new Vector3(0, 2.5, 4), combatForward: new Vector3(0, 0, 1), combatBounds: full,
    combatImpactPosition: new Vector3(4, 2, 7), combatTerrain: { heightAt: () => -100 },
    combatImpactFraming: { center: new Box3().setFromPoints(impact).getCenter(new Vector3()), bounds: impact, ageSeconds: 0 } };
}
function shot(reducedMotion = false) {
  const rig = new CinematicCamera(); rig.setMode('side'); rig.setCombatFraming(true);
  rig.setComfortSettings({ reducedMotion }); return rig;
}
function state(rig: CinematicCamera) { return [...rig.camera.position.toArray(), ...rig.camera.quaternion.toArray(), rig.camera.fov]; }

describe('event-relative two-beat authored camera', () => {
  it('arcs once by 14 degrees, independently of frame history, and keeps the terminal direction through intact recovery', () => {
    const subject = framingSubject(), rig = shot(), direct = shot();
    const ages = [0, .1, .18, .3, .45, .65, .8, 1.3];
    const headings: number[] = [];
    try {
      for (const age of ages) {
        subject.combatImpactFraming = { ...subject.combatImpactFraming!, ageSeconds: age };
        rig.snap(subject); headings.push(heading(rig));
        // A fresh shot entered at the same event age gets the same bounded azimuth.
        direct.setCombatFraming(false); direct.setCombatFraming(true); direct.snap(subject);
        expect(state(direct)).toEqual(state(rig));
      }
      const total = angleDelta(headings.at(-1)!, headings[0]!);
      expect(Math.abs(total) * 180 / Math.PI).toBeCloseTo(14, 8);
      for (let i = 1; i < headings.length; i++) expect(angleDelta(headings[i]!, headings[i - 1]!) * Math.sign(total)).toBeGreaterThanOrEqual(-1e-12);
      expect(headings[0]).toBe(headings[1]);
      // A backwards snapshot seek is evaluated from age, not accumulated camera time.
      subject.combatImpactFraming = { ...subject.combatImpactFraming!, ageSeconds: .3 };
      rig.snap(subject); expect(heading(rig)).toBeCloseTo(headings[3]!, 10);
      const terminal = headings.at(-1)!;
      rig.setMode('chase'); rig.setCombatFraming(false);
      rig.snap({ ...subject, wreckChase: true, wreckRecovery: true, combatImpactFraming: undefined });
      expect(angleDelta(heading(rig), terminal)).toBeCloseTo(0, 10);
      // Final recovery does not leave an orbit in ordinary or manual/replay cameras.
      const ordinary = new CinematicCamera();
      try { for (const mode of ['chase', 'cockpit', 'hero', 'side'] as const) {
        rig.setMode(mode); ordinary.setMode(mode); rig.snap(subject); ordinary.snap(subject);
        expect(state(rig)).toEqual(state(ordinary));
      } } finally { ordinary.dispose(); }
    } finally { rig.dispose(); direct.dispose(); }
  });

  it('does not orbit for reduced motion, absent or non-finite age, or inactive/manual framing', () => {
    for (const reduced of [false, true]) {
      const subject = framingSubject(), a = shot(reduced), b = shot(reduced);
      try {
        const base = { center: subject.combatImpactFraming!.center, bounds: subject.combatImpactFraming!.bounds };
        for (const age of reduced ? [0, .3, 1.3] : [undefined, NaN, Infinity]) {
          a.snap({ ...subject, combatImpactFraming: { ...base, ageSeconds: age } });
          b.snap({ ...subject, combatImpactFraming: base });
          expect(state(a)).toEqual(state(b));
        }
        for (const mode of ['cockpit', 'hero'] as const) {
          a.setMode(mode); b.setMode(mode);
          a.snap({ ...subject, combatImpactFraming: { ...base, ageSeconds: 1.3 } });
          b.snap({ ...subject, combatImpactFraming: undefined }); expect(state(a)).toEqual(state(b));
        }
      } finally { a.dispose(); b.dispose(); }
    }
  });

  it.each(variants)('%s reuses its composition storage, admits the intact engine only during the second beat, and resets exactly', variant => {
    const art = fixture(variant), sim = race(), rest = matrices(art);
    for (let frame = 1; frame <= 910; frame++) step(sim, frame);
    const entry = sim.state.entries[0]!, before = JSON.stringify(sim.state);
    const at = (age: number, extrapolation = 0): WreckVisualPose => {
      const remaining = WRECK_PRESENTATION_DURATION - age;
      const pose = art.cache.update(entry.vehicle, remaining, sim.terrain, extrapolation);
      art.breakup.update(pose, remaining, sim.terrain, extrapolation); return pose;
    };
    try {
      expect(at(0).impactFraming).toBeUndefined();
      const first = at(.1).impactFraming!, bounds = first.bounds, refs = [...bounds], center = first.center;
      const allBounds = at(.1).bounds;
      for (const age of [.15, .65, .8, .95, 1.3, .2]) {
        const pose = at(age), frame = pose.impactFraming!;
        expect(frame.bounds).toBe(bounds); expect(frame.center).toBe(center);
        expect(frame.bounds.every((point, i) => point === refs[i])).toBe(true);
        expect(pose.bounds).toBe(allBounds); expect(frame.ageSeconds).toBeCloseTo(age, 12);
        const earlyBox = new Box3().setFromPoints(frame.bounds.slice(0, 18));
        const earlyCenter = earlyBox.getCenter(new Vector3());
        if (age <= .65) for (let i = 18; i < 26; i++) expect(frame.bounds[i]!.distanceTo(earlyCenter)).toBeLessThan(1e-10);
        if (age >= .95) for (let i = 0; i < 8; i++) expect(frame.bounds[18 + i]!.distanceTo(pose.bounds[8 + i]!)).toBeLessThan(1e-10);
        // Every omitted/composition-only corner still protects the physical lens.
        expect(pose.bounds).toHaveLength(variant === 'hero' ? 40 : 32);
      }
      expect(at(.4, .007).impactFraming!.ageSeconds).toBeCloseTo(.407, 12);
      expect(at(0).impactFraming).toBeUndefined(); expect(art.breakup.damageVariantActive).toBe(false);
      expect(matrices(art)).toEqual(rest); expect(JSON.stringify(sim.state)).toBe(before);
    } finally { art.breakup.reset(); }
  });
});
