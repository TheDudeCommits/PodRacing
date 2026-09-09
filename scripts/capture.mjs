import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

const outputDir = fileURLToPath(new URL('../output/playwright/', import.meta.url));
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address();
    if (!address || typeof address === 'string') {
      probe.close();
      reject(new Error('Could not allocate a capture port.'));
      return;
    }
    const openPort = address.port;
    probe.close((error) => error ? reject(error) : resolve(openPort));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;
const views = [
  { preset: 'desert', camera: 'course', frames: 1 },
  { preset: 'countdown', camera: 'hero', frames: 80 },
  { preset: 'race', camera: 'chase', frames: 180 },
  { preset: 'drift', camera: 'side', frames: 240 },
  { preset: 'airtime', camera: 'cockpit', frames: 28 },
  // PilotView deliberately makes the first victory cut readable, so this
  // remains the exact finish-line tableau instead of coasting down-course.
  { preset: 'finish', camera: 'hero', frames: 1 },
];
const expansionViews = [
  { preset: 'vehicle-showcase', camera: 'hero', frames: 1 },
  { preset: 'weapon-fired', camera: 'chase', frames: 3 },
  { preset: 'shield-active', camera: 'chase', frames: 6 },
  { preset: 'mine-trigger', camera: 'chase', frames: 12 },
  { preset: 'hazard', camera: 'chase', frames: 1 },
  { preset: 'redline', camera: 'chase', frames: 6 },
  { preset: 'wreck', camera: 'chase', frames: 6 },
  { preset: 'recovery', camera: 'chase', frames: 90 },
  { preset: 'upgrade', camera: 'chase', frames: 18 },
  { preset: 'combat-stress', camera: 'chase', frames: 3 },
];

await mkdir(outputDir, { recursive: true });

function waitForServer(url, timeoutMs = 30_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      fetch(url)
        .then((response) => (response.ok ? resolve() : Promise.reject()))
        .catch(() => {
          if (Date.now() - started > timeoutMs) reject(new Error(`Timed out waiting for ${url}`));
          else setTimeout(probe, 150);
        });
    };
    probe();
  });
}

function requirePlayerGalactic(snapshot, label) {
  const galactic = snapshot?.galactic;
  if (!galactic || !Array.isArray(galactic.racers) || !Array.isArray(galactic.recentEvents)) {
    throw new Error(`${label} did not expose a complete Galactic Racer receipt`);
  }
  const player = galactic.racers.find((entry) => entry?.id === 'player')?.galactic;
  if (!player) throw new Error(`${label} omitted the player's Galactic Racer state`);
  return { galactic, player };
}

function requireGalacticEvent(snapshot, label, type, predicate = () => true) {
  const { galactic } = requirePlayerGalactic(snapshot, label);
  const event = galactic.recentEvents.find((entry) => entry?.type === type && predicate(entry));
  if (!event) throw new Error(`${label} did not emit the expected ${type} event`);
  return event;
}

