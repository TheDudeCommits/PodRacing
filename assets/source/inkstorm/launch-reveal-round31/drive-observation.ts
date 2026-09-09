/**
 * Run: npx --yes tsx scripts/drive-balance.ts [--only=podracer] [--pace=0.88]
 * A diagnostic input adapter, never a race-state editor. No browser is used.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { RaceSimulation } from '../../../../src/game/race/RaceSimulation';
import { SALT_RUN_PROFILE } from '../../../../src/game/race/CourseGulfField';
import { DEFAULT_PODRACER_CONFIG, type PodracerConfig } from '../../../../src/game/simulation/config';
import { GALACTIC_VEHICLE_ORDER, deriveGalacticVehicleConfig, type GalacticVehicleClass } from '../../../../src/game/galactic';
import { getMasteryEvent, INKSTORM_HERO_SEED } from '../../../../src/game/mastery/events';
import { sampleTerrainHeight } from '../../../../src/render/terrain/terrainMath';
import type { PlayerInputState } from '../../../../src/game/input/actions';
import { nearestBranchProjection } from '../../../../src/game/race/branches';
import { sampleBridgeSurface } from '../../../../src/game/race/bridgeSurface';

const option = (key: string, fallback = '') => process.argv.find((arg) => arg.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const only = option('only');
const label = option('label', 'latest').replace(/[^a-z0-9_-]/gi, '-');
const pace = Math.min(1, Math.max(0.45, Number(option('pace', '0.88'))));
const maxSim = Number(option('limit', '360'));
const maxWall = Number(option('wall', '120'));
const observeAiUntil = Number(option('observe-ai', '0'));
const useElevatedBridge = process.argv.includes('--bridge');
const disableBoost = process.argv.includes('--no-boost');
const launchBoost = process.argv.includes('--launch-boost');
const saltBoost = process.argv.includes('--salt-boost');
const bridgeSpeed = Number(option('bridge-speed', '0'));
const resultsGraceSeconds = Number(option('grace', '8'));
const terrain = { heightAt: sampleTerrainHeight };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smoothstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function steeringAuthority(speed: number, config: Readonly<PodracerConfig>): number {
  return config.steeringRateLowSpeed + (config.steeringRateHighSpeed - config.steeringRateLowSpeed)
    * smoothstep(0.08, 1, speed / config.maxSpeed);
}
function cornerSpeed(curvature: number, config: Readonly<PodracerConfig>): number {
  let lo = 10, hi = config.boostMaxSpeed * 0.95;
  for (let i = 0; i < 12; i += 1) {
    const mid = (lo + hi) / 2;
    if (mid * Math.abs(curvature) <= steeringAuthority(mid, config) * pace) lo = mid;
    else hi = mid;
  }
  return lo;
}

function pursuitTarget(race: RaceSimulation, distance: number, lookDistance: number) {
  const canonical = race.course.sampleAtDistance(distance + lookDistance);
  const bridge = useElevatedBridge ? race.course.branches.find((branch) => branch.elevated) : null;
  const progress = distance / race.course.totalLength;
  if (!bridge || progress < bridge.entryProgress - lookDistance / race.course.totalLength || progress > bridge.exitProgress) return canonical;
  const player = race.state.entries.find((entry) => entry.isPlayer)!;
  const nearest = nearestBranchProjection([bridge], player.vehicle.position.x, player.vehicle.position.z);
  if (!nearest) return canonical;
  const beforeEntry = Math.max(0, bridge.entryProgress * race.course.totalLength - distance);
  let remaining = lookDistance - beforeEntry;
  let fraction = beforeEntry > 0 ? 0 : nearest.amount;
  const firstIndex = beforeEntry > 0 ? 0 : bridge.points.indexOf(nearest.point);
  for (let index = firstIndex; index < bridge.points.length - 1; index += 1) {
    const point = bridge.points[index]!, next = bridge.points[index + 1]!;
    const length = Math.hypot(next.x - point.x, next.z - point.z);
    const available = length * (1 - fraction);
    if (remaining <= available) {
      const amount = fraction + remaining / length;
      return { ...canonical, x: point.x + (next.x - point.x) * amount, z: point.z + (next.z - point.z) * amount };
    }
    remaining -= available;
    fraction = 0;
  }
  return race.course.sampleAtDistance(bridge.exitProgress * race.course.totalLength + remaining);
}

interface DriverMemory { lastUsefulScore: number; stalledFor: number; resetWasPressed: boolean; lastTarget: number; }
/** Uses canonical path preview and state reads; its only output is semantic input. */
function inputFor(race: RaceSimulation, tune: Readonly<PodracerConfig>, memory: DriverMemory): Partial<PlayerInputState> {
  if (race.state.phase === 'countdown') return { throttle: 0 };
  const player = race.state.entries.find((entry) => entry.isPlayer)!;
  if (player.status === 'finished') return { throttle: 0, brake: 1 };
  const vehicle = player.vehicle;
  const speed = vehicle.telemetry.speed;
  if (observeAiUntil > race.state.raceTime && race.state.entries.length > 1
    && player.progress.currentLap === race.state.totalLaps && player.progress.courseProgress > 0.9
    && race.state.entries.some((entry) => !entry.isPlayer && entry.status !== 'finished')) {
    // Optional observation extends the rival window only via player braking.
    // No race timers, racer progress, physics or classification rules change.
    memory.stalledFor = 0;
    memory.lastUsefulScore = player.progress.unwrappedProgress;
    return { throttle: 0, brake: 1 };
  }
  const projection = race.course.projectPoint(vehicle.position.x, vehicle.position.z, player.progress.courseProgress);
  const lookDistance = clamp(19 + speed * 0.34, 23, 77);
  const target = pursuitTarget(race, projection.distance, lookDistance);
  const tx = target.x - vehicle.position.x, tz = target.z - vehicle.position.z;
  const headingError = wrapAngle(Math.atan2(tx, tz) - vehicle.orientation.yaw);
  const lateralVelocity = vehicle.velocity.x * Math.cos(vehicle.orientation.yaw) - vehicle.velocity.z * Math.sin(vehicle.orientation.yaw);
  const desiredYawRate = 2 * Math.max(20, speed) * Math.sin(headingError) / Math.max(10, Math.hypot(tx, tz))
    + headingError * 0.38 - lateralVelocity * 0.011;
  const steer = clamp(desiredYawRate / Math.max(0.1, steeringAuthority(speed, tune) * (1 - vehicle.damage * tune.damageSteeringPenalty)), -1, 1);
  let targetSpeed = tune.boostMaxSpeed * 0.9;
  for (const distance of [0, 18, 38, 70, 110, 170, 245, 325]) {
    const ahead = race.course.sampleAtDistance(projection.distance + distance);
    const curveLimit = cornerSpeed(ahead.curvature, tune);
    // Brake before the tightest upcoming curvature, allowing only 65% of the
    // authored brake force so controller reaction and slopes have margin.
    targetSpeed = Math.min(targetSpeed, Math.sqrt(curveLimit ** 2 + 2 * tune.brakeAcceleration * 0.65 * distance));
  }
  const bridge = useElevatedBridge ? race.course.branches.find((branch) => branch.elevated) : null;
  if (bridge && projection.progress <= bridge.exitProgress) {
    const beforeBridge = Math.max(0, bridge.entryProgress * race.course.totalLength - projection.distance);
    if (bridgeSpeed > 0) targetSpeed = Math.min(targetSpeed, Math.sqrt(bridgeSpeed ** 2 + 2 * tune.brakeAcceleration * 0.65 * beforeBridge));
    const nearest = nearestBranchProjection([bridge], vehicle.position.x, vehicle.position.z)!;
    const distances = [0];
    for (let index = 1; index < bridge.points.length; index += 1) {
      const prior = bridge.points[index - 1]!, point = bridge.points[index]!;
      distances.push(distances[index - 1]! + Math.hypot(point.x - prior.x, point.z - prior.z));
    }
    const nearestIndex = bridge.points.indexOf(nearest.point);
    const alongBridge = beforeBridge > 0 ? -beforeBridge : distances[nearestIndex]!
      + (distances[nearestIndex + 1]! - distances[nearestIndex]!) * nearest.amount;
    // The fork has tighter joins than the parallel main road. Its own
    // curvature must participate in braking, not just the canonical spline.
    for (let index = 1; index < bridge.points.length - 1; index += 1) {
      const aheadDistance = distances[index]! - alongBridge;
      if (aheadDistance < -12 || aheadDistance > 325) continue;
      const prior = bridge.points[index - 1]!, point = bridge.points[index]!, next = bridge.points[index + 1]!;
      const ax = point.x - prior.x, az = point.z - prior.z, bx = next.x - point.x, bz = next.z - point.z;
      const turn = Math.abs(Math.atan2(ax * bz - az * bx, ax * bx + az * bz));
      const curvature = turn / Math.max(1, (Math.hypot(ax, az) + Math.hypot(bx, bz)) * 0.5);
      const limit = cornerSpeed(curvature, tune);
      targetSpeed = Math.min(targetSpeed, Math.sqrt(limit ** 2 + 2 * tune.brakeAcceleration * 0.65 * Math.max(0, aheadDistance)));
    }
  }
  if (Math.abs(headingError) > 0.8) targetSpeed = Math.min(targetSpeed, 30);
  if (projection.distanceToCenter > projection.width * 0.8) targetSpeed = Math.min(targetSpeed, 55);
  // Grid progress starts just before zero. Use continuous progress so crossing
  // the start line cannot look like twelve seconds without forward movement.
  const score = player.progress.unwrappedProgress;
  if (score > memory.lastUsefulScore + 0.0002) { memory.lastUsefulScore = score; memory.stalledFor = 0; }
  else memory.stalledFor += 1 / 30;
  const reset = memory.stalledFor > 12 && !memory.resetWasPressed;
  memory.resetWasPressed = reset;
  if (reset) { memory.stalledFor = 0; memory.lastUsefulScore = score; }
  memory.lastTarget = targetSpeed;
  return {
    throttle: speed > targetSpeed + 3 ? 0 : clamp(0.5 + (targetSpeed - speed) / 15, 0, 1),
    brake: clamp((speed - targetSpeed - 2) / 17, 0, 1),
    steer,
    drift: false,
    boost: !disableBoost && vehicle.grounded && vehicle.heat < 0.58 && vehicle.boost.energy > 0.25
      && (saltBoost
        ? race.courseGulfField !== null && projection.distance >= SALT_RUN_PROFILE.startDistance
          && projection.distance <= race.courseGulfField.launchProfile.floorDistance
        : launchBoost
        ? race.courseGulfField !== null
          && projection.distance >= race.courseGulfField.launchProfile.crestDistance - 150
          && projection.distance <= race.courseGulfField.launchProfile.floorDistance
        : targetSpeed > speed + 15 && Math.abs(headingError) < 0.13
          && projection.distanceToCenter < projection.width * 0.45),
    reset,
  };
}

