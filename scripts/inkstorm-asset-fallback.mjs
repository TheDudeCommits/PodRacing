import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

const output = process.env.INKSTORM_OUTPUT ?? 'output/playwright/inkstorm-asset-fallback';
await mkdir(output, { recursive: true });
const port = await new Promise((resolve, reject) => {
  const socket = createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const address = socket.address();
    socket.close(() => resolve(address.port));
  });
});
const origin = `http://127.0.0.1:${port}`;
const server = spawn('npm', ['run', 'preview', '--', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const receipt = { outcome: 'FAIL', pageErrors: [], consoleErrors: [] };
const assert = (value, message) => { if (!value) throw new Error(message); };
try {
  for (let attempt = 0; attempt < 150; attempt++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* Server is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => receipt.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.consoleErrors.push(message.text()); });
  let intercepted = 0;
  await page.route('**/assets/inkstorm/canyon-buttress.glb', route => { intercepted++; return route.abort('failed'); });
  await page.goto(origin);
  await page.waitForFunction(() => window.__PODRACING__?.snapshot().game.inkstorm.error, { timeout: 30000 });
  await page.locator('[data-hud="asset-status"]').filter({ hasText: 'base course remains playable' }).waitFor();
  const scripts = await page.evaluate(() => Array.from(document.scripts).map(script => script.src).filter(Boolean));
  receipt.build = await Promise.all(scripts.map(async url => ({ url,
    sha256: createHash('sha256').update(new Uint8Array(await (await fetch(url)).arrayBuffer())).digest('hex') })));
  receipt.before = await page.evaluate(() => window.__PODRACING__.snapshot());
  receipt.environment = await frozenBuildReceipt(page, browser);
  receipt.assetStatus = await page.locator('[data-hud="asset-status"]').innerText();
  await page.screenshot({ path: `${output}/fallback-hangar.png` });
  await page.locator('[data-action="start-race"]').click();
  await page.keyboard.down('w');
  await page.waitForTimeout(8000);
  await page.keyboard.up('w');
  receipt.after = await page.evaluate(() => window.__PODRACING__.snapshot());
  await page.screenshot({ path: `${output}/fallback-driving.png` });
  receipt.intercepted = intercepted;
  receipt.distance = Math.hypot(...receipt.after.game.position.map((value, index) => value - receipt.before.game.position[index]));
  assert(intercepted === 1, 'Expected one intentionally blocked scenery file');
  assert(!receipt.after.game.inkstorm.loaded, 'Failed scenery incorrectly reported loaded');
  assert(!receipt.after.game.awaitingStart && receipt.after.raceTime > 1, 'Fallback could not start ordinary simulation');
  assert(receipt.distance > 30, 'Fallback vehicle did not move with live input');
  assert(receipt.pageErrors.length === 0, 'Unexpected uncaught exception');
  assert(receipt.consoleErrors.every(message => /ERR_FAILED|Inkstorm world assets failed/.test(message)), 'Unexpected console error');
  receipt.outcome = 'PASS';
  console.log(JSON.stringify({ outcome: receipt.outcome, distance: receipt.distance, assetStatus: receipt.assetStatus, pageErrors: receipt.pageErrors }));
} catch (error) {
  receipt.error = String(error); process.exitCode = 1; console.error(error);
} finally {
  await browser?.close(); server.kill('SIGTERM');
  receipt.completedAt = new Date().toISOString();
  receipt.scope = 'One intentionally failed GLB request; real UI launch and eight seconds of live W input. Expected load errors retained. This does not validate all network failures, complete races or visual target parity.';
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
}
