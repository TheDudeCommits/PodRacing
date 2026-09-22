import type { PodIdentityId } from './podIdentity';
import type { TerrainProbeDefinition } from './simulation/config';
export interface PodHullCapsule { ax: number; az: number; bx: number; bz: number; radius: number }
export interface PodFootprint {
  hull: readonly PodHullCapsule[];
  probes: readonly TerrainProbeDefinition[];
  radius: number;
  engineX: number;
  exhaustZ: number;
  height: number;
}
/** Metres in the normalized runtime GLBs, +Z forward. Capsules omit cables/antennae.
 * Bounds verified from POSITION accessors in all eight hero packages, round 48. */
function twin(x: number, rear: number, nose: number, radius: number, cockpitRear: number, cockpitFront: number,
  cockpitRadius: number, height: number): PodFootprint {
  const hull = [
    { ax: -x, az: rear + radius, bx: -x, bz: nose - radius, radius },
    { ax: x, az: rear + radius, bx: x, bz: nose - radius, radius },
    { ax: 0, az: cockpitRear + cockpitRadius, bx: 0, bz: cockpitFront - cockpitRadius, radius: cockpitRadius },
  ];
  const probes: TerrainProbeDefinition[] = [
    { id: 'cockpit-front', localX: 0, localZ: cockpitFront },
    { id: 'cockpit-rear', localX: 0, localZ: cockpitRear },
    { id: 'engine-left-front', localX: -x, localZ: nose - 1 },
    { id: 'engine-left-rear', localX: -x, localZ: rear + .5 },
    { id: 'engine-right-front', localX: x, localZ: nose - 1 },
    { id: 'engine-right-rear', localX: x, localZ: rear + .5 },
    { id: 'engine-left-nose', localX: -x, localZ: nose },
    { id: 'engine-right-nose', localX: x, localZ: nose },
  ];
  return Object.freeze({ hull: Object.freeze(hull.map(value => Object.freeze(value))), probes: Object.freeze(probes.map(value => Object.freeze(value))),
    radius: Math.max(...hull.map(h => Math.max(Math.hypot(h.ax, h.az), Math.hypot(h.bx, h.bz)) + h.radius)),
    engineX: x, exhaustZ: rear, height });
}
export const POD_FOOTPRINTS: Readonly<Record<PodIdentityId, PodFootprint>> = Object.freeze({
  teemto: twin(4.05, 5.1, 22.7, 2.45, -7.4, -1, 2.8, 5.3),
  sebulba: twin(4.43, 3.65, 19.1, 3.6, -7.3, -.5, 2.5, 8.3),
  polwo: twin(3.93, 8.1, 22.35, 1.4, -7.6, -.5, 2.1, 5.7),
  blockrunner: twin(3.15, -1.5, 8.65, 1.5, -10.5, -1.5, 2.3, 4.8),
  verdigris: twin(4.36, 5.6, 11.75, 1.6, -6, -1.2, 2.15, 4.6),
  skybolt: twin(3.08, 3.3, 18, 1.55, -6, -1, 1.8, 4.1),
  needle: twin(3.91, 6.65, 9.85, 1.6, -6, 3.4, 2.1, 4.9),
  // One compact turbine: no invisible twin-engine arms in traffic.
  pog: (() => { const base = twin(.85, -5.8, -.75, .5, -6, -.75, 1.3, 7.5);
    return Object.freeze({ ...base, hull: Object.freeze([{ ax: 0, az: -4.7, bx: 0, bz: -2.05, radius: 1.38 }]), engineX: 0 }); })(),
  procedural: twin(4.1, .5, 19, 2.4, -6.5, -.5, 3, 5.5),
});
