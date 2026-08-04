import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDir = fileURLToPath(new URL('../output/playwright/', import.meta.url));
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address();
    if (!address || typeof address === 'string') {
      probe.close();
      reject(new Error('Could not allocate a multiplayer verification port.'));
      return;
    }
    probe.close((error) => error ? reject(error) : resolve(address.port));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;

function waitForServer(url, timeoutMs = 30_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      fetch(url)
        .then((response) => response.ok ? resolve() : Promise.reject())
        .catch(() => {
          if (Date.now() - started > timeoutMs) reject(new Error(`Timed out waiting for ${url}`));
          else setTimeout(probe, 150);
        });
    };
    probe();
  });
}

function gameSnapshot(page) {
  return page.evaluate(() => window.__PODRACING__?.snapshot());
}

async function waitForSelector(page) {
  await page.waitForFunction(() => window.__PODRACING__?.ready === true);
  await page.waitForFunction(() => {
    const selector = document.querySelector('[data-hud="vehicle-selection"]');
    return selector?.classList.contains('is-visible')
      && document.querySelectorAll('[data-vehicle-preview][data-preview-ready="true"]').length === 4;
  }, undefined, { timeout: 30_000 });
}

function attachErrorCollection(page, label, errors) {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`${label} page: ${error.message}`));
  page.on('requestfailed', (request) => {
    const url = request.url();
    // Browser media probes may be cancelled during teardown; signaling and
    // application requests are never ignored.
    if (url.startsWith('blob:')) return;
    errors.push(`${label} request: ${request.method()} ${url}: ${request.failure()?.errorText ?? 'failed'}`);
  });
}

function racerPosition(snapshot, racerId) {
  const racer = snapshot?.galactic?.racers?.find((entry) => entry.id === racerId);
  if (!racer || !Array.isArray(racer.position)) throw new Error(`Missing ${racerId} position receipt.`);
  return racer.position;
}

await mkdir(outputDir, { recursive: true });

const server = spawn(
  process.execPath,
  ['./node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'], env: process.env },
);

let browser;
let hostContext;
let guestContext;
let host;
let guest;
const browserErrors = [];

