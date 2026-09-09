// Isolated migration of a real previous-edition test record through shipped UI.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

const output = process.env.INKSTORM_OUTPUT ?? 'output/playwright/course-edition-round31';
const sourcePath = 'output/playwright/full-race-performance-round30-teemto/time-attack.json';
const source = JSON.parse(await readFile(sourcePath, 'utf8')).profile;
const original = Object.values(source.records);
const assert = (value, message) => { if (!value) throw new Error(message); };
assert(original.length === 1 && original[0].identity.generatorVersion === 'inkstorm-course-8', 'Expected the real round30 course8 test PB');
const hash = value => createHash('sha256').update(value).digest('hex');
const key = 'podracing.inkstorm.mastery.v1';
const receipt = { outcome: 'FAIL', sourcePath, sourceProfileSha256: hash(JSON.stringify(source)),
  scope: 'Fresh isolated browser storage; actual prior test PB, ordinary Save course action and reload. No user profile is touched.', errors: [] };
await mkdir(output, { recursive: true });
const port = await new Promise(resolve => { const socket = createServer(); socket.listen(0, '127.0.0.1', () => {
  const value = socket.address().port; socket.close(() => resolve(value));
}); });
receipt.port = port;
const origin = `http://127.0.0.1:${port}`;
const server = spawn('npm', ['run', 'preview', '--', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true });
let browser;
try {
  for (let i = 0; i < 150; i++) { try { if ((await fetch(origin)).ok) break; } catch { /* preview startup */ }
    await new Promise(resolve => setTimeout(resolve, 100)); }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  await context.addInitScript(({ key, source }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(source));
  }, { key, source });
  const page = await context.newPage();
  page.on('pageerror', error => receipt.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
  await page.goto(origin);
  await page.waitForFunction(() => window.__PODRACING__?.ready && document.querySelector('[data-hud="garage-model"]')?.dataset.previewReady === 'true');
  receipt.environment = await frozenBuildReceipt(page, browser);
  const observe = async () => ({ snapshot: await page.evaluate(() => window.__PODRACING__.snapshot()),
    notice: await page.locator('[data-hud="archive-notice"]').innerText(),
    personalBest: await page.locator('[data-hud="personal-best"]').innerText() });
  receipt.initial = await observe();
  assert(receipt.initial.snapshot.game.mastery.bestTime === null && !receipt.initial.snapshot.game.mastery.ghostAvailable, 'Old course8 PB/ghost became active');
  assert(receipt.initial.notice.includes('1 records'), 'Archive was not disclosed in the garage');
  await page.screenshot({ path: `${output}/archived-record.png` });
  await page.locator('[data-action="save-course"]').click();
  receipt.persisted = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  assert(Object.keys(receipt.persisted.records).length === 0, 'Old record retained as active');
  assert(JSON.stringify(receipt.persisted.archivedRecords) === JSON.stringify(original.map(record => ({ ...record, ghost: null }))), 'Archived metadata changed or duplicated');
  assert(JSON.stringify(receipt.persisted.history) === JSON.stringify(source.history), 'Historical results changed');
  assert(receipt.persisted.favorites.length === 1 && receipt.persisted.favorites[0].generatorVersion === 'inkstorm-course-9', 'New favorite is not course9');
  await page.reload();
  await page.waitForFunction(() => window.__PODRACING__?.ready && document.querySelector('[data-hud="garage-model"]')?.dataset.previewReady === 'true');
  receipt.reloaded = await observe();
  const reloadedStorage = await page.evaluate(key => localStorage.getItem(key), key);
  assert(JSON.stringify(JSON.parse(reloadedStorage)) === JSON.stringify(receipt.persisted), 'Reload changed persisted archive');
  assert(receipt.reloaded.snapshot.game.mastery.bestTime === null && !receipt.reloaded.snapshot.game.mastery.ghostAvailable, 'Reload reactivated old comparison');
  await page.screenshot({ path: `${output}/reloaded-archive.png` });
  assert(receipt.errors.length === 0, 'Unexpected browser errors');
  receipt.outcome = 'PASS';
} catch (error) {
  receipt.failure = String(error); process.exitCode = 1;
} finally {
  await browser?.close();
  try { process.kill(-server.pid, 'SIGTERM'); } catch { /* owned process already exited */ }
  receipt.browserClosed = true;
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ outcome: receipt.outcome, output, port, failure: receipt.failure, errors: receipt.errors }));
}
