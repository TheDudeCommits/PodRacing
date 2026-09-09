import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Matrix4, Mesh, Vector3 } from 'three';
import { createProceduralPodraceCourse, type PodraceCourse } from '../../src/game/race/course';
import { getInkstormLayout, type InkstormPlacement } from '../../src/game/race/inkstormLayout';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { buildFoundationContactBank, createInkstormFoundationContactPlan, type FoundationContactPlan } from '../../src/render/inkstorm/InkstormFoundationContact';
import { createInkstormFoundations } from '../../src/render/inkstorm/InkstormFoundations';
import { createInkstormFoundry } from '../../src/render/inkstorm/InkstormFoundry';

vi.mock('three/addons/utils/BufferGeometryUtils.js', async importOriginal => {
  const actual = await importOriginal<typeof import('three/addons/utils/BufferGeometryUtils.js')>();
  return { ...actual, mergeGeometries: (...args: Parameters<typeof actual.mergeGeometries>) => {
    if (args[0].some(g => g.userData.throwContactMerge)) throw new Error('Injected contact merge failure');
    return actual.mergeGeometries(...args);
  } };
});
const placement: InkstormPlacement = { id: 'bank', family: 'pipe-bank', x: 1024, z: -731, yaw: .74, sx: .91, sy: 1, sz: 1.17, progress: .5 };
const flatPlacement = { ...placement, x: 0, z: 0, yaw: 0, sx: 1, sz: 1 };
const ground = (x: number, z: number) => .004 * x + Math.sin(z * .07) * .25;
function release(mesh: Mesh): void { mesh.geometry.dispose(); for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose(); }
function contact(geometry: BufferGeometry): FoundationContactPlan { return { geometry, replacedIds: new Set(['bank']), banks: [], rejected: [] }; }
function makeGeometry(): BufferGeometry {
  const bank = buildFoundationContactBank(placement, ground, 8);
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(bank.positions, 3))
    .setAttribute('normal', new Float32BufferAttribute(bank.normals, 3)).setAttribute('color', new Float32BufferAttribute(bank.colors, 3));
}

describe('bounded Foundry foundation contact geometry', () => {
  afterEach(() => vi.restoreAllMocks());
  it.each([0, .74, -2.1])('is a closed outward surface inside the old packed footprint at yaw %s', yaw => {
    const p = { ...placement, yaw }, bank = buildFoundationContactBank(p, ground, 8), edges = new Map<string, number[]>(), vertices = new Set<string>();
    let volume = 0;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    for (let i = 0; i < bank.positions.length; i += 9) {
      const points = [0, 3, 6].map(offset => new Vector3(...bank.positions.slice(i + offset, i + offset + 3) as [number, number, number]));
      const [a, b, c] = points as [Vector3, Vector3, Vector3];
      const cross = b.clone().sub(a).cross(c.clone().sub(a));
      expect(cross.length()).toBeGreaterThan(1e-7);
      expect(cross.normalize().distanceTo(new Vector3(...bank.normals.slice(i, i + 3) as [number, number, number]))).toBeLessThan(1e-12);
      volume += a.dot(b.clone().cross(c)) / 6;
      const keys = points.map(q => q.toArray().join(','));
      points.forEach((q, j) => {
        expect([q.x, q.y, q.z].every(v => Number.isFinite(v) && Math.fround(v) === v)).toBe(true);
        const dx = q.x - p.x, dz = q.z - p.z;
        expect(Math.abs(dx * cos - dz * sin)).toBeLessThanOrEqual(47 * p.sx);
        expect(Math.abs(dx * sin + dz * cos)).toBeLessThanOrEqual(22 * p.sz);
        vertices.add(keys[j]!);
        const next = keys[(j + 1) % 3]!, key = [keys[j]!, next].sort().join('|');
        const uses = edges.get(key) ?? []; uses.push(keys[j]! < next ? 1 : -1); edges.set(key, uses);
      });
    }
    for (const uses of edges.values()) { expect(uses).toHaveLength(2); expect(uses[0]! + uses[1]!).toBe(0); }
    expect(volume).toBeGreaterThan(0);
    expect(vertices.size - edges.size + bank.positions.length / 9).toBe(2);
    expect(bank.positions.length / 9).toBeLessThanOrEqual(512);
  });

  it('buries the complete uploaded terrain toe under dense independent edge probes', () => {
    const bank = buildFoundationContactBank(placement, ground, 8);
    for (let i = 0; i < bank.terrainToe.length; i++) {
      const a = bank.terrainToe[i]!, b = bank.terrainToe[(i + 1) % bank.terrainToe.length]!;
      const steps = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / .25);
      for (let k = 0; k <= steps; k++) {
        const t = k / steps, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t;
        expect(ground(x, z) - (a[1] + (b[1] - a[1]) * t)).toBeGreaterThan(.1);
      }
    }
  });
  it('rejects unsafe, nonfinite and unsupported deep terrain instead of leaving a missing foundation', () => {
    expect(() => buildFoundationContactBank(placement, ground, 6.99)).toThrow('Unsafe');
    expect(() => buildFoundationContactBank(placement, () => NaN, 8)).toThrow('Nonfinite');
    expect(() => buildFoundationContactBank(flatPlacement, (x, z) => Math.abs(x - 11.75) < 1 && z > 20 ? -20 : 0, 8)).toThrow('retained bottom');
    const plan = createInkstormFoundationContactPlan({ seed: 2 } as PodraceCourse, () => { throw new Error('Must not sample generic course'); });
    expect(plan.geometry).toBeNull(); expect(plan.replacedIds.size).toBe(0);
  });
  it('omits only installed pipe banks, retaining all other families and unchanged instance transforms', () => {
    const placements: InkstormPlacement[] = [placement, { ...placement, id: 'other-bank', x: 1400 }, { ...placement, family: 'finish-tower', id: 'tower' }];
    const baseline = createInkstormFoundations(placements, ground);
    const omitted = createInkstormFoundations(placements, ground, undefined, new Set(['bank', 'tower', 'unknown']));
    try {
      expect(baseline.count).toBe(3); expect(omitted.count).toBe(2);
      for (let i = 0; i < 2; i++) {
        const a = new Matrix4(), b = new Matrix4(); baseline.getMatrixAt(i + 1, a); omitted.getMatrixAt(i, b);
        expect(a.elements).toEqual(b.elements);
      }
    } finally { release(baseline); release(omitted); }
  });
});

