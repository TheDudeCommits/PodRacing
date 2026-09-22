/** Native 120 Hz gameplay captured at 60 fps; direct encoding avoids large frame folders. */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir,writeFile,access } from 'node:fs/promises';
import { once } from 'node:events';
import { DRIVER_SOURCE } from '../driver.mjs';
import { SHOTS,PACK } from './shots.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const shots=SHOTS.filter(s=>!args.only||args.only.split(',').includes(s.id));
const root='output/trailer-v5';await mkdir(`${root}/takes`,{recursive:true});await mkdir(`${root}/stills`,{recursive:true});
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser,encoder;let loadedPod='teemto';const errors=[];
try{
 await new Promise(r=>setTimeout(r,1500));
 browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:180000});
 await page.evaluate(()=>window.__PODRACING__.setCaptureMode(true));
 for(const shot of shots){
  if(args.resume){try{await access(`${root}/takes/${shot.id}.json`);console.log('skip',shot.id);continue;}catch{}}
  const wantedPod=shot.localPod??'teemto';
  if(wantedPod!==loadedPod){
   await page.evaluate(p=>localStorage.setItem('now-this-is-podracing.vehicle-appearance',JSON.stringify({version:1,appearance:p})),wantedPod);
   await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:180000});
   await page.evaluate(()=>window.__PODRACING__.setCaptureMode(true));loadedPod=wantedPod;
  }
  await page.evaluate(DRIVER_SOURCE);
  await page.evaluate(({s,formation})=>{
   const a=window.__PODRACING__;a.setTrailerCamera(null);a.stageTrailerRace(s.progress,formation,!!s.stationary);a.setCamera('chase');
   a.setTrailerCamera(s.camera);document.querySelector('.pod-hud').style.opacity=s.hud?'1':'0';
  },{s:shot,formation:shot.formation??PACK});
  await page.waitForFunction(()=>window.__PODRACING__.snapshot().game.vehiclePresentation.library.pending===0);
  // Let presentation assets finish mounting; simulation is paused in capture mode.
  await page.waitForTimeout(100);
  const ticks=Math.round((shot.warm??.4)*60);
  for(let f=0;f<ticks;f++)await page.evaluate(d=>{window.__TRAILER_DRIVE__(d);window.__PODRACING__.step(1);window.__PODRACING__.step(1);},{...shot.drive,...(shot.mineAt!==undefined?{mine:false}:{}),...(shot.shieldAt!==undefined?{forceShield:false}:{} )});
  const frames=Math.round(shot.seconds*60),telemetry=[],started=Date.now();
  encoder=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate','60','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','15','-pix_fmt','yuv420p','-movflags','+faststart',`${root}/takes/${shot.id}.mp4`],{stdio:['pipe','ignore','pipe']});
  let encError='';encoder.stderr.on('data',b=>encError+=b);const done=once(encoder,'exit');
  for(let f=0;f<frames;f++){
   const t=await page.evaluate(({s,f,frames})=>{
    const a=window.__PODRACING__;const c={...s.camera};
    if(s.endEye)c.eye=s.camera.eye.map((v,i)=>v+(s.endEye[i]-v)*f/(frames-1));
    if(s.endEye)a.setTrailerCamera(c);
    const d={...s.drive};
    if(s.mineAt!==undefined)d.mine=f===Math.round(s.mineAt*60);
    if(s.shieldAt!==undefined)d.forceShield=f>=Math.round(s.shieldAt*60);
    if(s.id==='01-grid')d.throttle=0;
    if(s.tow){const snap=a.snapshot(),me=snap.galactic.racers[0].galactic;
      d.mine=Boolean(me.ordnance?.charges>0)&&f%6===0;
      if(me.tow?.targetId)d.mine=me.tow.remaining<1.5&&f%15===0;
    }
    const r=window.__TRAILER_DRIVE__(d);
    if(s.wreckAt&&f===Math.round(s.wreckAt*60))a.debugWreckRacer('ai-vexa');
    if(s.id!=='01-grid'){a.step(1);a.step(1);}
    const snap=a.snapshot(),me=snap.galactic.racers[0];
    return {...r,f,time:f/60,position:me.position,progress:me.courseProgress,
      tow:me.galactic.tow,ordnance:me.galactic.ordnance,shield:me.galactic.shield.active,
      events:snap.galactic.recentEvents.slice(-8),quality:snap.renderer.performance.qualityLevel};
   },{s:shot,f,frames});
   telemetry.push(t);
   const buffer=await page.screenshot({type:'jpeg',quality:94});
   if(!encoder.stdin.write(buffer))await once(encoder.stdin,'drain');
   if(f===0||f===Math.floor(frames/2)||f===frames-1)await writeFile(`${root}/stills/${shot.id}-${f}.jpg`,buffer);
  }
  encoder.stdin.end();const [code]=await done;if(code!==0)throw new Error(encError);encoder=null;
  const receipt={shot,frames,renderSeconds:(Date.now()-started)/1000,errors:[...errors],telemetry};
  await writeFile(`${root}/takes/${shot.id}.json`,JSON.stringify(receipt));
  console.log(JSON.stringify({id:shot.id,frames,renderSeconds:receipt.renderSeconds,latMax:Math.max(...telemetry.map(t=>Math.abs(t.lat))),wreck:telemetry.filter(t=>t.wreck!=='running').length,fire:telemetry.filter(t=>t.firedNow).length,shield:telemetry.filter(t=>t.shield).length}));
 }
}finally{encoder?.kill();await browser?.close();server.kill();}
