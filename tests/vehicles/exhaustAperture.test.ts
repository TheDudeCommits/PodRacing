import apertureJson from './fixtures/blockrunner-exhaust/aperture-measurements.json?raw';
import apertureDefinitionJson from './fixtures/blockrunner-exhaust/blockrunner-aperture.example.json?raw';
import {
  BoxGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Plane, Vector3,
  type ShaderMaterial,
} from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { RacerPresentation as CandidateRacer } from '../../src/render/vehicles/RacerPresentation';
import { ImportedVehiclePresentation, type VehicleArtDefinition } from '../../src/render/vehicles/ImportedVehiclePresentation';
import { VehicleArtLibrary } from '../../src/render/vehicles/VehicleArtLibrary';
import { POLWO_ART_DEFINITIONS, SEBULBA_ART_DEFINITIONS, TEEMTO_ART_DEFINITIONS } from '../../src/game/vehicleAppearance';
import type { PodracerPose } from '../../src/render/objects/PodracerView';

function assertEnvelope(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}
const measured = JSON.parse(apertureJson) as {
  apertures: { center: [number, number, number]; innerPolygon: [number, number, number][]; measuredInscribedRadius: number }[];
};
const example = JSON.parse(apertureDefinitionJson) as {
  exhaustApertureRadius: number;
  attachments: NonNullable<VehicleArtDefinition['attachments']>;
};
const basePose: PodracerPose = {
  x: 37, y: 8, z: -29, yaw: .47, pitch: .23, roll: -.31,
  steer: .3, throttle: 0, speed: 0, boost: 0, damage: .2,
};
const owned: { dispose(): void }[] = [];
afterEach(() => { for (const object of owned.splice(0).reverse()) object.dispose(); });
function fixture() {
  const root = new Group();
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
  mesh.name = 'candidate-fixture-body'; root.add(mesh); return root;
}
function library(load: () => Promise<Group> = async () => fixture()) {
  const result = new VehicleArtLibrary({ load, maxIdleEntries: 0 }); owned.push(result); return result;
}
function flameMeshes(racer: Group) {
  return racer.getObjectsByProperty('name', 'imported-engine-exhaust') as Mesh<import('three').BufferGeometry, ShaderMaterial>[];
}
async function racer(index = 0, appearance: 'teemto' | 'sebulba' | 'polwo' = 'polwo') {
  const value = new CandidateRacer(library(), undefined, index);
  owned.push(value); value.setVehicleClass('podracer'); await value.setAppearance(appearance); return value;
}
function definition(radius: unknown = example.exhaustApertureRadius): VehicleArtDefinition {
  return { ...POLWO_ART_DEFINITIONS.hero, attachments: example.attachments, exhaustApertureRadius: radius } as VehicleArtDefinition;
}

