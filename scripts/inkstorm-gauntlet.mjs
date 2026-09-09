import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { mkdir,writeFile } from 'node:fs/promises';
import { frozenBuildReceipt } from './lib/frozen-build-receipt.mjs';
const port=5186,url=`http://127.0.0.1:${port}`;
const out=process.env.INKSTORM_OUTPUT??'output/gauntlet/round-2';
const appearance=process.env.INKSTORM_APPEARANCE;
if(appearance && !['teemto','sebulba','polwo','blockrunner','procedural'].includes(appearance))throw new Error('Unknown capture appearance');
await mkdir(out,{recursive:true});
// Refuse an occupied port; launch Vite directly so cleanup owns the actual server.
const probe=createServer();
await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(port,'127.0.0.1',resolve);});
await new Promise((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
async function waitForVehicleArt(page,garage=false){
 await page.waitForFunction(()=>{
  const hero=window.__PODRACING__?.snapshot().game.vehiclePresentation?.racers[0];
  if(!hero)return false;
  return hero.requested==='procedural'?hero.status==='procedural':hero.status==='ready'&&hero.active===hero.requested;
 },undefined,{timeout:30000});
 if(garage)await page.waitForFunction(()=>{
  const hero=window.__PODRACING__?.snapshot().game.vehiclePresentation?.racers[0];
  const host=document.querySelector('[data-hud="garage-model"]');
  return host?.dataset.previewReady==='true'&&host.dataset.previewAppearance===hero?.active;
 },undefined,{timeout:30000});
}
try{
 let serving=false;
 for(let i=0;i<150;i++){if(server.exitCode!==null)throw new Error('Owned preview exited before capture');try{if((await fetch(url)).ok){serving=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 if(!serving)throw new Error('Owned preview did not become ready');
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1.5});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url);await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:30000});
 if(appearance)await page.locator(`[data-action="select-appearance"][data-appearance="${appearance}"]`).click();
 await waitForVehicleArt(page,true);
 const environment=await frozenBuildReceipt(page,browser);
 await page.screenshot({path:`${out}/garage.png`});
 await page.evaluate(()=>{window.__PODRACING__.setCaptureMode(true);window.__PODRACING__.setCamera('chase');});
 const sections=await page.evaluate(()=>window.__PODRACING__.snapshot().game.course.sections);
 const receipts=[];
 for(const section of sections){
  await page.evaluate(p=>window.__PODRACING__.seekCourse(p),section.progress);
  await page.screenshot({path:`${out}/${section.id}.png`});
  receipts.push({section,...await page.evaluate(()=>window.__PODRACING__.snapshot())});
 }
 const extraViews=process.env.INKSTORM_EXTRA_VIEWS?JSON.parse(process.env.INKSTORM_EXTRA_VIEWS):[];
 const supplemental=[];
 for(const view of extraViews){
  if(typeof view.id!=='string'||!/^[a-z0-9-]+$/.test(view.id)||!Number.isFinite(view.progress)||view.progress<0||view.progress>=1)throw new Error('Invalid supplemental view');
  await page.evaluate(p=>window.__PODRACING__.seekCourse(p),view.progress);
  await page.screenshot({path:`${out}/${view.id}.png`});
  supplemental.push({view,...await page.evaluate(()=>window.__PODRACING__.snapshot())});
 }
 // Capture mode frames are visual receipts, never frame-rate evidence.
 await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready);
 await waitForVehicleArt(page,true);
 await page.locator('[data-action="start-race"]').click();
 await page.keyboard.down('w');
 const intervals=await page.evaluate(()=>new Promise(resolve=>{const values=[];let last=0,start=0;function frame(t){if(!start)start=t;if(last&&t-start>2000)values.push(t-last);last=t;if(t-start<10000)requestAnimationFrame(frame);else resolve(values);}requestAnimationFrame(frame);}));
 await page.keyboard.up('w');await page.screenshot({path:`${out}/live-drive.png`});
 const sorted=intervals.toSorted((a,b)=>a-b),q=p=>sorted[Math.floor((sorted.length-1)*p)];
 const performance={device:'Chrome headless; renderer from snapshot; local workstation',viewport:{width:1440,height:900,dpr:1.5},samples:intervals.length,p50Ms:q(.5),p95Ms:q(.95),p99Ms:q(.99),averageFps:1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length),snapshot:await page.evaluate(()=>window.__PODRACING__.snapshot())};
 await writeFile(`${out}/receipts.json`,JSON.stringify({environment,receipts,supplemental,performance,errors},null,2));
 console.log(JSON.stringify({out,sections:sections.length,performance:{...performance,snapshot:undefined},errors},null,2));
 if(errors.length)process.exitCode=1;
}finally{
 try{await browser?.close();}
 finally{if(server.exitCode===null&&server.signalCode===null){const exited=once(server,'exit');server.kill('SIGTERM');await exited;}}
}
