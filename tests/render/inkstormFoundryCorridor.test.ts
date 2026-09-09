import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Box3, BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Texture, TextureLoader, Vector3 } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createCourseGulfField } from '../../src/game/race/CourseGulfField';
import { createPitPadField } from '../../src/game/race/PitPadField';
import { getInkstormLayout } from '../../src/game/race/inkstormLayout';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { PodracerView } from '../../src/render/objects/PodracerView';
import { InkstormWorld } from '../../src/render/inkstorm/InkstormWorld';
import { POLWO_ART_DEFINITIONS, SEBULBA_ART_DEFINITIONS, TEEMTO_ART_DEFINITIONS } from '../../src/game/vehicleAppearance';
import {
  FOUNDRY_CORRIDOR_CLEARANCE, FOUNDRY_CORRIDOR_SOURCES, getInkstormFoundryCorridorPlan,
  type FoundryCorridorLandform,
} from '../../src/render/inkstorm/InkstormFoundryCorridor';

let gulf: ReturnType<typeof createCourseGulfField> = null;
let pit: ReturnType<typeof createPitPadField> | null = null;
const ground = (x: number, z: number): number => sampleTerrainHeight(x, z)
  + (gulf?.sampleOffset(x, z) ?? 0) + (pit?.sampleOffset(x, z) ?? 0);
const course = createProceduralPodraceCourse({ heightAt: ground }, 0x494e4b53);
gulf = createCourseGulfField(course);
course.refreshTerrainHeights({ heightAt: sampleTerrainHeight });
pit = createPitPadField(getInkstormLayout(course), Array.from({ length: 2048 }, (_, i) => course.samplePlanAtProgress(i / 2048)),
  course.branches, (x, z) => sampleTerrainHeight(x, z) + gulf!.sampleOffset(x, z));
const plan = getInkstormFoundryCorridorPlan(course, ground);
const scans = new Map<string, { bounds: Box3; positions: Float32Array; triangles: number }>();
const sourceIds = [...new Set(Object.entries(FOUNDRY_CORRIDOR_SOURCES).flatMap(([family, source]) => [family, source.lowFamily]))];

beforeAll(async () => {
  const fileModule: string = 'node:fs';
  const { readFileSync } = await import(/* @vite-ignore */ fileModule) as { readFileSync(path: URL): Uint8Array<ArrayBuffer> };
  for (const id of sourceIds) {
    const bytes = Uint8Array.from(readFileSync(new URL(`../../public/assets/inkstorm/${id}.glb`, import.meta.url)));
    const model = await new GLTFLoader().parseAsync(bytes.buffer, '');
    model.scene.updateMatrixWorld(true);
    const bounds = new Box3(), positions: number[] = [], v = new Vector3();
    let triangles = 0;
    model.scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const position = object.geometry.getAttribute('position');
      triangles += (object.geometry.index?.count ?? position.count) / 3;
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
        positions.push(v.x, v.y, v.z); bounds.expandByPoint(v);
      }
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
    });
    scans.set(id, { bounds, positions: new Float32Array(positions), triangles });
  }
});

interface LanePoint { x: number; z: number; width: number }
function independentSweeps(): { points: LanePoint[]; allowance: number; route: string }[] {
  // Independent, denser point proof debits an entire interval. The production
  // function instead computes exact segment/OBB distance at 4,096 main samples.
  const main = Array.from({ length: 16_384 }, (_, i) => course.samplePlanAtProgress(i / 16_384));
  const lines = [{ points: main as LanePoint[], allowance: 0, route: 'canonical' }];
  for (const branch of course.branches) {
    const points: LanePoint[] = [];
    const steps = Math.ceil(4096 / (branch.points.length - 1));
    for (let i = 1; i < branch.points.length; i++) {
      const a = branch.points[i - 1]!, b = branch.points[i]!;
      for (let step = 0; step < steps; step++) {
        const t = step / steps;
        points.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, width: Math.max(a.width, b.width) });
      }
    }
    points.push(branch.points[branch.points.length - 1]!);
    lines.push({ points, allowance: 0, route: branch.id });
  }
  for (const line of lines) {
    const count = line.route === 'canonical' ? line.points.length : line.points.length - 1;
    for (let i = 0; i < count; i++) {
      const a = line.points[i]!, b = line.points[(i + 1) % line.points.length]!;
      line.allowance = Math.max(line.allowance, Math.hypot(b.x - a.x, b.z - a.z) + Math.abs(b.width - a.width));
    }
  }
  return lines;
}

