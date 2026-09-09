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
let browser, desktop, desktopVideo, closing, spawnError; server.on('error', error => { spawnError = error; });
const closeOwned = () => closing ??= (async () => {
  const cleanup = { browserClosed: false, serverExited: false, errors: [] };
  try { if (desktop) await desktop.close(); } catch (error) { cleanup.errors.push(String(error)); }
  try { if (browser) await browser.close(); cleanup.browserClosed = true; } catch (error) { cleanup.errors.push(String(error)); }
  try { if (desktopVideo) receipt.desktopVideo = await desktopVideo.path(); } catch (error) { cleanup.errors.push(String(error)); }
  try { if (server.exitCode === null && server.signalCode === null && server.pid) {
    const exited = new Promise(resolve => server.once('exit', resolve)); server.kill('SIGTERM');
    await Promise.race([exited, new Promise((_, reject) => setTimeout(() => reject(new Error('Owned server exit timed out')), 3000))]);
  } cleanup.serverExited = Boolean(spawnError) || server.exitCode !== null || server.signalCode !== null; } catch (error) {
    cleanup.errors.push(String(error));
    if (server.pid && server.exitCode === null && server.signalCode === null) {
      const exited = new Promise(resolve => server.once('exit', resolve)); server.kill('SIGKILL'); await exited;
    }
    cleanup.serverExited = server.exitCode !== null || server.signalCode !== null;
  }
  receipt.cleanup = cleanup; await writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
  assert(cleanup.browserClosed && cleanup.serverExited && !cleanup.errors.length, 'Owned cleanup incomplete');
})();
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) process.once(signal, () => { void closeOwned().finally(() => process.exit(code)); });
const snap = page => page.evaluate(() => window.__PODRACING__.snapshot());
const act = (page, action) => page.locator(`[data-action="${action}"]:visible`);
const shot = async (page, name) => { if (/garage|map|build|manual/.test(name)) await page.waitForTimeout(480); await page.screenshot({ path: `${out}/${name}.png` }); receipt.captures.push({ name, snapshot: await snap(page) }); };
// Read-only samples around ordinary UI clicks retain real motion and settling.
// Recording and computed-style overhead make these visual evidence, not FPS data.
async function beginMotion(page, label, selectors) {
  await page.evaluate(({ label, selectors }) => {
    const trace = { label, startedAt: performance.now(), samples: [], done: false };
    window.__INKSTORM_UI_MOTION__ = trace;
    const frame = wallMs => {
      const elements = selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(element => {
        const style = getComputedStyle(element), box = element.getBoundingClientRect();
        return { selector, id: element.dataset.eventId ?? element.dataset.partId ?? null,
          x: box.x, y: box.y, width: box.width, height: box.height,
          opacity: style.opacity, transform: style.transform, background: style.backgroundColor,
          display: style.display, visibility: style.visibility,
          animations: element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').map(animation => ({
            name: animation.animationName ?? animation.transitionProperty ?? 'web-animation', currentTime: animation.currentTime,
          })) };
      }));
      trace.samples.push({ elapsedMs: wallMs - trace.startedAt, elements });
      if (wallMs - trace.startedAt >= 850) trace.done = true;
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, { label, selectors });
}
async function finishMotion(page, expectMotion = true) {
  await page.waitForFunction(() => window.__INKSTORM_UI_MOTION__?.done);
  const trace = await page.evaluate(() => window.__INKSTORM_UI_MOTION__);
  assert(trace.samples.length >= 8, `${trace.label}: too few native motion observations`);
  await writeFile(`${out}/motion-${trace.label}.json`, JSON.stringify(trace, null, 2));
  const activeSamples = trace.samples.filter(sample => sample.elements.some(element => element.animations.length)).length;
  const finalAnimations = trace.samples.at(-1).elements.flatMap(element => element.animations);
  receipt.checks.push({ label: `native motion ${trace.label}`, samples: trace.samples.length,
    durationMs: trace.samples.at(-1).elapsedMs,
    activeSamples, finalAnimations, expectMotion,
    evidence: `motion-${trace.label}.json`, performanceClaim: false });
  if (!((expectMotion ? activeSamples > 0 : activeSamples === 0) && finalAnimations.length === 0)) {
    (receipt.motionFailures ??= []).push(`${trace.label}: ${expectMotion ? 'missing native motion or transition did not settle' : 'reduced motion still animates'}`);
  }
}

