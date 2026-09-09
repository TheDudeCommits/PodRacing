import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

const output = process.env.INKSTORM_OUTPUT ?? 'output/playwright/round36-resource-cycles-v1';
await mkdir(dirname(output), { recursive: true });
// Refuse to replace a previous pass or failure, including its screenshots.
await mkdir(output);
const pods = ['teemto', 'sebulba', 'polwo', 'blockrunner'];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const port = await new Promise((resolve, reject) => {
  const socket = createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const allocatedPort = socket.address().port;
    socket.close(error => error ? reject(error) : resolve(allocatedPort));
  });
});
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['./node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser, page, spawnError, cleanupPromise;
let serverLog = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { serverLog = (serverLog + String(data)).slice(-32768); });
server.once('error', error => { spawnError = String(error); });
const receipt = {
  outcome: 'FAIL', port, errors: [], samples: [], cycles: [], pods,
  harnessSha256: createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),
  scope: 'Three identical diagnostic cycles: ordinary menu buttons select all four pods, the selected preview is rotated through the actual mesh inspection path, then seven course sections are visited with existing review staging. Staging selects chaos and cancels records; it is not native racing or FPS evidence. Exact cycle 2-to-3 renderer geometry/texture/program plateau is retained. Passive WebGL context observations and library lease counts supplement renderer.info; they do not measure GPU bytes, JS heap or prove all leaks absent.',
};
const exited = () => server.exitCode !== null || server.signalCode !== null || !!spawnError;
const waitForExit = ms => new Promise(resolve => {
  if (exited()) return resolve(true);
  const timer = setTimeout(() => { server.off('exit', done); resolve(false); }, ms);
  function done() { clearTimeout(timer); resolve(true); }
  server.once('exit', done);
  if (exited()) { server.off('exit', done); done(); }
});
const finish = () => cleanupPromise ??= (async () => {
  const cleanup = { browserLaunched: !!browser, browserClosed: !browser, serverExited: false, errors: [] };
  try { await browser?.close(); cleanup.browserClosed = true; } catch (error) { cleanup.errors.push(String(error)); }
  if (!exited()) server.kill('SIGTERM');
  cleanup.serverExited = await waitForExit(3000);
  if (!cleanup.serverExited) {
    cleanup.forcedKill = true;
    server.kill('SIGKILL');
    cleanup.serverExited = await waitForExit(3000);
  }
  cleanup.exitCode = server.exitCode;
  cleanup.signalCode = server.signalCode;
  if (spawnError) cleanup.spawnError = spawnError;
  receipt.cleanup = cleanup;
  if (!cleanup.browserClosed || !cleanup.serverExited || cleanup.errors.length || receipt.errors.length) {
    receipt.outcome = 'FAIL'; process.exitCode = 1;
  }
  receipt.serverLog = serverLog;
  receipt.completedAt = new Date().toISOString();
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ outcome: receipt.outcome, error: receipt.error, plateau: receipt.plateau, cycles: receipt.cycles, cleanup, errors: receipt.errors }));
})();
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) process.once(signal, () => {
  receipt.outcome = 'FAIL'; receipt.error = `Interrupted by ${signal}`;
  void finish().finally(() => process.exit(code));
});

