import { describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createCourseGulfField } from '../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
const field = createCourseGulfField(course)!;
const normalTaps = [[0, 0], [.85, 0], [-.85, 0], [0, .85], [0, -.85], [1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]] as const;

// Derived independently from the preserved course-8 baseline-launch.f32 and
// baseline-finish.f32 in assets/source/inkstorm/launch-reveal-round31.
// Launch SHA: 0cb508909165f1c2fda5fbcd9c01c2a7b9db6915f78b8578b03571a8a96b649b.
// These are OLD-edition expectations; do not regenerate them from course 9.
// Pin the old profile extent plus 18m for bilinear/normal support explicitly:
// taking this boundary from the current profile could hide an expanded edit.
const unchangedMainBefore = 1025.7588430595824;
const unchangedMainAfter = 2881.7588430595824;

async function digest(samples: number[]): Promise<string> {
  const bytes = new Uint8Array(new Float64Array(samples).buffer);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash, value => value.toString(16).padStart(2, '0')).join('');
}

function probe(samples: number[], x: number, z: number): void {
  for (const [dx, dz] of normalTaps) samples.push(field.sampleOffset(x + dx, z + dz));
}

describe('course-9 launch edit isolation from course 8', () => {
  it('preserves the course plan, outer profile extent and both terrain texture layouts', () => {
    expect(course.signature).toBe('2dacfc90');
    expect(field.launchProfile.startDistance).toBe(1043.7588430595824);
    expect(field.launchProfile.endDistance).toBe(2863.7588430595824);
    expect(field.grids.map(({ name, minX, minZ, cellSize, size, values }) => ({
      name, minX, minZ, cellSize, size, bytes: values.byteLength,
    }))).toEqual([
      { name: 'launch', minX: 18042, minZ: 288, cellSize: 6, size: 417, bytes: 695556 },
      { name: 'finish', minX: 17232, minZ: -1668, cellSize: 6, size: 257, bytes: 264196 },
    ]);
  });

  it('keeps legal lanes, shoulders and physics/render normal taps outside the fixed launch extent bit-identical to course 8', async () => {
    const samples: number[] = [];
    for (let i = 0; i < 4096; i++) {
      const p = course.samplePlanAtProgress((i + .371) / 4096);
      if (p.distance >= unchangedMainBefore && p.distance <= unchangedMainAfter) continue;
      for (const lateral of [-p.width - 10, -p.width, -p.width * .5, 0, p.width * .5, p.width, p.width + 10]) {
        probe(samples, p.x + p.rightX * lateral, p.z + p.rightZ * lateral);
      }
    }
    expect(samples).toHaveLength(195426);
    expect(await digest(samples)).toBe('8fc5f08e149c6fa0eec54c1818342342460abda936109726cb57ec570114681a');
  });

  it('keeps every alternate route, shoulder and normal tap bit-identical to course 8', async () => {
    const samples: number[] = [];
    for (const branch of course.branches) for (let i = 1; i < branch.points.length; i++) {
      const a = branch.points[i - 1]!, b = branch.points[i]!;
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      for (const t of [0, .123, .5, .877, 1]) {
        const width = a.width + (b.width - a.width) * t;
        for (const lateral of [-width - 10, -width, 0, width, width + 10]) {
          probe(samples, a.x + dx * t + dz / length * lateral, a.z + dz * t - dx / length * lateral);
        }
      }
    }
    expect(samples).toHaveLength(16200);
    expect(await digest(samples)).toBe('b1ec55ed08e4f71d4eaf345a5441995b10113397e29981af9161d9a12cf03b64');
  });
});
