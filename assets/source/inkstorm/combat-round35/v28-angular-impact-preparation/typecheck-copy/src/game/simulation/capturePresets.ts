import { DEFAULT_PODRACER_CONFIG, type PodracerConfig } from './config';
import { refreshPodracerDerivedState, resetPodracer } from './podracer';
import type { HeightSampler, PodracerState } from './types';

export type PodracerCapturePreset = 'start' | 'race' | 'drift' | 'airtime';

/**
 * Places an existing racer into stable review moments without wall-clock or
 * randomness. Course code remains responsible for choosing the world pose.
 */
export function applyPodracerCapturePreset(
  state: PodracerState,
  preset: PodracerCapturePreset,
  terrain: HeightSampler,
  config: Readonly<PodracerConfig> = DEFAULT_PODRACER_CONFIG,
): void {
  resetPodracer(state, terrain, config);
  const yaw = state.orientation.yaw;
  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);

  switch (preset) {
    case 'start':
      state.boost.energy = 0.62;
      state.heat = 0.08;
      break;
    case 'race':
      state.velocity.x = forwardX * config.maxSpeed * 0.72;
      state.velocity.z = forwardZ * config.maxSpeed * 0.72;
      state.boost.energy = 0.7;
      break;
    case 'drift':
      state.velocity.x = forwardX * 102 + Math.cos(yaw) * 15;
      state.velocity.z = forwardZ * 102 - Math.sin(yaw) * 15;
      state.drift.active = true;
      state.drift.charge = 0.78;
      state.drift.direction = 1;
      state.orientation.bank = -0.34;
      break;
    case 'airtime':
      // Review from a real crest-launch apex, not a hover-height bump. The
      // fixed-step simulation still owns the subsequent ballistic arc.
      state.position.y += 18.5;
      state.velocity.x = forwardX * 126;
      state.velocity.y = 11.5;
      state.velocity.z = forwardZ * 126;
      state.grounded = false;
      state.airborneTime = 0.42;
      state.orientation.pitch = 0.13;
      break;
  }

  refreshPodracerDerivedState(state, terrain, config);
}