// Observe context ownership without retaining canvases or contexts, forcing GC,
// modifying GL calls, or touching renderer/game state. Inspection's visible
// canvas is a 2D copy; the preview WebGL renderer itself is detached.
function installContextCensus() {
  const getContext = HTMLCanvasElement.prototype.getContext;
  const seen = new WeakSet();
  const rows = [];
  HTMLCanvasElement.prototype.getContext = function (...args) {
    const context = Reflect.apply(getContext, this, args);
    if (context && ['webgl', 'webgl2', 'experimental-webgl'].includes(args[0]) && !seen.has(context)) {
      seen.add(context);
      rows.push({ id: rows.length + 1, context: new WeakRef(context), canvas: new WeakRef(this) });
    }
    return context;
  };
  window.__INKSTORM_RESOURCE_CONTEXTS__ = () => rows.map(row => {
    const context = row.context.deref(), canvas = row.canvas.deref();
    return { id: row.id, collected: !context, lost: context ? context.isContextLost() : null,
      alpha: context?.getContextAttributes()?.alpha ?? null,
      connected: canvas?.isConnected ?? false, width: canvas?.width ?? null, height: canvas?.height ?? null };
  });
}
const observe = () => {
  const visible = element => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; };
  const previews = [...document.querySelectorAll('[data-vehicle-preview][data-vehicle-id]')].filter(visible).map(host => {
    const image = host.querySelector('[data-vehicle-preview-image]');
    const canvas = host.querySelector('[data-vehicle-inspection-canvas]');
    return { dataset: { ...host.dataset }, imageReady: !!image?.complete && image.naturalWidth > 0,
      inspectionVisible: !!canvas && visible(canvas), inspectionWidth: canvas?.width ?? 0, inspectionHeight: canvas?.height ?? 0 };
  });
  return { snapshot: window.__PODRACING__.snapshot(), previews, contexts: window.__INKSTORM_RESOURCE_CONTEXTS__() };
};
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
let identity = null;
const record = async (cycle, stage, ownership) => {
  await settle();
  const actual = await page.evaluate(observe);
  const snapshot = actual.snapshot;
  assert(snapshot.game.mastery?.eventId === 'cup-canyon', 'Repeated cycle changed the selected Cup event');
  if (identity) assert(snapshot.game.course.seed === identity.seed && snapshot.game.course.signature === identity.signature, 'Repeated cycle changed the built Cup course');
  assert(snapshot.renderer.sceneryShadow.failure === null, 'Scenery shadow failed during resource cycle');
  const live = actual.contexts.filter(context => !context.collected && !context.lost);
  const sample = { cycle, stage, memory: snapshot.renderer.memory, shadow: snapshot.renderer.sceneryShadow,
    raceTime: snapshot.raceTime, wreckPhase: snapshot.game.wreckPhase, awaitingStart: snapshot.game.awaitingStart, profile: snapshot.game.competitionProfile,
    identity: { event: snapshot.game.mastery.eventId, seed: snapshot.game.course.seed, signature: snapshot.game.course.signature },
    courseIdentityEstablished: !!identity, pendingCourse: snapshot.game.pendingCourse,
    presentation: snapshot.game.vehiclePresentation, previews: actual.previews, contexts: actual.contexts, liveContexts: live.length };
  // Retain a failed observation before asserting, so ownership failures are reviewable.
  receipt.samples.push(sample);
  if (ownership === 'inspection') {
    assert(live.length === 2 && live.filter(context => context.connected).length === 1,
      `Expected main renderer plus one live preview renderer at ${stage}; observed ${JSON.stringify(live)}`);
  } else if (ownership === 'race') {
    assert(live.length === 1 && live[0].connected, `Preview context remained live during ${stage}`);
    assert(actual.previews.length === 0, `Menu preview remained visible during ${stage}`);
  }
  return sample;
};
const waitForPod = async pod => {
  await page.waitForFunction(expected => {
    const snapshot = window.__PODRACING__.snapshot();
    const host = document.querySelector('[data-hud="garage-model"]');
    const visible = element => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; };
    const visibleHosts = [...document.querySelectorAll('[data-vehicle-preview][data-vehicle-id]')].filter(visible);
    const image = host?.querySelector('[data-vehicle-preview-image]');
    // GameApp constructs racerViews as [playerView, ...rivalViews].
    const hero = snapshot.game.vehiclePresentation.racers[0];
    return snapshot.game.awaitingStart && visibleHosts.length === 1 && visibleHosts[0] === host
      && snapshot.game.vehiclePresentation.selected === expected
      && hero?.lod === 'full' && hero.requested === expected && hero.status === 'ready'
      && hero.active === expected && hero.statistics.meshes > 0 && hero.statistics.triangles > 0
      && snapshot.game.vehiclePresentation.library.pending === 0
      && host?.dataset.previewReady === 'true' && host.dataset.previewAppearance === expected
      && host.dataset.previewState === 'ready' && !!image?.complete && image.naturalWidth > 0;
  }, pod, { timeout: 30000 });
  const actual = await page.evaluate(observe);
  assert(actual.previews.length === 1 && actual.previews[0].dataset.vehiclePreview === 'hero', 'Expected exactly one visible selected preview, excluding hidden legacy cards');
};
const selectPod = async pod => {
  for (let step = 0; step < pods.length; step++) {
    const selected = await page.evaluate(() => window.__PODRACING__.snapshot().game.vehiclePresentation.selected);
    if (selected === pod) { await waitForPod(pod); return; }
    await page.getByRole('button', { name: 'Next pod', exact: true }).click();
    await page.waitForFunction(previous => window.__PODRACING__.snapshot().game.vehiclePresentation.selected !== previous, selected);
  }
  throw new Error(`Could not select ${pod} using the four-pod carousel`);
};
const inspectPod = async pod => {
  await waitForPod(pod);
  const hero = page.locator('[data-hud="garage-model"]:visible');
  await hero.press('Home');
  await hero.press('ArrowRight');
  await page.waitForFunction(expected => {
    const host = document.querySelector('[data-hud="garage-model"]');
    const canvas = host?.querySelector('[data-vehicle-inspection-canvas]');
    return host?.dataset.previewAppearance === expected && host.dataset.previewMode === 'interactive'
      && host.dataset.previewAngle === '15' && host.dataset.renderedAngle === '15'
      && !!canvas && canvas.width > 0 && canvas.height > 0 && canvas.getBoundingClientRect().width > 0
      && getComputedStyle(canvas).display !== 'none';
  }, pod, { timeout: 6000 });
  await hero.press('Home');
  await page.waitForFunction(() => {
    const host = document.querySelector('[data-hud="garage-model"]');
    return host?.dataset.previewMode === 'interactive' && host.dataset.renderedAngle === '0';
  }, null, { timeout: 6000 });
};

