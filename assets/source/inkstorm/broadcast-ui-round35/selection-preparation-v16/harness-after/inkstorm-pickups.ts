/** Native runtime pickup acceptance using a virtual standard gamepad through the
 * shipped GamepadInput. No race/health/position writes, seek, capture or event injection.
 * This is not physical-controller coverage or a frame-rate benchmark.
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
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';
const output=process.env.INKSTORM_OUTPUT ?? 'output/playwright/round35-native-pickups';
const port=Number(process.env.INKSTORM_OWNED_PORT ?? 5197);
if(!Number.isInteger(port)||port<1024||port>65535||port===5211)throw new Error('Valid dedicated owned port required; never 5211.');
const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const performanceMode=true; // observation collector only; no benchmark gate is asserted
const waitPickups=process.env.INKSTORM_WAIT_PICKUPS==='1';
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
let page:Page|undefined;
let server:ReturnType<typeof spawn>|undefined;
let closing:Promise<void>|undefined;
const receipt:any={outcome:'FAIL',errors:[],scope:'Native Chrome runtime with ordinary UI actions and an automated virtual standard gamepad through shipped input. The driver aims at authored pickup lanes. No capture, simulation stepping, race-state writes, damage/heat writes, or event injection. Not physical gamepad coverage, critical audio listening, or performance acceptance.',captures:[],commands:[],
 harnessSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),
 pickupWaitMode:{enabled:waitPickups,scope:'Optional ordinary-input braking upstream while a combat pickup recharges; read-only availability observation. Gameplay cooldowns and acceptance gates are unchanged.'}};
const snapshot=()=>page!.evaluate(()=>window.__PODRACING__!.snapshot());
await mkdir(output,{recursive:true});
const cleanup=()=>closing??=(async()=>{
 const state:any={browserClosed:false,serverExited:false,errors:[]};
 try{await browser?.close();state.browserClosed=true;}catch(error){state.errors.push(String(error));}
 try{if(server?.pid&&server.exitCode===null&&server.signalCode===null){const exit=new Promise(resolve=>server!.once('exit',resolve));server.kill('SIGTERM');await Promise.race([exit,delay(3000).then(()=>{throw new Error('Owned server exit timed out');})]);}state.serverExited=!server||server.exitCode!==null||server.signalCode!==null;}
 catch(error){state.errors.push(String(error));if(server?.pid&&server.exitCode===null&&server.signalCode===null){const exit=new Promise(resolve=>server!.once('exit',resolve));server.kill('SIGKILL');await exit;}state.serverExited=!!server&&(server.exitCode!==null||server.signalCode!==null);}
 receipt.cleanup=state;if(state.errors.length||!state.browserClosed||!state.serverExited)receipt.outcome='FAIL';
 await writeFile(`${output}/receipt.json`,JSON.stringify(receipt,null,2));
})();
for(const [signal,code]of [['SIGINT',130],['SIGTERM',143]]as const)process.once(signal,()=>{receipt.error=signal;void cleanup().finally(()=>process.exit(code));});
async function startDriver(speedScale = 1) {
 const state = await snapshot();
 assert(!state.game.awaitingStart && state.game.pendingCourse===null && state.raceTime===0, 'Driver setup requires the actual released countdown course');
 const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, Number((state.game.course as any).seed));
 assert(course.signature === (state.game.course as any).signature, 'Offline driver course does not match browser course');
 const samples = Array.from({ length: 4096 }, (_, i) => course.sampleAtDistance(course.totalLength * i / 4096));
 const tune = deriveGalacticVehicleConfig('podracer', DEFAULT_PODRACER_CONFIG, { afterburner: 0, cornering: 0, resilience: 0 });
 receipt.driverCourse=await page!.evaluate(({ samples, totalLength, tune, speedScale, performanceMode, waitPickups, courseSeed, courseSignature }) => {
  const initial=window.__PODRACING__!.snapshot(),game=initial.game as any;
  if(game.awaitingStart||game.pendingCourse!==null||initial.raceTime!==0||game.course.seed!==courseSeed||game.course.signature!==courseSignature)throw Error('Actual countdown course changed or started racing before driver installation');
  const win = window as any;
  win.__flowDriver?.stop();
  const pad = win.__flowPad;
  const control = { enabled: true, frames: 0, trace: [] as unknown[], pickupAvailabilityTrace:[] as unknown[], pickupWaitTransitions:[] as unknown[], pickupTraceTruncated:false, previousPickupDecision:'none', repairBoostSeconds:0, lastTime: -1, previous: null as null | { x: number; z: number; time: number }, raf: 0,
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
    // Aim using normal GamepadInput at the two authored pickup lanes.
    // This changes only the test gamepad; no game state is written.
    const progress = distance / totalLength;
    const playerProgress=player.courseProgress??0;
    const claimedIds=player.galactic.upgrades.collectedPickupIds;
    const pickup=waitPickups ? state.galactic!.world.pickups.find(p=>(p.part==='emp-cell'||p.part==='repair-salvage')&&!claimedIds.includes(p.id)
     && playerProgress>p.progress-.08 && playerProgress<p.progress+p.progressRadius+.015) : undefined;
    const distanceToEntry=pickup ? (pickup.progress-pickup.progressRadius-playerProgress)*totalLength : null;
    const distanceToStop=distanceToEntry===null ? null : distanceToEntry-24;
    const recharging=!!pickup && pickup.collectedBy!==null;
    const hold=recharging && distanceToStop!==null && distanceToStop<=4;
    const lane = pickup ? pickup.lateralOffset : progress > .265 && progress < .335 ? -6 : progress > .755 && progress < .825 ? 6 : 0;
    const tx=target.x+target.rightX*lane-x,tz=target.z+target.rightZ*lane-z,error=Math.atan2(Math.sin(Math.atan2(tx,tz)-yaw),Math.cos(Math.atan2(tx,tz)-yaw));
    const elapsed=control.previous?state.raceTime-control.previous.time:0;
    const lateral=elapsed>0 && elapsed<.2 ? ((x-control.previous!.x)*Math.cos(yaw)-(z-control.previous!.z)*Math.sin(yaw))/elapsed : 0;
    const yawRate=2*Math.max(20,speed)*Math.sin(error)/Math.max(10,Math.hypot(tx,tz))+error*.38-lateral*.011;
    const steer=clamp(yawRate/Math.max(.1,authority(speed)),-1,1);
    let targetSpeed=tune.maxSpeed*.9*speedScale;
    for(const ahead of [0,18,38,70,110,170,245,325]){const limit=corner(sample(distance+ahead).curvature);targetSpeed=Math.min(targetSpeed,Math.sqrt(limit*limit+2*tune.brakeAcceleration*.6*ahead));}
    if(Math.abs(error)>.8)targetSpeed=Math.min(targetSpeed,30);
    if(Math.sqrt(nearestSq)>current.width*.8)targetSpeed=Math.min(targetSpeed,50);
    if(pickup){
     targetSpeed=Math.min(targetSpeed,75);
     // Conservative ordinary braking envelope, ending 24m before the claim
     // window. Re-evaluate the real cooldown every controller decision.
     if(recharging)targetSpeed=Math.min(targetSpeed,Math.sqrt(2*tune.brakeAcceleration*.4*Math.max(0,distanceToStop!-6)),Math.max(0,distanceToStop!)*.8);
    }
    let throttle=phase==='countdown'?0:speed>targetSpeed+3?0:clamp(.5+(targetSpeed-speed)/15,0,1);
    let brake=clamp((speed-targetSpeed-2)/17,0,1);
    if(hold){throttle=0;brake=1;}
    // Move the optional mode's old long boost to a short, cool final approach
    // after recharge. It supplies real heat for the unchanged restoration gate.
    const repairBoost=!!pickup && pickup.part==='repair-salvage' && !recharging && distanceToEntry!<24 && distanceToEntry!>0
     && speed>10 && throttle>.5 && brake===0 && game.redlineHeat<.18 && control.repairBoostSeconds<.6;
    const boost=waitPickups ? repairBoost : progress>.765 && progress<.795 && game.redlineHeat<.55;
    if(repairBoost)control.repairBoostSeconds+=Math.max(0,Math.min(.1,state.raceTime-control.lastTime));
    button(7,throttle);button(6,brake);button(1,boost?1:0);pad.axes[0]=hold&&speed<2?0:rawStick(steer);pad.timestamp=performance.now();
    if(waitPickups){
     const mode=pickup ? recharging ? hold?'holding-upstream':'braking-for-recharge' : 'approaching-available' : 'none';
     const decision={simulationFrame:state.simulationFrame,raceTime:state.raceTime,phase,pickupId:pickup?.id??null,mode,
      progress:player.courseProgress,lateralOffset:player.lateralOffset,position:[x,z],speed,targetSpeed,lane,distanceToEntry,distanceToStop,
      collectedBy:pickup?.collectedBy??null,respawnRemaining:pickup?.respawnRemaining??null,collectedPickupIds:[...claimedIds],
      wreckPhase:player.galactic.wreck.phase,redlineHeat:game.redlineHeat,repairBoostSeconds:control.repairBoostSeconds,throttle,brake,boost,steer};
     const key=`${pickup?.id??'none'}:${mode}:${pickup?.collectedBy??'available'}`;
     if(key!==control.previousPickupDecision){control.pickupWaitTransitions.push(decision);control.previousPickupDecision=key;}
     if(pickup){if(control.pickupAvailabilityTrace.length<7000)control.pickupAvailabilityTrace.push(decision);else control.pickupTraceTruncated=true;}
    }
    control.previous={x,z,time:state.raceTime}; control.lastTime=state.raceTime;control.frames++;
    if(control.frames%30===0)control.trace.push({time:state.raceTime,position:[x,z],progress:player.courseProgress,speed,targetSpeed,steer,phase,sector:game.mastery.latestSector?.index??null,wrongWay:Math.abs(error)>2});
   }
   if(performanceMode)perf.controllerOverheadMs.push(performance.now()-controllerStart);
   control.raf=requestAnimationFrame(frame);
  }; control.raf=requestAnimationFrame(frame);
  return{seed:courseSeed,signature:courseSignature,raceTime:initial.raceTime,simulationFrame:initial.simulationFrame,phase:document.querySelector<HTMLElement>('.pod-hud')?.dataset.phase,installedDuringCountdown:true};
 }, { samples, totalLength: course.totalLength, tune, speedScale, performanceMode, waitPickups, courseSeed:Number((state.game.course as any).seed), courseSignature:course.signature });
}

try{
 const probe=createServer();await new Promise<void>((resolve,reject)=>{probe.once('error',reject);probe.listen(port,'127.0.0.1',resolve);});await new Promise<void>((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
 const url=`http://127.0.0.1:${port}`;let ready=false;
 for(let i=0;i<160;i++){if(server.exitCode!==null)throw new Error('Preview exited');try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(100);}assert(ready,'Owned preview did not start');
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:`${output}/video`,size:{width:1440,height:900}}});
 await context.addInitScript(()=>{
  Object.defineProperty(window,'__name',{value:Function('fn','return fn'),configurable:true});
  const pad={id:'Codex pickup acceptance virtual standard gamepad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({value:0,pressed:false,touched:false})),timestamp:0};
  (window as any).__flowPad=pad;Object.defineProperty(navigator,'getGamepads',{value:()=>[pad,null,null,null],configurable:true});
 });
 page=await context.newPage();page.on('pageerror',error=>receipt.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')receipt.errors.push(message.text());});
 await page.goto(url);await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:45000});
 receipt.environment=await frozenBuildReceipt(page,browser);
 receipt.renderer=await page.evaluate(()=>{const gl=document.querySelector<HTMLCanvasElement>('#viewport')?.getContext('webgl2');const ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;});
 assert(receipt.renderer&&!/swiftshader|llvmpipe|software rasterizer/i.test(receipt.renderer),'Native GPU unavailable');
 await page.locator('[data-action="select-event"][data-event-id="open-expedition"]:visible').click();
 await page.waitForFunction(()=>window.__PODRACING__!.snapshot().game.mastery?.eventId==='open-expedition');
 receipt.selection=await snapshot();const pending=receipt.selection.game.pendingCourse;
 assert(receipt.selection.game.awaitingStart&&pending?.eventId==='open-expedition'&&Number.isInteger(pending.seed),'Open Expedition must reserve a pending route before Start');
 await page.locator('[data-action="start-race"]:visible').click();
 await page.waitForFunction(()=>!window.__PODRACING__!.snapshot().game.awaitingStart&&document.querySelector<HTMLElement>('.pod-hud')?.dataset.phase==='countdown');
 receipt.before=await snapshot();assert(receipt.before.game.competitionProfile==='chaos','Open Expedition must use chaos rules');
 assert(receipt.before.game.pendingCourse===null&&receipt.before.game.course.seed===pending.seed&&receipt.before.raceTime===0,'Native Start did not promote the prepared route into countdown');
 await startDriver();
 receipt.commands.push('Click actual Open Expedition then Start; install the offline driver from the newly built countdown course. Automated gamepad follows course and authored pickup lanes.');
 if(waitPickups)receipt.commands.push('INKSTORM_WAIT_PICKUPS=1: observe real pickup recharge; brake upstream, hold with zero throttle/full brake if needed, then approach the authored lane when available. Repair uses at most 0.6s of ordinary boost below 0.18 core heat on the final approach, without braking.');
 const captured=new Set<string>();const started=Date.now();let complete=false;
 while(Date.now()-started<210000){
  await delay(100);
  const observation=await page.evaluate(()=>{const driver=(window as any).__flowDriver;return{state:window.__PODRACING__!.snapshot(),events:driver.performance.events,phase:document.querySelector('.pod-hud')?.getAttribute('data-phase'),cue:document.querySelector('[data-hud="combat-feedback"]')?.textContent};});
  for(const type of ['emp-pulse','repair-salvage-collected']){
   const event=observation.events.find((event:any)=>event.type===type&&event.racerId==='player');
   if(event&&!captured.has(type)){captured.add(type);const path=`${output}/${type}.png`;await page.screenshot({path});receipt.captures.push({type,path,event,cue:observation.cue,snapshot:observation.state});console.log('PICKUP',JSON.stringify(event));}
  }
  if(captured.size===2){await delay(1200);complete=true;break;}
  if(observation.phase==='finished')break;
 }
 await page.evaluate(()=>(window as any).__flowDriver.stop());
 receipt.after=await snapshot();receipt.observation=await page.evaluate(()=>{const driver=(window as any).__flowDriver;return{events:driver.performance.events,trace:driver.trace,inputCounts:driver.performance.inputCounts,pickupAvailabilityTrace:driver.pickupAvailabilityTrace,pickupWaitTransitions:driver.pickupWaitTransitions,pickupTraceTruncated:driver.pickupTraceTruncated};});
 const emp=receipt.observation.events.filter((event:any)=>event.type==='emp-pulse'&&event.racerId==='player');
 const repair=receipt.observation.events.filter((event:any)=>event.type==='repair-salvage-collected'&&event.racerId==='player');
 assert(complete&&emp.length===1&&repair.length===1,'Did not observe exactly one actual player claim for each combat pickup');
 assert(repair[0].repaired+repair[0].cooled+repair[0].coreCooled>0,'Repair claim restored no actual damage or heat');
 assert(!receipt.observation.pickupTraceTruncated,'Pickup availability trace truncated');
 receipt.claims={emp:emp[0],repair:repair[0],empTargetCoverage:emp[0].targetIds.length?'Live enemies were disrupted':'No live enemy in range; target effects remain CPU-covered'};
 assert(receipt.errors.length===0,'Browser console/page errors');
 receipt.outcome='PASS';
}catch(error){receipt.error=String(error);if(page){try{await page.evaluate(()=>(window as any).__flowDriver?.stop());receipt.failure=await snapshot();receipt.observation=await page.evaluate(()=>{const driver=(window as any).__flowDriver;return driver?{events:driver.performance.events,trace:driver.trace,inputCounts:driver.performance.inputCounts,pickupAvailabilityTrace:driver.pickupAvailabilityTrace,pickupWaitTransitions:driver.pickupWaitTransitions,pickupTraceTruncated:driver.pickupTraceTruncated}:null;});await page.screenshot({path:`${output}/failure.png`});}catch{}}}
finally{await cleanup();}
console.log(JSON.stringify({outcome:receipt.outcome,error:receipt.error,claims:receipt.claims,cleanup:receipt.cleanup}));
if(receipt.outcome!=='PASS')process.exitCode=1;
