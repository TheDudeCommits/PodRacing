/** Ordinary-input Cup lifecycle acceptance. No capture, stepping or progress writes.
 * Run against a frozen existing build:
 * npx --yes tsx scripts/cup-cycle.ts --output=output/playwright/cup-cycle
 * Optional: --expected-build-sha=<sha256> --finish-replay-round
 * --check validates script loading without starting a server or browser.
 */
import { chromium, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createProceduralPodraceCourse } from '../src/game/race/course';
import { sampleTerrainHeight } from '../src/render/terrain/terrainMath';
import { DEFAULT_PODRACER_CONFIG } from '../src/game/simulation/config';
import { deriveGalacticVehicleConfig } from '../src/game/galactic/catalog';
import { CHAMPIONSHIP_EVENT_IDS, CHAMPIONSHIP_POINTS } from '../src/game/mastery/events';

if (process.argv.includes('--check')) {
 console.log('Cup lifecycle harness loads; no server or browser started.');
 process.exit(0);
}
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9) ?? 'output/playwright/cup-cycle';
const expectedBuildSha = process.argv.find(arg => arg.startsWith('--expected-build-sha='))?.split('=')[1];
const finishReplayRound = process.argv.includes('--finish-replay-round');
// Copy of the existing competitive-flow driver; its performance path stays off.
// competitive-flow.ts and its established performance gates are not modified.
const performanceMode = false;
const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const scriptHash = sha256(await readFile('scripts/cup-cycle.ts'));
const referenceDriverHash = sha256(await readFile('scripts/competitive-flow.ts'));
await mkdir(output, { recursive: true });
const port = await new Promise<number>((resolve, reject) => {
 const server = createServer(); server.once('error', reject);
 server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (!address || typeof address === 'string') return reject(new Error('No port'));
  server.close(() => resolve(address.port));
 });
});
const url = `http://127.0.0.1:${port}`;
const server = spawn('npm', ['run', 'preview', '--', '--port', String(port)], {
 stdio: 'ignore', detached: process.platform !== 'win32',
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let page: Page | undefined;
const errors: string[] = [];
const receipts: Record<string, any> = { scriptHash, referenceDriverHash, finishReplayRound, url, rounds: [],
 labelAssertion: { normalization: 'Lowercase rendered innerText because the shipped button uses CSS text-transform: uppercase.',
  priorFailure: 'cup-cycle-round19b retained the correct fresh-Cup state but failed a case-sensitive label assertion.',
  priorHarnessSha256: '56bbb1f7b3cff6ac3b13bff220a008296356890dc2678c0caff3d637f3e9f9ef' } };
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const snapshot = () => page!.evaluate(() => window.__PODRACING__!.snapshot());
const storage = () => page!.evaluate(() => JSON.parse(localStorage.getItem('podracing.inkstorm.mastery.v1') ?? 'null'));
const actions = () => page!.evaluate(() => (window as any).__cupActions);
const championship = async () => JSON.stringify((await storage()).championship);
const persistentRecords = (profile: any) => JSON.stringify(Object.fromEntries(
 Object.entries(profile).filter(([key]) => key !== 'championship')));
const observeErrors = (target: Page) => {
 target.on('pageerror', error => errors.push(error.message));
 target.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
};

async function startDriver(speedScale = 1) {
 const state = await snapshot();
 const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, Number((state.game.course as any).seed));
 assert(course.signature === (state.game.course as any).signature, 'Offline driver course does not match browser course');
 const samples = Array.from({ length: 4096 }, (_, i) => course.sampleAtDistance(course.totalLength * i / 4096));
 const tune = deriveGalacticVehicleConfig('podracer', DEFAULT_PODRACER_CONFIG, { afterburner: 0, cornering: 0, resilience: 0 });
 await page!.evaluate(({ samples, totalLength, tune, speedScale, performanceMode }) => {
  const win = window as any;
  win.__flowDriver?.stop();
  const pad = win.__flowPad;
  const control = { enabled: true, frames: 0, trace: [] as unknown[], lastTime: -1, previous: null as null | { x: number; z: number; time: number }, raf: 0,
   stop() { this.enabled = false; cancelAnimationFrame(this.raf); pad.axes[0] = 0; pad.buttons.forEach((b: any) => { b.value = 0; b.pressed = false; }); } };
  win.__flowDriver = control;
  const viewport=document.querySelector<HTMLCanvasElement>('#viewport');
  const perf={frames:[] as any[],resolutionSamples:[] as any[],transitions:[] as any[],events:[] as any[],
   inputCounts:{boostSamples:0,driftSamples:0,fireSamples:0,mineSamples:0,shieldSamples:0,resetSamples:0},
   observedGalacticEvents:{} as Record<string,number>,vehicleCollisionCount:null as number|null,
   collisionCountScope:'Base suspension/racer collision events are not exposed by the read-only review API; unavailable, not zero.',
   previousRaf:null as number|null,previousPhase:'',previousQuality:'',lastResolutionRaf:-Infinity,lastEventFrame:-1,
   rendererExtrema:{minDpr:Infinity,maxDpr:0,maxCalls:0,maxTriangles:0},controllerOverheadMs:[] as number[]};
  (control as any).performance=perf;
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
  const smooth = (a: number, b: number, x: number) => { const t = clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
  const authority = (speed: number) => tune.steeringRateLowSpeed + (tune.steeringRateHighSpeed-tune.steeringRateLowSpeed)*smooth(.08,1,speed/tune.maxSpeed);
  const corner = (curve: number) => { let lo=10,hi=tune.maxSpeed*.95; for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(mid*Math.abs(curve)<=authority(mid)*.78)lo=mid;else hi=mid;}return lo; };
  const sample = (distance: number) => samples[((Math.round(distance / totalLength * samples.length) % samples.length) + samples.length) % samples.length]!;
  const rawStick = (desired: number) => { let lo=0,hi=1;for(let i=0;i<14;i++){const mid=(lo+hi)/2,normalized=Math.max(0,(mid-.14)/.86);const response=normalized+(normalized*normalized*(3-2*normalized)-normalized)*.35;if(response<Math.abs(desired))lo=mid;else hi=mid;}return -Math.sign(desired)*(lo+hi)/2; };
  const button=(index:number,value:number)=>{pad.buttons[index].value=value;pad.buttons[index].pressed=value>.5;};
  const frame = (rafTime:number) => {
   if(!control.enabled) return;
   const controllerStart=performanceMode?performance.now():0;
   const state = window.__PODRACING__!.snapshot();
   const game = state.game as any, player = state.galactic!.racers.find(r=>r.id==='player')!;
   const phase = document.querySelector('.pod-hud')?.getAttribute('data-phase');
   if(performanceMode){
    const interval=perf.previousRaf===null?null:rafTime-perf.previousRaf;
    // Race time is authoritative when the less-frequent HUD still shows the
    // last countdown frame. Keep that launch interval in racing coverage.
    const currentPhase=phase==='countdown' && state.raceTime>0 ? 'racing' : phase??'unknown';
    perf.frames.push({rafTime,intervalMs:interval,phase:currentPhase,raceTime:state.raceTime,simulationFrame:state.simulationFrame,progress:player.courseProgress,sector:game.mastery.latestSector?.index??null});
    perf.previousRaf=rafTime;
    if(currentPhase!==perf.previousPhase){perf.transitions.push({type:'phase',rafTime,raceTime:state.raceTime,from:perf.previousPhase,to:currentPhase});perf.previousPhase=currentPhase;}
    const renderer=state.renderer,quality=`${renderer.width}x${renderer.height}@${renderer.pixelRatio}`;
    perf.rendererExtrema.minDpr=Math.min(perf.rendererExtrema.minDpr,renderer.pixelRatio);perf.rendererExtrema.maxDpr=Math.max(perf.rendererExtrema.maxDpr,renderer.pixelRatio);
    perf.rendererExtrema.maxCalls=Math.max(perf.rendererExtrema.maxCalls,renderer.calls);perf.rendererExtrema.maxTriangles=Math.max(perf.rendererExtrema.maxTriangles,renderer.triangles);
    if(quality!==perf.previousQuality || rafTime-perf.lastResolutionRaf>=1000){
     const sample={rafTime,raceTime:state.raceTime,phase:currentPhase,progress:player.courseProgress,...renderer,
      canvasWidth:viewport?.width??null,canvasHeight:viewport?.height??null,requestedDpr:devicePixelRatio};
     perf.resolutionSamples.push(sample);perf.lastResolutionRaf=rafTime;
     if(quality!==perf.previousQuality){perf.transitions.push({type:'resolution',...sample,from:perf.previousQuality,to:quality});perf.previousQuality=quality;}
    }
    let latestFrame=perf.lastEventFrame;
    for(const event of state.galactic?.recentEvents??[]){const eventFrame=Number(event.frame);if(eventFrame<=perf.lastEventFrame)continue;
     perf.observedGalacticEvents[String(event.type)]=(perf.observedGalacticEvents[String(event.type)]??0)+1;perf.events.push(event);latestFrame=Math.max(latestFrame,eventFrame);}
    perf.lastEventFrame=latestFrame;
    const inputPairs=[[1,'boostSamples'],[0,'driftSamples'],[5,'fireSamples'],[3,'mineSamples'],[2,'shieldSamples'],[8,'resetSamples']] as const;
    for(const[index,key]of inputPairs)if(pad.buttons[index].value>.5)perf.inputCounts[key]++;
   }
   if(game.awaitingStart || phase==='finished' || game.mastery.result) {button(7,0);button(6,1);pad.axes[0]=0;}
   else if (state.raceTime-control.lastTime >= 1/30 || control.lastTime < 0 || phase==='countdown') {
    const [x,,z]=game.position, yaw=game.yaw, speed=game.speed;
    const hint=Math.round((player.courseProgress??0)*samples.length); let nearest=hint,nearestSq=Infinity;
    for(let i=hint-60;i<=hint+60;i++){const p=samples[(i%samples.length+samples.length)%samples.length]!,sq=(x-p.x)**2+(z-p.z)**2;if(sq<nearestSq){nearestSq=sq;nearest=(i%samples.length+samples.length)%samples.length;}}
    const distance=nearest/samples.length*totalLength, current=samples[nearest]!;
    const look=clamp(19+speed*.34,23,77), target=sample(distance+look);
    const tx=target.x-x,tz=target.z-z,error=Math.atan2(Math.sin(Math.atan2(tx,tz)-yaw),Math.cos(Math.atan2(tx,tz)-yaw));
    const elapsed=control.previous?state.raceTime-control.previous.time:0;
    const lateral=elapsed>0 && elapsed<.2 ? ((x-control.previous!.x)*Math.cos(yaw)-(z-control.previous!.z)*Math.sin(yaw))/elapsed : 0;
    const yawRate=2*Math.max(20,speed)*Math.sin(error)/Math.max(10,Math.hypot(tx,tz))+error*.38-lateral*.011;
    const steer=clamp(yawRate/Math.max(.1,authority(speed)),-1,1);
    let targetSpeed=tune.maxSpeed*.9*speedScale;
    for(const ahead of [0,18,38,70,110,170,245,325]){const limit=corner(sample(distance+ahead).curvature);targetSpeed=Math.min(targetSpeed,Math.sqrt(limit*limit+2*tune.brakeAcceleration*.6*ahead));}
    if(Math.abs(error)>.8)targetSpeed=Math.min(targetSpeed,30);
    if(Math.sqrt(nearestSq)>current.width*.8)targetSpeed=Math.min(targetSpeed,50);
    button(7,phase==='countdown'?0:speed>targetSpeed+3?0:clamp(.5+(targetSpeed-speed)/15,0,1));
    button(6,clamp((speed-targetSpeed-2)/17,0,1));button(1,0);pad.axes[0]=rawStick(steer);pad.timestamp=performance.now();
    control.previous={x,z,time:state.raceTime}; control.lastTime=state.raceTime;control.frames++;
    if(control.frames%30===0)control.trace.push({time:state.raceTime,position:[x,z],progress:player.courseProgress,speed,targetSpeed,steer,phase,sector:game.mastery.latestSector?.index??null,wrongWay:Math.abs(error)>2});
   }
   if(performanceMode)perf.controllerOverheadMs.push(performance.now()-controllerStart);
   control.raf=requestAnimationFrame(frame);
  }; control.raf=requestAnimationFrame(frame);
 }, { samples, totalLength: course.totalLength, tune, speedScale, performanceMode });
}


async function finishRun(label: string, timeout = 300_000) {
 await startDriver();
 console.log(`DRIVE ${label}`);
 const started = Date.now(); let lastLog = 0;
 while (Date.now() - started < timeout) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const state = await snapshot(); const model = state.game.mastery as any;
  if (Date.now() - lastLog > 20_000) {
   console.log(label, JSON.stringify({ time: state.raceTime, sector: model.latestSector?.index,
    progress: state.galactic?.racers.find(racer => racer.id === 'player')?.courseProgress, result: !!model.result }));
   lastLog = Date.now();
  }
  if (await page!.locator('.pod-hud').getAttribute('data-phase') !== 'finished') continue;
  await page!.evaluate(() => (window as any).__flowDriver.stop());
  const record = { snapshot: state, profile: await storage(), actions: await actions(),
   trace: await page!.evaluate(() => (window as any).__flowDriver.trace),
   resultsText: await page!.locator('[data-hud="results"]').innerText(),
   resultsHtml: await page!.locator('[data-hud="results"]').evaluate(node => node.outerHTML) };
  // Write raw evidence before judging it so failed rounds remain reviewable.
  receipts.rounds.push({ label, ...record });
  await writeFile(`${output}/${label}.json`, JSON.stringify(record, null, 2));
  await page!.screenshot({ path: `${output}/${label}-results.png` });
  assert(model.result?.time > 0 && model.result.invalidReason === null, `${label}: no clean ordinary finish`);
  assert(model.result.sectors.length === 20, `${label}: did not finish both complete laps`);
  console.log(`FINISH ${label}`, JSON.stringify(model.result));
  return model;
 }
 throw new Error(`${label}: exceeded real-time driving timeout`);
}