try {
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (spawnError || exited()) throw new Error(`Owned preview exited during startup: ${spawnError ?? serverLog}`);
    try { if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch { /* Own preview is starting. */ }
    await delay(100);
  }
  assert(ready, 'Owned preview startup timed out');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  page.on('pageerror', error => receipt.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
  await page.addInitScript(installContextCensus);
  await page.goto(origin);
  await page.waitForFunction(() => window.__PODRACING__?.ready);
  receipt.environment = await frozenBuildReceipt(page, browser);
  await page.locator('.setup-types [data-action="select-event"][data-event-id="cup-canyon"]:visible').click();
  await page.waitForFunction(() => window.__PODRACING__.snapshot().game.mastery?.eventId === 'cup-canyon');
  receipt.initial = await page.evaluate(() => window.__PODRACING__.snapshot());
  await record(0, 'initial-garage');
  let sections;
  for (let cycle = 1; cycle <= 3; cycle++) {
    for (const pod of pods) {
      receipt.inProgress = { cycle, stage: `preview-${pod}` };
      await selectPod(pod);
      await inspectPod(pod);
      await record(cycle, `preview-${pod}`, 'inspection');
    }
    // Repeat an already cached appearance before leaving, then inspect it again
    // on the next return. Never resize/invalidate the cache to make this pass.
    await selectPod('teemto');
    await inspectPod('teemto');
    await record(cycle, 'preview-restored-teemto', 'inspection');
    receipt.inProgress = { cycle, stage: 'race-entry' };
    await page.locator('[data-hud="start-button"]:visible').click();
    await page.waitForFunction(() => !window.__PODRACING__.snapshot().game.awaitingStart);
    const started = await page.evaluate(() => window.__PODRACING__.snapshot());
    if (!identity) {
      // Event selection reserves a seed; the actual course is built at Start.
      identity = { event: started.game.mastery.eventId, seed: started.game.course.seed, signature: started.game.course.signature };
      sections = started.game.course.sections;
      assert(sections.length === 7, 'Expected seven authored section visits');
      receipt.identity = identity; receipt.sections = sections;
    }
    await record(cycle, 'race-entry', 'race');
    await page.evaluate(() => { window.__PODRACING__.setCaptureMode(true); window.__PODRACING__.setCamera('chase'); });
    for (const section of sections) {
      receipt.inProgress = { cycle, stage: section.id };
      await page.evaluate(progress => { window.__PODRACING__.seekCourse(progress); window.__PODRACING__.step(2); }, section.progress);
      await record(cycle, section.id, 'race');
      if (section.id.includes('launch') && (cycle === 1 || cycle === 3)) await page.screenshot({ path: `${output}/cycle-${cycle}-launch.png` });
    }
    await page.evaluate(() => { window.__PODRACING__.setPreset('finish'); window.__PODRACING__.setCaptureMode(false); });
    await page.locator('.pod-hud__results-actions [data-action="return-to-garage"]:visible').click();
    receipt.inProgress = { cycle, stage: 'garage' };
    await waitForPod('teemto');
    await page.waitForTimeout(400);
    await record(cycle, 'garage');
    const samples = receipt.samples.filter(sample => sample.cycle === cycle);
    receipt.cycles.push({ cycle,
      peak: Object.fromEntries(['geometries', 'textures', 'programs'].map(key => [key, Math.max(...samples.map(sample => sample.memory[key]))])),
      garage: samples.at(-1).memory });
    console.log(JSON.stringify(receipt.cycles.at(-1)));
  }
  await page.screenshot({ path: `${output}/final-garage.png` });
  const second = receipt.samples.filter(sample => sample.cycle === 2);
  const third = receipt.samples.filter(sample => sample.cycle === 3);
  assert(second.length === third.length && third.length > 0 && third.every((sample, index) => sample.stage === second[index].stage), 'Cycle 2 and 3 stage sequences differ');
  receipt.finalCycleDelta = third.map((sample, index) => ({ stage: sample.stage,
    geometries: sample.memory.geometries - second[index].memory.geometries,
    textures: sample.memory.textures - second[index].memory.textures,
    programs: sample.memory.programs - second[index].memory.programs }));
  receipt.plateau = receipt.finalCycleDelta.every(delta => delta.geometries === 0 && delta.textures === 0 && delta.programs === 0);
  assert(receipt.errors.length === 0, 'Unexpected browser errors');
  assert(receipt.plateau, 'Identical second and third cycles did not reach a resource-count plateau');
  receipt.outcome = 'PASS'; receipt.inProgress = null;
} catch (error) {
  receipt.error = String(error); process.exitCode = 1; console.error(error);
  if (page && !page.isClosed()) {
    try { receipt.failureObservation = await page.evaluate(observe); await page.screenshot({ path: `${output}/failure.png` }); }
    catch (captureError) { receipt.failureCaptureError = String(captureError); }
  }
} finally {
  await finish();
}