describe('opt-in aperture contract: source geometry evidence', () => {
  it('keeps every transformed cone boundary inside both actual source polygons and the declared clear circle, including unbounded redline input', async () => {
    const value = await racer() as CandidateRacer;
    expect(await value.imported.setSource(definition())).toBe('ready');
    const carrier = new Group(); carrier.position.set(-13, 17, 23); carrier.rotation.set(.18, -.63, .11);
    carrier.scale.set(1.3, .8, 1.2); carrier.add(value);
    const flames = flameMeshes(value);
    expect(flames).toHaveLength(2);
    const identities = flames.map(f => ({ geometry: f.geometry, material: f.material, scale: f.scale, position: f.position }));
    const cases = [
      { label: 'idle', pose: basePose, time: 0 },
      { label: 'boost', pose: { ...basePose, throttle: 1, speed: 230, boost: 1 }, time: .217 },
      { label: 'maximum-redline', pose: { ...basePose, throttle: 1, speed: 230, boost: 1, redline: 1.2 }, time: Math.PI / 36 },
      { label: 'unbounded-finite-inputs', pose: { ...basePose, throttle: Number.MAX_VALUE, speed: Number.MAX_VALUE, boost: Number.MAX_VALUE, redline: Number.MAX_VALUE }, time: Math.PI / 36 },
      { label: 'infinite-redline', pose: { ...basePose, throttle: 1, speed: 230, boost: 1, redline: Infinity }, time: Math.PI / 36 },
      { label: 'negative-redline', pose: { ...basePose, redline: -Infinity }, time: Math.PI / 36 },
      ...Array.from({ length: 361 }, (_, i) => ({ label: `pulse-${i}`, pose: { ...basePose, throttle: 1, speed: 230, boost: 1, redline: Number.MAX_VALUE }, time: i / 360 * Math.PI / 9 })),
    ];
    let globalMax = 0, maxPlaneError = 0, sourceEdgeClearance = Infinity;
    for (const sample of cases) {
      const original = { ...sample.pose };
      value.update(sample.pose, sample.time); carrier.updateMatrixWorld(true);
      expect(sample.pose).toEqual(original);
      const inverseRoot = new Matrix4().copy(value.matrixWorld).invert();
      let caseRadius = 0, axialLength = 0;
      for (let side = 0; side < flames.length; side++) {
        const flame = flames[side]!, aperture = measured.apertures[side]!;
        const vertices = flame.geometry.getAttribute('position');
        let baseY = Infinity;
        for (let i = 0; i < vertices.count; i++) baseY = Math.min(baseY, vertices.getY(i));
        const center = new Vector3().fromArray(aperture.center);
        const worldPlane = new Plane().setFromNormalAndCoplanarPoint(new Vector3(0, 0, -1), center).applyMatrix4(value.matrixWorld);
        const worldCenter = center.clone().applyMatrix4(value.matrixWorld);
        const actualBaseCenter = new Vector3(0, baseY, 0).applyMatrix4(flame.matrixWorld);
        expect(actualBaseCenter.distanceTo(worldCenter)).toBeLessThan(1e-12);
        for (let i = 0; i < vertices.count; i++) {
          const world = new Vector3().fromBufferAttribute(vertices, i).applyMatrix4(flame.matrixWorld);
          const rootPoint = world.clone().applyMatrix4(inverseRoot);
          const radius = Math.hypot(rootPoint.x - center.x, rootPoint.y - center.y);
          caseRadius = Math.max(caseRadius, radius);
          // These are measured mesh vertices, independent of the scale formula.
          assertEnvelope(radius <= example.exhaustApertureRadius, 'Actual transformed cone escapes the declared circular aperture');
          assertEnvelope(rootPoint.z - center.z < 1e-12, 'Actual transformed cone protrudes ahead of the source anchor plane');
          axialLength = Math.max(axialLength, center.z - rootPoint.z);
          if (vertices.getY(i) === baseY) {
            maxPlaneError = Math.max(maxPlaneError, Math.abs(worldPlane.distanceToPoint(world)));
            assertEnvelope(Math.abs(worldPlane.distanceToPoint(world)) < 1e-12, 'Actual cap vertex leaves the transformed aperture plane');
          }
          for (let edge = 0; edge < aperture.innerPolygon.length; edge++) {
            const a = aperture.innerPolygon[edge]!, b = aperture.innerPolygon[(edge + 1) % aperture.innerPolygon.length]!;
            const ex = b[0] - a[0], ey = b[1] - a[1];
            const clearance = (ex * (rootPoint.y - a[1]) - ey * (rootPoint.x - a[0])) / Math.hypot(ex, ey);
            sourceEdgeClearance = Math.min(sourceEdgeClearance, clearance);
            assertEnvelope(clearance > 0, 'Actual cone boundary intersects an authored inner polygon edge');
          }
        }
        const source = value.procedural.getObjectsByProperty('name', 'engine-exhaust')[side] as Mesh;
        expect(flame.scale.y).toBe(source.scale.y); // unchanged procedural axial animation
        expect(flame.geometry).toBe(identities[side]!.geometry);
        expect(flame.material).toBe(identities[side]!.material);
        expect(flame.position).toBe(identities[side]!.position);
        expect(flame.scale).toBe(identities[side]!.scale);
      }
      globalMax = Math.max(globalMax, caseRadius);
    }
    expect(globalMax).toBeGreaterThan(.33999); // prevents a zero/suppressed-flame false pass
    expect(sourceEdgeClearance).toBeGreaterThan(.0017);
    expect(maxPlaneError).toBeLessThan(1e-12);
  });

  it.each([
    ['teemto', TEEMTO_ART_DEFINITIONS], ['sebulba', SEBULBA_ART_DEFINITIONS], ['polwo', POLWO_ART_DEFINITIONS],
  ] as const)('preserves %s hero and rival default flame values and shaders exactly', async (appearance, definitions) => {
    for (const index of [0, 1]) {
      expect(definitions[index ? 'rival' : 'hero']).not.toHaveProperty('exhaustApertureRadius');
      const candidate = await racer(index, appearance);
      for (const redline of [undefined, 0, .9, 1.2, Number.MAX_VALUE, Infinity]) {
        for (const time of [0, .117, (Math.PI / 2 - index) / 18, 21.43]) {
          const pose = { ...basePose, throttle: 1, speed: 320, boost: 1, redline };
          candidate.update(pose, time);
          const actual = flameMeshes(candidate);
          const procedural = candidate.procedural.getObjectsByProperty('name', 'engine-exhaust') as Mesh<import('three').BufferGeometry, ShaderMaterial>[];
          for (let side = 0; side < 2; side++) {
            const flame = actual[side]!, source = procedural[side]!;
            const anchor = candidate.imported.getAttachment(side === 0 ? 'exhaustLeft' : 'exhaustRight')!;
            expect(flame.position.toArray()).toEqual([anchor.position.x, anchor.position.y, anchor.position.z - 4.25 * source.scale.y]);
            expect(flame.scale.toArray()).toEqual([source.scale.x * .54, source.scale.y, source.scale.z * .54]);
            expect(flame.geometry.getAttribute('position').array).toEqual(source.geometry.getAttribute('position').array);
            expect(flame.material.vertexShader).toBe(source.material.vertexShader);
            expect(flame.material.fragmentShader).toBe(source.material.fragmentShader);
            expect(flame.material.uniforms.uPower!.value).toBe(source.material.uniforms.uPower!.value);
            expect(flame.material.uniforms.uHot!.value.toArray()).toEqual(source.material.uniforms.uHot!.value.toArray());
          }
        }
      }
    }
  });
});

