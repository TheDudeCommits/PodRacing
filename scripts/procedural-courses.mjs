import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDir = process.env.INKSTORM_OUTPUT ?? fileURLToPath(new URL('../output/playwright/', import.meta.url));
const REQUIRED_SECTIONS = [
  'start-straight',
  'fast-straight',
  'launch-crest',
  'wide-sweeper',
  'narrow-canyon',
  'chicane',
  'hairpin',
  'recovery-straight',
];

const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address();
    if (!address || typeof address === 'string') {
      probe.close();
      reject(new Error('Could not allocate a procedural-course capture port.'));
      return;
    }
    probe.close((error) => error ? reject(error) : resolve(address.port));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;

function waitForServer(url, timeoutMs = 30_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      fetch(url)
        .then((response) => response.ok ? resolve() : Promise.reject())
        .catch(() => {
          if (Date.now() - started > timeoutMs) reject(new Error(`Timed out waiting for ${url}`));
          else setTimeout(probe, 150);
        });
    };
    probe();
  });
}

function hashJson(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function finiteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number; received ${String(value)}`);
  }
  return value;
}

function courseFromSnapshot(snapshot, label) {
  const raw = snapshot?.game?.course;
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${label} omitted game.course from the review receipt.`);
  }
  const seed = finiteNumber(raw.seed, `${label} seed`) >>> 0;
  const ordinal = finiteNumber(raw.ordinal, `${label} ordinal`);
  const totalLength = finiteNumber(raw.totalLength, `${label} totalLength`);
  const checkpointCount = finiteNumber(raw.checkpointCount, `${label} checkpointCount`);
  if (typeof raw.signature !== 'string' || raw.signature.length < 6) {
    throw new Error(`${label} exposed an invalid course signature.`);
  }
  if (!Number.isSafeInteger(ordinal) || ordinal < 0) {
    throw new Error(`${label} exposed an invalid race ordinal ${ordinal}.`);
  }
  if (!Number.isSafeInteger(checkpointCount) || checkpointCount < 3) {
    throw new Error(`${label} exposed only ${checkpointCount} checkpoints.`);
  }
  if (totalLength < 3_000 || totalLength > 10_000) {
    throw new Error(`${label} course length ${totalLength.toFixed(1)}m is outside the playable envelope.`);
  }

  const bounds = raw.bounds;
  if (!bounds || typeof bounds !== 'object') throw new Error(`${label} omitted course bounds.`);
  const normalizedBounds = {
    minX: finiteNumber(bounds.minX, `${label} bounds.minX`),
    maxX: finiteNumber(bounds.maxX, `${label} bounds.maxX`),
    minZ: finiteNumber(bounds.minZ, `${label} bounds.minZ`),
    maxZ: finiteNumber(bounds.maxZ, `${label} bounds.maxZ`),
  };
  const spanX = normalizedBounds.maxX - normalizedBounds.minX;
  const spanZ = normalizedBounds.maxZ - normalizedBounds.minZ;
  if (spanX < 700 || spanZ < 700 || spanX > 6_000 || spanZ > 6_000) {
    throw new Error(`${label} bounds are implausible: ${spanX.toFixed(1)}m x ${spanZ.toFixed(1)}m.`);
  }

  const sectionCounts = raw.sectionCounts;
  if (!sectionCounts || typeof sectionCounts !== 'object') {
    throw new Error(`${label} omitted section counts.`);
  }
  for (const section of REQUIRED_SECTIONS) {
    if (!Number.isSafeInteger(sectionCounts[section]) || sectionCounts[section] < 1) {
      throw new Error(`${label} omitted required ${section} geometry.`);
    }
  }

  if (!Array.isArray(raw.samples) || raw.samples.length < 24) {
    throw new Error(`${label} exposed fewer than 24 course audit samples.`);
  }
  const samples = raw.samples.map((sample, index) => {
    if (!sample || typeof sample !== 'object') throw new Error(`${label} sample ${index} is invalid.`);
    const normalized = {
      x: finiteNumber(sample.x, `${label} sample ${index}.x`),
      z: finiteNumber(sample.z, `${label} sample ${index}.z`),
      width: finiteNumber(sample.width, `${label} sample ${index}.width`),
      tag: sample.tag,
    };
    if (normalized.width < 10 || normalized.width > 60) {
      throw new Error(`${label} sample ${index} has unsafe width ${normalized.width}.`);
    }
    if (typeof normalized.tag !== 'string' || !REQUIRED_SECTIONS.includes(normalized.tag)) {
      throw new Error(`${label} sample ${index} has unknown section ${String(normalized.tag)}.`);
    }
    if (normalized.x < normalizedBounds.minX - 2 || normalized.x > normalizedBounds.maxX + 2
      || normalized.z < normalizedBounds.minZ - 2 || normalized.z > normalizedBounds.maxZ + 2) {
      throw new Error(`${label} sample ${index} lies outside its advertised bounds.`);
    }
    return normalized;
  });

  let chordLength = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const current = samples[index];
    const next = samples[(index + 1) % samples.length];
    chordLength += Math.hypot(next.x - current.x, next.z - current.z);
  }
  const chordRatio = chordLength / totalLength;
  if (chordRatio < 0.72 || chordRatio > 1.03) {
    throw new Error(`${label} audit polyline does not agree with arc length (${chordRatio.toFixed(3)}).`);
  }
  const intersections = countSelfIntersections(samples);
  if (intersections !== 0) {
    throw new Error(`${label} centerline self-intersects ${intersections} time(s).`);
  }

  return {
    seed,
    signature: raw.signature,
    ordinal,
    totalLength,
    checkpointCount,
    bounds: normalizedBounds,
    sectionCounts: Object.fromEntries(REQUIRED_SECTIONS.map((section) => [section, sectionCounts[section]])),
    samples,
    sampleDigest: hashJson(samples),
    audit: { spanX, spanZ, chordLength, chordRatio, intersections },
  };
}

