import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

// Run an already-built bundle. Never rebuild beneath another frozen QA run.
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(projectRoot, process.env.INKSTORM_OUTPUT ?? 'output/playwright/round35-combat');
const port = Number(process.env.INKSTORM_OWNED_PORT ?? 5196);
if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 5211) {
  throw new Error('Use a dedicated valid owned port, never 5211.');
}
const cases = [
  { id: 'solo-chase', camera: 'chase', reducedMotion: false, pauseCancel: false },
  { id: 'solo-manual-camera', camera: 'cockpit', reducedMotion: false, pauseCancel: false },
  { id: 'solo-reduced-motion', camera: 'chase', reducedMotion: true, pauseCancel: false },
  { id: 'solo-pause-cancel', camera: 'cockpit', reducedMotion: false, pauseCancel: true },
];
const requested = process.env.INKSTORM_COMBAT_CASES?.split(',').filter(Boolean);
if (requested?.some((id) => !cases.some((test) => test.id === id))) throw new Error('Unknown INKSTORM_COMBAT_CASES entry.');
const selected = requested ? cases.filter((test) => requested.includes(test.id)) : cases;
if (!selected.length) throw new Error('INKSTORM_COMBAT_CASES must select at least one known case.');
const nativeCadence = process.env.INKSTORM_COMBAT_CADENCE === '1';
if (nativeCadence && (selected.length !== 1 || selected[0].id !== 'solo-chase')) throw new Error('Combat cadence mode requires only solo-chase.');
const receipt = {
  outcome: 'FAIL', port, cases: [], errors: [], nativeCadence,
  cadenceScope: nativeCadence ? 'No screenshots or recording during collection; native RAF intervals around the actual wreck, including read-only observer overhead. Desktop DPR1, not a full-race or physical-display measurement.' : 'Recorded visual/control run; no cadence acceptance claim.',
  scope: 'Native Chrome input and read-only clock/camera/HUD observations. Actual Shift+S overheat/wreck; no capture mode, presets, stepped simulation, health/heat writes, event injection, or race-state staging. Recorded/sampled run is not a performance benchmark.',
  cpuOnlyCoverage: [
    { behavior: 'Clean outgoing event policy', test: 'tests/combat/CombatPresentationController.test.ts', note: 'Synthetic unit event only. Clean profiles disable ordinary offense; no browser outgoing takedown is fabricated.' },
    { behavior: 'Host/guest remain real time through actual authoritative wrecks', test: 'tests/combat/CombatSimulationBoundary.test.ts', note: 'CPU simulation/snapshot boundary; not a live two-client network-session claim.' },
  ],
  harnessSha256: createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
const snapshot = (page) => page.evaluate(() => window.__PODRACING__.snapshot());
await mkdir(out, { recursive: true });
const probe = createServer();
await new Promise((done, fail) => { probe.once('error', fail); probe.listen(port, '127.0.0.1', done); });
await new Promise((done, fail) => probe.close((error) => error ? fail(error) : done()));
const url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: projectRoot, stdio: 'ignore' });
let browser; let closing; let spawnError;
server.on('error', (error) => { spawnError = error; });

async function closeOwned() {
  return closing ??= (async () => {
    const cleanup = { browserClosed: false, serverExited: false, errors: [] };
    try { await browser?.close(); cleanup.browserClosed = true; } catch (error) { cleanup.errors.push(String(error)); }
    try {
      if (server.pid && server.exitCode === null && server.signalCode === null) {
        const exited = new Promise((done) => server.once('exit', done));
        server.kill('SIGTERM');
        await Promise.race([exited, delay(3000).then(() => { throw new Error('Preview exit timed out'); })]);
      }
      cleanup.serverExited = Boolean(spawnError) || server.exitCode !== null || server.signalCode !== null;
    } catch (error) {
      cleanup.errors.push(String(error));
      if (server.pid && server.exitCode === null && server.signalCode === null) {
        const exited = new Promise((done) => server.once('exit', done)); server.kill('SIGKILL'); await exited;
      }
      cleanup.serverExited = server.exitCode !== null || server.signalCode !== null;
    }
    receipt.cleanup = cleanup;
    if (!cleanup.browserClosed || !cleanup.serverExited || cleanup.errors.length) receipt.outcome = 'FAIL';
    await writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
  })();
}
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  process.once(signal, () => { receipt.error = signal; void closeOwned().finally(() => process.exit(code)); });
}

