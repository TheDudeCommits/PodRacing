import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Object3D, PropertyBinding, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { TeemtoWreckBreakup } from '../../src/render/combat/TeemtoWreckBreakup';
import { WreckVisualPoseCache, WRECK_PRESENTATION_DURATION, type WreckVisualPose } from '../../src/render/combat/WreckVisualPose';
import { ImportedVehiclePresentation } from '../../src/render/vehicles/ImportedVehiclePresentation';
import { VehicleArtLibrary } from '../../src/render/vehicles/VehicleArtLibrary';
import { TEEMTO_ART_DEFINITIONS } from '../../src/game/vehicleAppearance';

const fileModule: string = 'node:fs';
const { readFileSync } = await import(/* @vite-ignore */ fileModule);
const admittedNames = ['teemto-hero-open-v2', 'teemto-rival'] as const;
const rawEngineNames = ['teemto-engine-left.001', 'teemto-engine-right.001'] as const;
const engineNames = [PropertyBinding.sanitizeNodeName(rawEngineNames[0]), PropertyBinding.sanitizeNodeName(rawEngineNames[1])] as const;
const sourceGeometries = new Set<BufferGeometry>();

// Reconstruct the actual admitted GLB hierarchy and indexed POSITION geometry.
// No browser, material/texture loader, copied proxy hull or synthetic engine is used.
function admittedArt(name: typeof admittedNames[number]) {
  const data = readFileSync(`public/assets/inkstorm/vehicles/${name}.glb`);
  const jsonSize = data.readUInt32LE(12);
  const gltf = JSON.parse(data.subarray(20, 20 + jsonSize).toString());
  const binary = data.subarray(28 + jsonSize);
  const objects: Object3D[] = [], meshes: Mesh[] = [];
  for (const node of gltf.nodes) {
    expect([node.matrix, node.translation, node.rotation, node.scale]).toEqual([undefined, undefined, undefined, undefined]);
    let object: Object3D;
    if (node.mesh === undefined) object = new Group();
    else {
      const primitives = gltf.meshes[node.mesh].primitives;
      expect(primitives).toHaveLength(1);
      const primitive = primitives[0];
      const accessor = gltf.accessors[primitive.attributes.POSITION], view = gltf.bufferViews[accessor.bufferView];
      expect([accessor.componentType, accessor.type, accessor.sparse]).toEqual([5126, 'VEC3', undefined]);
      const values = new Float32Array(accessor.count * 3);
      for (let vertex = 0; vertex < accessor.count; vertex++) {
        const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + vertex * (view.byteStride ?? 12);
        for (let axis = 0; axis < 3; axis++) values[vertex * 3 + axis] = binary.readFloatLE(offset + axis * 4);
      }
      const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(values, 3));
      expect(primitive.indices).toBeTypeOf('number');
      const indices = gltf.accessors[primitive.indices], indexView = gltf.bufferViews[indices.bufferView];
      expect(indices.type).toBe('SCALAR');
      expect([5121, 5123, 5125]).toContain(indices.componentType);
      const bytes = indices.componentType === 5125 ? 4 : indices.componentType === 5123 ? 2 : 1;
      const indexValues: number[] = [];
      for (let index = 0; index < indices.count; index++) {
        const offset = (indexView.byteOffset ?? 0) + (indices.byteOffset ?? 0) + index * (indexView.byteStride ?? bytes);
        indexValues.push(bytes === 4 ? binary.readUInt32LE(offset) : bytes === 2 ? binary.readUInt16LE(offset) : binary.readUInt8(offset));
      }
      geometry.setIndex(indexValues);
      sourceGeometries.add(geometry);
      const mesh = new Mesh(geometry);
      object = mesh; meshes.push(mesh);
    }
    object.name = PropertyBinding.sanitizeNodeName(node.name ?? '');
    objects.push(object);
  }
  for (let index = 0; index < gltf.nodes.length; index++) {
    for (const child of gltf.nodes[index].children ?? []) objects[index]!.add(objects[child]!);
  }
  const root = new Group();
  for (const index of gltf.scenes[gltf.scene ?? 0].nodes) root.add(objects[index]!);
  root.updateMatrixWorld(true);
  return { root, meshes };
}

