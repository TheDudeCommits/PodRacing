import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
const dir='output/round46';await mkdir(dir,{recursive:true});
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;const errors=[],results=[];
try {
 await new Promise(r=>setTimeout(r,1200));
 browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:180000});
 await page.waitForTimeout(500);
 await page.screenshot({path:`${dir}/setup-desktop.png`});
 for(const pod of ['verdigris','skybolt','needle','pog']) {
  await page.evaluate(p=>localStorage.setItem('now-this-is-podracing.vehicle-appearance',JSON.stringify({version:1,appearance:p})),pod);
  await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:180000});
  await page.waitForFunction(()=>window.__PODRACING__.snapshot().game.vehiclePresentation.library.pending===0,undefined,{timeout:120000});
  await page.waitForTimeout(600);await page.screenshot({path:`${dir}/pod-${pod}.png`});
  results.push({pod,presentation:(await page.evaluate(()=>window.__PODRACING__.snapshot())).game.vehiclePresentation});console.log('pod',pod);
  if(results.at(-1).presentation.racers.some(r=>r.status==='error')) throw new Error('Vehicle asset failed: '+JSON.stringify(results.at(-1)));
  await page.evaluate(()=>{const a=window.__PODRACING__;a.setCaptureMode(true);a.stageTrailerRace(.08,[],true);a.setTrailerCamera({racerIndex:0,eye:[22,12,32],target:[0,2,3],fov:42});document.querySelector('.pod-hud').style.opacity='0';});
  await page.screenshot({path:`${dir}/pod-${pod}-track.png`});
 }
 for(const biome of ['frozen','volcanic','jungle','desert']) {
  await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:180000});
  // Select the map through the real menu, verify Race and Trial preserve destination.
  await page.locator(`[data-destination="${biome}"]`).click();
  for(const [label,kind] of [['Race','race'],['Time Trial','trial'],['Battle','battle']]) {
   await page.getByRole('button',{name:label,exact:true}).first().click();
   const expected=biome==='desert'?`inkstorm-${kind}`:`biome-${biome}-${kind}`;
   await page.waitForFunction(id=>window.__PODRACING__.snapshot().game.mastery?.eventId===id,expected);
  }
  await page.locator('[data-action="start-race"]').click();
  await page.evaluate(()=>window.__PODRACING__.setCaptureMode(true));
  await page.waitForFunction(()=>window.__PODRACING__.snapshot().game.vehiclePresentation.library.pending===0,undefined,{timeout:120000});
  await page.evaluate(()=>{const a=window.__PODRACING__;a.seekCourse(.34);a.setCamera('chase');a.step(2);});
  await page.screenshot({path:`${dir}/course-${biome}-chase.png`});
  await page.evaluate(()=>{const a=window.__PODRACING__;a.setTrailerCamera({racerIndex:0,eye:[70,48,-100],target:[0,4,25],fov:62});});
  await page.screenshot({path:`${dir}/course-${biome}-wide.png`});
  const snap=await page.evaluate(()=>window.__PODRACING__.snapshot());results.push({biome,course:snap.game.course,presentation:snap.game.vehiclePresentation});console.log('biome',biome,snap.game.course.seed);
 }
 await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:180000});
 await page.screenshot({path:`${dir}/setup-mobile.png`});
 results.push({mobile:await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,buttons:[...document.querySelectorAll('[data-destination]')].map(b=>({text:b.textContent,rect:b.getBoundingClientRect().toJSON()}))}))});
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:`${dir}/setup-mobile-landscape.png`});
 results.push({landscape:await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}))});
}finally{await writeFile(`${dir}/browser-qa.json`,JSON.stringify({errors,results},null,2));await browser?.close();server.kill();}
if(errors.length)throw new Error(JSON.stringify(errors));
