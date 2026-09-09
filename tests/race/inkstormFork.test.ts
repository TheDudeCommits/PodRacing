import { describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { getInkstormForkDividers, getInkstormObstacleContact } from '../../src/game/race/inkstormLayout';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const terrain = { heightAt: sampleTerrainHeight };
const course = createProceduralPodraceCourse(terrain, 0x494e4b53);

describe('physical shortcut divider', () => {
  it('keeps its complete rock footprint outside every densely sampled main and branch lane', () => {
    const dividers = getInkstormForkDividers(course);
    expect(dividers.length).toBeGreaterThan(0);
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
    for (const rock of dividers) {
      // Distance to the full rotated rectangle, not the former enclosing disk.
      // These elongated rocks deliberately use space a disk cannot represent.
      const cos = Math.cos(rock.yaw), sin = Math.sin(rock.yaw);
      expect(Math.min(...points.map(point => {
        const dx = point.x - rock.x, dz = point.z - rock.z;
        const x = dx * cos - dz * sin, z = dx * sin + dz * cos;
        return Math.hypot(Math.max(0, Math.abs(x) - 40 * rock.sx),
          Math.max(0, Math.abs(z) - 50 * rock.sz)) - point.width;
      }))).toBeGreaterThan(11.5);
    }
    expect(dividers).toHaveLength(3);
    dividers.forEach((rock, index) => expect(rock.sy * 120).toBeCloseTo([50.4, 96, 129.6][index]!, 8));
    expect(dividers.every(rock => 50 * rock.sz > 40 * rock.sx * 1.5)).toBe(true);
    expect(Math.max(...dividers.map(rock => 80 * rock.sx))).toBeGreaterThan(60);
    // All four separating axes overlap for adjacent boxes. Actual scanned
    // surfaces vary within this continuous ridge envelope.
    for (let i = 1; i < dividers.length; i++) {
      const a = dividers[i - 1]!, b = dividers[i]!;
      for (const rock of [a, b]) for (const turn of [0, Math.PI / 2]) {
        const x = Math.cos(rock.yaw + turn), z = -Math.sin(rock.yaw + turn);
        const extent = (p: typeof rock) => Math.abs(x * Math.cos(p.yaw) - z * Math.sin(p.yaw)) * 40 * p.sx
          + Math.abs(x * Math.sin(p.yaw) + z * Math.cos(p.yaw)) * 50 * p.sz;
        expect(Math.abs((a.x - b.x) * x + (a.z - b.z) * z)).toBeLessThan(extent(a) + extent(b));
      }
    }
  });

  it('provides collision at the divider while leaving airspace above the actual rock open', () => {
    const rock = getInkstormForkDividers(course)[0]!;
    const ground = terrain.heightAt(rock.x, rock.z);
    expect(getInkstormObstacleContact(course, rock.x, rock.z, 3, ground + 20, terrain.heightAt)?.id).toBe(rock.id);
    expect(getInkstormObstacleContact(course, rock.x, rock.z, 3, ground + rock.sy * 120 + 10, terrain.heightAt)).toBeNull();
  });

  it('collides with the rotated box corners that the previous ellipse omitted', () => {
    for (const rock of getInkstormForkDividers(course)) {
      const cos = Math.cos(rock.yaw), sin = Math.sin(rock.yaw);
      for (const sideX of [-1, 1]) for (const sideZ of [-1, 1]) {
        const lx = sideX * (40 * rock.sx - .25), lz = sideZ * (50 * rock.sz - .25);
        const x = rock.x + lx * cos + lz * sin, z = rock.z - lx * sin + lz * cos;
        const contact = getInkstormObstacleContact(course, x, z, .5, terrain.heightAt(rock.x, rock.z) + 10, terrain.heightAt);
        expect(contact?.id.startsWith('inkstorm-fork-divider-')).toBe(true);
        expect(contact!.penetration).toBeGreaterThan(0);
        expect(Math.hypot(contact!.normalX, contact!.normalZ)).toBeCloseTo(1, 10);
      }
    }
  });
});
