/** One native Open Expedition race, ordinary virtual-pad offense, no gameplay writes.
 * Independent of pickup acceptance. A missing actual kill remains FAIL. */
import { chromium, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProceduralPodraceCourse } from '../src/game/race/course';
import { sampleTerrainHeight } from '../src/render/terrain/terrainMath';
import { DEFAULT_PODRACER_CONFIG } from '../src/game/simulation/config';
import { deriveGalacticVehicleConfig } from '../src/game/galactic/catalog';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';
const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(projectRoot,process.env.INKSTORM_OUTPUT??'output/playwright/round35-outgoing-takedown-native');
const port=Number(process.env.INKSTORM_OWNED_PORT??5199);
const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
assert(Number.isInteger(port)&&port>=1024&&port<=65535&&port!==5211,'Dedicated valid owned port required; never5211.');
assert(/^[a-f0-9]{64}$/.test(process.env.INKSTORM_EXPECTED_BUILD??''),'An exact INKSTORM_EXPECTED_BUILD SHA is required.');
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const receipt:any={outcome:'FAIL',errors:[],captures:[],commands:[],outgoingCandidates:[],port,maxRaceWallSeconds:180,
 scope:'One actual Open Expedition race with ordinary automated virtual standard-gamepad steering/throttle/brake, Heat Lance, mines and shield. No game-state, position, health, cooldown, event, camera or simulation-step writes. Recorded native visual/input evidence; not physical-controller, performance, same-seed or guaranteed-kill coverage.',
 harnessSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex')};
// Refuse to overwrite any earlier attempt, including failed evidence.
await mkdir(dirname(output),{recursive:true});await mkdir(output);
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined,page:Page|undefined,server:ReturnType<typeof spawn>|undefined,closing:Promise<void>|undefined;
const snapshot=()=>page!.evaluate(()=>window.__PODRACING__!.snapshot());
const closeOwned=()=>closing??=(async()=>{
 const cleanup:any={browserClosed:false,serverExited:false,errors:[]};
 try{await browser?.close();cleanup.browserClosed=true;}catch(error){cleanup.errors.push(String(error));}
 try{if(server?.pid&&server.exitCode===null&&server.signalCode===null){const exited=new Promise(resolve=>server!.once('exit',resolve));server.kill('SIGTERM');await Promise.race([exited,delay(3000).then(()=>{throw Error('Owned preview exit timed out');})]);}cleanup.serverExited=!server||server.exitCode!==null||server.signalCode!==null;}
 catch(error){cleanup.errors.push(String(error));if(server?.pid&&server.exitCode===null&&server.signalCode===null){const exited=new Promise(resolve=>server!.once('exit',resolve));server.kill('SIGKILL');await exited;}cleanup.serverExited=!!server&&(server.exitCode!==null||server.signalCode!==null);}
 receipt.cleanup=cleanup;if(cleanup.errors.length||!cleanup.browserClosed||!cleanup.serverExited)receipt.outcome='FAIL';
 await writeFile(`${output}/receipt.json`,JSON.stringify(receipt,null,2));
})();
for(const[signal,code]of[['SIGINT',130],['SIGTERM',143]]as const)process.once(signal,()=>{receipt.error=signal;void closeOwned().finally(()=>process.exit(code));});

async function installDriver(){
 const state=await snapshot();
 assert(!state.game.awaitingStart&&state.game.pendingCourse===null&&state.raceTime===0,'Driver setup requires the actual released countdown course.');
 const course=createProceduralPodraceCourse({heightAt:sampleTerrainHeight},Number((state.game.course as any).seed));
 assert(course.signature===(state.game.course as any).signature,'Offline course does not match the actual browser course.');
 const samples=Array.from({length:4096},(_,i)=>course.sampleAtDistance(course.totalLength*i/4096));
 const tune=deriveGalacticVehicleConfig('podracer',DEFAULT_PODRACER_CONFIG,{afterburner:0,cornering:0,resilience:0,parts:[],collectedPickupIds:[]});
 receipt.driverCourse=await page!.evaluate(({samples,totalLength,tune,courseSeed,courseSignature})=>{
  const initial=window.__PODRACING__!.snapshot(),game=initial.game as any;
  if(game.awaitingStart||game.pendingCourse!==null||initial.raceTime!==0||game.course.seed!==courseSeed||game.course.signature!==courseSignature)throw Error('Actual countdown course changed or started racing before driver installation.');
  const win=window as any,pad=win.__outgoingPad;
  const observation={samples:[]as any[],events:[]as any[],inputs:[]as any[],truncated:false,stopped:false};
  let raf=0,lastSample=-Infinity,lastControl=-Infinity,previous:null|{x:number;z:number;time:number}=null,shieldUntil=-Infinity,nextShieldAt=0;
  let previousPolicyContext:any=null;
  const seen=new Set<string>();
  win.__outgoingQA={observation,stop(){observation.stopped=true;cancelAnimationFrame(raf);pad.axes[0]=0;pad.buttons.forEach((b:any)=>{b.value=0;b.pressed=false;});}};
  const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
  const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const authority=(speed:number)=>tune.steeringRateLowSpeed+(tune.steeringRateHighSpeed-tune.steeringRateLowSpeed)*smooth(.08,1,speed/tune.maxSpeed);
  const corner=(curve:number)=>{let lo=10,hi=tune.maxSpeed*.95;for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(mid*Math.abs(curve)<=authority(mid)*.78)lo=mid;else hi=mid;}return lo;};
  const sample=(distance:number)=>samples[((Math.round(distance/totalLength*samples.length)%samples.length)+samples.length)%samples.length]!;
  const rawStick=(desired:number)=>{let lo=0,hi=1;for(let i=0;i<14;i++){const mid=(lo+hi)/2,n=Math.max(0,(mid-.14)/.86),response=n+(n*n*(3-2*n)-n)*.35;if(response<Math.abs(desired))lo=mid;else hi=mid;}return-Math.sign(desired)*(lo+hi)/2;};
  const button=(index:number,value:number)=>{pad.buttons[index].value=value;pad.buttons[index].pressed=value>.5;};
  const append=(list:any[],value:any,limit:number)=>{if(list.length<limit)list.push(value);else observation.truncated=true;};
  const frame=(wallMs:number)=>{
   if(observation.stopped)return;
   const state=window.__PODRACING__!.snapshot(),game=state.game as any,player=state.galactic!.racers.find(r=>r.id==='player')!,root=document.querySelector<HTMLElement>('.pod-hud');
   const phase=root?.dataset.phase==='countdown'&&state.raceTime>0?'racing':root?.dataset.phase;
   const policyContext={wallMs,frame:state.simulationFrame,phase,paused:root?.classList.contains('is-paused'),
    role:game.onlineRoom.role,competitionProfile:game.competitionProfile,playerWreck:player.galactic.wreck.phase,
    camera:state.camera,matte:root?.classList.contains('has-cinematic-matte'),combatPresentation:game.combatPresentation??null};
   for(const event of state.galactic?.recentEvents??[]){const key=JSON.stringify(event);if(!seen.has(key)){
    seen.add(key);const outgoing=event.type==='wreck'&&event.racerId!=='player'&&event.takedownBy==='player';
    append(observation.events,{...event,observedWallMs:wallMs,...(outgoing?{eligibilityContext:{before:previousPolicyContext,observed:policyContext}}:{})},12000);
   }}
   if(wallMs-lastSample>=25){
    lastSample=wallMs;const cue=root?.querySelector<HTMLElement>('[data-hud="combat-feedback"]'),box=cue?.getBoundingClientRect(),style=cue?getComputedStyle(cue):null;
    const visible=!!cue&&!cue.hidden&&root!.classList.contains('has-combat-feedback')&&!!box&&box.width>0&&box.height>0&&style?.visibility!=='hidden'&&Number(style?.opacity)>0;
    append(observation.samples,{wallMs,frame:state.simulationFrame,raceTime:state.raceTime,phase,paused:root?.classList.contains('is-paused'),
     camera:state.camera,matte:root?.classList.contains('has-cinematic-matte'),playerWreck:player.galactic.wreck.phase,playerTakedowns:player.galactic.takedowns,
     role:policyContext.role,competitionProfile:policyContext.competitionProfile,combatPresentation:policyContext.combatPresentation,
     wrecks:state.galactic!.racers.filter(r=>r.galactic.wreck.phase==='wrecked').map(r=>({id:r.id,...r.galactic.wreck})),
     cueKind:visible?cue!.dataset.kind:null,cueAge:visible?Number(cue!.style.getPropertyValue('--cue-age')):null,
     cueTitle:visible?cue!.querySelector('[data-hud="combat-feedback-title"]')?.textContent:null,cueDetail:visible?cue!.querySelector('[data-hud="combat-feedback-detail"]')?.textContent:null},9000);
   }
   if(game.awaitingStart||phase==='finished'||game.mastery.result){pad.buttons.forEach((b:any)=>{b.value=0;b.pressed=false;});button(6,1);pad.axes[0]=0;}
   else if(state.raceTime-lastControl>=1/30||lastControl<0||phase==='countdown'){
    const[x,,z]=game.position,yaw=game.yaw,speed=game.speed,hint=Math.round((player.courseProgress??0)*samples.length);let nearest=hint,nearestSq=Infinity;
    for(let i=hint-60;i<=hint+60;i++){const p=samples[(i%samples.length+samples.length)%samples.length]!,sq=(x-p.x)**2+(z-p.z)**2;if(sq<nearestSq){nearestSq=sq;nearest=(i%samples.length+samples.length)%samples.length;}}
    const distance=nearest/samples.length*totalLength,current=samples[nearest]!,target=sample(distance+clamp(19+speed*.34,23,77));
    const tx=target.x-x,tz=target.z-z,error=Math.atan2(Math.sin(Math.atan2(tx,tz)-yaw),Math.cos(Math.atan2(tx,tz)-yaw));
    const elapsed=previous?state.raceTime-previous.time:0,lateral=elapsed>0&&elapsed<.2?((x-previous!.x)*Math.cos(yaw)-(z-previous!.z)*Math.sin(yaw))/elapsed:0;
    const yawRate=2*Math.max(20,speed)*Math.sin(error)/Math.max(10,Math.hypot(tx,tz))+error*.38-lateral*.011,steer=clamp(yawRate/Math.max(.1,authority(speed)),-1,1);
    let targetSpeed=tune.maxSpeed*.9;for(const ahead of[0,18,38,70,110,170,245,325]){const limit=corner(sample(distance+ahead).curvature);targetSpeed=Math.min(targetSpeed,Math.sqrt(limit*limit+2*tune.brakeAcceleration*.6*ahead));}
    if(Math.abs(error)>.8)targetSpeed=Math.min(targetSpeed,30);if(Math.sqrt(nearestSq)>current.width*.8)targetSpeed=Math.min(targetSpeed,50);
    const racing=phase==='racing'&&player.galactic.wreck.phase!=='wrecked';
    const rearRivals=state.galactic!.racers.filter(r=>r.id!=='player'&&r.position&&r.galactic.wreck.phase!=='wrecked').filter(r=>{const dx=r.position![0]-x,dz=r.position![2]-z,forward=dx*Math.sin(yaw)+dz*Math.cos(yaw),side=dx*Math.cos(yaw)-dz*Math.sin(yaw);return forward<0&&forward>-45&&Math.abs(side)<12;}).map(r=>r.id);
    if(racing&&game.shieldCooldown<=0&&state.raceTime>=nextShieldAt){shieldUntil=state.raceTime+.12;nextShieldAt=state.raceTime+.5;}
    button(7,phase==='countdown'?0:speed>targetSpeed+3?0:clamp(.5+(targetSpeed-speed)/15,0,1));button(6,clamp((speed-targetSpeed-2)/17,0,1));
    button(5,racing?1:0);button(3,racing&&rearRivals.length>0?1:0);button(2,racing&&state.raceTime<shieldUntil?1:0);button(1,0);pad.axes[0]=rawStick(steer);pad.timestamp=performance.now();
    append(observation.inputs,{wallMs,frame:state.simulationFrame,raceTime:state.raceTime,phase,progress:player.courseProgress,lateralOffset:player.lateralOffset,speed,targetSpeed,steer,
     throttle:pad.buttons[7].value,brake:pad.buttons[6].value,fire:pad.buttons[5].pressed,mine:pad.buttons[3].pressed,shield:pad.buttons[2].pressed,rearRivals,
     actualFire:game.inputFire,actualMine:game.inputMine,actualShield:game.inputShield,weaponCooldown:game.weaponCooldown,mineCharges:game.mineCharges,shieldCooldown:game.shieldCooldown},9000);
    previous={x,z,time:state.raceTime};lastControl=state.raceTime;
   }
   previousPolicyContext=policyContext;raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);
  return{seed:courseSeed,signature:courseSignature,raceTime:initial.raceTime,simulationFrame:initial.simulationFrame,phase:document.querySelector<HTMLElement>('.pod-hud')?.dataset.phase,installedDuringCountdown:true};
 },{samples,totalLength:course.totalLength,tune,courseSeed:Number((state.game.course as any).seed),courseSignature:course.signature});
}

