import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Component-only layout regression: explicit view-model fixtures are never
// presented as ordinary driving, in-world evidence, or a performance result.
const port = Number(process.env.INKSTORM_OWNED_PORT ?? 5189);
const out = process.env.INKSTORM_OUTPUT ?? 'output/playwright/hud-feedback-fixtures';
if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 5211) throw new Error('Use a dedicated owned port.');
const receipt = { outcome: 'FAIL', port, scope: 'Explicit component view-model fixtures. No game state, ordinary driving, in-world visual or FPS claim.', sources: [], cases: [], errors: [] };
await mkdir(out, { recursive: true });
for (const path of ['src/ui/RaceHud.ts', 'src/ui/broadcastStyles.ts', 'src/ui/hudStyles.ts', 'src/ui/inkstormStyles.ts', 'tests/ui/runtimeHarness.ts', 'tests/ui/runtime-harness.html', 'scripts/inkstorm-hud-feedback-fixtures.mjs']) {
  receipt.sources.push({ path, sha256: createHash('sha256').update(await readFile(path)).digest('hex') });
}
const probe = createServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(port, '127.0.0.1', resolve); });
await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser, closing, spawnError;
server.on('error', error => { spawnError = error; });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const close = () => closing ??= (async () => {
  receipt.cleanup = { browserClosed: false, serverExited: false, errors: [] };
  try { if (browser) await browser.close(); receipt.cleanup.browserClosed = true; } catch (error) { receipt.cleanup.errors.push(String(error)); }
  try {
    if (server.pid && server.exitCode === null && server.signalCode === null) {
      const exited = new Promise(resolve => server.once('exit', resolve)); server.kill('SIGTERM');
      await Promise.race([exited, new Promise((_, reject) => setTimeout(() => reject(new Error('Server exit timeout')), 3000))]);
    }
  } catch (error) {
    receipt.cleanup.errors.push(String(error));
    if (server.pid && server.exitCode === null && server.signalCode === null) { const exited = new Promise(resolve => server.once('exit', resolve)); server.kill('SIGKILL'); await exited; }
  }
  receipt.cleanup.serverExited = Boolean(spawnError) || server.exitCode !== null || server.signalCode !== null;
  if (receipt.cleanup.errors.length || !receipt.cleanup.browserClosed || !receipt.cleanup.serverExited) receipt.outcome = 'FAIL';
  await writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
})();
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) process.once(signal, () => void close().finally(() => process.exit(code)));
const outcomes = {
  perfect: ['Perfect launch', 'Boost charged // Full impulse'], good: ['Clean launch', 'Impulse stable'],
  bog: ['Engine bog', 'Low revs // Recover throttle'], overheat: ['Over-rev', 'Core hot // Throttle limited'],
};
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/tests/ui/runtime-harness.html`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'Fixture server not ready');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [label, width, height] of [['desktop', 1440, 900], ['portrait', 390, 844], ['landscape', 844, 390], ['compact-landscape', 667, 375]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => receipt.errors.push(String(error)));
      page.on('response', response => { if (response.status() >= 400) (receipt.failedResponses ??= []).push({ url: response.url(), status: response.status() }); });
      page.on('console', message => { if (message.type() === 'error') receipt.errors.push({ text: message.text(), location: message.location() }); });
      await page.goto(`http://127.0.0.1:${port}/tests/ui/runtime-harness.html`);
      await page.waitForFunction(() => window.__HUD_READY__);
      for (const reduced of [false, true]) {
        await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
        for (const [id, outcome, drift, airborne, priority] of [
          ['perfect', 'perfect', false, false, null], ['good', 'good', false, false, null],
          ['bog-drift', 'bog', true, false, null], ['overheat-airborne', 'overheat', false, true, null],
          ['all', 'overheat', true, true, null], ['danger', 'overheat', true, true, 'danger'],
          ['combat', 'overheat', true, true, 'combat'], ['charging', null, false, false, null],
        ]) {
          await page.evaluate(({ outcome, drift, airborne, priority }) => {
            const model = window.__HUD_MODEL__, hud = window.__HUD_INSTANCE__;
            model.phase = outcome ? 'racing' : 'countdown'; model.countdownCue = null;
            model.preRace = undefined; model.controlsVisible = false; model.splitDelta = null; model.lastSplit = null;
            model.driftCharge = drift ? .63 : 0; model.airborne = airborne; model.groundClearance = 5.6; model.verticalSpeed = -2;
            model.wrongWay = priority === 'danger'; model.galactic.wreckPhase = null;
            model.launch = { stage: outcome ? 'result' : 'charging', outcome, rev: .69, target: .74, sweetSpotMin: .63, sweetSpotMax: .84, heat: .42 };
            hud.update(model); hud.updateCombat({ cue: priority === 'combat' ? { kind: 'takedown', title: 'TAKEDOWN', detail: 'Fixture rival', progress: .2 } : null, cinematic: { active: false, letterbox: false } });
          }, { outcome, drift, airborne, priority });
          await page.waitForTimeout(500);
          const evidence = await page.evaluate(() => {
            const inspect = selector => {
              const element = document.querySelector(selector); if (!element) return null;
              const box = element.getBoundingClientRect(), hiddenBy = [], clippedBy = [];
              const range = document.createRange(); range.selectNodeContents(element); const textBox = range.getBoundingClientRect();
              for (let node = element; node; node = node.parentElement) {
                const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
                if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) hiddenBy.push(node.className);
                if (style.display !== 'contents' && ((/(auto|hidden|scroll|clip)/.test(style.overflowX) && (textBox.left < bounds.left - 1 || textBox.right > bounds.right + 1)) || (/(auto|hidden|scroll|clip)/.test(style.overflowY) && (textBox.top < bounds.top - 1 || textBox.bottom > bounds.bottom + 1)))) clippedBy.push(node.className);
              }
              return { selector, text: element.textContent.trim(), box: box.toJSON(), textBox: textBox.toJSON(), hiddenBy, clippedBy,
                position: getComputedStyle(element).position, zIndex: getComputedStyle(element).zIndex, parentClass: element.parentElement?.className, visible: box.width > 0 && box.height > 0 && !hiddenBy.length,
                inViewport: textBox.width > 0 && textBox.left >= 0 && textBox.right <= innerWidth + 1 && textBox.top >= 0 && textBox.bottom <= innerHeight + 1 };
            };
            const selectors = { launch: '.pod-hud__launch', title: '.pod-hud__launch header strong', cause: '.pod-hud__launch footer span', drift: '.pod-hud__meter--drift', flight: '.pod-hud__flight', flightClearance: '[data-hud="flight-clearance"]', flightMotion: '[data-hud="flight-motion"]', driftValue: '[data-hud="drift-value"]', instrument: '.pod-hud__driving-instruments', progress: '.pod-hud__course-progress', corner: '.pod-hud__corner', combat: '.pod-hud__combat-feedback', systems: '.pod-hud__systems-cluster', target: '.pod-hud__context-action', route: '.pod-hud__race>.pod-hud__detail-toggle', rail: '.pod-hud__race-rail' };
            const result = Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, inspect(selector)]));
            // A DOM-readable label can still fall outside its shaped glass backing.
            // Test actual screen-to-SVG coordinates, not a rectangular SVG envelope.
            const glass = document.querySelector('.pod-hud__speed-dial .dial-glass');
            const matrix = glass?.getScreenCTM()?.inverse();
            result.glassContainment = ['boost', 'heat', 'damage'].flatMap(kind => ['.pod-hud__label', '.pod-hud__meter-value'].map(part => {
              const selector = `.pod-hud__driving-instruments .pod-hud__meter--${kind} ${part}`;
              const node = inspect(selector);
              // The right-aligned numeric grid cell includes its generated '%' unit,
              // which Range.selectNodeContents does not measure. Cover that whole
              // cell as well as the numeric text's line box.
              const b = node && part === '.pod-hud__meter-value' ? {
                left: Math.min(node.box.left, node.textBox.left), right: Math.max(node.box.right, node.textBox.right),
                top: Math.min(node.box.top, node.textBox.top), bottom: Math.max(node.box.bottom, node.textBox.bottom),
              } : node?.textBox;
              const outside = [];
              if (node?.visible && b && glass && matrix) for (const x of [b.left + 1, (b.left + b.right) / 2, b.right - 1]) {
                for (const y of [b.top + 1, (b.top + b.bottom) / 2, b.bottom - 1]) {
                  const point = new DOMPoint(x, y).matrixTransform(matrix);
                  if (!glass.isPointInFill(point)) outside.push({ x, y, localX: point.x, localY: point.y });
                }
              }
              return { selector, visible: node?.visible, measuredEnvelope: b, includesGeneratedUnitCell: part === '.pod-hud__meter-value', glassAvailable: Boolean(glass && matrix), outside };
            }));
            return result;
          });
          const c = { label, reduced, id, fixture: { outcome, drift, airborne, priority }, evidence, issues: [] };
          receipt.cases.push(c);
          const check = (ok, message) => { if (!ok) c.issues.push(message); };
          const readable = node => node?.visible && node.inViewport && !node.clippedBy.length;
          if (priority) check(!evidence.launch?.visible, 'Higher-priority context leaves launch visible');
          else {
            check(readable(evidence.title) && readable(evidence.cause), 'Launch outcome/cause hidden, clipped or outside viewport');
            if (outcome) { check(evidence.title?.text === outcomes[outcome][0], 'Incorrect launch outcome'); check(evidence.cause?.text === outcomes[outcome][1], 'Incorrect launch cause'); }
            else check(evidence.cause?.text.includes('REV 069 // TARGET 074'), 'Charging values missing');
          }
          if (evidence.route?.visible && evidence.rail?.visible) check(readable(evidence.route)
            && evidence.route.parentClass === evidence.rail.parentClass
            && ['absolute', 'fixed'].includes(evidence.route.position)
            && (Number.parseInt(evidence.route.zIndex) || 0) > (Number.parseInt(evidence.rail.zIndex) || 0),
            'ROUTE control is clipped or painted below the timing glass');
          for (const entry of evidence.glassContainment) if (entry.visible) check(entry.glassAvailable && entry.outside.length === 0,
            `${entry.selector} falls outside the shaped instrument backing`);
          const active = ['launch', 'drift', 'flight'].filter(key => evidence[key]?.visible);
          if (drift) { check(readable(evidence.drift), 'Charged drift readout lost'); check(readable(evidence.driftValue) && evidence.driftValue.text === '63', 'Actual drift percentage hidden or incorrect'); }
          if (airborne) { check(readable(evidence.flight), 'Airborne readout lost'); check(readable(evidence.flightClearance) && evidence.flightClearance.text === '05.6 M CLEAR', 'Actual clearance hidden or incorrect'); check(readable(evidence.flightMotion) && evidence.flightMotion.text.includes('Landing // Brace'), 'Landing instruction hidden or incorrect'); }
          const separated = (a, b) => Math.max(b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom) >= -1;
          if (evidence.instrument?.visible && evidence.progress?.visible) check(separated(evidence.instrument.box, evidence.progress.box), 'Driving instrument overlaps progress');
          if (outcome) for (let a = 0; a < active.length; a++) {
            for (let b = a + 1; b < active.length; b++) check(separated(evidence[active[a]].box, evidence[active[b]].box), `${active[a]} overlaps ${active[b]}`);
            for (const key of ['instrument', 'progress', 'corner', 'systems', 'target']) if (evidence[key]?.visible) check(separated(evidence[active[a]].box, evidence[key].box), `${active[a]} overlaps ${key}`);
          }
          if (id === 'all' && !reduced || c.issues.length) await page.screenshot({ path: `${out}/${label}-${id}-${reduced ? 'reduced' : 'normal'}-fixture.png` });
        }
        await page.evaluate(() => {
          const m = window.__HUD_MODEL__, hud = window.__HUD_INSTANCE__;
          m.phase = 'racing'; m.wrongWay = false; m.launch = undefined; m.driftCharge = 0; m.airborne = false;
          m.galactic.wreckPhase = 'wrecked'; m.galactic.wreckTimer = .4; hud.update(m);
          hud.updateCombat({ cue: { kind: 'wreck', title: 'WRECKED', detail: 'RECOVERY INBOUND', progress: .2 }, cinematic: { active: true, letterbox: true } });
        });
        await page.waitForTimeout(500);
        const before = await page.locator('.pod-hud__combat-feedback').evaluate(e => ({ width: e.getBoundingClientRect().width, x: e.getBoundingClientRect().x, hidden: getComputedStyle(e).visibility === 'hidden' || getComputedStyle(e).display === 'none' }));
        await page.evaluate(() => window.__HUD_INSTANCE__.updateCombat({ cue: null, cinematic: { active: false, letterbox: false } }));
        await page.waitForTimeout(500);
        const after = await page.locator('.pod-hud__galactic-alert').evaluate(e => ({ width: e.getBoundingClientRect().width, x: e.getBoundingClientRect().x, hidden: getComputedStyle(e).visibility === 'hidden' || getComputedStyle(e).display === 'none' }));
        (receipt.wreckHandoffs ??= []).push({ label, reduced, before, after, passed: !before.hidden && !after.hidden && Math.abs(before.width - after.width) <= 1 && Math.abs(before.x - after.x) <= 1 });
        // Regression: a wreck can remain physically airborne with residual drift charge.
        // Driving instructions must disappear until controls return, then work again.
        for (const phase of ['cue-before-model', 'paused-before-model', 'wrecked', 'recovering', null]) {
          await page.evaluate(phase => {
            const m = window.__HUD_MODEL__;
            m.galactic.wreckPhase = phase === 'cue-before-model' || phase === 'paused-before-model' ? null : phase; m.airborne = true; m.driftCharge = .63;
            window.__HUD_INSTANCE__.update(m);
            window.__HUD_INSTANCE__.setPaused(phase === 'paused-before-model');
            window.__HUD_INSTANCE__.updateCombat({ cue: phase === 'cue-before-model'
              ? { kind: 'wreck', title: 'WRECKED', detail: 'RECOVERY INBOUND', progress: .001 } : null,
              cinematic: { active: false, letterbox: false } });
          }, phase);
          await page.waitForTimeout(500);
          const feedback = await page.evaluate(() => {
            const visible = selector => {
              const e = document.querySelector(selector);
              for (let n = e; n; n = n.parentElement) {
                const s = getComputedStyle(n);
                if (s.display === 'none' || s.visibility !== 'visible' || Number(s.opacity) === 0) return false;
              }
              return e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
            };
            return { flight: visible('.pod-hud__flight'), drift: visible('.pod-hud__meter--drift'),
              flightAriaHidden: document.querySelector('.pod-hud__flight').getAttribute('aria-hidden') };
          });
          (receipt.wreckDrivingFeedback ??= []).push({ label, reduced, phase: phase ?? 'running', feedback,
            passed: phase === 'cue-before-model' || phase === 'paused-before-model' ? !feedback.flight && !feedback.drift
              : phase === null ? feedback.flight && feedback.drift && feedback.flightAriaHidden === 'false'
              : !feedback.flight && !feedback.drift && feedback.flightAriaHidden === 'true' });
        }
      }
    } finally { await context.close(); }
  }
  assert(!receipt.errors.length, 'Component browser errors');
  assert(receipt.cases.every(c => !c.issues.length), `${receipt.cases.filter(c => c.issues.length).length} component layout cases fail`);
  assert(receipt.wreckHandoffs.every(c => c.passed), 'Wreck status changes width or position during handoff');
  assert(receipt.wreckDrivingFeedback.every(c => c.passed), 'Wreck driving instructions leak or fail to return after recovery');
  receipt.outcome = 'PASS';
} catch (error) { receipt.error = String(error); process.exitCode = 1; }
finally { await close(); if (receipt.outcome !== 'PASS') process.exitCode = 1; }
console.log(JSON.stringify({ outcome: receipt.outcome, cases: receipt.cases.length, failures: receipt.cases.filter(c => c.issues.length).map(c => ({ label: c.label, reduced: c.reduced, id: c.id, issues: c.issues })), error: receipt.error, cleanup: receipt.cleanup }));
