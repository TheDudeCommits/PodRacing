import { BoxGeometry, Euler, Group, Mesh, MeshStandardMaterial, PropertyBinding, Texture, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TEEMTO_ART_DEFINITIONS, TEEMTO_BODY_GROUP_NODES, TEEMTO_BODY_NODES } from '../../src/game/vehicleAppearance';
import * as vehicleAppearance from '../../src/game/vehicleAppearance';
import { WreckVisualPoseCache, type WreckVisualPose } from '../../src/render/combat/WreckVisualPose';
import { InkstormRacerShadow } from '../../src/render/inkstorm/InkstormRacerShadow';
import { ImportedVehiclePresentation, type VehicleArtDefinition } from '../../src/render/vehicles/ImportedVehiclePresentation';
import { VehicleArtLibrary, type VehicleArtLibraryOptions } from '../../src/render/vehicles/VehicleArtLibrary';
import { RacerPresentation } from '../../src/render/vehicles/RacerPresentation';
import { artFixture, deferred, source } from './vehicleArtFixtures';

const damageNames = ['teemto-damage-cockpit-stubs-v16', 'teemto-damage-severed-tethers-v16',
  'teemto-damage-right-front-v16', 'teemto-damage-right-rear-v16'] as const;
const definition: VehicleArtDefinition = { id: 'teemto', url: '/intact.glb', revision: 'test-v16',
  embeddedPilotNodePrefix: 'teemto-pilot-', damageVariant: { id: 'teemto-damage', revision: 'test-v16', url: '/damage.glb' } };
const owned: Array<{ dispose(): void }> = [];
afterEach(() => { for (const object of owned.splice(0).reverse()) object.dispose(); vi.restoreAllMocks(); });

function intactFixture() {
  const root = new Group(), map = new Texture();
  const cockpitMaterial = new MeshStandardMaterial({ name: 'cockpit source', map });
  const engineMaterial = new MeshStandardMaterial({ name: 'engine source', map });
  const pilotMaterial = new MeshStandardMaterial({ name: 'pilot source' });
  const meshes: Mesh[] = [];
  for (const key of ['cockpit', 'engineLeft', 'engineRight'] as const) {
    const group = new Group(); group.name = PropertyBinding.sanitizeNodeName(TEEMTO_BODY_GROUP_NODES[key]);
    const geometry = new BoxGeometry(2, 1, 4).translate(key === 'engineLeft' ? -5 : key === 'engineRight' ? 5 : 0, 1, 4);
    const mesh = new Mesh(geometry, key === 'cockpit' ? cockpitMaterial : engineMaterial);
    mesh.name = TEEMTO_BODY_NODES[key]; group.add(mesh); root.add(group); meshes.push(mesh);
  }
  const graphite = new Mesh(new BoxGeometry(1, 1, 1), cockpitMaterial);
  graphite.name = 'teemto-cockpit-graphite-v2'; root.add(graphite); meshes.push(graphite);
  for (const part of ['accent', 'hardware', 'rubber', 'shell', 'suit', 'webbing']) {
    const mesh = new Mesh(new BoxGeometry(.3, .3, .3).translate(0, 2, 0), pilotMaterial);
    mesh.name = `teemto-pilot-${part}`; root.add(mesh); meshes.push(mesh);
  }
  return { root, meshes, map, materials: [cockpitMaterial, engineMaterial, pilotMaterial],
    disposed: meshes.map(mesh => vi.spyOn(mesh.geometry, 'dispose')) };
}

function damageFixture() {
  const root = new Group(), material = new MeshStandardMaterial();
  const meshes = damageNames.map((name, index) => {
    const mesh = new Mesh(new BoxGeometry(1, .5, 2), material); mesh.name = name;
    // Distinct authored pivots remain transforms; the adapter must not bake or recenter them.
    mesh.position.set(index < 2 ? 0 : 5, 1, index * 2); root.add(mesh); return mesh;
  });
  return { root, material, meshes, disposed: meshes.map(mesh => vi.spyOn(mesh.geometry, 'dispose')) };
}

function setup(load: VehicleArtLibraryOptions['load'], maxTriangles = 60_000, changed = vi.fn()) {
  const library = new VehicleArtLibrary({ load, maxIdleEntries: 0 }); owned.push(library);
  const presentation = new ImportedVehiclePresentation(library, { maxTriangles, onGeometryChanged: changed }); owned.push(presentation);
  return { library, presentation, changed };
}