function actualBoxDistance(form: FoundryCorridorLandform, p: LanePoint, box: Box3): number {
  const dx = p.x - form.x, dz = p.z - form.z;
  const x = dx * Math.cos(form.yaw) - dz * Math.sin(form.yaw);
  const z = dx * Math.sin(form.yaw) + dz * Math.cos(form.yaw);
  return Math.hypot(Math.max(0, box.min.x * form.sx - x, x - box.max.x * form.sx),
    Math.max(0, box.min.z * form.sz - z, z - box.max.z * form.sz));
}

describe('render-only Foundry corridor proposal', () => {
  it('budgets ten uneven layers using actual high and low source triangle counts and bounds', () => {
    expect(plan.rejected).toEqual([]);
    expect(plan.landforms).toHaveLength(10);
    expect(plan.mainSegments).toBe(4096); expect(plan.branchSegments).toBe(72);
    expect(plan.landforms.filter(p => p.depthLayer === 'near')).toHaveLength(2);
    expect(plan.landforms.filter(p => p.depthLayer === 'middle')).toHaveLength(4);
    expect(plan.landforms.filter(p => p.depthLayer === 'far')).toHaveLength(4);
    let high = 0, low = 0;
    for (const [id, source] of Object.entries(FOUNDRY_CORRIDOR_SOURCES)) {
      for (const asset of [id, source.lowFamily]) {
        const scan = scans.get(asset)!;
        expect(scan.bounds.min.toArray()).toEqual(source.min);
        expect(scan.bounds.max.toArray()).toEqual(source.max);
        expect(scan.triangles).toBe(asset === id ? source.highTriangles : source.lowTriangles);
      }
    }
    for (const form of plan.landforms) {
      high += scans.get(form.family)!.triangles; low += scans.get(form.source.lowFamily)!.triangles;
      // Original proportions remain uniform before buried-toe grounding.
      expect(form.sx).toBe(form.sy); expect(form.sz).toBe(form.sy);
    }
    expect(high).toBe(plan.highTriangles); expect(low).toBe(plan.lowTriangles);
    expect(high).toBe(170_656); expect(high).toBeLessThan(200_000);
    expect(low).toBe(27_856);
  });

  it('uses a current craft allowance covering every procedural solid body', () => {
    const view = new PodracerView(), bounds = new Box3();
    try {
      for (const kind of ['podracer', 'landspeeder', 'speeder-bike', 'skim-speeder'] as const) {
        view.setVehicleClass(kind); view.updateMatrixWorld(true); bounds.makeEmpty();
        view.traverse(object => {
          if (!(object instanceof Mesh)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          if (materials.some(m => !m.transparent)) bounds.union(new Box3().setFromObject(object, true));
        });
        expect(Math.max(-bounds.min.x, bounds.max.x), kind).toBeLessThanOrEqual(FOUNDRY_CORRIDOR_CLEARANCE.vehicleHalfWidth);
      }
    } finally { view.dispose(); }
  });

  it('also covers the actual transformed imported hero/rival craft bodies without decoding their textures', async () => {
    const fileModule: string = 'node:fs';
    const { readFileSync } = await import(/* @vite-ignore */ fileModule) as { readFileSync(path: URL): Uint8Array<ArrayBuffer> };
    for (const definition of [...Object.values(TEEMTO_ART_DEFINITIONS), ...Object.values(SEBULBA_ART_DEFINITIONS), ...Object.values(POLWO_ART_DEFINITIONS)]) {
      const bytes = Uint8Array.from(readFileSync(new URL(`../../public${definition.url}`, import.meta.url)));
      const original = new DataView(bytes.buffer), jsonSize = original.getUint32(12, true);
      // Preserve binary accessors and every scene/node transform. Dropping the
      // unused material references makes this a local CPU geometry test only.
      const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonSize))) as {
        materials: unknown[]; meshes: { primitives: { material?: number }[] }[];
      };
      json.materials = [];
      for (const mesh of json.meshes) for (const primitive of mesh.primitives) delete primitive.material;
      const text = new TextEncoder().encode(JSON.stringify(json)), padded = Math.ceil(text.length / 4) * 4;
      const binary = bytes.subarray(20 + jsonSize), rewritten = new Uint8Array(20 + padded + binary.length);
      rewritten.set(bytes.subarray(0, 20)); rewritten.fill(32, 20, 20 + padded); rewritten.set(text, 20); rewritten.set(binary, 20 + padded);
      const header = new DataView(rewritten.buffer); header.setUint32(8, rewritten.length, true); header.setUint32(12, padded, true);
      const model = await new GLTFLoader().parseAsync(rewritten.buffer, ''); model.scene.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(model.scene, true);
      model.scene.traverse(object => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
      });
      expect(Math.max(-bounds.min.x, bounds.max.x), definition.url).toBeLessThanOrEqual(FOUNDRY_CORRIDOR_CLEARANCE.vehicleHalfWidth);
    }
  });

  it('clears all main, return and branch lanes with the actual high/low boxes plus widest craft and 7m', () => {
    const lines = independentSweeps();
    expect(lines[0]!.points).toHaveLength(16_384);
    expect(lines.length).toBe(4);
    for (const line of lines.slice(1)) expect(line.points.length).toBeGreaterThanOrEqual(4096);
    for (const form of plan.landforms) for (const id of [form.family, form.source.lowFamily]) {
      const box = scans.get(id)!.bounds;
      for (const line of lines) {
        let minimum = Infinity;
        for (const point of line.points) minimum = Math.min(minimum, actualBoxDistance(form, point, box) - point.width);
        expect(minimum - line.allowance - FOUNDRY_CORRIDOR_CLEARANCE.vehicleHalfWidth,
          `${form.id}/${id}/${line.route}`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('grounds the real toes and contains all transformed vertices in the published world bounds', () => {
    const v = new Vector3();
    for (const form of plan.landforms) {
      const matrix = new Matrix4().compose(new Vector3(form.x, form.baseY, form.z),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), form.yaw), new Vector3(form.sx, form.scaleY, form.sz));
      const bounds = new Box3(new Vector3(...form.worldBounds.min), new Vector3(...form.worldBounds.max)).expandByScalar(.001);
      expect(form.scaleY / form.sy).toBeLessThanOrEqual(1.75);
      for (const id of [form.family, form.source.lowFamily]) {
        const scan = scans.get(id)!; let highestToe = -Infinity, escaped = 0, toes = 0;
        for (let i = 0; i < scan.positions.length; i += 3) {
          v.fromArray(scan.positions, i).applyMatrix4(matrix);
          if (!bounds.containsPoint(v)) escaped++;
          if (scan.positions[i + 1]! < scan.bounds.min.y + 10) {
            highestToe = Math.max(highestToe, v.y - ground(v.x, v.z)); toes++;
          }
        }
        expect(escaped, `${form.id}/${id} world bounds`).toBe(0);
        expect(toes).toBeGreaterThan(0);
        expect(highestToe, `${form.id}/${id} floating toe`).toBeLessThan(0);
      }
    }
  });

  it('rejects a new return lane crossing a box interior even when its endpoints are far away', () => {
    const rock = plan.landforms[0]!;
    const original = course.branches[0]!;
    const crossing = { ...original, id: 'test-long-return', points: [
      { ...original.points[0]!, x: rock.x - 500, z: rock.z, width: 32 },
      { ...original.points[1]!, x: rock.x + 500, z: rock.z, width: 32 },
    ] };
    const altered = new Proxy(course, { get(target, key, receiver) {
      return key === 'branches' ? [...target.branches, crossing] : Reflect.get(target, key, receiver);
    } });
    const result = getInkstormFoundryCorridorPlan(altered, ground);
    expect(result.landforms.some(p => p.id === rock.id)).toBe(false);
    expect(result.rejected.find(p => p.id === rock.id)?.reason).toBe('lane-clearance');
  });

  it('never alters the physical edition/layout and declines steep or non-flagship sites', () => {
    const physical = (): string => JSON.stringify({ signature: course.signature, length: course.totalLength,
      points: course.controlPoints, checkpoints: course.checkpoints, render: course.getRenderData(4096),
      branches: course.branches, layout: getInkstormLayout(course) });
    const before = physical();
    getInkstormFoundryCorridorPlan(course, ground);
    expect(physical()).toBe(before);
    const steep = getInkstormFoundryCorridorPlan(course, (x, z) => x * 4 - z * 3);
    expect(steep.landforms).toHaveLength(0); expect(steep.rejected).toHaveLength(10);
    for (const seed of [0x464f554e, 1234]) {
      const other = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, seed);
      expect(getInkstormFoundryCorridorPlan(other, ground).landforms).toHaveLength(0);
    }
  });

  it('uploads final grounded transforms once, retains LOD transforms and casts camera-independent shadows', async () => {
    // Adapter test only: cheap loader geometry isolates ownership/transforms.
    // The previous tests independently inspect the actual shipped GLB sources.
    const loader = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => {
      const scene = new Group(), geometry = new BoxGeometry(80, 120, 100).translate(0, 60, 0);
      geometry.setAttribute('uv1', geometry.getAttribute('uv').clone());
      scene.add(new Mesh(geometry, new MeshBasicMaterial()));
      return { scene, scenes: [scene], animations: [], cameras: [], asset: { version: '2.0' }, userData: {} } as unknown as GLTF;
    });
    const textures = vi.spyOn(TextureLoader.prototype, 'loadAsync').mockImplementation(async () => new Texture());
    const world = new InkstormWorld(ground);
    let shadows: Group | undefined;
    const disposal = new Map<InstancedMesh, number>();
    const expected = (form: FoundryCorridorLandform): number[] => new Matrix4().compose(
      new Vector3(form.x, form.baseY, form.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), form.yaw),
      new Vector3(form.sx, form.scaleY, form.sz)).toArray().map(Math.fround);
    const contains = (batch: InstancedMesh, form: FoundryCorridorLandform): boolean => {
      const matrix = new Matrix4();
      for (let i = 0; i < batch.count; i++) {
        batch.getMatrixAt(i, matrix);
        if (Math.abs(matrix.elements[12]! - form.x) < .002 && Math.abs(matrix.elements[14]! - form.z) < .002) {
          expect(matrix.toArray(), `${form.id} must not be grounded twice`).toEqual(expected(form)); return true;
        }
      }
      return false;
    };
    try {
      await world.ready; expect(world.error).toBeNull(); expect(world.loaded).toBe(true);
      world.setCourse(course);
      for (const form of plan.landforms) {
        const batch = world.getObjectByName(`Inkstorm / ${form.family}`) as InstancedMesh;
        expect(contains(batch, form), `${form.id} absent from beauty batch`).toBe(true);
        if (!disposal.has(batch)) {
          disposal.set(batch, 0); batch.geometry.addEventListener('dispose', () => disposal.set(batch, disposal.get(batch)! + 1));
        }
      }
      const farCamera = new PerspectiveCamera(65, 1, .1, 200_000);
      farCamera.position.set(plan.landforms[0]!.x, 1000, 100_000);
      farCamera.lookAt(plan.landforms[0]!.x, 0, 0); world.update(farCamera);
      const distant = world.getObjectByName('Inkstorm / canyon-buttress-lod') as InstancedMesh;
      for (const form of plan.landforms.filter(p => p.family === 'canyon-buttress')) expect(contains(distant, form)).toBe(true);

      // Cull all beauty instances with a short-range camera elsewhere. Shadow
      // ownership must still include every form's original grounded matrix.
      const away = new PerspectiveCamera(60, 1, .1, 10); away.lookAt(0, 0, -1); world.update(away);
      for (const family of Object.keys(FOUNDRY_CORRIDOR_SOURCES)) expect((world.getObjectByName(`Inkstorm / ${family}`) as InstancedMesh).count).toBe(0);
      shadows = world.createShadowCasters();
      for (const form of plan.landforms) {
        const beauty = world.getObjectByName(`Inkstorm / ${form.family}`) as InstancedMesh;
        const caster = shadows.children.find(o => o instanceof InstancedMesh && o.geometry === beauty.geometry) as InstancedMesh;
        expect(caster, `${form.id} missing static caster`).toBeDefined();
        expect(contains(caster, form)).toBe(true);
        expect(caster.material).toBe(beauty.material);
        expect(disposal.get(beauty)).toBe(0);
      }
    } finally {
      // Caster geometry/material are borrowed. Only its instance buffers are
      // released here; World owns the shared source geometry and its disposal.
      shadows?.traverse(object => { if (object instanceof InstancedMesh) object.dispose(); });
      shadows?.clear(); world.dispose(); loader.mockRestore(); textures.mockRestore();
    }
    for (const count of disposal.values()) expect(count).toBe(1);
  });
});
