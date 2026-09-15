/**
 * Deterministic combat-effect stills through the review API: shield, redline,
 * recovery and wreck scenarios from the chase camera, plus a side view of the
 * pack. Run: node scripts/effect-stills.mjs [output-dir]. Builds nothing; it
 * serves the existing dist/ with vite preview and closes everything after.
 */
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

const output = process.argv[2] ?? 'output/playwright/effect-stills';
await mkdir(output, { recursive: true });
const port = await new Promise((resolve, reject) => {
  const server = createServer(); server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const address = server.address(); server.close(() => resolve(address.port)); });
});
const url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(url);
  await page.waitForFunction(() => window.__PODRACING__?.ready === true, undefined, { timeout: 120_000 });
  await page.evaluate(() => { window.__PODRACING__.setCaptureMode(true); });
  const shots = [
    ['race-chase', 'race', 'chase', 240],
    ['race-side', 'race', 'side', 240],
    ['shield-active', 'shield-active', 'chase', 8],
    ['redline', 'redline', 'chase', 8],
    ['recovery', 'recovery', 'chase', 20],
    ['wreck', 'wreck', 'chase', 12],
    ['combat-stress', 'combat-stress', 'chase', 12],
  ];
  for (const [name, scenario, camera, frames] of shots) {
    await page.evaluate(({ scenario, camera, frames }) => {
      const api = window.__PODRACING__;
      api.clearEvents();
      if (['race', 'drift', 'airtime', 'desert', 'countdown', 'finish'].includes(scenario)) api.setPreset(scenario);
      else api.setScenario(scenario);
      api.setCamera(camera);
      api.step(frames);
    }, { scenario, camera, frames });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${output}/${name}.png` });
    console.log('captured', name);
  }
  console.log('errors', JSON.stringify(errors));
} finally {
  await browser?.close();
  server.kill();
}
