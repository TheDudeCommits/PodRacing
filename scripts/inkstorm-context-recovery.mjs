import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

const output = process.env.INKSTORM_OUTPUT ?? 'output/playwright/inkstorm-context-recovery';
await mkdir(output, { recursive: true });
const port = await new Promise(resolve => {
  const socket = createServer();
  socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(() => resolve(port)); });
});
const origin = `http://127.0.0.1:${port}`;
const server = spawn('npm', ['run', 'preview', '--', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const receipt = { outcome: 'FAIL', pageErrors: [], consoleErrors: [], port };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  for (let attempt = 0; attempt < 150; attempt++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* Preview is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  page.on('pageerror', error => receipt.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.consoleErrors.push(message.text()); });
  await page.goto(origin);
  await page.waitForFunction(() => window.__PODRACING__?.ready, undefined, { timeout: 30000 });
  receipt.environment = await frozenBuildReceipt(page, browser);
  const scripts = await page.evaluate(() => Array.from(document.scripts).map(script => script.src).filter(Boolean));
  receipt.build = await Promise.all(scripts.map(async url => ({ url,
    sha256: createHash('sha256').update(new Uint8Array(await (await fetch(url)).arrayBuffer())).digest('hex') })));
  await page.locator('[data-action="start-race"]').click();
  await page.keyboard.down('w');
  await page.waitForFunction(() => window.__PODRACING__.snapshot().raceTime > 2);
  await page.keyboard.up('w');
  await page.waitForFunction(() => {
    const shadow = window.__PODRACING__.snapshot().renderer.racerShadow;
    return shadow?.failure === null && shadow?.skipped === null && shadow.frames > 0 && shadow.drawCalls > 0;
  }, undefined, { timeout: 20000 });
  receipt.before = await page.evaluate(() => window.__PODRACING__.snapshot());
  assert(receipt.before.renderer.sceneryShadow?.failure === null && receipt.before.renderer.sceneryShadow?.bakes > 0, 'Initial scenery atlas was not baked successfully');
  assert([512, 1024].includes(receipt.before.renderer.racerShadow?.size), 'Initial player atlas has an unexpected resolution');
  assert(receipt.before.renderer.racerShadow.drawCalls <= 22 && receipt.before.renderer.racerShadow.drawnTriangles > 0, 'Initial player atlas did not submit bounded real caster draws');
  assert(receipt.before.renderer.performance.cadenceSamples > 10, 'No pre-suspension cadence history');
  assert(await page.evaluate(() => {
    const canvas = document.querySelector('#viewport');
    const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
    if (!extension) return false;
    window.__contextProbe = { extension, restored: null };
    canvas.addEventListener('webglcontextrestored', () => {
      window.__contextProbe.restored = window.__PODRACING__.snapshot().renderer.performance;
    }, { once: true });
    extension.loseContext();
    return true;
  }), 'WEBGL_lose_context unavailable');
  await page.locator('[data-renderer-state="lost"]').waitFor();
  receipt.lostBoundary = await page.evaluate(() => window.__PODRACING__.snapshot());
  await page.waitForTimeout(3000);
  receipt.suspended = await page.evaluate(() => window.__PODRACING__.snapshot());
  assert(receipt.suspended.simulationFrame === receipt.lostBoundary.simulationFrame, 'Simulation advanced while the WebGL context was suspended');
  assert(receipt.suspended.renderer.racerShadow.frames === receipt.lostBoundary.renderer.racerShadow.frames, 'Player shadow rendering advanced during context suspension');
  await page.evaluate(() => window.__contextProbe.extension.restoreContext());
  await page.locator('[data-renderer-state="ready"]').waitFor();
  await page.waitForFunction(frame => window.__PODRACING__.snapshot().simulationFrame > frame + 10, receipt.suspended.simulationFrame);
  await page.waitForFunction(bakes => {
    const shadow = window.__PODRACING__.snapshot().renderer.sceneryShadow;
    return shadow?.failure === null && shadow?.bakes > bakes;
  }, receipt.before.renderer.sceneryShadow.bakes, { timeout: 20000 });
  await page.waitForFunction(frames => {
    const shadow = window.__PODRACING__.snapshot().renderer.racerShadow;
    return shadow?.failure === null && shadow?.skipped === null && shadow.frames > frames && shadow.drawCalls > 0;
  }, receipt.before.renderer.racerShadow.frames, { timeout: 20000 });
  receipt.restoredBoundary = await page.evaluate(() => window.__contextProbe.restored);
  receipt.after = await page.evaluate(() => window.__PODRACING__.snapshot());
  assert(receipt.restoredBoundary?.cadenceSamples === 0, 'Suspended cadence history survived context restoration');
  assert(receipt.after.renderer.performance.cadenceSamples > 0, 'Cadence sampling did not restart');
  assert(receipt.after.renderer.performance.cadenceLastMs < 250, 'Pause was counted as an active frame');
  assert(receipt.after.renderer.sceneryShadow.failure === null && receipt.after.renderer.sceneryShadow.bakes > receipt.before.renderer.sceneryShadow.bakes, 'Scenery atlas did not rebake after context restoration');
  assert(receipt.after.renderer.racerShadow.failure === null && receipt.after.renderer.racerShadow.frames > receipt.before.renderer.racerShadow.frames, 'Player atlas did not resume successful rendering after context restoration');
  assert(receipt.after.renderer.racerShadow.drawCalls > 0 && receipt.after.renderer.racerShadow.drawCalls <= 22, 'Restored player atlas exceeded its draw budget or submitted no casters');
  assert(receipt.after.renderer.racerShadow.drawnTriangles > 0, 'Restored player atlas submitted no triangles');
  assert(receipt.pageErrors.length === 0 && receipt.consoleErrors.length === 0, 'Unexpected browser error');
  await page.screenshot({ path: `${output}/restored.png` });

  // Fault injection stays in this disposable test page. Match the player
  // target by its unique square viewport; never alter runtime diagnostics or
  // force an unrelated world/post-process framebuffer to fail.
  const playerAtlasSize = receipt.after.renderer.racerShadow.size;
  const injectedSizes = [...new Set([playerAtlasSize, 512])];
  assert(!injectedSizes.includes(receipt.after.renderer.sceneryShadow.size), 'Player and scenery target sizes overlap; refusing ambiguous framebuffer fault injection');
  receipt.framebufferFallback = { injectedSizes, expectedAllocationChecks: injectedSizes.length };
  await page.evaluate(sizes => {
    const gl = document.querySelector('#viewport').getContext('webgl2');
    const original = gl.checkFramebufferStatus;
    const probe = window.__racerFramebufferProbe = { checks: 0, injected: 0, original, gl };
    gl.checkFramebufferStatus = function(target) {
      const status = original.call(this, target);
      if (target !== this.FRAMEBUFFER || !this.getParameter(this.FRAMEBUFFER_BINDING)) return status;
      const viewport = this.getParameter(this.VIEWPORT);
      if (viewport[2] !== viewport[3] || !sizes.includes(viewport[2])) return status;
      probe.checks++;
      if (status !== this.FRAMEBUFFER_COMPLETE) return status;
      probe.injected++;
      return this.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
    };
  }, injectedSizes);
  await page.evaluate(() => window.__contextProbe.extension.loseContext());
  await page.locator('[data-renderer-state="lost"]').waitFor();
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__contextProbe.extension.restoreContext());
  await page.locator('[data-renderer-state="ready"]').waitFor();
  await page.waitForFunction(() => {
    const shadow = window.__PODRACING__.snapshot().renderer.racerShadow;
    return shadow?.failure?.includes('Player shadow framebuffer is incomplete');
  }, undefined, { timeout: 20000 });
  receipt.framebufferFallback.failed = await page.evaluate(() => window.__PODRACING__.snapshot());
  await page.waitForFunction(frame => window.__PODRACING__.snapshot().simulationFrame >= frame + 45,
    receipt.framebufferFallback.failed.simulationFrame, { timeout: 20000 });
  receipt.framebufferFallback.settled = await page.evaluate(() => window.__PODRACING__.snapshot());
  receipt.framebufferFallback.probe = await page.evaluate(() => ({
    checks: window.__racerFramebufferProbe.checks,
    injected: window.__racerFramebufferProbe.injected,
  }));
  const failed = receipt.framebufferFallback.failed.renderer.racerShadow;
  const settled = receipt.framebufferFallback.settled.renderer.racerShadow;
  assert(receipt.framebufferFallback.probe.checks === injectedSizes.length
    && receipt.framebufferFallback.probe.injected === injectedSizes.length,
  'Failed player framebuffer was retried instead of settling after its bounded allocation attempt');
  assert(settled.failure === failed.failure && settled.frames === failed.frames, 'Failed player atlas did not stay disabled');
  assert(settled.drawCalls === 0 && settled.drawnTriangles === 0, 'Failed player atlas continued submitting GPU geometry');
  assert(receipt.framebufferFallback.settled.renderer.sceneryShadow.failure === null
    && receipt.framebufferFallback.settled.renderer.sceneryShadow.bakes > receipt.after.renderer.sceneryShadow.bakes,
  'Player framebuffer failure prevented the static scenery atlas from recovering');
  assert(receipt.framebufferFallback.settled.raceTime > receipt.framebufferFallback.failed.raceTime, 'Player framebuffer fallback stopped live simulation');
  assert(receipt.pageErrors.length === 0 && receipt.consoleErrors.length === 0, 'Unexpected browser error during player framebuffer fallback');
  await page.screenshot({ path: `${output}/player-shadow-fallback.png` });

  // Removing the fault alone must not unlock the failure latch. A final real
  // restore supplies the same explicit invalidation used by normal recovery.
  await page.evaluate(() => {
    const probe = window.__racerFramebufferProbe;
    probe.gl.checkFramebufferStatus = probe.original;
  });
  await page.waitForFunction(frame => window.__PODRACING__.snapshot().simulationFrame >= frame + 15,
    receipt.framebufferFallback.settled.simulationFrame, { timeout: 20000 });
  receipt.framebufferFallback.faultRemoved = await page.evaluate(() => window.__PODRACING__.snapshot());
  assert(receipt.framebufferFallback.faultRemoved.renderer.racerShadow.frames === settled.frames
    && receipt.framebufferFallback.faultRemoved.renderer.racerShadow.failure === settled.failure,
  'Removing the external fault implicitly retried a latched player atlas');
  await page.evaluate(() => window.__contextProbe.extension.loseContext());
  await page.locator('[data-renderer-state="lost"]').waitFor();
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__contextProbe.extension.restoreContext());
  await page.locator('[data-renderer-state="ready"]').waitFor();
  await page.waitForFunction(({ frames, bakes }) => {
    const renderer = window.__PODRACING__.snapshot().renderer;
    return renderer.racerShadow?.failure === null && renderer.racerShadow?.skipped === null
      && renderer.racerShadow.frames > frames && renderer.racerShadow.drawCalls > 0
      && renderer.sceneryShadow?.failure === null && renderer.sceneryShadow.bakes > bakes;
  }, { frames: settled.frames, bakes: receipt.framebufferFallback.settled.renderer.sceneryShadow.bakes }, { timeout: 20000 });
  receipt.framebufferFallback.recovered = await page.evaluate(() => window.__PODRACING__.snapshot());
  assert(receipt.framebufferFallback.recovered.renderer.racerShadow.drawCalls <= 22
    && receipt.framebufferFallback.recovered.renderer.racerShadow.drawnTriangles > 0,
  'Player atlas did not recover its bounded caster workload after explicit invalidation');
  assert(receipt.pageErrors.length === 0 && receipt.consoleErrors.length === 0, 'Unexpected browser error after player framebuffer recovery');
  await page.screenshot({ path: `${output}/player-shadow-recovered.png` });
  receipt.outcome = 'PASS';
  console.log(JSON.stringify({ outcome: receipt.outcome, restoredBoundary: receipt.restoredBoundary,
    after: receipt.after.renderer.performance, racerShadow: receipt.after.renderer.racerShadow,
    framebufferFallback: receipt.framebufferFallback.probe,
    recovered: receipt.framebufferFallback.recovered.renderer.racerShadow, errors: receipt.pageErrors }));
} catch (error) {
  receipt.error = String(error); process.exitCode = 1; console.error(error);
} finally {
  await browser?.close(); server.kill('SIGTERM');
  receipt.completedAt = new Date().toISOString();
  receipt.scope = 'Live UI/input, three-second real WebGL context suspension, governor measurement reset, and recovery of static and dynamic atlases. Two additional real context cycles verify browser-injected incomplete player framebuffer allocation, a bounded no-retry fallback while simulation continues, and successful recovery after explicit invalidation. Screenshots support separate visual review; this does not assert contact-shadow pixels, full-race performance, GPU time, or visual parity.';
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
}