function orientation(a, b, c) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function segmentsCross(a, b, c, d) {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  const epsilon = 1e-5;
  return ((abC > epsilon && abD < -epsilon) || (abC < -epsilon && abD > epsilon))
    && ((cdA > epsilon && cdB < -epsilon) || (cdA < -epsilon && cdB > epsilon));
}

function countSelfIntersections(samples) {
  let intersections = 0;
  const count = samples.length;
  for (let left = 0; left < count; left += 1) {
    const leftNext = (left + 1) % count;
    for (let right = left + 1; right < count; right += 1) {
      const rightNext = (right + 1) % count;
      if (left === right || leftNext === right || rightNext === left) continue;
      if (left === 0 && rightNext === 0) continue;
      if (segmentsCross(samples[left], samples[leftNext], samples[right], samples[rightNext])) {
        intersections += 1;
      }
    }
  }
  return intersections;
}

function sampleRms(left, right) {
  if (left.samples.length !== right.samples.length) {
    throw new Error(`Course sample counts changed: ${left.samples.length} -> ${right.samples.length}.`);
  }
  const squared = left.samples.reduce((sum, sample, index) => {
    const other = right.samples[index];
    return sum + (sample.x - other.x) ** 2 + (sample.z - other.z) ** 2;
  }, 0);
  return Math.sqrt(squared / left.samples.length);
}

/**
 * Rotation, translation and mirroring are presentation changes, not new track
 * layouts by themselves. Absolute turn angles remove all three transforms, so
 * this receipt only passes when the actual sequence of bends changes.
 */
function turningProfile(course) {
  const samples = course.samples;
  return samples.map((current, index) => {
    const previous = samples[(index - 1 + samples.length) % samples.length];
    const next = samples[(index + 1) % samples.length];
    const incomingX = current.x - previous.x;
    const incomingZ = current.z - previous.z;
    const outgoingX = next.x - current.x;
    const outgoingZ = next.z - current.z;
    return Math.abs(Math.atan2(
      incomingX * outgoingZ - incomingZ * outgoingX,
      incomingX * outgoingX + incomingZ * outgoingZ,
    ));
  });
}

function turningProfileRms(left, right) {
  const a = turningProfile(left);
  const b = turningProfile(right);
  if (a.length !== b.length) throw new Error('Course turning profiles use different resolutions.');
  return Math.sqrt(a.reduce((sum, angle, index) => sum + (angle - b[index]) ** 2, 0) / a.length);
}

function compareMasks(left, right) {
  if (left.length !== right.length) throw new Error('Minimap masks use different resolutions.');
  let intersection = 0;
  let union = 0;
  let changed = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] !== 0;
    const b = right[index] !== 0;
    if (a && b) intersection += 1;
    if (a || b) union += 1;
    if (a !== b) changed += 1;
  }
  return {
    intersection,
    union,
    changed,
    iou: union === 0 ? 1 : intersection / union,
    changedFraction: union === 0 ? 0 : changed / union,
  };
}

