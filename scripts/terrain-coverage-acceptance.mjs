// Frozen-build visual/functional regression only. Manual quality and capture
// poses are intentional here; these frames are never performance evidence.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

if (process.argv.includes('--check')) {
  console.log('Terrain coverage harness loaded; no browser or server started.');
  process.exit(0);
}
const output = process.env.INKSTORM_OUTPUT ?? 'output/playwright/terrain-coverage';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const assert = (value, message) => { if (!value) throw new Error(message); };
const receipt = { outcome: 'FAIL', startedAt: new Date().toISOString(),
  scope: 'Actual highest/lowest-profile launch ground rendering, not FPS acceptance.',
  harnessCorrection: 'Initial round23 failure retained: Viewport intentionally fixes DPR 2 while capture mode is enabled. This harness positions the view, exits capture mode, then applies the fixed quality and checks the actual DPR. No runtime change.',
  scriptSha256: hash(await readFile('scripts/terrain-coverage-acceptance.mjs')), errors: [], captures: [] };
await mkdir(output, { recursive: true });
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) { const bytes = await readFile(path); result.push({ path, bytes: bytes.length, sha256: hash(bytes) }); }
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}
async function manifest() {
  return { source: await files('src'), publicArt: await files('public/assets/inkstorm'), dist: await files('dist') };
}
const before = await manifest();
await writeFile(`${output}/artifacts-before.json`, JSON.stringify(before, null, 2));
const port = await new Promise((resolve, reject) => {
  const socket = createServer(); socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => { const address = socket.address(); socket.close(() => resolve(address.port)); });
});
receipt.port = port;
const origin = `http://127.0.0.1:${port}`;
const server = spawn('npm', ['run', 'preview', '--', '--port', String(port), '--strictPort'], {
  stdio: 'ignore', detached: process.platform !== 'win32',
});
let browser;
try {
  let served = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    try { if ((await fetch(origin)).ok) { served = true; break; } } catch { /* Starting preview. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(served, 'Preview did not become reachable');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('pageerror', error => receipt.errors.push({ type: 'pageerror', message: error.message }));
  page.on('console', message => { if (message.type() === 'error') receipt.errors.push({ type: 'console', message: message.text() }); });
  await page.goto(origin);
  await page.waitForFunction(() => {
    const api = window.__PODRACING__, hero = api?.snapshot().game.vehiclePresentation?.racers[0];
    return api?.ready && hero?.active === 'teemto' && hero.status === 'ready';
  }, undefined, { timeout: 60000 });
  receipt.environment = await frozenBuildReceipt(page, browser);
  await page.evaluate(() => { window.__PODRACING__.setCaptureMode(true); window.__PODRACING__.setCamera('chase'); });
  for (const view of [{ id: 'launch-approach', progress: .153 }, { id: 'launch-crest', progress: .169 }, { id: 'launch-descent', progress: .218 }]) {
    for (const quality of [0, 8]) {
      await page.evaluate(({ progress, quality }) => {
        window.__PODRACING__.setCaptureMode(true);
        window.__PODRACING__.seekCourse(progress);
        window.__PODRACING__.setCaptureMode(false);
        window.__PODRACING__.setPerformanceQuality(quality);
      }, { progress: view.progress, quality });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const snapshot = await page.evaluate(() => window.__PODRACING__.snapshot());
      receipt.lastAttempt = { view, quality, snapshot };
      const performance = snapshot.renderer.performance;
      assert(performance.qualityLevel === quality && performance.adaptive === false, `Wrong fixed quality at ${view.id}`);
      assert(performance.terrainRequestedLevels === (quality === 8 ? 4 : 6), `Wrong terrain request at ${view.id}`);
      assert(performance.terrainEffectiveLevels === 6 && performance.terrainCoverageRadius === 3072, `Ground domain shrank at ${view.id}`);
      assert(snapshot.renderer.pixelRatio === (quality === 8 ? 1 : 2), `Wrong actual DPR at ${view.id}`);
      assert(snapshot.game.vehiclePresentation.racers[0].active === 'teemto', `Transient fallback at ${view.id}`);
      assert(snapshot.renderer.racerShadow.failure === null, `Racer shadow failed at ${view.id}`);
      const filename = `${view.id}-quality-${quality}.png`;
      await page.screenshot({ path: `${output}/${filename}` });
      receipt.captures.push({ view, quality, filename, snapshot });
    }
  }
  assert(receipt.errors.length === 0, `Browser errors: ${JSON.stringify(receipt.errors)}`);
  receipt.outcome = 'PASS';
} catch (error) {
  receipt.failure = error.stack ?? String(error); process.exitCode = 1;
} finally {
  try { await browser?.close(); receipt.browserClosed = true; } catch (error) { receipt.outcome = 'FAIL'; receipt.closeError = String(error); process.exitCode = 1; }
  try { if (process.platform !== 'win32' && server.pid) process.kill(-server.pid, 'SIGTERM'); else server.kill('SIGTERM'); } catch { /* Already exited. */ }
  const after = await manifest();
  receipt.artifactsUnchanged = JSON.stringify(before) === JSON.stringify(after);
  if (!receipt.artifactsUnchanged) { receipt.outcome = 'FAIL'; process.exitCode = 1; }
  await writeFile(`${output}/artifacts-after.json`, JSON.stringify(after, null, 2));
  receipt.completedAt = new Date().toISOString();
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ outcome: receipt.outcome, output, port, captures: receipt.captures.length,
    errors: receipt.errors, failure: receipt.failure, artifactsUnchanged: receipt.artifactsUnchanged, browserClosed: receipt.browserClosed }, null, 2));
}
