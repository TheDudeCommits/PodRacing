/**
 * Trailer capture feasibility probe. Runs the built bundle in a real race and
 * measures what a CDP screencast can actually pull off it, plus proves live
 * (non-capture-mode) camera switching works.
 *   node scripts/trailer/probe.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

const output = 'output/trailer/probe';
await mkdir(output, { recursive: true });
const port = await new Promise((resolve, reject) => {
  const s = createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const a = s.address(); s.close(() => resolve(a.port)); });
});
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  await sleep(2500);
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.__PODRACING__?.ready === true, undefined, { timeout: 120_000 });
  await page.locator('[data-action="start-race"]:visible').click();
  await page.waitForFunction(() => window.__PODRACING__.snapshot().raceTime > 0.2, undefined, { timeout: 60_000 });

  const client = await page.context().newCDPSession(page);
  const stamps = [];
  client.on('Page.screencastFrame', async ({ sessionId, metadata }) => {
    stamps.push(metadata.timestamp);
    try { await client.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });

  await page.keyboard.down('KeyW');
  await sleep(1500);
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
  const cams = ['chase', 'hero', 'side', 'cockpit'];
  const camResults = [];
  for (const cam of cams) {
    const before = stamps.length;
    let err = null;
    try { await page.evaluate((c) => window.__PODRACING__.setCamera(c), cam); }
    catch (e) { err = String(e); }
    await sleep(2000);
    await page.screenshot({ path: `${output}/cam-${cam}.png` });
    camResults.push({ cam, err, framesDuring: stamps.length - before });
  }
  await client.send('Page.stopScreencast');
  await page.keyboard.up('KeyW');

  const span = stamps.length > 1 ? stamps[stamps.length - 1] - stamps[0] : 0;
  const perf = await page.evaluate(() => window.__PODRACING__.snapshot().renderer);
  const receipt = {
    frames: stamps.length,
    spanSeconds: Number(span.toFixed(2)),
    effectiveFps: span > 0 ? Number((( stamps.length - 1) / span).toFixed(2)) : null,
    camResults,
    renderer: { width: perf.width, height: perf.height, pixelRatio: perf.pixelRatio, calls: perf.calls, triangles: perf.triangles, quality: perf.performance?.qualityLevel, cadenceEmaMs: perf.performance?.cadenceEmaMs },
    errors,
  };
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
