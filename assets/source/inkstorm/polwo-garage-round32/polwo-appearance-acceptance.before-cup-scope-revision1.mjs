// Focused lifecycle evidence against an already-built app. All state changes use
// public controls or keyboard input; __PODRACING__ is read only. No FPS/art PASS.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer, createConnection } from 'node:net';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

if (process.argv.includes('--check')) {
  console.log('Polwo lifecycle harness loaded; no assets, browser or server opened.');
  process.exit(0);
}

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suffix = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
const output = resolve(repo, process.env.INKSTORM_OUTPUT ?? `output/playwright/polwo-appearance-${suffix}`);
const assetPath = '/assets/inkstorm/vehicles/polwo-hero-v1.glb';
const rivalAssetPath = '/assets/inkstorm/vehicles/polwo-rival-v1.glb';
const publicAsset = resolve(repo, `public${assetPath}`);
const expected = { triangles: 48975, bodyTriangles: 33064, meshes: 8, opaqueDraws: 8,
  bodyDraws: 2, pilotDraws: 6, prepassDraws: 8, shadowSourceMeshes: 2 };
const rivalExpected = { ...expected, triangles: 28830, bodyTriangles: undefined };
const bodyNames = ['polwo-body-0', 'polwo-body-1'];
const pilotNames = ['accent', 'hardware', 'rubber', 'shell', 'suit', 'webbing'].map(part => `polwo-pilot-${part}`);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const assert = (value, message) => { if (!value) throw new Error(message); };
const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms));
const receipt = { outcome: 'FAIL', startedAt: new Date().toISOString(), output: relative(repo, output),
  scriptSha256: sha256(await readFile(fileURLToPath(import.meta.url))), expected,
  scope: 'Public UI selection, decoded garage images and inspection angles, late-load cancellation, reload persistence, class/record invariants, five seconds of ordinary input, body-shadow submission and injected HTTP 503 fallback/Retry. No full-race, FPS, human driving or visual-art acceptance.',
  errors: [], requests: [], servedAssets: [], invariants: [], stages: {}, cleanup: { routes: [], errors: [] } };

// Never replace an earlier receipt, including when an explicit output is supplied.
await mkdir(dirname(output), { recursive: true });
await mkdir(output);
let server, browser, context, page, port, origin, stage = 'preflight', serverError;
let failureInjectionActive = false, releaseDelayed = () => {}, cleanupPromise;
const routes = new Map();
const responseTasks = new Set();
const serverOutput = [];

function assetHeader(bytes, geometryExpected = expected) {
  assert(bytes.length >= 20 && bytes.readUInt32LE(0) === 0x46546c67
    && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, 'Public Polwo asset is not a complete GLB v2');
  const jsonLength = bytes.readUInt32LE(12);
  assert(bytes.readUInt32LE(16) === 0x4e4f534a && jsonLength + 20 <= bytes.length, 'Polwo GLB JSON chunk is invalid');
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  const scene = gltf.scenes?.[gltf.scene ?? 0];
  assert(scene, 'Polwo GLB has no default scene');
  const rows = [], ancestors = new Set();
  function visit(index) {
    assert(!ancestors.has(index), 'Polwo GLB scene contains a node cycle');
    const node = gltf.nodes?.[index];
    assert(node, `Missing Polwo GLB node ${index}`);
    ancestors.add(index);
    if (node.mesh !== undefined) {
      const primitives = gltf.meshes?.[node.mesh]?.primitives;
      assert(primitives?.length, `Missing primitives for ${node.name}`);
      for (const primitive of primitives) {
        assert((primitive.mode ?? 4) === 4, `Non-triangle primitive in ${node.name}`);
        const accessor = gltf.accessors?.[primitive.indices ?? primitive.attributes?.POSITION];
        assert(accessor && accessor.count % 3 === 0, `Invalid triangle count for ${node.name}`);
        const material = gltf.materials?.[primitive.material];
        assert(material && (material.alphaMode ?? 'OPAQUE') === 'OPAQUE', `Non-opaque/missing material in ${node.name}`);
        rows.push({ node: node.name, material: material.name, triangles: accessor.count / 3 });
      }
    }
    for (const child of node.children ?? []) visit(child);
    ancestors.delete(index);
  }
  for (const index of scene.nodes ?? []) visit(index);
  assert(rows.length === expected.opaqueDraws && new Set(rows.map(row => row.node)).size === expected.meshes,
    `Expected eight unique single-primitive nodes: ${JSON.stringify(rows)}`);
  assert([...bodyNames, ...pilotNames].every(name => rows.some(row => row.node === name)), 'Polwo canonical body/pilot nodes differ from the runtime wiring');
  const triangles = rows.reduce((sum, row) => sum + row.triangles, 0);
  const bodyTriangles = rows.filter(row => bodyNames.includes(row.node)).reduce((sum, row) => sum + row.triangles, 0);
  assert(triangles === geometryExpected.triangles
    && (geometryExpected.bodyTriangles === undefined || bodyTriangles === geometryExpected.bodyTriangles),
    `Polwo package geometry differs: ${triangles} total / ${bodyTriangles} body triangles`);
  return { triangles, bodyTriangles, rows };
}

