import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDir = fileURLToPath(new URL('../output/playwright/', import.meta.url));
const outputFile = `${outputDir}/performance.json`;
const configuredPort = process.env.PODRACING_PROFILE_PORT
  ? Number.parseInt(process.env.PODRACING_PROFILE_PORT, 10)
  : null;
if (configuredPort !== null && (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65_535)) {
  throw new Error(`Invalid PODRACING_PROFILE_PORT: ${process.env.PODRACING_PROFILE_PORT}`);
}
const port = configuredPort ?? await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address();
    if (!address || typeof address === 'string') {
      probe.close();
      reject(new Error('Could not allocate a performance-profile port.'));
      return;
    }
    probe.close((error) => error ? reject(error) : resolve(address.port));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;
const headed = process.env.PODRACING_HEADED === '1';
const skipBuild = process.env.PODRACING_SKIP_BUILD === '1';
const browserChannel = process.env.PODRACING_BROWSER === 'chromium' ? undefined : 'chrome';

await mkdir(outputDir, { recursive: true });

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: process.env,
      ...options,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error(`Timed out waiting for production preview at ${url}`);
}

function summarize(samples) {
  if (samples.length === 0) {
    return { count: 0, meanMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, over16_67Ratio: 0 };
  }
  const sorted = [...samples].sort((left, right) => left - right);
  const sum = samples.reduce((total, value) => total + value, 0);
  const percentile = (fraction) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
  return {
    count: samples.length,
    meanMs: sum / samples.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
    maxMs: sorted[sorted.length - 1] ?? 0,
    over16_67Ratio: samples.filter((sample) => sample > 1000 / 60 + 0.35).length / samples.length,
  };
}

function aggregateAttribution(programs) {
  const categories = new Map();
  for (const program of programs) {
    const existing = categories.get(program.category) ?? {
      category: program.category,
      drawCalls: 0,
      triangles: 0,
      lines: 0,
      points: 0,
      programCount: 0,
    };
    existing.drawCalls += program.drawCalls;
    existing.triangles += program.triangles;
    existing.lines += program.lines;
    existing.points += program.points;
    existing.programCount += 1;
    categories.set(program.category, existing);
  }
  return [...categories.values()].sort((left, right) => right.drawCalls - left.drawCalls);
}

function assertExpansionReceipt(snapshot, scenario, label, expectedEvent) {
  const galactic = snapshot?.galactic;
  if (!galactic || !Array.isArray(galactic.racers) || !Array.isArray(galactic.recentEvents)) {
    throw new Error(`${label} did not expose a complete Galactic Racer receipt`);
  }
  const player = galactic.racers.find((entry) => entry?.id === 'player')?.galactic;
  const event = galactic.recentEvents.find((entry) => (
    entry?.type === expectedEvent && entry?.racerId === 'player'
  ));
  if (!player || !event) throw new Error(`${label} did not emit player event ${expectedEvent}`);
  if (snapshot?.game?.reviewScenario !== scenario) {
    throw new Error(`${label} returned a mismatched expansion scenario receipt`);
  }
  const world = galactic.world;
  if (!world || !['projectiles', 'mines', 'hazards'].every((key) => Array.isArray(world[key]))) {
    throw new Error(`${label} exposed an incomplete Galactic Racer world receipt`);
  }
  return {
    eventTypes: galactic.recentEvents.map((entry) => entry.type),
    playerVehicleClass: player.vehicleClass,
    playerWreckPhase: player.wreck?.phase,
    projectiles: world.projectiles.length,
    mines: world.mines.length,
    hazards: world.hazards.length,
  };
}

