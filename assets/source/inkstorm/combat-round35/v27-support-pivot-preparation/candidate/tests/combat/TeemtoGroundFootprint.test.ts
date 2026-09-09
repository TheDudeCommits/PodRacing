import { Matrix4, Mesh, Object3D, Quaternion, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { WreckVisualPoseCache } from '../../src/render/combat/WreckVisualPose';
import { teemtoSlideTime, teemtoStrikeTime } from '../../src/render/combat/TeemtoStrikeMotion';
import { TeemtoWreckBreakup } from '../../src/render/combat/TeemtoWreckBreakup';

const fileModule: string = 'node:fs';
const { readFileSync } = await import(/* @vite-ignore */ fileModule);
const variants = ['hero', 'rival'] as const;
const sources = new Map<string, Group>();
const contactBandMeasurements: unknown[] = [];
afterAll(async () => {
  const path = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.V27_BAND_METRICS_PATH;
  if (path) {
    const module: string = 'node:fs'; const { writeFileSync } = await import(/* @vite-ignore */ module);
    writeFileSync(path, JSON.stringify(contactBandMeasurements, null, 2) + '\n');
  }
});
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
    const rear = art.damage.find(m => m.name.includes('right-rear'))!;
    const rearSamples = new WreckVisualPoseCache(true); rearSamples.refresh(art.root, [rear], 0);
    const restInverse = rear.matrixWorld.clone().invert(), cacheWorld = new Matrix4();
    try {
      for (let frame = 1; frame <= 1168; frame++) {
        step(sim, frame); if (!frames.has(frame)) continue;
        const e = sim.state.entries[0]!, before = JSON.stringify(sim.state);
        const pose = art.cache.update(e.vehicle, e.galactic!.wreck.timer, sim.terrain); let queries = 0;
        art.breakup.update(pose, e.galactic!.wreck.timer, { heightAt(x,z) { queries++; return sim.terrain.heightAt(x,z); } });
        maxQueries = Math.max(queries,maxQueries); art.root.updateMatrixWorld(true);
        body.compose(pose.position,q.setFromEuler(pose.rotation),unit);
        const sourceNearAlong: number[] = [];
        for (const mesh of art.all) if (mesh.visible) {
          world.multiplyMatrices(body,mesh.matrixWorld); axis.set(0,0,1).transformDirection(world).setY(0).normalize();
          const p=mesh.geometry.getAttribute('position'); let low=Infinity, hi=-Infinity, near=0;
          for (let i=0;i<p.count;i++) {
            point.fromBufferAttribute(p,i).applyMatrix4(world); const gap=point.y-sim.terrain.heightAt(point.x,point.z);
            minimum=Math.min(minimum,gap);checked++;
            // Check every vertex with the same bound, constructing detailed assertion
            // state only on failure instead of roughly a million passing matchers.
            if (!(gap >= -1e-6)) expect(gap,`${name}/${frame}/${mesh.name}/${i}: no source burial`).toBeGreaterThanOrEqual(-1e-6);
            if (gap<=.45) {const along=point.x*axis.x+point.z*axis.z;low=Math.min(low,along);hi=Math.max(hi,along);near++;if(mesh===rear)sourceNearAlong.push(along);}
          }
          // V27 completes the last engine response at .88 s. These unchanged
          // broad-rest lengths now sample .9 and 1.667 s; frame 984 remains
          // an intermediate full-source clearance sample, not terminal rest.
          if ([1018,1110].includes(frame) && (mesh.name==='teemto-engine-left-body'||mesh.name.includes('damage-right'))) {
            const length=hi-low;bands.push({frame,mesh:mesh.name,length,near});
            expect(length,`${name}/${mesh.name}: long casing contact band`).toBeGreaterThan(mesh.name.includes('rear')?6:mesh.name.includes('front')?4.5:8);
          }
        }
        if (pose.groundContact?.footprint) {
          const f=pose.groundContact.footprint;expect(f.center.y).toBeCloseTo(sim.terrain.heightAt(f.center.x,f.center.z),9);
          const age = 2.15 - e.galactic!.wreck.timer;
          expect(f.halfLength).toBeGreaterThan(0);expect(f.axis.length()).toBeCloseTo(1,9);
          if (age >= teemtoStrikeTime(2) + teemtoSlideTime(2)) expect(f.halfLength).toBeGreaterThan(2);
          // A rolling casing can contact on an edge. Recompute the transient
          // band from complete source vertices and independently transformed
          // cached vertices, sampling actual terrain rather than stored gaps.
          cacheWorld.copy(body).multiply(rear.matrixWorld).multiply(restInverse);
          const cachedAlong: number[] = [];
          for (const support of rearSamples.supportPoints) {
            point.copy(support).applyMatrix4(cacheWorld);
            if (point.y - sim.terrain.heightAt(point.x,point.z) <= .45) cachedAlong.push(point.x*f.axis.x+point.z*f.axis.z);
          }
          expect(sourceNearAlong.length).toBeGreaterThan(1);expect(cachedAlong.length).toBeGreaterThan(1);
          const sourceMin=Math.min(...sourceNearAlong), sourceMax=Math.max(...sourceNearAlong);
          const cacheMin=Math.min(...cachedAlong), cacheMax=Math.max(...cachedAlong);
          const centerAlong=f.center.x*f.axis.x+f.center.z*f.axis.z;
          expect(sourceMax-sourceMin).toBeGreaterThan(0);
          expect(Math.abs(centerAlong-f.halfLength-cacheMin)).toBeLessThan(1e-7);
          expect(Math.abs(centerAlong+f.halfLength-cacheMax)).toBeLessThan(1e-7);
          // Tolerance is the measured axial coverage gap of this cache, not an
          // inflated footprint or a new permissive constant. Its endpoints
          // must also remain inside the actual full-source near-ground band.
          const coverage=Math.max(...sourceNearAlong.map(v=>Math.min(...cachedAlong.map(c=>Math.abs(c-v)))));
          expect(cacheMin).toBeGreaterThanOrEqual(sourceMin-1e-7);expect(cacheMax).toBeLessThanOrEqual(sourceMax+1e-7);
          expect(Math.abs(f.halfLength-(sourceMax-sourceMin)*.5)).toBeLessThanOrEqual(coverage+1e-7);
          contactBandMeasurements.push({name,frame,age,reportedLength:f.halfLength*2,
            actualSourceLength:sourceMax-sourceMin,cacheCoverageTolerance:coverage,sourceNearVertices:sourceNearAlong.length,
            cachedNearVertices:cachedAlong.length,terminal:age>=teemtoStrikeTime(2)+teemtoSlideTime(2)});
        }
        for (let i=0;i<pilots.length;i++) expect(pilots[i]!.matrix.equals(originalPilotMatrices[i]!)).toBe(true);
        expect(JSON.stringify(sim.state)).toBe(before);
      }
      art.breakup.reset();expect(matrices(art)).toEqual(rest);expect(art.damage.every(m=>!m.visible)).toBe(true);
      expect(art.original.every(m=>m.visible)).toBe(true);
      console.info('V22 broad source support', JSON.stringify({name,minimum,checked,maxQueries,bands}));
    } finally {art.breakup.reset();}
  });
});