async function freePort() {
  const chosen = await new Promise((resolvePort, reject) => {
    const socket = createServer(); socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const address = socket.address();
      socket.close(error => error ? reject(error) : resolvePort(address.port));
    });
  });
  return chosen === 5211 ? freePort() : chosen;
}

function portOpen() {
  return new Promise(resolveOpen => {
    const socket = createConnection({ host: '127.0.0.1', port });
    let settled = false;
    const finish = open => { if (!settled) { settled = true; socket.destroy(); resolveOpen(open); } };
    socket.once('connect', () => finish(true)); socket.once('error', () => finish(false));
    socket.setTimeout(500, () => finish(true));
  });
}

async function removeRoute(handler) {
  const pattern = routes.get(handler);
  if (!pattern) return;
  await page.unroute(pattern, handler);
  routes.delete(handler);
  receipt.cleanup.routes.push({ pattern, removed: true });
}

async function cleanup() {
  if (cleanupPromise) return cleanupPromise;
  cleanupPromise = (async () => {
    releaseDelayed();
    for (const handler of [...routes.keys()]) {
      try { await removeRoute(handler); } catch (error) { receipt.cleanup.errors.push(`unroute: ${error}`); }
    }
    if (context) {
      try { await context.close(); receipt.cleanup.contextClosed = true; }
      catch (error) { receipt.cleanup.errors.push(`context: ${error}`); }
    }
    if (browser) {
      try { await browser.close(); receipt.cleanup.browserClosed = !browser.isConnected(); }
      catch (error) { receipt.cleanup.errors.push(`browser: ${error}`); }
    }
    if (server?.pid) {
      const groupAlive = () => {
        try { process.kill(process.platform === 'win32' ? server.pid : -server.pid, 0); return true; }
        catch (error) { if (error.code === 'ESRCH') return false; throw error; }
      };
      const signalOwned = signal => {
        // This PID was created by this invocation. Never discover/kill by port.
        try { process.kill(process.platform === 'win32' ? server.pid : -server.pid, signal); }
        catch (error) { if (error.code !== 'ESRCH') throw error; }
      };
      try {
        if (groupAlive()) signalOwned('SIGTERM');
        for (let attempt = 0; attempt < 30 && groupAlive(); attempt++) await delay(100);
        if (groupAlive()) signalOwned('SIGKILL');
        for (let attempt = 0; attempt < 20 && groupAlive(); attempt++) await delay(100);
        receipt.cleanup.serverGroupStopped = !groupAlive();
        receipt.cleanup.ownedPortClosed = !(await portOpen());
        assert(receipt.cleanup.serverGroupStopped && receipt.cleanup.ownedPortClosed, 'Owned preview did not shut down completely');
      } catch (error) { receipt.cleanup.errors.push(`owned preview: ${error}`); }
    }
  })();
  return cleanupPromise;
}

const onSignal = signal => {
  receipt.interruptedBy = signal;
  process.exitCode = 1;
  releaseDelayed();
  // Interrupt UI waits but leave final cleanup to the main finally. A signal
  // during launch must not memoize cleanup before the browser becomes owned.
  if (browser) void browser.close().catch(error => receipt.cleanup.errors.push(`signal browser close: ${error}`));
};
const onSigint = () => onSignal('SIGINT');
const onSigterm = () => onSignal('SIGTERM');
process.on('SIGINT', onSigint); process.on('SIGTERM', onSigterm);

