import { BufferGeometry, Float32BufferAttribute, Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PodraceCourse } from '../../game/race/course';
import type { InkstormPlacement } from '../../game/race/inkstormLayout';
import { InkstormSurfaceMaterial } from '../inkstorm/InkstormSurfaceMaterial';
import { CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY } from '../post/CelPrepassMaterial';

type HeightAt = (x: number, z: number) => number;
export interface SaltDuskRange {
  id: string; layer: number; x: number; z: number; axisX: number; axisZ: number;
  halfLength: number; halfWidth: number; height: number; phase: number; mesa: number;
}
const clamp = (x: number): number => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number): number => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Collision-associated geometry is never filtered, including the fork rock island. */
export function retainSaltDuskPlacement(p: InkstormPlacement, course: PodraceCourse): boolean {
  if (p.id.startsWith('inkstorm-fork-divider-')) return true;
  if (p.family !== 'canyon-buttress' && p.family !== 'fractured-spire' && p.family !== 'cliff-strata') return true;
  // Actual canyon walls retain their enclosing shape; isolated roadside towers
  // elsewhere are replaced by the landscape. Render-only founded supports stay.
  if (p.id.startsWith('citadel-rock-') || p.id.startsWith('foundry-corridor-')) return true;
  return course.sampleAtProgress(p.progress).tag === 'narrow-canyon'
    && course.projectPoint(p.x, p.z).distanceToCenter < 240;
}

/** Six different ranges outside one conservative envelope of ALL playable routes. */
export function planSaltDuskRanges(course: PodraceCourse): SaltDuskRange[] {
  const anchor = course.sampleAtProgress(.08), ax = anchor.tangentX, az = anchor.tangentZ, bx = az, bz = -ax;
  const render = course.getRenderData(2048), points = [...render.points, ...(render.branches ?? []).flatMap(b => b.points)];
  let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
  for (const p of points) {
    const a = p.x * ax + p.z * az, b = p.x * bx + p.z * bz, margin = p.width + 60;
    minA = Math.min(minA, a - margin); maxA = Math.max(maxA, a + margin);
    minB = Math.min(minB, b - margin); maxB = Math.max(maxB, b + margin);
  }
  const midA = (minA + maxA) / 2, midB = (minB + maxB) / 2;
  const spanA = maxA - minA, spanB = maxB - minB;
  const definitions = [
    // a, b, runs along A, half-length, half-width, relief, layer, mesa blend
    [midA - spanA * .12, minB - 1600, 1, spanA * .72, 400, 120, 0, .38],
    [midA + spanA * .17, maxB + 1800, 1, spanA * .66, 450, 150, 0, .72],
    [maxA + 2200, midB - spanB * .08, 0, spanB * .95, 460, 210, 1, .18],
    [minA - 2500, midB + spanB * .14, 0, spanB * .85, 490, 230, 1, .38],
    [midA + spanA * .1, minB - 3800, 1, spanA * 1.15, 600, 290, 2, .14],
    [maxA + 4600, midB + spanB * .18, 0, spanB * 1.2, 680, 340, 2, .24],
  ];
  return definitions.map(([a, b, alongA, length, width, height, layer, mesa], i) => ({
    id: `salt-dusk-range-${i}`, layer: layer!, x: a! * ax + b! * bx, z: a! * az + b! * bz,
    axisX: alongA ? ax : bx, axisZ: alongA ? az : bz, halfLength: Math.max(700, length!),
    halfWidth: width!, height: height!, phase: i * 2.371 + .7, mesa: mesa!,
  }));
}

function ridgeNoise(x: number): number {
  const i = Math.floor(x), t = x - i, f = t * t * (3 - 2 * t);
  const hash = (n: number): number => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  return hash(i) * (1 - f) + hash(i + 1) * f;
}