function pace(samples:any[],start:number,end:number){
 const window=samples.filter(s=>s.wallMs>=start&&s.wallMs<=end&&!s.paused&&s.phase==='racing');if(window.length<4)return null;
 const first=window[0],last=window.at(-1),wallSeconds=(last.wallMs-first.wallMs)/1000;if(wallSeconds<.15)return null;
 return{samples:window.length,wallSeconds,simulationSeconds:(last.frame-first.frame)/120,raceSeconds:last.raceTime-first.raceTime,ratio:(last.frame-first.frame)/120/wallSeconds,
  maximumSampleGapMs:Math.max(...window.slice(1).map((s,i)=>s.wallMs-window[i].wallMs))};
}
function outgoingCandidate(wreck:any,samples:any[]){
 const before=wreck.eligibilityContext?.before,observed=wreck.eligibilityContext?.observed;
 const policyReasons:string[]=[],scenarioReasons:string[]=[];
 if(!before||!observed||!Number.isFinite(wreck.observedWallMs)||before.frame>=wreck.frame)policyReasons.push('missing-pre-event-context');
 if(before&&observed){
  if(before.role!=='solo'||observed.role!=='solo')policyReasons.push('not-solo');
  if(before.competitionProfile!=='chaos'||observed.competitionProfile!=='chaos')policyReasons.push('not-chaos');
  if(before.phase!=='racing'||observed.phase!=='racing')policyReasons.push('not-racing');
  if(before.paused||observed.paused)policyReasons.push('paused');
  // Running is this harness's driving scenario, not a runtime ban on cues or
  // cinematics during recovery. Preserve both exclusions independently.
  if(before.playerWreck!=='running'||observed.playerWreck!=='running')scenarioReasons.push('player-not-running');
 }
 const diagnostic=before?.combatPresentation,deadline=diagnostic?.cooldownUntilWallMs;
 if(!diagnostic||(deadline!==null&&!Number.isFinite(deadline)))policyReasons.push('missing-controller-cooldown');
 else if(deadline!==null&&wreck.observedWallMs<deadline)policyReasons.push('cinematic-cooldown');
 const prior=samples.filter(s=>s.wallMs<wreck.observedWallMs&&s.wallMs>=wreck.observedWallMs-1100);
 return {racerId:wreck.racerId,frame:wreck.frame,observedWallMs:wreck.observedWallMs,
  eligible:policyReasons.length===0&&scenarioReasons.length===0,policyReasons,scenarioReasons,
  beforeContext:before??null,observedContext:observed??null,cooldownUntilWallMs:deadline??null,
  cooldownBoundaryStraddled:typeof deadline==='number'&&before?.wallMs<deadline&&wreck.observedWallMs>=deadline,
  lastPreEventSample:prior.at(-1)??null};
}