// Installed before application code. It observes native WebGL calls without
// modifying Three.js or requiring a debug build of the game.
function installBrowserProfiler() {
  const state = {
    rafActive: false,
    rafLast: 0,
    rafIntervals: [],
    shaderErrors: [],
    nextProgramId: 1,
    drawEpoch: 0,
    drawPrograms: new Map(),
  };

  const shaderSources = new WeakMap();
  const programShaders = new WeakMap();
  const programMetadata = new WeakMap();

  function classify(source) {
    if (source.includes('outDepthMask') && source.includes('outNormal')) return 'mrt-depth-normal-prepass';
    if (source.includes('uPrepassTexel') && source.includes('uHullSilhouetteSuppression')) return 'sobel-composite';
    if (source.includes('uLineWidth') && source.includes('uInkColor')) return 'inverted-hull-outlines';
    if (source.includes('uSparkleColor') && source.includes('uCrestColor')) return 'terrain-beauty';
    if (source.includes('uRamp') && source.includes('uMatcap')) return 'cel-beauty';
    if (source.includes('uWakeColor')) return 'wake-ribbons';
    if (source.includes('uSandColor') && source.includes('uHotColor')) return 'sand-spray';
    if (source.includes('uWindStrength') && source.includes('uRimColor') && source.includes('uDustColor')) return 'crest-dust';
    if (source.includes('uDustColor') && source.includes('uRenderOrigin')) return 'ground-dust-rings';
    if (source.includes('uSpeed') && source.includes('vAlpha')) return 'speed-streaks';
    if (source.includes('uHot') && source.includes('vLocal')) return 'engine-exhaust';
    if (source.includes('uPower') && source.includes('movingBand')) return 'engine-coupling';
    if (source.includes('vVariation') && source.includes('uSunDirection')) return 'desert-landmarks';
    if (source.includes('vWorldDirection') && source.includes('uTime')) return 'sky-atmosphere';
    if (source.includes('uCore') && source.includes('uColor')) return 'sun-flares';
    if (source.includes('vDistance') && source.includes('uColor')) return 'course-ribbon';
    if (source.includes('tDiffuse') && source.includes('opacity')) return 'unlit-atmosphere';
    return 'other';
  }

  function triangleCount(mode, count, instances, gl) {
    if (mode === gl.TRIANGLES) return Math.floor(count / 3) * instances;
    if (mode === gl.TRIANGLE_STRIP || mode === gl.TRIANGLE_FAN) return Math.max(0, count - 2) * instances;
    return 0;
  }

  function lineCount(mode, count, instances, gl) {
    if (mode === gl.LINES) return Math.floor(count / 2) * instances;
    if (mode === gl.LINE_STRIP) return Math.max(0, count - 1) * instances;
    if (mode === gl.LINE_LOOP) return count * instances;
    return 0;
  }

  function patchContext(Context) {
    if (!Context || Context.prototype.__podracingProfilePatched) return;
    const proto = Context.prototype;
    Object.defineProperty(proto, '__podracingProfilePatched', { value: true });

    const originalShaderSource = proto.shaderSource;
    proto.shaderSource = function shaderSource(shader, source) {
      shaderSources.set(shader, source);
      return originalShaderSource.call(this, shader, source);
    };

    const originalAttachShader = proto.attachShader;
    proto.attachShader = function attachShader(program, shader) {
      let shaders = programShaders.get(program);
      if (!shaders) {
        shaders = [];
        programShaders.set(program, shaders);
      }
      shaders.push(shader);
      return originalAttachShader.call(this, program, shader);
    };

    const originalCompileShader = proto.compileShader;
    proto.compileShader = function compileShader(shader) {
      originalCompileShader.call(this, shader);
      if (!this.getShaderParameter(shader, this.COMPILE_STATUS)) {
        state.shaderErrors.push({
          stage: 'compile',
          log: this.getShaderInfoLog(shader) ?? 'Unknown shader compilation error',
          sourceStart: (shaderSources.get(shader) ?? '').slice(0, 500),
        });
      }
    };

    const originalLinkProgram = proto.linkProgram;
    proto.linkProgram = function linkProgram(program) {
      originalLinkProgram.call(this, program);
      const shaders = programShaders.get(program) ?? [];
      let combined = '';
      for (const shader of shaders) combined += `\n${shaderSources.get(shader) ?? ''}`;
      programMetadata.set(program, {
        id: state.nextProgramId,
        category: classify(combined),
      });
      state.nextProgramId += 1;
      if (!this.getProgramParameter(program, this.LINK_STATUS)) {
        state.shaderErrors.push({
          stage: 'link',
          log: this.getProgramInfoLog(program) ?? 'Unknown shader link error',
          category: classify(combined),
        });
      }
    };

    const originalUseProgram = proto.useProgram;
    proto.useProgram = function useProgram(program) {
      this.__podracingCurrentProgram = program;
      return originalUseProgram.call(this, program);
    };

    function record(gl, mode, count, instances) {
      const program = gl.__podracingCurrentProgram;
      const metadata = program ? programMetadata.get(program) : undefined;
      const id = metadata?.id ?? 0;
      let totals = state.drawPrograms.get(id);
      if (!totals) {
        totals = {
          id,
          category: metadata?.category ?? 'unclassified',
          drawCalls: 0,
          triangles: 0,
          lines: 0,
          points: 0,
        };
        state.drawPrograms.set(id, totals);
      }
      totals.drawCalls += 1;
      totals.triangles += triangleCount(mode, count, instances, gl);
      totals.lines += lineCount(mode, count, instances, gl);
      if (mode === gl.POINTS) totals.points += count * instances;
    }

    const originalDrawArrays = proto.drawArrays;
    proto.drawArrays = function drawArrays(mode, first, count) {
      record(this, mode, count, 1);
      return originalDrawArrays.call(this, mode, first, count);
    };
    const originalDrawElements = proto.drawElements;
    proto.drawElements = function drawElements(mode, count, type, offset) {
      record(this, mode, count, 1);
      return originalDrawElements.call(this, mode, count, type, offset);
    };
    if (proto.drawArraysInstanced) {
      const originalDrawArraysInstanced = proto.drawArraysInstanced;
      proto.drawArraysInstanced = function drawArraysInstanced(mode, first, count, instances) {
        record(this, mode, count, instances);
        return originalDrawArraysInstanced.call(this, mode, first, count, instances);
      };
    }
    if (proto.drawElementsInstanced) {
      const originalDrawElementsInstanced = proto.drawElementsInstanced;
      proto.drawElementsInstanced = function drawElementsInstanced(mode, count, type, offset, instances) {
        record(this, mode, count, instances);
        return originalDrawElementsInstanced.call(this, mode, count, type, offset, instances);
      };
    }
  }

  patchContext(globalThis.WebGLRenderingContext);
  patchContext(globalThis.WebGL2RenderingContext);

  function rafTick(time) {
    if (state.rafActive) {
      if (state.rafLast > 0 && state.rafIntervals.length < 20_000) {
        state.rafIntervals.push(time - state.rafLast);
      }
      state.rafLast = time;
    }
    requestAnimationFrame(rafTick);
  }
  requestAnimationFrame(rafTick);

  globalThis.__PODRACING_PROFILE__ = {
    startRaf() {
      state.rafIntervals.length = 0;
      state.rafLast = 0;
      state.rafActive = true;
    },
    stopRaf() {
      state.rafActive = false;
      return state.rafIntervals.slice();
    },
    rafCount() {
      return state.rafIntervals.length;
    },
    resetDraws() {
      state.drawEpoch += 1;
      state.drawPrograms.clear();
    },
    snapshotDraws() {
      return {
        epoch: state.drawEpoch,
        programs: Array.from(state.drawPrograms.values(), (entry) => ({ ...entry })),
      };
    },
    shaderErrors() {
      return state.shaderErrors.slice();
    },
  };
}

