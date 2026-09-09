import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POLWO_ART_DEFINITIONS, POLWO_BODY_NODES } from '../../src/game/vehicleAppearance';
import { CelMaterial } from '../../src/render/materials/CelMaterial';
import { RacerPresentation } from '../../src/render/vehicles/RacerPresentation';
import { VehicleArtLibrary } from '../../src/render/vehicles/VehicleArtLibrary';
import { deferred } from './vehicleArtFixtures';

// Synthetic rigid primitives exercise the real presentation adapter without
// pretending that synthetic geometry proves real GLB admission or art quality.
function polwoFixture() {
  const root = new Group(), geometry = new BoxGeometry(2, 1, 4);
  const body = new MeshStandardMaterial({ name: 'Polwo Inkstorm body paint-v1' });
  for (const name of Object.values(POLWO_BODY_NODES)) {
    const mesh = new Mesh(geometry, body); mesh.name = name; root.add(mesh);
  }
  for (const part of ['accent', 'hardware', 'rubber', 'shell', 'suit', 'webbing']) {
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ name: `Pilot atlas v4c runtime ${part}` }));
    mesh.name = `polwo-pilot-${part}`; root.add(mesh);
  }
  return { root, geometryDisposed: vi.spyOn(geometry, 'dispose') };
}

const owned: Array<{ racer: RacerPresentation; library: VehicleArtLibrary }> = [];
function setup(load: (url: string) => Promise<Group>, index = 0) {
  const library = new VehicleArtLibrary({ load, maxIdleEntries: 0 });
  const racer = new RacerPresentation(library, undefined, index);
  racer.setVehicleClass('podracer');
  owned.push({ racer, library });
  return { racer, proxy: racer.createCelPrepassProxy() };
}
afterEach(() => {
  for (const { racer, library } of owned.splice(0)) { racer.dispose(); library.dispose(); }
});

describe('Polwo appearance integration', () => {
  it.each(['hero', 'rival'] as const)('uses the distinct %s URL, canonical body shadows and six pilot prepasses', async lod => {
    const fixture = polwoFixture(), load = vi.fn(async () => fixture.root);
    const { racer, proxy } = setup(load, lod === 'hero' ? 0 : 1);
    await racer.setAppearance('polwo');
    expect(load).toHaveBeenCalledWith(POLWO_ART_DEFINITIONS[lod].url);
    expect(racer.activeAppearanceId).toBe('polwo');
    expect(racer.vehicleClass).toBe('podracer');
    expect(racer.imported.statistics).toMatchObject({ bodyDraws: 2, pilotDraws: 6, opaqueDraws: 8, prepassDraws: 8, shadowSourceMeshes: 2 });
    expect(racer.imported.getShadowMeshes().map(mesh => mesh.name).toSorted()).toEqual(Object.values(POLWO_BODY_NODES).toSorted());
    expect(racer.prepassMeshes).toHaveLength(8);
    expect(racer.prepassMeshes).not.toContain(proxy);
    const painted = racer.imported.geometryMeshes.find(mesh => mesh.name === POLWO_BODY_NODES.main)!.material as CelMaterial;
    expect(painted.uniforms.uRimStrength?.value).toBe(0);
    expect(painted.uniforms.uReflectionStrength?.value).toBe(0);
    expect(painted.uniforms.uWear?.value).toBe(0);
    const suit = racer.imported.geometryMeshes.find(mesh => mesh.name === 'polwo-pilot-suit')!.material as CelMaterial;
    expect(suit.uniforms.uSpecularStrength?.value).toBe(.025);
    expect(suit.uniforms.uRimStrength?.value).toBe(0);
    expect(suit.uniforms.uWear?.value).toBe(0);
    expect(suit.uniforms.uNormalScale?.value.toArray()).toEqual([.25, .25]);
    racer.setLodMode('simplified');
    expect(racer.prepassMeshes.filter(mesh => mesh.visible)).toHaveLength(2);
    expect(racer.pilotAnchor.visible).toBe(false);
    await racer.setAppearance('procedural');
    expect(racer.prepassMeshes).toEqual([proxy]);
    expect(fixture.geometryDisposed).toHaveBeenCalledOnce();
  });

  it('places coupling, nozzle lips, flames, wake and dust at measured model-root anchors', async () => {
    const { racer } = setup(async () => polwoFixture().root);
    await racer.setAppearance('polwo');
    racer.update({ x: 37, y: 8, z: -29, yaw: .4, pitch: .08, roll: -.15,
      steer: .3, throttle: .9, speed: 180, boost: .8, damage: .2 }, 1);
    racer.updateMatrixWorld(true);
    expect(racer.position.toArray()).toEqual([37, 8, -29]);
    const attachments = POLWO_ART_DEFINITIONS.hero.attachments!;
    const coupling = racer.getObjectByName('imported-engine-coupling') as Mesh<TubeGeometry>;
    const curve = coupling.geometry.parameters.path;
    expect(curve.getPoint(0).toArray()).toEqual(attachments.couplingLeft!.position);
    expect(curve.getPoint(1).toArray()).toEqual(attachments.couplingRight!.position);
    expect(racer.wakeAnchors.map(anchor => anchor.position.toArray())).toEqual([
      attachments.exhaustLeft!.position, attachments.exhaustRight!.position,
    ]);
    expect(racer.dustAnchors[1]!.position.toArray()).toEqual([0, 4.2725324630737305, -5.199999809265137]);
    const nozzles = racer.getObjectByName('imported-engine-nozzle-lips') as InstancedMesh;
    const flames = racer.getObjectsByProperty('name', 'imported-engine-exhaust') as Mesh[];
    expect(nozzles.visible).toBe(true); expect(flames).toHaveLength(2);
    for (const [index, key] of ['exhaustLeft', 'exhaustRight'].entries()) {
      const anchor = racer.imported.getAttachment(key)!;
      const matrix = new Matrix4(); nozzles.getMatrixAt(index, matrix);
      const nozzle = new Vector3().setFromMatrixPosition(matrix);
      expect(nozzle.distanceTo(anchor.position)).toBeLessThan(1e-6);
      const flame = flames[index]!; flame.geometry.computeBoundingBox();
      const base = new Vector3(0, flame.geometry.boundingBox!.min.y, 0).applyMatrix4(flame.matrixWorld);
      expect(base.distanceTo(racer.localToWorld(anchor.position.clone()))).toBeLessThan(1e-6);
    }
  });

  it('keeps a failed Polwo selection explicit, retries it, and discards late art after Classic is selected', async () => {
    const pending = deferred<Group>(), fixture = polwoFixture();
    const load = vi.fn().mockRejectedValueOnce(new Error('Polwo unavailable')).mockImplementationOnce(() => pending.promise);
    const { racer, proxy } = setup(load);
    await racer.setAppearance('polwo');
    expect(racer.appearanceId).toBe('polwo');
    expect(racer.activeAppearanceId).toBe('procedural');
    expect(racer.appearanceStatus).toBe('error');
    expect(racer.prepassMeshes).toEqual([proxy]);
    const retry = racer.retryAppearance();
    await Promise.resolve();
    await racer.setAppearance('procedural');
    pending.resolve(fixture.root); await retry;
    await vi.waitFor(() => expect(fixture.geometryDisposed).toHaveBeenCalledOnce());
    expect(load.mock.calls.map(([url]) => url)).toEqual([POLWO_ART_DEFINITIONS.hero.url, POLWO_ART_DEFINITIONS.hero.url]);
    expect(racer.activeAppearanceId).toBe('procedural');
    expect(racer.prepassMeshes).toEqual([proxy]);
  });
});