function retainOutgoingCandidates(ledger:any[],events:any[],samples:any[]){
 for(const event of events){
  if(event.type!=='wreck'||event.racerId==='player'||event.takedownBy!=='player')continue;
  if(!ledger.some(candidate=>candidate.racerId===event.racerId&&candidate.frame===event.frame))ledger.push(outgoingCandidate(event,samples));
 }
 // Selection does not inspect clock pace, cue success, or camera quality.
 // The first eligible candidate is irrevocable even when its later gates fail.
 return ledger.find(candidate=>candidate.eligible)??null;
}

function analyze(observation:any,selected:{racerId:string;frame:number}|null){
 const{events,samples,inputs}=observation,issues:string[]=[],require=(condition:unknown,message:string)=>{if(!condition)issues.push(message);};
 const wreck=selected?events.find((e:any)=>e.type==='wreck'&&e.racerId===selected.racerId&&e.frame===selected.frame&&e.racerId!=='player'&&e.takedownBy==='player'):undefined;
 require(selected,'No eligible running outgoing candidate was selected within the bounded race.');
 const takedown=events.find((e:any)=>e.type==='takedown'&&e.attackerId==='player'&&e.victimId===wreck?.racerId&&e.frame===wreck?.frame);
 const actualVictim=samples.find((s:any)=>s.frame>=wreck?.frame&&s.wrecks.some((v:any)=>v.id===wreck?.racerId&&v.takedownBy==='player'));
 const cue=samples.find((s:any)=>s.frame>=wreck?.frame&&s.wallMs<wreck.observedWallMs+1400&&s.cueKind==='takedown'&&s.cueTitle==='TAKEDOWN'&&Number.isFinite(s.cueAge)
  // A later kill's cue must never satisfy this selected event. RAF timestamps
  // and the HUD's performance.now() age can differ within one display frame.
  &&(!wreck.eligibilityContext||(s.wallMs-s.cueAge*1250>=wreck.eligibilityContext.before.wallMs
    &&s.wallMs-s.cueAge*1250<=wreck.observedWallMs+25)));
 require(wreck&&takedown&&actualVictim,'No matching player-attributed authoritative enemy wreck, takedown event and live victim state.');
 require(cue,'Actual outgoing wreck lacked an observed visible TAKEDOWN cue.');
 require(events.some((e:any)=>e.type==='heat-lance-fired'&&e.racerId==='player'),'No actual player Heat Lance shot.');
 require(events.some((e:any)=>e.type==='pulse-shell'&&e.racerId==='player'&&e.active),'No actual player shield activation.');
 require(!observation.truncated,'Bounded observer was truncated.');
 const start=cue?cue.wallMs-cue.cueAge*1250:null;
 const before=start===null?null:pace(samples,start-1100,start-120),slow=start===null?null:pace(samples,start+130,start+590),after=start===null?null:pace(samples,start+1080,start+1750);
 require(before&&before.ratio>.85&&before.ratio<1.12,'Pre-takedown scheduling did not show measurable real time.');
 require(slow&&slow.maximumSampleGapMs<120&&slow.ratio>=.1&&slow.ratio<=.32,'Outgoing cinematic did not show bounded slow scheduling.');
 require(after&&after.ratio>.85&&after.ratio<1.12,'Post-takedown scheduling did not return to real time.');
 // Garage framing is not the driver's race camera. Establish the last stable
 // contiguous racing view immediately BEFORE the actual cue, never from it.
 const prior=start===null?[]:samples.filter((s:any)=>s.wallMs>=start-1100&&s.wallMs<start);
 const tail:any[]=[];const last=prior.at(-1);
 for(let i=prior.length-1;i>=0;i--){const s=prior[i];if(s.phase!=='racing'||s.paused||s.matte||s.playerWreck==='wrecked'||s.camera!==last.camera)break;tail.unshift(s);}
 const cameraBaseline=tail.length?{camera:tail[0].camera,samples:tail.length,firstWallMs:tail[0].wallMs,lastWallMs:tail.at(-1).wallMs,
  spanMs:tail.at(-1).wallMs-tail[0].wallMs,ageAtCueMs:start!-tail.at(-1).wallMs,
  maximumSampleGapMs:Math.max(0,...tail.slice(1).map((s:any,i:number)=>s.wallMs-tail[i].wallMs))}:null;
 require(cameraBaseline&&typeof cameraBaseline.camera==='string'&&cameraBaseline.samples>=4&&cameraBaseline.spanMs>=150&&cameraBaseline.ageAtCueMs<120&&cameraBaseline.maximumSampleGapMs<120,'No stable immediately pre-event racing camera baseline.');
 const active=start===null?[]:samples.filter((s:any)=>s.wallMs>=start&&s.wallMs<start+810);
 require(active.length>=10&&cameraBaseline&&active.every((s:any)=>s.camera===cameraBaseline.camera&&!s.matte&&!s.paused&&s.playerWreck!=='wrecked'),'Attacking driver did not retain the pre-event racing camera without victim framing.');
 return{outcome:issues.length?'FAIL':'PASS',issues,selected,wreck,takedown,actualVictim,cue,estimatedCueStartMs:start,before,slow,after,cameraBaseline,
  inputDecisions:inputs.length,fireDecisions:inputs.filter((s:any)=>s.fire).length,mineDecisions:inputs.filter((s:any)=>s.mine).length,shieldDecisions:inputs.filter((s:any)=>s.shield).length,
  actualPlayerMineDeployments:events.filter((e:any)=>e.type==='scrap-mine-deployed'&&e.racerId==='player'),
  actualPlayerWeaponHits:events.filter((e:any)=>e.type==='weapon-hit'&&e.attackerId==='player')};
}

