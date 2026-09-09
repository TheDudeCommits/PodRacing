/** Actual UI acceptance via the shipped live GamepadInput. No capture/seek/step/state writes.
 * Run: npx --yes tsx scripts/competitive-flow.ts
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
import { judgeRaceCadence } from './lib/race-cadence';
import { expectedResultClock } from './lib/result-clock';

const soloOnly=process.argv.includes('--solo-only');
const performanceMode=process.argv.includes('--performance');
const appearanceArgument=process.argv.find(arg=>arg.startsWith('--appearance'));
if(appearanceArgument && !['--appearance=sebulba','--appearance=polwo'].includes(appearanceArgument)) {
 throw new Error('The optional appearance selection supports --appearance=sebulba or --appearance=polwo; omit it for the default Teemto flow');
}
const selectedAppearance=appearanceArgument ? appearanceArgument.slice('--appearance='.length) : null;
const fixedQualityArgument=process.argv.find(arg=>arg.startsWith('--fixed-quality'));
if(fixedQualityArgument && (!performanceMode || fixedQualityArgument!=='--fixed-quality=0')) {
 throw new Error('--fixed-quality=0 is supported only with --performance');
}
const fixedQuality=fixedQualityArgument ? 0 : null;
const output = process.argv.find(arg=>arg.startsWith('--output='))?.slice(9) ?? 'output/playwright/competitive-flow';
const initialScriptHash=createHash('sha256').update(await readFile('scripts/competitive-flow.ts')).digest('hex');
await mkdir(output, { recursive: true });
const port = await new Promise<number>((resolve, reject) => {
 const server = createServer(); server.once('error', reject);
 server.listen(0, '127.0.0.1', () => { const address = server.address();
  if (!address || typeof address === 'string') return reject(new Error('No port'));
  server.close(() => resolve(address.port)); });
});
const url = `http://127.0.0.1:${port}`;
const server = spawn('npm', ['run', 'preview', '--', '--port', String(port)], { stdio: 'ignore' });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let page: Page | undefined;
const errors: string[] = [], receipts: Record<string, unknown> = {};
const assert = (test: unknown, message: string) => { if (!test) throw new Error(message); };
const storage = () => page!.evaluate(() => JSON.parse(localStorage.getItem('podracing.inkstorm.mastery.v1') ?? 'null'));
const snapshot = () => page!.evaluate(() => window.__PODRACING__!.snapshot());

function cadenceSummary(frames: { intervalMs: number | null; phase: string; raceTime: number }[], phase: string) {
 const selected=frames.filter(frame=>frame.phase===phase && frame.intervalMs!==null);
 const intervals=selected.map(frame=>frame.intervalMs!);
 const sorted=intervals.toSorted((a,b)=>a-b),quantile=(q:number)=>sorted[Math.floor((sorted.length-1)*q)]??null;
 const durationMs=intervals.reduce((sum,interval)=>sum+interval,0);
 return {phase,samples:intervals.length,durationMs,averageFps:durationMs>0?intervals.length*1000/durationMs:null,
  p50Ms:quantile(.5),p95Ms:quantile(.95),p99Ms:quantile(.99),maxMs:sorted.at(-1)??null,
  over25ms:intervals.filter(ms=>ms>25).length,over33ms:intervals.filter(ms=>ms>33.3334).length,over50ms:intervals.filter(ms=>ms>50).length,
  firstRaceTime:selected[0]?.raceTime??null,lastRaceTime:selected.at(-1)?.raceTime??null};
}

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

async function finishRun(label: string, timeout = 220_000) {
 await startDriver();
 console.log(`DRIVE ${label}`);
 const started = Date.now(); let lastLog = 0, sectorCaptured = false;
 while(Date.now()-started<timeout) {
  await new Promise(resolve=>setTimeout(resolve,1000));
  // Read race state and rendered completion in one browser turn. Separate
  // protocol calls can straddle the fixed tick that publishes the result.
  const observation = await page!.evaluate(() => ({ state: window.__PODRACING__!.snapshot(),
   finished: document.querySelector('.pod-hud')?.getAttribute('data-phase') === 'finished' }));
  const state = observation.state; const model = state.game.mastery as any;
  if (!performanceMode && !sectorCaptured && model.latestSector) { await page!.screenshot({path:`${output}/${label}-sector.png`}); sectorCaptured=true; }
  if(Date.now()-lastLog>20000){console.log(label,JSON.stringify({time:state.raceTime,progress:state.galactic?.racers[0]?.courseProgress,sector:model.latestSector?.index,result:!!model.result}));lastLog=Date.now();}
  const finished = observation.finished;
  if(finished) {
   await page!.evaluate(()=>(window as any).__flowDriver.stop());
   await page!.screenshot({path:`${output}/${label}-results.png`});
   const trace=await page!.evaluate(()=>(window as any).__flowDriver.trace);
   const record={snapshot:state,profile:await storage(),trace,resultsText:await page!.locator('[data-hud="results"]').innerText(),
    resultsHtml:await page!.locator('[data-hud="results"]').evaluate(node=>node.outerHTML),performance:performanceMode?await page!.evaluate(()=>(window as any).__flowDriver.performance):undefined};
   if(record.performance){
    record.performance.summary={racing:cadenceSummary(record.performance.frames,'racing'),countdown:cadenceSummary(record.performance.frames,'countdown')};
    record.performance.acceptance=judgeRaceCadence(record.performance.summary.racing,model.result?.time);
    if(fixedQuality!==null)record.performance.fixedQualityAcceptance={expectedDpr:2,expectedCanvas:[2880,1800],
     outcome:record.performance.rendererExtrema.minDpr===2 && record.performance.rendererExtrema.maxDpr===2 && record.performance.resolutionSamples.every((sample:any)=>sample.pixelRatio===2 && sample.canvasWidth===2880 && sample.canvasHeight===1800)?'PASS':'FAIL'};
    console.log(`CADENCE ${label}`,JSON.stringify(record.performance.summary));
   }
   receipts[label]=record;
   await writeFile(`${output}/${label}.json`,JSON.stringify(record,null,2));
   if(record.performance)assert(record.performance.acceptance.outcome==='PASS',`${label}: cadence FAIL: ${record.performance.acceptance.issues.join('; ')}`);
   if(record.performance?.fixedQualityAcceptance)assert(record.performance.fixedQualityAcceptance.outcome==='PASS',`${label}: highest-quality override did not preserve DPR 2 / 2880x1800`);
   assert(model.result && model.result.time>0,`${label}: no actual completed result`);
   console.log(`FINISH ${label}`,JSON.stringify(model.result));return model;
  }
 }
 throw new Error(`${label} exceeded real-time driving timeout`);
}

try {
 for(let i=0;i<200;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:performanceMode?2:1});
 await context.addInitScript(()=>{
  // tsx preserves function names in serialized evaluate callbacks with this
  // harmless helper; provide its runtime in the isolated browser context.
  Object.defineProperty(window,'__name',{value:Function('fn','return fn'),configurable:true});
  const pad={id:'Codex acceptance virtual standard gamepad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({value:0,pressed:false,touched:false})),timestamp:0};
  (window as any).__flowPad=pad;
  Object.defineProperty(navigator,'getGamepads',{value:()=>[pad,null,null,null],configurable:true});
 });
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url);await page.waitForFunction(()=>window.__PODRACING__?.ready,{timeout:45000});
 if(fixedQuality!==null){
  await page.evaluate(()=>{const api=window.__PODRACING__;if(!api?.setPerformanceQuality)throw new Error('Rendering quality override unavailable');api.setPerformanceQuality(0);});
 }
 receipts.requestedQualityOverride=fixedQuality===null?null:{level:fixedQuality,meaning:'Highest renderer quality, adaptive governor disabled',calls:1,scope:'Renderer-only diagnostic called once after ready, before first start; no capture mode, simulation or progress writes.'};
 receipts.buildScripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLScriptElement).src));
 if(performanceMode){
  receipts.build=await Promise.all((receipts.buildScripts as string[]).map(async source=>({url:source,sha256:createHash('sha256').update(new Uint8Array(await(await fetch(source)).arrayBuffer())).digest('hex')})));
  receipts.device=await page.evaluate(()=>{const canvas=document.querySelector<HTMLCanvasElement>('#viewport'),gl=canvas?.getContext('webgl2'),extension=gl?.getExtension('WEBGL_debug_renderer_info');
   return {userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,requestedDpr:devicePixelRatio,viewport:{width:innerWidth,height:innerHeight},canvas:{width:canvas?.width,height:canvas?.height},
    renderer:extension?gl!.getParameter(extension.UNMASKED_RENDERER_WEBGL):'unavailable',vendor:extension?gl!.getParameter(extension.UNMASKED_VENDOR_WEBGL):'unavailable',
    webglVersion:gl?.getParameter(gl.VERSION)??'unavailable'};});
  receipts.browserVersion=browser.version();
  receipts.performanceMethod='Native requestAnimationFrame intervals across each complete ordinary racing phase, including transient slow frames and post-player classification grace. Countdown reported separately; no warmup removal or interior exclusions. Read-only snapshot/input-controller overhead is included. No GPU timer queries or physical presentation timestamps.';
 }
 assert(await storage()===null,'Test must start with empty competitive storage');
 receipts.appearanceSelection=selectedAppearance===null?{requested:'default',action:'No appearance selection; preserve the ordinary default flow.'}:{requested:selectedAppearance,action:'Click the visible garage appearance button before Start, then wait for its actual race geometry and decoded preview.'};
 if(selectedAppearance!==null){
  await page.locator(`[data-action="select-appearance"][data-appearance="${selectedAppearance}"]`).click();
  await page.waitForFunction(wanted=>{
   const hero=window.__PODRACING__?.snapshot().game.vehiclePresentation?.racers[0];
   return hero?.requested===wanted && hero.active===wanted && hero.status==='ready';
  },selectedAppearance,{timeout:45000});
  await page.locator(`[data-hud="garage-model"][data-preview-appearance="${selectedAppearance}"]`).waitFor();
  receipts.selectedAppearanceBeforeStart=(await snapshot()).game.vehiclePresentation;
 }
 await page.locator('[data-action="start-race"]').click();
 const solo=await finishRun('time-attack');
 assert(solo.result.personalBest && solo.result.invalidReason===null,'Solo finish did not produce a valid PB');
 assert(solo.result.sectors.length===10,'Solo result did not preserve10sectors');
 const saved=await storage();const soloRecord=Object.values(saved.records).find((r:any)=>r.identity.eventId==='inkstorm-trial') as any;
 assert(soloRecord?.ghost?.frames.length>20,'PB ghost was not persisted');
 const resultActions=await page.locator('[data-hud="results"] .pod-hud__results-actions').boundingBox();
 receipts.resultsActionsBounds=resultActions;
 assert(resultActions && resultActions.y>=0 && resultActions.y+resultActions.height<=900,'Primary results actions are outside the initial viewport');
 receipts.highlightText=await page.locator('[data-hud="results"] [data-action="view-highlight"]').allTextContents();
 const raceClock=expectedResultClock(soloRecord.time);
 assert((receipts.highlightText as string[]).some(text=>text.includes(`${raceClock} // You`)),'Finish highlight clock differs from actual solo finish');
 if(!performanceMode){
 await page.locator('[data-hud="results"] [data-action="retry-race"]').click();
 await page.waitForFunction(()=>window.__PODRACING__!.snapshot().raceTime<1);
 await startDriver(.62);
 await page.waitForFunction(()=>window.__PODRACING__!.snapshot().raceTime>3,{timeout:20000});
 await page.screenshot({path:`${output}/ghost-retry-near.png`});receipts.ghostRetryNear=await snapshot();
 await page.waitForFunction(()=>window.__PODRACING__!.snapshot().raceTime>5,{timeout:20000});
 await page.screenshot({path:`${output}/ghost-retry.png`});
 const retry=await snapshot();receipts.ghostRetry=retry;
 assert((retry.game.mastery as any).ghostAvailable && (retry.game.mastery as any).ghostEnabled,'Retry did not load active PB ghost');
 assert((retry.game.course as any).seed===soloRecord.identity.courseSeed,'Retry changed course identity');
 await page.evaluate(()=>(window as any).__flowDriver.stop());
 await page.keyboard.down('p');await page.waitForTimeout(120);await page.keyboard.up('p');
 await page.locator('[data-hud="pause"] [data-action="return-to-garage"]').click();
 await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready,{timeout:45000});
 const reloaded=await snapshot();receipts.persistedAfterReload=reloaded;
 // The read-only review snapshot omits the hangar's preview identity. The
 // actual HUD deliberately supplies that identity, so verify visible UI and
 // durable data instead of expecting the inactive race snapshot to do so.
 const afterReload=await storage();
 const persistedSolo=Object.values(afterReload.records).find((r:any)=>r.identity.eventId==='inkstorm-trial') as any;
 receipts.persistedReloadUI={best:await page.locator('[data-hud="personal-best"]').innerText(),ghost:await page.locator('[data-hud="ghost-state"]').innerText()};
 assert(persistedSolo?.time===soloRecord.time && persistedSolo?.ghost?.frames.length===soloRecord.ghost.frames.length,'PB/ghost durable data changed after page reload');
 const expectedTime=`${Math.floor(soloRecord.time/60)}:${String(Math.floor(soloRecord.time%60)).padStart(2,'0')}.${String(Math.floor(soloRecord.time*100)%100).padStart(2,'0')}`;
 assert(await page.locator('[data-action="toggle-ghost"]').isEnabled() && (await page.locator('[data-hud="personal-best"]').innerText())===expectedTime,'PB/ghost did not reappear in actual hangar UI');
 }else{
  await page.locator('[data-hud="results"] [data-action="return-to-garage"]').click();
 }
 if(!soloOnly) {
 await page.locator('[data-event-id="cup-canyon"]').click();
 assert((await snapshot()).game.awaitingStart,'Cup selection did not return to grid preparation');
 await page.locator('[data-action="start-race"]').click();
 const cup=await finishRun('cup-round-1',260000);
 assert(cup.championshipRound===1 && cup.result.nextEventId==='cup-foundry','Actual Cup finish did not bank round1');
 await page.locator('[data-hud="results"] [data-action="next-event"]').click();
 let next=await snapshot();receipts.cupContinue=next;
 assert((next.game.mastery as any).eventId==='cup-foundry' && (next.game.mastery as any).championshipRound===1,'Continue did not choose next unplayed round');
 await page.screenshot({path:`${output}/cup-continue-foundry.png`});
 if(!performanceMode){
 await page.locator('[data-event-id="cup-canyon"]').click();
 assert((await snapshot()).game.mastery && (await snapshot()).game.awaitingStart,'Practice selection did not show hangar');
 await page.screenshot({path:`${output}/cup-practice-preparation.png`});
 assert((await snapshot()).game.mastery && ((await snapshot()).game.mastery as any).championshipContext.title==='Single-round practice','Replayed Cup round lacks practice context');
 const roundsBefore=JSON.stringify((await storage()).championship.rounds);
 await page.locator('[data-action="start-race"]').click();
 const practice=await finishRun('cup-practice',260000);
 assert(practice.championshipRound===1 && JSON.stringify((await storage()).championship.rounds)===roundsBefore,'Practice incorrectly changed championship points');
 assert(practice.result.nextEventId==='cup-foundry','Practice did not point to next unplayed round');
 }
 }
 assert(errors.length===0,`Browser errors: ${errors.join('; ')}`);
 receipts.outcome='PASS';receipts.visibleGhostAcceptance='Requires separate visual verification; ghostAvailable/ghostEnabled alone do not prove visible geometry.';console.log('COMPETITIVE FLOW PASS');
} catch(error) {
 receipts.outcome='FAIL';receipts.error=String(error);process.exitCode=1;
 if(page){try{await page.screenshot({path:`${output}/failure.png`});receipts.failureSnapshot=await snapshot();receipts.failureText=await page.locator('body').innerText();}catch{}}
 console.error(error);
} finally {
 if(page){try{await page.evaluate(()=>(window as any).__flowDriver?.stop());}catch{}}
 await browser?.close();server.kill('SIGTERM');
 receipts.errors=errors;receipts.completedAt=new Date().toISOString();
 receipts.limitations='Automated virtual gamepad through shipped live adapter in disposable storage. No capture mode, simulation stepping, pose/progress mutation, or real-user PB changes. Not human gamepad feel or FPS evidence.';
 if(performanceMode)receipts.limitations='Full ordinary-race native RAF cadence with automated gamepad/controller overhead included. No staged starts, review steps, pose/progress mutation, warmup exclusion or frame filtering. Local browser/device only; not GPU execution time, physical display presentation, universal device FPS or human driving feel.';
 receipts.scriptHash=initialScriptHash;
 await writeFile(`${output}/receipt.json`,JSON.stringify(receipts,null,2));
}
