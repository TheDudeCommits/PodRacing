import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

const output = process.env.INKSTORM_OUTPUT ?? 'output/playwright/garage-calendar';
await mkdir(output, { recursive: true });
const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const url = `http://127.0.0.1:${port}`;
const server = spawn('npm', ['run', 'preview', '--', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const receipt = { captures: [], errors: [], interactions: [], failure: null };
try {
  for (let attempt = 0; attempt < 150; attempt++) {
    try { if ((await fetch(url)).ok) break; } catch { /* Server starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1.5 });
    const page = await context.newPage();
    page.on('pageerror', error => receipt.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
    await page.goto(url);
    await page.waitForFunction(() => window.__PODRACING__?.ready, null, { timeout: 45_000 });
    const environment = await frozenBuildReceipt(page, browser);
    const read = () => page.evaluate(() => {
      const list = document.querySelector('[data-hud="event-list"]');
      const bounds = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
      const listBox = bounds(list);
      return { list: { ...listBox, scrollHeight: list.scrollHeight, clientHeight: list.clientHeight, scrollTop: list.scrollTop },
        heading: document.querySelector('[data-hud="calendar-title"]').textContent,
        events: [...list.querySelectorAll('button')].map(button => {
          const label = button.querySelector('strong'), box = bounds(label);
          return { id: button.dataset.eventId, selected: button.getAttribute('aria-pressed') === 'true', text: label.textContent,
            ...box, fullyVisible: box.y >= listBox.y - 1 && box.y + box.height <= listBox.y + listBox.height + 1 };
        }), start: bounds(document.querySelector('[data-hud="start-button"]')) };
    });
    const initial = await read();
    assert.equal(initial.events.length, 7, 'Fresh garage should expose the seven standard event choices');
    assert.match(initial.heading, /7 EVENTS/, 'Calendar declares its complete extent');
    if (viewport.height === 900) assert(initial.events.every(event => event.fullyVisible), 'All default calendar titles fit at the main desktop target');
    assert(initial.start.y >= 0 && initial.start.y + initial.start.height <= viewport.height, 'Launch action fits the viewport');
    await page.screenshot({ path: `${output}/${viewport.width}-default.png` });
    receipt.captures.push({ name: `${viewport.width}-default`, environment, state: initial });
    for (const id of ['open-expedition', 'flight-school', 'cup-glass', 'inkstorm-trial']) {
      await page.locator(`[data-action="select-event"][data-event-id="${id}"]`).click();
      await page.waitForFunction(id => window.__PODRACING__.snapshot().game.mastery.eventId === id, id);
      const state = await read();
      const selected = state.events.find(event => event.id === id);
      assert(selected?.selected && selected.fullyVisible, `${viewport.width}: selected ${id} title remains visible`);
      receipt.interactions.push({ viewport, id, state });
    }
    await page.screenshot({ path: `${output}/${viewport.width}-after-browsing.png` });
    await context.close();
  }
  assert.equal(receipt.errors.length, 0, 'No browser errors');
} catch (error) {
  receipt.failure = String(error.stack ?? error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ output, captures: receipt.captures.length, interactions: receipt.interactions.length, errors: receipt.errors, failure: receipt.failure }, null, 2));
}
