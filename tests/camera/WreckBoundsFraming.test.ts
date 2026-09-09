import { BufferGeometry, Float32BufferAttribute, Group, Matrix4, Mesh, Object3D, PropertyBinding, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CinematicCamera, type CameraSubject } from '../../src/camera/CinematicCamera';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { vehicleChaseClearance } from '../../src/game/vehicleAppearance';
import { TeemtoWreckBreakup } from '../../src/render/combat/TeemtoWreckBreakup';
import { WRECK_PRESENTATION_DURATION, WreckVisualPoseCache, type WreckVisualPose } from '../../src/render/combat/WreckVisualPose';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const fileModule: string = 'node:fs';
const { readFileSync } = await import(/* @vite-ignore */ fileModule);
const admittedNames = ['teemto-hero-open-v2', 'sebulba-hero', 'polwo-hero-v1', 'blockrunner-hero-v1'] as const;
type AdmittedName = typeof admittedNames[number];
interface AdmittedArt { root: Group; meshes: Mesh[] }
const admitted = new Map<AdmittedName, AdmittedArt>();
const aspects = [1440 / 900, 16 / 9, 390 / 844, 844 / 390] as const;
const epsilon = 1e-6;

function collect(root: Group): AdmittedArt {
  const meshes: Mesh[] = [];
  root.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
  root.updateMatrixWorld(true);
  return { root, meshes };
}

async function loadActualTeemto(): Promise<AdmittedArt> {
  const data = readFileSync('public/assets/inkstorm/vehicles/teemto-hero-open-v2.glb');
  const jsonSize = data.readUInt32LE(12), json = JSON.parse(data.subarray(20, 20 + jsonSize).toString());
  // Only material/image references are removed from this in-memory GLB. The
  // installed loader receives the original node names, hierarchy, primitives,
  // accessors and byte-identical BIN. This does not test texture decoding.
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
  const gltf = await new GLTFLoader().parseAsync(output.buffer, '');
  return collect(gltf.scene);
}

function readAdmittedPositions(name: AdmittedName): AdmittedArt {
  const data = readFileSync(`public/assets/inkstorm/vehicles/${name}.glb`);
  const jsonSize = data.readUInt32LE(12), gltf = JSON.parse(data.subarray(20, 20 + jsonSize).toString());
  const binary = data.subarray(28 + jsonSize), objects: Object3D[] = [];
  for (const node of gltf.nodes) {
    let object: Object3D;
    if (node.mesh === undefined) object = new Group();
    else {
      const primitives = gltf.meshes[node.mesh].primitives;
      expect(primitives).toHaveLength(1);
      const accessor = gltf.accessors[primitives[0].attributes.POSITION], view = gltf.bufferViews[accessor.bufferView];
      expect([accessor.componentType, accessor.type, accessor.sparse]).toEqual([5126, 'VEC3', undefined]);
      const values = new Float32Array(accessor.count * 3);
      for (let vertex = 0; vertex < accessor.count; vertex++) {
        const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + vertex * (view.byteStride ?? 12);
        for (let axis = 0; axis < 3; axis++) values[vertex * 3 + axis] = binary.readFloatLE(offset + axis * 4);
      }
      object = new Mesh(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(values, 3)));
    }
    object.name = PropertyBinding.sanitizeNodeName(node.name ?? '');
    if (node.matrix) { object.matrix.fromArray(node.matrix); object.matrix.decompose(object.position, object.quaternion, object.scale); }
    if (node.translation) object.position.fromArray(node.translation);
    if (node.rotation) object.quaternion.fromArray(node.rotation);
    if (node.scale) object.scale.fromArray(node.scale);
    objects.push(object);
  }
  for (let index = 0; index < gltf.nodes.length; index++) {
    for (const child of gltf.nodes[index].children ?? []) objects[index]!.add(objects[child]!);
  }
  const root = new Group();
  for (const node of gltf.scenes[gltf.scene ?? 0].nodes) root.add(objects[node]!);
  return collect(root);
}

