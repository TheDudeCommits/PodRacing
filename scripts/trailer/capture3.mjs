/**
 * Trailer v3 capture. Deterministic offline render (two 120 Hz ticks per 60fps
 * frame, capture-mode quality 0), hero driven by the clamped closed-loop driver,
 * and a per-frame telemetry record written beside the frames so pick.mjs can
 * choose cuts from measurements rather than guesses.
 *   node scripts/trailer/capture3.mjs [--only=id,id]
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';
import { SHOTS3 } from './shots3.mjs';
import { DRIVER_SOURCE } from './driver.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));
const only = args.only ? String(args.only).split(',') : null;
const shots = only ? SHOTS3.filter((s) => only.includes(s.id)) : SHOTS3;
const root = 'output/trailer/shots3';
await mkdir(root, { recursive: true });

const port = await new Promise((res, rej) => { const s = createServer(); s.once('error', rej);
  s.listen(0, '127.0.0.1', () => { const a = s.address(); s.close(() => res(a.port)); }); });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browser; const summary = [];
try {
  await sleep(2500);
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.__PODRACING__?.ready === true, undefined, { timeout: 180_000 });
  await page.evaluate(DRIVER_SOURCE);
  await page.evaluate(() => window.__PODRACING__.setCaptureMode(true));

  for (const shot of shots) {
    const dir = `${root}/${shot.id}`;
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const started = Date.now();

    await page.evaluate((s) => {
      const api = window.__PODRACING__;
      if (s.scenario) api.setScenario(s.scenario); else api.seekCourse(s.seek);
      api.setCamera(s.camera);
      const hud = document.querySelector('.pod-hud');
      if (hud instanceof HTMLElement) hud.style.opacity = s.hud ? '1' : '0';
      if (s.yieldFor) {
        const ticks = Math.round(s.yieldFor * 120);
        for (let i = 0; i < ticks; i += 2) {
          window.__TRAILER_DRIVE__({ throttle: 0.30, boost: false, overtake: false, weave: 0 });
          api.step(1); api.step(1);
        }
      }
    }, shot);

    const timed = new Map((shot.at ?? []).map((a) => [a.frame, a]));
    let drive = { ...(shot.drive ?? {}) };
    const telemetry = [];
    for (let f = 0; f < shot.frames; f += 1) {
      const action = timed.get(f);
      if (action) {
        if (action.drive) drive = { ...drive, ...action.drive };
        await page.evaluate((a) => {
          const api = window.__PODRACING__;
          if (a.camera) api.setCamera(a.camera);
          if (a.wreckSelf) api.debugWreckPlayer();
          if (a.wreckAhead) {
            const s = api.snapshot();
            const me = s.galactic.racers.find((r) => r.id === 'player');
            const fx = Math.sin(me.yaw || 0), fz = Math.cos(me.yaw || 0);
            let best = null, bestD = 1e9;
            for (const r of s.galactic.racers) {
              if (r.id === 'player' || !r.position) continue;
              if (r.galactic.wreck.phase !== 'running') continue;
              const dx = r.position[0] - me.position[0], dz = r.position[2] - me.position[2];
              if (dx * fx + dz * fz <= 0) continue;
              const d = Math.hypot(dx, dz);
              if (d < bestD) { bestD = d; best = r.id; }
            }
            if (best) api.debugWreckRacer(best);
          }
        }, action);
      }
      const t = await page.evaluate((d) => {
        const r = window.__TRAILER_DRIVE__(d);
        window.__PODRACING__.step(1); window.__PODRACING__.step(1);
        return r;
      }, drive);
      telemetry.push({ f, ...t });
      await page.screenshot({ path: `${dir}/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 94 });
    }

    await writeFile(`${dir}/telemetry.json`, JSON.stringify(telemetry));
    const lats = telemetry.map((t) => Math.abs(t.lat));
    const onLine = lats.filter((v) => v < 10).length / lats.length;
    const row = { id: shot.id, feature: shot.feature, frames: shot.frames,
      renderSeconds: +((Date.now() - started) / 1000).toFixed(1),
      onLineFrac: +onLine.toFixed(2), maxAbsLat: +Math.max(...lats).toFixed(1),
      fires: telemetry.filter((t) => t.firedNow).length,
      mines: telemetry.filter((t) => t.minedNow).length,
      shieldFrames: telemetry.filter((t) => t.shieldActive).length,
      driftPeak: +Math.max(...telemetry.map((t) => t.drift || 0)).toFixed(2),
      wreckFrames: telemetry.filter((t) => t.wreck !== 'running').length,
      boltFrames: telemetry.filter((t) => t.bolts > 0).length };
    summary.push(row);
    console.log(JSON.stringify(row));
  }
  await writeFile(`${root}/receipt.json`, JSON.stringify({ shots: summary, errors }, null, 2));
  console.log('errors', JSON.stringify(errors));
} finally { await browser?.close(); server.kill(); }