async function assertReadyFor(eventId: string, rounds: number) {
 await page!.waitForFunction(({ eventId, rounds }) => {
  const game = window.__PODRACING__!.snapshot().game;
  const mastery = game.mastery as any;
  return game.awaitingStart && mastery.eventId === eventId && mastery.championshipRound === rounds;
 }, { eventId, rounds });
}

try {
 let serverReady = false;
 for (let i = 0; i < 200; i++) {
  try { if ((await fetch(url)).ok) { serverReady = true; break; } } catch {}
  await new Promise(resolve => setTimeout(resolve, 100));
 }
 assert(serverReady, 'Preview server did not become ready');
 browser = await chromium.launch({ channel: 'chrome', headless: true });
 const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
 await context.addInitScript(() => {
  Object.defineProperty(window, '__name', { value: Function('fn', 'return fn'), configurable: true });
  const pad = { id: 'Codex acceptance virtual standard gamepad', index: 0, connected: true, mapping: 'standard',
   axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ value: 0, pressed: false, touched: false })), timestamp: 0 };
  (window as any).__flowPad = pad;
  Object.defineProperty(navigator, 'getGamepads', { value: () => [pad, null, null, null], configurable: true });
  (window as any).__cupActions = [];
  document.addEventListener('pod-hud-action', event => {
   (window as any).__cupActions.push({ at: performance.now(), action: (event as CustomEvent).detail });
  }, true);
 });
 page = await context.newPage(); observeErrors(page);
 await page.goto(url);
 await page.waitForFunction(() => window.__PODRACING__?.ready, undefined, { timeout: 45_000 });
 receipts.browserVersion = browser.version();
 const scriptUrls = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => (node as HTMLScriptElement).src));
 receipts.build = await Promise.all(scriptUrls.map(async source => ({ url: source,
  sha256: sha256(new Uint8Array(await (await fetch(source)).arrayBuffer())) })));
 if (expectedBuildSha) assert(receipts.build.some((entry: any) => entry.sha256 === expectedBuildSha), 'Served build differs from expected frozen SHA');
 assert(await storage() === null, 'Cup test requires fresh disposable competitive storage');
 await page.locator('[data-event-id="cup-canyon"]').click();
 await assertReadyFor('cup-canyon', 0);
 await page.locator('[data-action="save-course"]').click();

 for (const [index, eventId] of CHAMPIONSHIP_EVENT_IDS.entries()) {
  await assertReadyFor(eventId, index);
  assert(!await page.locator('[data-hud="cup-context"] [data-action="restart-championship"]').isVisible(), 'Replay appeared before series completion');
  await page.locator('[data-action="start-race"]').click();
  const result = await finishRun(`cup-round-${index + 1}`);
  const profile = await storage();
  assert(result.championshipRound === index + 1, `${eventId}: round did not bank exactly once`);
  assert(JSON.stringify(profile.championship.rounds.map((round: any) => round.eventId)) === JSON.stringify(CHAMPIONSHIP_EVENT_IDS.slice(0, index + 1)), `${eventId}: order or duplicate award mismatch`);
  for (const round of profile.championship.rounds) for (const entry of round.results) {
   assert(entry.points === (CHAMPIONSHIP_POINTS[entry.placement - 1] ?? 0), `${eventId}: incorrect placement points`);
  }
  const record = Object.values(profile.records).find((value: any) => value.identity.eventId === eventId) as any;
  assert(record?.ghost?.frames.length > 20 && record.time === result.result.time, `${eventId}: clean PB/ghost missing`);
  const banked = await championship();
  await page.waitForTimeout(350);
  assert(await championship() === banked, `${eventId}: finished observation awarded twice`);
  const nextEventId = CHAMPIONSHIP_EVENT_IDS[index + 1] ?? null;
  assert(result.result.nextEventId === nextEventId, `${eventId}: incorrect next round`);
  if (nextEventId) {
   assert(!await page.locator('[data-hud="results"] [data-action="restart-championship"]').isVisible(), 'Replay appeared before final round');
   await page.locator('[data-hud="results"] [data-action="next-event"]').click();
   await assertReadyFor(nextEventId, index + 1);
   receipts[`continue${index + 1}`] = { snapshot: await snapshot(), actions: await actions() };
   await page.screenshot({ path: `${output}/continue-${index + 1}.png` });
  }
 }

 const completedProfile = await storage();
 const retained = persistentRecords(completedProfile);
 const finalStandings = await championship();
 const replay = page.locator('[data-hud="results"] [data-action="restart-championship"]');
 assert(await replay.isVisible() && await replay.isEnabled(), 'Completed series has no usable replay button');
 assert((await replay.innerText()).trim() === 'Race another cup', 'Replay action label is unclear');
 assert(await page.locator('[data-hud="results"] [data-action="next-event"]').count() === 0, 'Final round incorrectly offers a next round');
 const bounds = await replay.boundingBox(); receipts.replayButtonBounds = bounds;
 assert(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 1440 && bounds.y + bounds.height <= 900,
  'Replay action is outside the initial results viewport');
 // A separate same-origin page verifies a returning player's garage. It reads
 // the completed profile without clearing it or losing the live results UI.
 const returningPage = await context.newPage(); observeErrors(returningPage);
 try {
  await returningPage.goto(url);
  await returningPage.waitForFunction(() => window.__PODRACING__?.ready, undefined, { timeout: 45_000 });
  const garageReplay = returningPage.locator('[data-hud="cup-context"] [data-action="restart-championship"]');
  assert(await garageReplay.isVisible() && await garageReplay.isEnabled(), 'Completed Cup cannot be replayed after reload into garage');
  receipts.returningGarage = { text: await returningPage.locator('[data-hud="cup-context"]').innerText(),
   snapshot: await returningPage.evaluate(() => window.__PODRACING__!.snapshot()) };
  await returningPage.screenshot({ path: `${output}/completed-cup-returning-garage.png` });
  assert(await championship() === finalStandings, 'Opening the returning garage silently cleared the Cup');
  assert(persistentRecords(await storage()) === retained, 'Opening the garage changed records');
  const beforeGarageActions = await returningPage.evaluate(() => (window as any).__cupActions.length);
  await garageReplay.click();
  await returningPage.waitForFunction(() => {
   const state = window.__PODRACING__!.snapshot();
   return (state.game.mastery as any).eventId === 'cup-canyon'
    && (state.game.mastery as any).championshipRound === 0 && state.game.awaitingStart;
  });
  const garageActions = await returningPage.evaluate(index => (window as any).__cupActions.slice(index), beforeGarageActions);
  assert(garageActions.length === 1 && garageActions[0].action.type === 'restart-championship', 'Garage replay failed to dispatch exactly one restart');
  assert((await storage()).championship.rounds.length === 0, 'Garage replay did not reset the Cup');
  assert(persistentRecords(await storage()) === retained, 'Garage replay changed non-Cup progress');
  receipts.returningGarageReplay = { actions: garageActions, profile: await storage(),
   snapshot: await returningPage.evaluate(() => window.__PODRACING__!.snapshot()) };
  await returningPage.screenshot({ path: `${output}/fresh-cup-from-returning-garage.png` });
 } finally { await returningPage.close(); }
 // The original page still displays its completed series. Exercise its real
 // results action too; no profile fixture, reset hook or direct method call.
 const actionsBefore = (await actions()).length;
 await replay.click();
 await assertReadyFor('cup-canyon', 0);
 const dispatched = (await actions()).slice(actionsBefore);
 assert(dispatched.length === 1 && dispatched[0].action.type === 'restart-championship', 'Visible replay click did not dispatch exactly one restart action');
 assert(persistentRecords(await storage()) === retained, 'Replay cleared PBs, ghosts, history, favorites or preferences');
 assert((await storage()).championship.rounds.length === 0, 'Replay retained completed-series points');
 assert(!await page.locator('[data-hud="cup-context"] [data-action="restart-championship"]').isVisible(), 'Fresh series still offers completed replay');
 assert((await page.locator('[data-hud="start-button"]').innerText()).toLowerCase().includes('start championship'), 'Replay does not prepare a fresh championship');
 receipts.replayed = { snapshot: await snapshot(), profile: await storage(), actions: await actions() };
 await page.screenshot({ path: `${output}/fresh-cup-preparation.png` });

 await page.reload();
 await page.waitForFunction(() => window.__PODRACING__?.ready, undefined, { timeout: 45_000 });
 assert(persistentRecords(await storage()) === retained && (await storage()).championship.rounds.length === 0, 'Fresh series or records did not survive reload');
 await page.locator('[data-event-id="cup-canyon"]').click();
 await assertReadyFor('cup-canyon', 0);
 if (finishReplayRound) {
  await page.locator('[data-action="start-race"]').click();
  const replayedRound = await finishRun('new-cup-round-1');
  assert(replayedRound.championshipRound === 1 && replayedRound.result.nextEventId === 'cup-foundry', 'New series did not bank its first round');
  const fresh = await storage();
  assert(fresh.championship.rounds.length === 1, 'New series included old points');
  for (const [key, oldRecord] of Object.entries(completedProfile.records)) {
   const next = fresh.records[key];
   assert(next && next.time <= (oldRecord as any).time, 'New run lost a prior personal best');
  }
 }
 assert(sha256(await readFile('scripts/competitive-flow.ts')) === referenceDriverHash, 'Reference performance harness changed during acceptance');
 assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
 receipts.outcome = 'PASS';
 console.log('CUP CYCLE PASS');
} catch (error) {
 receipts.outcome = 'FAIL'; receipts.error = String(error); process.exitCode = 1;
 if (page) try {
  await page.screenshot({ path: `${output}/failure.png` });
  receipts.failure = { snapshot: await snapshot(), profile: await storage(), actions: await actions(),
   text: await page.locator('body').innerText(), trace: await page.evaluate(() => (window as any).__flowDriver?.trace ?? null) };
 } catch {}
 console.error(error);
} finally {
 if (page) try { await page.evaluate(() => (window as any).__flowDriver?.stop()); } catch {}
 try { await browser?.close(); receipts.browserClosed = true; } catch (error) {
  errors.push(`Browser cleanup: ${String(error)}`); receipts.outcome = 'FAIL'; process.exitCode = 1;
 } finally {
  // This process group contains only this harness's owned preview server.
  try {
   if (server.pid && process.platform !== 'win32') process.kill(-server.pid, 'SIGTERM');
   else server.kill('SIGTERM');
  } catch { server.kill('SIGTERM'); }
  receipts.previewTerminationRequested = true;
 }
 receipts.errors = errors; receipts.completedAt = new Date().toISOString();
 receipts.limitations = 'Ordinary virtual gamepad through shipped live input and rendered HUD actions, in disposable storage. ' +
  'No capture mode, simulation stepping, pose/progress mutation, direct mastery calls or real-user record changes. ' +
  'Not FPS, human driving feel, medal balance or human fun acceptance. Raw failures are retained.';
 await writeFile(`${output}/receipt.json`, JSON.stringify(receipts, null, 2));
}
