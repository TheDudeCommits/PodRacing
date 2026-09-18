/**
 * Native drift evidence: a real Battle race on the built bundle, driven by the
 * keyboard through ordinary RAF frames, so the ground wake and sand fans build
 * up exactly as a player sees them. Holds throttle, then throttle + drift +
 * steer, and frames the slide and its unwind. Run:
 *   node scripts/drift-native-frames.mjs [output-dir]
 * Serves the existing dist/ with vite preview and closes everything after.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

const output = process.argv[2] ?? 'output/playwright/drift-native';
await mkdir(output, { recursive: true });
const port = await new Promise((resolve, reject) => {
  const server = createServer(); server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const address = server.address(); server.close(() => resolve(address.port)); });
});
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  await sleep(2500);
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.__PODRACING__?.ready === true, undefined, { timeout: 120_000 });
  await page.locator('[data-action="start-race"]:visible').click();
  await page.waitForFunction(() => window.__PODRACING__.snapshot().raceTime > 0.2, undefined, { timeout: 60_000 });
  const read = () => page.evaluate(() => {
    const hud = document.querySelector('.pod-hud');
    const weapon = window.__PODRACING__.snapshot().galactic?.racers.find((racer) => racer.id === 'player')?.galactic.weapon;
    return {
      isDrifting: hud?.classList.contains('is-drifting') ?? null,
      driftSlide: hud instanceof HTMLElement ? hud.style.getPropertyValue('--pod-drift-slide') : null,
      driftText: document.querySelector('[data-hud="drift-value"]')?.textContent ?? null,
      weaponText: document.querySelector('[data-hud="weapon-value"]')?.textContent ?? null,
      weapon: weapon ? { charges: weapon.charges, reload: Number(weapon.reload.toFixed(2)) } : null,
    };
  });
  const receipt = { frames: [], errors };
  const frame = async (name) => {
    await page.screenshot({ path: `${output}/${name}.png` });
    const info = await read();
    receipt.frames.push({ name, ...info });
    console.log(name, JSON.stringify(info));
  };
  await page.keyboard.down('KeyW');
  await sleep(3200);
  await frame('01-straight');
  // Empty the magazine with five taps and frame the reload on the HUD.
  for (let shot = 0; shot < 5; shot += 1) {
    // A real trigger pull, not an instant press: the input sampler needs the key
    // held across at least one frame to see the edge.
    await page.keyboard.down('KeyE');
    await sleep(140);
    await page.keyboard.up('KeyE');
    await sleep(680);
  }
  await sleep(200);
  await frame('02-lance-reloading');
  // Hold the drift button with steering: the slide ramps in over the entry blend.
  await page.keyboard.down('Space');
  await page.keyboard.down('KeyA');
  await sleep(320);
  await frame('03-drift-entry');
  await sleep(900);
  await frame('04-drift-held');
  // Straighten while still holding: the charge banks and the slide unwinds.
  await page.keyboard.up('KeyA');
  await page.keyboard.up('Space');
  await sleep(220);
  await frame('05-drift-exit');
  await sleep(1400);
  await frame('06-after-drift');
  await page.keyboard.up('KeyW');
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log('errors', JSON.stringify(errors));
} finally {
  await browser?.close();
  server.kill();
}