function pose(): WreckVisualPose {
  return { position: new Vector3(0, 10, 0), rotation: new Euler(0, 0, 0, 'YXZ'),
    center: new Vector3(), forward: new Vector3(0, 0, 1), bounds: [], radius: 17, groundCorrection: 0 };
}

const fileModule: string = 'node:fs';
const { readFileSync } = await import(/* @vite-ignore */ fileModule);
const actualDamagePath = 'assets/source/inkstorm/combat-round35/authored-damage-v16/packaged-b/teemto-damage-hero-v16.glb';
const actualRivalDamagePath = 'assets/source/inkstorm/combat-round35/authored-damage-v16/packaged-b/teemto-damage-rival-v16.glb';

async function loadActualGeometry(path: string) {
  const bytes = readFileSync(path);
  if (path === actualDamagePath || path === actualRivalDamagePath
    || /^public\/assets\/inkstorm\/vehicles\/teemto-damage-(hero|rival)-v16\.glb$/.test(path)) {
    // The authored damage export is already geometry-only: load exact bytes.
    return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
  }
  const jsonLength = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  // CPU-only source fixture: retain exact hierarchy/attributes/topology and BIN;
  // omit image bindings because no DOM image decoding is authorized here.
  for (const material of json.materials) {
    delete material.normalTexture; delete material.occlusionTexture; delete material.emissiveTexture;
    if (material.pbrMetallicRoughness) {
      delete material.pbrMetallicRoughness.baseColorTexture; delete material.pbrMetallicRoughness.metallicRoughnessTexture;
    }
  }
  delete json.images; delete json.textures; delete json.samplers;
  const text = new TextEncoder().encode(JSON.stringify(json)), length = Math.ceil(text.byteLength / 4) * 4;
  const binary = bytes.subarray(28 + jsonLength), output = new Uint8Array(28 + length + binary.byteLength), header = new DataView(output.buffer);
  header.setUint32(0, 0x46546c67, true); header.setUint32(4, 2, true); header.setUint32(8, output.byteLength, true);
  header.setUint32(12, length, true); header.setUint32(16, 0x4e4f534a, true);
  output.fill(32, 20, 20 + length); output.set(text, 20);
  header.setUint32(20 + length, binary.byteLength, true); header.setUint32(24 + length, 0x004e4942, true); output.set(binary, 28 + length);
  expect(binary.equals(output.subarray(28 + length))).toBe(true);
  return (await new GLTFLoader().parseAsync(output.buffer, '')).scene;
}

