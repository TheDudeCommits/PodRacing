import { Box3, Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse, type PodraceCourse } from '../../src/game/race/course';
import { getInkstormLayout, getInkstormObstacleContact, type InkstormPlacement } from '../../src/game/race/inkstormLayout';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const terrain = { heightAt: sampleTerrainHeight };
const flagshipSeed = 0x494e4b53;
const entranceProgress = .44729237368968017;
const wideVehicleHalfWidth = 9.6;
const sceneryClearance = 7;
const mainSampleCount = 16_384;
const branchMaximumStep = .4;
const ids = ['inkstorm-canyon-near-left-buttress', 'inkstorm-canyon-near-right-buttress'];
async function digest(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
const course = createProceduralPodraceCourse(terrain, flagshipSeed);

interface CorridorPoint { x: number; z: number; width: number; }

function denseCorridors(value: PodraceCourse): { points: CorridorPoint[]; intervalAllowance: number; branchPoints: number } {
  // getRenderData clamps to 4,096: sample the actual course directly for a
  // genuine 16,384-point main-route sweep, including its closing interval.
  const main = Array.from({ length: mainSampleCount }, (_, i) => value.samplePlanAtProgress(i / mainSampleCount));
  const lines: { points: CorridorPoint[]; closed: boolean }[] = [{ points: main, closed: true }];
  let branchPoints = 0;
  for (const branch of value.branches) {
    const points: CorridorPoint[] = [];
    for (let i = 1; i < branch.points.length; i++) {
      const a = branch.points[i - 1]!, b = branch.points[i]!;
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / branchMaximumStep));
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        // Use the full segment's greatest lane half-width at every sample.
        points.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, width: Math.max(a.width, b.width) });
      }
    }
    branchPoints += points.length;
    lines.push({ points, closed: false });
  }
  let intervalAllowance = 0;
  for (const line of lines) {
    const count = line.closed ? line.points.length : line.points.length - 1;
    for (let i = 0; i < count; i++) {
      const a = line.points[i]!, b = line.points[(i + 1) % line.points.length]!;
      // Debit an entire center interval plus its width change, not just the
      // nearest sample's apparent clearance. Branch intervals are <= 0.4 m.
      intervalAllowance = Math.max(intervalAllowance, Math.hypot(b.x - a.x, b.z - a.z) + Math.abs(b.width - a.width));
    }
  }
  return { points: lines.flatMap(line => line.points), intervalAllowance, branchPoints };
}

function boxDistance(rock: InkstormPlacement, point: CorridorPoint, bounds: Box3): number {
  const dx = point.x - rock.x, dz = point.z - rock.z;
  const x = dx * Math.cos(rock.yaw) - dz * Math.sin(rock.yaw);
  const z = dx * Math.sin(rock.yaw) + dz * Math.cos(rock.yaw);
  return Math.hypot(Math.max(0, bounds.min.x * rock.sx - x, x - bounds.max.x * rock.sx),
    Math.max(0, bounds.min.z * rock.sz - z, z - bounds.max.z * rock.sz));
}

const actualBounds = new Box3();
beforeAll(async () => {
  // The application deliberately has no Node type dependency. Scope the one
  // test-runtime file operation here with its complete, narrow return type.
  const fileModule: string = 'node:fs';
  const { readFileSync } = await import(/* @vite-ignore */ fileModule) as { readFileSync(path: URL): Uint8Array<ArrayBuffer> };
  // Read both actual shipped meshes and their scene transforms. Do not rely on
  // a handwritten 80x100 envelope if the GLB or either LOD changes later.
  for (const name of ['canyon-buttress', 'canyon-buttress-lod']) {
    const bytes = Uint8Array.from(readFileSync(new URL(`../../public/assets/inkstorm/${name}.glb`, import.meta.url)));
    const model = await new GLTFLoader().parseAsync(bytes.buffer, '');
    model.scene.updateMatrixWorld(true);
    actualBounds.union(new Box3().setFromObject(model.scene, true));
    model.scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
    });
  }
});