if (!skipBuild) {
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']);
}

const server = spawn(
  process.execPath,
  ['./node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'], env: process.env },
);
let serverOutput = '';
server.stdout?.on('data', (chunk) => { serverOutput += chunk.toString(); });
server.stderr?.on('data', (chunk) => { serverOutput += chunk.toString(); });

let browser;
const browserErrors = [];
const report = {
  generatedAt: new Date().toISOString(),
  thresholds: {
    refreshTargetHz: 60,
    targetFrameMs: 1000 / 60,
    softWorkBudgetMs: 13.5,
    steadyStateDrawCalls: 150,
    highDensityReviewDrawCalls: 260,
    trianglesPerCompleteFrame: 600_000,
  },
  environment: {
    browserRequested: browserChannel ?? 'bundled chromium',
    headless: !headed,
    viewportCss: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    timingCaveat: 'RAF intervals measure browser cadence, not asynchronous GPU execution time. Headless Chrome compositor scheduling and SwiftShader (when selected) are not a substitute for a headed trace on the target M5 Pro.',
  },
  deterministic: null,
  realtime: null,
  drawAttribution: [],
  expansionSupported: false,
  browserErrors,
};

try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({
    channel: browserChannel,
    headless: !headed,
    args: ['--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.addInitScript(installBrowserProfiler);
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push({ source: 'console', message: message.text() });
  });
  page.on('pageerror', (error) => browserErrors.push({ source: 'pageerror', message: error.message }));
  page.on('requestfailed', (request) => browserErrors.push({
    source: 'requestfailed',
    message: `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`,
  }));

  await page.goto(`${baseUrl}/?capture=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__PODRACING__?.ready === true);
  report.expansionSupported = await page.evaluate(() => {
    const api = window.__PODRACING__;
    return (api?.version ?? 1) >= 2
      && typeof api?.setScenario === 'function'
      && typeof api?.setReviewCamera === 'function';
  });

  const environment = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2');
    const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemoryGiB: navigator.deviceMemory ?? null,
      screen: { width: screen.width, height: screen.height, dpr: devicePixelRatio },
      webgl: gl ? {
        vendor: gl.getParameter(debugInfo?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR),
        renderer: gl.getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
      } : null,
    };
  });
  Object.assign(report.environment, environment);

  const attributionViews = [
    { name: 'countdown-hero', preset: 'countdown', camera: 'hero', expansion: false },
    { name: 'race-chase', preset: 'race', camera: 'chase', expansion: false },
    { name: 'drift-side', preset: 'drift', camera: 'side', expansion: false },
    ...(report.expansionSupported ? [
      { name: 'weapon-fired-chase', preset: 'weapon-fired', camera: 'chase', expansion: true, expectedEvent: 'heat-lance-fired' },
      { name: 'wreck-chase', preset: 'wreck', camera: 'chase', expansion: true, expectedEvent: 'wreck' },
      { name: 'combat-stress-chase', preset: 'combat-stress', camera: 'chase', expansion: true, expectedEvent: 'heat-lance-fired' },
    ] : []),
  ];
  for (const view of attributionViews) {
    const raw = await page.evaluate(({ preset, camera, expansion }) => {
      const api = window.__PODRACING__;
      const profile = window.__PODRACING_PROFILE__;
      if (!api || !profile) throw new Error('Profiling APIs are unavailable');
      api.setCaptureMode(true);
      if (expansion) {
        if (!api.setScenario || !api.setReviewCamera) {
          throw new Error('Expansion profiling API disappeared');
        }
        api.setScenario(preset);
        api.setReviewCamera(camera);
      } else {
        api.setPreset(preset);
        api.setCamera(camera);
      }
      profile.resetDraws();
      api.step(1);
      return { draw: profile.snapshotDraws(), snapshot: api.snapshot() };
    }, view);
    const galacticReceipt = view.expansion
      ? assertExpansionReceipt(raw.snapshot, view.preset, view.name, view.expectedEvent)
      : null;
    report.drawAttribution.push({
      ...view,
      renderer: raw.snapshot.renderer,
      categories: aggregateAttribution(raw.draw.programs),
      ...(galacticReceipt ? { galacticReceipt } : {}),
    });
  }

  const deterministic = await page.evaluate(async () => {
    const api = window.__PODRACING__;
    const profile = window.__PODRACING_PROFILE__;
    if (!api || !profile) throw new Error('Profiling APIs are unavailable');
    api.setCaptureMode(true);
    api.setPreset('race');
    api.setCamera('chase');
    profile.startRaf();
    const snapshots = [];
    const stepWorkMs = [];
    for (let segment = 0; segment < 8; segment += 1) {
      const started = performance.now();
      api.step(120);
      stepWorkMs.push(performance.now() - started);
      snapshots.push(api.snapshot());
      await new Promise((resolve) => setTimeout(resolve, 125));
    }
    const singleFrameWorkMs = [];
    for (let frame = 0; frame < 24; frame += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const started = performance.now();
      api.step(1);
      singleFrameWorkMs.push(performance.now() - started);
    }
    return {
      rafIntervals: profile.stopRaf(),
      singleFrameWorkMs,
      stepWorkMs,
      snapshots,
    };
  });
  report.deterministic = {
    preset: 'race',
    camera: 'chase',
    fixedStepsPerSegment: 120,
    rafIntervalsMs: deterministic.rafIntervals,
    rafSummary: summarize(deterministic.rafIntervals),
    singleFrameWorkMs: deterministic.singleFrameWorkMs,
    singleFrameWorkSummary: summarize(deterministic.singleFrameWorkMs),
    stepWorkMs: deterministic.stepWorkMs,
    stepWorkSummary: summarize(deterministic.stepWorkMs),
    reviewSnapshots: deterministic.snapshots,
  };
  await page.screenshot({
    path: `${outputDir}/performance-deterministic.png`,
    animations: 'disabled',
  });

  await page.evaluate(() => {
    const api = window.__PODRACING__;
    const profile = window.__PODRACING_PROFILE__;
    if (!api || !profile) throw new Error('Profiling APIs are unavailable');
    api.setCaptureMode(false);
    profile.startRaf();
  });
  const realtimeSnapshots = [];
  const realtimePhaseEnds = [];
  const markRealtimePhase = async (input, durationMs) => {
    const intervalEnd = await page.evaluate(() => window.__PODRACING_PROFILE__?.rafCount() ?? 0);
    realtimePhaseEnds.push({ input, durationMs, intervalEnd });
  };
  realtimeSnapshots.push(await page.evaluate(() => window.__PODRACING__?.snapshot()));
  await page.keyboard.down('w');
  await page.waitForTimeout(1_500);
  await markRealtimePhase('throttle', 1_500);
  await page.keyboard.down('d');
  await page.waitForTimeout(900);
  await markRealtimePhase('throttle + right', 900);
  await page.keyboard.down('Space');
  await page.waitForTimeout(1_100);
  await markRealtimePhase('throttle + right + drift', 1_100);
  realtimeSnapshots.push(await page.evaluate(() => window.__PODRACING__?.snapshot()));
  await page.keyboard.up('Space');
  await page.keyboard.up('d');
  await page.keyboard.down('Shift');
  await page.waitForTimeout(1_000);
  await markRealtimePhase('throttle + boost', 1_000);
  await page.keyboard.up('Shift');
  await page.keyboard.down('a');
  await page.waitForTimeout(900);
  await markRealtimePhase('throttle + left', 900);
  await page.keyboard.up('a');
  await page.waitForTimeout(600);
  await markRealtimePhase('throttle', 600);
  await page.keyboard.up('w');
  realtimeSnapshots.push(await page.evaluate(() => window.__PODRACING__?.snapshot()));
  const realtimeIntervals = await page.evaluate(() => window.__PODRACING_PROFILE__?.stopRaf() ?? []);
  let phaseStart = 0;
  const realtimePath = realtimePhaseEnds.map((phase) => {
    const phaseIntervals = realtimeIntervals.slice(phaseStart, phase.intervalEnd);
    phaseStart = phase.intervalEnd;
    return {
      input: phase.input,
      durationMs: phase.durationMs,
      intervalRange: [phaseStart - phaseIntervals.length, phaseStart],
      rafSummary: summarize(phaseIntervals),
    };
  });
  report.realtime = {
    path: realtimePath,
    rafIntervalsMs: realtimeIntervals,
    rafSummary: summarize(realtimeIntervals),
    reviewSnapshots: realtimeSnapshots,
  };
  await page.screenshot({
    path: `${outputDir}/performance-realtime.png`,
    animations: 'disabled',
  });

  const shaderErrors = await page.evaluate(() => window.__PODRACING_PROFILE__?.shaderErrors() ?? []);
  for (const error of shaderErrors) browserErrors.push({ source: 'shader', ...error });
} catch (error) {
  browserErrors.push({
    source: 'profile-script',
    message: error instanceof Error ? error.stack ?? error.message : String(error),
  });
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');

  // Turn the performance receipt into a real gate. RAF p95 is intentionally
  // reported but not failed in headless Chrome because compositor cadence can
  // alternate around vsync; deterministic main-thread work, steady draw
  // submissions, and median realtime cadence are stable signals here.
  if (report.deterministic?.singleFrameWorkSummary.p95Ms > report.thresholds.softWorkBudgetMs) {
    browserErrors.push({
      source: 'performance-budget',
      message: `Single-frame work p95 ${report.deterministic.singleFrameWorkSummary.p95Ms.toFixed(2)}ms exceeds ${report.thresholds.softWorkBudgetMs}ms.`,
    });
  }
  if (report.realtime?.rafSummary.p50Ms > report.thresholds.targetFrameMs + 0.85) {
    browserErrors.push({
      source: 'performance-budget',
      message: `Realtime RAF p50 ${report.realtime.rafSummary.p50Ms.toFixed(2)}ms misses the 60 Hz cadence gate.`,
    });
  }
  const steadySnapshots = report.realtime?.reviewSnapshots.slice(1) ?? [];
  const steadyPeakCalls = Math.max(0, ...steadySnapshots.map((snapshot) => snapshot?.renderer?.calls ?? 0));
  if (steadyPeakCalls > report.thresholds.steadyStateDrawCalls) {
    browserErrors.push({
      source: 'performance-budget',
      message: `Steady draw calls ${steadyPeakCalls} exceed ${report.thresholds.steadyStateDrawCalls}.`,
    });
  }
  const reviewPeakCalls = Math.max(0, ...report.drawAttribution.map((view) => view.renderer?.calls ?? 0));
  const reviewPeakTriangles = Math.max(0, ...report.drawAttribution.map((view) => view.renderer?.triangles ?? 0));
  if (reviewPeakCalls > report.thresholds.highDensityReviewDrawCalls) {
    browserErrors.push({
      source: 'performance-budget',
      message: `Review draw calls ${reviewPeakCalls} exceed ${report.thresholds.highDensityReviewDrawCalls}.`,
    });
  }
  if (reviewPeakTriangles > report.thresholds.trianglesPerCompleteFrame) {
    browserErrors.push({
      source: 'performance-budget',
      message: `Review triangles ${reviewPeakTriangles} exceed ${report.thresholds.trianglesPerCompleteFrame}.`,
    });
  }
  report.serverOutput = serverOutput.trim();
  await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`);
}

if (browserErrors.length > 0) {
  throw new Error(`Performance profile failed with ${browserErrors.length} browser/shader error(s). See ${outputFile}`);
}

console.log(`Retina Chrome performance profile written to ${outputFile}`);
