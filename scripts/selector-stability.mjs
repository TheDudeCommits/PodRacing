import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDir = fileURLToPath(new URL('../output/playwright/', import.meta.url));
const videoDir = fileURLToPath(new URL('../output/playwright/selector-video/', import.meta.url));

const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address();
    if (!address || typeof address === 'string') {
      probe.close();
      reject(new Error('Could not allocate a selector-stability port.'));
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

function assertStableRect(actual, expected, label) {
  for (const key of ['x', 'y', 'width', 'height']) {
    const delta = Math.abs(Number(actual[key]) - Number(expected[key]));
    if (!Number.isFinite(delta) || delta > 0.25) {
      throw new Error(`${label} moved on ${key}: ${expected[key]} -> ${actual[key]}`);
    }
  }
}

await mkdir(outputDir, { recursive: true });
await mkdir(videoDir, { recursive: true });

const server = spawn(
  process.execPath,
  ['./node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'], env: process.env },
);

let browser;
let context;
let page;
const browserErrors = [];

try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
  });
  page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('requestfailed', (request) => browserErrors.push(
    `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`,
  ));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__PODRACING__?.ready === true);
  await page.waitForFunction(() => {
    const panel = document.querySelector('[data-hud="vehicle-selection"]');
    const previews = Array.from(document.querySelectorAll('[data-vehicle-preview][data-preview-ready="true"]'));
    return panel?.classList.contains('is-visible')
      && previews.length === 4
      && previews.every((host) => {
        const image = host.querySelector('img[data-vehicle-preview-image]');
        return image instanceof HTMLImageElement
          && image.complete
          && image.naturalWidth > 0
          && getComputedStyle(image).opacity === '1';
      });
  }, undefined, { timeout: 30_000 });

  const sampleLayout = () => page.evaluate(() => {
    const toRect = (element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const panel = document.querySelector('[data-hud="vehicle-selection"]');
    const cards = Array.from(document.querySelectorAll('.pod-hud__vehicle-card'));
    const previews = Array.from(document.querySelectorAll('[data-vehicle-preview]'));
    if (!(panel instanceof HTMLElement) || cards.length !== 4 || previews.length !== 4) {
      throw new Error('Selector structure is incomplete.');
    }
    const style = getComputedStyle(panel);
    return {
      panel: toRect(panel),
      panelOpacity: style.opacity,
      panelVisibility: style.visibility,
      cards: cards.map((card) => toRect(card)),
      selectedCount: cards.filter((card) => card.classList.contains('is-selected')).length,
      previewsReady: previews.every((preview) => (
        preview.getAttribute('data-preview-ready') === 'true'
        && preview.querySelector('img[data-vehicle-preview-image]') instanceof HTMLImageElement
      )),
    };
  });

  const baseline = await sampleLayout();
  if (baseline.panelOpacity !== '1' || baseline.panelVisibility !== 'visible') {
    throw new Error(`Selector is not opaque/visible: ${baseline.panelOpacity}/${baseline.panelVisibility}`);
  }
  if (!baseline.previewsReady || baseline.selectedCount !== 1) {
    throw new Error('Selector did not begin with four previews and one selected card.');
  }
  const bodyText = (await page.locator('body').innerText()).toUpperCase();
  for (const forbidden of ['MOS ESPA', 'EVERY CHASSIS', 'TRADEOFF', 'VELOCITY STRIKER']) {
    if (bodyText.includes(forbidden)) throw new Error(`Removed selector copy returned: ${forbidden}`);
  }
  if (!bodyText.includes('NOW THIS IS PODRACING!')) throw new Error('Selector title is missing.');
  const normalizedBodyText = bodyText.replace(/[\[\]]/g, '').replace(/\s+/g, ' ');
  for (const required of ['RACE CONTROLS', 'ONLINE ROOM', 'CREATE ROOM', 'HEAT LANCE', 'F MINE', 'SHIFT REDLINE']) {
    if (!normalizedBodyText.includes(required)) {
      throw new Error(`Selector is missing required control/lobby copy: ${required}`);
    }
  }
  if (bodyText.includes('SPACE+E')) throw new Error('The retired Scrap Mine binding returned.');
  if (await page.locator('[data-action="select-laps"]').count() !== 3) {
    throw new Error('Selector does not expose all three lap choices.');
  }
  if (await page.locator('[data-action="create-room"]').count() !== 1
    || await page.locator('[data-action="join-room"]').count() !== 1
    || await page.locator('[data-hud="room-code-input"]').count() !== 1) {
    throw new Error('Room creation/join controls are incomplete.');
  }

  // Regression: the global gameplay keyboard adapter must yield to native
  // text editing. Bound letters need to type normally and Cmd/Ctrl+V must
  // remain a paste shortcut while the room-code field owns focus.
  const roomCodeInput = page.locator('[data-hud="room-code-input"]');
  await roomCodeInput.focus();
  await page.keyboard.type('WASDEF');
  if (await roomCodeInput.inputValue() !== 'WASDEF') {
    throw new Error('Gameplay-bound letters were consumed while typing a room code.');
  }
  await roomCodeInput.fill('');
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
  await page.evaluate(async () => navigator.clipboard.writeText('G7WEDF'));
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
  if (await roomCodeInput.inputValue() !== 'G7WEDF') {
    throw new Error('The native paste shortcut was consumed by a gameplay binding.');
  }
  await roomCodeInput.fill('');
  await roomCodeInput.blur();

  await page.screenshot({ path: `${outputDir}/selector-stability-start.png`, animations: 'disabled' });

  // Ten seconds of rapid real keyboard selection is intentionally harsher
  // than normal use. Layout, opaque coverage and all four cached models must
  // remain stable while the accent state changes beneath the user's fingers.
  for (let index = 0; index < 100; index += 1) {
    await page.keyboard.press(index % 2 === 0 ? 'd' : 'a');
    await page.waitForTimeout(100);
    if (index % 5 !== 4) continue;
    const sample = await sampleLayout();
    assertStableRect(sample.panel, baseline.panel, `selector sample ${index}`);
    sample.cards.forEach((rect, cardIndex) => {
      assertStableRect(rect, baseline.cards[cardIndex], `selector card ${cardIndex + 1} sample ${index}`);
    });
    if (sample.panelOpacity !== '1'
      || sample.panelVisibility !== 'visible'
      || !sample.previewsReady
      || sample.selectedCount !== 1) {
      throw new Error(`Selector visual state became invalid at sample ${index}.`);
    }
  }

  await page.waitForTimeout(400);
  // The first Playwright screenshot with animations disabled is a compositor
  // barrier: it finishes any selected-card transition before comparison. Do
  // not count that priming frame as an idle sample.
  await page.screenshot({ animations: 'disabled' });
  await page.waitForTimeout(100);
  const settledFrames = [];
  for (let index = 0; index < 3; index += 1) {
    settledFrames.push(await page.screenshot({
      path: `${outputDir}/selector-idle-${index + 1}.png`,
      animations: 'disabled',
    }));
    await page.waitForTimeout(250);
  }
  if (!settledFrames[0].equals(settledFrames[1]) || !settledFrames[1].equals(settledFrames[2])) {
    throw new Error('Idle selector frames differ after the rapid-input stability run.');
  }
  await page.screenshot({ path: `${outputDir}/selector-stability-end.png`, animations: 'disabled' });

  const audio = await page.evaluate(() => window.__PODRACING__?.snapshot().game.audio);
  if (!audio?.requested || audio?.url !== '/audio/podracing-selection-intro.webm') {
    throw new Error('Selector audio lifecycle did not request the supplied intro.');
  }
  if (!audio?.introScheduled || !audio?.scoreScheduled) {
    throw new Error('Selector intro/continuation score was not fully scheduled.');
  }
  if (browserErrors.length > 0) throw new Error(`Browser errors:\n${browserErrors.join('\n')}`);

  const video = page.video();
  await page.close();
  page = null;
  if (video) await video.saveAs(`${outputDir}/selector-stability-10s.webm`);
  await writeFile(`${outputDir}/selector-stability-receipt.json`, `${JSON.stringify({
    capturedAt: new Date().toISOString(),
    durationSeconds: 10,
    deviceScaleFactor: 2,
    modelPreviews: 4,
    layoutSamples: 20,
    idleFramesIdentical: true,
    audio,
    browserErrors,
  }, null, 2)}\n`);
} finally {
  if (page) await page.close().catch(() => undefined);
  if (context) await context.close().catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
  server.kill('SIGTERM');
}

console.log(`Selector stability evidence written to ${outputDir}`);