describe('flagship canyon entrance composition', () => {
  it('replaces only the paired near buttresses with stable, unequal composition anchors', async () => {
    const layout = getInkstormLayout(course);
    const near = layout.filter(p => ids.includes(p.id));
    expect(near).toHaveLength(2);
    expect(layout).toHaveLength(227);
    const route = course.sampleAtProgress(entranceProgress);
    const original = [
      { x: 19931.643757184986, z: 395.78964639280974, yaw: -2.8622132374091094, offset: -12, scale: [.92, .72, .95] },
      { x: 19762.46078381596, z: 469.2171309360826, yaw: -2.602013507870892, offset: 18, scale: [1, .82, 1] },
    ];
    ids.forEach((id, index) => {
      const rock = near.find(p => p.id === id)!, previous = original[index]!;
      expect(rock.family).toBe('canyon-buttress');
      expect(rock.progress).toBe(entranceProgress);
      expect(rock.x).toBeCloseTo(previous.x + route.rightX * previous.offset, 10);
      expect(rock.z).toBeCloseTo(previous.z + route.rightZ * previous.offset, 10);
      expect(rock.yaw).toBe(previous.yaw);
      expect([rock.sx, rock.sy, rock.sz]).toEqual(previous.scale);
    });
    // Pre-change receipt excludes only numeric IDs 91 and 93. This guards every
    // remaining transform/ID, including both arches and all physical fork rocks.
    expect(await digest(layout.filter(p => !ids.includes(p.id))))
      .toBe('bf1dfd8846615ede6d652844c20bd6e3b8f9a0b940cbfb7883843d6596e4910b');
  });

  it('keeps the actual high/LOD boxes beyond full main and branch lanes plus a wide craft and 7 m', () => {
    expect(actualBounds.min.toArray()).toEqual([-40, 0, -50]);
    expect(actualBounds.max.toArray()).toEqual([40, 120, 50]);
    const corridors = denseCorridors(course);
    expect(corridors.points.length - corridors.branchPoints).toBe(mainSampleCount);
    expect(course.branches.length).toBeGreaterThan(0);
    expect(corridors.branchPoints).toBeGreaterThan(0);
    const near = getInkstormLayout(course).filter(p => ids.includes(p.id));
    expect(near).toHaveLength(2);
    for (const rock of near) {
      let laneClearance = Infinity;
      for (const point of corridors.points) laneClearance = Math.min(laneClearance, boxDistance(rock, point, actualBounds) - point.width);
      const clearance = laneClearance - wideVehicleHalfWidth - corridors.intervalAllowance;
      expect(clearance, `${rock.id}: actual OBB to swept wide-vehicle corridor`).toBeGreaterThanOrEqual(sceneryClearance);
    }
  });

  it('leaves the physical route, checkpoint identity, branches and ordinary buttress collision unchanged', async () => {
    const fresh = createProceduralPodraceCourse(terrain, flagshipSeed);
    const physical = () => ({ signature: fresh.signature, totalLength: fresh.totalLength, controlPoints: fresh.controlPoints,
      checkpoints: fresh.checkpoints, route: fresh.getRenderData(4096), branches: fresh.branches });
    const before = await digest(physical());
    const near = getInkstormLayout(fresh).filter(p => ids.includes(p.id));
    expect(near).toHaveLength(2);
    for (const rock of near) expect(getInkstormObstacleContact(fresh, rock.x, rock.z,
      wideVehicleHalfWidth, terrain.heightAt(rock.x, rock.z) + 2, terrain.heightAt)).toBeNull();
    expect(await digest(physical())).toBe(before);
  });

  it.each([
    [0, '46fa85266d87714977cd8b0948c62f2d0dbccafd9cd4d4c9750ceba24e78870e'],
    [1, '9806f1ec4751503952788e271a44a83ad7deaa7294ff26883d6bc0425f78a7f5'],
    [42, '6b725e67b9a2815b4aeb4a6449e66b1fd0936df8be648a2645e57215e268a371'],
    [1234, 'f0fd1b1edb9d75bfb58e8c794b45dffb0f52cf2ce328019ab9a7f4e872e0a298'],
    [987654321, '6887bd3fd6437266082dab8cf4f87cdc74e6381202e788ff4b49f4c64820c89d'],
    [0x494e4b52, 'a766ff367e64e10e8e3c3b8475be327f9d667da5e67e97def0235ff4f08f3eb5'],
    [0x494e4b54, 'db1a50889047a6155f2117a6783659356dd3b4515814651499753d4a8edd7c35'],
    [0xffffffff, 'bd05454c09e7768f0c8e5d3f8fe27d1848d9ebf1e8e6bdfe28b0e2125023ce94'],
  ] as const)('preserves the complete round 24 layout for non-flagship seed %i', async (seed, expected) => {
    const layout = getInkstormLayout(createProceduralPodraceCourse(terrain, seed));
    expect(layout.some(p => ids.includes(p.id))).toBe(false);
    expect(await digest(layout)).toBe(expected);
  });
});