describe('installation validation and ownership', () => {
  it.each([NaN, Infinity, -Infinity, 0, -1, null, '0.34', Number.MAX_VALUE, 1e300, Number.MIN_VALUE])('rejects invalid or GPU-unrepresentable aperture %s while preserving the installed art', async radius => {
    const art = new ImportedVehiclePresentation(library()); owned.push(art);
    expect(await art.setSource(definition())).toBe('ready');
    const active = art.activeSource, meshes = art.geometryMeshes, radial = art.exhaustRadialScale, revision = art.geometryRevision;
    expect(await art.setSource(definition(radius))).toBe('error');
    expect(art.error?.message).toMatch(/positive, finite and representable/);
    expect(art.activeSource).toBe(active); expect(art.geometryMeshes).toBe(meshes);
    expect(art.exhaustRadialScale).toBe(radial); expect(art.geometryRevision).toBe(revision);
  });

  it('rejects unsupported anchor frames and a nonidentity model root only for opt-in assets', async () => {
    const art = new ImportedVehiclePresentation(library()); owned.push(art);
    for (const attachments of [
      {},
      { ...example.attachments, exhaustLeft: { position: [0, 0, 0] as const, node: 'candidate-fixture-body' } },
      { ...example.attachments, exhaustRight: { position: [0, 0, 0] as const, rotation: [0, .1, 0] as const } },
    ]) {
      expect(await art.setSource({ ...definition(), attachments })).toBe('error');
      expect(art.error?.message).toMatch(/two root-space/);
    }
    const transformed = new ImportedVehiclePresentation(library(async () => {
      const root = fixture(); root.scale.setScalar(1.6); return root;
    })); owned.push(transformed);
    expect(await transformed.setSource(definition())).toBe('error');
    expect(transformed.error?.message).toMatch(/identity model root/);
    expect(await transformed.setSource(POLWO_ART_DEFINITIONS.hero)).toBe('ready');
    expect(transformed.exhaustRadialScale).toBe(.54);
  });

  it('uses the installed snapshot during loading, errors and caller metadata mutations, and resets to the exact legacy value on replacement', async () => {
    let resolvePending: ((root: Group) => void) | undefined;
    const lib = library(async () => fixture());
    const art = new ImportedVehiclePresentation(lib); owned.push(art);
    const mutable = { ...definition() };
    expect(await art.setSource(mutable)).toBe('ready');
    const originalScale = art.exhaustRadialScale;
    mutable.exhaustApertureRadius = .1;
    expect(art.exhaustRadialScale).toBe(originalScale);
    expect(await art.setSource(TEEMTO_ART_DEFINITIONS.hero)).toBe('ready');
    expect(art.exhaustRadialScale).toBe(.54);
    art.clearArt(); expect(art.exhaustRadialScale).toBe(.54);
    const loadingLibrary = new VehicleArtLibrary({ load: url => url === 'pending.glb'
      ? new Promise<Group>(resolve => { resolvePending = resolve; }) : Promise.resolve(fixture()) });
    owned.push(loadingLibrary);
    const loading = new ImportedVehiclePresentation(loadingLibrary); owned.push(loading);
    await loading.setSource(definition());
    const oldScale = loading.exhaustRadialScale;
    const pending = loading.setSource({ ...definition(.2), revision: 'pending', url: 'pending.glb' });
    await Promise.resolve();
    expect(loading.status).toBe('loading'); expect(loading.exhaustRadialScale).toBe(oldScale);
    resolvePending!(fixture()); await pending;
    expect(loading.exhaustRadialScale).not.toBe(oldScale);
  });
});