async function installObserver(page) {
  await page.evaluate(() => {
    // This object owns test observations only. Nothing is assigned to the game.
    const observation = { samples: [], events: [], rafFrames: [], stopped: false, startedAt: performance.now() };
    let previousRaf = null;
    const seen = new Set(); let previous = -Infinity;
    window.__INKSTORM_COMBAT_QA__ = observation;
    const frame = (wallMs) => {
      if (observation.stopped) return;
      if (previousRaf !== null) observation.rafFrames.push({ previousWallMs: previousRaf, wallMs, intervalMs: wallMs - previousRaf });
      previousRaf = wallMs;
      if (wallMs - previous >= 25) {
        previous = wallMs;
        const state = window.__PODRACING__.snapshot();
        const root = document.querySelector('.pod-hud');
        const cue = root?.querySelector('[data-hud="combat-feedback"]');
        const cueVisible = cue instanceof HTMLElement && !cue.hidden && root.classList.contains('has-combat-feedback');
        const playerArt = state.game.vehiclePresentation?.racers?.[0];
        observation.samples.push({ wallMs, frame: state.simulationFrame, raceTime: state.raceTime,
          camera: state.camera, cameraPosition: state.game.cameraPosition,
          activeAppearance: playerArt?.active, breakupAvailable: playerArt?.breakupAvailable, breakupActive: playerArt?.breakupActive,
          damageVariantAvailable: playerArt?.damageVariantAvailable, damageVariantActive: playerArt?.damageVariantActive,
          damageVariantError: playerArt?.damageVariantError,
          wreck: state.game.wreckPhase, heat: state.game.redlineHeat,
          phase: root?.dataset.phase, paused: root?.classList.contains('is-paused'),
          matte: root?.classList.contains('has-cinematic-matte'),
          cueKind: cueVisible ? cue.dataset.kind : null,
          cueAge: cueVisible ? Number(cue.style.getPropertyValue('--cue-age')) : null,
          cueTitle: cueVisible ? cue.querySelector('[data-hud="combat-feedback-title"]')?.textContent : null,
          cueDetail: cueVisible ? cue.querySelector('[data-hud="combat-feedback-detail"]')?.textContent : null });
        for (const event of state.galactic?.recentEvents ?? []) {
          const key = JSON.stringify(event);
          if (!seen.has(key)) { seen.add(key); observation.events.push({ observedWallMs: wallMs, ...event }); }
        }
      }
      if (wallMs - observation.startedAt < 30_000 && observation.samples.length < 1800) requestAnimationFrame(frame);
      else observation.stopped = true;
    };
    requestAnimationFrame(frame);
  });
}

function measuredPace(samples, start, end) {
  const window = samples.filter((sample) => sample.wallMs >= start && sample.wallMs <= end && !sample.paused);
  if (window.length < 4) return null;
  const first = window[0]; const last = window.at(-1);
  const wallSeconds = (last.wallMs - first.wallMs) / 1000;
  if (wallSeconds < 0.15) return null;
  const gaps = window.slice(1).map((sample, index) => sample.wallMs - window[index].wallMs);
  return { samples: window.length, wallSeconds, simulationSeconds: (last.frame - first.frame) / 120,
    raceSeconds: last.raceTime - first.raceTime, ratio: (last.frame - first.frame) / 120 / wallSeconds,
    maximumSampleGapMs: Math.max(...gaps) };
}

