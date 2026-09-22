import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir,writeFile } from 'node:fs/promises';
const dir='output/round50';await mkdir(dir,{recursive:true});
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
await writeFile(`${dir}/vite.qa.config.mjs`, 'export default {server:{hmr:false}};');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config',`${dir}/vite.qa.config.mjs`,'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;const errors=[],receipt={};
try {
 await new Promise(r=>setTimeout(r,1000));browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{
  localStorage.setItem('now-this-is-podracing.vehicle-appearance',JSON.stringify({version:1,appearance:'teemto'}));
  const settings=JSON.parse(localStorage.getItem('now-this-is-podracing.settings')??'{}');settings.version=1;settings.controls={gamepadDeadzone:0,gamepadSensitivity:1,steeringAssist:0};localStorage.setItem('now-this-is-podracing.settings',JSON.stringify(settings));
  Object.defineProperty(navigator,'getGamepads',{value:()=>window.__qaPad?[window.__qaPad]:[]});
 });
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:120000});
 await page.waitForFunction(()=>window.__PODRACING__.snapshot().game.vehiclePresentation.library.pending===0,undefined,{timeout:120000});
 // Native navigation: d-pad acquires focus, A chooses that focused control.
 receipt.controller=await page.evaluate(async()=>{
  const button=v=>({value:v,pressed:v>.5,touched:v>0});window.__qaPad={axes:[0,0,0,0],buttons:Array.from({length:16},()=>button(0)),connected:true,id:'QA Standard Controller',index:0,mapping:'standard',timestamp:0,vibrationActuator:null};
  window.__qaPad.buttons[13]=button(1);await new Promise(r=>setTimeout(r,80));window.__qaPad.buttons[13]=button(0);
  const focused=document.activeElement;let clicked=false;focused?.addEventListener('click',()=>clicked=true,{once:true});
  window.__qaPad.buttons[0]=button(1);await new Promise(r=>setTimeout(r,80));window.__qaPad.buttons[0]=button(0);
  const result={focused:focused?.textContent,clicked};window.__qaPad=null;return result;
 });
 if(!receipt.controller.clicked)throw new Error('Controller confirm did not reach native focused control');
 await page.locator('[data-destination="jungle"]').click();await page.getByRole('button',{name:'Race',exact:true}).first().click();
 await page.locator('.setup-more>summary').click();await page.locator('[data-laps="3"]').click();await page.keyboard.press('Escape');
 await page.evaluate(async()=>{
  const {createAIControllerState,stepAIController}=await import('/src/game/ai/index.ts');
  const {createProceduralPodraceCourse}=await import('/src/game/race/course.ts');
  const {sampleTerrainHeight}=await import('/src/render/terrain/terrainMath.ts');
  const {derivePodIdentityConfig}=await import('/src/game/podIdentity.ts');
  const {DEFAULT_PODRACER_CONFIG}=await import('/src/game/simulation/config.ts');
  const api=window.__PODRACING__,course=createProceduralPodraceCourse({heightAt:sampleTerrainHeight},0x56455244);
  const brain=createAIControllerState('clean',99,'medium'),config=derivePodIdentityConfig('teemto',DEFAULT_PODRACER_CONFIG);
  const button=v=>({value:v,pressed:v>.5,touched:v>0});window.__qaPad={axes:[0,0,0,0],buttons:Array.from({length:16},()=>button(0)),connected:true,id:'QA Standard Controller',index:0,mapping:'standard',timestamp:0,vibrationActuator:null};
  let previous=null,last=performance.now(),checkpoint=1,unwrapped=0,prevProgress=.999,frames=0;
  window.__qaPerf={cadence:[],courseBins:[],snapshots:[],done:false};
  const tick=now=>{
   if(window.__qaPerf.done)return;
   const snapshot=api.snapshot(),g=snapshot.game,r=snapshot.galactic.racers[0],time=snapshot.raceTime;
   if(g.awaitingStart){last=now;requestAnimationFrame(tick);return;}
   if(document.querySelector('.pod-hud')?.dataset.phase==='finished'){window.__qaPerf.done=true;window.__qaPerf.final=snapshot;window.__qaPad=null;return;}
   if(time>2){window.__qaPerf.cadence.push(now-last);window.__qaPerf.courseBins.push(Math.floor(r.courseProgress*20));}last=now;
   const dt=previous?Math.max(1/120,Math.min(.1,time-previous.time)):1/60;
   let delta=r.courseProgress-prevProgress;if(delta<-.5)delta+=1;if(delta>.5)delta-=1;unwrapped+=delta;prevProgress=r.courseProgress;
   const required=course.checkpoints[checkpoint];if(required && Math.abs(r.courseProgress-required.progress)<.005)checkpoint=(checkpoint+1)%course.checkpoints.length;
   const input=stepAIController(brain,{course,vehicleConfig:config,self:{id:'player',x:r.position[0],y:r.position[1],z:r.position[2],velocityX:previous?(r.position[0]-previous.x)/dt:0,velocityY:0,velocityZ:previous?(r.position[2]-previous.z)/dt:0,yaw:r.yaw,speed:g.speed,boostEnergy:.8,heat:g.redlineHeat,grounded:true,courseProgress:r.courseProgress,unwrappedProgress:unwrapped,completedLaps:0,finished:false},opponents:[],playerRaceScore:unwrapped,delta:dt,raceTime:time,allowCatchup:false}).input;
   previous={time,x:r.position[0],z:r.position[2]};window.__qaPad.axes[0]=-input.steer;window.__qaPad.buttons[7]=button(input.throttle);window.__qaPad.buttons[6]=button(input.brake);window.__qaPad.buttons[0]=button(+input.drift);window.__qaPad.buttons[1]=button(+input.boost);
   if(++frames%120===0)window.__qaPerf.snapshots.push({time,progress:r.courseProgress,lateral:r.lateralOffset,speed:g.speed,quality:snapshot.renderer.performance});
   requestAnimationFrame(tick);
  };requestAnimationFrame(tick);
 });
 await page.locator('[data-action="start-race"]').click();console.log('Native full-race controller drive started');
 const progress=setInterval(async()=>{try{console.log('Progress',await page.evaluate(()=>({time:window.__PODRACING__?.snapshot().raceTime,progress:window.__PODRACING__?.snapshot().galactic.racers[0].courseProgress,frames:window.__qaPerf?.cadence.length,phase:document.querySelector('.pod-hud')?.dataset.phase})));}catch{}},15000);
 try {await page.waitForFunction(()=>window.__qaPerf?.done,undefined,{timeout:330000});} catch(error) {
  receipt.failure=await page.evaluate(()=>({snapshot:window.__PODRACING__?.snapshot(),perf:window.__qaPerf}));await page.screenshot({path:`${dir}/native-race-failure.png`});throw error;
 } finally {clearInterval(progress);} 
 receipt.race=await page.evaluate(()=>{const p=window.__qaPerf,s=p.cadence.toSorted((a,b)=>a-b);return {frameCount:s.length,p50:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],p99:s[Math.floor(s.length*.99)],max:s.at(-1),over33ms:s.filter(n=>n>33.5).length,courseBins:[...new Set(p.courseBins)].sort((a,b)=>a-b),snapshots:p.snapshots,final:p.final};});
 await page.screenshot({path:`${dir}/native-race-results.png`});console.log('Native race',JSON.stringify({p95:receipt.race.p95,time:receipt.race.final.raceTime,bins:receipt.race.courseBins}));
 if(receipt.race.courseBins.length<19)throw new Error('Native race did not traverse the whole circuit');
} finally {await browser?.close();server.kill();await writeFile(`${dir}/native-race.json`,JSON.stringify({errors,...receipt},null,2));}
if(errors.length)throw new Error(JSON.stringify(errors));
