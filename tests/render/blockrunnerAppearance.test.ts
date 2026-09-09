import { BoxGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BLOCKRUNNER_ART_DEFINITIONS, isVehicleAppearanceId } from '../../src/game/vehicleAppearance';
import { CelMaterial } from '../../src/render/materials/CelMaterial';
import { RacerPresentation } from '../../src/render/vehicles/RacerPresentation';
import { VehicleArtLibrary } from '../../src/render/vehicles/VehicleArtLibrary';

const owned: Array<{ racer: RacerPresentation; library: VehicleArtLibrary }> = [];
function setup(index = 0) {
  const root = new Group(), geometry = new BoxGeometry(1, 1, 1);
  for (const role of ['body', 'suit', 'helmet', 'visor', 'gloves']) {
    const node = role === 'body' ? 'blockrunner-body' : `blockrunner-pilot-${role}`;
    const name = role === 'body' ? 'Blockrunner Inkstorm body atlas v1' : `Blockrunner Inkstorm pilot ${role} atlas v1`;
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ name })); mesh.name = node; root.add(mesh);
  }
  const load = vi.fn(async () => root), library = new VehicleArtLibrary({ load, maxIdleEntries: 0 });
  const racer = new RacerPresentation(library, undefined, index); racer.setVehicleClass('podracer');
  owned.push({ racer, library });
  return { racer, load, geometry, disposed: vi.spyOn(geometry, 'dispose') };
}
afterEach(() => { for (const { racer, library } of owned.splice(0)) { racer.dispose(); library.dispose(); } });

describe('Blockrunner admission wiring; synthetic geometry does not prove exported art', () => {
  it.each(['hero', 'rival'] as const)('loads only the explicit %s package with four retained pilot roles', async lod => {
    const f = setup(lod === 'hero' ? 0 : 1), proxy = f.racer.createCelPrepassProxy();
    expect(f.load).not.toHaveBeenCalled();
    await f.racer.setAppearance('blockrunner');
    expect(f.load).toHaveBeenCalledExactlyOnceWith(BLOCKRUNNER_ART_DEFINITIONS[lod].url);
    expect(f.racer.activeAppearanceId).toBe('blockrunner');
    expect(f.racer.vehicleClass).toBe('podracer');
    expect(f.racer.imported.statistics).toMatchObject({ meshes: 5, opaqueDraws: 5, bodyDraws: 1,
      pilotDraws: 4, prepassDraws: 5, shadowSourceMeshes: 1 });
    expect(f.racer.imported.getShadowMeshes().map(mesh => mesh.name)).toEqual(['blockrunner-body']);
    expect(f.racer.pilotAnchor.visible).toBe(false);
    const materials = new Map(f.racer.imported.geometryMeshes.map(mesh => [mesh.name, mesh.material as CelMaterial]));
    for (const material of materials.values()) {
      expect(material.uniforms.uWear!.value).toBe(0);
    }
    expect(materials.get('blockrunner-pilot-suit')!.uniforms.uSpecularStrength!.value).toBe(.035);
    expect(materials.get('blockrunner-pilot-gloves')!.uniforms.uSpecularStrength!.value).toBe(.035);
    expect(materials.get('blockrunner-pilot-visor')!.uniforms.uSpecularStrength!.value).toBe(.42);
    expect(materials.get('blockrunner-pilot-helmet')!.uniforms.uSpecularStrength!.value).toBe(.32);
    expect(materials.get('blockrunner-body')!.uniforms.uReflectionStrength!.value).toBe(.045);
    expect(materials.get('blockrunner-pilot-suit')!.uniforms.uRimStrength!.value).toBe(.025);
    f.racer.setLodMode('simplified');
    expect(f.racer.prepassMeshes.filter(mesh => mesh.visible)).toHaveLength(1);
    await f.racer.setAppearance('procedural');
    expect(f.racer.prepassMeshes).toEqual([proxy]); expect(f.disposed).toHaveBeenCalledOnce();
  });

  it('retains source hardware and uses root exhaust/dust anchors without duplicate coupling', async () => {
    const { racer } = setup(); await racer.setAppearance('blockrunner');
    racer.update({ x: 37, y: 8, z: -29, yaw: .4, pitch: .08, roll: -.15,
      steer: .3, throttle: .9, speed: 180, boost: .8, redline: 1.2, damage: .2 }, 1);
    const definition = BLOCKRUNNER_ART_DEFINITIONS.hero;
    expect(racer.getObjectByName('imported-engine-coupling')).toBeUndefined();
    expect((racer.getObjectByName('imported-engine-nozzle-lips') as InstancedMesh).visible).toBe(false);
    expect(racer.imported.exhaustRadialScale).toBeCloseTo(.34 / (.82 * 1.42) * (1 - 1e-6), 12);
    expect(racer.wakeAnchors.map(anchor => anchor.position.toArray())).toEqual([
      definition.attachments!.exhaustLeft!.position, definition.attachments!.exhaustRight!.position,
    ]);
    expect(racer.dustAnchors[1]!.position.toArray()).toEqual(definition.attachments!.pilot!.position);
    expect(isVehicleAppearanceId('blockrunner')).toBe(true);
    expect(isVehicleAppearanceId('blockrunner-unregistered')).toBe(false);
  });
});