function fixture(name: AdmittedName, articulated = false) {
  const art = collect(admitted.get(name)!.root.clone(true));
  const nodes = new Map<string, Object3D>();
  art.root.traverse(object => nodes.set(object.name, object));
  const cache = new WreckVisualPoseCache();
  cache.refresh(art.root, art.meshes, 1);
  const breakup = articulated ? TeemtoWreckBreakup.create(art.root, nodes, art.meshes) : null;
  if (articulated) expect(breakup, 'Installed-loader Teemto must activate, not silently use the rigid fallback').not.toBeNull();
  return { ...art, cache, breakup };
}

function nativeRace() {
  return new RaceSimulation({ terrain: { heightAt: sampleTerrainHeight }, seed: 1229867859,
    totalLaps: 1, countdownSeconds: 3, competitionProfile: 'time-trial' });
}

function step(race: RaceSimulation, frame: number) {
  race.step({ brake: 1, boost: frame >= 558 && frame <= 910 });
}

function subjectFor(race: RaceSimulation, pose: WreckVisualPose): CameraSubject {
  const vehicle = race.state.entries[0]!.vehicle;
  return { position: new Vector3(vehicle.position.x, vehicle.position.y, vehicle.position.z),
    forward: new Vector3(Math.sin(vehicle.orientation.yaw), 0, Math.cos(vehicle.orientation.yaw)),
    velocity: new Vector3(vehicle.velocity.x, vehicle.velocity.y, vehicle.velocity.z), speed: 0,
    combatFocus: pose.center, combatForward: pose.forward, combatRadius: pose.radius,
    combatBounds: pose.bounds, combatTerrain: race.terrain };
}

interface Extent { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number; count: number }
function extent(): Extent {
  return { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity,
    minZ: Infinity, maxZ: -Infinity, count: 0 };
}
function include(output: Extent, point: Vector3): void {
  output.minX = Math.min(output.minX, point.x); output.maxX = Math.max(output.maxX, point.x);
  output.minY = Math.min(output.minY, point.y); output.maxY = Math.max(output.maxY, point.y);
  output.minZ = Math.min(output.minZ, point.z); output.maxZ = Math.max(output.maxZ, point.z);
  output.count++;
}
function assertSafe(output: Extent, label: string): void {
  expect(Object.values(output).every(Number.isFinite), `${label}: finite source projection`).toBe(true);
  expect(output.count, label).toBeGreaterThan(0);
  expect(output.minX, `${label}: left caption/matte-safe edge`).toBeGreaterThanOrEqual(-.78 - epsilon);
  expect(output.maxX, `${label}: right caption/matte-safe edge`).toBeLessThanOrEqual(.78 + epsilon);
  expect(output.minY, `${label}: bottom caption-safe edge`).toBeGreaterThanOrEqual(-.58 - epsilon);
  expect(output.maxY, `${label}: top matte-safe edge`).toBeLessThanOrEqual(.70 + epsilon);
  expect(output.minZ, `${label}: in front of near plane`).toBeGreaterThan(-1);
  expect(output.maxZ, `${label}: inside far plane`).toBeLessThan(1);
}
function projectedBounds(rig: CinematicCamera, bounds: readonly Vector3[]): Extent {
  rig.camera.updateMatrixWorld(true);
  const output = extent(), point = new Vector3();
  for (const bound of bounds) include(output, point.copy(bound).project(rig.camera));
  return output;
}
function projectedSource(rig: CinematicCamera, art: AdmittedArt, pose: WreckVisualPose): Extent {
  rig.camera.updateMatrixWorld(true); art.root.updateMatrixWorld(true);
  const output = extent(), point = new Vector3();
  const body = new Matrix4().compose(pose.position, new Quaternion().setFromEuler(pose.rotation), new Vector3(1, 1, 1));
  const viewProjection = new Matrix4().multiplyMatrices(rig.camera.projectionMatrix, rig.camera.matrixWorldInverse);
  const modelProjection = new Matrix4();
  for (const mesh of art.meshes) {
    modelProjection.copy(viewProjection).multiply(body).multiply(mesh.matrixWorld);
    const positions = mesh.geometry.getAttribute('position');
    // Every source POSITION is tested, including vertices unused by an index.
    // No guessed collider, sampled hull or prior screenshot box substitutes.
    for (let index = 0; index < positions.count; index++) {
      include(output, point.fromBufferAttribute(positions, index).applyMatrix4(modelProjection));
    }
  }
  return output;
}

