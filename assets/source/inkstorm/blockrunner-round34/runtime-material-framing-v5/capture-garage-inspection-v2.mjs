import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { frozenBuildReceipt } from '../../../../../scripts/lib/frozen-build-receipt.mjs';

const output = process.env.INKSTORM_OUTPUT;
if (!output) throw new Error('An explicit new output directory is required');
await mkdir(output, { recursive: false });
const socket = createServer();
await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve); });
const port = socket.address().port;
await new Promise((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const receipt = { scope: 'Actual garage UI and original rendered WebP images; no image processing and no performance claim.', port, errors: [], views: [], outcome: 'FAIL' };
let browser;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function ready(page) {
  await page.waitForFunction(() => {
    const hero = window.__PODRACING__?.snapshot().game.vehiclePresentation?.racers[0];
    const host = document.querySelector('[data-hud="garage-model"]');
    return hero?.status === 'ready' && hero.active === 'blockrunner'
      && host?.dataset.previewReady === 'true' && host.dataset.previewAppearance === 'blockrunner';
  }, undefined, { timeout: 30000 });
}
async function save(page, id) {
  await ready(page);
  const portrait = await page.locator('[data-hud="garage-model"]').evaluate(host => {
    const image = host.querySelector('img');
    return { source: image.src, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
      angle: Number(host.dataset.previewAngle ?? 0), bounds: host.getBoundingClientRect().toJSON(),
      ready: host.dataset.previewReady, appearance: host.dataset.previewAppearance };
  });
  if (!portrait.source.startsWith('data:image/webp;base64,')) throw new Error('Expected the original rendered WebP image');
  const bytes = Buffer.from(portrait.source.split(',')[1], 'base64');
  await writeFile(`${output}/${id}.webp`, bytes);
  await page.screenshot({ path: `${output}/${id}.png` });
  delete portrait.source;
  receipt.views.push({ id, ...portrait, bytes: bytes.length, sha256: sha(bytes), viewport: page.viewportSize() });
}
async function rotate(page, direction) {
  const host = page.locator('[data-hud="garage-model"]');
  const before = await host.evaluate(element => ({ angle: Number(element.dataset.previewAngle ?? 0), source: element.querySelector('img').src }));
  await page.locator(`[data-action="inspect-vehicle"][data-direction="${direction}"]`).click();
  await page.waitForFunction(({ angle, source }) => {
    const element = document.querySelector('[data-hud="garage-model"]');
    return Number(element?.dataset.previewAngle ?? 0) === angle
      && element?.querySelector('img')?.src !== source && element?.dataset.previewReady === 'true';
  }, { angle: (before.angle + direction * 30 + 360) % 360, source: before.source });
}
try {
  let serving = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (server.exitCode !== null) throw new Error('Owned preview exited before readiness');
    try { if ((await fetch(origin)).ok) { serving = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!serving) throw new Error('Owned preview never became ready');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  page.on('pageerror', error => receipt.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
  await page.goto(origin);
  await page.waitForFunction(() => window.__PODRACING__?.ready);
  await page.locator('[data-action="select-appearance"][data-appearance="blockrunner"]').click();
  await ready(page);
  receipt.environment = await frozenBuildReceipt(page, browser);
  await save(page, 'garage-default');
  await rotate(page, 1); await save(page, 'garage-plus30');
  await rotate(page, -1); await rotate(page, -1); await save(page, 'garage-minus30');
  await rotate(page, 1);
  const oldSource = await page.locator('[data-hud="garage-model"] img').getAttribute('src');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(source => document.querySelector('[data-hud="garage-model"] img')?.getAttribute('src') !== source, oldSource);
  await save(page, 'garage-narrow');
  receipt.narrowLayout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    startPresent: !!document.querySelector('[data-action="start-race"]'),
    heroReady: document.querySelector('[data-hud="garage-model"]')?.getAttribute('data-preview-ready') }));
  if (receipt.narrowLayout.scrollWidth > receipt.narrowLayout.width) throw new Error('Narrow garage overflows horizontally');
  receipt.narrowSeparation = await page.evaluate(() => {
    const appearance = document.querySelector('[data-hud="appearance"]').getBoundingClientRect();
    const model = document.querySelector('[data-hud="garage-model"]').getBoundingClientRect();
    return { appearanceBottom: appearance.bottom, modelTop: model.top, separated: model.top >= appearance.bottom };
  });
  if (!receipt.narrowSeparation.separated) throw new Error('Narrow appearance selector overlaps the model host');
  const start = page.locator('[data-action="start-race"]');
  await start.scrollIntoViewIfNeeded();
  const startBounds = await start.boundingBox();
  receipt.narrowStart = { bounds: startBounds, reachable: !!startBounds && startBounds.y >= 0 && startBounds.y + startBounds.height <= 844 };
  if (!receipt.narrowStart.reachable) throw new Error('Start control could not be scrolled fully into view');
  await page.screenshot({ path: `${output}/garage-narrow-start.png` });
  if (receipt.errors.length) throw new Error('Browser errors during garage inspection');
  receipt.outcome = 'PASS';
} catch (error) {
  receipt.error = String(error); process.exitCode = 1;
} finally {
  try { await browser?.close(); receipt.browserClosed = true; }
  finally {
    if (server.exitCode === null && server.signalCode === null) { const exited = once(server, 'exit'); server.kill('SIGTERM'); await exited; }
    receipt.serverClosed = server.exitCode !== null || server.signalCode !== null;
    await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify({ outcome: receipt.outcome, views: receipt.views.map(({ id, naturalWidth, naturalHeight }) => ({ id, naturalWidth, naturalHeight })), errors: receipt.errors, error: receipt.error, browserClosed: receipt.browserClosed, serverClosed: receipt.serverClosed }));
  }
}
