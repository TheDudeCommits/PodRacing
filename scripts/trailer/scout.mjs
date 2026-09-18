/**
 * Scout the Inkstorm circuit for trailer shot locations. Seeks the review
 * camera to twenty points around the lap and frames each from the chase eye,
 * so the shot list is chosen from what the track actually looks like.
 *   node scripts/trailer/scout.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

const output = 'output/trailer/scout';
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
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.__PODRACING__?.ready === true, undefined, { timeout: 120_000 });
  await page.evaluate(() => {
    window.__PODRACING__.setCaptureMode(true);
    window.__PODRACING__.setPreset('race');
  });
  const receipt = [];
  for (let i = 0; i < 20; i += 1) {
    const p = i / 20;
    await page.evaluate((progress) => {
      const api = window.__PODRACING__;
      api.seekCourse(progress);
      api.setCamera('chase');
      api.setInput({ throttle: 1 });
      // Let the pack move a little so the pods sit in real racing poses.
      api.step(24);
    }, p);
    const tag = String(Math.round(p * 100)).padStart(2, '0');
    await page.screenshot({ path: `${output}/p${tag}.jpg`, type: 'jpeg', quality: 88 });
    const snap = await page.evaluate(() => {
      const s = window.__PODRACING__.snapshot();
      const me = s.galactic?.racers.find(r => r.id === 'player');
      return { speed: Math.round((me?.galactic?.speed ?? 0)), pos: me?.position?.map(v => Math.round(v)) };
    });
    receipt.push({ progress: p, tag, ...snap });
  }
  await writeFile(`${output}/receipt.json`, JSON.stringify({ receipt, errors }, null, 2));
  console.log('errors', JSON.stringify(errors));
  console.log('done', receipt.length);
} finally {
  await browser?.close();
  server.kill();
}