try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  hostContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  guestContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  await guestContext.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
  host = await hostContext.newPage();
  guest = await guestContext.newPage();
  attachErrorCollection(host, 'host', browserErrors);
  attachErrorCollection(guest, 'guest', browserErrors);

  await Promise.all([
    host.goto(baseUrl, { waitUntil: 'networkidle' }),
    guest.goto(baseUrl, { waitUntil: 'networkidle' }),
  ]);
  await Promise.all([waitForSelector(host), waitForSelector(guest)]);
  await host.screenshot({ path: `${outputDir}/multiplayer-selector-initial.png`, animations: 'disabled' });

  await host.locator('[data-action="create-room"]').click();
  await host.waitForFunction(() => {
    const room = window.__PODRACING__?.snapshot().game.onlineRoom;
    return room?.role === 'host' && room?.status === 'ready' && room?.code?.length === 6;
  }, undefined, { timeout: 20_000 });
  const hostReady = await gameSnapshot(host);
  const code = hostReady.game.onlineRoom.code;
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error(`Host produced invalid room code ${String(code)}.`);
  await host.screenshot({ path: `${outputDir}/multiplayer-host-room.png`, animations: 'disabled' });

  const roomCodeInput = guest.locator('[data-hud="room-code-input"]');
  const selectedBeforeTyping = await guest.locator('.pod-hud__vehicle-card.is-selected').getAttribute('data-vehicle-id');
  await roomCodeInput.click();
  await guest.keyboard.type('34wasd');
  if ((await roomCodeInput.inputValue()) !== '34WASD') {
    throw new Error(`Gameplay-bound digits/WASD were intercepted while typing: ${await roomCodeInput.inputValue()}`);
  }
  await roomCodeInput.fill('');
  await guest.keyboard.type('efgqrv');
  if ((await roomCodeInput.inputValue()) !== 'EFGQRV') {
    throw new Error(`Gameplay-bound E/F/Q/R/V keys were intercepted while typing: ${await roomCodeInput.inputValue()}`);
  }
  const selectedAfterTyping = await guest.locator('.pod-hud__vehicle-card.is-selected').getAttribute('data-vehicle-id');
  if (selectedAfterTyping !== selectedBeforeTyping) {
    throw new Error(`Typing a room code changed vehicle selection: ${selectedBeforeTyping} -> ${selectedAfterTyping}`);
  }
  await guest.evaluate(async (roomCode) => navigator.clipboard.writeText(roomCode), code);
  await roomCodeInput.click();
  await guest.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
  if ((await roomCodeInput.inputValue()) !== code) {
    throw new Error(`Native clipboard paste failed: expected ${code}, received ${await roomCodeInput.inputValue()}`);
  }
  await guest.locator('[data-action="join-room"]').click();
  await Promise.all([
    host.waitForFunction(() => window.__PODRACING__?.snapshot().game.onlineRoom?.members?.length === 2, undefined, { timeout: 20_000 }),
    guest.waitForFunction(() => {
      const room = window.__PODRACING__?.snapshot().game.onlineRoom;
      return room?.role === 'guest' && room?.status === 'waiting' && room?.members?.length === 2;
    }, undefined, { timeout: 20_000 }),
  ]);

  const hostPrompt = (await host.locator('[data-hud="start-prompt"]').innerText()).toUpperCase();
  const guestPrompt = (await guest.locator('[data-hud="start-prompt"]').innerText()).toUpperCase();
  if (!hostPrompt.includes('SPACE') || !hostPrompt.includes('START')) {
    throw new Error(`Host start prompt is not actionable: ${hostPrompt}`);
  }
  if (!guestPrompt.includes('WAITING FOR HOST') || guestPrompt.includes('SPACE')) {
    throw new Error(`Guest start prompt is misleading: ${guestPrompt}`);
  }

  await host.locator('[data-action="select-laps"][data-laps="1"]').click();
  await guest.waitForFunction(() => (
    window.__PODRACING__?.snapshot().game.onlineRoom?.laps === 1
    && document.querySelector('[data-action="select-laps"][data-laps="1"]')?.classList.contains('is-selected')
  ));
  const guestLapsLocked = await guest.locator('[data-action="select-laps"][data-laps="1"]').evaluate((button) => ({
    disabled: button.disabled,
    ariaDisabled: button.getAttribute('aria-disabled'),
    selected: button.classList.contains('is-selected'),
  }));
  if (!guestLapsLocked.disabled || guestLapsLocked.ariaDisabled !== 'true' || !guestLapsLocked.selected) {
    throw new Error(`Guest lap authority is not visibly locked: ${JSON.stringify(guestLapsLocked)}`);
  }

  await guest.locator('.pod-hud__vehicle-card[data-vehicle-id="skim-speeder"]').click();
  await host.waitForFunction(() => {
    const room = window.__PODRACING__?.snapshot().game.onlineRoom;
    return room?.members?.some((member) => member.racerId === 'ai-vexa' && member.vehicleClass === 'skim-speeder');
  });
  await host.screenshot({ path: `${outputDir}/multiplayer-host-lobby.png`, animations: 'disabled' });
  await guest.screenshot({ path: `${outputDir}/multiplayer-guest-lobby.png`, animations: 'disabled' });

  await host.keyboard.press('Space');
  try {
    await Promise.all([
      host.waitForFunction(() => window.__PODRACING__?.snapshot().game.awaitingStart === false),
      guest.waitForFunction(() => window.__PODRACING__?.snapshot().game.awaitingStart === false, undefined, { timeout: 15_000 }),
    ]);
  } catch (error) {
    const [hostReceipt, guestReceipt] = await Promise.all([gameSnapshot(host), gameSnapshot(guest)]);
    throw new Error(`Race-start synchronization failed. ${JSON.stringify({
      host: {
        awaitingStart: hostReceipt?.game?.awaitingStart,
        room: hostReceipt?.game?.onlineRoom,
      },
      guest: {
        awaitingStart: guestReceipt?.game?.awaitingStart,
        room: guestReceipt?.game?.onlineRoom,
      },
    })}`, { cause: error });
  }
  const beforeRemoteInput = await gameSnapshot(host);
  const beforeGuestPosition = racerPosition(beforeRemoteInput, 'ai-vexa');
  await guest.keyboard.down('w');
  await guest.keyboard.down('d');
  await guest.waitForTimeout(4_300);
  await guest.keyboard.up('d');
  await guest.keyboard.up('w');
  const afterRemoteInput = await gameSnapshot(host);
  const afterGuestPosition = racerPosition(afterRemoteInput, 'ai-vexa');
  const remoteDistance = Math.hypot(
    afterGuestPosition[0] - beforeGuestPosition[0],
    afterGuestPosition[2] - beforeGuestPosition[2],
  );
  if (remoteDistance < 2) throw new Error(`Remote semantic input moved only ${remoteDistance.toFixed(2)}m.`);

  await host.keyboard.down('Shift');
  await host.waitForFunction(() => Number(window.__PODRACING__?.snapshot().game.redlineHeat) > 0.16, undefined, { timeout: 8_000 });
  const heatAtCapture = Number((await gameSnapshot(host)).game.redlineHeat);
  await host.screenshot({ path: `${outputDir}/multiplayer-race-heat.png`, animations: 'disabled' });
  await host.keyboard.up('Shift');

  const minesBefore = Number((await gameSnapshot(host)).game.mines);
  await host.keyboard.press('f');
  await host.waitForFunction((before) => Number(window.__PODRACING__?.snapshot().game.mines) > before, minesBefore, { timeout: 5_000 });

  await host.waitForTimeout(250);
  const [hostFinal, guestFinal] = await Promise.all([gameSnapshot(host), gameSnapshot(guest)]);
  const hostLocalGuest = racerPosition(hostFinal, 'ai-vexa');
  const guestLocalGuest = racerPosition(guestFinal, 'ai-vexa');
  const convergenceError = Math.hypot(
    hostLocalGuest[0] - guestLocalGuest[0],
    hostLocalGuest[1] - guestLocalGuest[1],
    hostLocalGuest[2] - guestLocalGuest[2],
  );
  const stepGap = Math.abs(Number(hostFinal.simulationFrame) - Number(guestFinal.simulationFrame));
  if (convergenceError > 45 || stepGap > 30) {
    throw new Error(`Clients diverged: ${convergenceError.toFixed(2)}m / ${stepGap} fixed steps. Host=${JSON.stringify(hostFinal.game.onlineRoom)} Guest=${JSON.stringify(guestFinal.game.onlineRoom)} Errors=${browserErrors.join(' | ')}`);
  }
  if (browserErrors.length > 0) throw new Error(`Browser errors:\n${browserErrors.join('\n')}`);

  const receipt = {
    capturedAt: new Date().toISOString(),
    roomCodeLength: code.length,
    hostRole: hostFinal.game.onlineRoom.role,
    guestRole: guestFinal.game.onlineRoom.role,
    members: hostFinal.game.onlineRoom.members.length,
    laps: hostFinal.game.selectedLaps,
    guestVehicle: hostFinal.game.onlineRoom.members.find((member) => member.racerId === 'ai-vexa')?.vehicleClass,
    remoteDistance,
    convergenceError,
    stepGap,
    redlineHeatAtCapture: heatAtCapture,
    mines: hostFinal.game.mines,
    deviceScaleFactor: 2,
    browserErrors,
  };
  await writeFile(`${outputDir}/multiplayer-receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  if (host) await host.close().catch(() => undefined);
  if (guest) await guest.close().catch(() => undefined);
  if (hostContext) await hostContext.close().catch(() => undefined);
  if (guestContext) await guestContext.close().catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
  server.kill('SIGTERM');
}