/** Indexed eroded surface, continuously seated perimeter and a closed buried underside. */
export function createSaltDuskRangeGeometry(range: SaltDuskRange, heightAt: HeightAt): BufferGeometry {
  const nx = 192, nz = 22, positions: number[] = [], colors: number[] = [], uv: number[] = [], indices: number[] = [];
  let bottom = Infinity;
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const u = i / nx * 2 - 1, v = j / nz * 2 - 1, p = range.phase;
    // Continuous watershed spine with unequal peaks and incised tributaries.
    const spine = (ridgeNoise(u * 9 + p) - .5) * .24 + (ridgeNoise(u * 27 - p) - .5) * .08;
    const crest = .34 + .31 * ridgeNoise(u * 5 + p) + .18 * ridgeNoise(u * 16 - p) + .10 * ridgeNoise(u * 41 + p) + .06 * ridgeNoise(u * 87 - p);
    const d = Math.abs(v - spine), edge = Math.pow(Math.max(0, 1 - v * v), 1.5);
    const talus = Math.pow(Math.max(0, 1 - d), 1.55);
    const crown = 1 - smooth(.15, .54, d);
    const ends = smooth(1, .63, Math.abs(u));
    const drainage = (.08 * ridgeNoise(u * 57 + v * 8 + p) + .045 * ridgeNoise(u * 109 - v * 17)) * smooth(.07, .6, d);
    const relief = Math.max(0, ((talus * (1 - range.mesa) + crown * range.mesa) * crest - drainage) * edge * ends);
    const x = range.x + range.axisX * u * range.halfLength - range.axisZ * v * range.halfWidth;
    const z = range.z + range.axisZ * u * range.halfLength + range.axisX * v * range.halfWidth;
    const ground = heightAt(x, z), y = ground - 3 + range.height * relief;
    positions.push(x, y, z); bottom = Math.min(bottom, ground - 16);
    // Neutral mineral variation; shared lighting and photographed rock own hue.
    const tone = .57 + .07 * relief + .025 * Math.sin(u * 29 + v * 12 + p);
    colors.push(tone, tone * .96, tone * .89); uv.push(i / nx, j / nz);
    if (i < nx && j < nz) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // Boundary is below sampled terrain; close to a buried perimeter ring and cap.
  const perimeter: number[] = [];
  for (let i = 0; i < nx; i++) perimeter.push(i);
  for (let j = 0; j < nz; j++) perimeter.push(j * (nx + 1) + nx);
  for (let i = nx; i > 0; i--) perimeter.push(nz * (nx + 1) + i);
  for (let j = nz; j > 0; j--) perimeter.push(j * (nx + 1));
  const lower = positions.length / 3;
  for (const index of perimeter) { positions.push(positions[index * 3]!, bottom, positions[index * 3 + 2]!); colors.push(.5, .48, .44); uv.push(0, 0); }
  const center = positions.length / 3; positions.push(range.x, bottom, range.z); colors.push(.5, .48, .44); uv.push(.5, .5);
  for (let i = 0; i < perimeter.length; i++) {
    const next = (i + 1) % perimeter.length, a = perimeter[i]!, b = perimeter[next]!, c = lower + i, d = lower + next;
    indices.push(a, b, c, b, d, c, c, d, center);
  }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new Float32BufferAttribute(colors, 3)); g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(indices); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}

export function createSaltDuskScenery(course: PodraceCourse, heightAt: HeightAt): Mesh[] {
  const plan = planSaltDuskRanges(course), meshes: Mesh[] = [];
  for (let layer = 0; layer < 3; layer++) {
    const ranges = plan.filter(p => p.layer === layer), parts = ranges.map(p => createSaltDuskRangeGeometry(p, heightAt));
    const geometry = mergeGeometries(parts, false); for (const part of parts) part.dispose();
    if (!geometry) throw new Error('Salt Dusk range merge failed');
    const mesh = new Mesh(geometry, new InkstormSurfaceMaterial(true));
    mesh.name = `Salt Dusk continuous eroded ranges / ${layer}`;
    mesh.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY] = true;
    mesh.userData.saltDuskRanges = ranges;
    meshes.push(mesh);
  }
  return meshes;
}