async function loadActualGeometry(name: typeof admittedNames[number]) {
  const data = readFileSync(`public/assets/inkstorm/vehicles/${name}.glb`);
  const jsonSize = data.readUInt32LE(12), json = JSON.parse(data.subarray(20, 20 + jsonSize).toString());
  for (const rawName of rawEngineNames) expect(json.nodes.some((node: { name: string }) => node.name === rawName)).toBe(true);
  // An in-memory geometry-only copy avoids DOM image decoding. Original node
  // names/hierarchy, primitive topology, accessors and the entire BIN chunk
  // are unchanged. The installed GLTFLoader owns naming and object creation.
  // This is deliberately not a material/image decoding test.
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) delete primitive.material;
  delete json.materials; delete json.images; delete json.textures; delete json.samplers;
  const text = new TextEncoder().encode(JSON.stringify(json));
  const padded = Math.ceil(text.byteLength / 4) * 4, binary = data.subarray(28 + jsonSize);
  const output = new Uint8Array(28 + padded + binary.byteLength), header = new DataView(output.buffer);
  header.setUint32(0, 0x46546c67, true); header.setUint32(4, 2, true); header.setUint32(8, output.byteLength, true);
  header.setUint32(12, padded, true); header.setUint32(16, 0x4e4f534a, true);
  output.fill(32, 20, 20 + padded); output.set(text, 20);
  header.setUint32(20 + padded, binary.byteLength, true); header.setUint32(24 + padded, 0x004e4942, true);
  output.set(binary, 28 + padded);
  expect(binary.equals(output.subarray(28 + padded))).toBe(true);
  return new GLTFLoader().parseAsync(output.buffer, '');
}

function instance(source: ReturnType<typeof admittedArt>, proxies = false) {
  // Object clones are independent while source BufferGeometry remains shared,
  // matching VehicleArtLibrary's ownership model.
  const root = source.root.clone(true), nodes = new Map<string, Object3D>(), meshes: Mesh[] = [];
  root.traverse(object => {
    nodes.set(object.name, object);
    if (object instanceof Mesh) meshes.push(object);
  });
  const prepass: Mesh[] = [];
  if (proxies) for (const mesh of meshes) {
    const proxy = new Mesh(mesh.geometry);
    proxy.name = `ImportedVehiclePrepass:${mesh.name}`;
    proxy.userData.inkstormRacerShadowExclude = true;
    mesh.add(proxy); prepass.push(proxy);
  }
  const cache = new WreckVisualPoseCache();
  cache.refresh(root, meshes, 1);
  const breakup = TeemtoWreckBreakup.create(root, nodes, meshes);
  expect(breakup, source.root.name || 'admitted Teemto hierarchy').not.toBeNull();
  return { root, nodes, meshes, cache, breakup: breakup!, prepass };
}

function nativeRace() {
  return new RaceSimulation({ terrain: { heightAt: sampleTerrainHeight }, seed: 1229867859,
    totalLaps: 1, countdownSeconds: 3, competitionProfile: 'time-trial' });
}

function advance(race: RaceSimulation, from: number, through: number) {
  for (let frame = from; frame <= through; frame++) race.step({ brake: 1, boost: frame >= 558 && frame <= 910 });
}

function transforms(root: Object3D) {
  const result = new Map<string, number[]>();
  root.traverse(object => result.set(object.name, [
    ...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray(), ...object.matrix.elements,
  ]));
  return result;
}

function poseValues(pose: WreckVisualPose): number[] {
  return [...pose.position.toArray(), pose.rotation.x, pose.rotation.y, pose.rotation.z,
    ...pose.center.toArray(), ...pose.forward.toArray(), pose.radius, pose.groundCorrection];
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const geometry of sourceGeometries) geometry.dispose();
  sourceGeometries.clear();
});

