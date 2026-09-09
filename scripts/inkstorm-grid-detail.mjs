// Close construction views in the actual GameApp scene and rendering pipeline.
// Temporary camera and entry exposure only; not ordinary gameplay or FPS proof.
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const out = process.env.INKSTORM_OUTPUT;
if (!out) throw new Error('Provide a new INKSTORM_OUTPUT evidence directory');
const family = process.env.INKSTORM_FAMILY ?? 'pit-complex';
const poses = {
  'pit-complex': { position: [-35, 11, 62], target: [-35, 7, 0], prefix: 'pit' },
  'pit-district': { position: [0, 10, 38], target: [0, 7, -4], prefix: 'district' },
  'foundry-gantry': { position: [0, 22, 125], target: [0, 29, 0], prefix: 'gantry' },
};
if (!poses[family]) throw new Error(`Unsupported diagnostic family ${family}`);
// A building-elevation trial must not move the camera with its new anchor.
const referencePath = process.env.INKSTORM_CAMERA_REFERENCE;
const referenceBytes = referencePath ? await readFile(referencePath) : null;
const reference = referenceBytes ? JSON.parse(referenceBytes.toString('utf8')) : null;
if (reference && (reference.family !== family || !Array.isArray(reference.views)
  || reference.views.some(v => ![v.position, v.target].every(a => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite))
    || !Number.isFinite(v.fov)))) throw new Error('Camera reference does not match the requested family/pose contract');
await mkdir(out, { recursive: true });
const paths = ['src/render/inkstorm/InkstormWorld.ts', 'src/render/inkstorm/InkstormFoundations.ts',
  'src/game/race/PitPadField.ts', 'src/game/race/RaceSimulation.ts',
  'src/render/terrain/CourseGulfTextures.ts', 'src/render/terrain/TerrainSystem.ts',
  'src/render/inkstorm/InkstormSurfaceMaterial.ts', 'src/render/app/GameApp.ts',
  'public/assets/inkstorm/pit-complex-light-v1.glb', 'public/assets/inkstorm/pit-complex-light-v1.png',
  ...['pit-complex', 'pit-district', 'foundry-gantry'].map(id => `public/assets/inkstorm/${id}.glb`)];
const hashes = async () => Object.fromEntries(await Promise.all(paths.map(async path =>
  [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
const before = await hashes(), errors = [], views = [];
const server = await createServer({
  server: { host: '127.0.0.1', port: 5195, strictPort: true },
  plugins: [{ name: 'grid-detail-diagnostic', enforce: 'post', transform(code, id) {
    if (id.endsWith('/src/main.ts')) return `${code}\nwindow.__GRID_DETAIL_APP__ = app;`;
  } }],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:5195');
  await page.waitForFunction(() => window.__PODRACING__?.ready && window.__GRID_DETAIL_APP__?.inkstormWorld.loaded);
  await page.addStyleTag({ content: '.pod-hud, .pod-hud * { visibility: hidden !important; }' });
  await page.evaluate(() => {
    window.__PODRACING__.setCaptureMode(true);
    window.__PODRACING__.setCamera('chase');
    window.__PODRACING__.seekCourse(.003);
  });
  const count = await page.evaluate(family => window.__GRID_DETAIL_APP__.inkstormWorld.instances.filter(item => item.family === family).length, family);
  if (reference && reference.views.length !== count) throw new Error('Camera reference instance count changed');
  for (let index = 0; index < count; index++) {
    const view = await page.evaluate(({ index, family, diagnosticPose, referencePose }) => {
      const app = window.__GRID_DETAIL_APP__, camera = app.cameraRig.camera;
      const item = app.inkstormWorld.instances.filter(item => item.family === family)[index];
      // Source front is glTF +Z. Coordinates stay anchored to terrain height,
      // not to the candidate's moving slab, keeping A/B camera poses identical.
      const position = camera.position.clone().fromArray(diagnosticPose.position).applyMatrix4(item.matrix);
      const target = camera.position.clone().fromArray(diagnosticPose.target).applyMatrix4(item.matrix);
      const origin = camera.position.clone().set(0, 0, 0).applyMatrix4(item.matrix);
      const pad = app.race.pitPadField?.pads.find(p => Math.abs(p.x - origin.x) < .001 && Math.abs(p.z - origin.z) < .001);
      const ground = pad?.anchorHeight ?? app.terrainAdapter.heightAt(origin.x, origin.z);
      if (referencePose) {
        position.fromArray(referencePose.position); target.fromArray(referencePose.target);
      } else {
        position.y += ground - origin.y; target.y += ground - origin.y;
      }
      const pose = () => { camera.position.copy(position); camera.fov = referencePose?.fov ?? 50; camera.near = .35;
        camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); };
      app.cameraRig.snap = pose; app.cameraRig.update = pose;
      pose(); app.render(0);
      return { index, position: position.toArray(), target: target.toArray(), fov: camera.fov,
        assetMatrix: item.matrix.toArray(), snapshot: window.__PODRACING__.snapshot() };
    }, { index, family, diagnosticPose: poses[family], referencePose: reference?.views[index] ?? null });
    await page.locator('#viewport').screenshot({ path: `${out}/${poses[family].prefix}-${index + 1}.png` });
    views.push(view);
  }
  const after = await hashes();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Inspected artifacts changed during capture');
  await writeFile(`${out}/receipts.json`, JSON.stringify({ scope: 'Actual GameApp rendering with diagnostic camera; Vite source, not frozen bundle or FPS evidence. Camera poses use the recorded reference when supplied, otherwise saved terrain anchors. No material or geometry overrides.',
    cameraReference: referencePath ? { path: referencePath, sha256: createHash('sha256').update(referenceBytes).digest('hex') } : null,
    before, after, family, browser: browser.version(), views, errors }, null, 2));
  console.log(JSON.stringify({ out, views: views.length, errors }));
  if (errors.length) process.exitCode = 1;
} finally { await browser?.close(); await server.close(); }
