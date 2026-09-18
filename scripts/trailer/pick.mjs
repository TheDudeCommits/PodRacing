/**
 * Chooses each cut's in-point from captured telemetry instead of by eye.
 *
 * Earlier rounds picked in-points by guessing, which is how the trailer ended up
 * full of footage where the hero had already passed the field or had slid off
 * the racing line. Every window here must satisfy a hard on-track gate, and is
 * then scored for the feature the beat is supposed to showcase.
 *
 *   node scripts/trailer/pick.mjs            # report the best window per take
 *   node scripts/trailer/pick.mjs --json     # machine-readable
 */
import { readFile, readdir } from 'node:fs/promises';

const ROOT = 'output/trailer/shots3';
const FPS = 60;
const ON_TRACK = 11;      // metres from the centreline still reading as racing

export async function loadTelemetry(id) {
  return JSON.parse(await readFile(`${ROOT}/${id}/telemetry.json`, 'utf8'));
}

/** Hard gate: the hero must be on the racing surface for the whole window. */
function onTrack(win, feature) {
  // The vehicle showcase deliberately parks the field in wide lanes, so the
  // centreline gate does not apply to it.
  if (feature === 'fleet') return true;
  const worst = Math.max(...win.map((t) => Math.abs(t.lat)));
  // Clearing the launch crest legitimately carries the hero off the centreline;
  // allow a little more there, but require it to land back on the racing line.
  const limit = feature === 'air' ? 16 : ON_TRACK;
  if (worst > limit) return false;
  if (feature === 'air' && Math.abs(win[win.length - 1].lat) > ON_TRACK) return false;
  if (win.some((t) => t.recovering)) return false;
  // A self-wreck is only wanted where the beat is explicitly about wrecking.
  if (feature !== 'explosion' && win.some((t) => t.wreck !== 'running')) return false;
  return true;
}

const SCORERS = {
  fleet: () => 1,
  pack: (w) => w.reduce((a, t) => a + Math.min(t.near, 3), 0) / w.length,
  overtake: (w) => w.reduce((a, t) => a + Math.min(t.near, 3), 0) / w.length,
  finish: (w) => w.reduce((a, t) => a + Math.min(t.near, 2), 0) / w.length,
  air: (w) => w.reduce((a, t) => a + Math.min(t.near, 2), 0) / w.length,
  // Weapon beats must actually contain the weapon.
  lance: (w) => {
    const fired = w.filter((t) => t.firedNow).length;
    if (!fired) return -1;
    return fired * 3 + w.filter((t) => t.bolts > 0).length / w.length;
  },
  shield: (w) => {
    const frac = w.filter((t) => t.shieldActive).length / w.length;
    if (frac < 0.2) return -1;
    return frac * 4 + w.reduce((a, t) => a + Math.min(t.near, 2), 0) / w.length;
  },
  mine: (w) => {
    const dropped = w.filter((t) => t.minedNow).length;
    if (!dropped) return -1;
    return dropped * 3;
  },
  drift: (w) => {
    const peak = Math.max(...w.map((t) => t.drift || 0));
    if (peak < 0.4) return -1;
    return peak * 4 + w.filter((t) => (t.drift || 0) > 0.25).length / w.length;
  },
  explosion: (w) => {
    const ev = w.filter((t) => (t.events || []).includes('wreck')).length;
    const burning = w.filter((t) => t.wreck !== 'running').length / w.length;
    if (!ev && burning < 0.3) return -1;
    return ev * 4 + burning * 2;
  },
};

/** Best window of `seconds` in a take, for the given feature. */
export function bestWindow(telemetry, feature, seconds) {
  const len = Math.round(seconds * FPS);
  const score = SCORERS[feature] ?? SCORERS.pack;
  let best = null;
  for (let s = 0; s + len <= telemetry.length; s += 3) {
    const win = telemetry.slice(s, s + len);
    if (!onTrack(win, feature)) continue;
    const v = score(win);
    if (v < 0) continue;
    const worst = Math.max(...win.map((t) => Math.abs(t.lat)));
    const total = v - worst * 0.03;   // gently prefer the tighter line
    if (!best || total > best.total) {
      best = { start: s, inSeconds: +(s / FPS).toFixed(2), total: +total.toFixed(2),
        featureScore: +v.toFixed(2), worstLat: +worst.toFixed(1) };
    }
  }
  return best;
}

if (process.argv[1]?.endsWith('pick.mjs')) {
  const { SHOTS3 } = await import('./shots3.mjs');
  const dirs = new Set(await readdir(ROOT).catch(() => []));
  const out = [];
  for (const shot of SHOTS3) {
    if (!dirs.has(shot.id)) continue;
    const tel = await loadTelemetry(shot.id).catch(() => null);
    if (!tel) continue;
    for (const secs of [1.6, 2.0]) {
      const w = bestWindow(tel, shot.feature, secs);
      out.push({ id: shot.id, feature: shot.feature, secs, ...(w ?? { start: null }) });
    }
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
  else {
    console.log(['take'.padEnd(17),'feature'.padEnd(10),'len'.padStart(4),'in(s)'.padStart(7),'score'.padStart(8),'worstLat'.padStart(9)].join(' '));
    for (const r of out) {
      console.log([r.id.padEnd(17), r.feature.padEnd(10), String(r.secs).padStart(4),
        String(r.inSeconds ?? 'NONE').padStart(7), String(r.featureScore ?? '-').padStart(8),
        String(r.worstLat ?? '-').padStart(9)].join(' '));
    }
  }
}
