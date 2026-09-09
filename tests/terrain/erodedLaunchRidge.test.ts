import { describe, expect, it } from 'vitest';
import { launchRidgeRound31 } from './launchRidgeRound31';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { COURSE_GULF_SEED, createCourseGulfField, getLaunchBasinAnchor } from '../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, COURSE_GULF_SEED);
const field = createCourseGulfField(course)!;
const anchor = getLaunchBasinAnchor(course)!;
const height = (forward: number, right: number): number => {
  const x = anchor.x + anchor.tangentX * forward - anchor.rightX * right;
  const z = anchor.z + anchor.tangentZ * forward - anchor.rightZ * right;
  return sampleTerrainHeight(x, z) + field.sampleOffset(x, z);
};
const sha256 = async (bytes: Uint8Array): Promise<string> => Array.from(
  new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))),
  value => value.toString(16).padStart(2, '0'),
).join('');

describe('eroded launch cliff composition', () => {
  it('retains at least three substantial saddles at every far-grid sampling phase', () => {
    // These are actual bilinear physical heights along a fixed transect, not
    // targets taken from the authoring table. Four 48m phases exercise whether
    // the cuts survive far-cell sampling. The former broad terraced hill has
    // zero qualifying saddles at every one of these phases.
    for (const phase of [0, 12, 24, 36]) {
      const values: number[] = [];
      for (let forward = 850 + phase; forward <= 1510; forward += 48) values.push(height(forward, -480));
      let saddles = 0;
      for (let i = 1; i < values.length - 1; i++) {
        const value = values[i]!;
        const leftCrown = Math.max(...values.slice(Math.max(0, i - 2), i));
        const rightCrown = Math.max(...values.slice(i + 1, i + 3));
        if (value < values[i - 1]! && value < values[i + 1]!
          && Math.min(leftCrown, rightCrown) - value > 25) saddles++;
      }
      expect(saddles, `48m phase ${phase}m`).toBeGreaterThanOrEqual(3);
      expect(Math.min(...values)).toBeGreaterThan(40);
      expect(Math.max(...values)).toBeGreaterThan(220);
    }
  });

  it('staggers exposed buttresses and ridge crowns instead of copying the same radial profile', () => {
    // The recessed crown at 1090m opens toward a different foreground bay
    // than the crown at 1138m. A smooth mound or concentric stair profile fails
    // this opposed relief requirement even if its summit remains tall enough.
    expect(height(1138, -480) - height(1090, -480)).toBeGreaterThan(90);
    expect(height(1090, -350) - height(1138, -350)).toBeGreaterThan(60);
  });

  it('pins the course9 central bowl and preserves the previous finish grid byte for byte', async () => {
    // Course9 deliberately deepens the central bowl; preserve its accepted snapshot.
    // The separate 532,296-sample course9 SHA protects all racing
    // lanes, shoulders and small physics/MRT probes, including curved routes.
    const floor: number[] = [];
    for (let forward = 650; forward <= 1250; forward += 7.3) {
      for (let right = -100; right <= 100; right += 8.9) floor.push(height(forward, right));
    }
    expect(floor).toHaveLength(1909);
    expect(await sha256(new Uint8Array(new Float64Array(floor).buffer)))
      .toBe(launchRidgeRound31.centralFloorSha256);
    expect(await sha256(new Uint8Array(field.grids[1].values.buffer)))
      .toBe('bd9da2b5038d659fc1622390f211ba5e42bacac2a90288b9aaf2656af03abffa');
  });
});
