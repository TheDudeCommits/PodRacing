import { normalizePlayerInput, type PlayerInputState } from '../input/actions';
import { DEFAULT_PODRACER_CONFIG, type PodracerConfig } from './config';
import type {
  CollisionImpulse,
  HeightSampler,
  PodracerEvent,
  PodracerRespawnPoseState,
  PodracerState,
  PodracerStepContext,
  PodracerStepResult,
  TerrainProbeState,
  Vec3State,
} from './types';

const TAU = Math.PI * 2;

export const FLAT_HEIGHT_SAMPLER: HeightSampler = Object.freeze({
  heightAt: (_x: number, _z: number): number => 0,
});

export interface CreatePodracerOptions {
  id?: string;
  seed?: number;
  position?: Partial<Vec3State>;
  yaw?: number;
  initialSpeed?: number;
  initialBoostEnergy?: number;
  terrain?: HeightSampler;
  respawn?: Partial<PodracerRespawnPoseState>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const amount = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

function copyPosition(position: Vec3State): Vec3State {
  return { x: position.x, y: position.y, z: position.z };
}

function wrapAngle(angle: number): number {
  const wrapped = (angle + Math.PI) % TAU;
  return (wrapped < 0 ? wrapped + TAU : wrapped) - Math.PI;
}

function safeTerrainHeight(terrain: HeightSampler, x: number, z: number): number {
  return clamp(finite(terrain.heightAt(x, z)), -20_000, 20_000);
}

function makeProbeStates(
  config: Readonly<PodracerConfig>,
  x: number,
  z: number,
  terrain: HeightSampler,
): TerrainProbeState[] {
  return config.probes.map((probe) => {
    const groundHeight = safeTerrainHeight(terrain, x, z);
    return {
      id: probe.id,
      localX: probe.localX,
      localZ: probe.localZ,
      worldX: x,
      worldZ: z,
      groundHeight,
      clearance: config.hoverHeight,
      compression: 0,
      lift: config.gravity,
      active: true,
    };
  });
}

/** Creates a complete serializable vehicle state with stable deterministic phases. */
export function createPodracerState(
  options: CreatePodracerOptions = {},
  config: Readonly<PodracerConfig> = DEFAULT_PODRACER_CONFIG,
): PodracerState {
  const terrain = options.terrain ?? FLAT_HEIGHT_SAMPLER;
  const x = finite(options.position?.x ?? 0);
  const z = finite(options.position?.z ?? 0);
  const yaw = wrapAngle(finite(options.yaw ?? 0));
  const defaultY = safeTerrainHeight(terrain, x, z) + config.hoverHeight;
  const y = finite(options.position?.y ?? defaultY, defaultY);
  const initialSpeed = clamp(finite(options.initialSpeed ?? 0), 0, config.boostMaxSpeed);
  const respawnY = options.respawn?.y;

  const state: PodracerState = {
    version: 1,
    id: options.id ?? 'player',
    seed: (options.seed ?? 0x504f4452) >>> 0,
    step: 0,
    simulationTime: 0,
    position: { x, y, z },
    velocity: {
      x: Math.sin(yaw) * initialSpeed,
      y: 0,
      z: Math.cos(yaw) * initialSpeed,
    },
    orientation: { yaw, pitch: 0, roll: 0, bank: 0 },
    angularVelocity: { yaw: 0, pitch: 0, roll: 0, bank: 0 },
    probes: makeProbeStates(config, x, z, terrain),
    drift: { active: false, charge: 0, slipAngle: 0, direction: 0 },
    boost: {
      energy: clamp(finite(options.initialBoostEnergy ?? 0.62), 0, 1),
      active: false,
      driftBoostTime: 0,
      overheated: false,
    },
    heat: 0.08,
    damage: 0,
    grounded: true,
    airborneTime: 0,
    respawn: {
      x: finite(options.respawn?.x ?? x),
      z: finite(options.respawn?.z ?? z),
      y: respawnY === null ? null : finite(respawnY ?? y, y),
      yaw: wrapAngle(finite(options.respawn?.yaw ?? yaw)),
    },
    controls: { driftHeld: false, boostHeld: false, resetHeld: false },
    telemetry: {
      speed: initialSpeed,
      forwardSpeed: initialSpeed,
      lateralSpeed: 0,
      normalizedSpeed: initialSpeed / config.maxSpeed,
      groundClearance: config.hoverHeight,
      support: 1,
      engineTorque: 0,
      landingIntensity: 0,
    },
  };

  sampleTerrain(state, terrain, config);
  return state;
}

function worldProbePosition(
  state: PodracerState,
  localX: number,
  localZ: number,
): { x: number; z: number } {
  const sinYaw = Math.sin(state.orientation.yaw);
  const cosYaw = Math.cos(state.orientation.yaw);
  return {
    x: state.position.x + localX * cosYaw + localZ * sinYaw,
    z: state.position.z - localX * sinYaw + localZ * cosYaw,
  };
}

interface TerrainSummary {
  averageHeight: number;
  averageClearance: number;
  minimumClearance: number;
  support: number;
  slopePitch: number;
  slopeRoll: number;
  maxPenetration: number;
  totalLift: number;
}

function sampleTerrain(
  state: PodracerState,
  terrain: HeightSampler,
  config: Readonly<PodracerConfig>,
): TerrainSummary {
  let heightSum = 0;
  let clearanceSum = 0;
  let activeCount = 0;
  let totalLift = 0;
  let maxPenetration = 0;
  let minimumClearance = Number.POSITIVE_INFINITY;

  let localXMean = 0;
  let localZMean = 0;
  for (const probe of state.probes) {
    localXMean += probe.localX;
    localZMean += probe.localZ;
  }
  localXMean /= state.probes.length;
  localZMean /= state.probes.length;

  let heightMean = 0;
  for (const probe of state.probes) {
    const world = worldProbePosition(state, probe.localX, probe.localZ);
    probe.worldX = world.x;
    probe.worldZ = world.z;
    probe.groundHeight = safeTerrainHeight(terrain, world.x, world.z);
    heightMean += probe.groundHeight;
  }
  heightMean /= state.probes.length;

  let pitchNumerator = 0;
  let pitchDenominator = 0;
  let rollNumerator = 0;
  let rollDenominator = 0;

  for (const probe of state.probes) {
    const craftHeight =
      state.position.y +
      state.orientation.pitch * probe.localZ +
      state.orientation.roll * probe.localX;
    const pointVerticalSpeed =
      state.velocity.y +
      state.angularVelocity.pitch * probe.localZ +
      state.angularVelocity.roll * probe.localX;
    probe.clearance = craftHeight - probe.groundHeight;
    probe.compression = config.hoverHeight - probe.clearance;
    probe.active = probe.clearance < config.repulsorRange;
    probe.lift = probe.active
      ? clamp(
          config.gravity +
            probe.compression * config.repulsorSpring -
            pointVerticalSpeed * config.repulsorDamping,
          0,
          config.maxProbeLift,
        )
      : 0;

    if (probe.active) activeCount += 1;
    heightSum += probe.groundHeight;
    clearanceSum += probe.clearance;
    minimumClearance = Math.min(minimumClearance, probe.clearance);
    totalLift += probe.lift;
    maxPenetration = Math.max(
      maxPenetration,
      config.hardDeckClearance - probe.clearance,
    );

    const localX = probe.localX - localXMean;
    const localZ = probe.localZ - localZMean;
    const relativeHeight = probe.groundHeight - heightMean;
    pitchNumerator += localZ * relativeHeight;
    pitchDenominator += localZ * localZ;
    rollNumerator += localX * relativeHeight;
    rollDenominator += localX * localX;
  }

  const count = state.probes.length;
  return {
    averageHeight: heightSum / count,
    averageClearance: clearanceSum / count,
    minimumClearance,
    support: activeCount / count,
    slopePitch: Math.atan2(pitchNumerator, Math.max(0.001, pitchDenominator)),
    slopeRoll: Math.atan2(rollNumerator, Math.max(0.001, rollDenominator)),
    maxPenetration,
    totalLift: totalLift / count,
  };
}

function springAngle(
  current: number,
  velocity: number,
  target: number,
  spring: number,
  damping: number,
  delta: number,
): { value: number; velocity: number } {
  const nextVelocity = velocity + ((target - current) * spring - velocity * damping) * delta;
  return {
    value: current + nextVelocity * delta,
    velocity: nextVelocity,
  };
}

function deterministicTorque(state: PodracerState, throttle: number): number {
  const seedPhase = (state.seed % 4096) / 4096 * TAU;
  const time = state.simulationTime;
  const leftEngine = Math.sin(time * 17.3 + seedPhase) + 0.34 * Math.sin(time * 39.7 + 1.2);
  const rightEngine = Math.sin(time * 18.1 + seedPhase + 1.67) + 0.31 * Math.sin(time * 37.9 + 4.1);
  return (leftEngine - rightEngine) * (0.18 + throttle * 0.52 + state.damage * 1.25);
}

function updateDriftAndBoost(
  state: PodracerState,
  input: PlayerInputState,
  speed: number,
  config: Readonly<PodracerConfig>,
  events: PodracerEvent[],
): void {
  const delta = config.fixedDelta;
  const wasBoostActive = state.boost.active;
  const wasOverheated = state.boost.overheated;
  const driftAllowed =
    input.drift &&
    state.grounded &&
    speed >= config.driftMinimumSpeed &&
    Math.abs(input.steer) > 0.12;

  if (driftAllowed) {
    state.drift.active = true;
    state.drift.direction = input.steer > 0 ? 1 : -1;
    const speedFactor = clamp(speed / config.maxSpeed, 0.35, 1.35);
    state.drift.charge = clamp(
      state.drift.charge +
        config.driftChargeRate * Math.abs(input.steer) * speedFactor * delta,
      0,
      1,
    );
  } else if (state.drift.active && !input.drift) {
    const charge = state.drift.charge;
    if (charge >= config.driftMinimumBoostCharge && !state.boost.overheated) {
      const chargeAmount = smoothstep(config.driftMinimumBoostCharge, 1, charge);
      const duration =
        config.driftBoostMinTime +
        (config.driftBoostMaxTime - config.driftBoostMinTime) * chargeAmount;
      state.boost.driftBoostTime = Math.max(state.boost.driftBoostTime, duration);
      events.push({ type: 'drift-boost', charge, duration });
    }
    state.drift.active = false;
    state.drift.charge = 0;
    state.drift.direction = 0;
  } else if (!input.drift) {
    state.drift.active = false;
    state.drift.charge = Math.max(0, state.drift.charge - delta * 0.18);
    if (state.drift.charge === 0) state.drift.direction = 0;
  }

  state.boost.driftBoostTime = Math.max(0, state.boost.driftBoostTime - delta);
  const driftBoostActive = state.boost.driftBoostTime > 0;
  const meterBoostActive =
    input.boost &&
    state.boost.energy >= config.boostMinimumEnergy &&
    !state.boost.overheated;
  state.boost.active = driftBoostActive || meterBoostActive;

  if (meterBoostActive) {
    state.boost.energy = Math.max(0, state.boost.energy - config.boostDrain * delta);
  } else if (!state.boost.active && !state.drift.active) {
    state.boost.energy = Math.min(
      1,
      state.boost.energy + config.boostRegeneration * delta,
    );
  }

  if (state.boost.active) {
    state.heat += config.boostHeatRate * delta;
  } else if (state.drift.active) {
    state.heat += config.driftHeatRate * delta;
  } else {
    state.heat -= config.passiveHeatCooling * delta;
  }
  state.heat = clamp(state.heat, 0, 1.25);

  if (!state.boost.overheated && state.heat >= config.overheatStart) {
    state.boost.overheated = true;
    state.boost.active = false;
    state.boost.driftBoostTime = 0;
  } else if (state.boost.overheated && state.heat <= config.overheatEnd) {
    state.boost.overheated = false;
  }

  if (state.boost.overheated && input.boost) {
    const damageAmount = config.overheatDamageRate * delta;
    state.damage = clamp(state.damage + damageAmount, 0, 1);
    events.push({
      type: 'damage',
      amount: damageAmount,
      total: state.damage,
      reason: 'overheat',
    });
  }

  if (wasOverheated !== state.boost.overheated) {
    events.push({ type: 'overheat', active: state.boost.overheated });
    if (state.boost.overheated) {
      events.push({
        type: 'camera-shake',
        reason: 'overheat',
        amplitude: 0.32,
        duration: 0.24,
        frequency: 28,
      });
    }
  }

  if (!wasBoostActive && state.boost.active) {
    events.push({
      type: 'boost-start',
      source: driftBoostActive ? 'drift' : 'meter',
    });
    events.push({
      type: 'camera-shake',
      reason: 'boost',
      amplitude: 0.16,
      duration: 0.16,
      frequency: 34,
    });
  } else if (wasBoostActive && !state.boost.active) {
    events.push({
      type: 'boost-stop',
      source: state.boost.driftBoostTime > 0 ? 'drift' : 'meter',
    });
  }
}

function applyCollision(
  state: PodracerState,
  collision: CollisionImpulse,
  config: Readonly<PodracerConfig>,
  events: PodracerEvent[],
): void {
  const impulseX = finite(collision.impulse.x);
  const impulseY = finite(collision.impulse.y);
  const impulseZ = finite(collision.impulse.z);
  const magnitude = Math.hypot(impulseX, impulseY, impulseZ);
  const deltaScale = Math.min(55 / Math.max(0.001, magnitude / config.mass), 1) / config.mass;
  state.velocity.x += impulseX * deltaScale;
  state.velocity.y += impulseY * deltaScale;
  state.velocity.z += impulseZ * deltaScale;

  const localX = clamp(finite(collision.localPoint.x), -8, 8);
  const localZ = clamp(finite(collision.localPoint.z), -8, 8);
  // The lever arm is craft-local, so the impulse must use that same basis.
  // Multiplying it by world X/Z made one wall glance turn the opposite way
  // after rotating the identical track section through 180 degrees.
  const sinYaw = Math.sin(state.orientation.yaw), cosYaw = Math.cos(state.orientation.yaw);
  const localImpulseX = impulseX * cosYaw - impulseZ * sinYaw;
  const localImpulseZ = impulseX * sinYaw + impulseZ * cosYaw;
  const yawKick = (localZ * localImpulseX - localX * localImpulseZ) / (config.mass * 34);
  const rollKick = localX * impulseY / (config.mass * 24);
  state.angularVelocity.yaw = clamp(state.angularVelocity.yaw + yawKick, -2.5, 2.5);
  state.angularVelocity.roll = clamp(state.angularVelocity.roll + rollKick, -2.5, 2.5);

  const normalizedImpact = clamp(magnitude / (config.mass * 24), 0, 1);
  // Collision sources already author an explicit damage component. The
  // impulse contribution is intentionally modest: contacts should affect the
  // race and HUD without turning a few animated scrapes into permanent 100%
  // damage and a crippled multi-minute field.
  const damageAmount = clamp(finite(collision.damage), 0, 1) + normalizedImpact * 0.012;
  const appliedDamage = Math.min(1 - state.damage, damageAmount);
  state.damage += appliedDamage;
  events.push({
    type: 'collision',
    sourceId: collision.sourceId,
    intensity: normalizedImpact,
    damage: appliedDamage,
  });
  if (appliedDamage > 0) {
    events.push({
      type: 'damage',
      amount: appliedDamage,
      total: state.damage,
      reason: 'collision',
    });
  }
  events.push({
    type: 'camera-shake',
    reason: 'collision',
    amplitude: 0.15 + normalizedImpact * 0.85,
    duration: 0.12 + normalizedImpact * 0.3,
    frequency: 22 + normalizedImpact * 16,
  });
}

/** Applies an immediate collision hook and returns the renderer/audio events. */
export function applyCollisionImpulse(
  state: PodracerState,
  collision: CollisionImpulse,
  config: Readonly<PodracerConfig> = DEFAULT_PODRACER_CONFIG,
): PodracerEvent[] {
  const events: PodracerEvent[] = [];
  applyCollision(state, collision, config, events);
  sanitizeState(state, config);
  return events;
}

export function setPodracerRespawnPose(
  state: PodracerState,
  pose: PodracerRespawnPoseState,
): void {
  state.respawn.x = finite(pose.x, state.position.x);
  state.respawn.z = finite(pose.z, state.position.z);
  state.respawn.y = pose.y === null ? null : finite(pose.y, state.position.y);
  state.respawn.yaw = wrapAngle(finite(pose.yaw, state.orientation.yaw));
}

/** Resets dynamic motion while keeping race time, damage and boost resources. */
export function resetPodracer(
  state: PodracerState,
  terrain: HeightSampler,
  config: Readonly<PodracerConfig> = DEFAULT_PODRACER_CONFIG,
): void {
  state.position.x = state.respawn.x;
  state.position.z = state.respawn.z;
  state.position.y =
    state.respawn.y ??
    safeTerrainHeight(terrain, state.respawn.x, state.respawn.z) + config.hoverHeight;
  state.velocity.x = 0;
  state.velocity.y = 0;
  state.velocity.z = 0;
  state.orientation.yaw = state.respawn.yaw;
  state.orientation.pitch = 0;
  state.orientation.roll = 0;
  state.orientation.bank = 0;
  state.angularVelocity.yaw = 0;
  state.angularVelocity.pitch = 0;
  state.angularVelocity.roll = 0;
  state.angularVelocity.bank = 0;
  state.drift.active = false;
  state.drift.charge = 0;
  state.drift.slipAngle = 0;
  state.drift.direction = 0;
  state.boost.active = false;
  state.boost.driftBoostTime = 0;
  state.grounded = true;
  state.airborneTime = 0;
  refreshPodracerDerivedState(state, terrain, config);
}

/** Refreshes probe and HUD-facing derived data after an external teleport. */
export function refreshPodracerDerivedState(
  state: PodracerState,
  terrain: HeightSampler,
  config: Readonly<PodracerConfig> = DEFAULT_PODRACER_CONFIG,
): void {
  const terrainSummary = sampleTerrain(state, terrain, config);
  updateTelemetry(state, config);
  state.telemetry.groundClearance = terrainSummary.averageClearance;
  state.telemetry.support = terrainSummary.support;
  state.telemetry.engineTorque = 0;
  state.telemetry.landingIntensity = 0;
  sanitizeState(state, config);
}

function updateHorizontalMotion(
  state: PodracerState,
  input: PlayerInputState,
  config: Readonly<PodracerConfig>,
): void {
  const delta = config.fixedDelta;
  const yaw = state.orientation.yaw;
  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  let forwardSpeed = state.velocity.x * forwardX + state.velocity.z * forwardZ;
  let lateralSpeed = state.velocity.x * rightX + state.velocity.z * rightZ;
  const speed = Math.hypot(state.velocity.x, state.velocity.z);
  const speedRatio = clamp(speed / config.maxSpeed, 0, 1.4);
  const health = 1 - state.damage * config.damageAccelerationPenalty;

  const steeringRate =
    config.steeringRateLowSpeed +
    (config.steeringRateHighSpeed - config.steeringRateLowSpeed) *
      smoothstep(0.08, 1, speedRatio);
  const movementAuthority = smoothstep(0.5, 12, Math.abs(forwardSpeed));
  const steeringDamage = 1 - state.damage * config.damageSteeringPenalty;
  const targetYawVelocity =
    input.steer *
    steeringRate *
    movementAuthority *
    steeringDamage *
    (state.drift.active ? config.driftSteeringMultiplier : 1);
  state.angularVelocity.yaw +=
    (targetYawVelocity - state.angularVelocity.yaw) *
    Math.min(1, config.steeringResponse * delta);
  state.orientation.yaw = wrapAngle(
    state.orientation.yaw + state.angularVelocity.yaw * delta,
  );

  const boostAcceleration = state.boost.active ? config.boostAcceleration : 0;
  const thrust = (input.throttle * config.engineAcceleration + boostAcceleration) * health;
  forwardSpeed += thrust * delta;

  if (input.brake > 0) {
    const brakeAmount = config.brakeAcceleration * input.brake * delta;
    forwardSpeed = Math.max(0, forwardSpeed - brakeAmount);
  }

  const grip = state.drift.active ? config.driftLateralGrip : config.lateralGrip;
  const targetSlip = state.drift.active
    ? state.drift.direction * speed * config.driftSlip
    : 0;
  lateralSpeed += (targetSlip - lateralSpeed) * Math.min(1, grip * delta);

  const planarSpeed = Math.hypot(forwardSpeed, lateralSpeed);
  if (planarSpeed > 0.001) {
    const drag =
      config.linearDrag * planarSpeed +
      config.quadraticDrag * planarSpeed * planarSpeed;
    const retained = Math.max(0, 1 - drag * delta / planarSpeed);
    forwardSpeed *= retained;
    lateralSpeed *= retained;
  }

  const cap = state.boost.active ? config.boostMaxSpeed : config.maxSpeed;
  const cappedSpeed = Math.hypot(forwardSpeed, lateralSpeed);
  if (cappedSpeed > cap) {
    const scale = cap / cappedSpeed;
    forwardSpeed *= scale;
    lateralSpeed *= scale;
  }

  const nextYaw = state.orientation.yaw;
  const nextForwardX = Math.sin(nextYaw);
  const nextForwardZ = Math.cos(nextYaw);
  const nextRightX = Math.cos(nextYaw);
  const nextRightZ = -Math.sin(nextYaw);
  state.velocity.x = nextForwardX * forwardSpeed + nextRightX * lateralSpeed;
  state.velocity.z = nextForwardZ * forwardSpeed + nextRightZ * lateralSpeed;

  state.drift.slipAngle = Math.atan2(lateralSpeed, Math.max(0.01, Math.abs(forwardSpeed)));
}

function updateTerrainResponse(
  state: PodracerState,
  input: PlayerInputState,
  terrain: HeightSampler,
  config: Readonly<PodracerConfig>,
  events: PodracerEvent[],
): void {
  const delta = config.fixedDelta;
  const previousGrounded = state.grounded;
  const previousAirTime = state.airborneTime;
  const preStepVerticalSpeed = state.velocity.y;
  let terrainSummary = sampleTerrain(state, terrain, config);

  const verticalAcceleration = -config.gravity + terrainSummary.totalLift;
  state.velocity.y = clamp(
    state.velocity.y + verticalAcceleration * delta,
    -85,
    62,
  );
  state.position.y += state.velocity.y * delta;

  const torque = deterministicTorque(state, input.throttle);
  state.telemetry.engineTorque = torque;
  const supported = terrainSummary.support >= config.groundSupportThreshold;
  const pitchTarget = supported
    ? clamp(
        terrainSummary.slopePitch + input.throttle * 0.025 - input.brake * 0.075,
        -config.maxPitch,
        config.maxPitch,
      )
    : clamp(-state.velocity.y * 0.003, -0.14, 0.14);
  const rollTarget = supported
    ? clamp(
        terrainSummary.slopeRoll + torque * config.engineTorqueScale,
        -config.maxRoll,
        config.maxRoll,
      )
    : clamp(torque * config.engineTorqueScale * 1.8, -config.maxRoll, config.maxRoll);
  const planarSpeed = Math.hypot(state.velocity.x, state.velocity.z);
  const bankTarget = clamp(
    -input.steer * config.maxBank * smoothstep(12, config.maxSpeed, planarSpeed),
    -config.maxBank,
    config.maxBank,
  );

  const pitch = springAngle(
    state.orientation.pitch,
    state.angularVelocity.pitch,
    pitchTarget,
    config.pitchSpring,
    config.pitchDamping,
    delta,
  );
  state.orientation.pitch = pitch.value;
  state.angularVelocity.pitch = pitch.velocity;

  const roll = springAngle(
    state.orientation.roll,
    state.angularVelocity.roll,
    rollTarget,
    config.rollSpring,
    config.rollDamping,
    delta,
  );
  state.orientation.roll = roll.value;
  state.angularVelocity.roll = roll.velocity;

  const bank = springAngle(
    state.orientation.bank,
    state.angularVelocity.bank,
    bankTarget,
    config.bankSpring,
    config.bankDamping,
    delta,
  );
  state.orientation.bank = bank.value;
  state.angularVelocity.bank = bank.velocity;

  terrainSummary = sampleTerrain(state, terrain, config);
  let landingVerticalSpeed = Math.max(0, -preStepVerticalSpeed, -state.velocity.y);
  if (terrainSummary.maxPenetration > 0) {
    state.position.y += terrainSummary.maxPenetration;
    if (state.velocity.y < 0) {
      landingVerticalSpeed = Math.max(landingVerticalSpeed, -state.velocity.y);
      state.velocity.y = -state.velocity.y * config.landingBounce;
    }
    terrainSummary = sampleTerrain(state, terrain, config);
  }

  state.grounded =
    (terrainSummary.support >= config.groundSupportThreshold &&
      terrainSummary.averageClearance <= config.hoverHeight + config.airborneClearance) ||
    terrainSummary.minimumClearance <= config.hardDeckClearance + 0.22;

  if (!state.grounded) {
    state.airborneTime += delta;
    if (previousGrounded) {
      events.push({
        type: 'airborne',
        position: copyPosition(state.position),
        verticalSpeed: state.velocity.y,
      });
    }
  } else {
    if (!previousGrounded) {
      const intensity = clamp(
        (landingVerticalSpeed - config.landingMinSpeed) / 13 + previousAirTime * 0.22,
        0,
        1,
      );
      state.telemetry.landingIntensity = intensity;
      events.push({
        type: 'landing',
        position: copyPosition(state.position),
        intensity,
        airTime: previousAirTime,
        verticalSpeed: landingVerticalSpeed,
      });
      events.push({
        type: 'sand-spray',
        position: copyPosition(state.position),
        intensity: Math.max(0.2, intensity),
        direction: state.drift.direction,
      });
      if (intensity > 0.05) {
        events.push({
          type: 'camera-shake',
          reason: 'landing',
          amplitude: 0.16 + intensity * 0.84,
          duration: 0.13 + intensity * 0.32,
          frequency: 18 + intensity * 14,
        });
      }

      if (landingVerticalSpeed > config.landingDamageSpeed) {
        const damageAmount = clamp(
          (landingVerticalSpeed - config.landingDamageSpeed) *
            config.landingDamageScale,
          0,
          0.22,
        );
        state.damage = clamp(state.damage + damageAmount, 0, 1);
        events.push({
          type: 'damage',
          amount: damageAmount,
          total: state.damage,
          reason: 'landing',
        });
      }
    }
    state.airborneTime = 0;
  }

  state.telemetry.groundClearance = terrainSummary.averageClearance;
  state.telemetry.support = terrainSummary.support;
  state.telemetry.landingIntensity = Math.max(
    0,
    state.telemetry.landingIntensity - delta * 2.8,
  );
}

function updateTelemetry(
  state: PodracerState,
  config: Readonly<PodracerConfig>,
): void {
  const sinYaw = Math.sin(state.orientation.yaw);
  const cosYaw = Math.cos(state.orientation.yaw);
  const speed = Math.hypot(state.velocity.x, state.velocity.z);
  state.telemetry.speed = speed;
  state.telemetry.forwardSpeed = state.velocity.x * sinYaw + state.velocity.z * cosYaw;
  state.telemetry.lateralSpeed = state.velocity.x * cosYaw - state.velocity.z * sinYaw;
  state.telemetry.normalizedSpeed = clamp(speed / config.maxSpeed, 0, 1.5);
}

function sanitizeState(
  state: PodracerState,
  config: Readonly<PodracerConfig>,
): void {
  state.position.x = clamp(finite(state.position.x), -1e9, 1e9);
  state.position.y = clamp(finite(state.position.y, config.hoverHeight), -20_000, 20_000);
  state.position.z = clamp(finite(state.position.z), -1e9, 1e9);
  state.velocity.x = clamp(finite(state.velocity.x), -config.boostMaxSpeed, config.boostMaxSpeed);
  state.velocity.y = clamp(finite(state.velocity.y), -85, 62);
  state.velocity.z = clamp(finite(state.velocity.z), -config.boostMaxSpeed, config.boostMaxSpeed);
  state.orientation.yaw = wrapAngle(finite(state.orientation.yaw));
  state.orientation.pitch = clamp(finite(state.orientation.pitch), -config.maxPitch, config.maxPitch);
  state.orientation.roll = clamp(finite(state.orientation.roll), -config.maxRoll, config.maxRoll);
  state.orientation.bank = clamp(finite(state.orientation.bank), -config.maxBank, config.maxBank);
  state.angularVelocity.yaw = clamp(finite(state.angularVelocity.yaw), -2.5, 2.5);
  state.angularVelocity.pitch = clamp(finite(state.angularVelocity.pitch), -3.5, 3.5);
  state.angularVelocity.roll = clamp(finite(state.angularVelocity.roll), -3.5, 3.5);
  state.angularVelocity.bank = clamp(finite(state.angularVelocity.bank), -3.5, 3.5);
  state.drift.charge = clamp(finite(state.drift.charge), 0, 1);
  state.drift.slipAngle = clamp(finite(state.drift.slipAngle), -Math.PI / 2, Math.PI / 2);
  state.boost.energy = clamp(finite(state.boost.energy), 0, 1);
  state.boost.driftBoostTime = clamp(finite(state.boost.driftBoostTime), 0, 4);
  state.heat = clamp(finite(state.heat), 0, 1.25);
  state.damage = clamp(finite(state.damage), 0, 1);
  state.airborneTime = clamp(finite(state.airborneTime), 0, 60);
}

/**
 * Runs exactly one 120 Hz vehicle tick and mutates `state` in place. The state
 * remains renderer-free JSON data; this avoids allocating a full racer graph at
 * 120 Hz while keeping deterministic snapshot/replay behavior.
 */
export function stepPodracer(
  state: PodracerState,
  rawInput: Partial<PlayerInputState>,
  context: PodracerStepContext,
  config: Readonly<PodracerConfig> = DEFAULT_PODRACER_CONFIG,
): PodracerStepResult {
  const input = normalizePlayerInput(rawInput);
  const events: PodracerEvent[] = [];
  const resetPressed = input.reset && !state.controls.resetHeld;

  if (resetPressed) {
    resetPodracer(state, context.terrain, config);
    events.push({ type: 'reset', position: copyPosition(state.position) });
  } else {
    for (const collision of context.collisions ?? []) {
      applyCollision(state, collision, config, events);
    }

    const speed = Math.hypot(state.velocity.x, state.velocity.z);
    updateDriftAndBoost(state, input, speed, config, events);
    updateHorizontalMotion(state, input, config);
    state.position.x += state.velocity.x * config.fixedDelta;
    state.position.z += state.velocity.z * config.fixedDelta;
    updateTerrainResponse(state, input, context.terrain, config, events);
    updateTelemetry(state, config);
  }

  state.controls.driftHeld = input.drift;
  state.controls.boostHeld = input.boost;
  state.controls.resetHeld = input.reset;
  state.step += 1;
  state.simulationTime += config.fixedDelta;
  sanitizeState(state, config);

  return { state, events, input };
}
