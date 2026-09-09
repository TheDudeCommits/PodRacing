import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';
const port = Number(process.env.INKSTORM_OWNED_PORT ?? 5187), out = process.env.INKSTORM_OUTPUT ?? 'output/playwright/round35-broadcast-ui';
if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 5211) throw new Error('Use a dedicated valid owned port, never 5211.');
const url = `http://127.0.0.1:${port}`, receipt = { outcome: 'FAIL', port, errors: [], checks: [], captures: [], scope: 'Native UI/input QA and actual desktop video; recorded run is not performance evidence.' };
const assert = (value, message) => { if (!value) throw new Error(message); };
await mkdir(out, { recursive: true });
const probe = createServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(port, '127.0.0.1', resolve); });
await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser, closing, spawnError; server.on('error', error => { spawnError = error; });
const closeOwned = () => closing ??= (async () => {
  const cleanup = { browserClosed: false, serverExited: false, errors: [] };
  try { if (browser) await browser.close(); cleanup.browserClosed = true; } catch (error) { cleanup.errors.push(String(error)); }
  try { if (server.exitCode === null && server.signalCode === null && server.pid) {
    const exited = new Promise(resolve => server.once('exit', resolve)); server.kill('SIGTERM');
    await Promise.race([exited, new Promise((_, reject) => setTimeout(() => reject(new Error('Owned server exit timed out')), 3000))]);
  } cleanup.serverExited = Boolean(spawnError) || server.exitCode !== null || server.signalCode !== null; } catch (error) { cleanup.errors.push(String(error)); if (server.pid) server.kill('SIGKILL'); }
  receipt.cleanup = cleanup; await writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
  assert(cleanup.browserClosed && cleanup.serverExited && !cleanup.errors.length, 'Owned cleanup incomplete');
})();
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) process.once(signal, () => { void closeOwned().finally(() => process.exit(code)); });
const snap = page => page.evaluate(() => window.__PODRACING__.snapshot());
const act = (page, action) => page.locator(`[data-action="${action}"]:visible`);
const shot = async (page, name) => { if (/garage|map|build|manual/.test(name)) await page.waitForTimeout(480); await page.screenshot({ path: `${out}/${name}.png` }); receipt.captures.push({ name, snapshot: await snap(page) }); };
async function layout(page, label, selector) {
  const control = page.locator(selector); await control.scrollIntoViewIfNeeded();
  const box = await control.boundingBox(), size = page.viewportSize();
  assert(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1, `${label}: primary control outside viewport`);
  const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert(Math.max(widths.document, widths.body) <= widths.viewport + 1, `${label}: horizontal page overflow`);
  await control.click({ trial: true }); receipt.checks.push({ label, widths, control: box });
}
async function readableText(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const evidence = await locator.evaluate(element => {
    const box = element.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(element);
    const text = range.getBoundingClientRect(), clippedBy = [], boxlessAncestors = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      // display:contents participates through its children and supplies no clipping box.
      if (style.display === 'contents') { boxlessAncestors.push(parent.className); continue; }
      const bounds = parent.getBoundingClientRect();
      if ((/(auto|scroll|hidden|clip)/.test(style.overflowY) && (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1))
        || (/(auto|scroll|hidden|clip)/.test(style.overflowX) && (box.left < bounds.left - 1 || box.right > bounds.right + 1))) clippedBy.push(parent.className);
    }
    const card = element.closest('.pod-hud__workshop-part'), cardBounds = card?.getBoundingClientRect();
    return { text: element.textContent, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
      card: card ? { box: cardBounds.toJSON(), clientHeight: card.clientHeight, scrollHeight: card.scrollHeight } : null,
      box: box.toJSON(), textBounds: text.toJSON(), clippedBy, boxlessAncestors, inViewport: box.top >= -1 && box.left >= -1 && box.bottom <= innerHeight + 1 && box.right <= innerWidth + 1 };
  });
  receipt.checks.push({ label, ...evidence });
  assert(evidence.text?.trim() && evidence.box.height > 0 && evidence.inViewport && !evidence.clippedBy.length
    && evidence.scrollHeight <= evidence.clientHeight + 1 && evidence.scrollWidth <= evidence.clientWidth + 1
    && evidence.textBounds.bottom <= evidence.box.bottom + 1
    && (!evidence.card || (evidence.box.bottom <= evidence.card.box.bottom + 1 && evidence.card.scrollHeight <= evidence.card.clientHeight + 1)), `${label}: text clipped or unreachable`);
}
async function atlasLabels(page, label) {
  await page.waitForTimeout(480);
  const names = page.locator('.race-event-atlas__name'); assert(await names.count() === 7, `${label}: missing event label`);
  for (const name of await names.all()) {
    await readableText(name, `${label}: ${await name.textContent()}`);
    const bounds = await name.evaluate(element => ({ label: element.getBoundingClientRect().toJSON(), footer: document.querySelector('.race-event-atlas__footer').getBoundingClientRect().toJSON(), map: element.closest('.race-event-atlas__map').getBoundingClientRect().toJSON() }));
    receipt.checks.push({ label: `${label}: label/footer separation`, ...bounds });
    assert(bounds.label.bottom <= bounds.footer.top - 4 && bounds.label.bottom <= bounds.map.bottom - 4, `${label}: event label intrudes into footer space`);
  }
  await page.locator('.race-event-atlas__event.is-selected').scrollIntoViewIfNeeded();
}
async function workshopContents(page, workshop) {
  const slots = workshop.locator('[data-action="select-workshop-slot"]'); assert(await slots.count() === 5, 'Missing installed system slot');
  for (const slot of await slots.all()) { await layout(page, `desktop installed ${await slot.getAttribute('data-slot')}`, `[data-action="select-workshop-slot"][data-slot="${await slot.getAttribute('data-slot')}"]`); await readableText(slot.locator('strong'), 'installed part name'); }
  receipt.checks.push({ label: 'installed column scroll range', ...await slots.first().evaluate(element => ({ clientHeight: element.parentElement.clientHeight, scrollHeight: element.parentElement.scrollHeight, scrollTop: element.parentElement.scrollTop })) });
  await slots.first().scrollIntoViewIfNeeded();
  for (const card of await workshop.locator('[data-action="equip-workshop-part"]').all()) { await card.hover(); await readableText(card.locator('p'), `hovered description ${await card.getAttribute('data-part-id')}`); }
  await workshop.locator('.pod-hud__workshop-head').hover();
  await readableText(workshop.locator('.pod-hud__workshop-part.is-equipped > p'), 'equipped description persists without hover');
  await workshop.locator('.pod-hud__workshop-part.is-equipped').hover();
}
async function boot(context) {
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
  await page.goto(url); await page.waitForFunction(() => window.__PODRACING__?.ready, undefined, { timeout: 45000 });
  await page.waitForFunction(() => document.querySelector('[data-hud="garage-model"]')?.dataset.previewReady === 'true', undefined, { timeout: 45000 });
  return page;
}
try {
  let serving = false;
  for (let attempt = 0; attempt < 150; attempt++) { if (spawnError) throw spawnError; assert(server.exitCode === null, 'Preview exited before ready'); try { if ((await fetch(url)).ok) { serving = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 100)); }
  assert(serving, 'Preview readiness timed out'); browser = await chromium.launch({ channel: 'chrome', headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: { dir: `${out}/video`, size: { width: 1440, height: 900 } } });
  const page = await boot(desktop), video = page.video(); receipt.environment = await frozenBuildReceipt(page, browser);
  await page.locator('[data-hud="start-button"]').hover(); await page.waitForTimeout(220);
  const hover = await page.locator('[data-hud="start-button"]').evaluate(element => {
    const style = getComputedStyle(element), luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, index) => sum + v * [.2126, .7152, .0722][index], 0);
    const foreground = luminance(style.color), background = luminance(style.backgroundColor);
    return { color: style.color, background: style.backgroundColor, contrast: (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) };
  }); receipt.checks.push({ label: 'Start hover contrast', ...hover }); assert(hover.contrast >= 4.5, 'Start hover loses readable contrast');
  await layout(page, 'desktop garage', '[data-hud="start-button"]'); await shot(page, '01-desktop-garage');
  await act(page, 'open-event-atlas').click(); const atlas = page.getByRole('dialog', { name: 'Race event atlas' });
  const selected = atlas.locator('.race-event-atlas__event[aria-pressed="true"]'); const prior = await selected.getAttribute('data-event-id');
  await selected.focus(); await page.keyboard.press('ArrowRight');
  await page.waitForFunction(id => document.querySelector('.race-event-atlas__event[aria-pressed="true"]')?.getAttribute('data-event-id') !== id, prior);
  const arrowEvent = await atlas.locator('.race-event-atlas__event[aria-pressed="true"]').getAttribute('data-event-id'); await page.keyboard.press('Enter');
  assert((await snap(page)).game.awaitingStart, 'Enter on selected atlas event unexpectedly started race');
  await atlas.locator('[data-action="select-atlas-event"][data-event-id="open-expedition"]').click();
  await page.waitForFunction(() => window.__PODRACING__.snapshot().game.mastery?.eventId === 'open-expedition');
  receipt.checks.push({ label: 'native atlas Arrow/Enter and open-expedition selection', prior, arrowEvent, enterDidNotStart: true });
  await atlasLabels(page, 'desktop atlas'); await layout(page, 'desktop atlas launch', '[data-action="launch-atlas-event"]'); await shot(page, '02-desktop-map'); await act(page, 'close-event-atlas').click();
  await act(page, 'open-workshop').click(); const workshop = page.locator('[data-hud="workshop"]');
  const part = workshop.locator('[data-action="equip-workshop-part"][aria-pressed="false"]').first(); const partId = await part.getAttribute('data-part-id'); await part.click();
  await page.waitForFunction(id => document.querySelector(`[data-action="equip-workshop-part"][data-part-id="${id}"]`)?.getAttribute('aria-pressed') === 'true', partId);
  receipt.checks.push({ label: 'real workshop part equipped', partId, snapshot: await snap(page) }); await workshopContents(page, workshop); await shot(page, '03-desktop-build'); await workshop.getByRole('button', { name: 'Close workshop', exact: true }).click();
  for (const selector of ['.pod-hud__selector-controls > summary', '[data-hud="room-panel"] > summary']) { await page.locator(selector).click(); }
  await shot(page, '04-desktop-manual-online');
  for (const selector of ['.pod-hud__selector-controls > summary', '[data-hud="room-panel"] > summary']) { await page.locator(selector).click(); }
  await act(page, 'start-race').click(); await page.waitForFunction(() => !window.__PODRACING__.snapshot().game.awaitingStart); await shot(page, '05-desktop-countdown');
  await page.locator('canvas').first().click(); const before = await snap(page); await page.keyboard.down('w');
  try { await page.waitForTimeout(4000); await shot(page, '06-desktop-live-race'); await page.waitForTimeout(4000); } finally { await page.keyboard.up('w'); }
  const after = await snap(page); assert(after.simulationFrame > before.simulationFrame && after.raceTime > 0, 'Native W run did not advance actual race frames');
  assert(after.game.speed > 1 && Math.hypot(after.game.position[0] - before.game.position[0], after.game.position[2] - before.game.position[2]) > 1, 'Native W input did not move the actual player');
  receipt.checks.push({ label: '8-second ordinary W input', before, after, performanceClaim: false });
  await page.keyboard.press('p', { delay: 100 }); await page.locator('[data-hud="pause"][aria-hidden="false"]').waitFor(); await shot(page, '07-desktop-paused');
  await page.locator('.pod-hud__pause-home [data-action="toggle-settings"]').click(); await page.locator('[data-settings-tab="comfort"]').click();
  await page.locator('[data-setting="comfort.reducedMotion"]').check(); await page.locator('.pod-hud.is-reduced-motion').waitFor(); await shot(page, '08-desktop-reduced-motion');
  await desktop.close(); receipt.desktopVideo = await video.path();
  for (const [label, viewport] of [['mobile', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    try { const narrow = await boot(context); await layout(narrow, `${label} garage`, '[data-hud="start-button"]'); await shot(narrow, `${label}-garage`);
      await act(narrow, 'open-event-atlas').click(); await atlasLabels(narrow, `${label} atlas`); await layout(narrow, `${label} atlas`, '[data-action="launch-atlas-event"]'); await shot(narrow, `${label}-map`);
      await act(narrow, 'launch-atlas-event').click(); await narrow.waitForFunction(() => !window.__PODRACING__.snapshot().game.awaitingStart); await shot(narrow, `${label}-countdown`);
    } finally { await context.close(); }
  }
  assert(!receipt.errors.length, 'Browser console/page errors'); receipt.outcome = 'PASS';
} catch (error) { receipt.error = String(error); process.exitCode = 1; }
finally { try { await closeOwned(); } catch (error) { receipt.outcome = 'FAIL'; receipt.cleanupError = String(error); process.exitCode = 1; await writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2)); } }
console.log(JSON.stringify({ outcome: receipt.outcome, captures: receipt.captures.length, errors: receipt.errors, error: receipt.error, cleanup: receipt.cleanup }));
