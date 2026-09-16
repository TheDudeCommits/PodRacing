/**
 * Camera-recovery evidence: a real Battle race on the built bundle, the player
 * driven by the keyboard, wrecked through the diagnostic hook, then framed
 * every 0.3 s through wreck, respawn and recovery. Writes PNGs plus a JSON
 * receipt of the wreck phase at each frame. Run:
 *   node scripts/recovery-camera-frames.mjs [output-dir]
 * Serves the existing dist/ with vite preview and closes everything after.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

const output = process.argv[2] ?? 'output/playwright/recovery-camera';
await mkdir(output, { recursive: true });
const port = await new Promise((resolve, reject) => {
  const server = createServer(); server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const address = server.address(); server.close(() => resolve(address.port)); });
});
const url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  await sleep(2500);
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(url);
  await page.waitForFunction(() => window.__PODRACING__?.ready === true, undefined, { timeout: 120_000 });
  await page.locator('[data-action="start-race"]:visible').click();
  const player = () => page.evaluate(() => {
    const state = window.__PODRACING__.snapshot();
    const racer = state.galactic?.racers.find((entry) => entry.id === 'player');
    return { raceTime: state.raceTime, phase: racer?.galactic.wreck.phase ?? null, invulnerable: racer?.galactic.wreck.invulnerable ?? null, position: racer?.position ?? null };
  });
  await page.waitForFunction(() => window.__PODRACING__.snapshot().raceTime > 0.2, undefined, { timeout: 60_000 });
  await page.keyboard.down('KeyW');
  await sleep(7000);
  const before = await player();
  const wrecked = await page.evaluate(() => window.__PODRACING__.debugWreckPlayer?.() ?? false);
  const receipt = { wrecked, before, frames: [], errors };
  const started = Date.now();
  for (let index = 0; index < 28; index += 1) {
    const state = await player();
    await page.screenshot({ path: `${output}/frame-${String(index).padStart(2, '0')}.png` });
    receipt.frames.push({ index, elapsedMs: Date.now() - started, ...state });
    console.log('frame', index, state.phase, state.raceTime.toFixed(2));
    await sleep(300);
  }
  await page.keyboard.up('KeyW');
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log('errors', JSON.stringify(errors));
} finally {
  await browser?.close();
  server.kill();
}