try{
 const probe=createServer();await new Promise<void>((done,fail)=>{probe.once('error',fail);probe.listen(port,'127.0.0.1',done);});await new Promise<void>((done,fail)=>probe.close(e=>e?fail(e):done()));
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:projectRoot,stdio:'ignore'});
 let spawnError:Error|undefined;server.once('error',error=>{spawnError=error;});const url=`http://127.0.0.1:${port}`;let ready=false;
 for(let i=0;i<160;i++){if(spawnError)throw spawnError;if(server.exitCode!==null)throw Error('Owned preview exited');try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(100);}assert(ready,'Owned preview did not start.');
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'no-preference',recordVideo:{dir:`${output}/video`,size:{width:1440,height:900}}});
 await context.addInitScript(()=>{Object.defineProperty(window,'__name',{value:Function('fn','return fn'),configurable:true});const pad={id:'Codex outgoing takedown native QA virtual standard gamepad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({value:0,pressed:false,touched:false})),timestamp:0};(window as any).__outgoingPad=pad;Object.defineProperty(navigator,'getGamepads',{value:()=>[pad,null,null,null],configurable:true});});
 page=await context.newPage();page.on('pageerror',e=>receipt.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')receipt.errors.push(m.text());});
 await page.goto(url);await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:45000});receipt.environment=await frozenBuildReceipt(page,browser);
 receipt.renderer=await page.evaluate(()=>{const gl=document.querySelector<HTMLCanvasElement>('#viewport')?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;});assert(receipt.renderer&&!/swiftshader|llvmpipe|software rasterizer/i.test(receipt.renderer),'Native GPU unavailable.');
 await page.locator('[data-action="select-event"][data-event-id="open-expedition"]:visible').click();await page.waitForFunction(()=>window.__PODRACING__!.snapshot().game.mastery?.eventId==='open-expedition');
 receipt.selection=await snapshot();const pending=receipt.selection.game.pendingCourse;
 assert(receipt.selection.game.awaitingStart&&pending?.eventId==='open-expedition'&&Number.isInteger(pending.seed),'Open Expedition must reserve a pending route before Start.');
 await page.locator('[data-action="start-race"]:visible').click();
 await page.waitForFunction(()=>!window.__PODRACING__!.snapshot().game.awaitingStart&&document.querySelector<HTMLElement>('.pod-hud')?.dataset.phase==='countdown');
 receipt.before=await snapshot();assert(receipt.before.game.competitionProfile==='chaos'&&receipt.before.game.onlineRoom.role==='solo','Ordinary solo Open Expedition chaos profile required.');
 assert(receipt.before.game.combatPresentation&&('cooldownUntilWallMs'in receipt.before.game.combatPresentation),'Frozen bundle lacks the read-only controller cooldown diagnostic.');
 assert(receipt.before.game.pendingCourse===null&&receipt.before.game.course.seed===pending.seed&&receipt.before.raceTime===0,'Native Start did not promote the prepared route into countdown.');
 await installDriver();receipt.commands.push('Select actual Open Expedition and Start once; install the offline driver from the newly built countdown course. Course-following virtual pad holds Heat Lance(button5/E), deploys mines(button3/F) for rivals within45m behind, and pulses shield(button2/Q) for120ms on normal cooldown. No boost, pickup waits or review API actions.');
 const started=Date.now();let foundAt:number|null=null;
 while(Date.now()-started<180000){
  await delay(60);const status=await page.evaluate(()=>{const qa=(window as any).__outgoingQA;return{wrecks:qa.observation.events.filter((e:any)=>e.type==='wreck'&&e.racerId!=='player'&&e.takedownBy==='player'),samples:qa.observation.samples.slice(-80),phase:document.querySelector<HTMLElement>('.pod-hud')?.dataset.phase};});
  receipt.firstOutgoingWreck??=status.wrecks[0];
  const selected=retainOutgoingCandidates(receipt.outgoingCandidates,status.wrecks,status.samples);
  if(selected&&foundAt===null){foundAt=Date.now();receipt.selectedOutgoingWreck={racerId:selected.racerId,frame:selected.frame};receipt.captures.push({path:`${output}/outgoing-takedown.png`,snapshot:await snapshot()});await page.screenshot({path:`${output}/outgoing-takedown.png`});console.log('ELIGIBLE_OUTGOING_WRECK',JSON.stringify(selected));}
  if(foundAt!==null&&Date.now()-foundAt>=2200)break;
  if(status.phase==='finished'){receipt.stopReason='Race finished';break;}
 }
 receipt.stopReason??=foundAt===null?'180-second limit without an eligible running outgoing wreck':'First eligible running outgoing wreck plus return observation';
 await page.evaluate(()=>(window as any).__outgoingQA.stop());receipt.after=await snapshot();receipt.observation=await page.evaluate(()=>(window as any).__outgoingQA.observation);
 retainOutgoingCandidates(receipt.outgoingCandidates,receipt.observation.events,receipt.observation.samples);
 receipt.analysis=analyze(receipt.observation,receipt.selectedOutgoingWreck??null);
 if(!receipt.captures.length)await page.screenshot({path:`${output}/no-takedown.png`});else await page.screenshot({path:`${output}/after-takedown.png`});
 assert(receipt.analysis.outcome==='PASS',receipt.analysis.issues.join(' '));assert(receipt.errors.length===0,'Browser console/page errors.');receipt.outcome='PASS';
}catch(error){receipt.error=String(error);if(page){try{await page.evaluate(()=>(window as any).__outgoingQA?.stop());receipt.failure=await snapshot();receipt.observation=await page.evaluate(()=>(window as any).__outgoingQA?.observation??null);if(receipt.observation)retainOutgoingCandidates(receipt.outgoingCandidates,receipt.observation.events,receipt.observation.samples);await page.screenshot({path:`${output}/failure.png`});}catch{}}}
finally{await closeOwned();}
console.log(JSON.stringify({outcome:receipt.outcome,error:receipt.error,analysis:receipt.analysis,cleanup:receipt.cleanup}));if(receipt.outcome!=='PASS')process.exitCode=1;
