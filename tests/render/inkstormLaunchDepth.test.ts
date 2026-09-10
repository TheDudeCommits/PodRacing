import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Texture, TextureLoader, Vector3 } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createCourseGulfField, getLaunchBasinAnchor } from '../../src/game/race/CourseGulfField';
import { LAUNCH_INDUSTRIAL_BENCHES } from '../../src/game/race/LaunchBasinPlan';
import { getInkstormVistaPlan } from '../../src/render/inkstorm/InkstormVista';
import { groundInkstormButtress } from '../../src/render/inkstorm/InkstormRockGrounding';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { InkstormWorld } from '../../src/render/inkstorm/InkstormWorld';
import { getInkstormLayout } from '../../src/game/race/inkstormLayout';

const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
const field = createCourseGulfField(course)!;
const ground = (x: number, z: number) => sampleTerrainHeight(x, z, field);
const anchor = getLaunchBasinAnchor(course)!;
const forms = getInkstormVistaPlan(course, ground).landforms.filter(p => p.depthLayer);
const compositionForms = getInkstormVistaPlan(course, ground).landforms.filter(p => p.compositionLayer);

const scans = new Map<string, { positions: Float32Array; triangles: number }>();
beforeAll(async () => {
  // Keep Node file types scoped to the test: the application has no Node types.
  const fileModule: string = 'node:fs';
  const { readFileSync } = await import(/* @vite-ignore */ fileModule) as { readFileSync(path: URL): Uint8Array<ArrayBuffer> };
  for (const id of ['canyon-buttress', 'canyon-buttress-lod', 'fractured-spire', 'fractured-spire-lod']) {
    const bytes = Uint8Array.from(readFileSync(new URL(`../../public/assets/inkstorm/${id}.glb`, import.meta.url)));
    const model = await new GLTFLoader().parseAsync(bytes.buffer, '');
    model.scene.updateMatrixWorld(true);
    const positions: number[] = [], vertex = new Vector3();
    let triangles = 0;
    // Read actual accessor strides and scene transforms through the production
    // loader, instead of assuming packed floats or an identity GLB node.
    model.scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const position = object.geometry.getAttribute('position');
      triangles += (object.geometry.index?.count ?? position.count) / 3;
      for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
        positions.push(vertex.x, vertex.y, vertex.z);
      }
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
    });
    scans.set(id, { positions: new Float32Array(positions), triangles });
  }
});

