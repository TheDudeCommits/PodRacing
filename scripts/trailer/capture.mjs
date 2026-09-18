/**
 * Deterministic offline trailer renderer. Runs the built bundle in capture
 * mode and advances the simulation by hand, two 120 Hz ticks per captured
 * frame, so every output frame is a full-quality render of a real race rather
 * than whatever a real-time screencast happened to catch.
 *
 * Two ticks per frame keeps render-side motion in lockstep: each step() calls
 * render(FIXED_DT) once, so two steps advance effect time by exactly 1/60 s.
 *
 *   node scripts/trailer/capture.mjs [--only=id,id] [--width=1920] [--height=1080]
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';
import { SHOTS } from './shots.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));
const width = Number(args.width ?? 1920);
const height = Number(args.height ?? 1080);
const only = args.only ? String(args.only).split(',') : null;
const shots = only ? SHOTS.filter((s) => only.includes(s.id)) : SHOTS;
const root = 'output/trailer/shots';
await mkdir(root, { recursive: true });

const port = await new Promise((resolve, reject) => {
  const s = createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const a = s.address(); s.close(() => resolve(a.port)); });
});
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
const receipts = [];
try {
  await sleep(2500);
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.__PODRACING__?.ready === true, undefined, { timeout: 180_000 });
  await page.evaluate(() => window.__PODRACING__.setCaptureMode(true));

  for (const shot of shots) {
    const dir = `${root}/${shot.id}`;
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const started = Date.now();

    // Stage the moment. seekCourse re-runs setPreset('race') itself, so the
    // input has to be applied after staging or it is cleared.
    await page.evaluate((s) => {
      const api = window.__PODRACING__;
      if (s.scenario) api.setScenario(s.scenario);
      else api.seekCourse(s.seek);
      api.setCamera(s.camera);
      if (s.input) api.setInput(s.input);
      const hud = document.querySelector('.pod-hud');
      if (hud instanceof HTMLElement) hud.style.opacity = s.hud ? '1' : '0';
      if (s.settle) api.step(s.settle);
    }, shot);

    const timed = new Map((shot.at ?? []).map((a) => [a.frame, a]));
    for (let f = 0; f < shot.frames; f += 1) {
      const action = timed.get(f);
      if (action) {
        await page.evaluate((a) => {
          const api = window.__PODRACING__;
          if (a.input) api.setInput(a.input);
          if (a.camera) api.setCamera(a.camera);
          if (a.wreck) {
            const s = api.snapshot();
            const rival = s.galactic?.racers.find((r) => r.id !== 'player');
            if (rival) api.debugWreckRacer(rival.id);
          }
        }, action);
      }
      await page.evaluate(() => { window.__PODRACING__.step(1); window.__PODRACING__.step(1); });
      await page.screenshot({ path: `${dir}/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 94 });
    }

    const snap = await page.evaluate(() => {
      const s = window.__PODRACING__.snapshot();
      const me = s.galactic?.racers.find((r) => r.id === 'player');
      return { speed: Math.round(me?.galactic?.speed ?? 0), quality: s.renderer.performance?.qualityLevel, triangles: s.renderer.triangles };
    });
    const receipt = { id: shot.id, frames: shot.frames, seconds: Number((shot.frames / 60).toFixed(2)), renderSeconds: Number(((Date.now() - started) / 1000).toFixed(1)), ...snap };
    receipts.push(receipt);
    console.log(JSON.stringify(receipt));
  }
  await writeFile(`${root}/receipt.json`, JSON.stringify({ width, height, fps: 60, shots: receipts, errors }, null, 2));
  console.log('errors', JSON.stringify(errors));
} finally {
  await browser?.close();
  server.kill();
}
