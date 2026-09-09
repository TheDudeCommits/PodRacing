import { Matrix4, Mesh, Object3D, Quaternion, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RaceSimulation } from '/Users/amir/Projects/PodRacing/src/game/race/RaceSimulation';
import { sampleTerrainHeight } from '/Users/amir/Projects/PodRacing/src/render/terrain/terrainMath';
import { WreckVisualPoseCache, WRECK_PRESENTATION_DURATION } from '/Users/amir/Projects/PodRacing/src/render/combat/WreckVisualPose';
import { TeemtoWreckBreakup } from '/Users/amir/Projects/PodRacing/src/render/combat/TeemtoWreckBreakup';
import { CinematicCamera, type CameraSubject } from '/Users/amir/Projects/PodRacing/src/camera/CinematicCamera';

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


describe('V22 source casing support rather than a single protrusion', () => {
  it.each(variants)('%s uses extended casing ground support, preserves every sampled source surface and restores intact geometry', name => {
    const art = fixture(name), sim = race(), point = new Vector3(), axis = new Vector3(), q = new Quaternion();
    const body = new Matrix4(), world = new Matrix4(), unit = new Vector3(1, 1, 1);
    const frames = new Set([910, 914, 919, 926, 932, 946, 984, 1018, 1110, 1158, 1168]);
    let minimum = Infinity, checked = 0, maxQueries = 0; const bands: unknown[] = [];
    const rest = matrices(art), pilots = art.original.filter(m => m.name.startsWith('teemto-pilot-'));
    const originalPilotMatrices = pilots.map(m => m.matrix.clone());
    try {
      for (let frame = 1; frame <= 1168; frame++) {
        step(sim, frame); if (!frames.has(frame)) continue;
        const e = sim.state.entries[0]!, before = JSON.stringify(sim.state);
        const pose = art.cache.update(e.vehicle, e.galactic!.wreck.timer, sim.terrain); let queries = 0;
        art.breakup.update(pose, e.galactic!.wreck.timer, { heightAt(x,z) { queries++; return sim.terrain.heightAt(x,z); } });
        maxQueries = Math.max(queries,maxQueries); art.root.updateMatrixWorld(true);
        body.compose(pose.position,q.setFromEuler(pose.rotation),unit);
        for (const mesh of art.all) if (mesh.visible) {
          world.multiplyMatrices(body,mesh.matrixWorld); axis.set(0,0,1).transformDirection(world).setY(0).normalize();
          const p=mesh.geometry.getAttribute('position'); let low=Infinity, hi=-Infinity, near=0; const bins=Array(10).fill(Infinity);mesh.geometry.computeBoundingBox();const zb=mesh.geometry.boundingBox!;
          for (let i=0;i<p.count;i++) {
            point.fromBufferAttribute(p,i).applyMatrix4(world); const gap=point.y-sim.terrain.heightAt(point.x,point.z);
            minimum=Math.min(minimum,gap);checked++;const bin=Math.min(9,Math.floor((p.getZ(i)-zb.min.z)/(zb.max.z-zb.min.z)*10));bins[bin]=Math.min(bins[bin],gap);
            expect(gap,`${name}/${frame}/${mesh.name}/${i}: no source burial`).toBeGreaterThanOrEqual(-1e-6);
            if (gap<=.45) {const along=point.x*axis.x+point.z*axis.z;low=Math.min(low,along);hi=Math.max(hi,along);near++;}
          }
          if ([984,1018].includes(frame) && (mesh.name==='teemto-engine-left-body'||mesh.name.includes('damage-right'))) {
            const length=hi-low;bands.push({frame,mesh:mesh.name,length,near,bins,world:world.elements,axis:axis.toArray()});
            console.info('BAND',name,frame,mesh.name,length);
          }
        }
        if (pose.groundContact?.footprint) {
          const f=pose.groundContact.footprint;expect(f.center.y).toBeCloseTo(sim.terrain.heightAt(f.center.x,f.center.z),9);
          console.info('FOOTPRINT',name,frame,JSON.stringify(f));expect(f.axis.length()).toBeCloseTo(1,9);
        }
        for (let i=0;i<pilots.length;i++) expect(pilots[i]!.matrix.equals(originalPilotMatrices[i]!)).toBe(true);
        expect(JSON.stringify(sim.state)).toBe(before);
      }
      art.breakup.reset();expect(matrices(art)).toEqual(rest);expect(art.damage.every(m=>!m.visible)).toBe(true);
      expect(art.original.every(m=>m.visible)).toBe(true);
      writeFileSync('assets/source/inkstorm/combat-round35/v22-ground-strike-preparation/actual-support-'+name+'.json',JSON.stringify({name,minimum,checked,maxQueries,bands},null,2));
    } finally {art.breakup.reset();}
  });
});
