import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import { GroundDustRings } from '../../src/render/terrain/GroundDustRings';
import { CrestDust } from '../../src/render/terrain/CrestDust';
import { SandSpray } from '../../src/render/terrain/SandSpray';
import { WakeRibbons } from '../../src/render/terrain/WakeRibbons';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { SpeedStreaks } from '../../src/render/objects/SpeedStreaks';
import { GroundContactShadows } from '../../src/render/objects/GroundContactShadows';

describe('fixed-capacity dust pools', () => {
  it('masks repulsorlift rings against actual terrain clearance', () => {
    const rings = new GroundDustRings({ capacity: 3 });
    const ground = sampleTerrainHeight(12, -30);
    rings.beginFrame();
    rings.emitContact(12, ground + 1.2, -30, 4, 1);
    rings.emitContact(20, sampleTerrainHeight(20, -30) + 20, -30, 4, 1);
    rings.commit(1, 0, 0);
    expect(rings.mesh.geometry.instanceCount).toBe(1);
    rings.dispose();
  });

  it('keeps persistent twin wakes finite across render-origin changes', () => {
    const wakes = new WakeRibbons({ maxRacers: 1, samplesPerTrail: 8 });
    for (let index = 0; index < 12; index += 1) {
      wakes.pushPair(
        0,
        100_000 + index * 4,
        -200_000 - index * 6,
        100_006 + index * 4,
        -200_000 - index * 6,
        0.9,
        index * 0.05,
      );
    }
    wakes.update(0.7, 99_840, -199_680);
    const positions = wakes.mesh.geometry.getAttribute('position');
    const alphas = wakes.mesh.geometry.getAttribute('aWakeAlpha');
    let visibleVertices = 0;
    for (let index = 0; index < positions.count; index += 1) {
      expect(Number.isFinite(positions.getX(index))).toBe(true);
      expect(Number.isFinite(positions.getY(index))).toBe(true);
      expect(Number.isFinite(positions.getZ(index))).toBe(true);
      expect(alphas.getX(index)).toBeGreaterThanOrEqual(0);
      expect(alphas.getX(index)).toBeLessThanOrEqual(1);
      if (alphas.getX(index) > 0) visibleVertices += 1;
    }
    expect(visibleVertices).toBeGreaterThan(16);
    // An eight-sample test trail is shorter than the first controlled gap, so
    // all joins remain live. Shipping trails stagger sparse lane gaps while
    // the camera exclusion independently guards the near plane.
    expect(wakes.mesh.geometry.drawRange.count).toBe(84);
    wakes.dispose();
  });

  it('submits no speculative wake triangles for a lone low-speed point', () => {
    const wakes = new WakeRibbons({ maxRacers: 1, samplesPerTrail: 8 });
    wakes.pushPair(0, -4, 12, 4, 12, 0.1, 0);
    wakes.update(0.05, 0, 0, 0, 0);
    expect(wakes.mesh.geometry.drawRange.count).toBe(0);
    wakes.dispose();
  });

  it('warm-starts parallel history from a first high-speed engine pair', () => {
    const wakes = new WakeRibbons({ maxRacers: 1, samplesPerTrail: 32 });
    wakes.pushPair(0, -5, 12, 5, 12, 0.9, 1);
    wakes.update(1.01, 0, 0);
    expect(wakes.mesh.geometry.drawRange.count).toBe(372);
    const positions = wakes.mesh.geometry.getAttribute('position');
    const alphas = wakes.mesh.geometry.getAttribute('aWakeAlpha');
    const ages = wakes.mesh.geometry.getAttribute('aWakeAge');
    const noise = wakes.mesh.geometry.getAttribute('aWakeNoise');
    const trail = wakes.mesh.geometry.getAttribute('aWakeTrail');
    let minimumZ = Number.POSITIVE_INFINITY;
    for (let index = 0; index < positions.count; index += 1) {
      minimumZ = Math.min(minimumZ, positions.getZ(index));
      expect(noise.getX(index)).toBeGreaterThanOrEqual(0);
      expect(noise.getX(index)).toBeLessThanOrEqual(1);
    }
    // The denser shipping spacing warm-starts roughly thirty metres of plume
    // without stretching the bounded strip into a course-length road.
    expect(minimumZ).toBeLessThan(-13);
    // Warm-started trails must already communicate dissipation: the oldest
    // live cross-section is wider, older and fainter than the engine-adjacent
    // newest sample, even though all vertices remain in one pooled draw.
    const crossSectionSize = 2;
    const newestSample = 31 * crossSectionSize;
    const oldestSpan = Math.abs(positions.getX(1) - positions.getX(0));
    const newestSpan = Math.abs(
      positions.getX(newestSample + 1) - positions.getX(newestSample),
    );
    expect(oldestSpan).toBeGreaterThan(newestSpan * 1.8);
    expect(ages.getX(0)).toBeGreaterThan(ages.getX(newestSample));
    expect(trail.getX(0)).toBe(1);
    expect(trail.getX(newestSample)).toBe(0);
    expect(alphas.getX(0)).toBeLessThan(alphas.getX(newestSample));
    wakes.dispose();
  });

  it('keeps broad twin wakes as continuous paired-edge strips', () => {
    const wakes = new WakeRibbons({
      maxRacers: 1,
      samplesPerTrail: 16,
      minimumSpacing: 1,
    });
    for (let index = 0; index < 16; index += 1) {
      wakes.pushPair(0, -5, index * 3, 5, index * 3, 1, index * 0.01);
    }
    wakes.update(0.18, 0, 0);
    // Two 15-segment lanes submit exactly two triangles per join. Organic gaps
    // live in the shader field, never as omitted geometry modules or rungs.
    expect(wakes.mesh.geometry.drawRange.count).toBe(180);
    wakes.dispose();
  });

  it('fades the player wake before a low chase near plane while retaining its visible trail', () => {
    const wakes = new WakeRibbons({
      maxRacers: 2,
      samplesPerTrail: 8,
      minimumSpacing: 1,
      cameraExclusionRadius: 8,
    });
    for (let index = 0; index < 8; index += 1) {
      wakes.pushPair(0, -4, index * 4, 4, index * 4, 0.9, index * 0.02);
      wakes.pushPair(1, 20, index * 4, 28, index * 4, 0.9, index * 0.02);
    }
    wakes.update(0.2, 0, 0, 0, 14);
    // The complete player pair is retained. Rival banks may all lie inside
    // their larger camera exclusion after outward turbulence is applied.
    expect(wakes.mesh.geometry.drawRange.count).toBeGreaterThanOrEqual(84);
    expect(wakes.mesh.geometry.drawRange.count).toBeLessThanOrEqual(168);
    wakes.dispose();
  });

  it('throws twin chase wakes outward while their heads stay attached to the engine pair', () => {
    const capacity = 24;
    const wakes = new WakeRibbons({
      maxRacers: 1,
      samplesPerTrail: capacity,
      minimumSpacing: 1,
      cameraExclusionRadius: 8,
    });
    for (let index = 0; index < capacity; index += 1) {
      wakes.pushPair(0, -5, index * 3, 5, index * 3, 1, index * 0.01);
    }
    // The lens is twenty-seven metres behind the newest sample. The visible
    // mid-plume must open around it instead of collapsing into faint curls.
    wakes.update(0.25, 0, 0, 0, 42, 14, true);
    const positions = wakes.mesh.geometry.getAttribute('position');
    const alphas = wakes.mesh.geometry.getAttribute('aWakeAlpha');
    const verticesPerStrip = capacity * 2;
    const centreX = (strip: number, sample: number): number => {
      const vertex = strip * verticesPerStrip + sample * 2;
      return (positions.getX(vertex) + positions.getX(vertex + 1)) * 0.5;
    };
    const span = (strip: number, sample: number): number => {
      const vertex = strip * verticesPerStrip + sample * 2;
      return Math.abs(positions.getX(vertex + 1) - positions.getX(vertex));
    };
    const newestSeparation = centreX(1, 23) - centreX(0, 23);
    const bankSample = 20;
    const midSeparation = centreX(1, bankSample) - centreX(0, bankSample);
    expect(midSeparation).toBeGreaterThan(newestSeparation + 3);
    expect(span(0, bankSample)).toBeGreaterThan(span(0, 23) * 1.35);
    expect(alphas.getX(bankSample * 2)).toBeGreaterThan(0.2);
    expect(alphas.getX(verticesPerStrip + bankSample * 2)).toBeGreaterThan(0.2);
    wakes.dispose();
  });

  it('keeps velocity slashes in one camera-space mesh draw', () => {
    const streaks = new SpeedStreaks(12);
    const geometry = streaks.lines.geometry;
    expect(geometry.getAttribute('position').count).toBe(48);
    expect(geometry.index?.count).toBe(72);
    expect(streaks.lines.material.depthTest).toBe(false);
    streaks.update(1, 120, new Vector3(80_000, 10, -90_000), Math.PI * 0.75);
    // World position and yaw do not move the mesh: the shader owns clip-space
    // placement, so the marks cannot become sand-aligned rails.
    expect(streaks.lines.position.lengthSq()).toBe(0);
    expect(streaks.lines.rotation.y).toBe(0);
    expect(streaks.lines.visible).toBe(true);
    // Every authored ray points below the elevated vanishing point. Sky
    // atmosphere may have its own strokes, but this ground-parallax system
    // must never contribute a uniform sky overlay.
    const directions = geometry.getAttribute('position');
    for (let index = 0; index < directions.count; index += 4) {
      expect(directions.getY(index)).toBeLessThan(0);
    }
    streaks.dispose();
  });

  it('uses separated pod-shaped contact lobes that shrink with clearance', () => {
    const shadows = new GroundContactShadows(2);
    expect(shadows.mesh.geometry.getAttribute('position').count).toBeLessThanOrEqual(108);
    expect(shadows.mesh.geometry.index?.count).toBeLessThanOrEqual(432);
    const opacity = shadows.mesh.geometry.getAttribute('color');
    expect(opacity.itemSize).toBe(4);
    expect(Array.from({ length: opacity.count }, (_, index) => opacity.getW(index))).toContain(0);
    expect(Array.from({ length: opacity.count }, (_, index) => opacity.getW(index))).toContain(1);
    shadows.update(0, 0, 0, 0, 0, 1.2, 1);
    shadows.update(1, 30, 0, 0, 0, 30, 1);
    const grounded = new Matrix4();
    const airborne = new Matrix4();
    shadows.mesh.getMatrixAt(0, grounded);
    shadows.mesh.getMatrixAt(1, airborne);
    expect(grounded.elements[0]).toBeGreaterThan(airborne.elements[0] ?? 0);
    shadows.dispose();
  });

  it('incrementally fills deterministic crest dust without exceeding capacity', () => {
    const dust = new CrestDust({ capacity: 32, distributionRadius: 520 });
    for (let frame = 0; frame < 18; frame += 1) {
      dust.update(frame / 60, 240, -360, 0, 0, 0.94, 0.34, 1);
    }
    expect(dust.mesh.geometry.instanceCount).toBeGreaterThan(0);
    expect(dust.mesh.geometry.instanceCount).toBeLessThanOrEqual(32);
    const firstCount = dust.mesh.geometry.instanceCount;
    const firstWorlds = Array.from(
      dust.mesh.geometry.getAttribute('iWorld').array.slice(0, firstCount * 3),
    );
    dust.update(1, 240, -360, 0, 0, 0.94, 0.34, 1);
    expect(dust.mesh.geometry.instanceCount).toBe(firstCount);
    dust.clear();
    for (let frame = 0; frame < 18; frame += 1) {
      dust.update(frame / 60, 240, -360, 0, 0, 0.94, 0.34, 1);
    }
    expect(dust.mesh.geometry.instanceCount).toBe(firstCount);
    expect(Array.from(
      dust.mesh.geometry.getAttribute('iWorld').array.slice(0, firstCount * 3),
    )).toEqual(firstWorlds);
    dust.dispose();
  });

  it('rewinds spray allocation and randomness when a capture preset clears it', () => {
    const spray = new SandSpray({ capacity: 32 });
    // Eight fixed stream lanes share one dynamic five-vertex faceted bank.
    // Emissions append real 3D cross-sections instead of creating an
    // instanced billboard/card for every simulation event.
    expect(spray.mesh.geometry.getAttribute('position').count).toBe(160);
    expect(spray.mesh.geometry.getAttribute('aBankEdge').count).toBe(160);
    expect(spray.mesh.geometry.getAttribute('aBankAlong').count).toBe(160);
    expect(spray.mesh.geometry.getAttribute('aBankHeight').count).toBe(160);
    expect(spray.mesh.geometry.getAttribute('aLayer')).toBeUndefined();
    expect(spray.mesh.geometry.getAttribute('iCenter')).toBeUndefined();
    expect(spray.mesh.geometry.index?.count).toBe(576);
    const captureBurst = () => {
      spray.emit(12, sampleTerrainHeight(12, -30) + 2, -30, 0.4, 1, 1, 8);
      spray.update(1 / 120, 0, 0);
      const geometry = spray.mesh.geometry;
      const count = geometry.drawRange.count;
      return {
        count,
        positions: Array.from(geometry.getAttribute('position').array.slice(0, 24)),
        heights: Array.from(geometry.getAttribute('aBankHeight').array.slice(0, 8)),
        alphas: Array.from(geometry.getAttribute('aBankAlpha').array.slice(0, 8)),
      };
    };

    const first = captureBurst();
    spray.clear();
    expect(captureBurst()).toEqual(first);
    spray.dispose();
  });

  it('breaks drift-bank crests asymmetrically inside the connected geometry', () => {
    const spray = new SandSpray({ capacity: 64 });
    spray.emit(12, sampleTerrainHeight(12, -30) + 2, -30, 0.4, 1, 1.2, 18);
    spray.update(1 / 120, 0, 0);

    const heights = spray.mesh.geometry.getAttribute('aBankHeight');
    let variedCrossSection = false;
    for (let vertex = 0; vertex < heights.count; vertex += 5) {
      const center = heights.getX(vertex + 2);
      if (center < 0.1) continue;
      const leftCrest = heights.getX(vertex + 1);
      const rightCrest = heights.getX(vertex + 3);
      if (Math.abs(leftCrest - rightCrest) > center * 0.015) {
        variedCrossSection = true;
        break;
      }
    }
    expect(variedCrossSection).toBe(true);
    // The topology remains one fixed five-vertex bank per source point.
    expect(spray.mesh.geometry.getAttribute('position').count).toBe(320);
    expect(spray.mesh.geometry.index?.count).toBe(1_344);
    spray.dispose();
  });
});
