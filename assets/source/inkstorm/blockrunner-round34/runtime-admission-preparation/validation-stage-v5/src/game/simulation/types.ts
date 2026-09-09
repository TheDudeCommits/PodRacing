import type { PlayerInputState } from '../input/actions';

/** Plain vector data. Simulation modules intentionally do not import Three.js. */
export interface Vec3State {
  x: number;
  y: number;
  z: number;
}

/**
 * Ground contract shared by vehicle physics and the procedural terrain.
 * Coordinates are logical world metres: Y-up, yaw zero faces +Z, and local
 * racer +X points to the racer-right.
 */
export interface HeightSampler {
  heightAt(x: number, z: number): number;
}

export interface PodracerOrientationState {
  /** Heading in radians. Zero faces world +Z; positive turns toward +X. */
  yaw: number;
  /** Terrain/flight nose attitude. Positive lifts the forward (+Z) side. */
  pitch: number;
  /** Terrain-following side attitude. Positive lifts racer-right (+X). */
  roll: number;
  /** Steering lean kept separate so render/animation can exaggerate it. */
  bank: number;
}

export interface PodracerAngularVelocityState {
  yaw: number;
  pitch: number;
  roll: number;
  bank: number;
}

export type TerrainProbeId =
  | 'cockpit-front'
  | 'cockpit-rear'
  | 'engine-left-front'
  | 'engine-left-rear'
  | 'engine-right-front'
  | 'engine-right-rear';

export interface TerrainProbeState {
  id: TerrainProbeId;
  localX: number;
  localZ: number;
  worldX: number;
  worldZ: number;
  groundHeight: number;
  clearance: number;
  compression: number;
  lift: number;
  active: boolean;
}

export interface PodracerDriftState {
  active: boolean;
  charge: number;
  slipAngle: number;
  direction: -1 | 0 | 1;
}

export interface PodracerBoostState {
  energy: number;
  active: boolean;
  driftBoostTime: number;
  overheated: boolean;
}

export interface PodracerControlMemoryState {
  driftHeld: boolean;
  boostHeld: boolean;
  resetHeld: boolean;
}

export interface PodracerRespawnPoseState {
  x: number;
  z: number;
  /** `null` means terrain height plus hover height. */
  y: number | null;
  yaw: number;
}

export interface PodracerTelemetryState {
  speed: number;
  forwardSpeed: number;
  lateralSpeed: number;
  normalizedSpeed: number;
  groundClearance: number;
  support: number;
  engineTorque: number;
  landingIntensity: number;
}

/** Every field is finite JSON data, suitable for captures, replays and saves. */
export interface PodracerState {
  version: 1;
  id: string;
  seed: number;
  step: number;
  simulationTime: number;
  position: Vec3State;
  velocity: Vec3State;
  orientation: PodracerOrientationState;
  angularVelocity: PodracerAngularVelocityState;
  probes: TerrainProbeState[];
  drift: PodracerDriftState;
  boost: PodracerBoostState;
  heat: number;
  damage: number;
  grounded: boolean;
  airborneTime: number;
  respawn: PodracerRespawnPoseState;
  controls: PodracerControlMemoryState;
  telemetry: PodracerTelemetryState;
}

export interface CollisionImpulse {
  /** World-space impulse in Newton-seconds. */
  impulse: Vec3State;
  /** Local application point, used for yaw/roll kick. */
  localPoint: Vec3State;
  sourceId: string | null;
  /** Additional normalized damage in [0, 1]. */
  damage: number;
}

export interface PodracerStepContext {
  terrain: HeightSampler;
  collisions?: readonly CollisionImpulse[];
}

export type CameraShakeReason = 'landing' | 'collision' | 'boost' | 'overheat';

export type PodracerEvent =
  | {
      type: 'airborne';
      position: Vec3State;
      verticalSpeed: number;
    }
  | {
      type: 'landing';
      position: Vec3State;
      intensity: number;
      airTime: number;
      verticalSpeed: number;
    }
  | {
      type: 'camera-shake';
      reason: CameraShakeReason;
      amplitude: number;
      duration: number;
      frequency: number;
    }
  | {
      type: 'sand-spray';
      position: Vec3State;
      intensity: number;
      direction: -1 | 0 | 1;
    }
  | {
      type: 'drift-boost';
      charge: number;
      duration: number;
    }
  | {
      type: 'boost-start' | 'boost-stop';
      source: 'meter' | 'drift';
    }
  | {
      type: 'collision';
      sourceId: string | null;
      intensity: number;
      damage: number;
    }
  | {
      type: 'damage';
      amount: number;
      total: number;
      reason: 'collision' | 'landing' | 'overheat';
    }
  | {
      type: 'overheat';
      active: boolean;
    }
  | {
      type: 'reset';
      position: Vec3State;
    };

export interface PodracerStepResult {
  state: PodracerState;
  events: PodracerEvent[];
  input: PlayerInputState;
}
