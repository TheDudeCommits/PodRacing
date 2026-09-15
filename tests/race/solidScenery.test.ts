import { describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createCourseGulfField } from '../../src/game/race/CourseGulfField';
import { getInkstormLayout, getInkstormObstacleContact, getInkstormSolidHeight, INKSTORM_FAMILIES } from '../../src/game/race/inkstormLayout';
import { getInkstormFoundryCorridorPlan } from '../../src/game/race/inkstormFoundryCorridor';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { createRaceSimulation } from '../../src/game/race';

const terrain = { heightAt: sampleTerrainHeight };
const course = createProceduralPodraceCourse(terrain, 0x494e4b53);
const field = createCourseGulfField(course)!;
const ground = (x: number, z: number) => sampleTerrainHeight(x, z) + field.sampleOffset(x, z);

describe('solid scenery', () => {
  it('collides with every rendered family that has a footprint, including the big rock masses', () => {
    const layout = getInkstormLayout(course);
    const solidFamilies = new Set<string>();
    for (const placement of layout) {
      const contact = getInkstormObstacleContact(course, placement.x, placement.z, 1, ground(placement.x, placement.z) + 2, ground);
      if (contact) solidFamilies.add(placement.family);
    }
    for (const family of ['canyon-buttress', 'fractured-spire', 'roadside-shard', 'wind-blade', 'refinery-stack', 'finish-tower']) {
      expect(solidFamilies.has(family), family).toBe(true);
    }
    // Only the arch (open span at its centre) and the gantry (legs only) are hollow at their origin.
    const hollow = INKSTORM_FAMILIES.filter((family) => layout.some((p) => p.family === family) && !solidFamilies.has(family));
    expect(hollow.every((family) => family === 'canyon-arch' || family === 'foundry-gantry')).toBe(true);
  });

  it('makes the canyon arch two solid legs with an open span over the road', () => {
    const arches = getInkstormLayout(course).filter((p) => p.family === 'canyon-arch');
    expect(arches.length).toBeGreaterThan(0);
    for (const arch of arches) {
      const cos = Math.cos(arch.yaw), sin = Math.sin(arch.yaw);
      const at = (localX: number) => [arch.x + cos * localX, arch.z - sin * localX] as const;
      const [lx, lz] = at(-70 * arch.sx), [rx, rz] = at(70 * arch.sx), [cx, cz] = at(0);
      // Legs are solid (a neighbouring canyon mass may answer first); the span is open.
      expect(getInkstormObstacleContact(course, lx, lz, 1, ground(lx, lz) + 2, ground)).not.toBeNull();
      expect(getInkstormObstacleContact(course, rx, rz, 1, ground(rx, rz) + 2, ground)).not.toBeNull();
      expect(getInkstormObstacleContact(course, cx, cz, 7.5, ground(cx, cz) + 2, ground)).toBeNull();
    }
  });

  it('keeps every lane, branch and the foundry corridor clear of the new colliders for the widest craft', () => {
    const render = course.getRenderData(2048);
    const corridors = [render.points, ...course.branches.map((branch) => branch.points)];
    for (const corridor of corridors) {
      for (let i = 0; i < corridor.length; i += 2) {
        const point = corridor[i]!;
        const next = corridor[(i + 1) % corridor.length]!;
        const dx = next.x - point.x, dz = next.z - point.z, length = Math.hypot(dx, dz) || 1;
        const rightX = dz / length, rightZ = -dx / length;
        for (const side of [-1, 0, 1]) {
          const x = point.x + rightX * side * (point.width - 2), z = point.z + rightZ * side * (point.width - 2);
          expect(getInkstormObstacleContact(course, x, z, 7.8, ground(x, z) + 2.45, ground), `${i} lane ${side}`).toBeNull();
        }
      }
    }
    const foundry = getInkstormFoundryCorridorPlan(course, (x, z) => course.heightAt(x, z));
    expect(foundry.landforms.length).toBeGreaterThan(0);
    const solid = foundry.landforms.filter((form) => getInkstormObstacleContact(course, form.x, form.z, 1, undefined, ground)?.id === form.id);
    expect(solid.length).toBe(foundry.landforms.length);
  });

  it('reports the rock crown as the solid surface inside a footprint and terrain elsewhere', () => {
    const rock = getInkstormLayout(course).find((p) => p.family === 'canyon-buttress' && p.sx < 2)!;
    const inside = getInkstormSolidHeight(course, rock.x, rock.z, ground);
    expect(inside).toBeGreaterThan(ground(rock.x, rock.z) + 50);
    const sample = course.sampleAtProgress(0.5);
    expect(getInkstormSolidHeight(course, sample.x, sample.z, ground)).toBe(ground(sample.x, sample.z));
  });

  it('stops a racer driven into a rock mass in a real race', () => {
    const race = createRaceSimulation({ terrain, seed: 0x494e4b53, countdownSeconds: 0, competitionProfile: 'time-trial' });
    // A hairpin-inside mass: the canyon's own analytic wall would answer first inside the canyon.
    const rock = getInkstormLayout(race.course).find((p) => p.family === 'canyon-buttress' && p.sx < 1.6
      && race.course.sampleAtProgress(p.progress).tag === 'hairpin'
      && race.course.projectPoint(p.x, p.z).distanceToCenter < 140)!;
    expect(rock).toBeDefined();
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    const route = race.course.sampleAtProgress(rock.progress);
    // Start on the road beside the rock and drive straight at it.
    const dx = rock.x - route.x, dz = rock.z - route.z, distance = Math.hypot(dx, dz);
    player.vehicle.position.x = route.x;
    player.vehicle.position.z = route.z;
    player.vehicle.position.y = race.terrain.heightAt(route.x, route.z) + 2.45;
    player.vehicle.orientation.yaw = Math.atan2(dx / distance, dz / distance);
    player.vehicle.velocity.x = dx / distance * 80;
    player.vehicle.velocity.z = dz / distance * 80;
    player.progress.courseProgress = rock.progress;
    let hit = false;
    for (let tick = 0; tick < 600 && !hit; tick += 1) {
      const result = race.step({ throttle: 1 });
      hit = (result.vehicleEvents[player.id] ?? []).some((event) => event.type === 'collision' && event.sourceId === rock.id);
    }
    expect(hit).toBe(true);
    const cos = Math.cos(rock.yaw), sin = Math.sin(rock.yaw);
    const lx = (player.vehicle.position.x - rock.x) * cos - (player.vehicle.position.z - rock.z) * sin;
    const lz = (player.vehicle.position.x - rock.x) * sin + (player.vehicle.position.z - rock.z) * cos;
    expect(Math.hypot(lx / (34 * rock.sx), lz / (44 * rock.sz))).toBeGreaterThan(0.95);
  });
});