function runCase(eventId: string, vehicleClass: GalacticVehicleClass) {
  const event = getMasteryEvent(eventId);
  const race = new RaceSimulation({ terrain, seed: event.seed, competitionProfile: event.profile,
    totalLaps: event.laps, aiDifficulty: event.difficulty, mode: event.mode, countdownSeconds: 3,
    resultsGraceSeconds });
  race.selectPlayerVehicle(vehicleClass);
  race.lockPlayerVehicleSelection();
  const player = race.state.entries.find((entry) => entry.isPlayer)!;
  const tune = deriveGalacticVehicleConfig(vehicleClass, DEFAULT_PODRACER_CONFIG, player.galactic!.upgrades);
  const memory: DriverMemory = { lastUsefulScore: player.progress.unwrappedProgress, stalledFor: 0, resetWasPressed: false, lastTarget: 0 };
  const stats = new Map(race.state.entries.map((entry) => [entry.id, {
    resets: 0, collisions: 0, sceneryCollisions: 0, wrecks: 0, maxSpeed: 0, maxDamage: 0,
    maxOffCourseM: 0, airborneSeconds: 0, naturalFinishTime: null as number | null,
    observedLaps: [] as number[], checkpointCrossings: 0, checkpointOrder: [] as number[],
    bridgeSeconds: 0, bridgeGroundedSeconds: 0, bridgePeakLift: 0,
    bridgeMinimumClearance: null as number | null,
    saltSeconds: 0, saltBoostInputSeconds: 0, saltPeakSpeed: 0, saltCollisions: 0, saltResets: 0,
    launchLandings: [] as unknown[], launchMinimumCenterClearance: Infinity, launchMaximumHeat: 0,
    launchSeconds: 0, launchBoostInputSeconds: 0, launchAirborneSeconds: 0, launchPeakSpeed: 0,
    launchCollisions: 0, launchResets: 0, launchCollisionSources: {} as Record<string, number>,
    collisionSources: {} as Record<string, number>,
  }]));
  const trace: Record<string, unknown>[] = [];
  const notableEvents: Record<string, unknown>[] = [];
  const recoveries: Record<string, unknown>[] = [];
  const collisionHotspots = new Map<string, { count: number; x: number; y: number; z: number; progress: number; tag: string; racers: Set<string> }>();
  const started = performance.now();
  let input: Partial<PlayerInputState> = {};
  let ticks = 0;
  let terminatedBy = 'simulation-time-limit';
  const limit = Math.min(maxSim, event.laps * 240);
  console.log(`START ${eventId}/${vehicleClass}: ${(race.course.totalLength / 1000).toFixed(2)}km x${event.laps}, seed ${event.seed}`);
  for (; ticks < (limit + 3) * 120; ticks += 1) {
    if (ticks % 4 === 0) input = inputFor(race, tune, memory);
    const beforeTick = race.state.entries.map((entry) => ({
      id: entry.id, x: entry.vehicle.position.x, z: entry.vehicle.position.z,
      progress: entry.progress.courseProgress, offCourse: entry.progress.offCourseDistance,
      speed: entry.vehicle.telemetry.speed, grounded: entry.vehicle.grounded, wrongWay: entry.progress.wrongWay,
    }));
    const result = race.step(input);
    for (const entry of race.state.entries) {
      const stat = stats.get(entry.id)!;
      if (stat.naturalFinishTime !== null) continue;
      const launch = race.courseGulfField?.launchProfile;
      const along = entry.progress.courseProgress * race.course.totalLength;
      const inLaunch = launch !== undefined && along >= launch.crestDistance - 150 && along <= launch.basinEndDistance;
      const inSalt = launch !== undefined && along >= SALT_RUN_PROFILE.startDistance && along <= 1280;
      if (inSalt) {
        stat.saltSeconds += 1 / 120;
        if (entry.isPlayer && input.boost) stat.saltBoostInputSeconds += 1 / 120;
        stat.saltPeakSpeed = Math.max(stat.saltPeakSpeed, entry.vehicle.telemetry.speed);
      }
      if (inLaunch) {
        stat.launchSeconds += 1 / 120;
        stat.launchMinimumCenterClearance = Math.min(stat.launchMinimumCenterClearance, entry.vehicle.position.y - race.terrain.heightAt(entry.vehicle.position.x, entry.vehicle.position.z));
        stat.launchMaximumHeat = Math.max(stat.launchMaximumHeat, entry.vehicle.heat);
        if (entry.isPlayer && input.boost) stat.launchBoostInputSeconds += 1 / 120;
        if (!entry.vehicle.grounded) stat.launchAirborneSeconds += 1 / 120;
        stat.launchPeakSpeed = Math.max(stat.launchPeakSpeed, entry.vehicle.telemetry.speed);
      }
      stat.maxSpeed = Math.max(stat.maxSpeed, entry.vehicle.telemetry.speed);
      stat.maxDamage = Math.max(stat.maxDamage, entry.vehicle.damage);
      const bridge = sampleBridgeSurface(race.course.branches, entry.vehicle.position.x, entry.vehicle.position.z);
      if (bridge && bridge.height - sampleTerrainHeight(entry.vehicle.position.x, entry.vehicle.position.z) > 6) {
        stat.bridgeSeconds += 1 / 120;
        if (entry.vehicle.grounded) stat.bridgeGroundedSeconds += 1 / 120;
        stat.bridgePeakLift = Math.max(stat.bridgePeakLift, entry.vehicle.position.y - sampleTerrainHeight(entry.vehicle.position.x, entry.vehicle.position.z));
        const clearance = entry.vehicle.position.y - bridge.height;
        stat.bridgeMinimumClearance = Math.min(stat.bridgeMinimumClearance ?? Infinity, clearance);
      }
      if (!entry.vehicle.grounded && race.state.phase === 'racing') stat.airborneSeconds += 1 / 120;
      for (const event of result.vehicleEvents[entry.id] ?? []) {
        if (event.type === 'landing' && inLaunch) stat.launchLandings.push({ time: race.state.raceTime, progress: entry.progress.courseProgress, position: {...entry.vehicle.position}, ...event });
        if (event.type === 'reset') {
          stat.resets += 1;
          if (inLaunch) stat.launchResets += 1;
          if (inSalt) stat.saltResets += 1;
          recoveries.push({ t: race.state.raceTime, racer: entry.id, progress: entry.progress.courseProgress,
            nextCheckpoint: entry.progress.nextCheckpointIndex, unwrappedProgress: entry.progress.unwrappedProgress,
            x: entry.vehicle.position.x, z: entry.vehicle.position.z, before: beforeTick.find((prior) => prior.id === entry.id), ai: entry.ai?.telemetry });
        }
        if (event.type === 'collision') {
          stat.collisions += 1;
          if (inLaunch) stat.launchCollisions += 1;
          if (inSalt) stat.saltCollisions += 1;
          const source = event.sourceId ?? 'unknown';
          if (inLaunch) stat.launchCollisionSources[source] = (stat.launchCollisionSources[source] ?? 0) + 1;
          stat.collisionSources[source] = (stat.collisionSources[source] ?? 0) + 1;
          if (source.startsWith('inkstorm-')) stat.sceneryCollisions += 1;
          if (source.startsWith('inkstorm-')) {
            const existing = collisionHotspots.get(source);
            if (existing) { existing.count += 1; existing.racers.add(entry.id); }
            else collisionHotspots.set(source, { count: 1, ...entry.vehicle.position,
              progress: entry.progress.courseProgress,
              tag: race.course.sampleAtDistance(entry.progress.courseProgress * race.course.totalLength).tag, racers: new Set([entry.id]) });
          }
          if (entry.isPlayer && notableEvents.length < 24) notableEvents.push({ t: race.state.raceTime, type: 'collision', source, progress: entry.progress.courseProgress });
        }
      }
      stat.wrecks += result.galacticEvents.filter((event) => event.type === 'wreck' && event.racerId === entry.id).length;
      for (const raceEvent of result.events) {
        if (!('racerId' in raceEvent) || raceEvent.racerId !== entry.id) continue;
        if (raceEvent.type === 'checkpoint') { stat.checkpointCrossings += 1; stat.checkpointOrder.push(raceEvent.checkpointIndex); }
        if (raceEvent.type === 'lap-complete') {
          stat.observedLaps.push(raceEvent.lapTime);
          if (raceEvent.lap >= event.laps) stat.naturalFinishTime = race.state.raceTime;
        }
      }
    }
    if (ticks % 120 === 0 && stats.get(player.id)!.naturalFinishTime === null) {
      const projection = race.course.projectPoint(player.vehicle.position.x, player.vehicle.position.z, player.progress.courseProgress);
      stats.get(player.id)!.maxOffCourseM = Math.max(stats.get(player.id)!.maxOffCourseM, projection.distanceToCenter - projection.width);
      trace.push({ t: Number(race.state.raceTime.toFixed(2)), progress: Number(player.progress.courseProgress.toFixed(4)),
        lap: player.progress.currentLap, speed: Number(player.vehicle.telemetry.speed.toFixed(1)),
        targetSpeed: Number(memory.lastTarget.toFixed(1)), lateral: Number(projection.lateralOffset.toFixed(1)),
        width: Number(projection.width.toFixed(1)), tag: projection.tag, damage: Number(player.vehicle.damage.toFixed(3)),
        input });
    }
    if (race.state.phase === 'finished') { terminatedBy = 'race-finished'; break; }
    if (ticks % 1200 === 0 && performance.now() - started > maxWall * 1000) { terminatedBy = 'wall-time-limit'; break; }
  }
  const racers = race.state.entries.map((entry) => ({ id: entry.id, name: entry.name,
    vehicleClass: entry.galactic?.vehicleClass, status: entry.status, completedLaps: entry.progress.completedLaps,
    finishReason: entry.competition?.finishReason, unwrappedProgress: entry.progress.unwrappedProgress,
    courseProgress: entry.progress.courseProgress, finishTime: entry.progress.finishTime,
    lapTimes: entry.progress.lapTimes, ...stats.get(entry.id)! }));
  const playerStats = racers.find((entry) => entry.id === player.id)!;
  const cleanCompletion = playerStats.naturalFinishTime !== null && playerStats.resets === 0;
  const time = playerStats.naturalFinishTime;
  const medal = cleanCompletion && time !== null
    ? time <= event.medalTimes.gold ? 'gold' : time <= event.medalTimes.silver ? 'silver' : time <= event.medalTimes.bronze ? 'bronze' : 'none'
    : 'ineligible';
  const receipt = { eventId, vehicleClass, seed: event.seed, profile: event.profile, laps: event.laps,
    courseLengthM: race.course.totalLength, pace, disableBoost, launchBoost, saltBoost, observeAiUntil, useElevatedBridge, bridgeSpeed, resultsGraceSeconds, terminatedBy, ticks, simulationTime: race.state.raceTime,
    executionSeconds: (performance.now() - started) / 1000, cleanCompletion, medal, medalTimes: event.medalTimes,
    racers, notableEvents, recoveries, trace, collisionHotspots: [...collisionHotspots].map(([source, hotspot]) => ({ source, ...hotspot, racers: [...hotspot.racers] })).sort((a, b) => b.count - a.count) };
  console.log(`END ${eventId}/${vehicleClass}: ${time?.toFixed(2) ?? 'DNF'}s; ${playerStats.resets} resets; ${playerStats.collisions} collisions; medal=${medal}; natural finishers ${racers.filter((r) => r.naturalFinishTime !== null).length}/${racers.length}; ${receipt.executionSeconds.toFixed(1)}s execution`);
  return receipt;
}