describe('bounded launch composition spires', () => {
  it('adds only three separately budgeted forms and preserves the two older groups', () => {
    expect(compositionForms.map(p => p.id)).toEqual([
      'launch-composition-west-descent-finger',
      'launch-composition-west-inset-spire',
      'launch-composition-east-inner-spire',
    ]);
    const all = getInkstormVistaPlan(course, ground).landforms;
    expect(all.filter(p => p.depthLayer)).toHaveLength(5);
    expect(all.filter(p => p.ridgeId)).toHaveLength(9);
    for (const form of all) expect([!!form.depthLayer, !!form.ridgeId, !!form.compositionLayer].filter(Boolean)).toHaveLength(1);
    expect(compositionForms.every(p => p.family === 'fractured-spire' && p.compositionLayer === 'middle')).toBe(true);
    expect(compositionForms.length * scan('fractured-spire').triangles).toBeLessThanOrEqual(10_248);
    expect(compositionForms.length * scan('fractured-spire-lod').triangles).toBeLessThanOrEqual(5_409);
  });

  it('clears the full corridor, panorama and yards with every actual high/LOD vertex grounded', () => {
    const { points, intervalAllowance } = denseCorridors();
    const matrix = new Matrix4(), vertex = new Vector3(), up = new Vector3(0, 1, 0);
    for (const form of compositionForms) {
      const minimumLane = Math.min(...points.map(p => Math.hypot(form.x - p.x, form.z - p.z) - p.width - form.radius));
      expect(minimumLane - intervalAllowance - 9.6, form.id).toBeGreaterThan(7);
      expect(form.sx).toBe(form.sy); expect(form.sz).toBe(form.sy);
      const planted = groundInkstormButtress(form, ground);
      expect(planted.scaleY / form.sx).toBeLessThanOrEqual(1.75);
      matrix.compose(new Vector3(form.x, planted.baseY, form.z),
        new Quaternion().setFromAxisAngle(up, form.yaw), new Vector3(form.sx, planted.scaleY, form.sz));
      for (const id of ['fractured-spire', 'fractured-spire-lod']) {
        const { positions } = scan(id);
        let highestToe = -Infinity, toeCount = 0;
        for (let i = 0; i < positions.length; i += 3) {
          vertex.fromArray(positions, i).applyMatrix4(matrix);
          expect(Math.hypot(vertex.x - form.x, vertex.z - form.z)).toBeLessThanOrEqual(form.radius + .001);
          const f = (vertex.x - anchor.x) * anchor.tangentX + (vertex.z - anchor.z) * anchor.tangentZ;
          const r = -(vertex.x - anchor.x) * anchor.rightX - (vertex.z - anchor.z) * anchor.rightZ;
          expect(Math.abs(r) - Math.tan(Math.PI / 15) * f).toBeGreaterThan(0);
          for (const bench of LAUNCH_INDUSTRIAL_BENCHES) expect(Math.max(
            Math.abs(f - bench.forward) - bench.halfForward - 8,
            Math.abs(r - bench.right) - bench.halfRight - 8,
          )).toBeGreaterThan(0);
          if (positions[i + 1]! <= 10) {
            highestToe = Math.max(highestToe, vertex.y - ground(vertex.x, vertex.z)); toeCount++;
          }
        }
        expect(toeCount).toBeGreaterThan(10);
        expect(highestToe, `${form.id}/${id}`).toBeLessThan(0);
      }
    }
  });

  it('rejects steep or other-course sites without adding fallback scenery', () => {
    expect(getInkstormVistaPlan(course, (x, z) => x * 4 - z * 3).landforms.filter(p => p.compositionLayer)).toHaveLength(0);
    for (const seed of [0x464f554e, 1234]) {
      const other = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, seed);
      expect(getInkstormVistaPlan(other, sampleTerrainHeight).landforms.filter(p => p.compositionLayer)).toHaveLength(0);
    }
  });

  it('uploads grounded matrices for only the new spires and retains ordinary spire transforms', async () => {
    // This test isolates the real world assembly/instance upload without a
    // browser. Actual high/LOD geometry was independently checked above.
    const loader = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => {
      const scene = new Group();
      const geometry = new BoxGeometry(80, 120, 100).translate(0, 60, 0);
      geometry.setAttribute('uv1', geometry.getAttribute('uv').clone());
      scene.add(new Mesh(geometry, new MeshBasicMaterial()));
      return { scene, scenes: [scene], animations: [], cameras: [], asset: { version: '2.0' }, userData: {} } as unknown as GLTF;
    });
    const textureLoader = vi.spyOn(TextureLoader.prototype, 'loadAsync').mockResolvedValue(new Texture());
    const world = new InkstormWorld(ground);
    try {
      await world.ready; expect(world.loaded).toBe(true); expect(world.error).toBeNull();
      world.setCourse(course);
      const batch = world.children.find(o => o.name === 'Inkstorm / fractured-spire') as InstancedMesh;
      const matrix = new Matrix4();
      const matrixAt = (x: number, z: number): Matrix4 => {
        for (let i = 0; i < batch.count; i++) {
          batch.getMatrixAt(i, matrix);
          if (Math.abs(matrix.elements[12]! - x) < .002 && Math.abs(matrix.elements[14]! - z) < .002) return matrix.clone();
        }
        throw new Error(`Missing uploaded spire at ${x},${z}`);
      };
      for (const form of compositionForms) {
        const actual = matrixAt(form.x, form.z), planted = groundInkstormButtress(form, ground);
        expect(actual.elements[13]).toBeCloseTo(planted.baseY, 4);
        expect(actual.elements[5]).toBeCloseTo(planted.scaleY, 6);
        expect(actual.elements[13]).toBeLessThan(ground(form.x, form.z) - 1.5);
      }
      const ordinary = getInkstormLayout(course).filter(p => p.family === 'fractured-spire');
      expect(ordinary.length).toBeGreaterThan(0);
      for (const form of ordinary) {
        const actual = matrixAt(form.x, form.z);
        expect(actual.elements[13]).toBeCloseTo(ground(form.x, form.z) - 1.5, 4);
        expect(actual.elements[5]).toBeCloseTo(form.sy, 6);
      }
    } finally { world.dispose(); loader.mockRestore(); textureLoader.mockRestore(); }
  });
});
function scan(id: string): { positions: Float32Array; triangles: number } { return scans.get(id)!; }

function denseCorridors(): { points: { x: number; z: number; width: number }[]; intervalAllowance: number } {
  // getRenderData clamps to 4,096; directly sweep the actual main route 16,384 times.
  const main = Array.from({ length: 16_384 }, (_, i) => course.samplePlanAtProgress(i / 16_384));
  const lines: { points: { x: number; z: number; width: number }[]; closed: boolean }[] = [{ points: main, closed: true }];
  for (const branch of course.branches) {
    const points: { x: number; z: number; width: number }[] = [];
    for (let i = 1; i < branch.points.length; i++) {
      const a = branch.points[i - 1]!, b = branch.points[i]!;
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .4));
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        points.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, width: Math.max(a.width, b.width) });
      }
    }
    lines.push({ points, closed: false });
  }
  let intervalAllowance = 0;
  for (const line of lines) for (let i = 0; i < line.points.length - (line.closed ? 0 : 1); i++) {
    const a = line.points[i]!, b = line.points[(i + 1) % line.points.length]!;
    intervalAllowance = Math.max(intervalAllowance, Math.hypot(b.x - a.x, b.z - a.z) + Math.abs(b.width - a.width));
  }
  return { points: lines.flatMap(line => line.points), intervalAllowance };
}