function assertExpansionReceipt(preset, snapshot, label) {
  const { galactic, player } = requirePlayerGalactic(snapshot, label);
  if (snapshot?.game?.reviewScenario !== preset) {
    throw new Error(`${label} reported scenario ${String(snapshot?.game?.reviewScenario)}`);
  }
  const world = galactic.world;
  if (!world || !['projectiles', 'mines', 'hazards', 'pickups'].every((key) => Array.isArray(world[key]))) {
    throw new Error(`${label} exposed an incomplete Galactic Racer world receipt`);
  }
  const playerEvent = (type, predicate = () => true) => (
    requireGalacticEvent(snapshot, label, type, (event) => event.racerId === 'player' && predicate(event))
  );
  const pose = (entry) => {
    const position = entry?.position;
    if (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite)) {
      throw new Error(`${label} omitted a finite racer composition pose`);
    }
    return position;
  };
  const distance = (left, right) => Math.hypot(
    pose(left)[0] - pose(right)[0],
    pose(left)[2] - pose(right)[2],
  );
  const playerReceipt = galactic.racers.find((entry) => entry?.id === 'player');
  const primaryOpponent = galactic.racers.find((entry) => entry?.id === 'ai-vexa');
  if (!playerReceipt || !primaryOpponent) throw new Error(`${label} omitted its attacker/target composition`);
  const primaryOpponentDistance = distance(playerReceipt, primaryOpponent);
  const playerProjectile = world.projectiles.find((projectile) => projectile.ownerId === 'player');
  const assertPlayerTracerChain = () => {
    if (!playerProjectile) throw new Error(`${label} omitted its live player-origin tracer`);
    const start = pose(playerReceipt);
    const target = pose(primaryOpponent);
    const beam = playerProjectile.position;
    if (!beam || ![beam.x, beam.z].every(Number.isFinite)) {
      throw new Error(`${label} omitted a finite projectile pose`);
    }
    const targetX = target[0] - start[0];
    const targetZ = target[2] - start[2];
    const lengthSquared = targetX * targetX + targetZ * targetZ;
    const beamX = beam.x - start[0];
    const beamZ = beam.z - start[2];
    const along = (beamX * targetX + beamZ * targetZ) / Math.max(1, lengthSquared);
    const crossTrack = Math.abs(beamX * targetZ - beamZ * targetX)
      / Math.max(1, Math.sqrt(lengthSquared));
    if (along < 0.12 || along > 1.08 || crossTrack > 8) {
      throw new Error(`${label} did not place the tracer between attacker and target`);
    }
    return { projectileId: playerProjectile.id, along, crossTrack };
  };

  if (preset !== 'vehicle-showcase' && snapshot.game?.reviewCamera !== 'chase') {
    throw new Error(`${label} did not use the uncropped chase composition`);
  }

  switch (preset) {
    case 'vehicle-showcase': {
      const classes = galactic.racers.map((entry) => entry?.galactic?.vehicleClass);
      if (classes.length !== 8 || classes.includes(undefined) || new Set(classes).size !== 4) {
        throw new Error(`${label} did not stage the eight-racer/four-class field`);
      }
      const separations = galactic.racers.flatMap((entry, index) => (
        galactic.racers.slice(index + 1).map((other) => distance(entry, other))
      ));
      if (Math.min(...separations) < 18) {
        throw new Error(`${label} allowed its eight class silhouettes to overlap`);
      }
      break;
    }
    case 'weapon-fired': {
      playerEvent('heat-lance-fired');
      requireGalacticEvent(snapshot, label, 'weapon-hit', (event) => (
        event.attackerId === 'player'
        && event.targetId === 'ai-vexa'
        && event.weapon === 'heat-lance'
      ));
      if (!(player.weapon?.shotsFired > 0)) throw new Error(`${label} did not increment Heat Lance shots`);
      if (!(player.weapon?.hits > 0)
        || primaryOpponentDistance < 18
        || primaryOpponentDistance > 48) {
        throw new Error(`${label} did not preserve a resolved attacker/beam/target chain`);
      }
      assertPlayerTracerChain();
      break;
    }
    case 'shield-active':
      playerEvent('pulse-shell', (event) => event.active === true);
      if (player.shield?.active !== true) throw new Error(`${label} did not leave Pulse Shell active`);
      requireGalacticEvent(snapshot, label, 'shield-block', (event) => event.racerId === 'player');
      break;
    case 'mine-trigger':
      requireGalacticEvent(snapshot, label, 'scrap-mine-triggered', (event) => (
        event.ownerId === 'player' && event.racerId === 'ai-vexa'
      ));
      {
        const displayMine = world.mines.find((mine) => mine.id === 'review-display-mine');
        if (!displayMine
          || Math.hypot(
            displayMine.position.x - pose(primaryOpponent)[0],
            displayMine.position.z - pose(primaryOpponent)[2],
          ) > 10
          || Math.hypot(
            displayMine.position.x - pose(playerReceipt)[0],
            displayMine.position.z - pose(playerReceipt)[2],
          ) < 8
        || primaryOpponentDistance < 12
        || primaryOpponentDistance > 42) {
          throw new Error(`${label} did not preserve mine body, trigger centre and victim context`);
        }
      }
      break;
    case 'hazard':
      requireGalacticEvent(snapshot, label, 'hazard-hit', (event) => (
        event.racerId === 'ai-vexa' && event.hazard === 'rockfall'
      ));
      if (world.hazards.filter((hazard) => (
        hazard.kind === 'rockfall' && hazard.id.startsWith('review-rockfall-')
      )).length < 3
        || primaryOpponentDistance > 45) {
        throw new Error(`${label} did not hold descending rockfall stones and victim in one composition`);
      }
      break;
    case 'redline':
      playerEvent('redline-surge', (event) => event.active === true);
      if (!(player.redline?.heat > 0.72)) throw new Error(`${label} did not accumulate redline heat`);
      if (primaryOpponentDistance > 48) throw new Error(`${label} omitted its overtake opponent context`);
      break;
    case 'wreck':
      playerEvent('wreck');
      if (player.wreck?.phase !== 'wrecked') throw new Error(`${label} did not enter the wrecked phase`);
      break;
    case 'recovery':
      playerEvent('recovered');
      if (player.wreck?.phase !== 'recovering') throw new Error(`${label} did not enter recovery`);
      if (primaryOpponentDistance > 42) throw new Error(`${label} omitted the passing opponent during recovery`);
      break;
    case 'upgrade': {
      const installed = playerEvent('upgrade-collected', (event) => (
        event.pickupId === 'part-vector'
        && event.part === 'vector-vanes'
        && event.level === 2
      ));
      if (player.upgrades?.afterburner !== 2
        || player.upgrades?.cornering !== 2
        || player.upgrades?.resilience !== 2
        || player.upgrades?.parts?.length !== 3
        || !player.upgrades?.collectedPickupIds?.includes(installed.pickupId)) {
        throw new Error(`${label} did not install the authored Vector Vanes upgrade`);
      }
      if (!world.pickups.some((pickup) => (
        pickup.id === 'part-vector' && pickup.collectedBy === 'player'
      ))) {
        throw new Error(`${label} did not consume the authored upgrade pickup`);
      }
      break;
    }
    case 'combat-stress': {
      playerEvent('heat-lance-fired');
      requireGalacticEvent(snapshot, label, 'weapon-hit', (event) => (
        event.attackerId === 'player'
        && event.targetId === 'ai-vexa'
        && event.weapon === 'heat-lance'
      ));
      if (!(player.weapon?.shotsFired > 0) || !(player.weapon?.hits > 0)) {
        throw new Error(`${label} did not preserve its focal combat hit`);
      }
      if (primaryOpponentDistance > 48) throw new Error(`${label} lost its primary combat target`);
      const backgroundDistances = galactic.racers
        .filter((entry) => entry.id !== 'player' && entry.id !== 'ai-vexa')
        .map((entry) => distance(playerReceipt, entry));
      if (backgroundDistances.some((value) => value < 55)) {
        throw new Error(`${label} allowed background racers to collapse into the focal combat chain`);
      }
      assertPlayerTracerChain();
      break;
    }
    default:
      throw new Error(`No expansion receipt assertion exists for ${preset}`);
  }

  return {
    scenario: preset,
    eventTypes: galactic.recentEvents.map((event) => event.type),
    player: {
      vehicleClass: player.vehicleClass,
      shieldActive: player.shield?.active,
      shotsFired: player.weapon?.shotsFired,
      redlineHeat: player.redline?.heat,
      wreckPhase: player.wreck?.phase,
    },
    world: {
      projectiles: world.projectiles.length,
      mines: world.mines.length,
      hazards: world.hazards.length,
      pickups: world.pickups.length,
      runTokens: world.runTokens,
    },
    composition: {
      reviewCamera: snapshot.game?.reviewCamera,
      cameraFocusPosition: snapshot.game?.cameraFocusPosition,
      cameraFocusOffset: snapshot.game?.cameraFocusOffset,
      primaryOpponentDistance,
      racers: galactic.racers.map((entry) => ({
        id: entry.id,
        vehicleClass: entry.galactic?.vehicleClass,
        position: entry.position,
        courseProgress: entry.courseProgress,
        lateralOffset: entry.lateralOffset,
      })),
      projectileIds: world.projectiles.map((projectile) => projectile.id),
      mineIds: world.mines.map((mine) => mine.id),
      activeHazardIds: world.hazards.map((hazard) => hazard.id),
      uncollectedPickupIds: world.pickups
        .filter((pickup) => pickup.collectedBy === null)
        .map((pickup) => pickup.id),
      collectedPickupIds: world.pickups
        .filter((pickup) => pickup.collectedBy !== null)
        .map((pickup) => pickup.id),
    },
  };
}

