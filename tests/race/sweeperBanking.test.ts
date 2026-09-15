import { describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import {
  SWEEPER_BANK_PROFILE,
  createCourseGulfField,
  sweeperBankAngle,
  sweeperBankOffset,
} from '../../src/game/race/CourseGulfField';
import { getInkstormLayout, getInkstormObstacleContact, getInkstormTurnMarkers } from '../../src/game/race/inkstormLayout';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { createRaceSimulation } from '../../src/game/race';
import { MASTERY_GENERATOR_VERSION, MASTERY_PHYSICS_VERSION } from '../../src/game/mastery/events';

const terrain = { heightAt: sampleTerrainHeight };
const course = createProceduralPodraceCourse(terrain, 0x494e4b53);
const field = createCourseGulfField(course)!;
const ground = (x: number, z: number) => sampleTerrainHeight(x, z) + field.sampleOffset(x, z);

describe('banked flagship sweeper', () => {
  it('scales camber with the bend and raises the outside edge', () => {
    expect(sweeperBankAngle(0.0002)).toBe(0);
    expect(sweeperBankAngle(0.0017)).toBeCloseTo(SWEEPER_BANK_PROFILE.maxBank, 6);
    expect(sweeperBankOffset(0.002, 36, -36, 1)).toBeGreaterThan(0);
    expect(sweeperBankOffset(0.002, 36, 36, 1)).toBeLessThan(0);
    expect(sweeperBankOffset(-0.002, 36, 36, 1)).toBeGreaterThan(0);
    expect(Math.abs(sweeperBankOffset(0.002, 36, 400, 1))).toBe(0);
  });

  it('bakes a readable cross-slope into the shared field through the strongest part of the bend', () => {
    const samples = Array.from({ length: 2048 }, (_, i) => course.sampleAtProgress(i / 2048)).filter((s) => s.tag === 'wide-sweeper');
    const apex = samples.reduce((best, s) => (Math.abs(s.curvature) > Math.abs(best.curvature) ? s : best));
    const outsideSide = apex.curvature >= 0 ? -1 : 1;
    const outer = ground(apex.x + apex.rightX * outsideSide * apex.width, apex.z + apex.rightZ * outsideSide * apex.width);
    const inner = ground(apex.x - apex.rightX * outsideSide * apex.width, apex.z - apex.rightZ * outsideSide * apex.width);
    const cross = (outer - inner) / (2 * apex.width);
    expect(cross).toBeGreaterThan(Math.tan(SWEEPER_BANK_PROFILE.maxBank) * 0.8);
    expect(cross).toBeLessThan(Math.tan(SWEEPER_BANK_PROFILE.maxBank) * 1.05);
    // The section's ends blend back to the natural desert.
    const entry = samples[0]!;
    const entryCross = (ground(entry.x - entry.rightX * entry.width, entry.z - entry.rightZ * entry.width)
      - ground(entry.x + entry.rightX * entry.width, entry.z + entry.rightZ * entry.width)) / (2 * entry.width);
    expect(Math.abs(entryCross)).toBeLessThan(0.05);
  });

  it('keeps the whole sweeper driveable without contacts and rolls the craft with the bank in a real race', () => {
    for (let i = 0; i < 2048; i += 4) {
      const p = course.sampleAtProgress(i / 2048);
      if (p.tag !== 'wide-sweeper') continue;
      for (const side of [-1, 0, 1]) {
        const x = p.x + p.rightX * side * (p.width - 4), z = p.z + p.rightZ * side * (p.width - 4);
        expect(getInkstormObstacleContact(course, x, z, 3, undefined, ground), `${i} lane ${side}`).toBeNull();
      }
    }
    const race = createRaceSimulation({ terrain, seed: 0x494e4b53, countdownSeconds: 0, competitionProfile: 'time-trial' });
    const samples = Array.from({ length: 2048 }, (_, i) => race.course.sampleAtProgress(i / 2048)).filter((s) => s.tag === 'wide-sweeper');
    const apex = samples.reduce((best, s) => (Math.abs(s.curvature) > Math.abs(best.curvature) ? s : best));
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    player.vehicle.position.x = apex.x;
    player.vehicle.position.z = apex.z;
    player.vehicle.position.y = race.terrain.heightAt(apex.x, apex.z) + 2.45;
    player.vehicle.orientation.yaw = Math.atan2(apex.tangentX, apex.tangentZ);
    player.vehicle.velocity.x = apex.tangentX * 90;
    player.vehicle.velocity.z = apex.tangentZ * 90;
    for (let tick = 0; tick < 90; tick += 1) race.step({ throttle: 0.6 });
    expect(player.vehicle.grounded).toBe(true);
    expect(Math.abs(player.vehicle.telemetry.surfaceRoll)).toBeGreaterThan(0.12);
    expect(player.vehicle.damage).toBe(0);
  });

  it('thins flagship roadside props, clears the sweeper of shards and places two turn markers', () => {
    const layout = getInkstormLayout(course);
    const shards = layout.filter((p) => p.family === 'roadside-shard');
    expect(shards.length).toBeGreaterThan(20);
    expect(shards.length).toBeLessThan(120);
    for (const shard of shards) expect(course.sampleAtProgress(shard.progress).tag, shard.id).not.toBe('wide-sweeper');
    const markers = getInkstormTurnMarkers(course);
    expect(markers.map((m) => m.id)).toEqual(['inkstorm-turn-marker-wide-sweeper', 'inkstorm-turn-marker-hairpin']);
    for (const marker of markers) {
      expect(layout.find((p) => p.id === marker.id)).toEqual(marker);
      const projection = course.projectPoint(marker.x, marker.z);
      expect(projection.distanceToCenter).toBeGreaterThan(projection.width + 60);
    }
    // Seeded expedition courses keep their original prop density.
    const expedition = createProceduralPodraceCourse(terrain, 0x464f554e);
    expect(getInkstormTurnMarkers(expedition)).toHaveLength(0);
    expect(getInkstormLayout(expedition).filter((p) => p.family === 'roadside-shard').length).toBeGreaterThan(shards.length);
  });

  it('versions records for the new course edition and handling', () => {
    expect(MASTERY_GENERATOR_VERSION).toBe('inkstorm-course-10');
    expect(MASTERY_PHYSICS_VERSION).toBe('inkstorm-drive-6');
  });
});