function frameCadence(frames, start, end) {
  const intervals = frames.filter(frame => frame.previousWallMs >= start && frame.wallMs <= end).map(frame => frame.intervalMs);
  const sorted = [...intervals].sort((a, b) => a - b);
  const durationMs = intervals.reduce((sum, value) => sum + value, 0);
  return { samples: intervals.length, durationMs, meanHz: durationMs ? intervals.length * 1000 / durationMs : null,
    p95Ms: sorted[Math.floor((sorted.length - 1) * 0.95)] ?? null, maximumMs: sorted.at(-1) ?? null,
    over25Ms: intervals.filter(value => value > 25).length };
}

function analyze(observation, test) {
  const { samples, events } = observation;
  const issues = []; const require = (condition, message) => { if (!condition) issues.push(message); };
  const explosion = events.find((event) => event.type === 'redline-explosion' && event.racerId === 'player');
  const wreck = events.find((event) => event.type === 'wreck' && event.racerId === 'player' && event.cause === 'redline-explosion');
  const cue = samples.find((sample) => sample.cueKind === 'wreck' && sample.wreck === 'wrecked');
  require(explosion && wreck && explosion.frame === wreck.frame, 'Missing matching authoritative redline explosion and local wreck.');
  require(cue && Number.isFinite(cue.cueAge), 'The actual wreck did not produce an observed HUD cue.');
  if (!cue) return { outcome: 'FAIL', issues };
  // HUD cue age is read-only wall age; it identifies the real shot start to
  // within one display frame, rather than inventing a convenient event time.
  const estimatedStartMs = cue.wallMs - cue.cueAge * 1250;
  const before = measuredPace(samples, estimatedStartMs - 1100, estimatedStartMs - 120);
  const slow = measuredPace(samples, estimatedStartMs + 130, estimatedStartMs + 590);
  const after = measuredPace(samples, estimatedStartMs + 1080, estimatedStartMs + 1750);
  const cadence = nativeCadence ? {
    before: frameCadence(observation.rafFrames, estimatedStartMs - 1100, estimatedStartMs - 120),
    cinematic: frameCadence(observation.rafFrames, estimatedStartMs, estimatedStartMs + 820),
    return: frameCadence(observation.rafFrames, estimatedStartMs + 820, estimatedStartMs + 1750),
  } : null;
  if (cadence) for (const [label, window] of Object.entries(cadence)) {
    require(window.samples >= 20 && window.meanHz >= 40 && window.p95Ms <= 25,
      `${label}: native combat cadence did not meet >=40 Hz / p95<=25 ms with >=20 intervals.`);
  }
  require(before && before.ratio > 0.85 && before.ratio < 1.12, 'Pre-wreck scheduling was not measurable real time.');
  const activeSamples = samples.filter((sample) => sample.wallMs >= estimatedStartMs && sample.wallMs < estimatedStartMs + 810);
  let breakup = null;
  if (test.id === 'solo-chase') {
    // The source guard's rigid fallback is valid gameplay but is not evidence
    // that the requested Teemto breakup actually ran. Exclude exact birth and
    // recovery reset; require several observed, already-rendered shot samples.
    const partSamples = activeSamples.filter(sample => sample.matte && sample.wreck === 'wrecked'
      && sample.frame > wreck?.frame && sample.cueAge > 0);
    breakup = { samples: partSamples.length, firstFrame: partSamples[0]?.frame ?? null,
      lastFrame: partSamples.at(-1)?.frame ?? null,
      allTeemto: partSamples.every(sample => sample.activeAppearance === 'teemto'),
      allAvailable: partSamples.every(sample => sample.breakupAvailable === true),
      allActive: partSamples.every(sample => sample.breakupActive === true),
      allDamageAvailable: partSamples.every(sample => sample.damageVariantAvailable === true),
      allDamageActive: partSamples.every(sample => sample.damageVariantActive === true),
      noDamageErrors: partSamples.every(sample => sample.damageVariantError === null) };
    require(breakup.samples >= 3 && breakup.allTeemto && breakup.allAvailable && breakup.allActive
      && breakup.allDamageAvailable && breakup.allDamageActive && breakup.noDamageErrors,
      'Authored Teemto damage variant and breakup were not available and active across at least three non-birth wreck-shot samples.');
  }
  if (test.reducedMotion) {
    require(activeSamples.length >= 10 && activeSamples.every((sample) => !sample.matte && sample.camera === test.camera), 'Reduced motion showed a camera cut or letterbox, or lacked enough samples.');
  } else {
    require(activeSamples.some((sample) => sample.matte && sample.camera === 'side'), 'Victim side camera and letterbox were not observed together.');
  }
  if (test.pauseCancel) {
    const paused = samples.filter((sample) => sample.paused);
    require(paused.length >= 8 && paused.at(-1).frame === paused[0].frame, 'Pause lacked sufficient observed frozen simulation frames.');
    require(paused.slice(1).every((sample) => !sample.matte && sample.camera === test.camera && !sample.cueKind), 'Pause did not cancel the shot and restore the prior camera.');
    const resumed = samples.filter((sample) => sample.wallMs > (paused.at(-1)?.wallMs ?? Infinity));
    const resumePace = resumed.length ? measuredPace(resumed, resumed[0].wallMs + 80, resumed.at(-1).wallMs) : null;
    require(resumePace && resumePace.ratio > 0.85 && resumePace.ratio < 1.12, 'Post-resume real-time scheduling was not demonstrated.');
    return { outcome: issues.length ? 'FAIL' : 'PASS', issues, explosion, wreck, estimatedStartMs, before, resumePace, pausedSamples: paused.length };
  }
  require(slow && slow.maximumSampleGapMs < 120 && slow.ratio >= 0.1 && slow.ratio <= 0.32, 'The middle of the shot did not show bounded slow scheduling with sufficient temporal coverage.');
  require(after && after.ratio > 0.85 && after.ratio < 1.12, 'Scheduling did not return to real time.');
  const restored = samples.filter((sample) => sample.wallMs > estimatedStartMs + 920 && sample.wallMs < estimatedStartMs + 1600);
  require(restored.length >= 8 && restored.every((sample) => sample.camera === test.camera && !sample.matte), 'The original camera was not restored after the shot.');
  if (!test.reducedMotion) {
    const matte = samples.filter((sample) => sample.matte);
    const next = samples.find((sample) => sample.wallMs > matte.at(-1)?.wallMs && !sample.matte);
    const duration = next && matte.length ? next.wallMs - matte[0].wallMs : null;
    require(duration !== null && duration >= 650 && duration <= 950, 'Observed letterbox duration was outside the bounded shot window.');
  }
  return { outcome: issues.length ? 'FAIL' : 'PASS', issues, explosion, wreck, estimatedStartMs, before, slow, after,
    restoredCamera: test.camera, samples: samples.length, cadence, breakup };
}

