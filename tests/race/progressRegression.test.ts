import { stageRaceProgress } from '../helpers/stageRaceProgress';
import { describe, expect, it } from 'vitest';
import { createPodraceCourse, createRaceSimulation, createRacerProgressState, updateRacerProgress, racerRaceScore, type RaceEntryState } from '../../src/game/race';
import { createPodracerState } from '../../src/game/simulation/podracer';
const terrain = { heightAt: () => 0 };
function fixture() {
  const course = createPodraceCourse(terrain);
  const vehicle = createPodracerState({ id: 'player', terrain });
  const entry: RaceEntryState = { id: 'player', name: 'Player', isPlayer: true, status: 'racing', vehicle, ai: null, progress: createRacerProgressState(course, 0) };
  const move = (p: number, lateral = 0) => {
    const sample = course.sampleAtProgress(p);
    vehicle.position.x = sample.x + sample.rightX * lateral;
    vehicle.position.z = sample.z + sample.rightZ * lateral;
    vehicle.telemetry.speed = 90;
    return updateRacerProgress(entry, course, { delta: 1 / 120, raceTime: 12, totalLaps: 3, projection: { ...sample, lateralOffset: lateral, distanceToCenter: Math.abs(lateral) } });
  };
  return { course, entry, move };
}
describe('race position and finish regressions', () => {
  it('counts each lap once in standings', () => {
    const { entry } = fixture();
    entry.progress.completedLaps = 1;
    entry.progress.unwrappedProgress = 1.03;
    expect(racerRaceScore(entry)).toBeCloseTo(1.03);
  });
  it('ranks a recovered craft by its position, not the distance it can repeat after reset', () => {
    const { entry, move } = fixture();
    entry.progress.courseProgress = .06;
    entry.progress.unwrappedProgress = .06;
    move(.002); // rejected teleport back to the already validated start checkpoint
    move(.0021); // first normal movement after recovery
    expect(racerRaceScore(entry)).toBeCloseTo(.0021, 5);
  });
  it('accepts the full opening between visible checkpoint posts', () => {
    const { course, entry, move } = fixture();
    const gate = course.checkpoints[1]!;
    entry.progress.courseProgress = gate.progress - .0001;
    const events = move(gate.progress + .0001, gate.width * 1.18 - .6);
    expect(events.some(e => e.type === 'checkpoint')).toBe(true);
  });
  it('accepts a crossing starting exactly on the checkpoint plane', () => {
    const { course, entry, move } = fixture();
    const gate = course.checkpoints[1]!;
    entry.progress.courseProgress = gate.progress;
    expect(move(gate.progress + .0001).some(e => e.type === 'checkpoint')).toBe(true);
  });
  it('does not earn extra standings distance by driving past a missed gate', () => {
    const { course, entry, move } = fixture();
    const gate = course.checkpoints[1]!;
    entry.progress.courseProgress = gate.progress - .0001;
    entry.progress.unwrappedProgress = gate.progress - .0001;
    for (let i = 1; i < 20; i++) move(gate.progress + i * .0001, gate.width + 18);
    expect(entry.progress.nextCheckpointIndex).toBe(1);
    expect(racerRaceScore(entry)).toBeLessThanOrEqual(gate.progress);
  });
  it('keeps a nearby recovered opponent behind until it physically passes', () => {
    const race = createRaceSimulation({ terrain, countdownSeconds: 0, fieldSize: 4, competitionProfile: 'clean-race' });
    race.step();
    for (const [index, entry] of race.state.entries.entries()) {
      const at = index === 0 ? .20 : index === 1 ? .196 : .05 - index * .01;
      const point = race.course.sampleAtProgress(at);
      stageRaceProgress(entry, race.course, at);
      entry.vehicle.position.x = point.x + point.rightX * (index % 2 ? 8 : -8);
      entry.vehicle.position.z = point.z + point.rightZ * (index % 2 ? 8 : -8);
      entry.vehicle.position.y = 2.45;
      entry.vehicle.velocity.x = 0; entry.vehicle.velocity.z = 0;
      entry.progress.placement = index + 1;
    }
    const rival = race.state.entries[1]!;
    // Simulate the stale odometer value retained by an older recovery.
    rival.progress.unwrappedProgress = .4;
    const guests = Object.fromEntries(race.state.entries.slice(1).map(e => [e.id, { brake: 1 }]));
    const result = race.step({ brake: 1 }, guests);
    expect(race.state.entries[0]!.progress.placement).toBe(1);
    expect(rival.progress.placement).toBe(2);
    expect(result.events.filter(e => e.type === 'overtake')).toHaveLength(0);
  });
  it('uses the swept lateral position at the gate rather than the end of the tick', () => {
    const { course, entry } = fixture();
    const gate = course.checkpoints[1]!;
    const width = gate.width * 1.18;
    const before = { x: gate.x - gate.tangentX * .5 + gate.rightX * (width - .2), z: gate.z - gate.tangentZ * .5 + gate.rightZ * (width - .2) };
    entry.progress.courseProgress = gate.progress - .5 / course.totalLength;
    entry.vehicle.position.x = gate.x + gate.tangentX * .5 + gate.rightX * (width + .1);
    entry.vehicle.position.z = gate.z + gate.tangentZ * .5 + gate.rightZ * (width + .1);
    entry.vehicle.telemetry.speed = 90;
    const events = updateRacerProgress(entry, course, { delta: 1 / 120, raceTime: 12, totalLaps: 3, previousPosition: before });
    expect(events.some(e => e.type === 'checkpoint')).toBe(true);
  });
  it('does not award a final lap when a reset jumps across the finish line', () => {
    const { course, entry } = fixture();
    entry.progress.completedLaps = 2;
    entry.progress.lastCheckpointIndex = course.checkpoints.length - 1;
    entry.progress.nextCheckpointIndex = 0;
    entry.progress.courseProgress = .99995;
    const after = course.sampleAtProgress(.00005);
    entry.vehicle.position.x = after.x; entry.vehicle.position.z = after.z;
    updateRacerProgress(entry, course, { delta: 1 / 120, raceTime: 100, totalLaps: 3, recovered: true });
    expect(entry.progress.completedLaps).toBe(2);
    expect(entry.progress.finishTime).toBeNull();
    expect(entry.progress.splits).toHaveLength(0);
  });
  it.each(['player', 'guest'] as const)('recovers a %s who missed a required gate instead of silently losing the rest of the lap', kind => {
    const race = createRaceSimulation({ terrain, countdownSeconds: 0, fieldSize: 4 });
    race.step();
    const entry = race.state.entries[kind === 'player' ? 0 : 1]!;
    const gate = race.course.checkpoints[5]!;
    const point = race.course.sampleAtProgress(gate.progress + .01);
    entry.progress.lastCheckpointIndex = 4;
    entry.progress.nextCheckpointIndex = 5;
    entry.progress.courseProgress = point.progress;
    entry.vehicle.position.x = point.x;
    entry.vehicle.position.z = point.z;
    entry.vehicle.position.y = 2.45;
    const result = race.step({}, kind === 'guest' ? { [entry.id]: {} } : {});
    expect(result.vehicleEvents[entry.id]?.some(e => e.type === 'reset')).toBe(true);
    expect(entry.progress.nextCheckpointIndex).toBe(5);
    expect(entry.progress.splits).toHaveLength(0);
    const gap = (gate.progress - entry.progress.courseProgress + 1) % 1 * race.course.totalLength;
    expect(gap).toBeCloseTo(18, 0);
  });
});
