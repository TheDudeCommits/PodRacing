// Diagnostic only: the production entry is not modified. Compare MRT clears
// with the scene background present and temporarily suppressed for prepass.
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.INKSTORM_OUTPUT ?? 'output/gauntlet/contact-attribution-round27';
await mkdir(out, { recursive: true });
const server = await createServer({
  server: { host: '127.0.0.1', port: 5197, strictPort: true },
  plugins: [{ name: 'contact-attribution-only', enforce: 'post', transform(code, id) {
    if (id.endsWith('/src/main.ts')) return `${code}\nwindow.__CONTACT_PROBE_APP__ = app;`;
  } }],
});
let browser;
const errors = [], receipts = [];
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:5197');
  await page.waitForFunction(() => window.__PODRACING__?.ready && window.__PODRACING__.snapshot().game.vehiclePresentation.racers[0].status === 'ready');
  await page.evaluate(() => { window.__PODRACING__.setCaptureMode(true); window.__PODRACING__.setCamera('chase'); });
  for (const state of ['existing-background', 'suppress-prepass-background', 'contact-off']) {
    await page.evaluate(state => {
      const app = window.__CONTACT_PROBE_APP__, post = app.post;
      if (state === 'suppress-prepass-background') {
        const original = post.renderPrepass.bind(post);
        post.renderPrepass = () => {
          const background = post.sceneValue.background;
          try { post.sceneValue.background = null; return original(); }
          finally { post.sceneValue.background = background; }
        };
      }
      if (state === 'contact-off') post.edgePass.setConfig({ contactStrength: 0 });
    }, state);
    for (const [name, progress] of [['grid', .005], ['launch', .18], ['foundry', .6]]) {
      await page.evaluate(p => window.__PODRACING__.seekCourse(p), progress);
      const receipt = await page.evaluate(() => {
        const app = window.__CONTACT_PROBE_APP__, post = app.post, target = post.prepassTarget;
        const pixels = [[.5, .95], [.1, .9], [.9, .9], [.5, .5], [.5, .15]].map(([u, v]) => {
          const normal = new Uint8Array(4), depth = new Uint8Array(4);
          app.renderer.readRenderTargetPixels(target, Math.floor(u * target.width), Math.floor(v * target.height), 1, 1, normal, undefined, 0);
          app.renderer.readRenderTargetPixels(target, Math.floor(u * target.width), Math.floor(v * target.height), 1, 1, depth, undefined, 1);
          return { uv: [u,v], normal: [...normal], depth: [...depth], decodedDepth: depth[0]/255+depth[1]/65025+depth[2]/16581375 };
        });
        return { pixels, background: post.sceneValue.background.getHexString(), range: post.edgePass.sobelUniforms.uContactDepth.value.toArray(), near: post.cameraValue.near, far: post.cameraValue.far };
      });
      receipts.push({ state, name, progress, ...receipt });
      await page.screenshot({ path: `${out}/${state}-${name}.png` });
    }
  }
  await writeFile(`${out}/receipts.json`, JSON.stringify({ diagnosticOnly: true, receipts, errors }, null, 2));
  console.log(JSON.stringify({ out, receipts, errors }, null, 2));
  if (errors.length) process.exitCode = 1;
} finally { await browser?.close(); await server.close(); }
