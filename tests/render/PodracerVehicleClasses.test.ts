import { describe, expect, it } from 'vitest';
import { Box3, Group } from 'three';

import {
  PodracerView,
  resolveRacerVehicleClass,
} from '../../src/render/objects/PodracerView';

function engineSpread(view: PodracerView): number {
  const engine = view.getObjectByName('engine-left');
  if (!(engine instanceof Group)) throw new Error('Missing procedural engine group.');
  return Math.abs(engine.position.x);
}

describe('procedural racer vehicle classes', () => {
  it('maps the four grid entries to distinct families and silhouettes', () => {
    expect([0, 1, 2, 3].map(resolveRacerVehicleClass)).toEqual([
      'podracer',
      'landspeeder',
      'speeder-bike',
      'skim-speeder',
    ]);
    expect([4, 5, 6, 7].map(resolveRacerVehicleClass)).toEqual([
      'podracer',
      'landspeeder',
      'speeder-bike',
      'skim-speeder',
    ]);

    const racers = [0, 1, 2, 3].map((index) => new PodracerView(undefined, index));
    expect(racers.map((racer) => racer.vehicleClass)).toEqual([
      'podracer',
      'landspeeder',
      'speeder-bike',
      'skim-speeder',
    ]);
    expect(racers.map(engineSpread)).toEqual([8.4, 3.65, 1.62, 5.65]);
    const cockpitScales = racers.map((racer) => racer.getObjectByName('cockpit')?.scale.x);
    expect(cockpitScales).toEqual([1, 1.34, 0.5, 0.8]);
    for (const racer of racers) racer.dispose();
  });

  it('retunes stable player view references when cycling vehicle class', () => {
    const racer = new PodracerView(undefined, 0);
    const pilotAnchor = racer.pilotAnchor;
    const proxy = racer.createCelPrepassProxy();
    const podProxyGeometry = proxy.geometry;
    racer.setVehicleClass('speeder-bike');
    expect(racer.vehicleClass).toBe('speeder-bike');
    expect(engineSpread(racer)).toBe(1.62);
    expect(racer.pilotAnchor).toBe(pilotAnchor);
    expect(racer.dustAnchors[0]?.position.x).toBe(-1.45);
    expect(proxy.scale.toArray()).toEqual([1, 1, 1]);
    expect(proxy.geometry).not.toBe(podProxyGeometry);
    expect(racer.getObjectByName('vehicle-module-podracer')?.visible).toBe(false);
    const bikeModule = racer.getObjectByName('vehicle-module-speeder-bike');
    expect(bikeModule?.visible).toBe(true);
    expect(bikeModule?.children.length).toBeGreaterThan(0);
    const bikeConnectivity = racer.getObjectByName('vehicle-connectivity-speeder-bike');
    const podConnectivity = racer.getObjectByName('vehicle-connectivity-podracer');
    expect(bikeConnectivity?.visible).toBe(true);
    expect(podConnectivity?.visible).toBe(false);
    if (!(bikeConnectivity instanceof Group)) throw new Error('Missing bike connectivity.');
    const bikeBounds = new Box3().setFromObject(bikeConnectivity);
    expect(Math.max(Math.abs(bikeBounds.min.x), Math.abs(bikeBounds.max.x))).toBeLessThan(2);
    racer.setVehicleClass('podracer');
    expect(engineSpread(racer)).toBe(8.4);
    expect(proxy.geometry).toBe(podProxyGeometry);
    racer.dispose();
  });

  it('displaces existing engine and coupling nodes for a reversible wreck pose', () => {
    const racer = new PodracerView(undefined, 0);
    const rightEngine = racer.getObjectByName('engine-right');
    const coupling = racer.getObjectByName('vehicle-coupling-podracer');
    if (!(rightEngine instanceof Group) || !(coupling instanceof Group)) {
      throw new Error('Missing wreck presentation nodes.');
    }
    const pose = {
      x: 0, y: 4, z: 0, yaw: 0, pitch: 0, roll: 0,
      steer: 0, throttle: 0.4, speed: 80, boost: 0, damage: 0.95,
    };
    racer.update({ ...pose, wrecked: true }, 1);
    expect(rightEngine.position.z).toBeLessThan(6);
    expect(Math.abs(rightEngine.rotation.y)).toBeGreaterThan(0.2);
    expect(coupling.scale.y).toBeLessThan(0.8);
    racer.update({ ...pose, wrecked: false }, 2);
    expect(rightEngine.position.z).toBeCloseTo(7.2);
    expect(rightEngine.rotation.y).toBe(0);
    expect(coupling.scale.toArray()).toEqual([1, 1, 1]);
    racer.dispose();
  });
});
