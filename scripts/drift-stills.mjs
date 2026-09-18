/**
 * Deterministic stills of the drift read-out and the Heat Lance magazine
 * through the review API: the pod entering, holding and leaving a slide, plus
 * the HUD while the lance reloads. Run: node scripts/drift-stills.mjs [dir].
 * Serves the existing dist/ with vite preview and closes everything after.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

const output = process.argv[2] ?? 'output/playwright/drift';
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
  const drift = () => page.evaluate(() => {
    const state = window.__PODRACING__.snapshot();
    const weapon = state.galactic?.racers.find((racer) => racer.id === 'player')?.galactic.weapon;
    const hud = document.querySelector('.pod-hud');
    return {
      weapon: weapon ? { charges: weapon.charges, reload: Number(weapon.reload.toFixed(2)) } : null,
      weaponText: document.querySelector('[data-hud="weapon-value"]')?.textContent ?? null,
      driftText: document.querySelector('[data-hud="drift-value"]')?.textContent ?? null,
      isDrifting: hud?.classList.contains('is-drifting') ?? null,
      driftSlide: hud instanceof HTMLElement ? hud.style.getPropertyValue('--pod-drift-slide') : null,
      weaponEmpty: document.querySelector('.pod-hud__galactic')?.classList.contains('is-weapon-empty') ?? null,
    };
  });
  const receipt = { frames: [], errors };
  const shot = async (name, frames, input) => {
    await page.evaluate(({ frames, input }) => {
      const api = window.__PODRACING__;
      api.clearInput();
      if (input) api.setInput(input);
      api.step(frames);
    }, { frames, input });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${output}/${name}.png` });
    const info = await drift();
    receipt.frames.push({ name, ...info });
    console.log(name, JSON.stringify(info));
  };
  await page.evaluate(() => {
    const api = window.__PODRACING__;
    api.setCaptureMode(true);
    api.setPreset('race');
    api.seekCourse(0.06);
    api.setCamera('chase');
    api.setInput({ throttle: 1 });
    api.step(180);
  });
  await page.screenshot({ path: `${output}/01-straight.png` });
  receipt.frames.push({ name: '01-straight', ...(await drift()) });
  // Enter a slide, hold it, then straighten and let it unwind.
  await shot('02-drift-entry', 16, { throttle: 1, drift: true, steer: 0.75 });
  await shot('03-drift-held', 46, { throttle: 1, drift: true, steer: 0.75 });
  await shot('04-drift-exit', 18, { throttle: 1 });
  // Empty the magazine: five taps, then the reload runs on the HUD.
  for (let shotIndex = 0; shotIndex < 6; shotIndex += 1) {
    await page.evaluate(() => {
      const api = window.__PODRACING__;
      api.setInput({ throttle: 0.8, fire: true });
      api.step(2);
      api.setInput({ throttle: 0.8, fire: false });
      api.step(86);
    });
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${output}/05-lance-reloading.png` });
  receipt.frames.push({ name: '05-lance-reloading', ...(await drift()) });
  console.log('reloading', JSON.stringify(receipt.frames.at(-1)));
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log('errors', JSON.stringify(errors));
} finally {
  await browser?.close();
  server.kill();
}
