import { describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createCourseGulfField, getLaunchBasinAnchor } from '../../src/game/race/CourseGulfField';
import { launchRidgeSurface } from '../../src/game/race/LaunchBasinPlan';
import { launchRidgeSurface as round27Surface } from '../../assets/source/inkstorm/launch-composition-round28/LaunchBasinPlan.round27';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
const field = createCourseGulfField(course)!, anchor = getLaunchBasinAnchor(course)!;
const height = (forward: number, right: number) => sampleTerrainHeight(
  anchor.x + anchor.tangentX * forward - anchor.rightX * right,
  anchor.z + anchor.tangentZ * forward - anchor.rightZ * right, field,
);

describe('lowered launch shoulders and intermediate ledges', () => {
  it('removes broad high front caps while retaining their original influence footprints', () => {
    for (const [f, r] of [[720, -465], [760, -460], [940, -470], [975, -460], [880, 550]]) {
      const old = round27Surface(f!, r!), current = launchRidgeSurface(f!, r!);
      expect(old.height - current.height).toBeGreaterThan(50);
      expect(current.weight).toBe(old.weight);
    }
  });

  it('keeps distinct physical toe, middle ledge and tall projecting tooth instead of uniform lowering', () => {
    const toe = height(720, -465), ledge = height(760, -460), tooth = height(850, -460);
    expect(toe).toBeGreaterThan(0); expect(toe).toBeLessThan(35);
    expect(ledge - toe).toBeGreaterThan(35);
    expect(tooth - ledge).toBeGreaterThan(65);
    expect(height(975, -460) - height(940, -470)).toBeGreaterThan(15);
    expect(height(880, 550)).toBeGreaterThan(60);
    expect(height(880, 550)).toBeLessThan(90);
  });
});