// Observe the actual CSS result of naturally changing resource values. No HUD,
// gameplay or meter values are written; this recorded trace is not FPS evidence.
async function beginResourceTrace(page) {
  await page.evaluate(() => {
    const trace = { samples: [], stopped: false, last: -Infinity };
    window.__INKSTORM_RESOURCE_TRACE__ = trace;
    const inspect = element => {
      const box = element.getBoundingClientRect(), hiddenBy = [], clippedBy = [];
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect();
        const name = ancestor.className || ancestor.tagName;
        if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) hiddenBy.push(name);
        if (style.display !== 'contents' && bounds.width > 0 && bounds.height > 0) {
          if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)
            && (box.left < bounds.left - 1 || box.right > bounds.right + 1)) clippedBy.push(`${name}:x`);
          if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)
            && (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1)) clippedBy.push(`${name}:y`);
        }
      }
      return { box: box.toJSON(), hiddenBy, clippedBy, visible: box.width > 0 && box.height > 0
        && box.left >= -1 && box.top >= -1 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1
        && hiddenBy.length === 0 && clippedBy.length === 0 };
    };
    const frame = wallMs => {
      if (trace.stopped) return;
      if (wallMs - trace.last >= 45) {
        trace.last = wallMs;
        trace.samples.push({ wallMs, meters: ['boost', 'heat', 'damage'].map(id => {
          const fill = document.querySelector(`[data-hud="${id}-fill"]`);
          const value = document.querySelector(`[data-hud="${id}-value"]`);
          const track = fill.parentElement, box = track.getBoundingClientRect();
          return { id, boundPercent: parseFloat(fill.style.getPropertyValue('--pod-meter-value')),
            displayedPercent: Number(value.textContent), fillWidth: fill.getBoundingClientRect().width,
            trackWidth: track.clientWidth, trackBox: box.toJSON(),
            row: inspect(fill.closest('.pod-hud__meter')), track: inspect(track), value: inspect(value),
            actualPercent: 100 * fill.getBoundingClientRect().width / track.clientWidth };
        }) });
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
async function finishResourceTrace(page) {
  const trace = await page.evaluate(() => {
    const trace = window.__INKSTORM_RESOURCE_TRACE__; trace.stopped = true;
    return { samples: trace.samples };
  });
  await writeFile(`${out}/resource-bars.json`, JSON.stringify(trace, null, 2));
  assert(trace.samples.length >= 80, 'Too few native resource observations');
  for (const sample of trace.samples) for (const meter of sample.meters) {
    assert(meter.row.visible && meter.track.visible && meter.value.visible, `${meter.id}: resource row, track or percentage is hidden, clipped or outside viewport`);
    assert(Number.isFinite(meter.boundPercent) && meter.trackWidth > 10 && Number.isFinite(meter.actualPercent), `${meter.id}: resource track missing`);
    assert(Math.abs(meter.boundPercent - meter.displayedPercent) <= 1, `${meter.id}: numeric resource value differs from its binding`);
    // Boost retains its existing 80ms width transition; compare its recent
    // input range rather than declaring valid interpolation a binding error.
    const history = meter.id === 'boost' ? trace.samples.filter(prior => prior.wallMs <= sample.wallMs && prior.wallMs >= sample.wallMs - 160)
      .map(prior => prior.meters.find(item => item.id === meter.id).boundPercent) : [meter.boundPercent];
    assert(meter.actualPercent >= Math.min(...history) - 1.5 && meter.actualPercent <= Math.max(...history) + 1.5,
      `${meter.id}: visible fill ${meter.actualPercent.toFixed(2)}% does not follow bound ${meter.boundPercent}%`);
  }
  const heat = trace.samples.map(sample => sample.meters.find(meter => meter.id === 'heat').boundPercent);
  assert(heat.some(value => value <= 1) && heat.some(value => value > 5 && value < 95) && heat.some(value => value >= 99),
    'Ordinary input did not exercise zero, partial and full heat bars');
  receipt.checks.push({ label: 'native resource fill geometry follows actual bindings', samples: trace.samples.length,
    heatRange: [Math.min(...heat), Math.max(...heat)], zeroPartialFullHeat: true, evidence: 'resource-bars.json', performanceClaim: false });
}
async function layout(page, label, selector) {
  const control = page.locator(selector); await control.scrollIntoViewIfNeeded();
  const box = await control.boundingBox(), size = page.viewportSize();
  assert(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1, `${label}: primary control outside viewport`);
  const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert(Math.max(widths.document, widths.body) <= widths.viewport + 1, `${label}: horizontal page overflow`);
  await control.click({ trial: true }); receipt.checks.push({ label, widths, control: box });
  if (selector === '[data-hud="start-button"]') {
    const launch = await control.evaluate(element => ({
      fixed: document.querySelector('.pod-hud__workshop-toggle')?.disabled === true,
      width: element.getBoundingClientRect().width,
      rowWidth: element.closest('.pod-hud__selector-launch-row').getBoundingClientRect().width,
    }));
    receipt.checks.push({ label: `${label}: launch emphasis`, ...launch });
    assert(!launch.fixed || launch.width >= launch.rowWidth * 0.8, `${label}: launch collapsed into disabled workshop column`);
  }
}
async function instrumentProgressSeparation(page, label) {
  const evidence = await page.evaluate(() => {
    const visibleRect = selector => {
      const element = document.querySelector(selector); if (!element) return null;
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0
        && box.width > 0 && box.height > 0 ? { selector, ...box.toJSON() } : null;
    };
    const instrument = visibleRect('.pod-hud__driving-instruments');
    const progress = ['.pod-hud__course-progress', '[data-course-progress-rail]'].map(visibleRect).filter(Boolean);
    return { viewport: { width: innerWidth, height: innerHeight }, instrument, progress,
      separations: instrument ? progress.map(box => ({ selector: box.selector,
        horizontalGap: Math.max(box.left - instrument.right, instrument.left - box.right),
        verticalGap: Math.max(box.top - instrument.bottom, instrument.top - box.bottom) })) : [] };
  });
  receipt.checks.push({ label, ...evidence });
  assert(evidence.instrument && evidence.progress.length > 0, `${label}: missing visible instrument/progress evidence`);
  assert(evidence.separations.every(gap => Math.max(gap.horizontalGap, gap.verticalGap) >= 0), `${label}: course progress overlaps driving instrument`);
}
async function readableText(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const evidence = await locator.evaluate(element => {
    const box = element.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(element);
    const ownStyle = getComputedStyle(element), hiddenBy = [];
    if (ownStyle.display === 'none' || ownStyle.visibility !== 'visible' || Number(ownStyle.opacity) === 0) hiddenBy.push(element.className);
    const text = range.getBoundingClientRect(), clippedBy = [], boxlessAncestors = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) hiddenBy.push(parent.className);
      // display:contents participates through its children and supplies no clipping box.
      if (style.display === 'contents') { boxlessAncestors.push(parent.className); continue; }
      const bounds = parent.getBoundingClientRect();
      if ((/(auto|scroll|hidden|clip)/.test(style.overflowY) && (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1))
        || (/(auto|scroll|hidden|clip)/.test(style.overflowX) && (box.left < bounds.left - 1 || box.right > bounds.right + 1))) clippedBy.push(parent.className);
    }
    const card = element.closest('.pod-hud__workshop-part'), cardBounds = card?.getBoundingClientRect();
    return { text: element.textContent, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
      card: card ? { box: cardBounds.toJSON(), clientHeight: card.clientHeight, scrollHeight: card.scrollHeight } : null,
      box: box.toJSON(), textBounds: text.toJSON(), clippedBy, hiddenBy, boxlessAncestors, inViewport: box.top >= -1 && box.left >= -1 && box.bottom <= innerHeight + 1 && box.right <= innerWidth + 1 };
  });
  receipt.checks.push({ label, ...evidence });
  assert(evidence.text?.trim() && evidence.box.height > 0 && evidence.inViewport && !evidence.clippedBy.length && !evidence.hiddenBy.length
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
async function verifyWorkshopGlyph(card, label, id) {
  const glyph = card.locator('.pod-hud__component-symbol'); await glyph.scrollIntoViewIfNeeded();
  const glyphEvidence = await glyph.evaluate(element => {
    const box = element.getBoundingClientRect(), failures = [];
    if (box.width <= 0 || box.height <= 0 || box.top < -1 || box.left < -1 || box.bottom > innerHeight + 1 || box.right > innerWidth + 1) failures.push('glyph box');
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) failures.push(`hidden ${node.className}`);
      if (node === element || style.display === 'contents') continue;
      const bounds = node.getBoundingClientRect();
      if ((/(auto|scroll|hidden|clip)/.test(style.overflowY) && (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1))
        || (/(auto|scroll|hidden|clip)/.test(style.overflowX) && (box.left < bounds.left - 1 || box.right > bounds.right + 1))) failures.push(`clipped ${node.className}`);
    }
    return {box: box.toJSON(), failures};
  });
  assert(!glyphEvidence.failures.length, `${label} ${id}: hidden/clipped schematic: ${glyphEvidence.failures.join('; ')}`);
  return glyphEvidence;
}
// Exercise real catalogue content and native equip actions; preserve the initial loadout.
async function workshopCatalogue(page, label) {
  const workshop = page.locator('[data-hud="workshop"]');
  const slots = await workshop.locator('[data-action="select-workshop-slot"]').evaluateAll(elements => elements.map(element => element.dataset.slot));
  const items = [], initialLoadout = {};
  const persistedBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('now-this-is-podracing.workshop'))?.loadouts.podracer.slots ?? null);
  // Observe all five original selections before any equip can affect another slot.
  for (const slot of slots) {
    await workshop.locator(`[data-action="select-workshop-slot"][data-slot="${slot}"]`).click();
    await page.waitForFunction(slot => document.querySelector('[data-action="equip-workshop-part"]')?.dataset.slot === slot, slot);
    initialLoadout[slot] = await workshop.locator('[data-action="equip-workshop-part"][aria-pressed="true"]').getAttribute('data-part-id');
    assert(!persistedBefore || persistedBefore[slot] === initialLoadout[slot], `${label}: initial UI/storage selection differs for ${slot}`);
  }
  for (const slot of slots) {
    await workshop.locator(`[data-action="select-workshop-slot"][data-slot="${slot}"]`).click();
    await page.waitForFunction(slot => document.querySelector('[data-action="equip-workshop-part"]')?.dataset.slot === slot, slot);
    assert(await workshop.locator('[data-action="equip-workshop-part"][aria-pressed="true"]').getAttribute('data-part-id') === initialLoadout[slot], `${label}: previous slot equip changed ${slot}`);
    const ids = await workshop.locator('[data-action="equip-workshop-part"]').evaluateAll(elements => elements.map(element => element.dataset.partId));
    for (const id of ids) {
      const card = workshop.locator(`[data-action="equip-workshop-part"][data-part-id="${id}"]`);
      if (label === 'desktop') await card.hover();
      else {
        await card.tap();
        await page.waitForFunction(id => document.querySelector(`[data-action="equip-workshop-part"][data-part-id="${id}"]`)?.getAttribute('aria-pressed') === 'true', id);
        await page.waitForTimeout(340);
      }
      for (const selector of ['strong', 'p', '.is-benefit', '.is-tradeoff', '.pod-hud__equip-action']) {
        await readableText(card.locator(selector), `${label} ${id} ${selector}`);
      }
      if (label === 'desktop' && await card.getAttribute('aria-pressed') === 'false') {
        await readableText(card.locator('.pod-hud__part-comparison'), `${label} ${id} comparison disclosure`);
      }
      const glyphEvidence = await verifyWorkshopGlyph(card, label, id);
      await card.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(id => document.querySelector(`[data-action="equip-workshop-part"][data-part-id="${id}"]`)?.getAttribute('aria-pressed') === 'true', id);
      await page.waitForTimeout(340);
      const installedGlyphEvidence = await verifyWorkshopGlyph(card, label, id);
      const state = await card.evaluate(element => ({id: element.dataset.partId, slot: element.dataset.slot,
        focused: document.activeElement === element, equipped: element.getAttribute('aria-pressed') === 'true',
        name: element.querySelector('strong').textContent,
        persistedPart: JSON.parse(localStorage.getItem('now-this-is-podracing.workshop'))?.loadouts.podracer.slots[element.dataset.slot],
        glyph: element.querySelector('.pod-hud__component-symbol')?.getBoundingClientRect().toJSON() ?? null}));
      assert(state.focused && state.equipped && state.persistedPart === id && state.glyph?.width > 0, `${label} ${id}: equip lost native focus/selection or visible schematic`);
      await readableText(card.locator('p'), `${label} ${id} installed description`);
      items.push({...state, glyphEvidence, installedGlyphEvidence, inputMode: label === 'desktop' ? 'native Enter equip' : 'native tap equip, then Enter focus/idempotence'});
    }
    await workshop.locator(`[data-action="equip-workshop-part"][data-part-id="${initialLoadout[slot]}"]`).click();
    await page.waitForFunction(id => document.querySelector(`[data-action="equip-workshop-part"][data-part-id="${id}"]`)?.getAttribute('aria-pressed') === 'true', initialLoadout[slot]);
  }
  assert(slots.length === 5 && items.length === 20 && new Set(items.map(item => item.id)).size === 20, `${label}: complete real catalogue not exercised`);
  await workshop.locator('[data-action="select-workshop-slot"][data-slot="engine"]').click();
  await page.waitForFunction(() => document.querySelector('[data-action="equip-workshop-part"]')?.dataset.slot === 'engine');
  const finalLoadout = await page.evaluate(() => JSON.parse(localStorage.getItem('now-this-is-podracing.workshop')).loadouts.podracer.slots);
  assert(Object.entries(initialLoadout).every(([slot, id]) => finalLoadout[slot] === id), `${label}: catalogue check did not restore actual original loadout`);
  const evidence = {label, items, persistedBefore, initialLoadout, finalLoadout, restoredEachSlot: true, scope: 'Ordinary UI clicks and Enter; no loadout/state injection. Readability requires real unclipped boxes.'};
  await writeFile(`${out}/catalogue-${label}.json`, JSON.stringify(evidence, null, 2));
  receipt.checks.push({label: `${label} native all20 parts/equip/restore`, items: items.length, outcome: 'PASS', evidence: `catalogue-${label}.json`});
}
async function boot(context) {
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  if (page.video()) desktopVideo = page.video();
  page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
  await page.goto(url); await page.waitForFunction(() => window.__PODRACING__?.ready, undefined, { timeout: 45000 });
  await page.waitForFunction(() => document.querySelector('[data-hud="garage-model"]')?.dataset.previewReady === 'true', undefined, { timeout: 45000 });
  return page;
}
async function eventPreparationLifecycle(context) {
  const page = await boot(context), initial = await snap(page);
  const base = initial.game.course, records = [];
  const choose = async id => {
    await page.locator(`[data-action="select-atlas-event"][data-event-id="${id}"]`).click();
    await page.waitForFunction(id => window.__PODRACING__.snapshot().game.mastery.eventId === id, id);
    // The next HUD frame publishes aria-pressed; never focus the previous event.
    await page.locator(`[data-action="select-atlas-event"][data-event-id="${id}"][aria-pressed="true"]`).waitFor();
    const state = await snap(page); records.push({ event: id, pending: state.game.pendingCourse, builtSeed: state.game.course.seed, ordinal: state.game.course.ordinal });
    return state;
  };
  await act(page, 'open-event-atlas').click();
  const school = await choose('flight-school'), cup = await choose('cup-canyon');
  assert(school.game.pendingCourse?.seed === base.seed && cup.game.pendingCourse?.seed === base.seed,
    'Shared-seed school/Cup selection reserved wrong route');
  assert(school.game.course.ordinal === base.ordinal && cup.game.course.ordinal === base.ordinal,
    'Browsing constructed a new course');
  await act(page, 'launch-atlas-event').click();
  await page.waitForFunction(() => !window.__PODRACING__.snapshot().game.awaitingStart);
  const cupStart = await snap(page);
  assert(cupStart.game.pendingCourse === null && cupStart.game.course.seed === base.seed
    && cupStart.game.course.ordinal === base.ordinal + 1 && cupStart.game.competitionProfile === 'clean-race'
    && cupStart.galactic.racers.length === 8, 'Same-seed Cup launch did not build its full distinct profile exactly once');
  await page.waitForFunction(() => window.__PODRACING__.snapshot().raceTime > .05);
  await page.keyboard.press('p', { delay: 100 });
  await page.locator('.pod-hud__pause-home [data-action="return-to-garage"]').click();
  await page.waitForFunction(() => window.__PODRACING__.snapshot().game.awaitingStart);
  await act(page, 'open-event-atlas').click();
  const first = await choose('open-expedition');
  await page.locator('.race-event-atlas__event[aria-pressed="true"]').focus();
  await page.keyboard.press('Enter');
  const repeated = await snap(page);
  assert(repeated.game.pendingCourse?.seed === first.game.pendingCourse?.seed
    && repeated.game.course.ordinal === first.game.course.ordinal && repeated.game.awaitingStart,
    'Enter on the selected event changed route or launched');
  await choose('flight-school'); const second = await choose('open-expedition');
  const reservedSeed = second.game.pendingCourse?.seed;
  assert(Number.isInteger(reservedSeed) && reservedSeed !== first.game.pendingCourse?.seed
    && second.game.course.ordinal === cupStart.game.course.ordinal, 'Expedition browsing reused a reserved seed or rebuilt the world');
  await act(page, 'close-event-atlas').click(); await act(page, 'save-course').click();
  await page.waitForFunction(() => window.__PODRACING__.snapshot().game.mastery.courseSaved);
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('podracing.inkstorm.mastery.v1')));
  const favorite = profile.favorites.find(course => course.seed === reservedSeed);
  assert(favorite, 'Save course stored the previously built route instead of pending selection');
  await act(page, 'open-event-atlas').click();
  const expanded = page.locator('.race-event-atlas.has-expanded-calendar'); await expanded.waitFor();
  // Read finished content after the intentional map-entry fade, not its opacity-zero first frame.
  await page.waitForFunction(() => {
    const atlas = document.querySelector('.race-event-atlas.has-expanded-calendar');
    return atlas && atlas.getAnimations({subtree:true}).every(animation => animation.playState !== 'running')
      && getComputedStyle(atlas.querySelector('.race-event-atlas__viewport')).opacity === '1';
  });
  assert(await expanded.locator('.race-event-atlas__event').count() === 8, 'Saved destination missing from calendar');
  for (const name of await expanded.locator('.race-event-atlas__name').all()) await readableText(name, 'saved-calendar destination');
  const boxes = await expanded.locator('.race-event-atlas__event').evaluateAll(elements => elements.map(element => ({ id: element.dataset.eventId, ...element.getBoundingClientRect().toJSON() })));
  assert(boxes.every((a, i) => boxes.slice(i + 1).every(b => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)), 'Saved destination shares another event position');
  await choose(favorite.id); await shot(page, '15-desktop-saved-calendar');
  await act(page, 'launch-atlas-event').click();
  await page.waitForFunction(() => !window.__PODRACING__.snapshot().game.awaitingStart);
  const savedStart = await snap(page);
  assert(savedStart.game.pendingCourse === null && savedStart.game.course.seed === reservedSeed
    && savedStart.game.course.ordinal === cupStart.game.course.ordinal + 1
    && savedStart.game.competitionProfile === 'time-trial' && savedStart.galactic.racers.length === 1,
    'Saved pending route did not promote exactly once into its stock solo event');
  await writeFile(`${out}/event-preparation-lifecycle.json`, JSON.stringify({ initial, records, cupStart, first, repeated, second, favorite, boxes, savedStart }, null, 2));
  receipt.checks.push({ label: 'native deferred event / same-seed profile / saved-route lifecycle', outcome: 'PASS', reservedSeed, evidence: 'event-preparation-lifecycle.json' });
}
try {
  let serving = false;
  for (let attempt = 0; attempt < 150; attempt++) { if (spawnError) throw spawnError; assert(server.exitCode === null, 'Preview exited before ready'); try { if ((await fetch(url)).ok) { serving = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 100)); }
  assert(serving, 'Preview readiness timed out'); browser = await chromium.launch({ channel: 'chrome', headless: true });
  desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: { dir: `${out}/video`, size: { width: 1440, height: 900 } } });
  const page = await boot(desktop), video = page.video(); receipt.environment = await frozenBuildReceipt(page, browser);
  const typeface = await page.evaluate(async () => {
    await document.fonts.ready;
    return { headingFamily: getComputedStyle(document.querySelector('.pod-hud__vehicle-select-head h1')).fontFamily,
      fonts: [...document.fonts].map(font => ({ family: font.family, status: font.status })) };
  });
  receipt.checks.push({ label: 'native broad heading font loaded', ...typeface });
  assert(typeface.headingFamily.includes('Inkstorm Plate') && typeface.fonts.some(font => font.family.includes('Inkstorm Plate') && font.status === 'loaded'), 'Heading font silently fell back');
  await page.locator('[data-hud="start-button"]').hover(); await page.waitForTimeout(220);
  const hover = await page.locator('[data-hud="start-button"]').evaluate(element => {
    const style = getComputedStyle(element), luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, index) => sum + v * [.2126, .7152, .0722][index], 0);
    const foreground = luminance(style.color), background = luminance(style.backgroundColor);
    return { color: style.color, background: style.backgroundColor, contrast: (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) };
  }); receipt.checks.push({ label: 'Start hover contrast', ...hover }); assert(hover.contrast >= 4.5, 'Start hover loses readable contrast');
  await layout(page, 'desktop garage', '[data-hud="start-button"]');
  await readableText(page.locator('[data-hud="garage-description"]'), 'desktop garage description');
  const heroText = await page.locator('[data-hud="garage-description"]').evaluate(element => ({ bottom: element.getBoundingClientRect().bottom, statsTop: document.querySelector('[data-hud="garage-stats"]').getBoundingClientRect().top }));
  receipt.checks.push({ label: 'garage description/stat separation', ...heroText });
  assert(heroText.bottom <= heroText.statsTop - 3, 'Garage description overlaps rating strip');
  await shot(page, '01-desktop-garage');
  await beginMotion(page, 'map-entry', ['.race-event-atlas__header', '.race-event-atlas__viewport', '.race-event-atlas__footer']);
  await act(page, 'open-event-atlas').click(); await finishMotion(page);
  const atlas = page.getByRole('dialog', { name: 'Race event atlas' });
  const selected = atlas.locator('.race-event-atlas__event[aria-pressed="true"]'); const prior = await selected.getAttribute('data-event-id');
  await selected.focus();
  await beginMotion(page, 'map-selection', ['.race-event-atlas__event', '.race-event-atlas__disc']);
  await page.keyboard.press('ArrowRight'); await finishMotion(page);
  await page.waitForFunction(id => document.querySelector('.race-event-atlas__event[aria-pressed="true"]')?.getAttribute('data-event-id') !== id, prior);
  const arrowEvent = await atlas.locator('.race-event-atlas__event[aria-pressed="true"]').getAttribute('data-event-id'); await page.keyboard.press('Enter');
  assert((await snap(page)).game.awaitingStart, 'Enter on selected atlas event unexpectedly started race');
  await atlas.locator('[data-action="select-atlas-event"][data-event-id="open-expedition"]').click();
  await page.waitForFunction(() => window.__PODRACING__.snapshot().game.mastery?.eventId === 'open-expedition');
  receipt.checks.push({ label: 'native atlas Arrow/Enter and open-expedition selection', prior, arrowEvent, enterDidNotStart: true });
  await atlasLabels(page, 'desktop atlas'); await layout(page, 'desktop atlas launch', '[data-action="launch-atlas-event"]'); await shot(page, '02-desktop-map'); await act(page, 'close-event-atlas').click();
  await beginMotion(page, 'build-entry', ['.pod-hud__workshop', '.pod-hud__workshop-slots', '.pod-hud__workshop-parts', '.pod-hud__workshop-summary']);
  await act(page, 'open-workshop').click(); await finishMotion(page);
  const workshop = page.locator('[data-hud="workshop"]');
  const part = workshop.locator('[data-action="equip-workshop-part"][aria-pressed="false"]').first(); const partId = await part.getAttribute('data-part-id');
  await beginMotion(page, 'equip-part', ['.pod-hud__workshop-part', '.pod-hud__workshop-slot']);
  await part.focus(); await page.keyboard.press('Enter'); await finishMotion(page);
  await page.waitForFunction(id => document.querySelector(`[data-action="equip-workshop-part"][data-part-id="${id}"]`)?.getAttribute('aria-pressed') === 'true', partId);
  const equippedFocus = await page.evaluate(() => ({ action: document.activeElement?.dataset.action, partId: document.activeElement?.dataset.partId }));
  assert(equippedFocus.action === 'equip-workshop-part' && equippedFocus.partId === partId, 'Equipping a part discarded keyboard focus');
  receipt.checks.push({ label: 'native Enter equip retains keyboard focus', ...equippedFocus });
  receipt.checks.push({ label: 'real workshop part equipped', partId, snapshot: await snap(page) }); await workshopContents(page, workshop); await shot(page, '03-desktop-build');
  await workshopCatalogue(page, 'desktop');
  await workshop.getByRole('button', { name: 'Close workshop', exact: true }).click();
  for (const selector of ['.pod-hud__selector-controls > summary', '[data-hud="room-panel"] > summary']) { await page.locator(selector).click(); }
  await shot(page, '04-desktop-manual-online');
  for (const selector of ['.pod-hud__selector-controls > summary', '[data-hud="room-panel"] > summary']) { await page.locator(selector).click(); }
  await act(page, 'start-race').click(); await page.waitForFunction(() => !window.__PODRACING__.snapshot().game.awaitingStart); await shot(page, '05-desktop-countdown');
  await page.locator('canvas').first().click(); const before = await snap(page); await beginResourceTrace(page); await page.keyboard.down('w');
  try { await page.waitForTimeout(4000); await instrumentProgressSeparation(page, 'desktop live instrument/progress separation'); await shot(page, '06-desktop-live-race'); await page.waitForTimeout(4000); } finally { await page.keyboard.up('w'); }
  await finishResourceTrace(page);
  const after = await snap(page); assert(after.simulationFrame > before.simulationFrame && after.raceTime > 0, 'Native W run did not advance actual race frames');
  assert(after.game.speed > 1 && Math.hypot(after.game.position[0] - before.game.position[0], after.game.position[2] - before.game.position[2]) > 1, 'Native W input did not move the actual player');
  receipt.checks.push({ label: '8-second ordinary W input', before, after, performanceClaim: false });
  await page.keyboard.press('p', { delay: 100 }); await page.locator('[data-hud="pause"][aria-hidden="false"]').waitFor(); await shot(page, '07-desktop-paused');
  await page.locator('.pod-hud__pause-home [data-action="toggle-settings"]').click(); await page.locator('[data-settings-tab="comfort"]').click();
  await page.locator('[data-setting="comfort.reducedMotion"]').check(); await page.locator('.pod-hud.is-reduced-motion').waitFor(); await shot(page, '08-desktop-reduced-motion');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.locator('.pod-hud__pause-home [data-action="return-to-garage"]').click();
  await page.waitForFunction(() => window.__PODRACING__.snapshot().game.awaitingStart);
  await beginMotion(page, 'reduced-map-entry', ['.race-event-atlas__header', '.race-event-atlas__viewport', '.race-event-atlas__footer']);
  await act(page, 'open-event-atlas').click(); await finishMotion(page, false);
  await page.locator('.race-event-atlas__event[aria-pressed="true"]').focus();
  await beginMotion(page, 'reduced-map-selection', ['.race-event-atlas__event', '.race-event-atlas__disc']);
  await page.keyboard.press('ArrowRight'); await finishMotion(page, false);
  await act(page, 'close-event-atlas').click();
  await desktop.close(); desktop = undefined; receipt.desktopVideo = await video.path();
  for (const [label, viewport] of [['mobile', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    try { const narrow = await boot(context); await layout(narrow, `${label} garage`, '[data-hud="start-button"]'); await shot(narrow, `${label}-garage`);
      await act(narrow, 'open-event-atlas').click(); await atlasLabels(narrow, `${label} atlas`); await layout(narrow, `${label} atlas`, '[data-action="launch-atlas-event"]'); await shot(narrow, `${label}-map`);
      await act(narrow, 'launch-atlas-event').click(); await narrow.waitForFunction(() => !window.__PODRACING__.snapshot().game.awaitingStart); await instrumentProgressSeparation(narrow, `${label} countdown instrument/progress separation`); await shot(narrow, `${label}-countdown`);
      await narrow.waitForFunction(() => window.__PODRACING__.snapshot().raceTime > .05);
      await narrow.keyboard.press('p', { delay: 100 });
      await narrow.locator('.pod-hud__pause-home [data-action="return-to-garage"]').click();
      await narrow.waitForFunction(() => window.__PODRACING__.snapshot().game.awaitingStart);
      await narrow.locator('[data-action="select-event"][data-event-id="open-expedition"]:visible').click();
      await act(narrow, 'open-workshop').click(); await shot(narrow, `${label}-build`);
      await workshopCatalogue(narrow, label);
    } finally { await context.close(); }
  }
  const lifecycleContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  try { await eventPreparationLifecycle(lifecycleContext); } finally { await lifecycleContext.close(); }
  assert(!receipt.errors.length, 'Browser console/page errors');
  assert(!receipt.motionFailures?.length, `Native motion checks failed: ${receipt.motionFailures?.join('; ')}`);
  receipt.outcome = 'PASS';
} catch (error) { receipt.error = String(error); process.exitCode = 1; }
finally { try { await closeOwned(); } catch (error) { receipt.outcome = 'FAIL'; receipt.cleanupError = String(error); process.exitCode = 1; await writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2)); } }
console.log(JSON.stringify({ outcome: receipt.outcome, captures: receipt.captures.length, errors: receipt.errors, error: receipt.error, cleanup: receipt.cleanup }));
