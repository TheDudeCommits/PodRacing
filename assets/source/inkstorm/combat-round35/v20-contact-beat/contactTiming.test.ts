import { Matrix4, Mesh, Object3D, Quaternion, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RaceSimulation } from '/Users/amir/Projects/PodRacing/src/game/race/RaceSimulation';
import { sampleTerrainHeight } from '/Users/amir/Projects/PodRacing/src/render/terrain/terrainMath';
import { WreckVisualPoseCache, WRECK_PRESENTATION_DURATION } from '/Users/amir/Projects/PodRacing/src/render/combat/WreckVisualPose';
import { TeemtoWreckBreakup } from '/Users/amir/Projects/PodRacing/src/render/combat/TeemtoWreckBreakup';
import { CinematicCamera, type CameraSubject } from '/Users/amir/Projects/PodRacing/src/camera/CinematicCamera';

const fileModule: string = 'node:fs';
const { readFileSync } = await import(/* @vite-ignore */ fileModule);
import { TeemtoWreckBreakup as BaselineBreakup } from './test-runtime/TeemtoWreckBreakupBaseline';
const variants = ['hero', 'rival'] as const;
const sources = new Map<string, Group>();
const privatePath = 'assets/source/inkstorm/combat-round35/authored-damage-v16/packaged-b/';

async function load(path: string, stripImages = false): Promise<Group> {
  const data = readFileSync(path);
  if (!stripImages) return (await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '')).scene;
  const size = data.readUInt32LE(12), json = JSON.parse(data.subarray(20, 20 + size).toString());
  // Original names, hierarchy, geometry accessors and complete BIN are exact.
  // CPU geometry tests remove only image/material references from a memory copy.
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) delete primitive.material;
  delete json.materials; delete json.images; delete json.textures; delete json.samplers;
  const text = new TextEncoder().encode(JSON.stringify(json)), padded = Math.ceil(text.byteLength / 4) * 4;
  const binary = data.subarray(28 + size), output = new Uint8Array(28 + padded + binary.byteLength), h = new DataView(output.buffer);
  h.setUint32(0, 0x46546c67, true); h.setUint32(4, 2, true); h.setUint32(8, output.byteLength, true);
  h.setUint32(12, padded, true); h.setUint32(16, 0x4e4f534a, true); output.fill(32, 20, 20 + padded); output.set(text, 20);
  h.setUint32(20 + padded, binary.byteLength, true); h.setUint32(24 + padded, 0x004e4942, true); output.set(binary, 28 + padded);
  expect(binary.equals(output.subarray(28 + padded))).toBe(true);
  return (await new GLTFLoader().parseAsync(output.buffer, '')).scene;
}
function meshes(root: Object3D): Mesh[] { const result: Mesh[] = []; root.traverse(o => { if (o instanceof Mesh) result.push(o); }); return result; }
function fixture(name: typeof variants[number], baseline = false) {
  const root = sources.get(name)!.clone(true), original = meshes(root), nodes = new Map<string, Object3D>();
  root.traverse(node => nodes.set(node.name, node)); root.updateMatrixWorld(true);
  const cache = new WreckVisualPoseCache(); cache.refresh(root, original, 1);
  const breakup = (baseline ? BaselineBreakup : TeemtoWreckBreakup).create(root, nodes, original)!; expect(breakup).not.toBeNull();
  const damageRoot = sources.get(`${name}-damage`)!.clone(true), damage = meshes(damageRoot); root.add(damageRoot);
  expect(breakup.installDamageVariant(damage)).toBe(true);
  return { root, original, damage, cache, breakup, all: [...original, ...damage] };
}
function race() { return new RaceSimulation({ terrain: { heightAt: sampleTerrainHeight }, seed: 1229867859,
  totalLaps: 1, countdownSeconds: 3, competitionProfile: 'time-trial' }); }
function step(sim: RaceSimulation, frame: number) { sim.step({ brake: 1, boost: frame >= 558 && frame <= 910 }); }
function matrices(art: ReturnType<typeof fixture>) { return art.all.map(m => [...m.matrix.elements, ...m.position.toArray(), ...m.quaternion.toArray()]); }

beforeAll(async () => {
  for (const name of variants) {
    sources.set(name, await load(`public/assets/inkstorm/vehicles/teemto-${name === 'hero' ? 'hero-open-v2' : 'rival'}.glb`, true));
    sources.set(`${name}-damage`, await load(`${privatePath}teemto-damage-${name}-v16.glb`));
  }
});
afterAll(() => { for (const root of sources.values()) for (const mesh of meshes(root)) {
  mesh.geometry.dispose(); for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
} });

describe('actual source contact beat timing', () => {
  it.each(variants)('%s makes supported contact during the held beat before the old final-settle contact', name => {
    const sim = race(), candidate = fixture(name), baseline = fixture(name, true);
    const first: Record<string, { frame: number; age: number; pacedWallMs: number; minimumRearGap: number }> = {};
    try {
      for (let frame = 1; frame <= 960; frame++) {
        step(sim, frame); if (frame < 910) continue;
        const entry = sim.state.entries[0]!, frozen = JSON.stringify(sim.state);
        for (const [label, art] of [['candidate', candidate], ['baseline', baseline]] as const) {
          const pose = art.cache.update(entry.vehicle, entry.galactic!.wreck.timer, sim.terrain);
          art.breakup.update(pose, entry.galactic!.wreck.timer, sim.terrain);
          if (pose.groundContact && !first[label]) {
            art.root.updateMatrixWorld(true);
            const rear = art.damage.find(m => m.name === 'teemto-damage-right-rear-v16')!;
            const world = new Matrix4().compose(pose.position, new Quaternion().setFromEuler(pose.rotation), new Vector3(1, 1, 1)).multiply(rear.matrixWorld);
            const points = rear.geometry.getAttribute('position'), p = new Vector3(); let minimumRearGap = Infinity;
            for (let v = 0; v < points.count; v++) { p.fromBufferAttribute(points, v).applyMatrix4(world); minimumRearGap = Math.min(minimumRearGap, p.y - sim.terrain.heightAt(p.x, p.z)); }
            const age = WRECK_PRESENTATION_DURATION - entry.galactic!.wreck.timer;
            first[label] = { frame, age, pacedWallMs: age / .18 * 1000, minimumRearGap };
            expect(minimumRearGap).toBeGreaterThanOrEqual(-1e-6);
          }
        }
        expect(JSON.stringify(sim.state)).toBe(frozen);
      }
      expect(first.candidate).toBeDefined(); expect(first.baseline).toBeDefined();
      expect(first.candidate!.age).toBeLessThanOrEqual(.085);
      expect(first.candidate!.pacedWallMs).toBeLessThan(480);
      expect(first.candidate!.frame).toBeLessThan(first.baseline!.frame);
      console.info('V20 measured actual contact timing:', JSON.stringify({ name, ...first, note: 'Wall values are scheduled .18 pacing calculations, not native video measurements.' }));
    } finally { candidate.breakup.reset(); baseline.breakup.reset(); }
  });
});