describe('optional authored damage adapter lifecycle', () => {
  it.each([['hero', 0], ['rival', 1]] as const)('routes the production %s definition to its exact public damage package', async (lod, index) => {
    const requested: string[] = [];
    const library = new VehicleArtLibrary({ load: async url => { requested.push(url); return loadActualGeometry(`public${url}`); } }); owned.push(library);
    const racer = new RacerPresentation(library, undefined, index); owned.push(racer);
    racer.setVehicleClass('podracer');
    await racer.setAppearance('teemto');
    const art = TEEMTO_ART_DEFINITIONS[lod];
    expect(art.damageVariant?.url).toBe(`/assets/inkstorm/vehicles/teemto-damage-${lod}-v16.glb`);
    expect(requested.sort()).toEqual([art.url, art.damageVariant!.url].sort());
    expect(racer.damageVariantAvailable).toBe(true); expect(racer.imported.damageVariantError).toBeNull();
    racer.imported.updateWreckBreakup(pose(), 1.5, { heightAt: () => 0 });
    expect(racer.damageVariantActive).toBe(true);
    expect(racer.imported.statistics.triangles).toBe(lod === 'hero' ? 58_624 : 26_588);
  });

  it('keeps racer effects, pilot LOD and fixed prepass registrations coherent through live damage and ordinary recovery', async () => {
    const intact = intactFixture(), damage = damageFixture();
    vi.spyOn(vehicleAppearance, 'getVehicleArtDefinition').mockReturnValue(definition);
    const library = new VehicleArtLibrary({ load: async url => url === '/intact.glb' ? intact.root : damage.root }); owned.push(library);
    const racer = new RacerPresentation(library); owned.push(racer);
    const changed = vi.fn(); racer.createCelPrepassProxy(); racer.setGeometryChangeListener(changed);
    await racer.setAppearance('teemto');
    expect(racer.damageVariantAvailable).toBe(true);
    const prepasses = racer.prepassMeshes, revision = racer.geometryRevision;
    const ordinary = { x: 0, y: 10, z: 0, yaw: 0, pitch: 0, roll: 0, steer: 0, throttle: .4, speed: 40, boost: 0, damage: 0 };
    racer.imported.updateWreckBreakup(pose(), 1.5, { heightAt: () => 0 }); racer.update({ ...ordinary, wrecked: true }, 1, true);
    expect(racer.damageVariantActive).toBe(true); expect(prepasses.filter(mesh => mesh.visible)).toHaveLength(12);
    expect(racer.getObjectByName('imported-vehicle-effects')!.visible).toBe(false);
    racer.setLodMode('silhouette'); expect(prepasses.filter(mesh => mesh.visible)).toHaveLength(6);
    racer.setLodMode('full'); expect(prepasses.filter(mesh => mesh.visible)).toHaveLength(12);
    racer.update(ordinary, 2);
    expect(racer.damageVariantActive).toBe(false); expect(prepasses.filter(mesh => mesh.visible)).toHaveLength(10);
    expect(racer.getObjectByName('imported-vehicle-effects')!.visible).toBe(true);
    expect(racer.prepassMeshes).toBe(prepasses); expect(racer.geometryRevision).toBe(revision);
    expect(changed).toHaveBeenCalledOnce();
  });

  it('admits the engine-only layout without replacing intact cockpit or inventing tether geometry', async () => {
    const intact = intactFixture(), damage = damageFixture();
    for (const mesh of damage.meshes.slice(0, 2)) { mesh.removeFromParent(); mesh.geometry.dispose(); }
    const f = setup(async url => url === '/intact.glb' ? intact.root : damage.root);
    await f.presentation.setSource(definition);
    expect(f.presentation.damageVariantAvailable).toBe(true);
    f.presentation.updateWreckBreakup(pose(), 1.5, { heightAt: () => 0 });
    expect(f.presentation.damageVariantActive).toBe(true);
    expect(f.presentation.statistics).toMatchObject({ meshes: 11, bodyDraws: 5, pilotDraws: 6, triangles: 132 });
    expect(f.presentation.getNode(TEEMTO_BODY_NODES.cockpit)!.visible).toBe(true);
    expect(f.presentation.getOpaqueMeshes()).toHaveLength(12);
  });

  it('loads the exact authored hero fracture with the installed GLTFLoader and validates replacement, not combined resident, budgets', async () => {
    const f = setup(url => loadActualGeometry(url === actualDamagePath ? url : `public${url}`));
    expect(await f.presentation.setSource({ ...TEEMTO_ART_DEFINITIONS.hero,
      damageVariant: { id: 'teemto-damage', revision: 'v16-authored-test', url: actualDamagePath } })).toBe('ready');
    const p = f.presentation;
    expect(p.damageVariantError).toBeNull(); expect(p.damageVariantAvailable).toBe(true);
    expect(p.statistics).toMatchObject({ meshes: 10, bodyDraws: 4, pilotDraws: 6, triangles: 57_618 });
    expect(p.residentStatistics).toMatchObject({ meshes: 14, triangles: 88_337 });
    const actualBytes = readFileSync(actualDamagePath), jsonLength = actualBytes.readUInt32LE(12);
    const document = JSON.parse(actualBytes.subarray(20, 20 + jsonLength).toString());
    for (const node of document.nodes) {
      const mesh = p.getNode(node.name) as Mesh;
      const sourceName = node.name.includes('-right-') ? TEEMTO_BODY_NODES.engineRight : TEEMTO_BODY_NODES.cockpit;
      expect(mesh.material).toBe((p.getNode(sourceName) as Mesh).material);
      expect(mesh.position.toArray()).toEqual(node.translation); expect(mesh.visible).toBe(false);
      expect(mesh.geometry.getAttribute('position').count).toBe(mesh.geometry.getAttribute('normal').count);
      expect(mesh.geometry.getAttribute('position').count).toBe(mesh.geometry.getAttribute('uv').count);
    }
    expect((p.getNode(TEEMTO_BODY_NODES.cockpit) as Mesh).material).not.toBe((p.getNode(TEEMTO_BODY_NODES.engineRight) as Mesh).material);
    const originalGeometry = p.geometryMeshes, proxies = p.prepassMeshes, materials = p.materials;
    p.updateWreckBreakup(pose(), 1.5, { heightAt: () => 0 });
    expect(p.damageVariantActive).toBe(true);
    expect(p.statistics).toMatchObject({ meshes: 12, bodyDraws: 6, pilotDraws: 6, triangles: 58_624 });
    expect(proxies.filter(mesh => mesh.visible)).toHaveLength(12);
    expect(p.geometryMeshes).toBe(originalGeometry); expect(p.prepassMeshes).toBe(proxies); expect(p.materials).toBe(materials);
    p.resetWreckBreakup();
    expect(p.damageVariantActive).toBe(false); expect(p.statistics.triangles).toBe(57_618);
    expect(proxies.filter(mesh => mesh.visible)).toHaveLength(10);
    console.log('V16 actual hero adapter', JSON.stringify({ intactTriangles: p.statistics.triangles,
      replacementTriangles: 58_624, residentTriangles: p.residentStatistics.triangles, residentMeshes: p.getOpaqueMeshes().length,
      borrowedMaterials: p.materials.length, geometryOnlySourceFixture: true, exactDamageBytesLoaded: true }));
  });

  it('rejects the hero damage asset against the unchanged rival 30k budget and retains the actual rival', async () => {
    const f = setup(url => loadActualGeometry(url === actualDamagePath ? url : `public${url}`), 30_000);
    expect(await f.presentation.setSource({ ...TEEMTO_ART_DEFINITIONS.rival,
      damageVariant: { id: 'teemto-damage', revision: 'v16-authored-test', url: actualDamagePath } })).toBe('ready');
    expect(f.presentation.damageVariantAvailable).toBe(false);
    expect(f.presentation.damageVariantError?.message).toContain('budget');
    expect(f.presentation.statistics.triangles).toBeLessThanOrEqual(30_000);
    expect(f.presentation.getOpaqueMeshes()).toHaveLength(f.presentation.geometryMeshes.length);
    expect(f.library.diagnostics.leases).toBe(1);
  });

  it('loads the exact authored rival fracture within 30k while retaining its original cockpit and pilot', async () => {
    const f = setup(url => loadActualGeometry(url === actualRivalDamagePath ? url : `public${url}`), 30_000);
    expect(await f.presentation.setSource({ ...TEEMTO_ART_DEFINITIONS.rival,
      damageVariant: { id: 'teemto-damage-rival', revision: 'v16-authored-test', url: actualRivalDamagePath } })).toBe('ready');
    const p = f.presentation, cockpit = p.getNode(TEEMTO_BODY_NODES.cockpit) as Mesh;
    const cockpitGeometry = cockpit.geometry, cockpitMaterial = cockpit.material;
    const pilot = p.geometryMeshes.filter(mesh => mesh.userData.inkstormRacerShadowExclude === true);
    const pilotMaterials = pilot.map(mesh => mesh.material), pilotGeometry = pilot.map(mesh => mesh.geometry);
    expect(p.damageVariantError).toBeNull(); expect(p.damageVariantAvailable).toBe(true);
    expect(p.statistics).toMatchObject({ meshes: 7, bodyDraws: 3, pilotDraws: 4, triangles: 26_180 });
    expect(p.residentStatistics).toMatchObject({ meshes: 9, triangles: 31_966 });
    expect(p.getNode('teemto-damage-cockpit-stubs-v16')).toBeUndefined();
    expect(p.getNode('teemto-damage-severed-tethers-v16')).toBeUndefined();
    const right = p.getNode(TEEMTO_BODY_NODES.engineRight) as Mesh;
    for (const name of damageNames.slice(2)) expect((p.getNode(name) as Mesh).material).toBe(right.material);
    p.updateWreckBreakup(pose(), 1.5, { heightAt: () => 0 });
    expect(p.damageVariantActive).toBe(true);
    expect(p.statistics).toMatchObject({ meshes: 8, bodyDraws: 4, pilotDraws: 4, triangles: 26_588 });
    expect(p.prepassMeshes.filter(mesh => mesh.visible)).toHaveLength(8);
    expect(cockpit.visible).toBe(true); expect(cockpit.geometry).toBe(cockpitGeometry); expect(cockpit.material).toBe(cockpitMaterial);
    expect(pilot.map(mesh => mesh.material)).toEqual(pilotMaterials); expect(pilot.map(mesh => mesh.geometry)).toEqual(pilotGeometry);
    p.resetWreckBreakup(); expect(p.damageVariantActive).toBe(false);
    expect(p.statistics.triangles).toBe(26_180); expect(p.prepassMeshes.filter(mesh => mesh.visible)).toHaveLength(7);
    console.log('V16 actual rival adapter', JSON.stringify({ intactTriangles: 26_180, replacementTriangles: 26_588,
      residentTriangles: p.residentStatistics.triangles, residentMeshes: p.getOpaqueMeshes().length,
      borrowedMaterials: p.materials.length, geometryOnlySourceFixture: true, exactDamageBytesLoaded: true }));
  });

  it('registers resident geometry once, borrows exact source materials and keeps intact bounds independent', async () => {
    const intact = intactFixture(), damage = damageFixture(), transforms = damage.meshes.map(mesh => mesh.position.toArray());
    const f = setup(async url => url === '/intact.glb' ? intact.root : damage.root);
    expect(await f.presentation.setSource(definition)).toBe('ready');
    const p = f.presentation, all = p.getOpaqueMeshes(), proxies = p.prepassMeshes;
    expect(p.damageVariantAvailable).toBe(true); expect(p.damageVariantActive).toBe(false); expect(p.damageVariantError).toBeNull();
    expect(p.geometryMeshes).toHaveLength(10); expect(all).toHaveLength(14); expect(proxies).toHaveLength(14);
    expect(p.statistics).toMatchObject({ meshes: 10, bodyDraws: 4, pilotDraws: 6, triangles: 120 });
    expect(p.residentStatistics).toMatchObject({ meshes: 14, bodyDraws: 8, pilotDraws: 6, triangles: 168 });
    expect(p.statistics).not.toBe(p.residentStatistics);
    expect(p.materials).toHaveLength(3); expect(f.library.diagnostics.leases).toBe(2);
    for (const [index, name] of damageNames.entries()) {
      const mesh = all.find(mesh => mesh.name === name)!;
      const original = all.find(mesh => mesh.name === (index < 2 ? TEEMTO_BODY_NODES.cockpit : TEEMTO_BODY_NODES.engineRight))!;
      expect(mesh.material).toBe(original.material); expect(mesh.geometry).toBe(damage.meshes[index]!.geometry);
      expect(mesh.position.toArray()).toEqual(transforms[index]); expect(mesh.visible).toBe(false);
    }
    expect(proxies.filter(mesh => mesh.visible)).toHaveLength(10);
    const cache = new WreckVisualPoseCache(); cache.refresh(p, p.geometryMeshes, p.geometryRevision);
    const originalBounds = cache.localBounds.clone(), supports = cache.supportPoints.map(point => point.toArray());
    const beforeMaterials = [...p.materials], revision = p.geometryRevision;
    for (const remaining of [2.15, 1.7, 1.5, .2, 0, 2.15]) {
      p.updateWreckBreakup(pose(), remaining, { heightAt: () => 0 });
      expect(p.getOpaqueMeshes()).toBe(all); expect(p.prepassMeshes).toBe(proxies);
      expect(p.materials).toEqual(beforeMaterials); expect(p.geometryRevision).toBe(revision);
      const active = p.damageVariantActive;
      expect(p.statistics).toMatchObject(active ? { meshes: 12, bodyDraws: 6, pilotDraws: 6, triangles: 144 }
        : { meshes: 10, bodyDraws: 4, pilotDraws: 6, triangles: 120 });
      expect(proxies.filter(mesh => mesh.visible)).toHaveLength(active ? 12 : 10);
      cache.refresh(p, p.geometryMeshes, p.geometryRevision);
      expect(cache.localBounds).toEqual(originalBounds); expect(cache.supportPoints.map(point => point.toArray())).toEqual(supports);
    }
    expect(f.changed).toHaveBeenCalledOnce();
    expect(f.changed.mock.calls[0]![0].opaqueMeshes).toBe(all);
    expect(damage.meshes.map(mesh => mesh.position.toArray())).toEqual(transforms);
    expect(intact.meshes.every(mesh => mesh.visible)).toBe(true);
  });

  it('selects only the current source shadow casters across damage and reset with no re-registration', async () => {
    const intact = intactFixture(), damage = damageFixture();
    const { presentation: p } = setup(async url => url === '/intact.glb' ? intact.root : damage.root);
    await p.setSource(definition);
    const shadow = new InkstormRacerShadow(); owned.push(shadow); shadow.refreshCasters(p);
    const selectors = shadow as unknown as { selectCasters(): void; bindings: Array<{ source: Mesh; proxy: Mesh }> };
    const bindings = [...selectors.bindings];
    for (const [remaining, expected] of [[2.15, 4], [1.5, 6], [0, 4]] as const) {
      p.updateWreckBreakup(pose(), remaining, { heightAt: () => 0 }); p.updateMatrixWorld(true); selectors.selectCasters();
      expect(selectors.bindings).toEqual(bindings);
      expect(bindings.filter(binding => binding.proxy.visible)).toHaveLength(expected);
      expect(bindings.filter(binding => binding.proxy.visible).every(binding => binding.source.visible)).toBe(true);
      expect(shadow.receipt.refreshes).toBe(1);
    }
    p.visible = false; p.syncPrepassVisibility(); selectors.selectCasters();
    expect(p.prepassMeshes.every(mesh => !mesh.visible)).toBe(true);
    expect(bindings.every(binding => !binding.proxy.visible)).toBe(true);
  });

  it('commits intact playable art when optional loading fails and reports only damage unavailable', async () => {
    const intact = intactFixture();
    const f = setup(async url => { if (url === '/damage.glb') throw new Error('damage offline'); return intact.root; });
    expect(await f.presentation.setSource(definition)).toBe('ready');
    expect(f.presentation.error).toBeNull(); expect(f.presentation.damageVariantError?.message).toContain('damage offline');
    expect(f.presentation.damageVariantAvailable).toBe(false); expect(f.presentation.wreckBreakupAvailable).toBe(true);
    expect(f.presentation.statistics.meshes).toBe(10); expect(f.presentation.getOpaqueMeshes()).toHaveLength(10);
    expect(f.library.diagnostics.leases).toBe(1); expect(f.changed).toHaveBeenCalledOnce();
  });

  it.each(['missing mesh', 'duplicate mesh', 'nonfinite UV', 'nonfinite normal', 'bad index', 'replacement budget'])(
    'rejects optional %s while preserving original source geometry and material ownership', async kind => {
      const intact = intactFixture(), damage = damageFixture();
      if (kind === 'missing mesh') damage.meshes[3]!.removeFromParent();
      if (kind === 'duplicate mesh') damage.meshes[3]!.name = damageNames[0];
      if (kind === 'nonfinite UV') damage.meshes[0]!.geometry.getAttribute('uv').setX(0, NaN);
      if (kind === 'nonfinite normal') damage.meshes[0]!.geometry.getAttribute('normal').setY(0, Infinity);
      if (kind === 'bad index') damage.meshes[0]!.geometry.index!.setX(0, 9999);
      if (kind === 'replacement budget') damage.meshes[0]!.geometry.setIndex(new Array(120 * 3).fill(0));
      const f = setup(async url => url === '/intact.glb' ? intact.root : damage.root, 150);
      expect(await f.presentation.setSource(definition)).toBe('ready');
      expect(f.presentation.damageVariantAvailable).toBe(false); expect(f.presentation.damageVariantError).not.toBeNull();
      expect(f.presentation.damageVariantError!.message).toContain(kind === 'missing mesh' ? 'complete cockpit/tether pair'
        : kind === 'duplicate mesh' ? 'unique authored mesh names' : kind === 'bad index' ? 'invalid triangle index'
          : kind === 'replacement budget' ? 'budget' : 'non-finite');
      expect(f.presentation.statistics.triangles).toBe(120); expect(f.presentation.prepassMeshes).toHaveLength(10);
      expect(f.library.diagnostics.leases).toBe(1); expect(intact.meshes.every(mesh => mesh.visible)).toBe(true);
      expect(intact.disposed.every(disposed => disposed.mock.calls.length === 0)).toBe(true);
      if (kind === 'missing mesh') damage.meshes[3]!.geometry.dispose();
    });

  it.each(['clear', 'dispose', 'replace'])('cancels both leases on %s while damage loads without stale registration', async action => {
    const intact = intactFixture(), damage = damageFixture(), replacement = artFixture();
    const pendingDamage = deferred<Group>();
    const f = setup(async url => url === '/damage.glb' ? pendingDamage.promise : url === '/intact.glb' ? intact.root : replacement.root);
    const pending = f.presentation.setSource(definition);
    await vi.waitFor(() => expect(f.library.diagnostics.leases).toBe(1));
    if (action === 'clear') f.presentation.clearArt();
    else if (action === 'dispose') f.presentation.dispose();
    else await f.presentation.setSource(source('replacement'));
    await pending;
    expect(f.changed).toHaveBeenCalledTimes(action === 'replace' ? 1 : 0);
    expect(f.presentation.activeSource?.id ?? null).toBe(action === 'replace' ? 'replacement' : null);
    pendingDamage.resolve(damage.root);
    await vi.waitFor(() => expect(damage.disposed.every(disposed => disposed.mock.calls.length === 1)).toBe(true));
    expect(intact.disposed.every(disposed => disposed.mock.calls.length === 1)).toBe(true);
    expect(f.library.diagnostics.pending).toBe(0);
  });

  it('drains an already-acquired damage lease when intact loading fails', async () => {
    const damage = damageFixture(), intactLoad = deferred<Group>();
    const f = setup(async url => url === '/damage.glb' ? damage.root : intactLoad.promise);
    const pending = f.presentation.setSource(definition);
    await vi.waitFor(() => expect(f.library.diagnostics.leases).toBe(1));
    intactLoad.reject(new Error('intact offline'));
    expect(await pending).toBe('error'); expect(f.presentation.error?.message).toContain('intact offline');
    expect(f.library.diagnostics.leases).toBe(0); expect(f.changed).not.toHaveBeenCalled();
    expect(damage.disposed.every(disposed => disposed.mock.calls.length === 1)).toBe(true);
  });

  it('cancels an already-acquired damage lease while the intact load is still pending', async () => {
    const intact = intactFixture(), damage = damageFixture(), intactLoad = deferred<Group>();
    const f = setup(async url => url === '/damage.glb' ? damage.root : intactLoad.promise);
    const pending = f.presentation.setSource(definition);
    await vi.waitFor(() => expect(f.library.diagnostics.leases).toBe(1));
    f.presentation.clearArt(); await pending;
    expect(f.library.diagnostics.leases).toBe(0); expect(f.changed).not.toHaveBeenCalled();
    expect(damage.disposed.every(disposed => disposed.mock.calls.length === 1)).toBe(true);
    intactLoad.resolve(intact.root);
    await vi.waitFor(() => expect(intact.disposed.every(disposed => disposed.mock.calls.length === 1)).toBe(true));
  });

  it('unregisters proxies before releasing each template once and shares geometry across independent racers', async () => {
    const intact = intactFixture(), damage = damageFixture();
    const f = setup(async url => url === '/intact.glb' ? intact.root : damage.root);
    const acquire = f.library.acquire.bind(f.library), releases: ReturnType<typeof vi.fn>[] = [];
    vi.spyOn(f.library, 'acquire').mockImplementation(async (...args) => {
      const lease = await acquire(...args), release = vi.fn(() => lease.release()); releases.push(release);
      return { source: lease.source, root: lease.root, get released() { return lease.released; }, release };
    });
    const other = new ImportedVehiclePresentation(f.library); owned.push(other);
    await Promise.all([f.presentation.setSource(definition), other.setSource(definition)]);
    const proxies = f.presentation.prepassMeshes, materials = f.presentation.materials;
    const materialDisposals = materials.map(material => vi.spyOn(material, 'dispose'));
    f.changed.mockImplementation(change => {
      if (change.prepassMeshes.length !== 0) return;
      expect(change.previousPrepassMeshes).toBe(proxies);
      expect(materialDisposals.every(dispose => dispose.mock.calls.length === 0)).toBe(true);
      expect(damage.disposed.every(dispose => dispose.mock.calls.length === 0)).toBe(true);
    });
    f.presentation.clearArt();
    expect(proxies.every(proxy => proxy.parent === null)).toBe(true);
    expect(materialDisposals.every(dispose => dispose.mock.calls.length === 1)).toBe(true);
    expect(f.library.diagnostics.leases).toBe(2);
    other.updateWreckBreakup(pose(), 1.5, { heightAt: () => 0 });
    expect(other.damageVariantActive).toBe(true);
    other.dispose(); f.presentation.dispose(); f.library.dispose();
    expect(releases).toHaveLength(4); expect(releases.every(release => release.mock.calls.length === 1)).toBe(true);
    expect([...intact.disposed, ...damage.disposed].every(dispose => dispose.mock.calls.length === 1)).toBe(true);
  });
});
