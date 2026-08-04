import { describe, expect, it, vi } from 'vitest';
import { Group, Mesh } from 'three';

import {
  applyDistantRivalLodDecision,
  PodracerView,
  resolveDistantRivalLod,
  type DistantRivalLod,
} from '../../src/render/objects/PodracerView';

function named(root: Group, name: string): Group | Mesh {
  const object = root.getObjectByName(name);
  if (!(object instanceof Group) && !(object instanceof Mesh)) {
    throw new Error(`Missing LOD fixture ${name}.`);
  }
  return object;
}

function classMeshes(root: PodracerView, predicate: (mesh: Mesh) => boolean): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (
      object instanceof Mesh
      && object.userData.vehicleClass === root.vehicleClass
      && predicate(object)
    ) meshes.push(object);
  });
  return meshes;
}

describe('runtime distant-rival LOD', () => {
  it('retires sub-pixel detail while preserving the craft silhouette and exhaust', () => {
    const racer = new PodracerView(undefined, 1);
    const proxy = racer.createCelPrepassProxy();
    const fullPrepassVertices = proxy.geometry.getAttribute('position')?.count ?? 0;
    const leftEngine = named(racer, 'engine-left');
    const rightEngine = named(racer, 'engine-right');
    const cockpit = named(racer, 'cockpit');
    const leftExhaust = named(racer, 'engine-exhaust');
    const exhausts = racer.getObjectsByProperty('name', 'engine-exhaust');
    const leftTurbines = named(racer, 'engine-left-turbines');
    const rightTurbines = named(racer, 'engine-right-turbines');
    const silhouetteProxy = named(racer, 'podracer-1-distant-cel-silhouette');
    const coupling = classMeshes(racer, (mesh) => (
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        .some((material) => material.name === 'EnergyCoupling')
    ));
    const chassisDetail = classMeshes(racer, (mesh) => mesh.name.includes('-chassis-'));

    expect(racer.lodMode).toBe('full');
    expect(proxy.visible).toBe(true);
    expect(racer.pilotAnchor.visible).toBe(true);
    expect(leftTurbines.visible).toBe(true);
    expect(rightTurbines.visible).toBe(true);
    expect(exhausts).toHaveLength(2);
    expect(leftExhaust.visible).toBe(true);
    expect(silhouetteProxy.visible).toBe(false);
    expect(coupling.length).toBeGreaterThan(0);
    expect(chassisDetail.length).toBeGreaterThan(0);

    racer.setLodMode('simplified');
    expect(racer.lodMode).toBe('simplified');
    expect(racer.pilotAnchor.visible).toBe(false);
    expect(leftTurbines.visible).toBe(false);
    expect(rightTurbines.visible).toBe(false);
    expect(proxy.visible).toBe(true);
    expect(proxy.geometry.getAttribute('position')?.count ?? 0).toBeLessThan(fullPrepassVertices);
    expect(proxy.geometry.getAttribute('position')?.count ?? 0).toBeGreaterThan(500);
    expect(coupling.every((object) => object.visible)).toBe(true);
    expect(chassisDetail.every((object) => object.visible)).toBe(true);
    expect(leftEngine.visible).toBe(true);
    expect(rightEngine.visible).toBe(true);
    expect(cockpit.visible).toBe(true);
    expect(exhausts.every((object) => object.visible)).toBe(true);
    expect(silhouetteProxy.visible).toBe(false);

    racer.setLodMode('silhouette');
    expect(racer.lodMode).toBe('silhouette');
    expect(coupling.every((object) => !object.visible)).toBe(true);
    expect(chassisDetail.every((object) => !object.visible)).toBe(true);
    expect(leftEngine.visible).toBe(false);
    expect(rightEngine.visible).toBe(false);
    expect(cockpit.visible).toBe(false);
    expect(exhausts.every((object) => !object.visible)).toBe(true);
    expect(silhouetteProxy.visible).toBe(true);
    expect((silhouetteProxy as Mesh).geometry.getAttribute('position')?.count ?? 0)
      .toBeGreaterThan(500);

    racer.setLodMode('full');
    expect(racer.lodMode).toBe('full');
    expect(racer.pilotAnchor.visible).toBe(true);
    expect(leftTurbines.visible).toBe(true);
    expect(rightTurbines.visible).toBe(true);
    expect(proxy.visible).toBe(true);
    expect(proxy.geometry.getAttribute('position')?.count).toBe(fullPrepassVertices);
    expect(coupling.every((object) => object.visible)).toBe(true);
    expect(chassisDetail.every((object) => object.visible)).toBe(true);
    expect(silhouetteProxy.visible).toBe(false);
    racer.dispose();
  });

  it('uses the governor boundary with hysteresis and immediately restores full mode', () => {
    expect(resolveDistantRivalLod('full', 'simplified', 319, 320)).toBe('full');
    expect(resolveDistantRivalLod('full', 'simplified', 320, 320)).toBe('simplified');
    expect(resolveDistantRivalLod('simplified', 'simplified', 305, 320)).toBe('simplified');
    expect(resolveDistantRivalLod('simplified', 'simplified', 296, 320)).toBe('full');
    expect(resolveDistantRivalLod('silhouette', 'full', 2_000, 90)).toBe('full');
    expect(resolveDistantRivalLod('silhouette', 'silhouette', Number.NaN, 90)).toBe('full');

    let current: DistantRivalLod = 'full';
    const target = { setLodMode: vi.fn<(mode: DistantRivalLod) => void>() };
    const decision = {
      distantRivalLod: 'silhouette' as const,
      distantRivalLodDistance: 90,
    };
    current = applyDistantRivalLodDecision(target, current, decision, 120);
    expect(current).toBe('silhouette');
    expect(target.setLodMode).toHaveBeenLastCalledWith('silhouette');

    current = applyDistantRivalLodDecision(target, current, decision, 78);
    expect(current).toBe('silhouette');
    expect(target.setLodMode).toHaveBeenCalledTimes(1);

    current = applyDistantRivalLodDecision(target, current, {
      distantRivalLod: 'simplified',
      distantRivalLodDistance: 220,
    }, 2_000);
    expect(current).toBe('silhouette');
    expect(target.setLodMode).toHaveBeenCalledTimes(1);

    current = applyDistantRivalLodDecision(target, current, {
      distantRivalLod: 'full',
      distantRivalLodDistance: 360,
    }, 1_100);
    expect(current).toBe('silhouette');
    expect(target.setLodMode).toHaveBeenCalledTimes(1);

    current = applyDistantRivalLodDecision(target, current, {
      distantRivalLod: 'full',
      distantRivalLodDistance: 360,
    }, 780);
    expect(current).toBe('full');
    expect(target.setLodMode).toHaveBeenLastCalledWith('full');
  });

  it('lets non-focus pack racers merge at an authored horizon boundary', () => {
    const target = { setLodMode: vi.fn<(mode: DistantRivalLod) => void>() };
    const packDecision = {
      distantRivalLod: 'simplified' as const,
      distantRivalLodDistance: 0,
      horizonSilhouetteDistance: 360,
      horizonSilhouetteHysteresis: 48,
    };
    let current: DistantRivalLod = 'full';

    current = applyDistantRivalLodDecision(target, current, packDecision, 240);
    expect(current).toBe('simplified');
    expect(target.setLodMode).toHaveBeenLastCalledWith('simplified');

    current = applyDistantRivalLodDecision(target, current, packDecision, 361);
    expect(current).toBe('silhouette');
    expect(target.setLodMode).toHaveBeenLastCalledWith('silhouette');

    current = applyDistantRivalLodDecision(target, current, packDecision, 330);
    expect(current).toBe('silhouette');
    expect(target.setLodMode).toHaveBeenCalledTimes(2);

    current = applyDistantRivalLodDecision(target, current, packDecision, 311);
    expect(current).toBe('simplified');
    expect(target.setLodMode).toHaveBeenLastCalledWith('simplified');
  });
});
