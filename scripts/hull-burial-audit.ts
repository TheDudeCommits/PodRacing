/**
 * Run: npx --yes tsx scripts/hull-burial-audit.ts [--event=inkstorm-battle] [--seconds=75]
 * Samples the whole rendered hull footprint (engine undersides, outer edges,
 * noses and cockpit keel) against the physical terrain on every fixed tick of
 * an AI race, using the renderer's rotation convention, and reports how often
 * and how deep any hull point sits below the ground. Diagnostic only.
 */
import { RaceSimulation } from '../src/game/race/RaceSimulation';
import { sampleTerrainHeight } from '../src/render/terrain/terrainMath';
import { getMasteryEvent } from '../src/game/mastery/events';

const option = (key: string, fallback: string) => process.argv.find((arg) => arg.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const event = getMasteryEvent(option('event', 'inkstorm-battle'));
const seconds = Number(option('seconds', '75'));
const race = new RaceSimulation({ terrain: { heightAt: sampleTerrainHeight }, seed: event.seed, competitionProfile: 'clean-race', totalLaps: 1, aiDifficulty: event.difficulty, mode: event.mode, countdownSeconds: 3 });
race.lockPlayerVehicleSelection();
const points: [string, number, number][] = [];
for (const side of [-1, 1]) for (const z of [0, 4, 8, 12, 16, 20, 22.5]) { points.push([`engine@${z}`, side * 4.1, z]); points.push([`edge@${z}`, side * 6.4, z]); }
for (const z of [-7, -4, -1, 2]) points.push([`keel@${z}`, 0, z]);
const perRacer = new Map<string, { buried: number; total: number; worst: number; info: string }>();
let ticks = 0;
while (race.state.phase !== 'finished' && ticks < 120 * seconds) {
  race.step({ throttle: 0.9 }); ticks += 1;
  if (race.state.phase !== 'racing') continue;
  for (const entry of race.state.entries) {
    const v = entry.vehicle;
    const s = Math.sin(v.orientation.yaw), c = Math.cos(v.orientation.yaw);
    // Renderer convention: rotation.set(-pitch, yaw, roll, 'YXZ').
    const sp = Math.sin(-v.orientation.pitch), cp = Math.cos(v.orientation.pitch);
    const sr = Math.sin(v.orientation.roll), cr = Math.cos(v.orientation.roll);
    let deepest = 0, deepPoint = '';
    for (const [id, lx, lz] of points) {
      const x1 = lx * cr, y1 = lx * sr;
      const y2 = y1 * cp - lz * sp, z2 = y1 * sp + lz * cp;
      const wx = v.position.x + x1 * c + z2 * s, wz = v.position.z - x1 * s + z2 * c, wy = v.position.y + y2;
      const depth = race.terrain.heightAt(wx, wz) - wy;
      if (depth > deepest) { deepest = depth; deepPoint = id; }
    }
    const stat = perRacer.get(entry.id) ?? { buried: 0, total: 0, worst: 0, info: '' };
    stat.total += 1;
    if (deepest > 0.3) stat.buried += 1;
    if (deepest > stat.worst) {
      stat.worst = deepest;
      stat.info = `t=${race.state.raceTime.toFixed(1)} ${race.course.sampleAtProgress(entry.progress.courseProgress).tag} speed=${v.telemetry.speed.toFixed(0)} grounded=${v.grounded} pitch=${v.orientation.pitch.toFixed(2)} roll=${v.orientation.roll.toFixed(2)} ${deepPoint}`;
    }
    perRacer.set(entry.id, stat);
  }
}
let buried = 0, total = 0, worst = 0;
for (const [id, stat] of perRacer) {
  buried += stat.buried; total += stat.total; worst = Math.max(worst, stat.worst);
  console.log(id.padEnd(9), `buried>0.3m ${(stat.buried / stat.total * 100).toFixed(1)}%`, `worst ${stat.worst.toFixed(2)} m`, stat.info);
}
console.log(`ALL buried>0.3m ${(buried / total * 100).toFixed(2)}% worst ${worst.toFixed(2)} m over ${(ticks / 120).toFixed(0)} s`);