describe('Foundry contact transfer and fail-closed box omission', () => {
  const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
  let baseline: Mesh;
  beforeAll(() => { baseline = createInkstormFoundry(course, sampleTerrainHeight)!; });
  afterAll(() => release(baseline));
  afterEach(() => vi.restoreAllMocks());
  it('transfers accepted surfaces to the existing single mesh without altering original triangle attributes', () => {
    const geometry = makeGeometry(), count = geometry.getAttribute('position').count, dispose = vi.spyOn(geometry, 'dispose');
    const result = createInkstormFoundry(course, sampleTerrainHeight, contact(geometry))!;
    try {
      expect(result.userData.inkstormFoundationReplacementIds).toEqual(new Set(['bank']));
      expect(result.geometry.getAttribute('position').count).toBe(baseline.geometry.getAttribute('position').count + count);
      for (const name of ['position', 'normal', 'color']) {
        const before = baseline.geometry.getAttribute(name).array, after = result.geometry.getAttribute(name).array;
        expect(Array.from(after.slice(0, before.length))).toEqual(Array.from(before));
      }
      expect(result.geometry.groups).toHaveLength(0); expect(Array.isArray(result.material)).toBe(false);
      expect(dispose).toHaveBeenCalledTimes(1);
    } finally { release(result); }
  });
  it.each(['null', 'throw'])('keeps the complete old Foundry mesh and every original box after %s merge failure', failure => {
    const geometry = makeGeometry(), dispose = vi.spyOn(geometry, 'dispose');
    if (failure === 'null') geometry.deleteAttribute('color'); else geometry.userData.throwContactMerge = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = createInkstormFoundry(course, sampleTerrainHeight, contact(geometry))!;
    try {
      expect(result.userData.inkstormFoundationReplacementIds.size).toBe(0);
      expect(result.userData.inkstormFoundationContact.mergeFailure).toBeTruthy();
      for (const name of ['position', 'normal', 'color']) expect(Array.from(result.geometry.getAttribute(name).array)).toEqual(Array.from(baseline.geometry.getAttribute(name).array));
      const placements = getInkstormLayout(course);
      const oldBoxes = createInkstormFoundations(placements, sampleTerrainHeight);
      const fallback = createInkstormFoundations(placements, sampleTerrainHeight, undefined, result.userData.inkstormFoundationReplacementIds);
      try { expect(fallback.count).toBe(oldBoxes.count); expect(Array.from(fallback.instanceMatrix.array)).toEqual(Array.from(oldBoxes.instanceMatrix.array)); }
      finally { release(oldBoxes); release(fallback); }
      expect(dispose).toHaveBeenCalledTimes(1);
    } finally { release(result); }
  });
  it('disposes the offered geometry if the course has no Foundry mesh', () => {
    const geometry = makeGeometry(), dispose = vi.spyOn(geometry, 'dispose');
    expect(createInkstormFoundry({ seed: 2 } as PodraceCourse, sampleTerrainHeight, contact(geometry))).toBeNull();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