async function runCase(test) {
  const result = { ...test, outcome: 'FAIL', captures: [], commands: [] };
  receipt.cases.push(result);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
    reducedMotion: test.reducedMotion ? 'reduce' : 'no-preference',
    ...(nativeCadence ? {} : { recordVideo: { dir: `${out}/video`, size: { width: 1440, height: 900 } } }) });
  const page = await context.newPage(); const video = page.video(); page.setDefaultTimeout(20_000);
  page.on('pageerror', (error) => receipt.errors.push(`${test.id}: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') receipt.errors.push(`${test.id}: ${message.text()}`); });
  const capture = async (name) => {
    const path = nativeCadence ? null : `${out}/${test.id}-${name}.png`;
    if (path) await page.screenshot({ path });
    const hud = nativeCadence ? null : await page.evaluate(() => {
      const root = document.querySelector('.pod-hud');
      const panels = ['.pod-hud__race', '.pod-hud__driving-instruments', '[data-hud="redline-instrument"]', '.pod-hud__course-progress'];
      return { cinematic: root.classList.contains('has-cinematic-matte'), wreck: root.classList.contains('has-wreck-state'),
        panels: panels.map(selector => { const element = root.querySelector(selector), style = getComputedStyle(element);
          return { selector, display: style.display, visibility: style.visibility, opacity: style.opacity, hasLayoutBox: element.getClientRects().length > 0 }; }) };
    });
    result.captures.push({ name, path, snapshot: await snapshot(page), hud });
    if (hud?.cinematic) assert(hud.panels.every(panel => !panel.hasLayoutBox), 'Racing instrument remains under cinematic matte');
  };
  try {
    await page.goto(url); await page.waitForFunction(() => window.__PODRACING__?.ready, undefined, { timeout: 45_000 });
    await page.waitForFunction(() => document.querySelector('[data-hud="garage-model"]')?.dataset.previewReady === 'true', undefined, { timeout: 45_000 });
    result.environment = await frozenBuildReceipt(page, browser);
    result.renderer = await page.evaluate(() => {
      const gl = document.querySelector('#viewport')?.getContext('webgl2'); const extension = gl?.getExtension('WEBGL_debug_renderer_info');
      return extension ? { renderer: gl.getParameter(extension.UNMASKED_RENDERER_WEBGL), vendor: gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) } : null;
    });
    assert(result.renderer && !/swiftshader|llvmpipe|software rasterizer/i.test(result.renderer.renderer), 'Native GPU renderer unavailable; refusing a native-runtime claim.');
    const boot = await snapshot(page);
    assert(boot.game.awaitingStart && boot.game.competitionProfile === 'time-trial' && boot.game.onlineRoom.role === 'solo', 'Fresh context did not boot a solo clean Time Attack.');
    await page.locator('[data-action="start-race"]:visible').click();
    await page.locator('#viewport').click({ position: { x: 700, y: 450 } });
    await page.keyboard.down('s');
    result.commands.push({ action: 'native start click; hold S brake' });
    await page.waitForFunction(() => window.__PODRACING__.snapshot().raceTime > 0.1);
    if (test.camera !== 'chase') {
      await page.evaluate((camera) => window.__PODRACING__.setCamera(camera), test.camera);
      result.commands.push({ action: 'existing presentation-only camera override', camera: test.camera });
    }
    await installObserver(page);
    await page.waitForTimeout(1300);
    result.before = await snapshot(page);
    assert(result.before.camera === test.camera && result.before.game.wreckPhase !== 'wrecked', 'Initial camera/wreck state was unexpected.');
    await capture('before');
    await page.keyboard.down('Shift'); result.commands.push({ action: 'native Shift held with S to overheat', beforeFrame: result.before.simulationFrame });
    await page.waitForFunction(() => window.__INKSTORM_COMBAT_QA__?.samples.some((sample) => sample.cueKind === 'wreck'), undefined, { timeout: 14_000 });
    await page.keyboard.up('Shift'); result.commands.push({ action: 'native Shift released after observed actual wreck cue' });
    if (test.pauseCancel) {
      await page.keyboard.press('p', { delay: 80 }); result.commands.push({ action: 'native P held 80 ms to pause during shot' });
      await page.waitForFunction(() => document.querySelector('.pod-hud')?.classList.contains('is-paused'));
      await page.waitForTimeout(450); await capture('paused');
      await page.keyboard.press('p', { delay: 80 }); result.commands.push({ action: 'native P held 80 ms to resume' });
      await page.waitForTimeout(1300);
    } else {
      await capture('wreck');
      await page.waitForTimeout(2000); await capture('restored');
      await page.waitForFunction(() => window.__PODRACING__.snapshot().game.wreckPhase !== 'wrecked', undefined, { timeout: 8000 });
      await capture('recovery');
    }
    await page.waitForFunction(() => window.__PODRACING__.snapshot().game.wreckPhase === 'running', undefined, { timeout: 10000 });
    const readyToDrive = await snapshot(page);
    assert(readyToDrive.camera === test.camera, 'Full recovery failed to restore the requested camera.');
    assert(readyToDrive.game.vehiclePresentation.racers[0].breakupActive === false, 'Engine breakup remained active after full recovery.');
    assert(readyToDrive.game.vehiclePresentation.racers[0].damageVariantActive === false, 'Authored damage variant remained visible after recovery.');
    await page.keyboard.up('s'); await page.keyboard.down('w');
    await page.waitForTimeout(1000); await page.keyboard.up('w');
    result.after = await snapshot(page);
    const travelled = Math.hypot(result.after.game.position[0] - readyToDrive.game.position[0], result.after.game.position[2] - readyToDrive.game.position[2]);
    result.recoveryCompletion = { phase: result.after.game.wreckPhase, camera: result.after.camera,
      breakupActive: result.after.game.vehiclePresentation.racers[0].breakupActive,
      damageVariantActive: result.after.game.vehiclePresentation.racers[0].damageVariantActive, travelledMetres: travelled, speed: result.after.game.speed };
    assert(result.after.game.wreckPhase === 'running' && result.after.camera === test.camera
      && travelled > 1 && result.after.game.speed > 3, 'Ordinary throttle did not drive the restored craft after recovery.');
    result.commands.push({ action: 'Wait actual running phase, release S and hold W for1 second; verify restored geometry and movement.' });
    await capture('driving-again');
    const observation = await page.evaluate(() => {
      window.__INKSTORM_COMBAT_QA__.stopped = true;
      return window.__INKSTORM_COMBAT_QA__;
    });
    await writeFile(`${out}/${test.id}-observations.json`, JSON.stringify(observation, null, 2));
    result.observations = `${out}/${test.id}-observations.json`;
    result.analysis = analyze(observation, test);
    result.outcome = result.analysis.outcome;
    assert(result.outcome === 'PASS', `${test.id}: ${result.analysis.issues.join(' ')}`);
  } catch (error) {
    result.error = String(error);
    try {
      const observation = await page.evaluate(() => {
        if (window.__INKSTORM_COMBAT_QA__) window.__INKSTORM_COMBAT_QA__.stopped = true;
        return window.__INKSTORM_COMBAT_QA__ ?? null;
      });
      await writeFile(`${out}/${test.id}-observations.json`, JSON.stringify(observation, null, 2));
      if (observation) result.analysis ??= analyze(observation, test);
      await capture('failure');
    } catch (captureError) { result.captureError = String(captureError); }
    throw error;
  } finally {
    await page.keyboard.up('Shift').catch(() => {}); await page.keyboard.up('s').catch(() => {}); await page.keyboard.up('w').catch(() => {});
    await context.close(); result.video = video ? await video.path() : null;
    await writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
  }
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (spawnError) throw spawnError;
    assert(server.exitCode === null, 'Owned preview exited before ready.');
    try { if ((await fetch(url)).ok) { ready = true; break; } } catch {}
    await delay(100);
  }
  assert(ready, 'Owned preview readiness timed out.');
  browser = await chromium.launch({ channel: 'chrome', headless: process.env.INKSTORM_HEADED !== '1' });
  for (const test of selected) {
    await runCase(test);
    console.log(JSON.stringify({ case: test.id, outcome: receipt.cases.at(-1).outcome }));
  }
  assert(!receipt.errors.length, 'Browser page/console errors occurred.');
  receipt.outcome = 'PASS';
} catch (error) { receipt.error = String(error); process.exitCode = 1; }
finally { await closeOwned(); if (receipt.outcome !== 'PASS') process.exitCode = 1; }
console.log(JSON.stringify({ outcome: receipt.outcome, out, cases: receipt.cases.map(({ id, outcome }) => ({ id, outcome })), error: receipt.error, cleanup: receipt.cleanup }));
