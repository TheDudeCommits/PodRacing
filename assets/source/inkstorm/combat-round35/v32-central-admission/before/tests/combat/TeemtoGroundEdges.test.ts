import { DoubleSide, Matrix4, Mesh, MeshBasicMaterial, Object3D, Quaternion, Raycaster, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { WreckVisualPoseCache } from '../../src/render/combat/WreckVisualPose';
import { TeemtoWreckBreakup } from '../../src/render/combat/TeemtoWreckBreakup';

const fileModule: string = 'node:fs';
const { readFileSync } = await import(/* @vite-ignore */ fileModule);
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



describe('Source casing edge contact roots',()=>{
 it.each(variants)('%s projects actual opposing casing extrema onto the sampled ground, without extra terrain or source reads',name=>{
  const art=fixture(name),sim=race(),body=new Matrix4(),world=new Matrix4(),p=new Vector3(),across=new Vector3();
  const original=matrices(art),pilots=art.original.filter(m=>m.name.startsWith('teemto-pilot-'));
  const parents=pilots.map(m=>m.parent),pilotMatrices=pilots.map(m=>m.matrix.clone());
  for(let frame=1;frame<=932;frame++)step(sim,frame);
  const e=sim.state.entries[0]!,state=JSON.stringify(sim.state),pose=art.cache.update(e.vehicle,e.galactic!.wreck.timer,sim.terrain);
  let queries=0;
  const spies=art.all.map(m=>vi.spyOn(m.geometry,'getAttribute').mockImplementation(()=>{throw new Error('Runtime source scan');}));
  try { art.breakup.update(pose,e.galactic!.wreck.timer,{heightAt(x,z){queries++;return sim.terrain.heightAt(x,z);}}); }
  finally {for(const spy of spies)spy.mockRestore();}
  expect(queries).toBeLessThanOrEqual(name==='hero'?348:300);
  const contact=pose.groundContact!,f=contact.footprint!,edges=f.edges!;
  expect(edges).toHaveLength(2);expect(contact.position.y).toBeCloseTo(sim.terrain.heightAt(contact.position.x,contact.position.z),9);
  art.root.updateMatrixWorld(true);body.compose(pose.position,new Quaternion().setFromEuler(pose.rotation),new Vector3(1,1,1));
  const rear=art.damage.find(m=>m.name.includes('right-rear'))!;world.multiplyMatrices(body,rear.matrixWorld);
  across.set(f.axis.z,0,-f.axis.x);const position=rear.geometry.getAttribute('position');
  let min=Infinity,max=-Infinity;const matchingXZ=[Infinity,Infinity];
  for(let i=0;i<position.count;i++){
   p.fromBufferAttribute(position,i).applyMatrix4(world);const lateral=p.clone().sub(f.center).dot(across);min=Math.min(min,lateral);max=Math.max(max,lateral);
   for(let edge=0;edge<2;edge++)matchingXZ[edge]=Math.min(matchingXZ[edge]!,Math.hypot(p.x-edges[edge]!.x,p.z-edges[edge]!.z));
  }
  expect(matchingXZ[0]).toBeLessThan(1e-8);expect(matchingXZ[1]).toBeLessThan(1e-8);
  expect(edges[0].clone().sub(f.center).dot(across)).toBeCloseTo(min,8);
  expect(edges[1].clone().sub(f.center).dot(across)).toBeCloseTo(max,8);
  expect(max-min).toBeGreaterThan(f.halfWidth*2+2);
  for(const edge of edges)expect(edge.y).toBeCloseTo(sim.terrain.heightAt(edge.x,edge.z),9);
  // Exterior roots, unlike the old centerline, leave the two source sides in
  // opposite directions. Rays use complete admitted triangles, not bounds.
  const probe=new Mesh(rear.geometry,new MeshBasicMaterial({side:DoubleSide}));probe.matrixAutoUpdate=false;probe.matrix.copy(world);probe.updateMatrixWorld(true);
  const ray=new Raycaster();
  for(let i=0;i<2;i++)for(const height of[.2,.5,1]){
   const direction=across.clone().multiplyScalar(i===0?-1:1),origin=edges[i]!.clone().addScaledVector(direction,.01);origin.y+=height;
   ray.set(origin,direction);expect(ray.intersectObject(probe,false)).toHaveLength(0);
  }
  probe.material.dispose();
  const edgeBefore=edges.map(v=>v.toArray()),witnessBefore=contact.position.toArray();
  art.breakup.update(pose,e.galactic!.wreck.timer,sim.terrain);
  expect(pose.groundContact!.footprint!.edges!.map(v=>v.toArray())).toEqual(edgeBefore);
  expect(pose.groundContact!.position.toArray()).toEqual(witnessBefore);
  expect(JSON.stringify(sim.state)).toBe(state);
  for(let i=0;i<pilots.length;i++){expect(pilots[i]!.parent).toBe(parents[i]);expect(pilots[i]!.matrix.equals(pilotMatrices[i]!)).toBe(true);}
  art.breakup.reset();expect(pose.groundContact).toBeUndefined();expect(matrices(art)).toEqual(original);
 });
});