const server = spawn(process.execPath, ['./node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env },
});

let browser;
try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(`${baseUrl}/?capture=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__PODRACING__?.ready === true);
  const expansionSupported = await page.evaluate(() => {
    const api = window.__PODRACING__;
    return (api?.version ?? 1) >= 2
      && typeof api?.setScenario === 'function'
      && typeof api?.setReviewCamera === 'function';
  });

  const receipts = [];
  // The shipping boot path must remain a real player decision: no fixed-step
  // clocks, AI or countdown may advance before an explicit confirmation.
  const initialSelection = await page.evaluate(() => window.__PODRACING__?.snapshot());
  if (initialSelection?.game?.awaitingStart !== true
    || initialSelection?.game?.vehicleSelectionLocked !== false
    || initialSelection?.simulationFrame !== 0
    || initialSelection?.raceTime !== 0) {
    throw new Error('First load did not remain frozen on the vehicle registry');
  }
  const selectionPanel = page.locator('[data-hud="vehicle-selection"]');
  await selectionPanel.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const previews = Array.from(document.querySelectorAll('[data-vehicle-preview][data-preview-ready="true"]'));
    return previews.length === 5 && previews.every((preview) => {
      const image = preview.querySelector('img[data-vehicle-preview-image]');
      return image instanceof HTMLImageElement
        && image.complete
        && image.naturalWidth > 0
        && getComputedStyle(image).opacity === '1';
    });
  }, undefined, { timeout: 30_000 });
  const selectorContract = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.pod-hud__vehicle-card'));
    const panel = document.querySelector('[data-hud="vehicle-selection"]');
    const panelStyle = panel ? getComputedStyle(panel) : null;
    return {
      title: document.querySelector('.pod-hud__vehicle-select-head h1')?.textContent?.trim(),
      cardCount: cards.length,
      descriptionsSingleLine: cards.every((card) => {
        const description = card.querySelector('.pod-hud__vehicle-card-description');
        return description instanceof HTMLElement
          && description.scrollHeight <= description.clientHeight + 1;
      }),
      statsPerCard: cards.map((card) => card.querySelectorAll('.pod-hud__vehicle-stat').length),
      previewCount: document.querySelectorAll('[data-vehicle-preview][data-preview-ready="true"]').length,
      opaque: panelStyle?.opacity === '1' && panelStyle?.visibility === 'visible',
      hasMuteControl: document.querySelector('[data-hud="mute"]') !== null,
      // Registry copy and the optional Workshop occupy the same selector DOM.
      // The original copy ban applies to cards/header only; workshop part
      // balancing legitimately names bonuses and tradeoffs while its drawer
      // is closed.
      registryText: [
        document.querySelector('.pod-hud__vehicle-select-head')?.textContent,
        ...cards.map((card) => card.textContent),
      ].join(' ').toUpperCase(),
    };
  });
  if (selectorContract.title !== 'NOW THIS IS PODRACING!'
    || selectorContract.cardCount !== 4
    || selectorContract.previewCount !== 5
    || !selectorContract.descriptionsSingleLine
    || !selectorContract.statsPerCard.every((count) => count === 5)
    || !selectorContract.opaque
    || selectorContract.hasMuteControl
    || ['MOS ESPA', 'EVERY CHASSIS', 'TRADEOFF', 'VELOCITY STRIKER']
      .some((forbidden) => selectorContract.registryText.includes(forbidden))) {
    throw new Error(`Vehicle selector visual contract failed: ${JSON.stringify(selectorContract)}`);
  }
  await page.screenshot({ path: `${outputDir}/vehicle-selection-podracer.png`, animations: 'disabled' });
  const skimCard = page.locator('.pod-hud__vehicle-card[data-vehicle-id="skim-speeder"]');
  await skimCard.click();
  await page.waitForFunction(() => window.__PODRACING__?.snapshot().game.vehicleClass === 'skim-speeder');
  await skimCard.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('.pod-hud__vehicle-card[data-vehicle-id="skim-speeder"]')?.getAttribute('aria-selected') === 'true');
  const selectedVehicle = await page.evaluate(() => window.__PODRACING__?.snapshot());
  if (selectedVehicle?.game?.awaitingStart !== true
    || selectedVehicle?.game?.vehicleClass !== 'skim-speeder'
    || await skimCard.getAttribute('aria-selected') !== 'true') {
    throw new Error('Pointer selection did not update the pre-race vehicle choice');
  }
  await page.screenshot({ path: `${outputDir}/vehicle-selection-grid.png`, animations: 'disabled' });
  receipts.push({
    name: 'vehicle-selection-grid',
    preRace: true,
    selectorContract,
    ...selectedVehicle,
  });

  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__PODRACING__?.snapshot().game.awaitingStart === false);
  const startedRace = await page.evaluate(() => window.__PODRACING__?.snapshot());
  if (startedRace?.game?.vehicleSelectionLocked !== true
    || startedRace?.game?.vehicleClass !== 'skim-speeder') {
    throw new Error('Space did not commit and lock the selected vehicle');
  }
  await selectionPanel.waitFor({ state: 'hidden' });

  for (const view of [
    ...views.map((entry) => ({ ...entry, expansion: false })),
    ...(expansionSupported
      ? expansionViews.map((entry) => ({ ...entry, expansion: true }))
      : []),
  ]) {
    await page.evaluate(({ preset, camera, frames, expansion }) => {
      const api = window.__PODRACING__;
      if (!api) throw new Error('Review API disappeared');
      api.setCaptureMode(true);
      if (expansion) {
        if (!api.setScenario || !api.setReviewCamera) {
          throw new Error('Expansion review API disappeared');
        }
        api.setScenario(preset);
        api.setReviewCamera(camera);
      } else {
        api.setPreset(preset);
        api.setCamera(camera);
      }
      api.step(frames);
    }, view);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const name = `${view.preset}-${view.camera}`;
    await page.screenshot({ path: `${outputDir}/${name}.png`, animations: 'disabled' });
    const snapshot = await page.evaluate(() => window.__PODRACING__?.snapshot());
    const expansionReceipt = view.expansion
      ? assertExpansionReceipt(view.preset, snapshot, name)
      : undefined;
    receipts.push({ name, ...snapshot, ...(expansionReceipt ? { expansionReceipt } : {}) });
  }

  // Exercise the real keyboard path as well as the deterministic review API.
  // With capture mode disabled, review stepping samples KeyboardInput exactly
  // like the live RAF loop, which keeps this smoke check fast and repeatable.
  const inputBefore = await page.evaluate(() => {
    const api = window.__PODRACING__;
    if (!api) throw new Error('Review API disappeared before input smoke test');
    api.setPreset('race');
    api.setCaptureMode(false);
    return api.snapshot();
  });
  await page.keyboard.down('ArrowDown');
  await page.evaluate(() => window.__PODRACING__?.step(180));
  await page.keyboard.up('ArrowDown');
  const inputBraked = await page.evaluate(() => window.__PODRACING__?.snapshot());
  await page.keyboard.down('ArrowUp');
  await page.evaluate(() => window.__PODRACING__?.step(180));
  await page.keyboard.up('ArrowUp');
  const inputThrottled = await page.evaluate(() => window.__PODRACING__?.snapshot());
  const beforeSpeed = Number(inputBefore.game.speed);
  const brakedSpeed = Number(inputBraked?.game.speed);
  const throttledSpeed = Number(inputThrottled?.game.speed);
  if (!Number.isFinite(beforeSpeed) || !Number.isFinite(brakedSpeed) || !Number.isFinite(throttledSpeed)) {
    throw new Error('Keyboard smoke test returned a non-finite speed');
  }
  if (brakedSpeed >= beforeSpeed - 1) {
    throw new Error(`Keyboard brake smoke failed: ${beforeSpeed.toFixed(2)} -> ${brakedSpeed.toFixed(2)}`);
  }
  if (throttledSpeed <= brakedSpeed + 1) {
    throw new Error(`Keyboard throttle smoke failed: ${brakedSpeed.toFixed(2)} -> ${throttledSpeed.toFixed(2)}`);
  }

  // Verify the complete keyboard -> fixed-step yaw path, not only the binding
  // table. Positive simulation yaw appears left in the chase camera; negative
  // yaw appears right. Resetting the same preset isolates each steering key.
  const steeringStart = await page.evaluate(() => {
    const api = window.__PODRACING__;
    if (!api) throw new Error('Review API disappeared before steering smoke test');
    api.setPreset('race');
    return api.snapshot();
  });
  await page.keyboard.down('a');
  await page.evaluate(() => window.__PODRACING__?.step(90));
  const steeredLeft = await page.evaluate(() => window.__PODRACING__?.snapshot());
  await page.keyboard.up('a');

  const steeringReset = await page.evaluate(() => {
    const api = window.__PODRACING__;
    if (!api) throw new Error('Review API disappeared while resetting steering smoke test');
    api.setPreset('race');
    return api.snapshot();
  });
  await page.keyboard.down('d');
  await page.evaluate(() => window.__PODRACING__?.step(90));
  const steeredRight = await page.evaluate(() => window.__PODRACING__?.snapshot());
  await page.keyboard.up('d');

  const signedAngleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const leftYawDelta = signedAngleDelta(
    Number(steeringStart.game.yaw),
    Number(steeredLeft?.game.yaw),
  );
  const rightYawDelta = signedAngleDelta(
    Number(steeringReset.game.yaw),
    Number(steeredRight?.game.yaw),
  );
  const leftSteer = Number(steeredLeft?.game.inputSteer);
  const rightSteer = Number(steeredRight?.game.inputSteer);
  if (![leftYawDelta, rightYawDelta, leftSteer, rightSteer].every(Number.isFinite)) {
    throw new Error('Keyboard steering smoke test returned non-finite state');
  }
  if (leftSteer <= 0 || leftYawDelta <= 0.01) {
    throw new Error(`Keyboard A/left smoke failed: steer ${leftSteer}, yaw ${leftYawDelta}`);
  }
  if (rightSteer >= 0 || rightYawDelta >= -0.01) {
    throw new Error(`Keyboard D/right smoke failed: steer ${rightSteer}, yaw ${rightYawDelta}`);
  }

  let galacticKeyboardSmoke = null;
  if (expansionSupported) {
    const runKeyboardAction = async (preset, key) => {
      const before = await page.evaluate((nextPreset) => {
        const api = window.__PODRACING__;
        if (!api) throw new Error('Review API disappeared before Galactic keyboard smoke test');
        api.setCaptureMode(true);
        api.setPreset(nextPreset);
        api.clearEvents?.();
        api.setCaptureMode(false);
        return api.snapshot();
      }, preset);
      let after;
      try {
        await page.keyboard.down(key);
        await page.evaluate(() => window.__PODRACING__?.step(1));
        // Snapshot while the physical key is still held. Once keyup is sent,
        // a live RAF may legitimately advance one neutral tick before the
        // next evaluate call and make inputFire/inputShield look false even
        // though the fixed-step action and event both occurred.
        after = await page.evaluate(() => window.__PODRACING__?.snapshot());
      } finally {
        await page.keyboard.up(key);
      }
      return { before, after };
    };

    const fire = await runKeyboardAction('race', 'e');
    const fireBefore = requirePlayerGalactic(fire.before, 'Keyboard E/fire baseline').player;
    const fireAfter = requirePlayerGalactic(fire.after, 'Keyboard E/fire result').player;
    requireGalacticEvent(fire.after, 'Keyboard E/fire result', 'heat-lance-fired', (event) => event.racerId === 'player');
    if (fire.after?.game?.inputFire !== true || !(fireAfter.weapon.shotsFired > fireBefore.weapon.shotsFired)) {
      throw new Error('Keyboard E/fire smoke failed to fire the player Heat Lance');
    }
    if (fire.after?.game?.mineCharges !== fire.before?.game?.mineCharges
      || fire.after?.galactic?.recentEvents.some((event) => (
        event?.type === 'scrap-mine-deployed' && event?.racerId === 'player'
      ))) {
      throw new Error('Keyboard E/fire incorrectly deployed a Scrap Mine');
    }

    const mine = await runKeyboardAction('race', 'f');
    const mineBefore = requirePlayerGalactic(mine.before, 'Keyboard F/mine baseline').player;
    const mineAfter = requirePlayerGalactic(mine.after, 'Keyboard F/mine result').player;
    requireGalacticEvent(mine.after, 'Keyboard F/mine result', 'scrap-mine-deployed', (event) => event.racerId === 'player');
    if (mine.after?.game?.inputMine !== true || !(mineAfter.mine.charges < mineBefore.mine.charges)) {
      throw new Error('Keyboard F/mine smoke failed to deploy the player Scrap Mine');
    }

    const shield = await runKeyboardAction('race', 'q');
    const shieldAfter = requirePlayerGalactic(shield.after, 'Keyboard Q/shield result').player;
    requireGalacticEvent(shield.after, 'Keyboard Q/shield result', 'pulse-shell', (event) => (
      event.racerId === 'player' && event.active === true
    ));
    if (shield.after?.game?.inputShield !== true || shieldAfter.shield.active !== true) {
      throw new Error('Keyboard Q/shield smoke failed to activate the player Pulse Shell');
    }

    const vehicle = await runKeyboardAction('countdown', 'v');
    const vehicleBefore = requirePlayerGalactic(vehicle.before, 'Keyboard V/locked baseline').player;
    const vehicleAfter = requirePlayerGalactic(vehicle.after, 'Keyboard V/locked result').player;
    if (vehicle.before?.preset !== 'countdown'
      || vehicle.after?.preset !== 'countdown'
      || vehicleAfter.vehicleClass !== vehicleBefore.vehicleClass
      || vehicle.after?.game?.vehicleSelectionLocked !== true
      || vehicle.after?.galactic?.recentEvents.some((event) => event?.type === 'vehicle-class-changed')) {
      throw new Error('Locked countdown allowed the player vehicle to change after confirmation');
    }

    galacticKeyboardSmoke = {
      fire: {
        key: 'E',
        shotsBefore: fireBefore.weapon.shotsFired,
        shotsAfter: fireAfter.weapon.shotsFired,
        event: 'heat-lance-fired',
      },
      mine: {
        key: 'F',
        chargesBefore: mineBefore.mine.charges,
        chargesAfter: mineAfter.mine.charges,
        event: 'scrap-mine-deployed',
      },
      shield: {
        key: 'Q',
        active: shieldAfter.shield.active,
        event: 'pulse-shell',
      },
      vehicle: {
        key: 'V',
        preset: vehicle.after.preset,
        before: vehicleBefore.vehicleClass,
        after: vehicleAfter.vehicleClass,
        locked: true,
      },
    };
  }

  // Confirm the alternate start key through a fresh shipping boot as well.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__PODRACING__?.ready === true);
  await page.waitForFunction(() => window.__PODRACING__?.snapshot().game.awaitingStart === true);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__PODRACING__?.snapshot().game.awaitingStart === false);
  const enterStartedRace = await page.evaluate(() => window.__PODRACING__?.snapshot());
  if (enterStartedRace?.game?.vehicleSelectionLocked !== true) {
    throw new Error('Enter did not commit and lock the selected vehicle');
  }

  if (consoleErrors.length > 0) throw new Error(`Browser errors:\n${consoleErrors.join('\n')}`);
  await writeFile(`${outputDir}/capture-receipt.json`, `${JSON.stringify({
    capturedAt: new Date().toISOString(),
    reviewApiVersion: await page.evaluate(() => window.__PODRACING__?.version ?? 1),
    expansionSupported,
    views: receipts,
    inputSmoke: {
      startGate: {
        initialAwaitingStart: initialSelection.game.awaitingStart,
        initialSimulationFrame: initialSelection.simulationFrame,
        selectedVehicle: selectedVehicle.game.vehicleClass,
        startedWithSpace: startedRace.game.awaitingStart === false,
        startedWithEnter: enterStartedRace.game.awaitingStart === false,
        selectionLocked: startedRace.game.vehicleSelectionLocked,
      },
      beforeSpeed,
      brakedSpeed,
      throttledSpeed,
      steering: { leftSteer, leftYawDelta, rightSteer, rightYawDelta },
      ...(galacticKeyboardSmoke ? { galactic: galacticKeyboardSmoke } : {}),
    },
  }, null, 2)}\n`);
  console.log(`Captured ${receipts.length} Retina views in ${outputDir}${expansionSupported ? ' (including Galactic Racer scenarios)' : ''}`);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
