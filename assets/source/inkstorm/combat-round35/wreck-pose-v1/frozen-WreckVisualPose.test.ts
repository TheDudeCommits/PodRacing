import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { WreckVisualPoseCache, WRECK_PRESENTATION_DURATION, WRECK_SUPPORT_LIMIT } from '../../src/render/combat/WreckVisualPose';

const fileModule: string = 'node:fs';
const { readFileSync } = await import(/* @vite-ignore */ fileModule);

// These are the actual admitted rigid art POSITION streams, not their physics
// colliders. Texture/image decoding and a browser are unnecessary for this test.
function admittedArt(name: string) {
  const data = readFileSync(`public/assets/inkstorm/vehicles/${name}.glb`);
  const jsonSize = data.readUInt32LE(12);
  const gltf = JSON.parse(data.subarray(20, 20 + jsonSize).toString());
  const binary = data.subarray(28 + jsonSize);
  const root = new Group(), meshes: Mesh[] = [];
  for (const node of gltf.nodes) {
    if (node.mesh === undefined) continue;
    // Current admitted mesh transforms are baked. Fail if that asset contract changes.
    expect([node.matrix, node.translation, node.rotation, node.scale]).toEqual([undefined, undefined, undefined, undefined]);
    for (const primitive of gltf.meshes[node.mesh].primitives) {
      const accessor = gltf.accessors[primitive.attributes.POSITION], view = gltf.bufferViews[accessor.bufferView];
      expect([accessor.componentType, accessor.type, accessor.sparse]).toEqual([5126, 'VEC3', undefined]);
      const values = new Float32Array(accessor.count * 3);
      for (let index = 0; index < accessor.count; index++) {
        const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + index * (view.byteStride ?? 12);
        for (let axis = 0; axis < 3; axis++) values[index * 3 + axis] = binary.readFloatLE(offset + axis * 4);
      }
      const mesh = new Mesh(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(values, 3)));
      root.add(mesh); meshes.push(mesh);
    }
  }
  const cache = new WreckVisualPoseCache();
  cache.refresh(root, meshes, 1);
  return { root, meshes, cache };
}

function nativeRace() {
  return new RaceSimulation({ terrain: { heightAt: sampleTerrainHeight }, seed: 1229867859,
    totalLaps: 1, countdownSeconds: 3, competitionProfile: 'time-trial' });
}

describe('renderer-only rigid wreck pose', () => {
  it('preserves exact V9 simulation checkpoints while all four admitted families clear actual terrain', () => {
    const art = ['teemto-hero-open-v2', 'sebulba-hero', 'polwo-hero-v1', 'blockrunner-hero-v1'].map(admittedArt);
    // Exact native V9 checkpoints retained without depending on ignored output files.
    const checkpoints = new Map([
      [922, { position: [18600.13744955193, -10.18700433948426, 14.706374232596215], yaw: .0030769097051424055 }],
      [1153, { position: [18600.146944912514, -10.39808679708862, 15.075286382043856], yaw: .07634770277715397 }],
    ]);
    const race = nativeRace(), sample = new Vector3();
    const checkFrames = new Set([...Array.from({ length: 21 }, (_, index) => 910 + index * 12), 943, 975, 1010, 1070, 1153]);
    for (let frame = 1; frame <= 1153; frame++) {
      race.step({ brake: 1, boost: frame >= 558 && frame <= 910 });
      if (!checkFrames.has(frame)) continue;
      const entry = race.state.entries[0]!;
      const before = JSON.stringify(race.state);
      if (frame === 910) expect(entry.galactic!.wreck.timer).toBe(WRECK_PRESENTATION_DURATION);
      if (frame === 922 || frame === 1153) {
        const recorded = checkpoints.get(frame)!;
        expect([entry.vehicle.position.x, entry.vehicle.position.y, entry.vehicle.position.z]).toEqual(recorded.position);
        expect(entry.vehicle.orientation.yaw).toBe(recorded.yaw);
      }
      for (const { cache, meshes } of art) {
        let queries = 0;
        const pose = cache.update(entry.vehicle, entry.galactic!.wreck.timer,
          { heightAt: (x, z) => { queries++; return race.terrain.heightAt(x, z); } });
        expect(cache.supportPoints.length).toBeLessThanOrEqual(WRECK_SUPPORT_LIMIT);
        expect(queries).toBeLessThanOrEqual(WRECK_SUPPORT_LIMIT * 3);
        // The birth pose is the intact authoritative orientation/root exactly.
        if (frame === 910) {
          expect(pose.position.toArray()).toEqual([entry.vehicle.position.x, entry.vehicle.position.y, entry.vehicle.position.z]);
          expect(pose.rotation.x).toBe(entry.vehicle.orientation.pitch);
          expect(pose.rotation.y).toBe(entry.vehicle.orientation.yaw);
          expect(pose.rotation.z).toBe(entry.vehicle.orientation.roll + entry.vehicle.orientation.bank);
        }
        let minimum = Infinity;
        for (const mesh of meshes) {
          const positions = mesh.geometry.getAttribute('position');
          for (let vertex = 0; vertex < positions.count; vertex++) {
            sample.fromBufferAttribute(positions, vertex).applyEuler(pose.rotation).add(pose.position);
            minimum = Math.min(minimum, sample.y - race.terrain.heightAt(sample.x, sample.z));
          }
        }
        expect(minimum, `${frame}/${meshes.length} source meshes`).toBeGreaterThanOrEqual(0);
        expect(pose.groundCorrection).toBeLessThan(1.3);
        // Re-reading the same snapshot (pause, replay observer, FX before render)
        // produces exactly the same output without a frame-time accumulator.
        const first = [...pose.position.toArray(), pose.rotation.x, pose.rotation.y, pose.rotation.z];
        const second = cache.update(entry.vehicle, entry.galactic!.wreck.timer, race.terrain);
        expect([...second.position.toArray(), second.rotation.x, second.rotation.y, second.rotation.z]).toEqual(first);
      }
      expect(JSON.stringify(race.state)).toBe(before);
    }
    for (const item of art) for (const mesh of item.meshes) mesh.geometry.dispose();
  }, 20_000);

  it('caches actual transformed source samples by geometry revision without changing geometry or bounds metadata', () => {
    const root = new Group(), mesh = new Mesh(new BufferGeometry().setAttribute('position',
      new Float32BufferAttribute([-2, 0, -4, 2, 0, -4, -2, 2, 4, 2, 2, 4], 3)));
    root.position.set(100, 5, -9); root.rotation.y = .7;
    mesh.position.set(2, 1, 3); root.add(mesh);
    const original = Array.from(mesh.geometry.getAttribute('position').array);
    const cache = new WreckVisualPoseCache(); cache.refresh(root, [mesh], 1);
    expect(cache.localBounds.min.x).toBeCloseTo(0, 8);
    expect(cache.localBounds.min.y).toBeCloseTo(1, 8);
    expect(cache.localBounds.min.z).toBeCloseTo(-1, 8);
    expect(cache.localBounds.max.x).toBeCloseTo(4, 8);
    expect(cache.localBounds.max.z).toBeCloseTo(7, 8);
    const supports = [...cache.supportPoints];
    root.position.set(999, 10, 22); mesh.position.y += 2;
    cache.refresh(root, [mesh], 1);
    expect(cache.supportPoints).toEqual(supports);
    cache.refresh(root, [mesh], 2);
    expect(cache.localBounds.min.y).toBe(3);
    expect(mesh.geometry.boundingBox).toBeNull();
    expect(Array.from(mesh.geometry.getAttribute('position').array)).toEqual(original);
    mesh.geometry.dispose();
  });
});
