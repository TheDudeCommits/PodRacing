import { describe, expect, it, vi } from 'vitest';
import type { BufferGeometry } from 'three';
import { DustSystem } from '../../src/render/terrain/DustSystem';
import { GroundDustRings } from '../../src/render/terrain/GroundDustRings';
import {
  sampleTerrainHeight,
  type TerrainSample,
  type TerrainSampler,
  type TerrainSurfaceSample,
} from '../../src/render/terrain/terrainMath';

function fixtureTerrain(initialHeight: number) {
  let height = initialHeight;
  const terrain: TerrainSampler = {
    sampleHeight: vi.fn(() => height),
    sample: vi.fn((_x: number, _z: number, out: TerrainSample) => Object.assign(out, {
      height, slopeX: .7, slopeZ: 0, slope: .7,
      normalX: -.57, normalY: .82, normalZ: 0, density: .4, crest: 1, ripple: 0,
    })),
    sampleSurface: vi.fn((_x: number, _z: number, out: TerrainSurfaceSample) => Object.assign(out, {
      height, density: .4, crest: 1, ripple: 0,
    })),
  };
  return { terrain, setHeight: (value: number) => { height = value; } };
}

function drawnHeights(geometry: BufferGeometry): number[] {
  const index = geometry.index;
  const position = geometry.getAttribute('position');
  expect(index).not.toBeNull();
  const count = Math.min(geometry.drawRange.count, index!.count);
  expect(count).toBeGreaterThan(0);
  return Array.from({ length: count }, (_, i) => position.getY(index!.getX(i)));
}

describe('dust shared terrain sampling', () => {
  it('preserves the standalone legacy default and masks against an injected surface', () => {
    const legacy = new GroundDustRings({ capacity: 2 });
    const base = sampleTerrainHeight(12, -30);
    legacy.emitContact(12, base + 1, -30, 4, 1);
    legacy.commit(0, 0, 0);
    expect(legacy.mesh.geometry.getAttribute('iCenter').getY(0)).toBeCloseTo(base + .13, 4);
    legacy.dispose();

    const { terrain } = fixtureTerrain(400);
    const rings = new GroundDustRings({ capacity: 2, terrain });
    rings.emitContact(12, 401, -30, 4, 1);
    rings.emitContact(12, 425, -30, 4, 1);
    rings.commit(0, 0, 0);
    expect(rings.mesh.geometry.instanceCount).toBe(1);
    expect(rings.mesh.geometry.getAttribute('iCenter').getY(0)).toBeCloseTo(400.13, 4);
    rings.dispose();
  });

  it('puts all four pools and wake camera clearance on the injected terrain', () => {
    const { terrain, setHeight } = fixtureTerrain(400);
    const dust = new DustSystem({
      terrain,
      wakes: { maxRacers: 1, samplesPerTrail: 8 },
      groundRings: { capacity: 2 },
      crestDust: { capacity: 16, distributionRadius: 120, candidateSpacing: 60 },
      spray: { capacity: 32 },
    });
    dust.beginFrame();
    dust.emitGroundContact(12, 401, -30, 4, 1);
    for (let i = 0; i < 8; i++) dust.pushWakePair(0, -5, i * 4, 5, i * 4, 1, i * .02);
    dust.emitSpray(12, 402, -30, .4, 1, 1, 8);
    const frame = {
      time: .2, deltaSeconds: 1 / 120,
      cameraWorldX: 1000, cameraWorldY: 405, cameraWorldZ: -1000,
      renderOriginX: 960, renderOriginZ: -960,
      windX: .94, windZ: .34, windStrength: 1,
    };
    dust.update(frame);
    dust.settleDeterministicEffects();
    expect(dust.groundRings.mesh.geometry.getAttribute('iCenter').getY(0)).toBeCloseTo(400.13, 4);
    expect(dust.wakes.mesh.material.uniforms.uElevatedView!.value).toBe(0);
    expect(drawnHeights(dust.wakes.mesh.geometry).every(y => y > 401 && y < 403)).toBe(true);
    expect(drawnHeights(dust.spray.mesh.geometry).every(y => Math.abs(y - 400.16) < .001)).toBe(true);
    const crestCount = dust.crestDust.mesh.geometry.instanceCount;
    expect(crestCount).toBeGreaterThan(0);
    for (let i = 0; i < crestCount; i++) {
      expect(dust.crestDust.mesh.geometry.getAttribute('iWorld').getY(i)).toBeCloseTo(400.28, 4);
    }
    expect(terrain.sampleSurface).toHaveBeenCalled();
    expect(terrain.sample).toHaveBeenCalled();

    // A stable TerrainSystem instance can switch its course field. Persistent
    // wakes and spray must query that instance again, rather than capturing a
    // height function that still represents the old base desert.
    setHeight(-150);
    dust.advancePersistentEffects(.21, 1 / 120, 960, -960);
    expect(drawnHeights(dust.wakes.mesh.geometry).every(y => y > -149 && y < -147)).toBe(true);
    expect(drawnHeights(dust.spray.mesh.geometry).every(y => Math.abs(y + 149.84) < .001)).toBe(true);
    dust.clear();
    dust.update({ ...frame, time: .22, cameraWorldY: -145 });
    dust.settleDeterministicEffects();
    expect(dust.crestDust.mesh.geometry.instanceCount).toBeGreaterThan(0);
    expect(dust.crestDust.mesh.geometry.getAttribute('iWorld').getY(0)).toBeCloseTo(-149.72, 4);
    dust.dispose();
  });

  it('uses a facade surface consistently even when a child has another sampler', () => {
    const facade = fixtureTerrain(250).terrain;
    const child = fixtureTerrain(-150).terrain;
    const dust = new DustSystem({ terrain: facade, groundRings: { terrain: child } });
    dust.emitGroundContact(0, 251, 0, 3, 1);
    dust.groundRings.commit(0, 0, 0);
    expect(dust.groundRings.mesh.geometry.getAttribute('iCenter').getY(0)).toBeCloseTo(250.13, 4);
    expect(child.sampleHeight).not.toHaveBeenCalled();
    dust.dispose();
  });
});
