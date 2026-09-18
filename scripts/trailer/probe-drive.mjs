/** What does the review snapshot actually expose for closed-loop driving? */
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
  const out = await page.evaluate(() => {
    const api = window.__PODRACING__;
    api.setCaptureMode(true);
    api.seekCourse(0.10);
    api.setCamera('chase');
    api.setInput({ throttle: 1 });
    const rows = [];
    for (let i = 0; i < 12; i++) {
      api.step(30);
      const s = api.snapshot();
      const r = s.galactic.racers.map(x => ({
        id: x.id,
        prog: x.courseProgress, lat: x.lateralOffset, yaw: x.yaw,
        pos: x.position ? x.position.map(v => Math.round(v)) : null,
        speed: x.galactic?.speed,
      }));
      rows.push({ t: +(s.raceTime).toFixed(2), me: r.find(x => x.id === 'player'), rivals: r.filter(x => x.id !== 'player').length,
        rivalLat: r.filter(x => x.id !== 'player').map(x => x.lat) });
    }
    return { rows, galacticKeys: Object.keys(s => s) , sample: JSON.stringify(api.snapshot().galactic.racers[0]).slice(0, 700) };
  });
  console.log(JSON.stringify(out.rows, null, 1));
  console.log('SAMPLE RACER:', out.sample);
} finally { await browser?.close(); server.kill(); }