beforeAll(async () => {
  admitted.set('teemto-hero-open-v2', await loadActualTeemto());
  for (const name of admittedNames.slice(1)) admitted.set(name, readAdmittedPositions(name));
});

afterAll(() => {
  const geometry = new Set<BufferGeometry>();
  for (const art of admitted.values()) for (const mesh of art.meshes) {
    geometry.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
  }
  for (const item of geometry) item.dispose();
});

describe('actual admitted wreck camera bounds', () => {
  it('loads complete source POSITION streams and the installed Teemto node spelling', () => {
    const expected = [73048, 60558, 75831, 67740];
    for (const [index, name] of admittedNames.entries()) {
      const art = admitted.get(name)!;
      expect(art.meshes.reduce((sum, mesh) => sum + mesh.geometry.getAttribute('position').count, 0), name).toBe(expected[index]);
      const cache = new WreckVisualPoseCache();
      cache.refresh(art.root, art.meshes, 1);
      expect(cache.localBounds.isEmpty(), name).toBe(false);
    }
    const root = admitted.get('teemto-hero-open-v2')!.root;
    expect(root.getObjectByName('teemto-engine-left.001')).toBeUndefined();
    expect(root.getObjectByName('teemto-engine-left001')?.parent).toBe(root);
    expect(root.getObjectByName('teemto-engine-right001')?.parent).toBe(root);
  });

  it('fits every admitted source POSITION and cached corner through native wreck ages at all four aspect ratios', () => {
    // All families use the real Teemto input/terrain trajectory as a geometric
    // substitution. This is not independent driving evidence for the other rigs.
    const variants = [...admittedNames.map(name => ({ name, articulated: false })),
      { name: 'teemto-hero-open-v2' as const, articulated: true }];
    const frames = new Set([...Array.from({ length: 22 }, (_, index) => 910 + index * 12), 943, 975, 1010, 1070, 1153, 1168]);
    const measurements = new Map<string, { samples: number; minimumWidthFraction: number; maximumWidthFraction: number;
      minimumHeightFraction: number; maximumHeightFraction: number; minimumWidthFrame: number; maximumWidthFrame: number;
      belowDesiredWidthFrames: number[]; aboveDesiredWidthFrames: number[]; projectedSourcePositions: number;
      checkpoints: { frame: number; widthFraction: number; heightFraction: number }[] }>();
    for (const variant of variants) {
      const art = fixture(variant.name, variant.articulated), race = nativeRace();
      const rigs = aspects.map(aspect => { const rig = new CinematicCamera(); rig.camera.aspect = aspect; return rig; });
      try {
        for (let frame = 1; frame <= 1168; frame++) {
          step(race, frame);
          if (!frames.has(frame)) continue;
          const entry = race.state.entries[0]!, before = JSON.stringify(race.state);
          const pose = art.cache.update(entry.vehicle, entry.galactic!.wreck.timer, race.terrain);
          art.breakup?.update(pose, entry.galactic!.wreck.timer, race.terrain);
          expect(pose.bounds).toHaveLength(art.breakup?.active ? 24 : 8);
          const subject = subjectFor(race, pose), boundsBefore = pose.bounds.map(point => point.toArray());
          for (const [index, rig] of rigs.entries()) for (const mode of ['side', 'chase'] as const) {
            rig.setMode(mode); rig.setCombatFraming(mode === 'side'); subject.wreckChase = mode === 'chase';
            rig.snap(subject);
            const label = `${variant.name}/${variant.articulated ? 'separating' : 'rigid'}/${frame}/${aspects[index]}/${mode}`;
            assertSafe(projectedBounds(rig, pose.bounds), `${label}/cached-corners`);
            const source = projectedSource(rig, art, pose);
            assertSafe(source, `${label}/all-POSITION`);
            if (mode === 'side') {
              const key = `${variant.name}/${variant.articulated ? 'separating' : 'rigid'}/${aspects[index]}`;
              const measurement = measurements.get(key) ?? { samples: 0, minimumWidthFraction: Infinity, maximumWidthFraction: -Infinity,
                minimumHeightFraction: Infinity, maximumHeightFraction: -Infinity, minimumWidthFrame: frame, maximumWidthFrame: frame,
                belowDesiredWidthFrames: [], aboveDesiredWidthFrames: [], projectedSourcePositions: 0, checkpoints: [] };
              const width = (source.maxX - source.minX) / 2, height = (source.maxY - source.minY) / 2;
              if (width < measurement.minimumWidthFraction) measurement.minimumWidthFrame = frame;
              if (width > measurement.maximumWidthFraction) measurement.maximumWidthFrame = frame;
              measurement.minimumWidthFraction = Math.min(measurement.minimumWidthFraction, width);
              measurement.maximumWidthFraction = Math.max(measurement.maximumWidthFraction, width);
              measurement.minimumHeightFraction = Math.min(measurement.minimumHeightFraction, height);
              measurement.maximumHeightFraction = Math.max(measurement.maximumHeightFraction, height);
              measurement.samples++; measurement.projectedSourcePositions += source.count;
              measurement.checkpoints.push({ frame, widthFraction: width, heightFraction: height });
              if (width < .65) measurement.belowDesiredWidthFrames.push(frame);
              if (width > .80) measurement.aboveDesiredWidthFrames.push(frame);
              measurements.set(key, measurement);
            }
            expect(rig.camera.position.y - race.terrain.heightAt(rig.camera.position.x, rig.camera.position.z), `${label}/eye-above-terrain`).toBeGreaterThan(0);
          }
          expect(pose.bounds.map(point => point.toArray())).toEqual(boundsBefore);
          expect(JSON.stringify(race.state)).toBe(before);
        }
      } finally { for (const rig of rigs) rig.dispose(); art.breakup?.reset(); }
    }
    // Width is a separate composition finding from successful containment.
    // Report misses against the desired 65–80% viewport width without hiding
    // them behind the geometric safe-edge pass or changing that art target.
    console.info('Admitted wreck side-camera source projection measurements:', JSON.stringify({
      desiredWidthFraction: [.65, .80], checkpointCountPerVariantAndAspect: frames.size,
      sourceProjectionScope: 'Every admitted POSITION at 28 actual-terrain trajectory checkpoints; side view only in these width measurements.',
      heldShotSubsetScope: 'Checkpoint frames910–943 cover birth through approximately the native side-cut age; later side snapshots are additional fit stress coverage, not native video measurements.',
      measurements: Object.fromEntries(measurements),
    }));
  }, 30_000);

  it('keeps dynamic separating geometry inside safe edges through the live spring and intact recovery reset', () => {
    for (const aspect of aspects) {
      const art = fixture('teemto-hero-open-v2', true), race = nativeRace();
      const rig = new CinematicCamera(); rig.camera.aspect = aspect;
      try {
        for (let frame = 1; frame <= 1181; frame++) {
          step(race, frame);
          if (frame < 910) continue;
          const entry = race.state.entries[0]!, recovering = entry.galactic!.wreck.phase !== 'wrecked';
          // The recovery checkpoint resolves the intact pose, without replaying
          // a second tumble. Sequential updates exercise actual spring safety;
          // these CPU ticks do not claim recorded wall-clock or video cadence.
          const remaining = recovering ? WRECK_PRESENTATION_DURATION : entry.galactic!.wreck.timer;
          const pose = art.cache.update(entry.vehicle, remaining, race.terrain);
          art.breakup!.update(pose, remaining, race.terrain);
          const subject = subjectFor(race, pose);
          subject.wreckChase = frame > 943; subject.wreckRecovery = recovering;
          rig.setMode(subject.wreckChase ? 'chase' : 'side');
          rig.setCombatFraming(!subject.wreckChase);
          if (frame === 910) rig.snap(subject);
          else rig.update(1 / 120, frame / 120, subject);
          const label = `sequential/${aspect}/${frame}/${recovering ? 'intact-recovery' : 'wreck'}`;
          assertSafe(projectedBounds(rig, pose.bounds), `${label}/cached-corners`);
          if (frame % 12 === 0 || [910, 943, 944, 1168, 1169, 1181].includes(frame)) {
            assertSafe(projectedSource(rig, art, pose), `${label}/all-POSITION`);
          }
          if (recovering) expect(art.breakup!.active).toBe(false);
        }
      } finally { rig.dispose(); art.breakup!.reset(); }
    }
  }, 30_000);

  it('cuts completed recovery directly to ordinary chase and retains exact moving-camera behavior for every admitted family', () => {
    const race = nativeRace();
    for (let frame = 1; frame <= 910; frame++) step(race, frame);
    const stateBefore = JSON.stringify(race.state);
    for (const name of admittedNames) for (const aspect of aspects) {
      const art = fixture(name), rig = new CinematicCamera(), baseline = new CinematicCamera();
      rig.camera.aspect = baseline.camera.aspect = aspect;
      try {
        // Current intact geometry frames the protected recovery eye. The game
        // switches at actual running, before removing its armed recovery flag.
        const pose = art.cache.update(race.state.entries[0]!.vehicle, WRECK_PRESENTATION_DURATION, race.terrain);
        const recovery = subjectFor(race, pose);
        recovery.wreckChase = true; recovery.wreckRecovery = true;
        recovery.combatImpactPosition = pose.center.clone().add(new Vector3(5, 0, 8));
        rig.setMode('chase'); rig.snap(recovery);
        for (let tick = 0; tick < 18; tick++) rig.update(1 / 60, tick / 60, recovery);
        const ordinary: CameraSubject = {
          position: recovery.position.clone(), forward: recovery.forward.clone(),
          velocity: new Vector3(), speed: 0,
          chaseClearance: vehicleChaseClearance(name === 'blockrunner-hero-v1' ? 'blockrunner' : name === 'polwo-hero-v1' ? 'polwo' : name === 'sebulba-hero' ? 'sebulba' : 'teemto'),
          routeLookAhead: recovery.position.clone().add(new Vector3(8, -4, 120)),
          junctionLookAhead: recovery.position.clone().add(new Vector3(-15, 0, 150)), junctionWeight: .45,
        };
        const recoveredEye = rig.camera.position.clone();
        baseline.snap(ordinary);
        // A normal update from the protected eye is not the ordinary endpoint:
        // this is the interpolation path that the phase-boundary cut removes.
        rig.update(1 / 60, 1, ordinary);
        expect(rig.camera.position.distanceTo(baseline.camera.position), `${name}/${aspect}/old spring displacement`).toBeGreaterThan(1);
        expect(recoveredEye.distanceTo(baseline.camera.position)).toBeGreaterThan(1);
        rig.snap(ordinary);
        for (let tick = 0; tick <= 30; tick++) {
          if (tick > 0) {
            ordinary.speed = tick * 7;
            ordinary.velocity.copy(ordinary.forward).multiplyScalar(ordinary.speed);
            ordinary.position.addScaledVector(ordinary.velocity, 1 / 60);
            rig.update(1 / 60, 1 + tick / 60, ordinary);
            baseline.update(1 / 60, 1 + tick / 60, ordinary);
          }
          expect(rig.camera.position.toArray(), `${name}/${aspect}/${tick}/position`).toEqual(baseline.camera.position.toArray());
          expect(rig.camera.quaternion.toArray(), `${name}/${aspect}/${tick}/rotation`).toEqual(baseline.camera.quaternion.toArray());
          expect(rig.camera.fov).toBe(baseline.camera.fov);
          if (tick === 0) {
            // Preserve ordinary source composition rather than hiding this
            // transition with an enlarged all-race camera envelope.
            expect(projectedSource(rig, art, pose)).toEqual(projectedSource(baseline, art, pose));
          }
        }
      } finally { rig.dispose(); baseline.dispose(); }
    }
    expect(JSON.stringify(race.state)).toBe(stateBefore);
  });

  it('uses valid bounds independently of radius and ignores stale bounds outside protected combat views', () => {
    const art = fixture('teemto-hero-open-v2', true), race = nativeRace();
    for (let frame = 1; frame <= 970; frame++) step(race, frame);
    const entry = race.state.entries[0]!;
    const pose = art.cache.update(entry.vehicle, entry.galactic!.wreck.timer, race.terrain);
    art.breakup!.update(pose, entry.galactic!.wreck.timer, race.terrain);
    const a = new CinematicCamera(), b = new CinematicCamera(), subject = subjectFor(race, pose);
    try {
      for (const aspect of aspects) for (const mode of ['side', 'chase'] as const) {
        a.camera.aspect = b.camera.aspect = aspect;
        a.setMode(mode); b.setMode(mode); a.setCombatFraming(mode === 'side'); b.setCombatFraming(mode === 'side');
        a.snap({ ...subject, wreckChase: mode === 'chase', combatRadius: 1 });
        b.snap({ ...subject, wreckChase: mode === 'chase', combatRadius: 1000 });
        expect(a.camera.position.toArray()).toEqual(b.camera.position.toArray());
        expect(a.camera.quaternion.toArray()).toEqual(b.camera.quaternion.toArray());
        expect(a.camera.fov).toBe(b.camera.fov);
      }
      const ordinary = { position: subject.position, forward: subject.forward, velocity: subject.velocity, speed: subject.speed };
      a.setCombatFraming(false); b.setCombatFraming(false);
      for (const mode of ['side', 'chase', 'cockpit', 'hero'] as const) for (const highlight of [false, true]) {
        a.setMode(mode); b.setMode(mode); a.setHighlightFraming(highlight); b.setHighlightFraming(highlight);
        a.snap({ ...subject, combatRadius: 1000, combatBounds: [new Vector3(1e6, -1e6, 1e6)] });
        b.snap(ordinary);
        expect(a.camera.position.toArray()).toEqual(b.camera.position.toArray());
        expect(a.camera.quaternion.toArray()).toEqual(b.camera.quaternion.toArray());
        expect(a.camera.fov).toBe(b.camera.fov);
      }
    } finally { a.dispose(); b.dispose(); art.breakup!.reset(); }
  });

  it('keeps finite legacy fallback framing when bounds are absent, empty or nonfinite', () => {
    const rig = new CinematicCamera();
    try {
      for (const combatBounds of [undefined, [], [new Vector3(Number.NaN, 0, 0)], [new Vector3(0, Infinity, 0)]]) {
        for (const aspect of aspects) for (const mode of ['side', 'chase'] as const) {
          rig.camera.aspect = aspect; rig.setMode(mode); rig.setCombatFraming(mode === 'side');
          const subject: CameraSubject = { position: new Vector3(20, 3, -10), forward: new Vector3(0, 0, 1),
            velocity: new Vector3(), speed: 0, combatFocus: new Vector3(20, 5, 0),
            combatForward: new Vector3(0, 0, 1), combatRadius: 17, combatBounds, wreckChase: mode === 'chase' };
          rig.snap(subject); rig.update(1 / 60, 1, subject);
          expect([...rig.camera.position.toArray(), ...rig.camera.quaternion.toArray(), rig.camera.fov].every(Number.isFinite)).toBe(true);
        }
      }
    } finally { rig.dispose(); }
  });
});
