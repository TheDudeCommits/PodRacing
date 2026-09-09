import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

const output = process.env.INKSTORM_OUTPUT ?? 'output/playwright/inkstorm-resource-cycles';
await mkdir(output, { recursive: true });
const port = await new Promise((resolve, reject) => {
  const socket = createServer(); socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(() => resolve(port)); });
});
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['./node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const receipt = { outcome: 'FAIL', port, errors: [], samples: [], cycles: [] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
try {
  for (let attempt = 0; attempt < 150; attempt++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* Own preview is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  page.on('pageerror', error => receipt.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
  await page.goto(origin);
  await page.waitForFunction(() => window.__PODRACING__?.ready);
  receipt.environment = await frozenBuildReceipt(page, browser);
  await page.locator('[data-action="select-event"][data-event-id="cup-canyon"]').click();
  await page.waitForFunction(() => window.__PODRACING__.snapshot().game.mastery?.eventId === 'cup-canyon');
  const initial = await page.evaluate(() => window.__PODRACING__.snapshot());
  receipt.initial = initial;
  const identity = { event: initial.game.mastery.eventId, seed: initial.game.course.seed, signature: initial.game.course.signature };
  const record = async (cycle, stage) => {
    await settle(page);
    const snapshot = await page.evaluate(() => window.__PODRACING__.snapshot());
    assert(snapshot.game.mastery?.eventId === identity.event && snapshot.game.course.seed === identity.seed
      && snapshot.game.course.signature === identity.signature, 'Repeated cycle changed the course or selected event');
    assert(snapshot.renderer.sceneryShadow.failure === null, 'Scenery shadow failed during resource cycle');
    const sample = { cycle, stage, memory: snapshot.renderer.memory, shadow: snapshot.renderer.sceneryShadow,
      phase: snapshot.game.phase, awaitingStart: snapshot.game.awaitingStart,
      profile: snapshot.game.competitionProfile, identity };
    receipt.samples.push(sample); return sample;
  };
  await record(0, 'initial-garage');
  const sections = initial.game.course.sections;
  assert(sections.length === 7, 'Expected seven authored section visits');
  receipt.sections = sections;
  for (let cycle = 1; cycle <= 3; cycle++) {
    await page.locator('[data-action="start-race"]').click();
    await page.waitForFunction(() => !window.__PODRACING__.snapshot().game.awaitingStart);
    await page.evaluate(() => { window.__PODRACING__.setCaptureMode(true); window.__PODRACING__.setCamera('chase'); });
    for (const section of sections) {
      await page.evaluate(progress => { window.__PODRACING__.seekCourse(progress); window.__PODRACING__.step(2); }, section.progress);
      await record(cycle, section.id);
      if (section.id.includes('launch') && (cycle === 1 || cycle === 3)) await page.screenshot({ path: `${output}/cycle-${cycle}-launch.png` });
    }
    await page.evaluate(() => { window.__PODRACING__.setPreset('finish'); window.__PODRACING__.setCaptureMode(false); });
    await page.locator('.pod-hud__results-actions [data-action="return-to-garage"]').click();
    await page.waitForFunction(() => window.__PODRACING__.snapshot().game.awaitingStart
      && document.querySelectorAll('[data-vehicle-preview][data-preview-ready="true"]').length === 5);
    await page.waitForTimeout(400);
    await record(cycle, 'garage');
    const samples = receipt.samples.filter(sample => sample.cycle === cycle);
    receipt.cycles.push({ cycle, peak: Object.fromEntries(['geometries', 'textures', 'programs'].map(key => [key, Math.max(...samples.map(sample => sample.memory[key]))])),
      garage: samples.at(-1).memory });
    console.log(JSON.stringify(receipt.cycles.at(-1)));
  }
  await page.screenshot({ path: `${output}/final-garage.png` });
  const second = receipt.samples.filter(sample => sample.cycle === 2);
  const third = receipt.samples.filter(sample => sample.cycle === 3);
  receipt.finalCycleDelta = third.map((sample, index) => ({ stage: sample.stage,
    geometries: sample.memory.geometries - second[index].memory.geometries,
    textures: sample.memory.textures - second[index].memory.textures,
    programs: sample.memory.programs - second[index].memory.programs }));
  receipt.plateau = receipt.finalCycleDelta.every(delta => delta.geometries === 0 && delta.textures === 0 && delta.programs === 0);
  assert(receipt.errors.length === 0, 'Unexpected browser errors');
  assert(receipt.plateau, 'Identical second and third cycles did not reach a resource-count plateau');
  receipt.outcome = 'PASS';
} catch (error) {
  receipt.error = String(error); process.exitCode = 1; console.error(error);
} finally {
  await browser?.close(); server.kill('SIGTERM');
  receipt.completedAt = new Date().toISOString();
  receipt.scope = 'Three identical staged seven-section visits and garage returns on the same selected Cup event and course. Review staging changes the competition profile to chaos and cancels records. Renderer.info counters indicate WebGL geometry/texture/program counts, not GPU bytes, JS heap, a complete leak proof, live racing performance or FPS.';
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ outcome: receipt.outcome, plateau: receipt.plateau, cycles: receipt.cycles, errors: receipt.errors }));
}
