import { Euler, Group, InstancedMesh, Matrix4, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { GalacticEvent } from '../../src/game/galactic/types';
import { GameApp } from '../../src/render/app/GameApp';
import {
  GALACTIC_EFFECT_DRAW_CALL_BUDGET, GalacticEffectsView,
  type CrashEffectEvent, type GalacticPoint,
} from '../../src/render/galactic/GalacticEffectsView';
import { WreckGroundContactGate } from '../../src/render/combat/WreckGroundContact';

const origin = Object.freeze({ x: 104.025, y: 10, z: 15.2 });
const event: CrashEffectEvent = Object.freeze({ type: 'crash', time: 4, position: origin,
  velocity: Object.freeze({ x: 0, y: 0, z: 0 }), groundY: 9.9, severity: 2, style: 'redline',
  direction: Object.freeze({ x: -1, y: 0, z: 0 }) });

function centers(mesh: InstancedMesh): Vector3[] {
  const matrix = new Matrix4();
  return Array.from({ length: mesh.count }, (_, index) => {
    mesh.getMatrixAt(index, matrix);
    return new Vector3().setFromMatrixPosition(matrix);
  });
}

function visibleState(view: GalacticEffectsView) {
  return view.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh).map(mesh => ({
    count: mesh.count,
    matrices: Array.from(mesh.instanceMatrix.array.slice(0, mesh.count * 16)),
    colors: Array.from(mesh.instanceColor?.array.slice(0, mesh.count * 3) ?? []),
    effectSurface: Array.from(mesh.geometry.getAttribute('aEffectSurface')?.array.slice(0, mesh.count * 3) ?? []),
    fragmentMetal: Array.from(mesh.geometry.getAttribute('aFragmentMetal')?.array.slice(0, mesh.count) ?? []),
  }));
}

describe('authored rupture surface contract', () => {
  it('keeps the first flash on the exact authored cut at birth instead of projecting it above terrain', () => {
    const effects = new GalacticEffectsView();
    try {
      const surfaceNormal = Object.freeze({ x: 1, y: 0, z: 0 });
      const authored = Object.freeze({ ...event, surfaceNormal });
      const before = JSON.stringify(authored);
      effects.emitCrash(authored); effects.update(event.time);
      expect(effects.explosionPlates.count).toBe(1);
      expect(centers(effects.explosionPlates)[0]!.distanceTo(new Vector3().copy(origin))).toBeLessThan(.00001);
      expect(JSON.stringify(authored)).toBe(before);
    } finally { effects.dispose(); }
  });

  it.each([
    [1, 0, 0], [0, 1, 0], [0, -1, 0], [.4, .3, -.8660254037844386],
  ])('opens and ejects fragments into the outward half-space for normal (%s,%s,%s)', (x, y, z) => {
    const effects = new GalacticEffectsView(), normal = new Vector3(x, y, z).normalize();
    try {
      effects.emitCrash({ ...event, groundY: -20, surfaceNormal: normal });
      effects.update(event.time);
      const born = centers(effects.crashDebris);
      expect(born.length).toBeGreaterThan(0);
      for (const position of born) {
        expect(position.clone().sub(origin).dot(normal)).toBeGreaterThan(.01);
      }
      effects.update(event.time + .02);
      const moved = centers(effects.crashDebris);
      expect(moved).toHaveLength(born.length);
      for (let index = 0; index < moved.length; index++) {
        expect(moved[index]!.clone().sub(born[index]!).dot(normal)).toBeGreaterThan(.01);
      }
    } finally { effects.dispose(); }
  });

  it.each<GalacticPoint>([
    { x: 0, y: 0, z: 0 }, { x: NaN, y: 0, z: 1 }, { x: 1, y: Infinity, z: 0 },
  ])('falls back exactly to the generic rupture for an unusable surface normal %j', surfaceNormal => {
    const fallback = new GalacticEffectsView(), invalid = new GalacticEffectsView();
    try {
      fallback.emitCrash(event); invalid.emitCrash({ ...event, surfaceNormal });
      for (const age of [0, .08, .3, 1]) {
        fallback.update(event.time + age); invalid.update(event.time + age);
        expect(visibleState(invalid)).toEqual(visibleState(fallback));
      }
      fallback.clearEffects(); fallback.emitCrash(event); fallback.update(event.time);
      expect(centers(fallback.explosionPlates)[0]!.y).toBeCloseTo(event.groundY! + 4.648, 5);
    } finally { fallback.dispose(); invalid.dispose(); }
  });

  it('treats the authored normal as an orientation rather than a burst-strength multiplier', () => {
    const unit = new GalacticEffectsView(), scaled = new GalacticEffectsView();
    try {
      unit.emitCrash({ ...event, surfaceNormal: { x: .8, y: .6, z: 0 } });
      scaled.emitCrash({ ...event, surfaceNormal: { x: 8, y: 6, z: 0 } });
      for (const age of [0, .02, .1]) {
        unit.update(event.time + age); scaled.update(event.time + age);
        expect(visibleState(scaled)).toEqual(visibleState(unit));
      }
    } finally { unit.dispose(); scaled.dispose(); }
  });

  it('does not alter the existing energy hit, EMP mine or shield pools when a surface normal is supplied', () => {
    const generic = new GalacticEffectsView(), marked = new GalacticEffectsView();
    try {
      for (const view of [generic, marked]) {
        view.setShields([{ position: origin, radius: 4, mode: 'shield', intensity: .8 }]);
        view.setScrapMines([{ position: origin, variant: 'emp', armed: true }]);
      }
      generic.emitCrash({ ...event, style: 'energy' });
      marked.emitCrash({ ...event, style: 'energy', surfaceNormal: { x: 0, y: -1, z: 0 } });
      for (const age of [0, .14, .4]) {
        generic.update(event.time + age); marked.update(event.time + age);
        expect(visibleState(marked)).toEqual(visibleState(generic));
        expect(marked.shieldShells.count).toBe(1);
        expect(marked.scrapMines.count).toBe(1);
      }
    } finally { generic.dispose(); marked.dispose(); }
  });

  it('reuses the fixed resources through burst-ring wrap, contact, reset and reuse', () => {
    const effects = new GalacticEffectsView();
    const meshes = effects.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh);
    const resources = meshes.map(mesh => ({ mesh, geometry: mesh.geometry, material: mesh.material,
      matrix: mesh.instanceMatrix, color: mesh.instanceColor,
      attributes: Object.entries(mesh.geometry.attributes) }));
    try {
      expect(meshes).toHaveLength(GALACTIC_EFFECT_DRAW_CALL_BUDGET);
      for (let index = 0; index < 80; index++) {
        const time = event.time + index * .02;
        effects.emitCrash({ ...event, time, surfaceNormal: { x: 1, y: 0, z: 0 } });
        effects.emitWreckGroundContact(time, origin, { x: 0, y: 0, z: 1 });
        effects.update(time + .01);
        for (const resource of resources) expect(resource.mesh.count).toBeLessThanOrEqual(resource.matrix.count);
      }
      effects.clearEffects(); effects.update(100);
      expect(meshes.every(mesh => mesh.count === 0)).toBe(true);
      effects.emitCrash({ ...event, time: 101, surfaceNormal: { x: 1, y: 0, z: 0 } });
      effects.update(101);
      expect(effects.explosionPlates.count).toBe(1);
      expect(effects.children).toHaveLength(resources.length);
      for (const resource of resources) {
        expect(effects.children).toContain(resource.mesh);
        expect(resource.mesh.geometry).toBe(resource.geometry); expect(resource.mesh.material).toBe(resource.material);
        expect(resource.mesh.instanceMatrix).toBe(resource.matrix); expect(resource.mesh.instanceColor).toBe(resource.color);
        for (const [name, attribute] of resource.attributes) expect(resource.mesh.geometry.getAttribute(name)).toBe(attribute);
      }
    } finally { effects.dispose(); }
  });
});

