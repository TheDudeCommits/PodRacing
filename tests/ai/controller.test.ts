import { describe, expect, it } from 'vitest';
import {
  createAIControllerState,
  stepAIController,
  type AIControllerContext,
  type AIMistakeKind,
  type AIPersonality,
} from '../../src/game/ai';
import { createPodraceCourse, createProceduralPodraceCourse } from '../../src/game/race';
import { DEFAULT_PODRACER_CONFIG } from '../../src/game/simulation/config';

const flat = { heightAt: () => 0 };
const course = createPodraceCourse(flat);

function contextAt(progress = 0.08): AIControllerContext {
  const point = course.sampleAtProgress(progress);
  return {
    course,
    self: {
      id: 'ai-test',
      x: point.x,
      y: point.y + 2.45,
      z: point.z,
      velocityX: point.tangentX * 105,
      velocityY: 0,
      velocityZ: point.tangentZ * 105,
      yaw: Math.atan2(point.tangentX, point.tangentZ),
      speed: 105,
      boostEnergy: 0.8,
      heat: 0.2,
      grounded: true,
      courseProgress: point.progress,
      unwrappedProgress: point.progress,
      completedLaps: 0,
      finished: false,
    },
    opponents: [],
    playerRaceScore: point.progress,
    delta: 1 / 120,
    raceTime: 0,
  };
}

