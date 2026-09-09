import { normalizePlayerInput, type PlayerInputState } from '../input/actions';
import type { PodracerState } from '../simulation/types';
import type {
  LaunchOutcome,
  RaceEntryState,
  RaceEvent,
  RaceMode,
  RaceModeState,
  RaceTeamId,
  RacerCompetitionState,
  RacerDraftingState,
  RacerLaunchState,
} from './types';

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createRacerLaunchState(): RacerLaunchState {
  return {
    outcome: 'pending',
    targetThrottle: 0.72,
    displayedRev: 0,
    engineHeat: 0,
    accuracyTotal: 0,
    accuracySamples: 0,
    committedThrottle: 0,
    penaltyRemaining: 0,
    bonusRemaining: 0,
  };
}

export function createRacerDraftingState(): RacerDraftingState {
  return {
    leaderId: null,
    wakeStrength: 0,
    turbulence: 0,
    charge: 0,
    slingshotRemaining: 0,
    cooldownRemaining: 0,
  };
}

export function createRacerCompetitionState(index: number): RacerCompetitionState {
  return {
    teamId: index % 2 === 0 ? 'sun' : 'shadow',
    score: 0,
    checkpointScore: 0,
    driftScore: 0,
    combatScore: 0,
    survivalLives: 3,
    eliminated: false,
    eliminatedAt: null,
    finishReason: 'running',
    checkpointsPassed: 0,
    shortcutUses: 0,
    usedShortcutEventIds: [],
  };
}

export function createRaceModeState(
  mode: RaceMode,
  fieldSize: number,
  checkpointTarget: number,
): RaceModeState {
  return {
    mode,
    objectiveTarget: mode === 'checkpoint-sprint'
      ? Math.max(1, checkpointTarget)
      : mode === 'drift-trial'
        ? 12_000
        : mode === 'combat-race'
          ? 2_500
          : fieldSize,
    nextEliminationAt: 30,
    eliminationInterval: 24,
    eliminatedRacerIds: [],
    teamScores: { sun: 0, shadow: 0 },
    winningTeam: null,
    winnerId: null,
  };
}

/** Samples the moving rev target while keeping every value replay-safe JSON. */
export function stepLaunchCharge(
  state: RacerLaunchState,
  throttle: number,
  countdownRemaining: number,
  delta: number,
  seed: number,
): void {
  if (state.outcome !== 'pending') return;
  const safeThrottle = clamp(throttle, 0, 1);
  const elapsed = Math.max(0, 3 - countdownRemaining);
  state.targetThrottle = 0.7 + Math.sin(elapsed * 4.4 + (seed & 31) * 0.07) * 0.11;
  state.displayedRev += (safeThrottle - state.displayedRev) * Math.min(1, delta * 6.5);
  state.committedThrottle = safeThrottle;
  state.engineHeat = clamp(
    state.engineHeat + safeThrottle * safeThrottle * delta * 0.36 - (1 - safeThrottle) * delta * 0.08,
    0,
    1.2,
  );
  // Only the last second decides launch quality. Revving early is useful, but
  // pinning the throttle for the entire countdown still overheats the engines.
  if (countdownRemaining <= 1.05) {
    state.accuracyTotal += Math.abs(state.displayedRev - state.targetThrottle);
    state.accuracySamples += 1;
  }
}

export function resolveLaunchOutcome(state: RacerLaunchState): Exclude<LaunchOutcome, 'pending'> {
  const error = state.accuracySamples > 0
    ? state.accuracyTotal / state.accuracySamples
    : 1;
  let outcome: Exclude<LaunchOutcome, 'pending'>;
  // Judge the visible engine revs, not the last binary key sample. Keyboard
  // feathering must be capable of the same launch as an analogue trigger.
  if (state.engineHeat >= 0.84 || state.displayedRev > 0.96) outcome = 'overheat';
  else if (state.displayedRev < 0.28) outcome = 'bog';
  else if (error <= 0.105 && state.displayedRev >= 0.48) outcome = 'perfect';
  else outcome = 'good';
  state.outcome = outcome;
  switch (outcome) {
    case 'perfect': state.bonusRemaining = 1.35; break;
    case 'good': state.bonusRemaining = 0.62; break;
    case 'bog': state.penaltyRemaining = 0.85; break;
    case 'overheat': state.penaltyRemaining = 1.35; break;
  }
  return outcome;
}

export function applyLaunchOutcome(vehicle: PodracerState, state: RacerLaunchState): void {
  const forwardX = Math.sin(vehicle.orientation.yaw);
  const forwardZ = Math.cos(vehicle.orientation.yaw);
  if (state.outcome === 'perfect' || state.outcome === 'good') {
    const impulse = state.outcome === 'perfect' ? 25 : 11;
    vehicle.velocity.x += forwardX * impulse;
    vehicle.velocity.z += forwardZ * impulse;
    vehicle.boost.energy = clamp(vehicle.boost.energy + (state.outcome === 'perfect' ? 0.2 : 0.08), 0, 1);
  } else if (state.outcome === 'overheat') {
    // Cross the real vehicle threshold so the existing overheat event,
    // audiovisual feedback and lockout all engage on the release tick.
    vehicle.heat = Math.max(vehicle.heat, 1.08);
  }
}