const snapshot = () => page.evaluate(() => window.__PODRACING__.snapshot());
const artState = async () => (await snapshot()).game.vehiclePresentation;
const records = () => page.evaluate(() => localStorage.getItem('podracing.inkstorm.mastery.v1'));
const identity = snap => ({ vehicleClass: snap.game.vehicleClass, preset: snap.preset,
  seed: snap.game.course.seed, courseSignature: snap.game.course.signature, ordinal: snap.game.course.ordinal,
  selectedLaps: snap.game.selectedLaps, eventId: snap.game.mastery?.eventId,
  competitionProfile: snap.game.competitionProfile, upgrades: snap.game.upgrades });
let baselineIdentity, baselineRecords;
let garageIdentity;
const verifyUnchanged = async name => {
  const current = identity(await snapshot());
  assert(JSON.stringify(current) === JSON.stringify(baselineIdentity), `${name}: appearance changed class, course, event, laps or build identity`);
  const currentRecords = await records();
  assert(currentRecords === baselineRecords, `${name}: appearance flow wrote mastery records`);
  receipt.invariants.push({ stage: name, identity: current, masteryBytesUnchanged: true });
};
const verifyIdentityTransition = async (name, expectedIdentity) => {
  const current = identity(await snapshot());
  assert(JSON.stringify(current) === JSON.stringify(expectedIdentity), `${name}: identity differs from the explicit lifecycle transition`);
  assert(await records() === baselineRecords, `${name}: lifecycle transition wrote mastery records`);
  (receipt.identityTransitions ??= []).push({ stage: name, before: baselineIdentity,
    expected: expectedIdentity, actual: current, masteryBytesUnchanged: true });
  baselineIdentity = current;
};
const recordStage = async name => {
  receipt.stages[name] = await snapshot();
  await page.screenshot({ path: resolve(output, `${name}.png`) });
};
const ready = () => page.waitForFunction(() => window.__PODRACING__?.ready, undefined, { timeout: 60000 });
const waitHero = active => page.waitForFunction(wanted => {
  const hero = window.__PODRACING__?.snapshot().game.vehiclePresentation?.racers[0];
  return hero?.active === wanted && hero.status === (wanted === 'procedural' ? 'procedural' : 'ready');
}, active, { timeout: 30000 });
const select = appearance => page.locator(`[data-action="select-appearance"][data-appearance="${appearance}"]`).click();
async function decodedPreview(appearance, previousSource) {
  await page.waitForFunction(({ wanted, previous }) => {
    const host = document.querySelector('[data-hud="garage-model"]');
    const image = host?.querySelector('img');
    return host?.dataset.previewReady === 'true' && host.dataset.previewAppearance === wanted
      && image?.complete && image.naturalWidth > 0 && (!previous || image.src !== previous);
  }, { wanted: appearance, previous: previousSource }, { timeout: 30000 });
  return page.locator('[data-hud="garage-model"] img').evaluate(async image => {
    await image.decode();
    return { source: image.src, width: image.naturalWidth, height: image.naturalHeight, alt: image.alt };
  });
}
async function polwoReady() {
  await waitHero('polwo'); await decodedPreview('polwo');
  await page.waitForFunction(() => document.querySelector('[data-hud="appearance-status"]')?.textContent === 'Polwo · seated pilot · twin engines');
  assert(await page.locator('[data-action="retry-appearance"]').isHidden(), 'Retry remains visible after race and garage readiness');
  const hero = (await artState()).racers[0];
  for (const key of ['triangles', 'meshes', 'opaqueDraws', 'bodyDraws', 'pilotDraws', 'prepassDraws', 'shadowSourceMeshes']) {
    assert(hero.statistics?.[key] === expected[key], `Polwo ${key} mismatch: ${JSON.stringify(hero)}`);
  }
  assert(hero.registeredPrepasses === 8 && hero.visiblePrepasses === 8 && hero.embeddedPilot,
    `Polwo did not install eight visible body/pilot prepasses: ${JSON.stringify(hero)}`);
  assert(hero.vehicleClass === 'podracer' && hero.requested === 'polwo' && hero.error === null, 'Polwo installed with incorrect class/request/error');
  assert((await page.locator('[data-hud="garage-name"]').innerText()).toLowerCase() === 'polwo', 'Garage name does not match Polwo');
}
async function polwoRivalReady() {
  await page.waitForFunction(() => {
    const rival = window.__PODRACING__?.snapshot().game.vehiclePresentation?.racers[4];
    return rival?.requested === 'polwo' && rival.active === 'polwo' && rival.status === 'ready';
  }, undefined, { timeout: 30000 });
  const rival = (await artState()).racers[4];
  for (const key of ['triangles', 'meshes', 'opaqueDraws', 'bodyDraws', 'pilotDraws', 'prepassDraws', 'shadowSourceMeshes']) {
    assert(rival.statistics?.[key] === rivalExpected[key], `Sola Polwo rival ${key} mismatch: ${JSON.stringify(rival)}`);
  }
  assert(rival.registeredPrepasses === 8 && rival.embeddedPilot && rival.vehicleClass === 'podracer' && rival.error === null,
    `Sola did not admit the actual Polwo rival body/pilot package: ${JSON.stringify(rival)}`);
  (receipt.rivalAdmissions ??= []).push({ stage, racerIndex: 4, ...rival });
}