describe('spline-following AI controllers', () => {
  it('is deterministic for a seed across long-running lane, boost and mistake decisions', () => {
    const first = createAIControllerState('erratic', 0xabc123);
    const second = createAIControllerState('erratic', 0xabc123);
    const inputsA = [];
    const inputsB = [];
    const eventsA = [];
    const eventsB = [];
    for (let step = 0; step < 4_000; step += 1) {
      const context = contextAt(0.08 + step * 0.00001);
      context.raceTime = step / 120;
      const a = stepAIController(first, context);
      const b = stepAIController(second, context);
      inputsA.push(a.input);
      inputsB.push(b.input);
      eventsA.push(...a.events);
      eventsB.push(...b.events);
    }
    expect(second).toEqual(first);
    expect(inputsB).toEqual(inputsA);
    expect(eventsB).toEqual(eventsA);
    expect(eventsA.some((event) => event.type === 'mistake-start')).toBe(true);
  });

  it('gives aggressive, clean and erratic racers observably different decision profiles', () => {
    const personalities: AIPersonality[] = ['aggressive', 'clean', 'erratic'];
    const decisions = personalities.map((personality) => {
      const state = createAIControllerState(personality, 77);
      let result = stepAIController(state, contextAt(0.25));
      for (let step = 1; step < 90; step += 1) {
        const context = contextAt(0.25);
        context.raceTime = step / 120;
        result = stepAIController(state, context);
      }
      return result.state.telemetry;
    });
    expect(new Set(decisions.map((decision) => decision.lookaheadDistance.toFixed(3))).size).toBe(3);
    expect(decisions[0]?.targetSpeed).not.toBeCloseTo(decisions[1]?.targetSpeed ?? 0, 3);
    expect(decisions[2]?.desiredLaneOffset).not.toBeCloseTo(decisions[1]?.desiredLaneOffset ?? 0, 3);
  });

  it('steers around and slows for a racer occupying its line', () => {
    const clearState = createAIControllerState('clean', 99);
    const blockedState = createAIControllerState('clean', 99);
    const clearContext = contextAt(0.05);
    const blocker = {
      ...clearContext.self,
      id: 'blocker',
      x: clearContext.self.x + Math.sin(clearContext.self.yaw) * 22,
      z: clearContext.self.z + Math.cos(clearContext.self.yaw) * 22,
      velocityX: clearContext.self.velocityX * 0.45,
      velocityZ: clearContext.self.velocityZ * 0.45,
      speed: clearContext.self.speed * 0.45,
    };
    const blockedContext: AIControllerContext = { ...clearContext, opponents: [blocker] };
    const clear = stepAIController(clearState, clearContext);
    const blocked = stepAIController(blockedState, blockedContext);
    expect(blocked.state.telemetry.collisionThreat).toBeGreaterThan(0.5);
    expect(Math.abs(blocked.state.telemetry.avoidance)).toBeGreaterThan(0.25);
    expect(blocked.input.throttle).toBeLessThan(clear.input.throttle);
    expect(blocked.input.brake).toBeGreaterThan(clear.input.brake);
    expect(Math.abs(blocked.input.steer - clear.input.steer)).toBeGreaterThan(0.03);
  });

  it('centres its line on the next ordered checkpoint when the gate is near', () => {
    const state = createAIControllerState('erratic', 0xc0ffee);
    const checkpoint = course.checkpoints[3]!;
    const approach = course.sampleAtDistance(checkpoint.distance - 105);
    const context = contextAt(approach.progress);
    context.self.x = approach.x + approach.rightX * 13;
    context.self.z = approach.z + approach.rightZ * 13;
    context.self.courseProgress = approach.progress;
    context.self.unwrappedProgress = approach.progress;
    context.requiredCheckpoint = {
      progress: checkpoint.progress,
      width: checkpoint.width,
    };
    state.laneOffset = 13;
    state.targetLaneOffset = 13;
    state.mistake = { kind: 'marker-clip', remaining: 1, strength: 1, side: 1 };

    const result = stepAIController(state, context);

    // Aim along the road through the gate. Snapping the pursuit point to a
    // gate 105 m ahead would cut the inside of the approaching corner.
    const targetDistance = (result.state.telemetry.targetProgress - approach.progress) * course.totalLength;
    expect(targetDistance).toBeGreaterThan(20);
    expect(targetDistance).toBeLessThan(77);
    expect(Math.abs(result.state.telemetry.desiredLaneOffset)).toBeLessThan(13);
  });

  it('uses mild rubber banding and can deterministically produce every authored mistake', () => {
    const behindState = createAIControllerState('aggressive', 123);
    const levelState = createAIControllerState('aggressive', 123);
    const behindContext = contextAt(0.12);
    behindContext.playerRaceScore = 0.5;
    const levelContext = contextAt(0.12);
    const behind = stepAIController(behindState, behindContext);
    const level = stepAIController(levelState, levelContext);
    expect(behind.state.telemetry.rubberBand).toBeGreaterThan(0);
    expect(behind.state.telemetry.rubberBand).toBeLessThanOrEqual(0.065);
    expect(behind.state.telemetry.targetSpeed).toBeGreaterThan(level.state.telemetry.targetSpeed);

    const kinds = new Set<AIMistakeKind>();
    for (let seed = 1; seed <= 160; seed += 1) {
      const state = createAIControllerState('erratic', seed);
      state.mistakeCooldown = 0;
      const result = stepAIController(state, contextAt());
      for (const event of result.events) {
        if (event.type === 'mistake-start') kinds.add(event.mistake);
      }
    }
    expect(kinds).toEqual(new Set(['bad-line', 'marker-clip', 'mistimed-boost', 'awkward-landing']));
  });

  it('plans braking against the actual vehicle turning authority before a bend', () => {
    const context = contextAt(0.25);
    context.self.speed = 160;
    const agile = stepAIController(createAIControllerState('clean', 99), {
      ...context, vehicleConfig: DEFAULT_PODRACER_CONFIG,
    });
    const heavy = stepAIController(createAIControllerState('clean', 99), {
      ...context, vehicleConfig: { ...DEFAULT_PODRACER_CONFIG,
        steeringRateLowSpeed: DEFAULT_PODRACER_CONFIG.steeringRateLowSpeed * 0.45,
        steeringRateHighSpeed: DEFAULT_PODRACER_CONFIG.steeringRateHighSpeed * 0.45,
        brakeAcceleration: DEFAULT_PODRACER_CONFIG.brakeAcceleration * 0.6 },
    });
    expect(heavy.state.telemetry.targetSpeed).toBeLessThan(agile.state.telemetry.targetSpeed);
    expect(heavy.input.brake).toBeGreaterThan(agile.input.brake);
  });

  it('carries its pursuit target beyond a branch merge instead of orbiting its endpoint', () => {
    const branchCourse = createProceduralPodraceCourse(flat, 0x474c4153);
    const branch = branchCourse.branches[0]!;
    const end = branch.points.at(-1)!;
    const context = contextAt(branch.exitProgress - 0.0001);
    context.course = branchCourse;
    context.self.x = end.x;
    context.self.z = end.z;
    context.self.courseProgress = branch.exitProgress - 0.0001;
    context.self.unwrappedProgress = context.self.courseProgress;
    const state = createAIControllerState('clean', 99);
    state.activeBranchId = branch.id;
    const decision = stepAIController(state, context);
    expect(decision.state.telemetry.targetProgress).toBeGreaterThan(branch.exitProgress);
  });

  it('abandons a failed branch after recovery without immediately selecting it again', () => {
    const branchCourse = createProceduralPodraceCourse(flat, 0x474c4153);
    const branch = branchCourse.branches[0]!;
    const context = contextAt(branch.entryProgress - 0.005);
    context.course = branchCourse;
    context.self.courseProgress = branch.entryProgress - 0.005;
    const state = createAIControllerState('clean', 99);
    state.activeBranchId = branch.id;
    state.previousCourseProgress = branch.entryProgress + 0.04;
    state.lastBranchDecisionKey = `0:${branch.id}`;
    const decision = stepAIController(state, context);
    expect(decision.state.telemetry.routeBranchId).toBeNull();
  });
});
