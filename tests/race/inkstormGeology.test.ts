import { describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { getInkstormLayout } from '../../src/game/race/inkstormLayout';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const terrain = { heightAt: sampleTerrainHeight };

describe('mixed Inkstorm sandstone', () => {
  it('keeps broad canyon, finish and fork masses while using separated open-ground accents', () => {
    for (const seed of [0x494e4b53, 42, 1234]) {
      const course = createProceduralPodraceCourse(terrain, seed);
      const layout = getInkstormLayout(course);
      const spires = layout.filter(p => p.family === 'fractured-spire');
      const broad = layout.filter(p => p.family === 'canyon-buttress');
      const share = spires.length / (spires.length + broad.length);
      // The authored flagship launch basin now owns continuous broad ridges;
      // its six conflicting legacy spire candidates must not be replenished there.
      expect(share).toBeGreaterThanOrEqual(seed === 0x494e4b53 ? .05 : .10);
      expect(share).toBeLessThanOrEqual(.15);
      expect(layout.filter(p => p.id.startsWith('inkstorm-fork-divider-')).every(p => p.family === 'canyon-buttress')).toBe(true);
      for (let i = 0; i < spires.length; i++) {
        const spire = spires[i]!;
        expect(['fast-straight', 'wide-sweeper', 'launch-crest', 'recovery-straight']).toContain(course.sampleAtProgress(spire.progress).tag);
        expect(spire.sx).toBeLessThanOrEqual(1.6);
        expect(spire.sz).toBeLessThanOrEqual(1.7);
        expect(spire.sy).toBeLessThanOrEqual(1.55);
        for (const other of spires.slice(i + 1)) expect(Math.hypot(spire.x - other.x, spire.z - other.z)).toBeGreaterThanOrEqual(260);
      }
    }
  });

  it('keeps full accent mesh bounds outside densely sampled main and branch corridors', () => {
    const course = createProceduralPodraceCourse(terrain, 0x494e4b53);
    const points = [...course.getRenderData(4096).points];
    for (const branch of course.branches) {
      for (let i = 1; i < branch.points.length; i++) {
        const a = branch.points[i - 1]!, b = branch.points[i]!;
        for (let step = 0; step <= 12; step++) {
          const t = step / 12;
          points.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
            width: Math.max(a.width, b.width), y: 0, progress: 0, tag: 'recovery-straight' });
        }
      }
    }
    for (const rock of getInkstormLayout(course).filter(p => p.family === 'fractured-spire')) {
      const cos = Math.cos(rock.yaw), sin = Math.sin(rock.yaw);
      for (const point of points) {
        const dx = point.x - rock.x, dz = point.z - rock.z;
        const x = Math.abs(dx * cos - dz * sin), z = Math.abs(dx * sin + dz * cos);
        const clearance = Math.hypot(Math.max(0, x - rock.sx * 40), Math.max(0, z - rock.sz * 50)) - point.width;
        expect(clearance, `${rock.id} at ${point.progress}`).toBeGreaterThan(5);
      }
    }
  });
});
