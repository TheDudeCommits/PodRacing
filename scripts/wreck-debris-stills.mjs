/**
 * Deterministic stills of wreck debris and the respawn shadow through the
 * review API. The player is parked mid-course, wrecked with the diagnostic
 * hook, and framed by the hero orbit so the shed parts and the drop-in shadow
 * are both in view through the wreck and the respawn. Run:
 *   node scripts/wreck-debris-stills.mjs [output-dir]
 * Serves the existing dist/ with vite preview and closes everything after.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

const output = process.argv[2] ?? 'output/playwright/wreck-debris';
await mkdir(output, { recursive: true });
const port = await new Promise((resolve, reject) => {
  const server = createServer(); server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const address = server.address(); server.close(() => resolve(address.port)); });
});
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.__PODRACING__?.ready === true, undefined, { timeout: 120_000 });
  await page.evaluate(() => {
    const api = window.__PODRACING__;
    api.setCaptureMode(true);
    api.setPreset('race');
    // Well short of the line so nobody finishes the one-lap review race during the capture.
    api.seekCourse(0.88);
    api.setCamera('chase');
    api.setInput({ throttle: 0, brake: 1 });
    api.step(420);
  });
  await page.screenshot({ path: `${output}/01-before-wreck.png` });
  // The review placement makes each racer's respawn its placed spot, so the
  // player's own drop-in shadow sits where it was parked; the hero orbit shows
  // the wreck, the shed parts ahead of it and the shadow together.
  const target = await page.evaluate(() => {
    const api = window.__PODRACING__;
    const wrecked = api.debugWreckPlayer();
    api.setCamera('hero');
    return wrecked ? { id: 'player' } : null;
  });
  console.log('target', JSON.stringify(target));
  const receipt = { target, frames: [], errors };
  const state = () => page.evaluate(() => {
    const snapshot = window.__PODRACING__.snapshot();
    const racer = snapshot.galactic.racers.find((entry) => entry.id === 'player');
    return { phase: racer?.galactic.wreck.phase ?? null, timer: racer?.galactic.wreck.timer ?? null, debris: snapshot.galactic?.debris ?? null, hud: snapshot.game?.phase ?? null };
  });
  for (const [name, frames] of [['02-wreck-debris', 18], ['03-mid-wreck-shadow', 120], ['04-drop-in', 130], ['05-after-respawn', 90]]) {
    await page.evaluate((count) => window.__PODRACING__.step(count), frames);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/${name}.png` });
    const info = await state();
    receipt.frames.push({ name, ...info });
    console.log(name, JSON.stringify(info));
  }
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log('errors', JSON.stringify(errors));
} finally {
  await browser?.close();
  server.kill();
}
