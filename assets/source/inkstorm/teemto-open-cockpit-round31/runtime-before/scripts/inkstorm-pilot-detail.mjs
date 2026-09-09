// Actual in-world detail views of the installed driver. The temporary Vite
// entry exposure and close camera are diagnostic; this is not a normal HUD
// view, a frozen production bundle, or performance evidence.
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const out = process.env.INKSTORM_OUTPUT ?? 'output/gauntlet/pilot-detail-round27';
const materialProbe = process.env.INKSTORM_PILOT_MATERIAL_PROBE ?? 'authored';
if (!['authored', 'matte', 'cloth'].includes(materialProbe)) throw new Error('Unknown material diagnostic');
await mkdir(out, { recursive: true });
const sourcePaths = ['src/game/vehicleAppearance.ts', 'src/render/app/GameApp.ts',
  'src/render/materials/CelMaterial.ts', 'src/render/materials/celShaders.ts',
  'src/render/vehicles/ImportedVehiclePresentation.ts', 'src/render/post/CelPostPipeline.ts',
  'src/render/post/sobelShader.ts', 'public/assets/inkstorm/vehicles/teemto-hero-v4c.glb'];
const hashes = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path =>
  [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
const before = await hashes(), errors = [], receipts = [];
const server = await createServer({
  server: { host: '127.0.0.1', port: 5196, strictPort: true },
  plugins: [{ name: 'pilot-detail-diagnostic', enforce: 'post', transform(code, id) {
    if (id.endsWith('/src/main.ts')) return `${code}\nwindow.__PILOT_DETAIL_APP__ = app;`;
  } }],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:5196');
  await page.waitForFunction(() => window.__PODRACING__?.ready && window.__PODRACING__.snapshot().game.vehiclePresentation.racers[0].status === 'ready');
  await page.addStyleTag({ content: '.pod-hud { visibility: hidden !important; }' });
  await page.evaluate(() => {
    window.__PODRACING__.setCaptureMode(true);
    window.__PODRACING__.setCamera('chase');
    window.__PODRACING__.seekCourse(.005);
  });
  for (const [name, offset] of [['side', [1, .22, .08]], ['front-quarter', [.85, .3, .85]], ['rear-quarter', [-.85, .3, -.85]]]) {
    const receipt = await page.evaluate(({ name, offset, materialProbe }) => {
      const app = window.__PILOT_DETAIL_APP__, view = app.playerView, camera = app.cameraRig.camera;
      view.updateWorldMatrix(true, true);
      const min = camera.position.clone().set(Infinity, Infinity, Infinity), max = min.clone().multiplyScalar(-1);
      const point = camera.position.clone(), meshes = [];
      view.traverse(object => {
        if (!object.isMesh || !object.name.startsWith('teemto-pilot-') || !object.material?.isShaderMaterial) return;
        if (materialProbe !== 'authored' && /pilot-(suit|webbing|rubber|accent)/.test(object.name)) {
          const uniforms = object.material.celUniforms;
          uniforms.uRimStrength.value = 0;
          uniforms.uSpecularStrength.value = .025;
          uniforms.uReflectionStrength.value = 0;
          uniforms.uNormalScale.value.set(.25, .25);
          if (materialProbe === 'cloth') {
            object.material.setPalette({ ...object.material.palette,
              diffuseBands: ['#a5a7ab', '#c3bcae', '#e8d8b7', '#fff0d8'] });
            uniforms.uWear.value = 0;
          }
        }
        object.geometry.computeBoundingBox();
        const box = object.geometry.boundingBox;
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          point.set(x, y, z).applyMatrix4(object.matrixWorld); min.min(point); max.max(point);
        }
        meshes.push({ name: object.name, material: object.material.name,
          normalMap: object.material.defines?.USE_NORMAL_MAP === 1 || Object.keys(object.material.defines ?? {}).some(key => key.includes('NORMAL')),
          defines: object.material.defines });
      });
      if (meshes.length !== 6 || !Number.isFinite(min.x)) throw new Error(`Expected six installed mapped pilot meshes, got ${meshes.length}`);
      const target = min.clone().add(max).multiplyScalar(.5), size = max.clone().sub(min);
      const distance = Math.max(size.x, size.y, size.z) * 1.75;
      const direction = point.clone().set(...offset).normalize().applyQuaternion(view.quaternion);
      const position = target.clone().addScaledVector(direction, distance);
      const pose = () => { camera.position.copy(position); camera.fov = 34; camera.near = .08;
        camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); };
      // The normal GameApp.render path still updates terrain, shadows, effects,
      // imported geometry, MRT, beauty and composite around this camera.
      app.cameraRig.snap = pose; app.cameraRig.update = pose;
      pose(); app.render(0);
      return { name, materialProbe, progress: .005, target: target.toArray(), position: camera.position.toArray(),
        fov: camera.fov, meshes, snapshot: window.__PODRACING__.snapshot() };
    }, { name, offset, materialProbe });
    await page.locator('#viewport').screenshot({ path: `${out}/${name}.png` });
    receipts.push(receipt);
  }
  const after = await hashes();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Inspected runtime source changed during detail capture');
  await writeFile(`${out}/receipts.json`, JSON.stringify({ scope: 'Diagnostic close camera inside actual GameApp rendering. Optional matte uniforms are temporary diagnostic overrides, explicitly recorded per frame. No model/lighting/source changes. Vite source build, not production bundle or FPS proof.', before, after,
    browser: browser.version(), receipts, errors }, null, 2));
  console.log(JSON.stringify({ out, views: receipts.length, errors }));
  if (errors.length) process.exitCode = 1;
} finally { await browser?.close(); await server.close(); }
