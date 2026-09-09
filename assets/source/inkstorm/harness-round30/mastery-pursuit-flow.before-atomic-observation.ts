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
if(appearanceArgument && appearanceArgument!=='--appearance=sebulba') {
 throw new Error('The optional appearance selection supports only --appearance=sebulba; omit it for the default Teemto flow');
}
const selectedAppearance=appearanceArgument ? 'sebulba' : null;
const fixedQualityArgument=process.argv.find(arg=>arg.startsWith('--fixed-quality'));
if(fixedQualityArgument && (!performanceMode || fixedQualityArgument!=='--fixed-quality=0')) {
 throw new Error('--fixed-quality=0 is supported only with --performance');
}
const fixedQuality=fixedQualityArgument ? 0 : null;
const output = process.argv.find(arg=>arg.startsWith('--output='))?.slice(9) ?? 'output/playwright/mastery-pursuit-round30';
const initialScriptHash=createHash('sha256').update(await readFile('scripts/mastery-pursuit-flow.ts')).digest('hex');
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

async function finishRun(label: string, timeout = 220_000, speedScale = 1) {
 await startDriver(speedScale);
 console.log(`DRIVE ${label}`);
 const started = Date.now(); let lastLog = 0, sectorCaptured = false;
 while(Date.now()-started<timeout) {
  await new Promise(resolve=>setTimeout(resolve,1000));
  const state = await snapshot(); const model = state.game.mastery as any;
  if (label === 'pursuit' && model.latestSector) {
   const samples = (receipts.paceSamples ??= []) as any[];
   if (!samples.some(s => s.index === model.latestSector.index)) samples.push({...model.latestSector, hud:await page!.locator('[data-hud="split"]').innerText()});
  }
  if (!performanceMode && !sectorCaptured && model.latestSector) { await page!.screenshot({path:`${output}/${label}-sector.png`}); sectorCaptured=true; }
  if(Date.now()-lastLog>20000){console.log(label,JSON.stringify({time:state.raceTime,progress:state.galactic?.racers[0]?.courseProgress,sector:model.latestSector?.index,result:!!model.result}));lastLog=Date.now();}
  const finished = await page!.locator('.pod-hud').getAttribute('data-phase') === 'finished';
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
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await context.addInitScript(()=>{
  Object.defineProperty(window,'__name',{value:Function('fn','return fn'),configurable:true});
  const pad={id:'Codex pursuit acceptance standard gamepad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({value:0,pressed:false,touched:false})),timestamp:0};
  (window as any).__flowPad=pad;
  Object.defineProperty(navigator,'getGamepads',{value:()=>[pad,null,null,null],configurable:true});
 });
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url);await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:45000});
 assert(await storage()===null,'Pursuit test must use disposable empty storage');
 const scriptUrls=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLScriptElement).src));
 receipts.build=await Promise.all(scriptUrls.map(async source=>({url:source,sha256:createHash('sha256').update(new Uint8Array(await(await fetch(source)).arrayBuffer())).digest('hex')})));
 await page.locator('[data-action="start-race"]').click();
 const baseline=await finishRun('baseline');
 assert(baseline.result.personalBest && !baseline.result.invalidReason,'Baseline is not a valid PB');
 assert(baseline.result.retryTarget===null,'First record fabricated a comparison target');
 const baselineStorage=JSON.stringify((await storage()).records);
 assert(baseline.result.sectors.every((s:any)=>s.label && !s.label.startsWith('Sector ')),'Actual gate labels missing');
 await page.locator('[data-hud="results"] [data-action="retry-race"]').click();
 const slower=await finishRun('pursuit',220000,.84);
 assert(!slower.result.invalidReason && !slower.result.personalBest,'Slower attempt must be valid without replacing PB');
 const deltas=slower.result.sectors.map((s:any,i:number)=>s.time-baseline.result.sectors[i].time);
 const largest=Math.max(...deltas),index=deltas.indexOf(largest);
 assert(largest>.005,'Slower run did not produce a measured sector loss');
 assert(slower.result.retryTarget?.sectorIndex===index+1 && Math.abs(slower.result.retryTarget.loss-largest)<1e-8,'Retry target does not match independent largest-loss calculation');
 for(const sample of receipts.paceSamples as any[]){
  const cumulative=deltas.slice(0,sample.index).reduce((sum:number,d:number)=>sum+d,0);
  assert(Math.abs(sample.paceDelta-cumulative)<1e-8,`Gate${sample.index} PB pace differs from independent cumulative clock`);
  if(sample.index<10)assert(sample.hud.startsWith('PB '),`Gate${sample.index} pace was not presented in HUD`);
 }
 assert((receipts.paceSamples as any[]).length>=8,'Too few accepted gate pace observations');
 assert(JSON.stringify((await storage()).records)===baselineStorage,'Slower pursuit changed the stored PB/ghost');
 const layouts=[];
 for(const viewport of [{width:1440,height:900},{width:1280,height:720}]){
  await page.setViewportSize(viewport);
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await page.screenshot({path:`${output}/pursuit-results-${viewport.width}.png`});
  const actions=await page.locator('[data-hud="results"] .pod-hud__results-actions').boundingBox();
  const pursuit=await page.locator('[data-hud="retry-pursuit"]').boundingBox();
  const summary=await page.locator('[data-hud="mastery-result"] header>span').innerText();
  const values=summary.match(/^TOTAL (\d+):(\d+\.\d+) · PB (\d+):(\d+\.\d+) · GAP ([+−-]?\d+\.\d+)[sS]$/);
  assert(values,`Whole-run summary must distinguish current total, PB and gap: ${summary}`);
  const presentedRun=Number(values![1])*60+Number(values![2]);
  const presentedBest=Number(values![3])*60+Number(values![4]);
  const presentedGap=Number(values![5]!.replace('−','-'));
  assert(Math.abs(presentedRun-slower.result.time)<.011 && Math.abs(presentedBest-baseline.result.time)<.011,'Displayed run/PB totals disagree with completed authoritative runs');
  assert(Math.abs(presentedGap-(slower.result.time-baseline.result.time))<.00051,'Displayed whole-run gap disagrees with independent finish-time difference');
  const footer=page.locator('.pod-hud__results-footer');
  const footerVisible=await footer.isVisible();
  const footerBounds=footerVisible?await footer.boundingBox():null;
  const panel=await page.locator('[data-hud="results"]').boundingBox();
  assert(!footerVisible || (footerBounds && panel && footerBounds.y>=panel.y && footerBounds.y+footerBounds.height<=Math.min(viewport.height,panel.y+panel.height)),'Visible result footer is clipped');
  layouts.push({viewport,actions,pursuit,summary,footerVisible,footerBounds});
  assert(actions && actions.y>=0 && actions.y+actions.height<=viewport.height,`Results actions outside${viewport.width}viewport`);
  assert(pursuit && pursuit.width>100,'Measured pursuit card missing');
 }
 receipts.layouts=layouts;
 await page.locator('[data-hud="results"] [data-action="return-to-garage"]').click();
 const objective=await page.locator('[data-hud="mastery-objective"]').innerText();
 receipts.retryGarage={snapshot:await snapshot(),objective};
 assert(objective.includes(slower.result.retryTarget.label) && objective.includes(largest.toFixed(2)),'Exact-setting retry did not preserve its pursuit');
 await page.waitForFunction(()=>document.querySelector('[data-hud="garage-model"]')?.getAttribute('data-preview-ready')==='true',undefined,{timeout:30000});
 await page.screenshot({path:`${output}/pursuit-garage-1280.png`});
 await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:45000});
 assert(JSON.stringify((await storage()).records)===baselineStorage,'Reload changed the stored PB/ghost');
 receipts.outcome='PASS';console.log('MASTERY PURSUIT FLOW PASS');
} catch(error) {
 receipts.outcome='FAIL';receipts.error=String(error);process.exitCode=1;console.error(error);
 if(page){try{await page.screenshot({path:`${output}/failure.png`});receipts.failureSnapshot=await snapshot();}catch{}}
} finally {
 if(page){try{await page.evaluate(()=>(window as any).__flowDriver?.stop());}catch{}}
 await browser?.close();server.kill('SIGTERM');
 receipts.errors=errors;receipts.completedAt=new Date().toISOString();receipts.scriptHash=initialScriptHash;
 receipts.limitations='Two complete actual input-only laps, disposable local storage, actual result/garage UI at1440x900 and1280x720. No seek, capture mode, simulation stepping, pose/progress/record writes. UI/record-flow evidence, not frame-rate or human-driving acceptance.';
 if(errors.length){receipts.outcome='FAIL';process.exitCode=1;}
 await writeFile(`${output}/receipt.json`,JSON.stringify(receipts,null,2));
}
