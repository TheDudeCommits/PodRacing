// Ordinary garage actions and live keyboard driving against an existing frozen build.
// No capture-mode pose writes, simulation stepping, art state hooks or record writes.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

if (process.argv.includes('--check')) {
  console.log('Vehicle appearance harness loaded; no browser or server started.');
  process.exit(0);
}
const output = process.env.INKSTORM_OUTPUT ?? 'output/playwright/vehicle-appearance';
const includeSebulba = process.argv.includes('--sebulba');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const receipt = { outcome: 'FAIL', startedAt: new Date().toISOString(),
  appearances: includeSebulba ? ['teemto', 'sebulba', 'procedural'] : ['teemto', 'procedural'],
  scriptSha256: sha256(await readFile('scripts/vehicle-appearance-acceptance.mjs')),
  errors: [], requests: [], stages: {}, scope: 'Functional appearance selection, real model loading, ordinary drive, context restore and HTTP failure/retry. No FPS acceptance.' };
receipt.harnessSynchronization = {
  priorFailure: 'output/playwright/vehicle-appearance-round22/receipt.json',
  change: 'Wait for the rendered appearance controls to become hidden after the authoritative class changes; HUD updates on the next scheduled render.',
};
await mkdir(output, { recursive: true });
const port = await new Promise((resolve, reject) => {
  const socket = createServer(); socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const address = socket.address();
    socket.close(() => resolve(address.port));
  });
});
const origin = `http://127.0.0.1:${port}`;
receipt.port = port;
const server = spawn('npm', ['run', 'preview', '--', '--port', String(port), '--strictPort'], {
  stdio: 'ignore', detached: process.platform !== 'win32',
});
let browser;
let stage = 'initial';
const assert = (value, message) => { if (!value) throw new Error(message); };
const snapshot = (page) => page.evaluate(() => window.__PODRACING__.snapshot());
const artState = (page) => page.evaluate(() => window.__PODRACING__.snapshot().game.vehiclePresentation);
const persistentRecords = (page) => page.evaluate(() => localStorage.getItem('podracing.inkstorm.mastery.v1'));
const recordStage = async (page, name) => {
  receipt.stages[name] = await snapshot(page);
  await page.screenshot({ path: `${output}/${name}.png` });
};
const observe = (page) => {
  page.on('pageerror', (error) => receipt.errors.push({ stage, type: 'pageerror', message: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') receipt.errors.push({ stage, type: 'console', message: message.text() });
  });
  page.on('request', (request) => {
    if (request.url().includes('/assets/inkstorm/vehicles/')) receipt.requests.push({ stage, url: request.url() });
  });
};
const ready = async (page) => {
  await page.waitForFunction(() => window.__PODRACING__?.ready, undefined, { timeout: 60000 });
};
const waitHero = async (page, active) => {
  await page.waitForFunction((wanted) => {
    const state = window.__PODRACING__?.snapshot().game.vehiclePresentation?.racers[0];
    return state?.active === wanted && state.status === (wanted === 'procedural' ? 'procedural' : 'ready');
  }, active, { timeout: 30000 });
};
const waitReadyStatus = async (page, label) => {
  await page.waitForFunction(wanted => document.querySelector('[data-hud="appearance-status"]')?.textContent === `${wanted} · seated pilot · twin engines`, label, { timeout: 5000 });
  assert(await page.locator('[data-action="retry-appearance"]').isHidden(), 'Retry remains visible after actual preview and race readiness');
};

async function checkSebulba() {
  const modelContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const modelPage = await modelContext.newPage(); observe(modelPage);
  let releaseDelayed = () => {};
  try {
    stage = 'sebulba-initial';
    await modelPage.goto(origin); await ready(modelPage); await waitHero(modelPage, 'teemto');
    await modelPage.locator('[data-hud="garage-model"][data-preview-appearance="teemto"]').waitFor();
    assert(!receipt.requests.some(request => request.url.includes('/sebulba-')), 'Sebulba loaded before its first selection');
    const recordsBefore = await persistentRecords(modelPage);
    let delayedRequests = 0;
    const delayed = new Promise(resolve => { releaseDelayed = resolve; });
    const holdAsset = async route => { delayedRequests += 1; await delayed; await route.continue(); };
    await modelPage.route('**/assets/inkstorm/vehicles/sebulba-hero.glb', holdAsset);
    stage = 'sebulba-delayed-selection';
    await modelPage.locator('[data-action="select-appearance"][data-appearance="sebulba"]').click();
    await modelPage.waitForFunction(() => {
      const hero = window.__PODRACING__.snapshot().game.vehiclePresentation.racers[0];
      return hero.requested === 'sebulba' && hero.status === 'loading' && hero.active === 'teemto';
    });
    await modelPage.locator('[data-action="select-appearance"][data-appearance="teemto"]').click();
    await waitHero(modelPage, 'teemto');
    await modelPage.locator('[data-hud="garage-model"][data-preview-appearance="teemto"]').waitFor();
    assert(delayedRequests === 1, `Expected one deduplicated delayed hero request, got ${delayedRequests}`);
    releaseDelayed();
    await modelPage.waitForFunction(() => window.__PODRACING__.snapshot().game.vehiclePresentation.library.pending === 0);
    await modelPage.unroute('**/assets/inkstorm/vehicles/sebulba-hero.glb', holdAsset);
    const cancelled = await artState(modelPage);
    assert(cancelled.selected === 'teemto' && cancelled.racers[0].active === 'teemto'
      && cancelled.racers[0].registeredPrepasses === 9, 'A late Sebulba completion replaced the newer Teemto choice');
    await recordStage(modelPage, 'sebulba-late-load-cancelled');
    receipt.sebulbaLateLoad = { delayedRequests, newerChoice: 'teemto', settledActive: cancelled.racers[0].active };

    stage = 'sebulba-selected';
    // Delay only the browser's data-URL image decode. The real race GLB can
    // finish first, while the garage simulation remains paused at frame zero.
    await modelPage.evaluate(() => {
      const original = HTMLImageElement.prototype.decode;
      let released = false;
      const pending = [];
      window.__pausedPreviewDecode = {
        get held() { return pending.length; },
        release() {
          released = true;
          HTMLImageElement.prototype.decode = original;
          for (const resolve of pending.splice(0)) resolve();
        },
      };
      HTMLImageElement.prototype.decode = function () {
        const result = original.call(this);
        return this.src.startsWith('data:image/') ? result.then(() => released ? undefined : new Promise(resolve => pending.push(resolve))) : result;
      };
    });
    await modelPage.locator('[data-action="select-appearance"][data-appearance="sebulba"]').click();
    await waitHero(modelPage, 'sebulba');
    await modelPage.waitForFunction(() => window.__pausedPreviewDecode.held > 0);
    const heldPreview = await snapshot(modelPage);
    const heldStatus = await modelPage.locator('[data-hud="appearance-status"]').innerText();
    assert(heldPreview.game.awaitingStart && heldStatus === 'Preparing Sebulba preview… Your race craft is ready.', `Delayed preview readiness is inaccurate: ${heldStatus}`);
    await modelPage.evaluate(() => window.__pausedPreviewDecode.release());
    await modelPage.locator('[data-hud="garage-model"][data-preview-appearance="sebulba"]').waitFor();
    await waitReadyStatus(modelPage, 'Sebulba');
    const readyPreview = await snapshot(modelPage);
    assert(readyPreview.game.awaitingStart && readyPreview.simulationFrame === heldPreview.simulationFrame, 'Preview readiness required a simulation tick');
    receipt.pausedPreviewReadiness = { delayedStatus: heldStatus, readyStatus: await modelPage.locator('[data-hud="appearance-status"]').innerText(),
      heldSimulationFrame: heldPreview.simulationFrame, readySimulationFrame: readyPreview.simulationFrame,
      method: 'Temporarily delay native data-URL image decode, then restore it. No race/art-state writes or extra HUD update.' };
    const selected = (await artState(modelPage)).racers[0];
    assert(selected.statistics.triangles === 54522 && selected.statistics.bodyDraws === 2
      && selected.statistics.pilotDraws === 4 && selected.registeredPrepasses === 6 && selected.embeddedPilot,
    `Sebulba did not install actual six-mesh geometry: ${JSON.stringify(selected)}`);
    assert((await modelPage.locator('[data-hud="garage-name"]').innerText()).toLowerCase() === 'sebulba', 'Garage name does not match selected art');
    await recordStage(modelPage, 'garage-sebulba');
    for (const angle of [90, 180]) {
      for (let click = 0; click < 3; click++) await modelPage.locator('[data-action="inspect-vehicle"][data-direction="1"]').click();
      await modelPage.waitForFunction(wanted => document.querySelector('[data-hud="garage-model"]')?.dataset.previewAngle === String(wanted), angle);
      await waitReadyStatus(modelPage, 'Sebulba');
      await recordStage(modelPage, `garage-sebulba-angle-${angle}`);
    }
    await modelPage.reload(); await ready(modelPage); await waitHero(modelPage, 'sebulba');
    await modelPage.locator('[data-hud="garage-model"][data-preview-appearance="sebulba"]').waitFor();
    await waitReadyStatus(modelPage, 'Sebulba');
    assert((await artState(modelPage)).selected === 'sebulba', 'Reload lost explicit Sebulba preference');
    receipt.sebulbaPersistence = await modelPage.evaluate(() => localStorage.getItem('now-this-is-podracing.vehicle-appearance'));
    await modelPage.locator('.pod-hud__vehicle-card[data-vehicle-id="landspeeder"]').click();
    await modelPage.waitForFunction(() => {
      const state = window.__PODRACING__.snapshot().game.vehiclePresentation;
      return state.selected === 'sebulba' && state.racers[0].vehicleClass === 'landspeeder' && state.racers[0].active === 'procedural';
    });
    await modelPage.locator('.pod-hud__vehicle-card[data-vehicle-id="podracer"]').click();
    await waitHero(modelPage, 'sebulba');
    assert(await persistentRecords(modelPage) === recordsBefore, 'Sebulba selection or class browsing changed mastery');
    stage = 'sebulba-drive';
    await modelPage.locator('[data-action="start-race"]').click();
    await modelPage.keyboard.down('w');
    try { await modelPage.waitForFunction(() => window.__PODRACING__.snapshot().raceTime > 5, undefined, { timeout: 30000 }); }
    finally { await modelPage.keyboard.up('w'); }
    await recordStage(modelPage, 'live-sebulba');
    const live = receipt.stages['live-sebulba'];
    assert(live.game.vehiclePresentation.racers[0].active === 'sebulba', 'Sebulba race fell back after selection');
    assert(live.renderer.racerShadow.drawCalls === 2 && live.renderer.racerShadow.drawnTriangles === 47362
      && live.renderer.racerShadow.failure === null && live.renderer.racerShadow.skipped === null,
    `Sebulba body shadow mismatch: ${JSON.stringify(live.renderer.racerShadow)}`);
    assert(live.renderer.sceneryShadow.failure === null, 'Static atlas failed with Sebulba');

    // Preserve the selected preference through an actual reload, then fail the
    // new model load. This exercises Classic fallback without storage writes.
    stage = 'sebulba-http-failure';
    let injections = 0;
    const failAsset = async route => { injections += 1; await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Intentional Sebulba acceptance failure' }); };
    await modelPage.route('**/assets/inkstorm/vehicles/sebulba-hero.glb', failAsset);
    await modelPage.reload(); await ready(modelPage);
    await modelPage.waitForFunction(() => {
      const hero = window.__PODRACING__.snapshot().game.vehiclePresentation.racers[0];
      return hero.requested === 'sebulba' && hero.status === 'error' && hero.active === 'procedural';
    });
    await modelPage.locator('[data-action="retry-appearance"]:visible').waitFor();
    await modelPage.locator('[data-hud="garage-model"][data-preview-state="fallback"][data-preview-appearance="procedural"]').waitFor();
    const status = await modelPage.locator('[data-hud="appearance-status"]').innerText();
    assert(status.includes('Sebulba unavailable') && status.includes('Classic'), `Untruthful Sebulba fallback status: ${status}`);
    await recordStage(modelPage, 'sebulba-http-fallback');
    const settled = injections; await modelPage.waitForTimeout(1200);
    assert(injections === settled, 'Sebulba failure was retried every frame');
    receipt.sebulbaFailure = { injections, status };
    await modelPage.unroute('**/assets/inkstorm/vehicles/sebulba-hero.glb', failAsset);
    stage = 'sebulba-retry';
    await modelPage.locator('[data-action="retry-appearance"]').click();
    await waitHero(modelPage, 'sebulba');
    await modelPage.locator('[data-hud="garage-model"][data-preview-appearance="sebulba"]').waitFor();
    await waitReadyStatus(modelPage, 'Sebulba');
    await recordStage(modelPage, 'sebulba-http-retry');
    assert((await artState(modelPage)).racers[0].registeredPrepasses === 6, 'Sebulba retry accumulated prepasses');
    assert(await modelPage.locator('[data-action="retry-appearance"]').isHidden(), 'Sebulba Retry remained visible after recovery');
    assert(receipt.requests.every(request => /\/(teemto-(hero-open-v1|rival)|sebulba-hero)\.glb$/.test(request.url)), 'An unused catalogue or Sebulba rival variant was loaded');
    assert(receipt.errors.every(error => ['injected-http-failure', 'sebulba-http-failure'].includes(error.stage)
      && error.type === 'console' && error.message.includes('503')), 'Unexpected browser/shader error in Sebulba acceptance');
  } finally { releaseDelayed(); await modelContext.close(); }
}

try {
  let served = false;
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try { if ((await fetch(origin)).ok) { served = true; break; } } catch { /* Preview is starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(served, 'Preview did not become reachable');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    window.__vehicleContexts = [];
    HTMLCanvasElement.prototype.getContext = function (kind, ...options) {
      const result = original.call(this, kind, ...options);
      if (kind === 'webgl2' && result && !window.__vehicleContexts.some((entry) => entry.gl === result)) {
        window.__vehicleContexts.push({ canvas: this, gl: result });
      }
      return result;
    };
  });
  const page = await context.newPage(); observe(page);
  await page.goto(origin); await ready(page);
  receipt.environment = await frozenBuildReceipt(page, browser);
  await waitHero(page, 'teemto');
  await page.locator('[data-hud="garage-model"][data-preview-appearance="teemto"]').waitFor();
  await waitReadyStatus(page, 'Teemto');
  assert(await page.locator('[data-action="select-appearance"][data-appearance="teemto"]').getAttribute('aria-pressed') === 'true', 'New-user Teemto choice is not selected visibly');
  receipt.recordsBeforeAppearanceChanges = await persistentRecords(page);
  await recordStage(page, 'garage-teemto');
  const initial = await artState(page);
  assert(initial.racers[0].statistics.triangles === 59324, 'Hero did not load the verified 59,324-triangle V4C export');
  assert(initial.racers[0].statistics.bodyDraws === 3 && initial.racers[0].statistics.pilotDraws === 6, 'Actual body/driver classification is wrong');
  assert(initial.racers[0].embeddedPilot, 'Imported driver did not suppress the procedural pilot');
  assert(initial.racers[0].registeredPrepasses === 9, 'Imported geometry did not replace the procedural prepass registration');

  stage = 'selection';
  await page.locator('[data-action="select-appearance"][data-appearance="procedural"]').click();
  await waitHero(page, 'procedural');
  await page.locator('[data-hud="garage-model"][data-preview-appearance="procedural"]').waitFor();
  await recordStage(page, 'garage-classic');
  assert((await artState(page)).racers[0].registeredPrepasses === 1, 'Returning to Classic retained stale imported prepasses');
  assert(await persistentRecords(page) === receipt.recordsBeforeAppearanceChanges, 'Appearance selection changed competitive records');
  await page.reload(); await ready(page); await waitHero(page, 'procedural');
  assert((await artState(page)).selected === 'procedural', 'Reload ignored the explicit Classic preference');
  await page.locator('[data-action="select-appearance"][data-appearance="teemto"]').click();
  await waitHero(page, 'teemto');
  for (const vehicle of ['landspeeder', 'speeder-bike', 'skim-speeder']) {
    await page.locator(`.pod-hud__vehicle-card[data-vehicle-id="${vehicle}"]`).click();
    await page.waitForFunction((id) => {
      const state = window.__PODRACING__.snapshot().game.vehiclePresentation;
      return state.racers[0].vehicleClass === id && state.racers[0].active === 'procedural' && state.selected === 'teemto';
    }, vehicle);
    await page.locator('[data-hud="appearance"]').waitFor({ state: 'hidden', timeout: 5000 });
  }
  await page.locator('.pod-hud__vehicle-card[data-vehicle-id="podracer"]').click();
  await waitHero(page, 'teemto');
  await page.locator('[data-hud="garage-model"][data-preview-appearance="teemto"]').waitFor();
  await page.locator('[data-action="inspect-vehicle"][data-direction="1"]').click();
  await page.waitForFunction(() => document.querySelector('[data-hud="garage-model"]')?.dataset.previewAngle === '30');
  await recordStage(page, 'garage-teemto-return');
  assert((await artState(page)).racers[0].registeredPrepasses === 9, 'Returning to Teemto accumulated or omitted prepasses');
  assert(await persistentRecords(page) === receipt.recordsBeforeAppearanceChanges, 'Class browsing/appearance selection changed records');
  receipt.selectionPersistence = await page.evaluate(() => localStorage.getItem('now-this-is-podracing.vehicle-appearance'));

  stage = 'drive';
  await page.locator('[data-action="start-race"]').click();
  await page.keyboard.down('w');
  try { await page.waitForFunction(() => window.__PODRACING__.snapshot().raceTime > 5, undefined, { timeout: 30000 }); }
  finally { await page.keyboard.up('w'); }
  await recordStage(page, 'live-teemto');
  const live = receipt.stages['live-teemto'];
  receipt.previewContextCleanup = await page.evaluate(() => window.__vehicleContexts.map(({ canvas, gl }) => ({
    main: canvas.id === 'viewport', lost: gl.isContextLost(), width: canvas.width, height: canvas.height,
  })));
  assert(receipt.previewContextCleanup.some((entry) => !entry.main)
    && receipt.previewContextCleanup.filter((entry) => !entry.main).every((entry) => entry.lost),
  'The garage retained a live auxiliary GPU context after race start');
  assert(live.game.vehiclePresentation.racers[0].active === 'teemto', 'Race silently fell back after garage loading');
  assert(live.renderer.racerShadow.drawCalls === 3 && live.renderer.racerShadow.drawnTriangles === 43545,
    `Shadow did not use three actual body meshes: ${JSON.stringify(live.renderer.racerShadow)}`);
  assert(live.renderer.racerShadow.failure === null && live.renderer.racerShadow.skipped === null, 'Imported hero shadow failed');
  assert(live.renderer.sceneryShadow.failure === null, 'Static shadow failed after appearance binding');

  stage = 'context';
  assert(await page.evaluate(() => {
    const canvas = document.querySelector('#viewport');
    const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
    if (!extension) return false;
    window.__appearanceContext = extension;
    extension.loseContext();
    return true;
  }), 'Real WebGL context-loss extension unavailable');
  await page.locator('[data-renderer-state="lost"]').waitFor();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__appearanceContext.restoreContext());
  await page.locator('[data-renderer-state="ready"]').waitFor();
  await page.waitForFunction((frames) => {
    const state = window.__PODRACING__.snapshot();
    return state.renderer.racerShadow.frames > frames && state.renderer.racerShadow.failure === null
      && state.game.vehiclePresentation.racers[0].active === 'teemto';
  }, live.renderer.racerShadow.frames, { timeout: 20000 });
  await recordStage(page, 'restored-teemto');
  assert(receipt.errors.length === 0, 'Unexpected browser or shader error before intentional fault injection');
  await context.close();

  stage = 'injected-http-failure';
  const failureContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const failedPage = await failureContext.newPage(); observe(failedPage);
  let injections = 0;
  const failAsset = async (route) => { injections += 1; await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Intentional appearance acceptance failure' }); };
  await failedPage.route('**/assets/inkstorm/vehicles/teemto-hero-open-v1.glb', failAsset);
  await failedPage.goto(origin); await ready(failedPage);
  await failedPage.waitForFunction(() => window.__PODRACING__.snapshot().game.vehiclePresentation.racers[0].status === 'error');
  await failedPage.locator('[data-action="retry-appearance"]:visible').waitFor();
  await failedPage.locator('[data-hud="garage-model"][data-preview-state="fallback"]').waitFor();
  await recordStage(failedPage, 'http-fallback');
  assert((await artState(failedPage)).racers[0].active === 'procedural', 'Missing model did not preserve the procedural race view');
  const settledRequests = injections;
  await failedPage.waitForTimeout(1200);
  assert(injections === settledRequests, 'Missing model was retried every frame');
  receipt.intentionalFailure = { injections, errors: receipt.errors.filter((error) => error.stage === stage) };
  assert(receipt.intentionalFailure.errors.every((error) => error.type === 'console' && error.message.includes('503')),
    'Fault injection produced an unexpected runtime/shader error');
  await failedPage.unroute('**/assets/inkstorm/vehicles/teemto-hero-open-v1.glb', failAsset);
  stage = 'retry';
  await failedPage.locator('[data-action="retry-appearance"]').click();
  await waitHero(failedPage, 'teemto');
  await failedPage.locator('[data-hud="garage-model"][data-preview-appearance="teemto"]').waitFor();
  await recordStage(failedPage, 'http-retry-teemto');
  assert(await failedPage.locator('[data-action="retry-appearance"]').isHidden(), 'Retry remained visible after successful recovery');
  assert(!receipt.errors.some((error) => error.stage === 'retry'), 'Successful retry produced a browser/shader error');
  assert(receipt.requests.every((request) => /\/teemto-(hero-open-v1|rival)\.glb$/.test(request.url)), 'Unselected catalogue models were loaded');
  await failureContext.close();
  if (includeSebulba) await checkSebulba();
  receipt.outcome = 'PASS';
} catch (error) {
  receipt.error = String(error); process.exitCode = 1; console.error(error);
} finally {
  await browser?.close();
  if (server.pid) {
    try { if (process.platform !== 'win32') process.kill(-server.pid, 'SIGTERM'); else server.kill('SIGTERM'); } catch { /* Already stopped. */ }
  }
  receipt.completedAt = new Date().toISOString();
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ outcome: receipt.outcome, output, port, error: receipt.error,
    stages: Object.keys(receipt.stages), errors: receipt.errors }));
}