const cases: Array<[string, GalacticVehicleClass]> = [
  ...GALACTIC_VEHICLE_ORDER.map((vehicle) => ['inkstorm-trial', vehicle] as [string, GalacticVehicleClass]),
  ['cup-canyon', 'podracer'], ['cup-foundry', 'podracer'], ['cup-glass', 'podracer'],
].filter(([event, vehicle]) => !only || event === only || (event === 'inkstorm-trial' && vehicle === only));
if (![pace, maxSim, maxWall, observeAiUntil, bridgeSpeed, resultsGraceSeconds].every(Number.isFinite) || cases.length === 0) throw new Error('Invalid diagnostic options.');
const sources = ['src/game/simulation/config.ts', 'src/game/race/RaceSimulation.ts', 'src/game/race/course.ts',
  'src/game/race/inkstormLayout.ts', 'src/render/terrain/terrainMath.ts', 'src/game/ai/controller.ts', 'scripts/drive-balance.ts'];
sources.push('assets/source/inkstorm/launch-reveal-round31/drive-observation.ts', 'src/game/mastery/events.ts', 'src/game/race/branches.ts', 'src/game/race/bridgeSurface.ts', 'src/game/race/CourseGulfField.ts');
const hashes = Object.fromEntries(sources.map((path) => [path, createHash('sha256').update(readFileSync(path)).digest('hex')]));
const receipts = cases.map(([event, vehicle]) => runCase(event, vehicle));
mkdirSync('output/drive-balance', { recursive: true });
const path = `output/drive-balance/${label}.json`;
writeFileSync(path, JSON.stringify({ generatedAt: new Date().toISOString(), heroSeed: INKSTORM_HERO_SEED,
  command: process.argv.slice(2), limitation: 'Automated input-only driver; no teleport or progress mutation. This is not human handling acceptance.', hashes, receipts }, null, 2) + '\n');
console.log(`Evidence: ${path}`);