try {
  // Geometry is an authored fixture. SHA is derived only from this run's real
  // public asset, then compared with preflight HTTP and every browser payload.
  const publicBytes = await readFile(publicAsset);
  receipt.asset = { publicPath: relative(repo, publicAsset), bytes: publicBytes.length,
    sha256: sha256(publicBytes), header: assetHeader(publicBytes) };
  const publicRivalPath = resolve(repo, `public${rivalAssetPath}`);
  const rivalBytes = await readFile(publicRivalPath);
  receipt.rivalAsset = { publicPath: relative(repo, publicRivalPath), bytes: rivalBytes.length,
    sha256: sha256(rivalBytes), expected: rivalExpected, header: assetHeader(rivalBytes, rivalExpected) };
  receipt.rivalAdmissionScope = 'Actual normal-app Sola index 4 import/admission with public and browser payload hashes. Time Attack hides AI views; visiblePrepasses is recorded honestly. Visible rival rendering and race performance require the separate Cup run.';
  await readFile(resolve(repo, 'dist/index.html')); // Refuse an absent build; never build automatically.
  port = await freePort(); origin = `http://127.0.0.1:${port}`;
  receipt.port = port; receipt.origin = origin;
  server = spawn(process.execPath, [resolve(repo, 'node_modules/vite/bin/vite.js'), 'preview',
    '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: repo, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
  });
  server.on('error', error => { serverError = error; });
  server.stdout.on('data', chunk => serverOutput.push(chunk.toString()));
  server.stderr.on('data', chunk => serverOutput.push(chunk.toString()));
  receipt.server = { pid: server.pid, processGroup: process.platform === 'win32' ? null : server.pid };
  let served = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    assert(!receipt.interruptedBy && !serverError && server.exitCode === null, `Preview interrupted or exited: ${serverError ?? server.exitCode}`);
    try { if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok) { served = true; break; } }
    catch { /* The owned preview is starting. */ }
    await delay(100);
  }
  assert(served, 'Owned preview did not become reachable');
  for (const [path, asset] of [[assetPath, receipt.asset], [rivalAssetPath, receipt.rivalAsset]]) {
    const servedAsset = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(15000) });
    assert(servedAsset.ok, `Served Polwo asset is missing: ${path} HTTP ${servedAsset.status}`);
    const servedBytes = Buffer.from(await servedAsset.arrayBuffer());
    asset.preflightServed = { bytes: servedBytes.length, sha256: sha256(servedBytes), status: servedAsset.status };
    assert(asset.preflightServed.sha256 === asset.sha256, `Preview serves a stale/different ${path}; rebuild before running`);
  }
  assert(!receipt.interruptedBy, 'Harness interrupted before browser launch');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  assert(!receipt.interruptedBy, 'Harness interrupted during browser launch');
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  assert(!receipt.interruptedBy, 'Harness interrupted during context creation');
  page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', error => receipt.errors.push({ stage, type: 'pageerror', message: error.message, expected: false }));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const location = message.location();
    receipt.errors.push({ stage, type: 'console', message: message.text(), location,
      expected: failureInjectionActive && location.url === `${origin}${assetPath}` && message.text().includes('503') });
  });
  page.on('request', request => {
    if (request.url().includes('/assets/inkstorm/vehicles/')) receipt.requests.push({ stage, url: request.url() });
  });
  page.on('response', response => {
    const asset = response.url() === `${origin}${assetPath}` ? receipt.asset
      : response.url() === `${origin}${rivalAssetPath}` ? receipt.rivalAsset : null;
    if (!asset) return;
    const responseStage = stage;
    const intentionallyFailed = asset === receipt.asset && failureInjectionActive && response.status() === 503;
    const task = (async () => {
      const row = { stage: responseStage, url: response.url(), status: response.status(), intentionallyFailed };
      receipt.servedAssets.push(row);
      if (intentionallyFailed) return;
      assert(response.status() === 200, `Unexpected Polwo HTTP ${response.status()}`);
      const bytes = await response.body(); row.bytes = bytes.length; row.sha256 = sha256(bytes);
      assert(row.sha256 === asset.sha256, `Browser Polwo payload differs from the public GLB in ${responseStage}`);
    })().catch(error => receipt.errors.push({ stage: responseStage, type: 'asset-payload', message: String(error), expected: false }));
    responseTasks.add(task); void task.finally(() => responseTasks.delete(task));
  });

  stage = 'initial'; await page.goto(origin); await ready();
  receipt.environment = await frozenBuildReceipt(page, browser);
  await waitHero('teemto'); await decodedPreview('teemto');
  await polwoRivalReady();
  assert(!receipt.requests.some(request => request.url === `${origin}${assetPath}`), 'Polwo loaded before first selection');
  baselineIdentity = identity(await snapshot()); baselineRecords = await records();
  garageIdentity = { ...baselineIdentity };
  assert(baselineIdentity.vehicleClass === 'podracer', 'Fresh garage did not start in the Podracer class');
  receipt.baseline = { identity: baselineIdentity, masteryStoragePresent: baselineRecords !== null,
    masteryStorageSha256: baselineRecords === null ? null : sha256(baselineRecords),
    limitation: 'Fresh isolated browser context; checks unchanged live event/course/class and existing storage bytes, not migration or an existing personal-best replay.' };

  stage = 'classic-before-cancel'; await select('procedural'); await waitHero('procedural'); await decodedPreview('procedural');
  await verifyUnchanged(stage); await recordStage(stage);
  let delayedRequests = 0;
  const delayed = new Promise(resolveDelay => { releaseDelayed = resolveDelay; });
  const holdAsset = async route => {
    delayedRequests++; await delayed;
    try { await route.continue(); }
    catch (error) {
      if (!cleanupPromise && !receipt.interruptedBy) receipt.errors.push({ stage, type: 'delayed-route', message: String(error), expected: false });
    }
  };
  const exactAssetUrl = `${origin}${assetPath}`;
  await page.route(exactAssetUrl, holdAsset); routes.set(holdAsset, exactAssetUrl);
  try {
    stage = 'delayed-polwo-selection'; await select('polwo');
    await page.waitForFunction(() => {
      const hero = window.__PODRACING__.snapshot().game.vehiclePresentation.racers[0];
      return hero.requested === 'polwo' && hero.status === 'loading' && hero.active === 'procedural';
    });
    for (let attempt = 0; attempt < 100 && delayedRequests === 0; attempt++) await delay(50);
    assert(delayedRequests > 0, 'No actual Polwo request was held for cancellation');
    await select('procedural'); await waitHero('procedural'); await decodedPreview('procedural');
    releaseDelayed();
    await page.waitForFunction(() => window.__PODRACING__.snapshot().game.vehiclePresentation.library.pending === 0);
    const cancelled = await artState();
    assert(cancelled.selected === 'procedural' && cancelled.racers[0].active === 'procedural'
      && cancelled.racers[0].status === 'procedural', 'Late Polwo completion replaced the newer Classic choice');
    receipt.cancellation = { delayedRequests, newerChoice: 'procedural', settledActive: cancelled.racers[0].active };
    await verifyUnchanged('late-load-cancelled'); await recordStage('late-load-cancelled');
  } finally { releaseDelayed(); await removeRoute(holdAsset); }

  stage = 'polwo-selected'; await select('polwo'); await polwoReady();
  await verifyUnchanged(stage); await recordStage('garage-polwo-angle-0');
  receipt.inspection = [];
  for (let angle = 30; angle <= 270; angle += 30) {
    const previousSource = await page.locator('[data-hud="garage-model"] img').getAttribute('src');
    await page.locator('[data-action="inspect-vehicle"][data-direction="1"]').click();
    await page.waitForFunction(wanted => document.querySelector('[data-hud="garage-model"]')?.dataset.previewAngle === String(wanted), angle);
    const preview = await decodedPreview('polwo', previousSource); await polwoReady();
    if (angle % 90 === 0) {
      const imageBytes = Buffer.from(preview.source.slice(preview.source.indexOf(',') + 1), 'base64');
      receipt.inspection.push({ requestedAngle: angle, width: preview.width, height: preview.height, decodedImageSha256: sha256(imageBytes) });
      await recordStage(`garage-polwo-angle-${angle}`);
    }
  }
  assert(new Set(receipt.inspection.map(view => view.decodedImageSha256)).size === 3, 'Inspection angles reused the same image');

  stage = 'reload-persistence'; await page.reload(); await ready(); await polwoReady();
  const preference = await page.evaluate(() => localStorage.getItem('now-this-is-podracing.vehicle-appearance'));
  receipt.persistence = JSON.parse(preference);
  assert(receipt.persistence?.version === 1 && receipt.persistence.appearance === 'polwo' && (await artState()).selected === 'polwo', 'Reload lost explicit Polwo preference');
  await verifyUnchanged(stage); await recordStage(stage);
  stage = 'class-fallback';
  await page.locator('.pod-hud__vehicle-card[data-vehicle-id="landspeeder"]').click();
  await page.waitForFunction(() => {
    const state = window.__PODRACING__.snapshot().game.vehiclePresentation;
    return state.selected === 'polwo' && state.racers[0].vehicleClass === 'landspeeder' && state.racers[0].active === 'procedural';
  });
  await page.locator('[data-action="select-appearance"][data-appearance="polwo"]').waitFor({ state: 'hidden' });
  assert(await records() === baselineRecords, 'Intentional class browsing changed mastery records');
  await recordStage(stage);
  await page.locator('.pod-hud__vehicle-card[data-vehicle-id="podracer"]').click(); await polwoReady();
  await verifyUnchanged('class-return');

  stage = 'ordinary-drive'; await verifyUnchanged('before-start');
  const releasedIdentity = { ...baselineIdentity, ordinal: baselineIdentity.ordinal + 1 };
  await page.locator('[data-action="start-race"]').click();
  await page.waitForFunction(() => !window.__PODRACING__.snapshot().game.awaitingStart);
  // beginRaceCountdown rebuilds the fixed event seed once, incrementing its
  // in-memory course ordinal. Every record-defining field must remain stable.
  await verifyIdentityTransition('public-start-rebuild', releasedIdentity);
  await page.keyboard.down('w');
  try { await page.waitForFunction(() => window.__PODRACING__.snapshot().raceTime > 5, undefined, { timeout: 30000 }); }
  finally { await page.keyboard.up('w'); }
  await recordStage('live-polwo');
  await polwoRivalReady();
  const live = receipt.stages['live-polwo'];
  assert(live.game.vehiclePresentation.racers[0].active === 'polwo', 'Live Polwo unexpectedly fell back');
  assert(live.renderer.racerShadow.drawCalls === 2 && live.renderer.racerShadow.drawnTriangles === 33064
    && live.renderer.racerShadow.failure === null && live.renderer.racerShadow.skipped === null,
  `Polwo body-shadow submission differs: ${JSON.stringify(live.renderer.racerShadow)}`);
  assert(live.renderer.sceneryShadow.failure === null, 'Scenery shadow atlas failed during the Polwo check');
  await verifyUnchanged(stage);

  let injections = 0;
  const failAsset = async route => {
    injections++;
    try { await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Intentional Polwo lifecycle acceptance failure' }); }
    catch (error) {
      if (!cleanupPromise && !receipt.interruptedBy) receipt.errors.push({ stage, type: 'failure-route', message: String(error), expected: false });
    }
  };
  await page.route(exactAssetUrl, failAsset); routes.set(failAsset, exactAssetUrl);
  try {
    stage = 'injected-http-failure'; failureInjectionActive = true;
    await page.reload(); await ready();
    // An actual document reload starts a new GameApp with its original garage
    // ordinal. Verify that exact reset before testing further appearance work.
    assert((await snapshot()).game.awaitingStart, 'Reload did not return to the garage');
    await verifyIdentityTransition('reload-to-garage', garageIdentity);
    await polwoRivalReady();
    await page.waitForFunction(() => {
      const hero = window.__PODRACING__.snapshot().game.vehiclePresentation.racers[0];
      return hero.requested === 'polwo' && hero.status === 'error' && hero.active === 'procedural';
    });
    await page.locator('[data-action="retry-appearance"]:visible').waitFor();
    await page.locator('[data-hud="garage-model"][data-preview-state="fallback"][data-preview-appearance="procedural"]').waitFor();
    await decodedPreview('procedural');
    const status = await page.locator('[data-hud="appearance-status"]').innerText();
    assert(status.includes('Polwo unavailable') && status.includes('Classic'), `Incorrect fallback status: ${status}`);
    assert(injections > 0 && (await artState()).selected === 'polwo', '503 fallback lost the selected preference or did not hit the real asset request');
    await verifyUnchanged(stage); await recordStage('polwo-http-fallback');
    const settled = injections; await page.waitForTimeout(1200);
    assert(injections === settled, 'Failed Polwo loads retried continuously without a Retry action');
    receipt.httpFailure = { injections, quietIntervalMs: 1200, status };
  } finally { await removeRoute(failAsset); failureInjectionActive = false; }
  stage = 'retry'; await page.locator('[data-action="retry-appearance"]').click(); await polwoReady();
  await verifyUnchanged(stage); await recordStage('polwo-http-retry');
  await Promise.all([...responseTasks]);
  assert(receipt.servedAssets.some(row => row.status === 200 && row.stage === 'retry' && row.sha256 === receipt.asset.sha256), 'Retry did not serve the pinned Polwo payload');
  assert(receipt.servedAssets.some(row => row.status === 200 && row.url === `${origin}${rivalAssetPath}`
    && row.sha256 === receipt.rivalAsset.sha256), 'Normal runtime did not load the pinned Polwo rival payload');
  assert(sha256(await readFile(publicAsset)) === receipt.asset.sha256, 'Public Polwo asset changed during the run');
  assert(sha256(await readFile(publicRivalPath)) === receipt.rivalAsset.sha256, 'Public Polwo rival changed during the run');
  assert(receipt.errors.every(error => error.expected), `Unexpected browser/asset errors: ${JSON.stringify(receipt.errors.filter(error => !error.expected))}`);
  assert(!receipt.interruptedBy, 'Harness interrupted');
  receipt.outcome = 'PASS';
} catch (error) {
  receipt.error = String(error); receipt.failedStage = stage; process.exitCode = 1;
  console.error(error);
  if (page && !page.isClosed()) {
    try { await recordStage('failure'); } catch (captureError) { receipt.failureCaptureError = String(captureError); }
  }
} finally {
  await cleanup(); await Promise.all([...responseTasks]);
  if (receipt.cleanup.errors.length || receipt.errors.some(error => !error.expected) || receipt.interruptedBy) {
    receipt.outcome = 'FAIL'; process.exitCode = 1;
  }
  process.off('SIGINT', onSigint); process.off('SIGTERM', onSigterm);
  receipt.completedAt = new Date().toISOString();
  await writeFile(resolve(output, 'preview-server.log'), serverOutput.join(''));
  await writeFile(resolve(output, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ outcome: receipt.outcome, output, port, error: receipt.error,
    stages: Object.keys(receipt.stages), cleanup: receipt.cleanup }));
}
