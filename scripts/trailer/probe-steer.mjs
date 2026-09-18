/** Gain sweep for the closed-loop lane-hold driver. */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';
const port = await new Promise((res, rej) => { const s = createServer(); s.once('error', rej);
  s.listen(0, '127.0.0.1', () => { const a = s.address(); s.close(() => res(a.port)); }); });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let browser;
try {
  await sleep(2500);
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.__PODRACING__?.ready === true, undefined, { timeout: 180_000 });
  await page.evaluate(() => window.__PODRACING__.setCaptureMode(true));

  const gains = [[0.030,0.060],[0.045,0.090],[0.060,0.120],[0.045,0.150],[0.025,0.100]];
  for (const [kp, kd] of gains) {
    const r = await page.evaluate(({ kp, kd }) => {
      const api = window.__PODRACING__;
      api.seekCourse(0.30); api.setCamera('chase'); api.setInput({ throttle: 1 }); api.step(30);
      let prev = null; const dt = 2 / 120;
      const lats = []; let startProg = null, endProg = null, resets = 0, lastLat = 0;
      for (let i = 0; i < 600; i++) {
        const me = api.snapshot().galactic.racers.find(r => r.id === 'player');
        const lat = me.lateralOffset;
        if (startProg === null) startProg = me.courseProgress;
        endProg = me.courseProgress;
        if (Math.abs(lat - lastLat) > 40) resets++;   // an off-course reset teleports it
        lastLat = lat;
        const d = prev === null ? 0 : (lat - prev) / dt; prev = lat;
        let steer = -(kp * lat) - (kd * d);
        steer = Math.max(-1, Math.min(1, steer));
        api.setInput({ throttle: 1, steer, drift: Math.abs(steer) > 0.5 });
        api.step(1); api.step(1);
        lats.push(Math.abs(lat));
      }
      lats.sort((a, b) => a - b);
      return { kp, kd, medianAbsLat: +lats[Math.floor(lats.length/2)].toFixed(1),
        p90AbsLat: +lats[Math.floor(lats.length*0.9)].toFixed(1), maxAbsLat: +lats[lats.length-1].toFixed(1),
        progressed: +(endProg - startProg).toFixed(4), resets };
    }, { kp, kd });
    console.log(JSON.stringify(r));
  }
} finally { await browser?.close(); server.kill(); }
