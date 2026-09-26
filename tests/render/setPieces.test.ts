import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { INKSTORM_HERO_SEED } from '../../src/game/mastery/events';
import { RACING_BIOME_SEEDS } from '../../src/game/race/racingBiomes';
import { FLAT_HEIGHT_SAMPLER } from '../../src/game/simulation/podracer';
import { planVerdantTrees } from '../../src/render/inkstorm/VerdantCanopy';
import { createColossusRibcage } from '../../src/render/setpieces/ColossusRibcage';
import { StartCeremony } from '../../src/render/setpieces/StartCeremony';

const flat = () => 0;

describe('Colossus ribcage', () => {
  const course = createProceduralPodraceCourse(FLAT_HEIGHT_SAMPLER, INKSTORM_HERO_SEED);
  const points = course.getRenderData(1536).points;

  it('places nine ribs deterministically on an early straight, clear of the grid', () => {
    const a = createColossusRibcage(points, flat), b = createColossusRibcage(points, flat);
    expect(a.receipt).toEqual(b.receipt);
    expect(a.receipt).toMatchObject({ placed: true, ribs: 9, reason: 'ok' });
    expect(a.receipt.startProgress).toBeGreaterThan(.04);
    expect(a.receipt.endProgress).toBeLessThan(.5);
    expect(a.receipt.triangles).toBeLessThan(40_000);
    a.mesh?.geometry.dispose(); b.mesh?.geometry.dispose();
  });

  it('never puts bone inside the racing envelope below 24 m', () => {
    const { mesh } = createColossusRibcage(points, flat);
    const position = mesh!.geometry.getAttribute('position');
    let checked = 0;
    for (let i = 0; i < position.count; i += 3) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      const projection = course.projectPoint(x, z);
      if (projection.distanceToCenter > projection.width + 4) continue;
      checked++;
      expect(y, `vertex ${i} over the track`).toBeGreaterThan(24);
    }
    expect(checked).toBeGreaterThan(100);
    mesh!.geometry.dispose();
  });

  it('declines a course with no open straight instead of forcing a placement', () => {
    const { mesh, receipt } = createColossusRibcage(points.slice(0, 8), flat);
    expect(mesh).toBeNull();
    expect(receipt.placed).toBe(false);
  });
});

describe('start ceremony', () => {
  const camera = new PerspectiveCamera();
  const at = (ceremony: StartCeremony, phase: 'countdown' | 'racing', countdownRemaining: number, raceTime = 0, awaiting = false) => {
    ceremony.update({ phase, awaiting, countdownRemaining, raceTime }, 1 / 60, camera, 1);
    return { ...ceremony.receipt };
  };

  it('counts two, four and five red lamps, then turns all green on GO', () => {
    const ceremony = new StartCeremony();
    ceremony.setGantry({ x: 0, y: 0, z: 100, yaw: 0 });
    expect(at(ceremony, 'countdown', 3, 0, true)).toMatchObject({ lampsLit: 0, green: false });
    expect(at(ceremony, 'countdown', 2.6)).toMatchObject({ lampsLit: 2, green: false });
    expect(at(ceremony, 'countdown', 1.6)).toMatchObject({ lampsLit: 4, green: false });
    expect(at(ceremony, 'countdown', .4)).toMatchObject({ lampsLit: 5, green: false });
    const go = at(ceremony, 'racing', 0, .02);
    expect(go).toMatchObject({ lampsLit: 0, green: true });
    expect(go.sparks).toBeGreaterThan(100);
    ceremony.dispose();
  });

  it('lets every spark burn out and re-arms for a restarted race', () => {
    const ceremony = new StartCeremony();
    ceremony.setGantry({ x: 0, y: 0, z: 100, yaw: 0 });
    at(ceremony, 'countdown', .5);
    at(ceremony, 'racing', 0, .01);
    for (let t = 0; t < 6; t += 1 / 60) at(ceremony, 'racing', 0, t);
    expect(ceremony.receipt).toMatchObject({ sparks: 0, green: false });
    at(ceremony, 'countdown', 2.5);
    expect(ceremony.receipt.lampsLit).toBe(2);
    ceremony.dispose();
  });

  it('paints one draped slot per racer', () => {
    const ceremony = new StartCeremony();
    const slots = Array.from({ length: 8 }, (_, i) => ({ x: (i % 2) * 18 - 9, z: -Math.floor(i / 2) * 30, yaw: 0 }));
    ceremony.setGrid(slots, (x, z) => x * .01 + z * .02);
    expect(ceremony.receipt.slots).toBe(8);
    const grid = ceremony.group.getObjectByName('Start grid boxes') as import('three').Mesh;
    const position = grid.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      expect(position.getY(i)).toBeCloseTo(position.getX(i) * .01 + position.getZ(i) * .02 + .55, 4);
    }
    ceremony.dispose();
  });
});

describe('Verdant canopy', () => {
  it('roots every trunk outside the racing envelope, with hero giants leaning over it', () => {
    const course = createProceduralPodraceCourse(FLAT_HEIGHT_SAMPLER, RACING_BIOME_SEEDS.jungle);
    const trees = planVerdantTrees(course, flat, []);
    expect(trees.length).toBeGreaterThan(60);
    const start = course.sampleAtProgress(0);
    for (const tree of trees) {
      const projection = course.projectPoint(tree.base.x, tree.base.z);
      expect(projection.distanceToCenter).toBeGreaterThan(projection.width + 17);
      expect(Math.hypot(tree.base.x - start.x, tree.base.z - start.z)).toBeGreaterThan(250);
      // The lean points back across the track.
      const toCentre = { x: projection.x - tree.base.x, z: projection.z - tree.base.z };
      expect(tree.lean.x * toCentre.x + tree.lean.z * toCentre.z).toBeGreaterThan(0);
    }
    expect(planVerdantTrees(course, flat, [])).toEqual(trees);
  });
});