export function applyLaunchInputModifier(
  input: PlayerInputState,
  state: RacerLaunchState,
  delta: number,
): PlayerInputState {
  state.penaltyRemaining = Math.max(0, state.penaltyRemaining - delta);
  state.bonusRemaining = Math.max(0, state.bonusRemaining - delta);
  if (state.penaltyRemaining <= 0) return input;
  const throttleScale = state.outcome === 'overheat' ? 0.48 : 0.68;
  return normalizePlayerInput({ ...input, throttle: input.throttle * throttleScale });
}

interface WakeCandidate {
  leader: RaceEntryState;
  strength: number;
}

function wakeCandidateFor(
  follower: RaceEntryState,
  entries: readonly RaceEntryState[],
): WakeCandidate | null {
  let best: WakeCandidate | null = null;
  for (const leader of entries) {
    if (leader.id === follower.id || leader.status === 'finished') continue;
    if (leader.vehicle.telemetry.speed < 42) continue;
    const forwardX = Math.sin(leader.vehicle.orientation.yaw);
    const forwardZ = Math.cos(leader.vehicle.orientation.yaw);
    const rightX = forwardZ;
    const rightZ = -forwardX;
    const dx = follower.vehicle.position.x - leader.vehicle.position.x;
    const dz = follower.vehicle.position.z - leader.vehicle.position.z;
    const behind = -(dx * forwardX + dz * forwardZ);
    const lateral = Math.abs(dx * rightX + dz * rightZ);
    if (behind < 8 || behind > 70 || lateral > 11) continue;
    const alignment = Math.max(0, Math.cos(follower.vehicle.orientation.yaw - leader.vehicle.orientation.yaw));
    const strength = clamp(
      (1 - (behind - 8) / 62)
      * (1 - lateral / 11)
      * clamp(leader.vehicle.telemetry.speed / 80, 0, 1)
      * alignment,
      0,
      1,
    );
    if (strength > (best?.strength ?? 0.08)) best = { leader, strength };
  }
  return best;
}

/** Mutates only serialized wake state and vehicle velocity, returning semantic cues. */
export function stepDraftingField(
  entries: readonly RaceEntryState[],
  delta: number,
): RaceEvent[] {
  const events: RaceEvent[] = [];
  for (const entry of entries) {
    const state = entry.drafting;
    if (!state || entry.status === 'finished') continue;
    state.cooldownRemaining = Math.max(0, state.cooldownRemaining - delta);
    state.slingshotRemaining = Math.max(0, state.slingshotRemaining - delta);
    const candidate = wakeCandidateFor(entry, entries);
    const previousLeaderId = state.leaderId;
    const nextLeaderId = candidate?.leader.id ?? null;

    if (previousLeaderId !== nextLeaderId && previousLeaderId) {
      const releasedCharge = state.charge;
      events.push({
        type: 'draft-exit',
        racerId: entry.id,
        leaderId: previousLeaderId,
        charge: releasedCharge,
      });
      if (releasedCharge >= 0.32 && state.cooldownRemaining <= 0) {
        const strength = clamp((releasedCharge - 0.2) / 0.8, 0.2, 1);
        state.slingshotRemaining = 0.45 + strength * 0.9;
        state.cooldownRemaining = 1.2;
        const forwardX = Math.sin(entry.vehicle.orientation.yaw);
        const forwardZ = Math.cos(entry.vehicle.orientation.yaw);
        entry.vehicle.velocity.x += forwardX * (8 + strength * 17);
        entry.vehicle.velocity.z += forwardZ * (8 + strength * 17);
        events.push({ type: 'slingshot', racerId: entry.id, leaderId: previousLeaderId, strength });
      }
      state.charge = 0;
    }
    if (previousLeaderId !== nextLeaderId && nextLeaderId) {
      events.push({ type: 'draft-enter', racerId: entry.id, leaderId: nextLeaderId });
    }

    state.leaderId = nextLeaderId;
    state.wakeStrength = candidate?.strength ?? 0;
    state.turbulence += ((candidate?.strength ?? 0) - state.turbulence) * Math.min(1, delta * 8);
    if (candidate) {
      state.charge = clamp(state.charge + candidate.strength * delta * 0.42, 0, 1);
    } else {
      state.charge = Math.max(0, state.charge - delta * 0.18);
    }
    if (state.slingshotRemaining > 0) {
      const forwardX = Math.sin(entry.vehicle.orientation.yaw);
      const forwardZ = Math.cos(entry.vehicle.orientation.yaw);
      entry.vehicle.velocity.x += forwardX * 28 * delta;
      entry.vehicle.velocity.z += forwardZ * 28 * delta;
    }
  }
  return events;
}

export function applyDraftingInputModifier(
  input: PlayerInputState,
  state: RacerDraftingState,
  racerSeed: number,
  step: number,
): PlayerInputState {
  if (state.turbulence <= 0.01) return input;
  const wobble = Math.sin(step * 0.31 + (racerSeed & 255) * 0.17)
    * state.turbulence * 0.115;
  return normalizePlayerInput({ ...input, steer: input.steer + wobble });
}

export function sumTeamScores(entries: readonly RaceEntryState[]): Record<RaceTeamId, number> {
  const scores: Record<RaceTeamId, number> = { sun: 0, shadow: 0 };
  for (const entry of entries) {
    const competition = entry.competition;
    if (!competition) continue;
    scores[competition.teamId] += competition.score;
  }
  return scores;
}
