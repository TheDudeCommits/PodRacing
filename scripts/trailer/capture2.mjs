/**
 * Trailer v2 capture. Same deterministic offline render as v1 (two 120 Hz ticks
 * per 60fps frame, capture-mode quality 0) but the hero pod is now driven by the
 * closed-loop driver instead of a fixed throttle, and each take yields to the
 * field first so the racing happens in traffic.
 *   node scripts/trailer/capture2.mjs [--only=id,id]
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';
import { SHOTS2 } from './shots2.mjs';
import { DRIVER_SOURCE } from './driver.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));
const only = args.only ? String(args.only).split(',') : null;
const shots = only ? SHOTS2.filter((s) => only.includes(s.id)) : SHOTS2;
const root = 'output/trailer/shots2';
await mkdir(root, { recursive: true });

const port = await new Promise((res, rej) => { const s = createServer(); s.once('error', rej);
  s.listen(0, '127.0.0.1', () => { const a = s.address(); s.close(() => res(a.port)); }); });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browser; const receipts = [];
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
      // Let the field come past so the hero starts the take inside traffic.
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
            // Wreck whichever rival the hero is actually looking at.
            const s = api.snapshot();
            const me = s.galactic.racers.find((r) => r.id === 'player');
            const fx = Math.sin(me.yaw || 0), fz = Math.cos(me.yaw || 0);
            let best = null, bestD = 1e9;
            for (const r of s.galactic.racers) {
              if (r.id === 'player' || !r.position) continue;
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
      if (f % 30 === 0 && t) telemetry.push({ f, lat: +t.lat.toFixed(1), ahead: t.aheadDist ? Math.round(t.aheadDist) : null });
      await page.screenshot({ path: `${dir}/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 94 });
    }

    const summary = await page.evaluate(() => {
      const s = window.__PODRACING__.snapshot();
      const me = s.galactic.racers.find((r) => r.id === 'player');
      return { lat: +me.lateralOffset.toFixed(1), placement: me.galactic.placement ?? null,
        shots: me.galactic.weapon.shotsFired, hits: me.galactic.weapon.hits, quality: s.renderer.performance?.qualityLevel };
    });
    const lats = telemetry.map((x) => Math.abs(x.lat));
    const receipt = { id: shot.id, frames: shot.frames, seconds: +(shot.frames / 60).toFixed(2),
      renderSeconds: +((Date.now() - started) / 1000).toFixed(1),
      maxAbsLat: lats.length ? Math.max(...lats) : null,
      rivalAheadFrac: +(telemetry.filter((x) => x.ahead !== null && x.ahead < 160).length / (telemetry.length || 1)).toFixed(2),
      ...summary };
    receipts.push(receipt);
    console.log(JSON.stringify(receipt));
  }
  await writeFile(`${root}/receipt.json`, JSON.stringify({ shots: receipts, errors }, null, 2));
  console.log('errors', JSON.stringify(errors));
} finally { await browser?.close(); server.kill(); }
