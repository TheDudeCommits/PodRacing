import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
const dir='output/round48'; await mkdir(dir,{recursive:true});
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser; const errors=[],results=[];
try {
 await new Promise(r=>setTimeout(r,1000));
 browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 for(const biome of ['desert','frozen','volcanic','jungle']) {
  await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:180000});
  await page.waitForFunction(()=>window.__PODRACING__.snapshot().game.vehiclePresentation.library.pending===0,undefined,{timeout:120000});
  await page.locator(`[data-destination="${biome}"]`).click();await page.locator('[data-action="start-race"]').click();
  await page.waitForFunction(()=>!window.__PODRACING__.snapshot().game.awaitingStart,undefined,{timeout:120000});
  await page.evaluate(()=>{const a=window.__PODRACING__;a.setCaptureMode(true);a.seekCourse(.34);a.setCamera('chase');a.step(2);});
  await page.screenshot({path:`${dir}/course-${biome}.png`});
  const snap=await page.evaluate(()=>window.__PODRACING__.snapshot());results.push({biome,snapshot:snap});console.log('map',biome,'errors',errors.length);
  if(errors.length)throw new Error(JSON.stringify(errors.slice(0,3)));
 }
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.__PODRACING__?.ready);
 await page.evaluate(()=>{localStorage.setItem('now-this-is-podracing.vehicle-appearance',JSON.stringify({version:1,appearance:'sebulba'}));});
 await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready);
 await page.waitForFunction(()=>window.__PODRACING__.snapshot().game.vehiclePresentation.library.pending===0);
 await page.locator('[data-action="start-race"]').click();await page.waitForFunction(()=>!window.__PODRACING__.snapshot().game.awaitingStart);
 await page.evaluate(()=>{const a=window.__PODRACING__;a.setCaptureMode(true);a.stageTrailerRace(.08,[],true);a.setInput({throttle:.4,ability:true});for(let i=0;i<33;i++)a.step(2);});
 await page.screenshot({path:`${dir}/flame.png`});results.push({flame:await page.evaluate(()=>window.__PODRACING__.snapshot())});
 await page.evaluate(()=>{const a=window.__PODRACING__;a.setPreset('drift');a.setInput({throttle:1,drift:true,steer:.22});for(let i=0;i<200;i++)a.step(2);});
 await page.screenshot({path:`${dir}/drift.png`});results.push({drift:await page.evaluate(()=>window.__PODRACING__.snapshot())});
 await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready);
 await page.screenshot({path:`${dir}/mobile-setup.png`});
 results.push({overflow:await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}))});
} finally { await writeFile(`${dir}/visual-qa.json`,JSON.stringify({errors,results},null,2));await browser?.close();server.kill(); }
if(errors.length)throw new Error(JSON.stringify(errors));
