import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

const output = process.env.INKSTORM_OUTPUT ?? 'output/gauntlet/round-16-hud';
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
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const receipt = { outcome: 'FAIL', startedAt: new Date().toISOString(), captures: [], checks: [], pageErrors: [], consoleErrors: [], combinedSearch: [] };
const check = (condition, message, detail) => receipt.checks.push({ pass: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) });
const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const deadline = setTimeout(() => { receipt.timeout = '120 second harness deadline'; void browser?.close(); server.kill('SIGTERM'); }, 120000);

async function readHud(page) {
  return page.evaluate(() => {
    const visible = element => {
      if (!element) return false;
      for (let current = element; current; current = current.parentElement) {
        const css = getComputedStyle(current);
        if (current.hidden || css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) === 0) return false;
      }
      return element.getBoundingClientRect().width > 0;
    };
    const read = (element, name) => {
      if (!visible(element)) return null;
      const box = element.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(element);
      const textBox = range.getBoundingClientRect();
      const clips = value => ['hidden', 'clip', 'scroll', 'auto'].includes(value);
      let clipped = false;
      const clippingAncestors = [];
      // Font ink may legitimately extend beyond a short line box when overflow
      // is visible. Only a clipping ancestor can crop the displayed text.
      for (let current = element; current; current = current.parentElement) {
        const css = getComputedStyle(current);
        const bounds = current.getBoundingClientRect();
        const croppedX = clips(css.overflowX) && (textBox.left < bounds.left - 1 || textBox.right > bounds.right + 1);
        const croppedY = clips(css.overflowY) && (textBox.top < bounds.top - 1 || textBox.bottom > bounds.bottom + 1);
        if (croppedX || croppedY) { clipped = true; clippingAncestors.push(current.className); }
      }
      return { name, x: box.x, y: box.y, width: box.width, height: box.height,
        text: element.textContent.trim(), aria: element.getAttribute('aria-label'), clipped, clippingAncestors,
        lineBoxOverflow: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
        textBounds: { x: textBox.x, y: textBox.y, width: textBox.width, height: textBox.height } };
    };
    const instruments = [
      ['.pod-hud__speed', 'speed'], ['.pod-hud__telemetry', 'heat-damage'],
      ['.pod-hud__redline-heat', 'redline'], ['.pod-hud__flight', 'flight'],
      ['.pod-hud__map', 'map'], ['.pod-hud__director-event', 'director'],
      ['.pod-hud__wrong-way', 'wrong-way'], ['.pod-hud__galactic-alert', 'galactic-alert'],
    ].map(([selector, name]) => read(document.querySelector(selector), name)).filter(Boolean);
    const threats = [...document.querySelectorAll('.pod-hud__threat-cue')].filter(visible).map(element => ({
      ...read(element, element.dataset.threatId), critical: element.classList.contains('is-critical'), count: Number(element.dataset.threatCount),
      label: read(element.querySelector('span'), 'label'), badge: read(element.querySelector('em'), 'count'),
      bearing: element.style.getPropertyValue('--pod-threat-bearing'), title: element.title,
    }));
    return { width: innerWidth, height: innerHeight, routeOpen: document.querySelector('.pod-hud').classList.contains('has-hud-detail'),
      threats, instruments, banner: read(document.querySelector('[data-hud="asset-status"]'), 'asset-status'),
      flight: read(document.querySelector('[data-hud="flight"]'), 'flight') };
  });
}