const consume = (GameApp.prototype as unknown as {
  consumeGalacticEffects(events: readonly GalacticEvent[], time: number, authoritativeFrames?: readonly number[]): void;
}).consumeGalacticEffects;

describe('authored rupture event routing', () => {
  it('uses the world cut witness at birth without requiring an exhaust anchor or applying the body transform twice', () => {
    const view = new Group(); view.position.set(-400, -30, 900); view.rotation.set(.2, -1, .1, 'YXZ');
    const getAttachment = vi.fn(() => undefined), transformWreckAttachment = vi.fn();
    Object.assign(view, { importedActive: true, imported: { getAttachment, transformWreckAttachment } });
    const vehicle = Object.freeze({ position: Object.freeze({ x: 100, y: 8, z: -25 }),
      velocity: Object.freeze({ x: 12, y: 8.5, z: 3 }),
      orientation: Object.freeze({ yaw: .4, pitch: .1, roll: .02, bank: -.03 }) });
    const rupture = { position: new Vector3().copy(origin), direction: new Vector3(.8, .6, 0) };
    const wreckPose = { position: new Vector3(100, 12, -25), rotation: new Euler(.12, .55, -.3, 'YXZ'),
      rupture, groundContact: { position: new Vector3(999, -20, 999), direction: new Vector3(0, 0, 1) } };
    const entry = { id: 'player', vehicle, galactic: { wreck: { phase: 'wrecked', crashCount: 1, timer: 2.15 } } };
    const emitCrash = vi.fn<(event: CrashEffectEvent) => void>(), heightAt = vi.fn(() => 9.9);
    const resolveWreckVisualPose = vi.fn(() => wreckPose);
    const app = { race: { state: { entries: [entry] }, terrain: { heightAt } }, simulationFrame: 912,
      wreckGroundContacts: new WreckGroundContactGate(), wreckRuptureDirection: new Vector3(), wreckRuptureOrigin: new Vector3(),
      racerViews: [view], galacticEffects: { emitCrash }, localRacerId: () => 'player', resolveWreckVisualPose };
    const before = JSON.stringify({ vehicle, wreckPose });
    consume.call(app, [
      { type: 'redline-explosion', racerId: 'player', heat: 1 },
      { type: 'wreck', racerId: 'player', cause: 'redline-explosion', sourceId: null, takedownBy: null, runTokens: 2 },
    ], event.time, [912, 912]);
    expect(emitCrash).toHaveBeenCalledOnce(); expect(resolveWreckVisualPose).toHaveBeenCalledWith(entry);
    const emitted = emitCrash.mock.calls[0]![0];
    expect(new Vector3().copy(emitted.position).distanceTo(rupture.position)).toBeLessThan(1e-10);
    expect(new Vector3().copy(emitted.surfaceNormal!).distanceTo(rupture.direction)).toBeLessThan(1e-10);
    expect(emitted.direction).toEqual(rupture.direction);
    expect(heightAt).toHaveBeenCalledWith(rupture.position.x, rupture.position.z);
    expect(transformWreckAttachment).not.toHaveBeenCalled();
    expect(JSON.stringify({ vehicle, wreckPose })).toBe(before);
    expect(view.position.toArray()).toEqual([-400, -30, 900]);
  });
});
