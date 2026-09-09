import { BoxGeometry, Euler, Group, Mesh, MeshStandardMaterial, PropertyBinding, Raycaster, TubeGeometry, Vector3, type Material, type Object3D } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadVehicleAppearance, SEBULBA_ART_DEFINITIONS, SEBULBA_BODY_NODES, TEEMTO_ART_DEFINITIONS, TEEMTO_BODY_GROUP_NODES, TEEMTO_BODY_NODES } from '../../src/game/vehicleAppearance';
import * as vehicleAppearance from '../../src/game/vehicleAppearance';
import { PodracerView, type PodracerPose } from '../../src/render/objects/PodracerView';
import { RacerPresentation } from '../../src/render/vehicles/RacerPresentation';
import { VehicleArtLibrary, type VehicleArtLibraryOptions } from '../../src/render/vehicles/VehicleArtLibrary';
import { deferred } from './vehicleArtFixtures';

function teemtoFixture() {
  const root = new Group();
  const geometry = new BoxGeometry(2, 1, 4);
  const material = new MeshStandardMaterial({ color: '#b8a67a' });
  for (const key of ['cockpit', 'engineLeft', 'engineRight'] as const) {
    const group = new Group();
    group.name = PropertyBinding.sanitizeNodeName(TEEMTO_BODY_GROUP_NODES[key]);
    const mesh = new Mesh(geometry, material);
    mesh.name = TEEMTO_BODY_NODES[key];
    group.add(mesh);
    root.add(group);
  }
  const pilot = new Group();
  pilot.name = 'teemto-pilot.001';
  for (const part of ['helmet', 'orange', 'suit', 'visor']) {
    const mesh = new Mesh(geometry, material);
    mesh.name = `teemto-pilot-${part}.001`;
    pilot.add(mesh);
  }
  root.add(pilot);
  return { root, geometry, material, disposed: {
    geometry: vi.spyOn(geometry, 'dispose'),
    material: vi.spyOn(material, 'dispose'),
  } };
}

function sebulbaFixture() {
  const fixture = teemtoFixture();
  fixture.root.clear();
  for (const name of [...Object.values(SEBULBA_BODY_NODES), ...['helmet', 'orange', 'suit', 'visor'].map(part => `sebulba-pilot-${part}.002`)]) {
    const mesh = new Mesh(fixture.geometry, fixture.material); mesh.name = name; fixture.root.add(mesh);
  }
  return fixture;
}

const ownedRacers: RacerPresentation[] = [];
const ownedLibraries: VehicleArtLibrary[] = [];
const actualArtDefinition = vehicleAppearance.getVehicleArtDefinition;
beforeEach(() => {
  // These fixtures transfer one intact template per source request. Keep their
  // cancellation/ownership assertions source-only; importedVehicleDamage.test
  // covers real optional package routing and both-lease ownership separately.
  vi.spyOn(vehicleAppearance, 'getVehicleArtDefinition').mockImplementation((...args) => {
    const definition = actualArtDefinition(...args);
    if (!definition) return definition;
    const { damageVariant: _damageVariant, ...intact } = definition;
    return intact;
  });
});
function setup(options: VehicleArtLibraryOptions, index = 0) {
  const library = new VehicleArtLibrary(options);
  const racer = new RacerPresentation(library, undefined, index);
  ownedLibraries.push(library);
  ownedRacers.push(racer);
  const proxy = racer.createCelPrepassProxy();
  return { library, racer, proxy };
}
afterEach(() => {
  for (const racer of ownedRacers.splice(0)) racer.dispose();
  for (const library of ownedLibraries.splice(0)) library.dispose();
  vi.restoreAllMocks();
});

function meshNamed(root: Object3D, name: string): Mesh {
  const mesh = root.getObjectByName(name);
  if (!(mesh instanceof Mesh)) throw new Error(`Missing mesh ${name}`);
  return mesh;
}

function expectPosition(actual: Vector3, expected: readonly number[]): void {
  expect(actual.x).toBeCloseTo(expected[0]!, 6);
  expect(actual.y).toBeCloseTo(expected[1]!, 6);
  expect(actual.z).toBeCloseTo(expected[2]!, 6);
}