function attachErrors(page, label, errors) {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`${label} page: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (request.url().startsWith('blob:')) return;
    errors.push(`${label} request: ${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`);
  });
}

async function waitForGame(page) {
  await page.waitForFunction(() => window.__PODRACING__?.ready === true);
  await page.waitForFunction(() => window.__PODRACING__?.snapshot().game.awaitingStart === true);
}

async function selectExpedition(page) {
  await page.evaluate(() => window.__PODRACING__?.setCaptureMode(false));
  await page.locator('[data-action="select-event"][data-event-id="open-expedition"]').click();
  await page.waitForFunction(() => {
    const game = window.__PODRACING__?.snapshot().game;
    return game?.mastery?.eventId === 'open-expedition' && game?.competitionProfile === 'chaos'
      && game?.awaitingStart === true;
  });
}

async function retryFromPause(page) {
  await page.evaluate(() => window.__PODRACING__?.setCaptureMode(false));
  await page.keyboard.down('p');
  await page.waitForTimeout(100);
  await page.keyboard.up('p');
  await page.locator('[data-action="retry-race"][data-solo-pause]').click();
  await page.waitForFunction(() => window.__PODRACING__?.snapshot().game.awaitingStart === false);
}

async function beginRace(page) {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__PODRACING__?.snapshot().game.awaitingStart === false);
}

async function stage(page, preset, camera, frames = 1) {
  await page.evaluate(({ nextPreset, nextCamera, frameCount }) => {
    const api = window.__PODRACING__;
    if (!api) throw new Error('Review API disappeared while staging a procedural course.');
    api.setCaptureMode(true);
    api.setPreset(nextPreset);
    api.setCamera(nextCamera);
    api.step(frameCount);
  }, { nextPreset: preset, nextCamera: camera, frameCount: frames });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function snapshotCourse(page, label) {
  const snapshot = await page.evaluate(() => window.__PODRACING__?.snapshot());
  return courseFromSnapshot(snapshot, label);
}

async function captureMinimap(page, filename) {
  await page.evaluate(() => {
    document.querySelector('#procedural-course-map-audit')?.remove();
    const style = document.createElement('style');
    style.id = 'procedural-course-map-audit';
    style.textContent = `
      .pod-hud__map {
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
        position: fixed !important;
        left: 400px !important;
        top: 112px !important;
        width: 640px !important;
        height: 640px !important;
        z-index: 99999 !important;
      }
      .pod-hud__minimap {
        display: block !important;
        width: 640px !important;
        height: 640px !important;
        background: #100b1b !important;
      }
    `;
    document.head.append(style);
  });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-hud="minimap"]');
    return canvas instanceof HTMLCanvasElement
      && canvas.getBoundingClientRect().width >= 639
      && canvas.width >= 1_200;
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  const audit = await page.evaluate(() => {
    const source = document.querySelector('[data-hud="minimap"]');
    if (!(source instanceof HTMLCanvasElement)) throw new Error('Minimap canvas disappeared.');
    const reduced = document.createElement('canvas');
    reduced.width = 256;
    reduced.height = 256;
    const context = reduced.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Could not allocate minimap audit context.');
    context.clearRect(0, 0, 256, 256);
    context.drawImage(source, 0, 0, 256, 256);
    const pixels = context.getImageData(0, 0, 256, 256).data;
    const mask = new Array(256 * 256);
    let inkPixels = 0;
    for (let index = 0; index < mask.length; index += 1) {
      const ink = pixels[index * 4 + 3] > 16 ? 1 : 0;
      mask[index] = ink;
      inkPixels += ink;
    }
    return { mask, inkPixels, sourceWidth: source.width, sourceHeight: source.height };
  });
  if (audit.inkPixels < 500) throw new Error(`Minimap ${filename} contains too little visible course ink.`);
  const png = await page.locator('[data-hud="minimap"]').screenshot({
    path: `${outputDir}/${filename}`,
    animations: 'disabled',
  });
  await page.evaluate(() => document.querySelector('#procedural-course-map-audit')?.remove());
  return {
    mask: Uint8Array.from(audit.mask),
    inkPixels: audit.inkPixels,
    sourceWidth: audit.sourceWidth,
    sourceHeight: audit.sourceHeight,
    pngSha256: createHash('sha256').update(png).digest('hex'),
  };
}

async function captureTrackViews(page, slug) {
  await stage(page, 'desert', 'course', 1);
  await page.screenshot({ path: `${outputDir}/${slug}-canyon-course.png`, animations: 'disabled' });
  await stage(page, 'airtime', 'cockpit', 28);
  await page.screenshot({ path: `${outputDir}/${slug}-launch-cockpit.png`, animations: 'disabled' });
}

async function returnToSelector(page) {
  await stage(page, 'finish', 'hero', 1);
  await page.evaluate(() => window.__PODRACING__?.setCaptureMode(false));
  await page.locator('.pod-hud__results-actions [data-action="return-to-garage"]').click();
  await page.waitForFunction(() => window.__PODRACING__?.snapshot().game.awaitingStart === true);
}

async function captureStartedCourse(page, label, slug, captureWorldViews = false) {
  await beginRace(page);
  await stage(page, 'countdown', 'hero', 1);
  const course = await snapshotCourse(page, label);
  const minimap = await captureMinimap(page, `${slug}-minimap.png`);
  if (captureWorldViews) await captureTrackViews(page, slug);
  return { course, minimap };
}

await mkdir(outputDir, { recursive: true });
const server = spawn(
  process.execPath,
  ['./node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'], env: process.env },
);

let browser;
const contexts = [];
const browserErrors = [];
const environments = [];

try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({ channel: 'chrome', headless: true });

  const createPage = async (label, url = `${baseUrl}/?capture=1`) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
    });
    contexts.push(context);
    const page = await context.newPage();
    attachErrors(page, label, browserErrors);
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForGame(page);
    environments.push({ label, ...await frozenBuildReceipt(page, browser) });
    return page;
  };

  console.log('Procedural: local browser ready; checking fixed Time Attack before expedition generation.');
  // Time Attack is the deliberate default and must retain its exact course on
  // retry. Use the actual pause/retry buttons, without staging a finish.
  const fixedPage = await createPage('fixed-time-attack', baseUrl);
  const fixedBoot = await fixedPage.evaluate(() => window.__PODRACING__?.snapshot());
  if (fixedBoot?.game?.mastery?.eventId !== 'inkstorm-trial'
    || fixedBoot?.game?.competitionProfile !== 'time-trial'
    || fixedBoot?.game?.course?.seed !== 0x494e4b53) {
    throw new Error('Default Time Attack did not boot on the fixed Inkstorm hero course.');
  }
  await beginRace(fixedPage);
  const fixedFirst = await snapshotCourse(fixedPage, 'Fixed Time Attack');
  await retryFromPause(fixedPage);
  const fixedRetry = await snapshotCourse(fixedPage, 'Fixed Time Attack retry');
  if (fixedFirst.seed !== fixedRetry.seed || fixedFirst.signature !== fixedRetry.signature
    || fixedFirst.sampleDigest !== fixedRetry.sampleDigest) {
    throw new Error('Retry changed the fixed Time Attack course.');
  }
  const fixedRetryProfile = await fixedPage.evaluate(() => window.__PODRACING__?.snapshot().game.competitionProfile);
  if (fixedRetryProfile !== 'time-trial') throw new Error('Time Attack retry silently changed competition rules.');
  await fixedPage.screenshot({ path: `${outputDir}/procedural-fixed-time-attack-retry.png`, animations: 'disabled' });
  await fixedPage.context().close();

  // Explicitly selecting Open Expedition enables fresh courses. Retry keeps
  // the same layout; Back to Hangar creates the next expedition race.
  const soloPage = await createPage('solo-sequence');
  await selectExpedition(soloPage);
  const first = await captureStartedCourse(
    soloPage,
    'First solo race',
    'procedural-course-a',
    true,
  );
  await retryFromPause(soloPage);
  const expeditionRetry = await snapshotCourse(soloPage, 'Open Expedition retry');
  if (expeditionRetry.seed !== first.course.seed
    || expeditionRetry.signature !== first.course.signature
    || expeditionRetry.sampleDigest !== first.course.sampleDigest) {
    throw new Error('Retry changed the selected Open Expedition course.');
  }
  await returnToSelector(soloPage);
  const rematch = await captureStartedCourse(
    soloPage,
    'Solo rematch',
    'procedural-course-b',
    true,
  );
  const soloRms = sampleRms(first.course, rematch.course);
  const soloTurningRms = turningProfileRms(first.course, rematch.course);
  const soloMaskDifference = compareMasks(first.minimap.mask, rematch.minimap.mask);
  if (first.course.seed === rematch.course.seed) throw new Error('Solo rematch reused the previous course seed.');
  if (first.course.signature === rematch.course.signature) throw new Error('Solo rematch reused the previous course signature.');
  if (first.course.sampleDigest === rematch.course.sampleDigest) throw new Error('Solo rematch reused identical sampled geometry.');
  if (rematch.course.ordinal <= first.course.ordinal) {
    throw new Error(`Solo race ordinal did not advance: ${first.course.ordinal} -> ${rematch.course.ordinal}.`);
  }
  if (soloRms < 25) throw new Error(`Solo rematch moved its sampled centerline only ${soloRms.toFixed(2)}m RMS.`);
  if (soloTurningRms < 0.04) {
    throw new Error(`Solo rematch changed its rotation-invariant turn profile only ${soloTurningRms.toFixed(4)} radians RMS.`);
  }
  if (soloMaskDifference.changedFraction < 0.08) {
    throw new Error(`Solo rematch silhouette changed only ${(soloMaskDifference.changedFraction * 100).toFixed(1)}%.`);
  }
  await soloPage.context().close();

  // Fresh capture sessions must replay the same deterministic seed and pixels.
  const deterministicPageA = await createPage('deterministic-a');
  const deterministicPageB = await createPage('deterministic-b');
  await Promise.all([selectExpedition(deterministicPageA), selectExpedition(deterministicPageB)]);
  const deterministicA = await captureStartedCourse(
    deterministicPageA,
    'Deterministic replay A',
    'procedural-course-deterministic-a',
  );
  const deterministicB = await captureStartedCourse(
    deterministicPageB,
    'Deterministic replay B',
    'procedural-course-deterministic-b',
  );
  const deterministicMaskDifference = compareMasks(deterministicA.minimap.mask, deterministicB.minimap.mask);
  if (deterministicA.course.seed !== deterministicB.course.seed
    || deterministicA.course.signature !== deterministicB.course.signature
    || deterministicA.course.sampleDigest !== deterministicB.course.sampleDigest
    || JSON.stringify(deterministicA.course.samples) !== JSON.stringify(deterministicB.course.samples)) {
    throw new Error('The same capture seed did not reproduce identical course geometry.');
  }
  if (deterministicMaskDifference.changed !== 0
    || deterministicA.minimap.pngSha256 !== deterministicB.minimap.pngSha256) {
    throw new Error(`Same-seed minimaps were not pixel-identical: ${JSON.stringify({
      changedPixels: deterministicMaskDifference.changed,
      a: deterministicA.minimap.pngSha256,
      b: deterministicB.minimap.pngSha256,
    })}`);
  }
  await Promise.all([
    deterministicPageA.context().close(),
    deterministicPageB.context().close(),
  ]);

  // A real signaling + data-channel room proves the host seed rebuilds both
  // render/simulation courses before the first authoritative racing snapshot.
  const hostPage = await createPage('room-host', baseUrl);
  const guestPage = await createPage('room-guest', baseUrl);
  await hostPage.locator('[data-action="create-room"]').click();
  await hostPage.waitForFunction(() => {
    const room = window.__PODRACING__?.snapshot().game.onlineRoom;
    return room?.role === 'host' && room?.status === 'ready' && room?.code?.length === 6;
  }, undefined, { timeout: 20_000 });
  const roomCode = await hostPage.evaluate(() => window.__PODRACING__?.snapshot().game.onlineRoom.code);
  await guestPage.locator('[data-hud="room-code-input"]').fill(roomCode);
  await guestPage.locator('[data-action="join-room"]').click();
  await Promise.all([
    hostPage.waitForFunction(() => window.__PODRACING__?.snapshot().game.onlineRoom?.members?.length === 2, undefined, { timeout: 20_000 }),
    guestPage.waitForFunction(() => {
      const room = window.__PODRACING__?.snapshot().game.onlineRoom;
      return room?.role === 'guest' && room?.members?.length === 2;
    }, undefined, { timeout: 20_000 }),
  ]);
  await hostPage.keyboard.press('Space');
  await Promise.all([
    hostPage.waitForFunction(() => window.__PODRACING__?.snapshot().game.awaitingStart === false),
    guestPage.waitForFunction(() => window.__PODRACING__?.snapshot().game.awaitingStart === false, undefined, { timeout: 15_000 }),
  ]);
  await Promise.all([
    hostPage.evaluate(() => window.__PODRACING__?.setCaptureMode(true)),
    guestPage.evaluate(() => window.__PODRACING__?.setCaptureMode(true)),
  ]);
  const hostCourse = await snapshotCourse(hostPage, 'Room host');
  const guestCourse = await snapshotCourse(guestPage, 'Room guest');
  if (hostCourse.seed !== guestCourse.seed
    || hostCourse.signature !== guestCourse.signature
    || hostCourse.sampleDigest !== guestCourse.sampleDigest
    || JSON.stringify(hostCourse.samples) !== JSON.stringify(guestCourse.samples)) {
    throw new Error(`Room clients generated different courses: ${JSON.stringify({
      host: { seed: hostCourse.seed, signature: hostCourse.signature, digest: hostCourse.sampleDigest },
      guest: { seed: guestCourse.seed, signature: guestCourse.signature, digest: guestCourse.sampleDigest },
    })}`);
  }
  await Promise.all([
    stage(hostPage, 'countdown', 'hero', 1),
    stage(guestPage, 'countdown', 'hero', 1),
  ]);
  const [hostMap, guestMap] = await Promise.all([
    captureMinimap(hostPage, 'procedural-course-room-host-minimap.png'),
    captureMinimap(guestPage, 'procedural-course-room-guest-minimap.png'),
  ]);

  if (browserErrors.length > 0) throw new Error(`Browser errors:\n${browserErrors.join('\n')}`);
  const receipt = {
    outcome: 'PASS', environments,
    capturedAt: new Date().toISOString(),
    viewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    fixedTimeAttack: { first: fixedFirst, retry: fixedRetry, sameCourse: true, competitionProfile: fixedRetryProfile },
    solo: {
      first: first.course,
      retry: expeditionRetry,
      rematch: rematch.course,
      difference: {
        rmsCenterlineMetres: soloRms,
        rotationInvariantTurningRmsRadians: soloTurningRms,
        minimap: soloMaskDifference,
        firstPngSha256: first.minimap.pngSha256,
        rematchPngSha256: rematch.minimap.pngSha256,
      },
    },
    determinism: {
      seed: deterministicA.course.seed,
      signature: deterministicA.course.signature,
      sampleDigest: deterministicA.course.sampleDigest,
      minimapDifference: deterministicMaskDifference,
      pngSha256: deterministicA.minimap.pngSha256,
    },
    multiplayer: {
      roomCodeLength: roomCode.length,
      host: hostCourse,
      guest: guestCourse,
      hostMinimapPngSha256: hostMap.pngSha256,
      guestMinimapPngSha256: guestMap.pngSha256,
      exactCourseMatch: true,
    },
    browserErrors,
  };
  await writeFile(
    `${outputDir}/procedural-course-receipt.json`,
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  console.log(JSON.stringify({
    first: { seed: first.course.seed, signature: first.course.signature },
    rematch: { seed: rematch.course.seed, signature: rematch.course.signature },
    rmsCenterlineMetres: soloRms,
    rotationInvariantTurningRmsRadians: soloTurningRms,
    minimapChangedPercent: soloMaskDifference.changedFraction * 100,
    deterministicSignature: deterministicA.course.signature,
    roomSignature: hostCourse.signature,
    evidence: `${outputDir}/procedural-course-receipt.json`,
  }, null, 2));
} catch (error) {
  const pages = contexts.flatMap((context) => context.pages());
  const snapshots = [];
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    await page.screenshot({ path: `${outputDir}/procedural-failure-${index}.png` }).catch(() => undefined);
    snapshots.push(await page.evaluate(() => window.__PODRACING__?.snapshot()).catch(() => null));
  }
  await writeFile(`${outputDir}/procedural-course-failure.json`, `${JSON.stringify({
    capturedAt: new Date().toISOString(), error: String(error), browserErrors, snapshots, environments,
  }, null, 2)}\n`);
  throw error;
} finally {
  await Promise.all(contexts.map((context) => context.close().catch(() => undefined)));
  if (browser) await browser.close().catch(() => undefined);
  server.kill('SIGTERM');
}
