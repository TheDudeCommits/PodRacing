/** Finite native simulation drive plus a quiet real-time renderer sample for each destination. */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DRIVER_SOURCE } from './trailer/driver.mjs';
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;const errors=[],results=[];
const bundle=(await readdir('dist/assets')).find(f=>/^index-.*\.js$/.test(f));
const bundleBytes=await readFile(`dist/assets/${bundle}`);
const build={bundle,bytes:bundleBytes.length,sha256:createHash('sha256').update(bundleBytes).digest('hex')};
try{
 await new Promise(r=>setTimeout(r,1000));
 browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 for(const biome of ['frozen','volcanic','jungle','desert']){
  await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:180000});
  await page.locator(`[data-destination="${biome}"]`).click();await page.getByRole('button',{name:'Race',exact:true}).first().click();await page.locator('[data-action="start-race"]').click();
  await page.evaluate(()=>window.__PODRACING__.setCaptureMode(true));
  await page.waitForFunction(()=>window.__PODRACING__.snapshot().game.vehiclePresentation.library.pending===0);
  await page.evaluate(DRIVER_SOURCE);
  await page.evaluate(()=>{window.__PODRACING__.setInput({throttle:0});window.__PODRACING__.step(360);window.__PODRACING__.setCamera('chase');});
  const telemetry=await page.evaluate(()=>{
   const a=window.__PODRACING__,out=[];
   for(let frame=0;frame<600;frame++){
    const t=window.__TRAILER_DRIVE__({throttle:.65,weave:0,overtake:false,fire:false});a.step(1);a.step(1);
    if(frame%60===0)out.push(t);
   }
   return {samples:out,snapshot:a.snapshot()};
  });
  await page.screenshot({path:`output/round46/drive-${biome}.png`});
  const realTime=await page.evaluate(async()=>{
   const a=window.__PODRACING__;a.setCaptureMode(false);a.setPerformanceQuality(0);
   const times=[];let last=performance.now();const start=last;
   await new Promise(resolve=>{function frame(now){if(now-start>1000)times.push(now-last);last=now;if(now-start>7000)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);});
   times.sort((a,b)=>a-b);
   return {frames:times.length,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p50Ms:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],renderer:a.snapshot().renderer};
  });
  results.push({biome,telemetry,realTime});console.log(JSON.stringify({biome,meanMs:realTime.meanMs,p95Ms:realTime.p95Ms,maxLateral:Math.max(...telemetry.samples.map(s=>Math.abs(s.lat))),wrecks:telemetry.samples.filter(s=>s.wreck!=='running').length}));
 }
}finally{await writeFile('output/round46/drive-qa.json',JSON.stringify({build,errors,results},null,2));await browser?.close();server.kill();}
if(errors.length)throw new Error(JSON.stringify(errors));
