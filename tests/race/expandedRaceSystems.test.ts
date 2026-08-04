import { describe, expect, it } from 'vitest';
import { createAIControllerState, stepAIController, type AIControllerContext } from '../../src/game/ai';
import {
  createRaceSimulation,
  createRacerLaunchState,
  stepDraftingField,
  stepLaunchCharge,
  resolveLaunchOutcome,
  type RaceMode,
} from '../../src/game/race';
import { FLAT_HEIGHT_SAMPLER } from '../../src/game/simulation';

function controllerContext(raceMode: RaceMode): AIControllerContext {
  const race = createRaceSimulation({
    terrain: FLAT_HEIGHT_SAMPLER,
    countdownSeconds: 0,
    fieldSize: 4,
  });
  const point = race.course.sampleAtProgress(0.24);
  return {
    course: race.course,
    self: {
      id: 'ai-objective',
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
    raceTime: 1,
    raceMode,
    position: 8,
    activeRacerCount: 8,
  };
}

describe('expanded deterministic race systems', () => {
  it('ships an eight-craft grid with seven stable rivals and a four-human room cap', () => {
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      seed: 0x8ace,
    });

    expect(race.state.entries).toHaveLength(8);
    expect(race.state.entries.map((entry) => entry.id)).toEqual([
      'player', 'ai-vexa', 'ai-talik', 'ai-kodo',
      'ai-sola', 'ai-rax', 'ai-miri', 'ai-olan',
    ]);
    expect(new Set(race.state.entries.map((entry) => entry.vehicle.seed)).size).toBe(8);
    expect(race.state.settings).toMatchObject({
      mode: 'circuit',
      aiDifficulty: 'medium',
      fieldSize: 8,
      maximumHumanRacers: 4,
    });
    expect(race.state.settings.branches.length).toBeGreaterThanOrEqual(2);
    expect(race.state.entries.slice(1).every((entry) => entry.ai?.difficulty === 'medium')).toBe(true);
    const gridClearances = race.state.entries.flatMap((entry, index) => (
      race.state.entries.slice(index + 1).map((other) => Math.hypot(
        entry.vehicle.position.x - other.vehicle.position.x,
        entry.vehicle.position.z - other.vehicle.position.z,
      ))
    ));
    expect(Math.min(...gridClearances)).toBeGreaterThan(20);
    expect(JSON.parse(JSON.stringify(race.snapshot()))).toEqual(race.snapshot());
  });

  it('changes serialized AI reaction, pace and mistake frequency by menu difficulty', () => {
    const easy = createAIControllerState('clean', 0x55aa, 'easy');
    const medium = createAIControllerState('clean', 0x55aa, 'medium');
    const hard = createAIControllerState('clean', 0x55aa, 'hard');
    const easyDecision = stepAIController(easy, controllerContext('circuit'));
    const mediumDecision = stepAIController(medium, controllerContext('circuit'));
    const hardDecision = stepAIController(hard, controllerContext('circuit'));

    expect(easyDecision.state.difficulty).toBe('easy');
    expect(hardDecision.state.telemetry.targetSpeed)
      .toBeGreaterThan(mediumDecision.state.telemetry.targetSpeed);
    expect(mediumDecision.state.telemetry.targetSpeed)
      .toBeGreaterThan(easyDecision.state.telemetry.targetSpeed);
    expect(easy.mistakeCooldown).toBeLessThan(hard.mistakeCooldown);

    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER });
    expect(race.setAIDifficulty('hard')).toBe(true);
    expect(race.aiDifficulty).toBe('hard');
    expect(race.state.entries.slice(1).every((entry) => entry.ai?.difficulty === 'hard')).toBe(true);
    race.lockPlayerVehicleSelection();
    expect(race.setAIDifficulty('easy')).toBe(false);
  });

  it('resolves a feathered sweet spot, bog and over-rev into distinct launches', () => {
    const simulate = (throttle: number) => {
      const launch = createRacerLaunchState();
      for (let step = 0; step < 360; step += 1) {
        stepLaunchCharge(launch, throttle, 3 - step / 120, 1 / 120, 0x51);
      }
      return resolveLaunchOutcome(launch);
    };

    expect(simulate(0.7)).toBe('perfect');
    expect(simulate(0.1)).toBe('bog');
    expect(simulate(1)).toBe('overheat');

    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0.25,
      fieldSize: 4,
    });
    const launchEvents = [];
    for (let step = 0; step < 35; step += 1) {
      launchEvents.push(...race.step({ throttle: 0.7 }).events);
    }
    expect(launchEvents.filter((event) => event.type === 'launch-result')).toHaveLength(4);
    expect(race.state.entries.every((entry) => entry.launch?.outcome !== 'pending')).toBe(true);
  });

  it('charges in a real opponent wake, adds turbulence, and pays it off on release', () => {
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      fieldSize: 4,
    });
    const leader = race.state.entries[0]!;
    const follower = race.state.entries[1]!;
    leader.status = 'racing';
    follower.status = 'racing';
    Object.assign(leader.vehicle.position, { x: 0, y: 3, z: 100 });
    Object.assign(follower.vehicle.position, { x: 0, y: 3, z: 68 });
    leader.vehicle.orientation.yaw = 0;
    follower.vehicle.orientation.yaw = 0;
    leader.vehicle.telemetry.speed = 130;
    follower.vehicle.telemetry.speed = 118;
    leader.vehicle.velocity.z = 130;
    follower.vehicle.velocity.z = 118;

    const wakeEvents = [];
    for (let step = 0; step < 180; step += 1) {
      wakeEvents.push(...stepDraftingField([leader, follower], 1 / 120));
    }
    expect(follower.drafting?.leaderId).toBe(leader.id);
    expect(follower.drafting?.charge).toBeGreaterThan(0.35);
    expect(follower.drafting?.turbulence).toBeGreaterThan(0.5);
    expect(wakeEvents).toContainEqual({ type: 'draft-enter', racerId: follower.id, leaderId: leader.id });

    const beforeRelease = follower.vehicle.velocity.z;
    follower.vehicle.position.x = 30;
    const release = stepDraftingField([leader, follower], 1 / 120);
    expect(release.some((event) => event.type === 'slingshot')).toBe(true);
    expect(follower.vehicle.velocity.z).toBeGreaterThan(beforeRelease + 8);
    expect(follower.drafting?.slingshotRemaining).toBeGreaterThan(0);
  });

  it('pre-schedules every director event by semantic section and reproduces it by seed', () => {
    const first = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      seed: 0xd1ec70,
      totalLaps: 3,
      fieldSize: 4,
    });
    const second = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      seed: 0xd1ec70,
      totalLaps: 3,
      fieldSize: 4,
    });
    expect(second.state.director).toEqual(first.state.director);
    expect(first.state.director.events.map((event) => event.kind)).toEqual([
      'sandstorm', 'heatwave', 'lane-collapse', 'gate-blackout', 'shortcut-window',
    ]);
    expect(first.state.director.events.slice(0, 4).map((event) => event.sectionTag)).toEqual([
      'wide-sweeper', 'fast-straight', 'chicane', 'narrow-canyon',
    ]);
    const shortcut = first.state.director.events.at(-1)!;
    expect(first.state.settings.branches.some(
      (branch) => branch.id === shortcut.branchId && branch.sectionTag === shortcut.sectionTag,
    )).toBe(true);
    expect(new Set(first.state.director.events.map((event) => event.lap)).size)
      .toBeGreaterThan(1);
  });

  it('telegraphs, starts and ends a director event at deterministic course coordinates', () => {
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      fieldSize: 4,
    });
    const player = race.state.entries[0]!;
    const scheduled = race.state.director.events[0]!;
    const warningArc = (scheduled.triggerProgress - scheduled.warningProgress + 1) % 1;
    const warningProgress = scheduled.triggerProgress - warningArc + 0.00001;
    const warningSample = race.course.sampleAtProgress((warningProgress + 1) % 1);
    player.progress.unwrappedProgress = warningProgress;
    player.progress.courseProgress = warningSample.progress;
    Object.assign(player.vehicle.position, { x: warningSample.x, z: warningSample.z });
    const warning = race.step();
    expect(warning.events).toContainEqual(expect.objectContaining({
      type: 'director-warning', eventId: scheduled.id,
    }));

    const triggerSample = race.course.sampleAtProgress(scheduled.triggerProgress);
    player.progress.unwrappedProgress = scheduled.triggerProgress + 0.00001;
    player.progress.courseProgress = triggerSample.progress;
    Object.assign(player.vehicle.position, { x: triggerSample.x, z: triggerSample.z });
    const start = race.step();
    expect(start.events).toContainEqual(expect.objectContaining({
      type: 'director-start', eventId: scheduled.id,
    }));
    expect(race.state.director.activeEventIds).toContain(scheduled.id);

    race.state.raceTime = (scheduled.activatedAt ?? 0) + scheduled.duration;
    const end = race.step();
    expect(end.events).toContainEqual(expect.objectContaining({
      type: 'director-end', eventId: scheduled.id,
    }));
    expect(race.state.director.activeEventIds).not.toContain(scheduled.id);
  });

  it('applies director heat, blocked-lane and shortcut effects to live vehicle state', () => {
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      fieldSize: 4,
      courseBranches: [{
        id: 'hairpin-cut',
        startProgress: 0.2,
        endProgress: 0.24,
        entrySide: 1,
        risk: 0.8,
        reward: 0.9,
      }],
    });
    const player = race.state.entries[0]!;
    const heatwave = race.state.director.events.find((event) => event.kind === 'heatwave')!;
    const heatSample = race.course.sampleAtProgress(heatwave.triggerProgress);
    for (const event of race.state.director.events) event.phase = 'complete';
    heatwave.phase = 'active';
    heatwave.activatedAt = race.state.raceTime;
    heatwave.duration = 30;
    player.progress.courseProgress = heatSample.progress;
    player.progress.unwrappedProgress = heatSample.progress;
    Object.assign(player.vehicle.position, { x: heatSample.x, z: heatSample.z });
    const heatBefore = player.vehicle.heat;
    race.step({ throttle: 0 });
    expect(race.state.director.environment.coolingScale).toBeLessThan(0.5);
    expect(player.vehicle.heat).toBeGreaterThan(heatBefore);

    const collapse = race.state.director.events.find((event) => event.kind === 'lane-collapse')!;
    const collapseSample = race.course.sampleAtProgress(collapse.triggerProgress);
    heatwave.phase = 'complete';
    collapse.phase = 'active';
    collapse.activatedAt = race.state.raceTime;
    collapse.duration = 30;
    collapse.side = 1;
    player.progress.courseProgress = collapseSample.progress;
    player.progress.unwrappedProgress = collapseSample.progress;
    player.progress.lateralOffset = collapseSample.width * 0.62;
    Object.assign(player.vehicle.position, {
      x: collapseSample.x + collapseSample.rightX * collapseSample.width * 0.62,
      z: collapseSample.z + collapseSample.rightZ * collapseSample.width * 0.62,
    });
    Object.assign(player.vehicle.velocity, {
      x: collapseSample.rightX * 30,
      z: collapseSample.rightZ * 30,
    });
    const damageBeforeCollapse = player.vehicle.damage;
    race.step({ throttle: 1 });
    expect(race.state.director.environment.blockedLaneSide).toBe(1);
    expect(player.vehicle.damage).toBeGreaterThan(damageBeforeCollapse);

    const shortcut = race.state.director.events.find((event) => event.kind === 'shortcut-window')!;
    const shortcutSample = race.course.sampleAtProgress(shortcut.triggerProgress);
    heatwave.phase = 'complete';
    shortcut.phase = 'active';
    shortcut.activatedAt = race.state.raceTime;
    shortcut.duration = 30;
    shortcut.side = 1;
    shortcut.branchId = 'hairpin-cut';
    player.progress.courseProgress = shortcutSample.progress;
    player.progress.unwrappedProgress = shortcutSample.progress;
    player.progress.lateralOffset = shortcutSample.width * 0.6;
    Object.assign(player.vehicle.position, {
      x: shortcutSample.x + shortcutSample.rightX * shortcutSample.width * 0.6,
      z: shortcutSample.z + shortcutSample.rightZ * shortcutSample.width * 0.6,
    });
    player.vehicle.boost.energy = 0;
    const shortcutResult = race.step({ throttle: 0 });
    expect(shortcutResult.events).toContainEqual(expect.objectContaining({
      type: 'shortcut-used', racerId: player.id, branchId: 'hairpin-cut',
    }));
    expect(player.vehicle.boost.energy).toBeGreaterThan(0.25);
  });

  it('scores real checkpoint, drift, survival and eliminator gameplay actions', () => {
    const sprint = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      mode: 'checkpoint-sprint',
      fieldSize: 4,
    });
    const sprinter = sprint.state.entries[0]!;
    const checkpoint = sprint.course.checkpoints[1]!;
    const approach = sprint.course.sampleAtDistance(checkpoint.distance - 0.25);
    sprinter.progress.courseProgress = approach.progress;
    sprinter.progress.previousProgress = approach.progress;
    sprinter.progress.unwrappedProgress = approach.progress;
    sprinter.progress.nextCheckpointIndex = checkpoint.index;
    Object.assign(sprinter.vehicle.position, { x: approach.x, y: approach.y + 2.45, z: approach.z });
    Object.assign(sprinter.vehicle.velocity, {
      x: approach.tangentX * 150,
      y: 0,
      z: approach.tangentZ * 150,
    });
    sprinter.vehicle.orientation.yaw = Math.atan2(approach.tangentX, approach.tangentZ);
    sprinter.vehicle.telemetry.speed = 150;
    const checkpointTick = sprint.step({ throttle: 1 });
    expect(checkpointTick.events).toContainEqual(expect.objectContaining({
      type: 'score', racerId: sprinter.id, source: 'checkpoint', amount: 180,
    }));
    expect(sprinter.competition?.checkpointScore).toBe(180);

    const drift = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      mode: 'drift-trial',
      fieldSize: 4,
    });
    const drifter = drift.state.entries[0]!;
    const driftSample = drift.course.sampleAtProgress(0.3);
    Object.assign(drifter.vehicle.position, { x: driftSample.x, z: driftSample.z });
    Object.assign(drifter.vehicle.velocity, {
      x: driftSample.tangentX * 95 + driftSample.rightX * 20,
      z: driftSample.tangentZ * 95 + driftSample.rightZ * 20,
    });
    drifter.vehicle.telemetry.speed = 97;
    drifter.vehicle.orientation.yaw = Math.atan2(driftSample.tangentX, driftSample.tangentZ);
    drift.step({ throttle: 1, steer: 1, drift: true });
    expect(drifter.competition?.driftScore).toBeGreaterThan(0);

    const survival = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      mode: 'survival-gauntlet',
      fieldSize: 4,
    });
    const survivor = survival.state.entries[0]!;
    survivor.vehicle.damage = 1;
    survival.step();
    expect(survivor.competition?.survivalLives).toBe(2);

    const eliminator = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      mode: 'eliminator',
      fieldSize: 4,
    });
    eliminator.state.raceTime = eliminator.state.modeState.nextEliminationAt;
    for (let index = 0; index < eliminator.state.entries.length; index += 1) {
      const entry = eliminator.state.entries[index]!;
      entry.progress.unwrappedProgress = index * 0.1;
    }
    const elimination = eliminator.step();
    expect(elimination.events).toContainEqual(expect.objectContaining({
      type: 'racer-eliminated', reason: 'last-place',
    }));
    expect(eliminator.state.modeState.eliminatedRacerIds).toHaveLength(1);
  });

  it('gives each race mode a distinct objective bias and menu-selectable serialized rule', () => {
    const eliminator = stepAIController(
      createAIControllerState('aggressive', 7),
      controllerContext('eliminator'),
    );
    const survival = stepAIController(
      createAIControllerState('aggressive', 7),
      controllerContext('survival-gauntlet'),
    );
    expect(eliminator.state.telemetry.objectiveBias).toBeGreaterThan(1);
    expect(survival.state.telemetry.objectiveBias).toBeLessThan(1);

    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER });
    for (const mode of [
      'circuit', 'eliminator', 'checkpoint-sprint', 'combat-race',
      'survival-gauntlet', 'drift-trial', 'team-race',
    ] satisfies RaceMode[]) {
      expect(race.setRaceMode(mode)).toBe(true);
      expect(race.state.settings.mode).toBe(mode);
      expect(race.state.modeState.mode).toBe(mode);
    }
  });

  it('lets AI deterministically commit to generated risk/reward branch geometry', () => {
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      fieldSize: 4,
      seed: 0xb12a,
    });
    const branch = race.course.branches[0]!;
    const approachProgress = (branch.entryProgress - 170 / race.course.totalLength + 1) % 1;
    const approach = race.course.sampleAtProgress(approachProgress);
    const context: AIControllerContext = {
      ...controllerContext('checkpoint-sprint'),
      course: race.course,
      self: {
        ...controllerContext('checkpoint-sprint').self,
        x: approach.x,
        y: approach.y + 2.45,
        z: approach.z,
        yaw: Math.atan2(approach.tangentX, approach.tangentZ),
        velocityX: approach.tangentX * 110,
        velocityZ: approach.tangentZ * 110,
        courseProgress: approachProgress,
        unwrappedProgress: approachProgress,
      },
    };

    let committed: ReturnType<typeof stepAIController> | null = null;
    for (let seed = 1; seed <= 64 && !committed; seed += 1) {
      const state = createAIControllerState('aggressive', seed, 'hard');
      const decision = stepAIController(state, context);
      if (decision.state.telemetry.routeBranchId === branch.id) committed = decision;
    }
    expect(committed).not.toBeNull();
    expect(committed?.state.activeBranchId).toBe(branch.id);
    expect(committed?.state.lastBranchDecisionKey).toContain(branch.id);
    expect(JSON.parse(JSON.stringify(committed?.state))).toEqual(committed?.state);
  });

  it.each([
    'circuit',
    'checkpoint-sprint',
    'combat-race',
    'drift-trial',
    'team-race',
  ] satisfies RaceMode[])('finishes %s with its mode-specific scoreboard', (mode) => {
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      mode,
      fieldSize: 4,
    });
    for (let index = 0; index < race.state.entries.length; index += 1) {
      const entry = race.state.entries[index]!;
      entry.status = 'finished';
      entry.progress.finishTime = 40 + index;
      entry.competition!.checkpointScore = index * 10;
      entry.competition!.checkpointsPassed = index;
      entry.competition!.combatScore = index * 100;
      entry.competition!.driftScore = index * 1_000;
      entry.competition!.score = index * 1_000;
      entry.competition!.finishReason = 'finish-line';
    }
    const result = race.step();
    expect(race.state.phase).toBe('finished');
    expect(race.state.results).toHaveLength(4);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'mode-complete', mode }));
    if (mode === 'team-race') expect(race.state.modeState.winningTeam).not.toBeNull();
    if (mode === 'drift-trial' || mode === 'combat-race' || mode === 'checkpoint-sprint') {
      expect(race.state.results[0]?.id).toBe('ai-kodo');
    }
  });

  it.each(['eliminator', 'survival-gauntlet'] satisfies RaceMode[])(
    'finishes %s when one contender remains',
    (mode) => {
      const race = createRaceSimulation({
        terrain: FLAT_HEIGHT_SAMPLER,
        countdownSeconds: 0,
        mode,
        fieldSize: 4,
      });
      const winner = race.state.entries[0]!;
      for (const entry of race.state.entries.slice(1)) {
        entry.competition!.eliminated = true;
        entry.competition!.finishReason = mode === 'eliminator' ? 'eliminated' : 'destroyed';
        entry.status = 'finished';
        entry.progress.finishTime = 30;
      }
      const result = race.step();
      expect(race.state.phase).toBe('finished');
      expect(race.state.modeState.winnerId).toBe(winner.id);
      expect(result.events).toContainEqual(expect.objectContaining({ type: 'mode-complete', mode }));
    },
  );
});
