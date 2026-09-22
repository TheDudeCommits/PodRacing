import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { DRIVER_SOURCE } from '../driver.mjs';
const root='output/trailer-v5/probe'; await mkdir(root,{recursive:true});
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try {
 await new Promise(r=>setTimeout(r,1500));
 browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 page.on('pageerror',e=>console.error(e));
 await page.goto(`http://127.0.0.1:${port}`); await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:180000});
 await page.evaluate(DRIVER_SOURCE);
 await page.evaluate(()=>{const a=window.__PODRACING__;a.setCaptureMode(true);a.stageTrailerRace(.59,[{forward:0,lane:-4},{forward:26,lane:6},{forward:57,lane:-7},{forward:88,lane:8},{forward:-40,lane:4},{forward:-78,lane:-6},{forward:130,lane:0},{forward:-120,lane:0}]);document.querySelector('.pod-hud').style.opacity='0';});
 await new Promise(r=>setTimeout(r,4000));
 await page.evaluate(()=>{for(let f=0;f<80;f++){window.__TRAILER_DRIVE__({throttle:.88,boost:false,overtake:false,weave:0});window.__PODRACING__.step(1);window.__PODRACING__.step(1);}});
 await writeFile(`${root}/snapshot.json`,JSON.stringify(await page.evaluate(()=>window.__PODRACING__.snapshot()),null,2));
 const shots=[
 ['close-chase',0,[0,8,-26],[0,4,18],66],['low-chase',0,[-5,5,-25],[0,3,14],68],
 ['front-quarter',0,[-40,12,30],[0,4,2],58],['side',0,[43,9,-5],[0,3,4],58],
 ['rear-pursuit',0,[0,9,19],[0,4,-45],74],['pov',0,[0,6,-8],[0,4,95],92],
 ['polwo',1,[-40,13,30],[0,3,2],58],['sebulba',3,[-40,11,30],[0,3,2],58],
 ['blockrunner',4,[-40,13,30],[0,4,2],60],['high-wide',0,[-45,35,-50],[0,0,35],60],
 ['engines',0,[-11,4,11],[-8,3,5],44],['pilot',0,[-5,5,-10],[0,3,-9],48],
 ];
 for(const [id,racerIndex,eye,target,fov] of shots){
  await page.evaluate(s=>window.__PODRACING__.setTrailerCamera(s),{racerIndex,eye,target,fov});
  await page.screenshot({path:`${root}/${id}.jpg`,type:'jpeg',quality:90});
  console.log(id);
 }
}finally{await browser?.close();server.kill();}