async function capture(page, name, scope, fallback = false) {
  const state = { name, scope, environment: await frozenBuildReceipt(page, browser), hud: await readHud(page), snapshot: await page.evaluate(() => window.__PODRACING__.snapshot()) };
  await page.screenshot({ path: `${output}/${name}.png` });
  receipt.captures.push(state);
  const hud = state.hud;
  check(hud.threats.length <= 3, `${name}: at most three threat cues`, hud.threats.length);
  for (const cue of hud.threats) {
    check(cue.x >= 0 && cue.y >= 0 && cue.x + cue.width <= hud.width && cue.y + cue.height <= hud.height, `${name}: cue stays inside viewport`, cue.name);
    check(cue.width === 160 && cue.height === 32, `${name}: actual compact cue dimensions`, { width: cue.width, height: cue.height });
    check(!cue.label.clipped, `${name}: full standard threat label is visible`, cue.label);
    check(cue.aria?.includes('bearing') && cue.aria?.includes(cue.label.text), `${name}: accessible bearing and full label`, cue.aria);
    if (cue.count > 1) check(cue.badge?.text === `+${cue.count - 1}` && !cue.badge.clipped, `${name}: grouped threat count remains visible`, cue.badge);
    for (const instrument of hud.instruments) check(!overlap(cue, instrument), `${name}: cue clears ${instrument.name}`, cue.name);
    if (hud.banner) check(!overlap(cue, hud.banner), `${name}: cue clears failure status`, cue.name);
  }
  for (let i = 0; i < hud.threats.length; i++) for (let j = i + 1; j < hud.threats.length; j++) check(!overlap(hud.threats[i], hud.threats[j]), `${name}: threats do not overlap`, [hud.threats[i].name, hud.threats[j].name]);
  if (fallback) {
    check(Boolean(hud.banner), `${name}: scenery warning remains visible`);
    if (hud.banner) {
      check(hud.banner.text === receipt.fallback.message && !hud.banner.clipped, `${name}: full unchanged scenery failure message`, hud.banner);
      for (const instrument of hud.instruments) check(!overlap(hud.banner, instrument), `${name}: failure status clears ${instrument.name}`);
    }
    check(!state.snapshot.game.inkstorm.loaded && Boolean(state.snapshot.game.inkstorm.error), `${name}: missing scenery remains truthfully reported`);
  }
  return state;
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch { /* Startup. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Preview server did not start');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', error => receipt.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.consoleErrors.push({ fallback: false, message: message.text() }); });
  await page.goto(origin);
  await page.waitForFunction(() => window.__PODRACING__?.ready, { timeout: 30000 });
  receipt.environment = await frozenBuildReceipt(page, browser);
  const sections = await page.evaluate(() => window.__PODRACING__.snapshot().game.course.sections);
  await page.evaluate(() => { window.__PODRACING__.setCaptureMode(true); window.__PODRACING__.setCamera('chase'); });
  for (const id of ['03-canyon', '05-launch']) {
    const section = sections.find(entry => entry.id === id);
    if (!section) throw new Error(`Missing ${id} section`);
    await page.evaluate(progress => window.__PODRACING__.seekCourse(progress), section.progress);
    await capture(page, id, 'Existing diagnostic course seek, actual racing renderer and HUD; no organic course completion or performance claim.');
  }
  // Search existing simulation moments only. No fixture, HUD injection, new runtime hook or fabricated hazard state.
  const launch = sections.find(entry => entry.id === '05-launch').progress;
  let combined = false;
  for (const progress of [0.08, 0.46, launch]) {
    for (const frames of [0, 120, 240, 360]) {
      await page.evaluate(({ progress, frames }) => { const api = window.__PODRACING__; api.seekCourse(progress); api.step(frames); }, { progress, frames });
      const hud = await readHud(page);
      const criticalSources = hud.threats.filter(cue => cue.critical).reduce((total, cue) => total + cue.count, 0);
      receipt.combinedSearch.push({ progress, frames, airborne: Boolean(hud.flight), criticalSources, criticalCues: hud.threats.filter(cue => cue.critical).length });
      if (hud.flight && hud.threats.filter(cue => cue.critical).length >= 2) {
        await capture(page, 'critical-threats-airborne', `Diagnostic seek ${progress} followed by ${frames} fixed simulation steps. At least two independently critical cue groups coexist with airborne panel; generated by existing simulation.`);
        combined = true; break;
      }
    }
    if (combined) break;
  }
  receipt.combinedCoverage = combined ? 'Captured two independently critical cue groups with airborne panel using existing diagnostic simulation.' : 'Not found in twelve bounded existing diagnostic moments; simultaneous critical-threat/landing acceptance remains open.';
  if (!combined) {
    await page.evaluate(() => { const api = window.__PODRACING__; api.setPreset('airtime'); api.setCamera('chase'); api.step(28); });
    await capture(page, 'airtime-diagnostic', 'Existing airtime diagnostic preset, 28 fixed steps; separate airborne-panel presentation only.');
  }
  await page.close();

  const fallback = await context.newPage();
  fallback.on('pageerror', error => receipt.pageErrors.push(error.message));
  fallback.on('console', message => { if (message.type() === 'error') receipt.consoleErrors.push({ fallback: true, message: message.text() }); });
  let intercepted = 0;
  await fallback.route('**/assets/inkstorm/canyon-buttress.glb', route => { intercepted++; return route.abort('failed'); });
  await fallback.goto(origin);
  await fallback.waitForFunction(() => window.__PODRACING__?.snapshot().game.inkstorm.error, { timeout: 30000 });
  const banner = fallback.locator('[data-hud="asset-status"]');
  await banner.filter({ hasText: 'base course remains playable' }).waitFor();
  receipt.fallback = { before: await fallback.evaluate(() => window.__PODRACING__.snapshot()), message: await banner.innerText() };
  await fallback.locator('[data-action="start-race"]').click();
  await fallback.keyboard.down('w');
  await fallback.waitForTimeout(8000);
  await fallback.keyboard.up('w');
  const closed = await capture(fallback, 'fallback-route-closed', 'One intentionally failed actual GLB request, ordinary Start Race button and eight seconds of live W input. No capture mode or scene seek.', true);
  await fallback.locator('[data-action="toggle-hud-detail"]').click();
  const opened = await capture(fallback, 'fallback-route-open', 'Same live fallback race after pressing the ordinary Route control. Simulation continues; not a matched frozen gameplay state.', true);
  check(!closed.hud.routeOpen && opened.hud.routeOpen, 'Ordinary Route control opens the detail map');
  check(opened.hud.instruments.some(item => item.name === 'map'), 'Open Route renders its actual map');
  receipt.fallback.intercepted = intercepted;
  receipt.fallback.distance = Math.hypot(...closed.snapshot.game.position.map((value, index) => value - receipt.fallback.before.game.position[index]));
  check(intercepted === 1, 'Exactly one deliberately failed scenery request', intercepted);
  check(closed.snapshot.raceTime > 1 && !closed.snapshot.game.awaitingStart && receipt.fallback.distance > 30, 'Fallback race starts and moves with live input', receipt.fallback.distance);
  check(receipt.pageErrors.length === 0, 'No uncaught browser exceptions', receipt.pageErrors);
  check(receipt.consoleErrors.every(error => error.fallback && /ERR_FAILED|Inkstorm world assets failed/.test(error.message)), 'Only expected deliberate-load errors', receipt.consoleErrors);
  receipt.outcome = receipt.checks.every(result => result.pass) ? 'PASS' : 'FAIL';
  if (receipt.outcome !== 'PASS') process.exitCode = 1;
} catch (error) {
  receipt.error = String(error); process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  await browser?.close();
  server.kill('SIGTERM');
  receipt.completedAt = new Date().toISOString();
  receipt.scope = '1280x720 HUD geometry and screenshot evidence on one served build. Course seeks and diagnostic stepping are staged. Fallback launch/driving uses live UI and keyboard input. No FPS, complete-race, human-readability, mobile or visual-target acceptance claim.';
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ outcome: receipt.outcome, output, captures: receipt.captures.map(capture => capture.name), failures: receipt.checks.filter(result => !result.pass), error: receipt.error, combinedCoverage: receipt.combinedCoverage }, null, 2));
}
