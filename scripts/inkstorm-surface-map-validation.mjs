/** Runs the isolated real-GLTFLoader/Cel-vs-Three GPU fixture; no app source,
 * build, public assets or browser profiles are changed. Always closes owners. */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.INKSTORM_OUTPUT ?? 'output/gauntlet/surface-map-validation-round27';
const port = Number(process.env.INKSTORM_PORT ?? 5198);
await mkdir(out, { recursive: true });
const server = await createServer({
  server: { host: '127.0.0.1', port, strictPort: true },
  plugins: [{ name: 'isolated-surface-map-fixture', configureServer(vite) {
    vite.middlewares.use('/__surface-map-validation', (_request, response) => {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><html><head><title>Cel GPU validation</title><link rel="icon" href="data:,"><style>body{background:#17151c;color:#eee;font:12px monospace}section{display:flex;gap:12px}figure{margin:8px}canvas{width:240px;height:240px;image-rendering:pixelated}figcaption{max-width:240px}</style></head><body><h1>Actual GPU normals: Cel / Three / difference</h1><script type="module" src="/tests/browser/celSurfaceMapsValidation.ts"></script></body></html>');
    });
  } }],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${port}/__surface-map-validation`);
  await page.waitForFunction(() => window.__CEL_SURFACE_VALIDATION__ !== undefined, undefined, { timeout: 60_000 });
  const report = await page.evaluate(() => window.__CEL_SURFACE_VALIDATION__);
  await page.screenshot({ path: `${out}/gpu-comparison.png`, fullPage: true });
  await writeFile(`${out}/report.json`, JSON.stringify({ ...report, browser: browser.version(), errors }, null, 2));
  console.log(JSON.stringify({ out, ...report, errors }, null, 2));
  if (!report.pass || errors.length) process.exitCode = 1;
} finally {
  await browser?.close(); await server.close();
}
