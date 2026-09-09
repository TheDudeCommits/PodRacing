import { DoubleSide, Matrix4, Mesh, MeshBasicMaterial, Object3D, Quaternion, Raycaster, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RaceSimulation } from '/Users/amir/Projects/PodRacing/src/game/race/RaceSimulation';
import { sampleTerrainHeight } from '/Users/amir/Projects/PodRacing/src/render/terrain/terrainMath';
import { WreckVisualPoseCache } from '/Users/amir/Projects/PodRacing/src/render/combat/WreckVisualPose';
import { TeemtoWreckBreakup } from '/Users/amir/Projects/PodRacing/src/render/combat/TeemtoWreckBreakup';

const fileModule: string = 'node:fs';
const { readFileSync, writeFileSync } = await import(/* @vite-ignore */ fileModule);
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
function fixture(name: typeof variants[number]) {
  const root = sources.get(name)!.clone(true), original = meshes(root), nodes = new Map<string, Object3D>();
  root.traverse(node => nodes.set(node.name, node)); root.updateMatrixWorld(true);
  const cache = new WreckVisualPoseCache(); cache.refresh(root, original, 1);
  const breakup = TeemtoWreckBreakup.create(root, nodes, original)!; expect(breakup).not.toBeNull();
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



export { fixture, race, step, matrices, variants };