const DRIVE_POSE: PodracerPose = {
  x: 37, y: 8, z: -29, yaw: .4, pitch: .08, roll: -.15,
  steer: .3, throttle: .9, speed: 180, boost: .8, damage: .2,
};

describe('stable racer appearance lifecycle', () => {
  it('keeps a resolved Teemto breakup only for live wreck frames and restores effects/source transforms on ordinary update or release', async () => {
    const { racer } = setup({ load: async () => teemtoFixture().root });
    await racer.setAppearance('teemto');
    const engine = racer.imported.getNode(PropertyBinding.sanitizeNodeName(TEEMTO_BODY_GROUP_NODES.engineRight))!;
    const rest = engine.matrix.clone(), geometry = racer.imported.geometryMeshes.map(mesh => mesh.geometry);
    const pose = { position: new Vector3(0, 10, 0), rotation: new Euler(0, 0, 0, 'YXZ'),
      center: new Vector3(), forward: new Vector3(0, 0, 1), bounds: [], radius: 17, groundCorrection: 0 };
    const effects = racer.getObjectByName('imported-vehicle-effects')!;
    racer.imported.updateWreckBreakup(pose, 1.6, { heightAt: () => 0 });
    racer.update({ ...DRIVE_POSE, wrecked: true }, 1, true);
    expect(racer.imported.wreckBreakupActive).toBe(true);
    expect(engine.matrix.equals(rest)).toBe(false);
    expect(effects.visible).toBe(false);
    expect(racer.imported.geometryMeshes.map(mesh => mesh.geometry)).toEqual(geometry);
    // Default updates include garage/ordinary driving/historical replay callers.
    racer.update(DRIVE_POSE, 2);
    expect(racer.imported.wreckBreakupActive).toBe(false);
    expect(engine.matrix.equals(rest)).toBe(true);
    expect(effects.visible).toBe(true);
    racer.imported.updateWreckBreakup(pose, 1.6, { heightAt: () => 0 });
    await racer.setAppearance('procedural');
    expect(engine.matrix.equals(rest)).toBe(true);
    expect(racer.imported.wreckBreakupActive).toBe(false);
  });

  it('applies the new-user preference without changing physics, retaining it across all other classes', async () => {
    const fixture = teemtoFixture();
    const load = vi.fn(async () => fixture.root);
    const { racer, proxy } = setup({ load });
    expect(racer.procedural).toBeInstanceOf(PodracerView);
    expect(load).not.toHaveBeenCalled();
    expect(racer.prepassMeshes).toEqual([proxy]);
    await racer.setAppearance(loadVehicleAppearance(null));
    expect(racer.vehicleClass).toBe('podracer');
    expect(racer.authoredVehicleClass).toBe('podracer');
    expect(racer.appearanceId).toBe('teemto');
    expect(racer.importedActive).toBe(true);
    for (const vehicleClass of ['landspeeder', 'speeder-bike', 'skim-speeder'] as const) {
      racer.setVehicleClass(vehicleClass);
      await racer.ready;
      expect(racer.vehicleClass).toBe(vehicleClass);
      expect(racer.appearanceId).toBe('procedural');
      expect(racer.importedActive).toBe(false);
      expect(racer.prepassMeshes).toEqual([proxy]);
    }
    racer.setVehicleClass('podracer');
    await racer.ready;
    expect(racer.importedActive).toBe(true);
    expect(load).toHaveBeenCalledTimes(1);
    await racer.setAppearance('procedural');
    racer.setVehicleClass('landspeeder');
    racer.setVehicleClass('podracer');
    await racer.ready;
    expect(racer.appearanceId).toBe('procedural');
    expect(racer.importedActive).toBe(false);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('selects the hero asset for the player and the rival asset for another racer', async () => {
    const load = vi.fn(async (_url: string) => teemtoFixture().root);
    const { racer: hero } = setup({ load }, 0);
    const { racer: rival } = setup({ load }, 1);
    rival.setVehicleClass('podracer');
    await Promise.all([hero.setAppearance('teemto'), rival.setAppearance('teemto')]);
    expect(load.mock.calls.map(([url]) => url)).toEqual([
      TEEMTO_ART_DEFINITIONS.hero.url,
      TEEMTO_ART_DEFINITIONS.rival.url,
    ]);
    expect(hero.imported.statistics).toMatchObject({ bodyDraws: 3, pilotDraws: 4 });
    expect(rival.imported.statistics).toMatchObject({ bodyDraws: 3, pilotDraws: 4 });
  });

  it('replaces the exact active prepass registrations before imported materials and leases are released', async () => {
    const fixture = teemtoFixture();
    const { racer, proxy, library } = setup({ load: async () => fixture.root, maxIdleEntries: 0 });
    let registered = [proxy];
    const registrations: Mesh[][] = [];
    const celDisposals: ReturnType<typeof vi.fn>[] = [];
    racer.setGeometryChangeListener(() => {
      const previous = registered;
      registered = [...racer.prepassMeshes];
      registrations.push(registered);
      if (previous.length === 7) {
        expect(registered).toEqual([proxy]);
        expect(fixture.disposed.geometry).not.toHaveBeenCalled();
        expect(library.diagnostics.leases).toBe(1);
        for (const disposed of celDisposals) expect(disposed).not.toHaveBeenCalled();
      }
    });
    await racer.setAppearance('teemto');
    const importedProxies = [...racer.imported.prepassMeshes];
    expect(registered).toEqual(importedProxies);
    expect(registered).toHaveLength(7);
    expect(registered).not.toContain(proxy);
    expect(proxy.visible).toBe(false);
    expect(racer.geometryRevision).toBe(1);
    for (const material of racer.imported.materials) {
      const disposed = vi.fn();
      material.addEventListener('dispose', disposed);
      celDisposals.push(disposed);
    }
    await racer.setAppearance('procedural');
    expect(registrations).toEqual([importedProxies, [proxy]]);
    expect(racer.prepassMeshes).toEqual([proxy]);
    expect(racer.geometryRevision).toBe(2);
    expect(proxy.visible).toBe(true);
    expect(fixture.disposed.geometry).toHaveBeenCalledTimes(1);
    expect(library.diagnostics.leases).toBe(0);
    for (const disposed of celDisposals) expect(disposed).toHaveBeenCalledTimes(1);
  });

  it('does not resurrect a pending imported selection after switching physics class', async () => {
    const fixture = teemtoFixture(), pending = deferred<Group>();
    const load = vi.fn(() => pending.promise);
    const { racer, proxy, library } = setup({ load, maxIdleEntries: 0 });
    const selection = racer.setAppearance('teemto');
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    racer.setVehicleClass('landspeeder');
    await racer.ready;
    pending.resolve(fixture.root);
    await selection;
    await vi.waitFor(() => expect(fixture.disposed.geometry).toHaveBeenCalledTimes(1));
    expect(racer.vehicleClass).toBe('landspeeder');
    expect(racer.appearanceId).toBe('procedural');
    expect(racer.appearanceStatus).toBe('procedural');
    expect(racer.importedActive).toBe(false);
    expect(racer.prepassMeshes).toEqual([proxy]);
    expect(racer.imported.children).toHaveLength(0);
    expect(library.diagnostics.leases).toBe(0);
  });

  it('accepts a fresh return to podracer while an earlier selection is cancelled against the same shared load', async () => {
    const fixture = teemtoFixture(), pending = deferred<Group>();
    const load = vi.fn(() => pending.promise);
    const { racer, library } = setup({ load, maxIdleEntries: 0 });
    const obsolete = racer.setAppearance('teemto');
    racer.setVehicleClass('landspeeder');
    racer.setVehicleClass('podracer');
    const latest = racer.ready;
    pending.resolve(fixture.root);
    await Promise.all([obsolete, latest]);
    expect(racer.vehicleClass).toBe('podracer');
    expect(racer.importedActive).toBe(true);
    expect(racer.appearanceStatus).toBe('ready');
    expect(racer.prepassMeshes).toHaveLength(7);
    expect(library.diagnostics.leases).toBe(1);
    expect(load).toHaveBeenCalledTimes(1);
    expect(fixture.disposed.geometry).not.toHaveBeenCalled();
  });

  it('disposes a late model without notifying or resurrecting a destroyed racer', async () => {
    const fixture = teemtoFixture(), pending = deferred<Group>();
    const { racer, library } = setup({ load: () => pending.promise, maxIdleEntries: 0 });
    const changed = vi.fn();
    racer.setGeometryChangeListener(changed);
    const selection = racer.setAppearance('teemto');
    racer.dispose();
    pending.resolve(fixture.root);
    await selection;
    await vi.waitFor(() => expect(fixture.disposed.geometry).toHaveBeenCalledTimes(1));
    expect(changed).not.toHaveBeenCalled();
    expect(racer.children).toHaveLength(0);
    expect(racer.imported.status).toBe('disposed');
    expect(racer.imported.activeSource).toBeNull();
    expect(library.diagnostics.leases).toBe(0);
  });

  it('keeps the procedural body after failure and retries only when explicitly requested', async () => {
    const fixture = teemtoFixture();
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(fixture.root);
    const { racer, proxy } = setup({ load });
    await racer.setAppearance('teemto');
    expect(racer.appearanceStatus).toBe('error');
    expect(racer.importedActive).toBe(false);
    expect(racer.procedural.visible).toBe(true);
    expect(racer.prepassMeshes).toEqual([proxy]);
    await racer.setAppearance('teemto');
    racer.update(DRIVE_POSE, 1);
    expect(load).toHaveBeenCalledTimes(1);
    await racer.retryAppearance();
    expect(load).toHaveBeenCalledTimes(2);
    expect(racer.importedActive).toBe(true);
    expect(racer.appearanceStatus).toBe('ready');
  });
});

describe('imported racer geometry and effects', () => {
  it('closes the chase-facing nozzle core in the existing exhaust mesh without changing its anchor bounds', async () => {
    const { racer } = setup({ load: async () => teemtoFixture().root });
    await racer.setAppearance('teemto');
    const flames = racer.getObjectsByProperty('name', 'imported-engine-exhaust') as Mesh[];
    expect(flames).toHaveLength(2);
    for (const flame of flames) {
      const localMesh = new Mesh(flame.geometry, flame.material);
      const ray = new Raycaster(new Vector3(.2, 8, .1), new Vector3(0, -1, 0));
      expect(ray.intersectObject(localMesh, false).some(hit => Math.abs(hit.point.y + 4.25) < 1e-6)).toBe(true);
      flame.geometry.computeBoundingBox();
      expect(flame.geometry.boundingBox!.min.y).toBe(-4.25);
      expect(flame.geometry.boundingBox!.max.y).toBe(4.25);
      expect(Array.isArray(flame.material)).toBe(false);
    }
  });
  it('replaces Teemto with the static Sebulba body and rebuilds only owned coupling geometry at the new anchors', async () => {
    const teemto = teemtoFixture(), sebulba = sebulbaFixture();
    const { racer, proxy } = setup({ load: async url => url.includes('sebulba') ? sebulba.root : teemto.root, maxIdleEntries: 0 });
    const registrations: number[] = [];
    racer.setGeometryChangeListener(() => registrations.push(racer.prepassMeshes.length));
    await racer.setAppearance('teemto');
    const firstCoupling = meshNamed(racer, 'imported-engine-coupling');
    const firstDisposed = vi.spyOn(firstCoupling.geometry, 'dispose');
    const flames = racer.getObjectsByProperty('name', 'imported-engine-exhaust') as Mesh[];
    await racer.setAppearance('sebulba');
    expect(racer.activeAppearanceId).toBe('sebulba');
    expect(racer.vehicleClass).toBe('podracer');
    expect(racer.prepassMeshes).toHaveLength(6);
    expect(racer.prepassMeshes).not.toContain(proxy);
    expect(racer.imported.statistics).toMatchObject({ bodyDraws: 2, pilotDraws: 4, prepassDraws: 6, shadowSourceMeshes: 2 });
    expect(racer.imported.getShadowMeshes().map(mesh => mesh.name).toSorted()).toEqual(Object.values(SEBULBA_BODY_NODES).toSorted());
    expect(teemto.disposed.geometry).toHaveBeenCalledTimes(1);
    expect(firstDisposed).toHaveBeenCalledTimes(1);
    const coupling = meshNamed(racer, 'imported-engine-coupling');
    expect(coupling.geometry).not.toBe(firstCoupling.geometry);
    expect(coupling.material).toBe(firstCoupling.material);
    const curve = (coupling.geometry as TubeGeometry).parameters.path;
    expectPosition(curve.getPoint(0), SEBULBA_ART_DEFINITIONS.hero.attachments!.couplingLeft!.position!);
    expectPosition(curve.getPoint(1), SEBULBA_ART_DEFINITIONS.hero.attachments!.couplingRight!.position!);
    for (const time of [0, 1.1, 4.2]) {
      racer.update(DRIVE_POSE, time); racer.updateMatrixWorld(true);
      expect(meshNamed(racer, 'imported-engine-coupling').geometry).toBe(coupling.geometry);
      expect(racer.getObjectsByProperty('name', 'imported-engine-exhaust')).toEqual(flames);
      for (let index = 0; index < flames.length; index++) {
        const flame = flames[index]!; flame.geometry.computeBoundingBox();
        expect(flame.scale.x * .82).toBeLessThan(.45);
        expect(flame.scale.z * .82).toBeLessThan(.45);
        const base = new Vector3(0, flame.geometry.boundingBox!.min.y, 0).applyMatrix4(flame.matrixWorld);
        const anchor = racer.imported.getAttachment(index ? 'exhaustRight' : 'exhaustLeft')!;
        expectPosition(base, racer.localToWorld(anchor.position.clone()).toArray());
      }
    }
    expect(racer.wakeAnchors.map(anchor => anchor.position.toArray())).toEqual([
      SEBULBA_ART_DEFINITIONS.hero.attachments!.exhaustLeft!.position,
      SEBULBA_ART_DEFINITIONS.hero.attachments!.exhaustRight!.position,
    ]);
    expectPosition(racer.dustAnchors[1]!.position, [0, 1.366, -5.2]);
    racer.setLodMode('silhouette');
    expect(racer.prepassMeshes.filter(mesh => mesh.visible)).toHaveLength(2);
    expect(racer.pilotAnchor.visible).toBe(false);
    await racer.setAppearance('procedural');
    expect(racer.activeAppearanceId).toBe('procedural');
    expect(racer.prepassMeshes).toEqual([proxy]);
    expect(registrations).toEqual([7, 6, 1]);
    expect(sebulba.disposed.geometry).toHaveBeenCalledTimes(1);
  });

  it('preserves ready Teemto art after a failed Sebulba selection and retries only on request', async () => {
    const load = vi.fn().mockResolvedValueOnce(teemtoFixture().root)
      .mockRejectedValueOnce(new Error('Sebulba unavailable')).mockResolvedValueOnce(sebulbaFixture().root);
    const { racer } = setup({ load });
    await racer.setAppearance('teemto');
    const prepasses = racer.prepassMeshes, coupling = meshNamed(racer, 'imported-engine-coupling');
    await racer.setAppearance('sebulba');
    expect(racer.appearanceId).toBe('sebulba');
    expect(racer.appearanceStatus).toBe('error');
    expect(racer.activeAppearanceId).toBe('teemto');
    expect(racer.prepassMeshes).toBe(prepasses);
    expect(meshNamed(racer, 'imported-engine-coupling')).toBe(coupling);
    await racer.setAppearance('sebulba'); racer.update(DRIVE_POSE, 1);
    expect(load).toHaveBeenCalledTimes(2);
    await racer.retryAppearance();
    expect(load).toHaveBeenCalledTimes(3);
    expect(racer.activeAppearanceId).toBe('sebulba');
    expect(racer.prepassMeshes).toHaveLength(6);
  });

  it('does not install late Sebulba geometry after a newer Teemto selection', async () => {
    const pending = deferred<Group>(), sebulba = sebulbaFixture();
    const { racer } = setup({ load: async url => url.includes('sebulba') ? pending.promise : teemtoFixture().root, maxIdleEntries: 0 });
    const obsolete = racer.setAppearance('sebulba');
    await Promise.resolve();
    await racer.setAppearance('teemto');
    expect(racer.activeAppearanceId).toBe('teemto');
    const prepasses = racer.prepassMeshes;
    pending.resolve(sebulba.root); await obsolete;
    await vi.waitFor(() => expect(sebulba.disposed.geometry).toHaveBeenCalledTimes(1));
    expect(racer.activeAppearanceId).toBe('teemto');
    expect(racer.prepassMeshes).toBe(prepasses);
    expect(racer.prepassMeshes).toHaveLength(7);
  });

  it('retains the imported body at every LOD, hides its driver for distant modes and never shows both pilots', async () => {
    const fixture = teemtoFixture();
    const { racer, proxy } = setup({ load: async () => fixture.root });
    await racer.setAppearance('teemto');
    const allMeshes = [...racer.imported.geometryMeshes];
    const pilot = allMeshes.filter((mesh) => mesh.name.startsWith('teemto-pilot-'));
    const body = allMeshes.filter((mesh) => !pilot.includes(mesh));
    const prepasses = [...racer.prepassMeshes];
    const effects = racer.getObjectByName('imported-vehicle-effects')!;
    expect(body).toHaveLength(3);
    expect(pilot).toHaveLength(4);
    for (const mode of ['full', 'simplified', 'silhouette', 'full'] as const) {
      racer.setLodMode(mode);
      racer.update(DRIVE_POSE, 2);
      expect(racer.importedActive).toBe(true);
      expect(racer.imported.visible).toBe(true);
      expect(racer.procedural.visible).toBe(false);
      expect(racer.pilotAnchor.visible).toBe(false);
      expect(body.every((mesh) => mesh.visible)).toBe(true);
      expect(pilot.every((mesh) => mesh.visible === (mode === 'full'))).toBe(true);
      expect(racer.prepassMeshes).toEqual(prepasses);
      expect(prepasses.filter((mesh) => mesh.visible)).toHaveLength(mode === 'full' ? 7 : 3);
      expect(proxy.visible).toBe(false);
      expect(effects.visible).toBe(mode !== 'silhouette');
    }
    const parent = new Group();
    parent.add(racer);
    parent.visible = false;
    racer.syncVisibility();
    expect(racer.prepassMeshes.every((mesh) => !mesh.visible)).toBe(true);
    parent.visible = true;
    racer.syncVisibility();
    expect(racer.prepassMeshes.every((mesh) => mesh.visible)).toBe(true);
    await racer.setAppearance('procedural');
    expect(racer.pilotAnchor).toBe(racer.procedural.pilotAnchor);
    expect(racer.pilotAnchor.visible).toBe(true);
  });

  it('calibrates flame bases, coupling endpoints, dust and wake roots to the authored model and applies the race pose once', async () => {
    const fixture = teemtoFixture();
    const { racer } = setup({ load: async () => fixture.root });
    await racer.setAppearance('teemto');
    const flames = racer.getObjectsByProperty('name', 'imported-engine-exhaust') as Mesh[];
    expect(flames).toHaveLength(2);
    for (const time of [0, 1.1, 4.2]) {
      racer.update({ ...DRIVE_POSE, redline: time > 4 ? 1.1 : 0 }, time);
      racer.updateMatrixWorld(true);
      expectPosition(racer.position, [37, 8, -29]);
      expectPosition(racer.procedural.position, [0, 0, 0]);
      expect(racer.procedural.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
      for (let index = 0; index < flames.length; index += 1) {
        const flame = flames[index]!;
        const anchor = racer.imported.getAttachment(index === 0 ? 'exhaustLeft' : 'exhaustRight')!;
        flame.geometry.computeBoundingBox();
        const base = new Vector3(0, flame.geometry.boundingBox!.min.y, 0).applyMatrix4(flame.matrixWorld);
        const expected = racer.localToWorld(anchor.position.clone());
        expectPosition(base, expected.toArray());
      }
    }
    const coupling = meshNamed(racer, 'imported-engine-coupling');
    expect(coupling.geometry).toBeInstanceOf(TubeGeometry);
    const curve = (coupling.geometry as TubeGeometry).parameters.path;
    expectPosition(curve.getPoint(0), [-1.3, 3.238, 18.941]);
    expectPosition(curve.getPoint(1), [1.325, 3.238, 18.941]);
    expect(coupling.geometry.getAttribute('aArcSeed').count).toBe(coupling.geometry.getAttribute('position').count);
    expect(racer.wakeAnchors.map((anchor) => anchor.position.toArray())).toEqual([[-4.075, .178, 5.638], [4.025, .178, 5.638]]);
    expect(racer.dustAnchors.map((anchor) => anchor.position.toArray())).toEqual([[-4.075, .178, 5.638], [0, 2.2, -5.2], [4.025, .178, 5.638]]);
    expect(racer.getObjectByName('imported-vehicle-effects')?.userData.inkstormRacerShadowExclude).toBe(true);
  });

  it('borrows procedural VFX resources without double disposal and keeps externally leased art alive', async () => {
    const fixture = teemtoFixture();
    const { racer, library } = setup({ load: async () => fixture.root, maxIdleEntries: 0 });
    const sourceFlames = racer.procedural.getObjectsByProperty('name', 'engine-exhaust') as Mesh[];
    const sourceCoupling = meshNamed(racer.procedural, 'podracer-energy-coupling-EnergyCoupling-0');
    const sourceGeometryDisposals = sourceFlames.map((mesh) => vi.spyOn(mesh.geometry, 'dispose'));
    const sourceMaterials = new Set<Material>([...sourceFlames.map((mesh) => mesh.material as Material), sourceCoupling.material as Material]);
    const sourceMaterialDisposals = [...sourceMaterials].map((material) => vi.spyOn(material, 'dispose'));
    await racer.setAppearance('teemto');
    const flames = racer.getObjectsByProperty('name', 'imported-engine-exhaust') as Mesh[];
    for (let index = 0; index < flames.length; index += 1) {
      expect(flames[index]!.geometry).toBe(sourceFlames[index]!.geometry);
      expect(flames[index]!.material).toBe(sourceFlames[index]!.material);
    }
    const coupling = meshNamed(racer, 'imported-engine-coupling');
    expect(coupling.material).toBe(sourceCoupling.material);
    expect(coupling.geometry).not.toBe(sourceCoupling.geometry);
    const couplingGeometryDisposed = vi.spyOn(coupling.geometry, 'dispose');
    const otherLease = await library.acquire(TEEMTO_ART_DEFINITIONS.hero);
    await racer.setAppearance('procedural');
    for (const disposed of [...sourceGeometryDisposals, ...sourceMaterialDisposals]) {
      expect(disposed).not.toHaveBeenCalled();
    }
    expect(racer.procedural.visible).toBe(true);
    racer.update(DRIVE_POSE, 2);
    racer.dispose();
    racer.dispose();
    for (const disposed of [...sourceGeometryDisposals, ...sourceMaterialDisposals, couplingGeometryDisposed]) {
      expect(disposed).toHaveBeenCalledTimes(1);
    }
    expect(fixture.disposed.geometry).not.toHaveBeenCalled();
    expect(library.diagnostics.leases).toBe(1);
    expect(racer.children).toHaveLength(0);
    otherLease.release();
    expect(fixture.disposed.geometry).toHaveBeenCalledTimes(1);
    expect(fixture.disposed.material).toHaveBeenCalledTimes(1);
  });
});