describe('admitted Teemto renderer-only engine breakup', () => {
  it.each(admittedNames)('%s activates after the installed GLTFLoader normalizes authored node names', async name => {
    const gltf = await loadActualGeometry(name);
    const library = new VehicleArtLibrary({ load: async () => gltf.scene });
    const presentation = new ImportedVehiclePresentation(library);
    try {
      expect(await presentation.setSource(name === 'teemto-rival' ? TEEMTO_ART_DEFINITIONS.rival : TEEMTO_ART_DEFINITIONS.hero)).toBe('ready');
      expect(presentation.getNode(rawEngineNames[0])).toBeUndefined();
      const engine = presentation.getNode(engineNames[0]!)!;
      expect(engine.name).toBe('teemto-engine-left001');
      const sourceEngine = gltf.scene.getObjectByName(engineNames[0]!)!;
      const rest = engine.matrix.clone();
      const race = nativeRace(); advance(race, 1, 970);
      const cache = new WreckVisualPoseCache(); cache.refresh(presentation, presentation.geometryMeshes, 1);
      const entry = race.state.entries[0]!;
      const pose = cache.update(entry.vehicle, entry.galactic!.wreck.timer, race.terrain);
      presentation.updateWreckBreakup(pose, entry.galactic!.wreck.timer, race.terrain);
      expect(presentation.wreckBreakupActive).toBe(true);
      expect(engine.matrix.equals(rest)).toBe(false);
      expect(sourceEngine.matrix.equals(rest)).toBe(true);
      presentation.resetWreckBreakup();
      expect(engine.matrix.equals(rest)).toBe(true);
    } finally { presentation.dispose(); library.dispose(); }
  });

  it.each(admittedNames)('%s preserves shared geometry, cockpit and pilot while instance engines and prepass children move', name => {
    const source = admittedArt(name), first = instance(source, true), second = instance(source);
    const sourceRest = transforms(source.root), firstRest = transforms(first.root), secondRest = transforms(second.root);
    const buffers = source.meshes.map(mesh => ({
      name: mesh.name, geometry: mesh.geometry, positions: Array.from(mesh.geometry.getAttribute('position').array),
      indices: Array.from(mesh.geometry.index!.array),
    }));
    const race = nativeRace(); advance(race, 1, 970);
    const entry = race.state.entries[0]!, raceBefore = JSON.stringify(race.state);
    const pose = first.cache.update(entry.vehicle, entry.galactic!.wreck.timer, race.terrain);
    const rigid = [...pose.position.toArray(), pose.rotation.x, pose.rotation.y, pose.rotation.z,
      ...pose.forward.toArray(), pose.groundCorrection];
    first.breakup.update(pose, entry.galactic!.wreck.timer, race.terrain);
    first.root.updateMatrixWorld(true);
    expect(first.breakup.active).toBe(true);
    expect([...pose.position.toArray(), pose.rotation.x, pose.rotation.y, pose.rotation.z,
      ...pose.forward.toArray(), pose.groundCorrection]).toEqual(rigid);
    for (const engine of engineNames) expect(transforms(first.root).get(engine)).not.toEqual(firstRest.get(engine));
    for (const [nodeName, transform] of firstRest) {
      if (nodeName.includes('cockpit') || nodeName.includes('pilot')) expect(transforms(first.root).get(nodeName), nodeName).toEqual(transform);
    }
    for (const proxy of first.prepass) expect(proxy.matrixWorld.elements).toEqual(proxy.parent!.matrixWorld.elements);
    expect(transforms(source.root)).toEqual(sourceRest);
    expect(transforms(second.root)).toEqual(secondRest);
    expect(second.breakup.active).toBe(false);
    for (const original of buffers) {
      expect(first.meshes.find(mesh => mesh.name === original.name)!.geometry === original.geometry, original.name).toBe(true);
      expect(second.meshes.find(mesh => mesh.name === original.name)!.geometry === original.geometry, original.name).toBe(true);
      expect(Array.from(original.geometry.getAttribute('position').array)).toEqual(original.positions);
      expect(Array.from(original.geometry.index!.array)).toEqual(original.indices);
      expect(original.geometry.boundingBox).toBeNull();
      expect(original.geometry.boundingSphere).toBeNull();
    }
    expect(JSON.stringify(race.state)).toBe(raceBefore);
    first.breakup.reset();
    expect(first.breakup.active).toBe(false);
    expect(transforms(first.root)).toEqual(firstRest);
    first.breakup.reset();
    expect(transforms(first.root)).toEqual(firstRest);
  });

  it('opens its authored engine rotation envelope by .12 simulation seconds without an age-zero jump', () => {
    const art = instance(admittedArt('teemto-hero-open-v2'));
    const race = nativeRace(); advance(race, 1, 910);
    const state = race.state.entries[0]!.vehicle;
    const sample = (age: number) => {
      const remaining = WRECK_PRESENTATION_DURATION - age;
      const pose = art.cache.update(state, remaining, race.terrain);
      art.breakup.update(pose, remaining, race.terrain);
      return engineNames.map(name => art.nodes.get(name)!.quaternion.clone());
    };
    const before = JSON.stringify(race.state), birth = sample(0);
    expect(art.breakup.active).toBe(false);
    for (const rotation of birth) expect(rotation.toArray()).toEqual([0, 0, 0, 1]);
    const half = sample(.06), open = sample(.12), held = sample(.4);
    expect(art.breakup.active).toBe(true);
    for (let index = 0; index < open.length; index++) {
      expect(open[index]!.angleTo(held[index]!)).toBeLessThan(1e-7);
      expect(half[index]!.angleTo(birth[index]!)).toBeGreaterThan(.1);
      expect(half[index]!.angleTo(open[index]!)).toBeGreaterThan(.1);
    }
    expect(JSON.stringify(race.state)).toBe(before);
    art.breakup.reset();
    for (const name of engineNames) expect(art.nodes.get(name)!.quaternion.toArray()).toEqual([0, 0, 0, 1]);
  });

  it('has exact intact endpoints, deterministic random-access ages and attachment matrices without runtime geometry reads', () => {
    const art = instance(admittedArt('teemto-hero-open-v2'));
    const rest = transforms(art.root), intactRadius = art.cache.pose.radius;
    const race = nativeRace(); advance(race, 1, 970);
    const state = race.state.entries[0]!.vehicle;
    const update = (remaining: number, extrapolation = 0) => {
      const pose = art.cache.update(state, remaining, race.terrain, extrapolation);
      art.breakup.update(pose, remaining, race.terrain, extrapolation);
      return { pose: poseValues(pose), transforms: transforms(art.root) };
    };
    const birth = update(WRECK_PRESENTATION_DURATION);
    expect(birth.transforms).toEqual(rest);
    const middle = update(1.4);
    expect(update(1.4)).toEqual(middle);
    update(.2); update(1.9);
    expect(update(1.4)).toEqual(middle);
    for (const [attachment, group, point] of [
      ['exhaustLeft', engineNames[0], [-4.075, .178, 5.638]],
      ['exhaustRight', engineNames[1], [4.025, .178, 5.638]],
      ['couplingLeft', engineNames[0], [-1.3, 3.238, 18.941]],
      ['couplingRight', engineNames[1], [1.325, 3.238, 18.941]],
    ] as const) {
      const actual = new Vector3(...point), expected = actual.clone().applyMatrix4(art.nodes.get(group)!.matrix);
      art.breakup.transformAttachment(attachment, actual);
      expect(actual.toArray()).toEqual(expected.toArray());
    }
    const pilot = new Vector3(0, 2.2, -5.2);
    art.breakup.transformAttachment('pilot', pilot);
    expect(pilot.toArray()).toEqual([0, 2.2, -5.2]);
    // With the same already-resolved body pose, a fractional tick and an equal
    // explicit event age must produce the same independently grounded parts.
    // Vehicle-position extrapolation itself belongs to WreckVisualPoseCache.
    const fixed = update(1.39).transforms;
    const sameBodyPose = art.cache.update(state, 1.39, race.terrain);
    art.breakup.update(sameBodyPose, 1.4, race.terrain, .01);
    const extrapolated = transforms(art.root);
    for (const engine of engineNames) {
      const expected = fixed.get(engine)!, actual = extrapolated.get(engine)!;
      for (let value = 0; value < expected.length; value++) expect(actual[value]).toBeCloseTo(expected[value]!, 10);
    }
    update(.7);
    const recovered = update(0);
    expect(recovered.transforms).toEqual(rest);
    expect(art.breakup.active).toBe(false);
    expect(art.cache.pose.radius).toBeCloseTo(intactRadius, 12);
    expect(update(WRECK_PRESENTATION_DURATION)).toEqual(birth);
    const readSpies = art.meshes.map(mesh => vi.spyOn(mesh.geometry, 'getAttribute').mockImplementation(() => {
      throw new Error('Breakup update read a source vertex stream after preparation');
    }));
    const traversal = vi.spyOn(art.root, 'traverse').mockImplementation(() => {
      throw new Error('Breakup update traversed the source hierarchy after preparation');
    });
    for (const remaining of [2.15, 2, 1.4, .7, .1, 0, 1.4]) {
      const pose = art.cache.update(state, remaining, race.terrain);
      art.breakup.update(pose, remaining, race.terrain);
    }
    expect(traversal).not.toHaveBeenCalled();
    for (const spy of readSpies) expect(spy).not.toHaveBeenCalled();
  });

  it('keeps every actual hero and rival vertex above native terrain and inside the dynamic camera sphere', () => {
    const art = admittedNames.map(name => ({ name, ...instance(admittedArt(name)) }));
    const measurements = art.map(item => ({ name: item.name, samples: 0,
      minimumFullVertexGap: Infinity, maximumActiveCameraRadius: 0, maximumExtraSupportQueries: 0 }));
    const race = nativeRace(), sample = new Vector3();
    const checkFrames = new Set([...Array.from({ length: 21 }, (_, index) => 910 + index * 12), 943, 975, 1010, 1070, 1153]);
    for (let frame = 1; frame <= 1153; frame++) {
      advance(race, frame, frame);
      if (!checkFrames.has(frame)) continue;
      const entry = race.state.entries[0]!, before = JSON.stringify(race.state);
      for (let index = 0; index < art.length; index++) {
        const item = art[index]!, measurement = measurements[index]!;
        const remaining = entry.galactic!.wreck.timer;
        const pose = item.cache.update(entry.vehicle, remaining, race.terrain);
        let extraQueries = 0;
        item.breakup.update(pose, remaining, { heightAt: (x, z) => {
          extraQueries++; return race.terrain.heightAt(x, z);
        } });
        item.root.updateMatrixWorld(true);
        let minimumGap = Infinity, maximumRadius = 0;
        for (const mesh of item.meshes) {
          const positions = mesh.geometry.getAttribute('position');
          for (let vertex = 0; vertex < positions.count; vertex++) {
            sample.fromBufferAttribute(positions, vertex).applyMatrix4(mesh.matrixWorld).applyEuler(pose.rotation).add(pose.position);
            minimumGap = Math.min(minimumGap, sample.y - race.terrain.heightAt(sample.x, sample.z));
            maximumRadius = Math.max(maximumRadius, sample.distanceTo(pose.center));
          }
        }
        expect(minimumGap, `${item.name} frame ${frame} terrain clearance`).toBeGreaterThanOrEqual(0);
        expect(maximumRadius, `${item.name} frame ${frame} camera envelope`).toBeLessThanOrEqual(pose.radius + 1e-6);
        measurement.samples++;
        measurement.minimumFullVertexGap = Math.min(measurement.minimumFullVertexGap, minimumGap);
        if (item.breakup.active) measurement.maximumActiveCameraRadius = Math.max(measurement.maximumActiveCameraRadius, pose.radius);
        measurement.maximumExtraSupportQueries = Math.max(measurement.maximumExtraSupportQueries, extraQueries);
      }
      expect(JSON.stringify(race.state)).toBe(before);
    }
    console.info('Admitted Teemto breakup geometric measurements:', JSON.stringify(measurements));
  }, 30_000);

  it('refuses incomplete or transformed source contracts before touching instance transforms', () => {
    const art = instance(admittedArt('teemto-hero-open-v2'));
    const before = transforms(art.root);
    const missingGroup = new Map(art.nodes); missingGroup.delete(engineNames[0]);
    expect(TeemtoWreckBreakup.create(art.root, missingGroup, art.meshes)).toBeNull();
    expect(TeemtoWreckBreakup.create(art.root, art.nodes,
      art.meshes.filter(mesh => mesh.name !== 'teemto-engine-left-body'))).toBeNull();
    expect(transforms(art.root)).toEqual(before);
    art.root.position.x = 1;
    expect(TeemtoWreckBreakup.create(art.root, art.nodes, art.meshes)).toBeNull();
    art.root.position.x = 0; art.root.updateMatrix();
    const left = art.nodes.get(engineNames[0])!;
    left.rotation.z = .1;
    expect(TeemtoWreckBreakup.create(art.root, art.nodes, art.meshes)).toBeNull();
  });
});
