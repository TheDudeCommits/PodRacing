import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';

const out = process.env.INKSTORM_OUTPUT ?? 'output/playwright/round35-network-combat';
const port = Number(process.env.INKSTORM_OWNED_PORT ?? 5198);
if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 5211) throw Error('Use a dedicated owned port.');
const assert = (value, message) => { if (!value) throw Error(message); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const receipt = { outcome: 'FAIL', port, phases: [], errors: [], scope: 'Two real browser contexts using real room signaling and ordinary S+Shift input. No state/event/heat injection or mocked network. Wall-clock/snapshot observations are not performance or two-physical-device evidence.', harnessSha256: createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex') };
await mkdir(out, { recursive: true });
const probe = createServer();
await new Promise((resolve,reject) => { probe.once('error',reject); probe.listen(port,'127.0.0.1',resolve); });
await new Promise((resolve,reject) => probe.close(error => error ? reject(error) : resolve()));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'], { stdio:'ignore' });
let browser, pages = [], closing, timeout;
const closeOwned = () => closing ??= (async () => {
  clearTimeout(timeout); const cleanup = { browserClosed:false, serverExited:false, errors:[] };
  try { await browser?.close(); cleanup.browserClosed=true; } catch(error) { cleanup.errors.push(String(error)); }
  try {
    if (server.pid && server.exitCode===null && server.signalCode===null) {
      const exited = new Promise(resolve => server.once('exit',resolve)); server.kill('SIGTERM');
      await Promise.race([exited,delay(3000).then(() => { throw Error('Owned server exit timed out'); })]);
    }
    cleanup.serverExited=server.exitCode!==null || server.signalCode!==null;
  } catch(error) {
    cleanup.errors.push(String(error));
    if (server.pid && server.exitCode===null && server.signalCode===null) { const exited=new Promise(resolve=>server.once('exit',resolve));server.kill('SIGKILL');await exited; }
    cleanup.serverExited=server.exitCode!==null || server.signalCode!==null;
  }
  receipt.cleanup=cleanup;
  if (!cleanup.browserClosed || !cleanup.serverExited || cleanup.errors.length) receipt.outcome='FAIL';
  await writeFile(`${out}/receipt.json`,JSON.stringify(receipt,null,2));
})();
for (const [signal,code] of [['SIGINT',130],['SIGTERM',143]]) process.once(signal,()=>{receipt.error=signal;void closeOwned().finally(()=>process.exit(code));});
const snap = page => page.evaluate(() => window.__PODRACING__.snapshot());
async function observe(page) {
  await page.evaluate(() => {
    const observation={samples:[],events:[],seen:new Set(),last:-Infinity,stopped:false,truncated:false};
    window.__INKSTORM_NETWORK_QA__=observation;
    const frame=wallMs=>{
      if(observation.stopped)return;
      if(wallMs-observation.last>=25){
        observation.last=wallMs; const state=window.__PODRACING__.snapshot(),root=document.querySelector('.pod-hud'),cue=root.querySelector('[data-hud="combat-feedback"]');
        if(observation.samples.length>=5000)observation.truncated=true;
        else observation.samples.push({wallMs,frame:state.simulationFrame,raceTime:state.raceTime,camera:state.camera,matte:root.classList.contains('has-cinematic-matte'),localWreck:state.game.wreckPhase,room:state.game.onlineRoom.role,
          racers:state.galactic.racers.map(r=>({id:r.id,position:r.position,wreck:{...r.galactic.wreck}})),
          cue:root.classList.contains('has-combat-feedback')&&!cue.hidden?{kind:cue.dataset.kind,title:cue.querySelector('[data-hud="combat-feedback-title"]').textContent}:null});
        for(const event of state.galactic.recentEvents??[]){const key=JSON.stringify(event);if(!observation.seen.has(key)){observation.seen.add(key);observation.events.push({...event,observedWallMs:wallMs});}}
      }
      requestAnimationFrame(frame);
    };requestAnimationFrame(frame);
  });
}
function rate(samples) {
  assert(samples.length>=12,'Insufficient continuous clock samples');
  const a=samples[0],b=samples.at(-1),wall=(b.wallMs-a.wallMs)/1000;
  const maximumGapMs=Math.max(...samples.slice(1).map((s,i)=>s.wallMs-samples[i].wallMs));
  assert(wall>=.35 && maximumGapMs<160,'Clock window is too short or discontinuous');
  return {samples:samples.length,wallSeconds:wall,frameRatio:(b.frame-a.frame)/120/wall,raceRatio:(b.raceTime-a.raceTime)/wall,maximumGapMs};
}
function analyze(observation,racerId,eventFrame,localVictim) {
  assert(!observation.truncated,'Network observation truncated');
  const first=observation.samples.find(s=>s.frame>=eventFrame&&s.racers.some(r=>r.id===racerId&&r.wreck.phase==='wrecked'));
  assert(first,'Authoritative victim wreck not replicated');
  const select=(a,b)=>observation.samples.filter(s=>s.wallMs>=first.wallMs+a&&s.wallMs<=first.wallMs+b);
  const windows={before:rate(select(-1100,-120)),impact:rate(select(50,800)),after:rate(select(900,1800))};
  for(const [name,w]of Object.entries(windows))assert(w.frameRatio>.85&&w.frameRatio<1.15&&w.raceRatio>.85&&w.raceRatio<1.15,`${name}: network clock was slowed or diverged`);
  const impact=select(0,1800);
  assert(impact.every(s=>!s.matte&&s.camera==='chase'),'Solo camera/matte entered network race');
  assert(localVictim?impact.some(s=>s.cue?.kind==='wreck'):impact.every(s=>s.cue?.kind!=='wreck'),'Wreck feedback delivered to wrong local player or missing');
  return {firstObservedFrame:first.frame,eventFrame,windows,localVictim,cueSamples:impact.filter(s=>s.cue?.kind==='wreck').length,noMatte:true,camera:'chase'};
}
try {
  timeout=setTimeout(()=>{receipt.error='120-second network harness deadline';void closeOwned().finally(()=>process.exit(1));},120000);
  for(let i=0;i<100;i++){if(await fetch(`http://127.0.0.1:${port}`).then(r=>r.ok).catch(()=>false))break;await delay(100);}
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  for(const label of ['host','guest']){
    const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,reducedMotion:'no-preference'}),page=await context.newPage();pages.push(page);
    page.on('pageerror',e=>receipt.errors.push(`${label}: ${e}`));page.on('console',m=>{if(m.type()==='error')receipt.errors.push(`${label}: ${m.text()}`);});
    await page.goto(`http://127.0.0.1:${port}`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__PODRACING__?.ready&&document.querySelector('[data-hud="vehicle-selection"]')?.classList.contains('is-visible'));
    await page.locator('.pod-hud__room>summary').click();
  }
  const[host,guest]=pages;
  receipt.environments=await Promise.all(pages.map(page=>frozenBuildReceipt(page,browser)));
  receipt.gpu=await Promise.all(pages.map(page=>page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';})));
  assert(receipt.gpu.every(value=>/Apple M4/.test(value)&&!/SwiftShader/.test(value)),'Native M4 GPU required for this run');
  await host.locator('[data-action="create-room"]:visible').click();
  await host.waitForFunction(()=>window.__PODRACING__.snapshot().game.onlineRoom?.status==='ready',null,{timeout:20000});
  const room=(await snap(host)).game.onlineRoom;assert(/^[A-Z0-9]{6}$/.test(room.code),'Room code invalid');
  await guest.locator('[data-hud="room-code-input"]').fill(room.code);
  await guest.locator('[data-action="join-room"]:visible').click();
  await Promise.all(pages.map(page=>page.waitForFunction(()=>window.__PODRACING__.snapshot().game.onlineRoom?.members?.length===2,null,{timeout:20000})));
  const guestId=(await snap(guest)).game.onlineRoom.localRacerId;assert(guestId&&guestId!=='player','Guest identity missing');
  receipt.guestId=guestId;receipt.roomCodeLength=room.code.length;
  await Promise.all(pages.map(observe));
  await host.keyboard.press('Space');
  await Promise.all(pages.map(page=>page.waitForFunction(()=>!window.__PODRACING__.snapshot().game.awaitingStart&&window.__PODRACING__.snapshot().raceTime>1,null,{timeout:15000})));
  await Promise.all(pages.map(page=>page.mouse.click(640,400)));
  await Promise.all(pages.map(page=>page.keyboard.down('s')));
  for(const [name,driver,racerId]of [['host-wreck',host,'player'],['guest-wreck',guest,guestId]]){
    await driver.waitForFunction(()=>window.__PODRACING__.snapshot().game.wreckPhase==='running',null,{timeout:10000});
    const previousFrame=(await snap(host)).simulationFrame;await delay(1400);await driver.keyboard.down('Shift');
    await host.waitForFunction(({racerId,previousFrame})=>window.__PODRACING__.snapshot().galactic.recentEvents.some(e=>e.type==='wreck'&&e.racerId===racerId&&e.cause==='redline-explosion'&&e.frame>previousFrame),{racerId,previousFrame},{timeout:12000});
    await driver.keyboard.up('Shift');
    const event=(await snap(host)).galactic.recentEvents.find(e=>e.type==='wreck'&&e.racerId===racerId&&e.frame>previousFrame);assert(event,'Actual redline wreck event missing');
    await delay(1950);
    const observations=await Promise.all(pages.map(page=>page.evaluate(()=>({samples:window.__INKSTORM_NETWORK_QA__.samples,events:window.__INKSTORM_NETWORK_QA__.events,truncated:window.__INKSTORM_NETWORK_QA__.truncated}))));
    for(let i=0;i<pages.length;i++)await writeFile(`${out}/${name}-${i===0?'host':'guest'}-observations.json`,JSON.stringify(observations[i]));
    const analysis=observations.map((o,i)=>analyze(o,racerId,event.frame,pages[i]===driver));
    await Promise.all(pages.map((page,i)=>page.screenshot({path:`${out}/${name}-${i===0?'host':'guest'}.png`})));
    receipt.phases.push({name,racerId,event,analysis,outcome:'PASS'});console.log(JSON.stringify({phase:name,outcome:'PASS'}));
  }
  const end=await Promise.all(pages.map(snap));receipt.finalStepGap=Math.abs(end[0].simulationFrame-end[1].simulationFrame);
  assert(receipt.finalStepGap<=30,'Final network step divergence');assert(receipt.errors.length===0,'Browser errors');receipt.outcome='PASS';
}catch(error){receipt.error=String(error);for(let i=0;i<pages.length;i++)await pages[i].screenshot({path:`${out}/failure-${i}.png`}).catch(()=>{});}
finally {await closeOwned();}
console.log(JSON.stringify(receipt));process.exitCode=receipt.outcome==='PASS'?0:1;
