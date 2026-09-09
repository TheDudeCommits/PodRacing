/** Initial-course GPU timing diagnostic. Builds nothing and serves immutable
 * existing dist bytes. The browser and in-process preview server are owned and
 * closed in finally; the ordinary game receives only Start and keyboard W. */
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';
import { installGpuFrameProbe, summarizeGpuFrameProbe } from './lib/gpu-frame-probe.mjs';

const out = process.env.INKSTORM_OUTPUT ?? 'output/gauntlet/gpu-frame-probe-round27';
const port = Number(process.env.INKSTORM_PORT ?? 5199);
const appearance = process.env.INKSTORM_APPEARANCE ?? 'teemto';
if (!['teemto', 'sebulba'].includes(appearance)) throw new Error('Probe appearance must be teemto or sebulba.');
if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 5211) throw new Error('Invalid owned probe port.');
await mkdir(join(out, '..'), { recursive: true });
await mkdir(out); // Refuse to overwrite the first failed or successful evidence.
const hash = (data) => createHash('sha256').update(data).digest('hex');
async function manifest(directory) {
  const files = [];
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) { const bytes = await readFile(child); files.push({ path: relative(directory, child), bytes: bytes.length, sha256: hash(bytes) }); }
    }
  }
  await visit(directory); files.sort((a, b) => a.path.localeCompare(b.path)); return files;
}
const distBefore = await manifest('dist');
const harnessFiles = ['scripts/inkstorm-gpu-frame-probe.mjs', 'scripts/lib/gpu-frame-probe.mjs', 'scripts/lib/frozen-build-receipt.mjs'];
const harnessBefore = await Promise.all(harnessFiles.map(async (path) => ({ path, sha256: hash(await readFile(path)) })));
const record = { startedAt: new Date().toISOString(), appearance, port,
  scope: 'A sampled GPU command interval diagnostic during ordinary Start plus 20 seconds of real held W input. Initial course and countdown only; not a complete race, full-circuit performance gate or physical presentation measurement.',
  input: { start: 'visible Start button click', keyboard: 'w', requestedHoldMs: 20000,
    captureModeCalls: 0, seekCalls: 0, simulationWrites: 0, qualityOverrides: 0 },
  distBefore, harnessBefore, errors: [], requestFailures: [], cleanup: {} };
let server, browser, page, probeStopped = false;
try {
  server = await preview({ configFile: false, root: process.cwd(), logLevel: 'error',
    build: { outDir: 'dist' }, preview: { host: '127.0.0.1', port, strictPort: true } });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await context.addInitScript(installGpuFrameProbe, {
    selector: '#game > canvas#viewport[aria-label="Podracing viewport"]',
    sampleEveryMs: 250, queryTimeoutMs: 5000, maxQueries: 256, maxFrames: 10000,
  });
  page = await context.newPage();
  page.on('pageerror', (error) => record.errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') record.errors.push(message.text()); });
  page.on('requestfailed', (request) => record.requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.__PODRACING__?.ready, undefined, { timeout: 45_000 });
  if (appearance === 'sebulba') await page.locator('[data-action="select-appearance"][data-appearance="sebulba"]').click();
  await page.waitForFunction((wanted) => {
    const hero = window.__PODRACING__?.snapshot().game.vehiclePresentation?.racers[0];
    const preview = document.querySelector('[data-hud="garage-model"]');
    return hero?.requested === wanted && hero.active === wanted && hero.status === 'ready'
      && preview?.dataset.previewReady === 'true' && preview.dataset.previewAppearance === wanted;
  }, appearance, { timeout: 45_000 });
  record.buildBefore = await frozenBuildReceipt(page, browser);
  const canvas = page.locator('#game > canvas#viewport[aria-label="Podracing viewport"]');
  if (await canvas.count() !== 1) throw new Error('The main game canvas is not uniquely identified.');
  record.before = await page.evaluate(() => window.__PODRACING__.snapshot());
  record.probeStartStatus = await page.evaluate(() => window.__INKSTORM_GPU_FRAME_PROBE__.start());
  await page.locator('[data-action="start-race"]').click();
  await page.keyboard.down('w');
  record.input.downAt = new Date().toISOString();
  await new Promise((resolve) => setTimeout(resolve, 20000));
  await page.keyboard.up('w');
  record.input.upAt = new Date().toISOString();
  record.probe = await page.evaluate(() => window.__INKSTORM_GPU_FRAME_PROBE__.stop());
  probeStopped = true;
  record.summary = summarizeGpuFrameProbe(record.probe);
  record.after = await page.evaluate(() => window.__PODRACING__.snapshot());
  if (record.after.game.awaitingStart || record.after.raceTime <= record.before.raceTime
    || record.after.simulationFrame <= record.before.simulationFrame) throw new Error('The ordinary race did not advance after Start and held W.');
  record.buildAfter = await frozenBuildReceipt(page, browser);
  if (JSON.stringify(record.buildBefore.scripts) !== JSON.stringify(record.buildAfter.scripts)) throw new Error('Actually served bundle bytes changed during the probe.');
  record.distAfter = await manifest('dist');
  record.harnessAfter = await Promise.all(harnessFiles.map(async (path) => ({ path, sha256: hash(await readFile(path)) })));
  record.distUnchanged = JSON.stringify(record.distBefore) === JSON.stringify(record.distAfter);
  record.harnessUnchanged = JSON.stringify(record.harnessBefore) === JSON.stringify(record.harnessAfter);
  if (!record.distUnchanged || !record.harnessUnchanged) throw new Error('Frozen build or probe harness changed while collecting evidence.');
  // Only after timing has stopped and instrumentation has been restored.
  await page.screenshot({ path: `${out}/after-ordinary-drive.png` });
  record.networkResources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => ({
    name: entry.name, initiatorType: entry.initiatorType, durationMs: entry.duration,
    transferSize: entry.transferSize, decodedBodySize: entry.decodedBodySize,
  })));
  if (record.summary.outcome === 'INCOMPLETE' || record.errors.length || record.requestFailures.length) process.exitCode = 1;
} catch (error) {
  record.failure = error instanceof Error ? error.stack ?? error.message : String(error);
  process.exitCode = 1;
} finally {
  if (page && !page.isClosed() && !probeStopped) {
    try { await page.keyboard.up('w'); record.probe = await page.evaluate(() => window.__INKSTORM_GPU_FRAME_PROBE__?.stop());
      if (record.probe) record.summary = summarizeGpuFrameProbe(record.probe); }
    catch (error) { record.cleanup.probeError = String(error); }
  }
  if (browser) {
    try { await browser.close(); record.cleanup.browserClosed = true; }
    catch (error) { record.cleanup.browserError = String(error); process.exitCode = 1; }
  }
  if (server) {
    try { await server.close(); record.cleanup.serverClosed = true; record.cleanup.serverListening = server.httpServer.listening; }
    catch (error) { record.cleanup.serverError = String(error); process.exitCode = 1; }
  }
  record.finishedAt = new Date().toISOString();
  await writeFile(`${out}/report.json`, JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ out, summary: record.summary, build: record.buildBefore?.scripts,
    failure: record.failure, errors: record.errors, cleanup: record.cleanup }, null, 2));
}
