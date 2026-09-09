import { PODRACER_FIXED_DELTA } from './config';

export interface FixedStepClockState {
  fixedDelta: number;
  maxSubSteps: number;
  accumulator: number;
  simulationTime: number;
  totalSteps: number;
  droppedTime: number;
}

export interface FixedStepAdvanceResult {
  steps: number;
  alpha: number;
  droppedTime: number;
}

export function createFixedStepClock(
  fixedDelta = PODRACER_FIXED_DELTA,
  maxSubSteps = 12,
): FixedStepClockState {
  if (!Number.isFinite(fixedDelta) || fixedDelta <= 0) {
    throw new Error('fixedDelta must be a positive finite number');
  }
  if (!Number.isInteger(maxSubSteps) || maxSubSteps < 1) {
    throw new Error('maxSubSteps must be a positive integer');
  }
  return {
    fixedDelta,
    maxSubSteps,
    accumulator: 0,
    simulationTime: 0,
    totalSteps: 0,
    droppedTime: 0,
  };
}

/**
 * Advances a bounded real-time accumulator. Capture/replay code should use
 * `stepFixedFrames` to avoid wall-clock input entirely.
 */
export function advanceFixedStep(
  clock: FixedStepClockState,
  frameDelta: number,
  onStep: (fixedDelta: number) => void,
): FixedStepAdvanceResult {
  const safeFrameDelta = Number.isFinite(frameDelta)
    ? Math.min(0.25, Math.max(0, frameDelta))
    : 0;
  clock.accumulator += safeFrameDelta;

  let steps = 0;
  while (clock.accumulator + Number.EPSILON >= clock.fixedDelta && steps < clock.maxSubSteps) {
    onStep(clock.fixedDelta);
    clock.accumulator -= clock.fixedDelta;
    clock.simulationTime += clock.fixedDelta;
    clock.totalSteps += 1;
    steps += 1;
  }

  let droppedTime = 0;
  if (clock.accumulator >= clock.fixedDelta) {
    const droppedSteps = Math.floor(clock.accumulator / clock.fixedDelta);
    droppedTime = droppedSteps * clock.fixedDelta;
    clock.accumulator -= droppedTime;
    clock.droppedTime += droppedTime;
  }

  return {
    steps,
    alpha: Math.min(1, Math.max(0, clock.accumulator / clock.fixedDelta)),
    droppedTime,
  };
}

/** Exact deterministic advancement used by screenshot and replay harnesses. */
export function stepFixedFrames(
  clock: FixedStepClockState,
  frames: number,
  onStep: (fixedDelta: number) => void,
): void {
  const safeFrames = Math.max(0, Math.floor(Number.isFinite(frames) ? frames : 0));
  for (let frame = 0; frame < safeFrames; frame += 1) {
    onStep(clock.fixedDelta);
    clock.simulationTime += clock.fixedDelta;
    clock.totalSteps += 1;
  }
}
