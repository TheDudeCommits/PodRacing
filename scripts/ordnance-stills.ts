/**
 * Deterministic stills for the round 42 ordnance through the review API: an
 * overcharge bolt leaving the player's lance after a full hold, and the nitro
 * cell on the inside of the hairpin plus a thermal-spike rack in the canyon.
 * Run: npx tsx scripts/ordnance-stills.ts [output-dir]. Serves dist/ with vite
 * preview and closes everything after.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';
import { createRaceSimulation } from '../src/game/race';
import { FLAT_HEIGHT_SAMPLER } from '../src/game/simulation';

const output = process.argv[2] ?? 'output/playwright/ordnance';
await mkdir(output, { recursive: true });
const port = await new Promise<number>((resolve, reject) => {
  const server = createServer(); server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const address = server.address(); if (!address || typeof address === 'string') return reject(new Error('no port')); server.close(() => resolve(address.port)); });
});
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.__PODRACING__?.ready === true, undefined, { timeout: 120_000 });
  const seed = await page.evaluate(() => Number((window.__PODRACING__!.snapshot().game.course as { seed: number }).seed));
  const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed });
  const pickups = race.state.galacticWorld.pickups;
  const nitro = pickups.find((pickup) => pickup.part === 'nitro-cell')!;
  const spike = pickups.find((pickup) => pickup.id === 'spike-canyon')!;
  const cable = pickups.find((pickup) => pickup.id === 'cable-sweeper')!;
  const receipt: Record<string, unknown> = { seed, nitro, spike, cable, errors };
  const api = 'window.__PODRACING__';
  await page.evaluate(() => { const api = window.__PODRACING__!; api.setCaptureMode(true); api.setPreset('race'); api.setCamera('chase'); });
  const shot = async (name: string, progress: number, frames: number, input?: Record<string, unknown>) => {
    await page.evaluate(({ progress, frames, input }) => {
      const api = window.__PODRACING__!;
      api.seekCourse!(progress);
      api.clearInput!();
      if (input) api.setInput!(input);
      api.step(frames);
    }, { progress, frames, input });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/${name}.png` });
    console.log('captured', name);
  };
  await shot('01-nitro-inside-hairpin', nitro.progress - 0.0085, 2, { throttle: 0, brake: 1 });
  await shot('02-spike-rack-canyon', spike.progress - 0.0085, 2, { throttle: 0, brake: 1 });
  await shot('03-cable-rack-sweeper', cable.progress - 0.0085, 2, { throttle: 0, brake: 1 });
  // Hold the trigger: one shot on the press, then the overcharge builds after the cooldown; release fires it.
  await page.evaluate(() => { const api = window.__PODRACING__!; api.seekCourse!(0.05); api.clearInput!(); api.setInput!({ throttle: 0.6, fire: true }); api.step(200); });
  receipt.heldWeapon = await page.evaluate(() => window.__PODRACING__!.snapshot().galactic?.racers.find((racer) => racer.id === 'player')?.galactic.weapon);
  await page.screenshot({ path: `${output}/04-overcharge-held.png` });
  await page.evaluate(() => { const api = window.__PODRACING__!; api.setInput!({ throttle: 0.6, fire: false }); api.step(14); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${output}/05-overcharge-bolt.png` });
  receipt.afterRelease = await page.evaluate(() => {
    const state = window.__PODRACING__!.snapshot();
    return { weapon: state.galactic?.racers.find((racer) => racer.id === 'player')?.galactic.weapon, projectiles: state.galactic?.projectiles };
  });
  console.log(JSON.stringify(receipt.afterRelease));
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log('errors', JSON.stringify(errors), api.length);
} finally {
  await browser?.close();
  server.kill();
}