describe('flagship launch shoulder depth', () => {
  it('adds five unequal, bounded scan instances in near, middle and refinery-background planes', () => {
    expect(forms).toHaveLength(5);
    expect(new Set(forms.map(p => p.depthLayer))).toEqual(new Set(['near', 'middle', 'far']));
    expect(new Set(forms.map(p => p.sx)).size).toBeGreaterThanOrEqual(4);
    expect(Math.max(...forms.map(p => p.forward)) - Math.min(...forms.map(p => p.forward))).toBeGreaterThan(900);
    const high = scan('canyon-buttress'), low = scan('canyon-buttress-lod');
    expect(forms.every(p => p.family === 'canyon-buttress')).toBe(true);
    expect(forms.length * high.triangles).toBeLessThanOrEqual(140_000);
    expect(forms.length * low.triangles).toBeLessThanOrEqual(21_000);
  });

  it('encloses every transformed high and LOD vertex, with a fully guarded corridor and open panorama', () => {
    const { points, intervalAllowance } = denseCorridors();
    const matrix = new Matrix4(), vertex = new Vector3(), up = new Vector3(0, 1, 0);
    for (const form of forms) {
      let laneClearance = Infinity;
      for (const point of points) laneClearance = Math.min(laneClearance,
        Math.hypot(form.x - point.x, form.z - point.z) - point.width - form.radius);
      expect(laneClearance - intervalAllowance, form.id).toBeGreaterThan(9.6 + 7);
      const planted = groundInkstormButtress(form, ground);
      matrix.compose(new Vector3(form.x, planted.baseY, form.z),
        new Quaternion().setFromAxisAngle(up, form.yaw), new Vector3(form.sx, planted.scaleY, form.sz));
      for (const id of ['canyon-buttress', 'canyon-buttress-lod']) {
        const { positions } = scan(id);
        let maximumRadius = 0, minimumPanoramaClearance = Infinity, minimumYardClearance = Infinity;
        for (let i = 0; i < positions.length; i += 3) {
          vertex.fromArray(positions, i).applyMatrix4(matrix);
          maximumRadius = Math.max(maximumRadius, Math.hypot(vertex.x - form.x, vertex.z - form.z));
          const f = (vertex.x - anchor.x) * anchor.tangentX + (vertex.z - anchor.z) * anchor.tangentZ;
          const r = -(vertex.x - anchor.x) * anchor.rightX - (vertex.z - anchor.z) * anchor.rightZ;
          minimumPanoramaClearance = Math.min(minimumPanoramaClearance, Math.abs(r) - Math.tan(Math.PI / 15) * f);
          for (const bench of LAUNCH_INDUSTRIAL_BENCHES) minimumYardClearance = Math.min(minimumYardClearance,
            Math.max(Math.abs(f - bench.forward) - bench.halfForward - 8,
              Math.abs(r - bench.right) - bench.halfRight - 8));
        }
        expect(maximumRadius, `${form.id}/${id}`).toBeLessThanOrEqual(form.radius + .001);
        expect(minimumPanoramaClearance, form.id).toBeGreaterThan(0);
        expect(minimumYardClearance, form.id).toBeGreaterThan(0);
      }
    }
  });

  it('keeps full-volume source proportions and embeds its actual low vertices in terrain', () => {
    const { positions } = scan('canyon-buttress');
    for (const form of forms) {
      expect(form.sx).toBe(form.sy); expect(form.sz).toBe(form.sy);
      const planted = groundInkstormButtress(form, ground);
      expect(planted.scaleY / form.sx, form.id).toBeLessThanOrEqual(1.75);
      let lowestContact = Infinity, highestToe = -Infinity;
      for (let i = 0; i < positions.length; i += 3) {
        if (positions[i + 1]! > 10) continue;
        const x = form.x + Math.cos(form.yaw) * positions[i]! * form.sx + Math.sin(form.yaw) * positions[i + 2]! * form.sz;
        const z = form.z - Math.sin(form.yaw) * positions[i]! * form.sx + Math.cos(form.yaw) * positions[i + 2]! * form.sz;
        const clearance = planted.baseY + positions[i + 1]! * planted.scaleY - ground(x, z);
        lowestContact = Math.min(lowestContact, clearance); highestToe = Math.max(highestToe, clearance);
      }
      expect(lowestContact, form.id).toBeLessThan(-1.5);
      expect(highestToe, form.id).toBeLessThan(0);
    }
  });

  it('retains physical course data and refuses a steep site instead of stretching a facade', () => {
    const before = JSON.stringify({ branches: course.branches, checkpoints: course.checkpoints, controls: course.controlPoints });
    getInkstormVistaPlan(course, ground);
    expect(JSON.stringify({ branches: course.branches, checkpoints: course.checkpoints, controls: course.controlPoints })).toBe(before);
    expect(getInkstormVistaPlan(course, (x, z) => x * 4 - z * 3).landforms.filter(p => p.depthLayer)).toHaveLength(0);
    for (const seed of [0x464f554e, 1234]) {
      const other = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, seed);
      expect(getInkstormVistaPlan(other, sampleTerrainHeight).landforms.filter(p => p.depthLayer)).toHaveLength(0);
    }
  });
});
