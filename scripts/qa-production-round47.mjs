import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base='https://podracing.dude.work';
const dir='output/round47';await mkdir(dir,{recursive:true});
const errors=[],results=[],bundles=[],pending=[];
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{
  if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);
  if(r.status()===200&&/\/assets\/index-[^/]+\.js$/.test(r.url()))pending.push(r.body().then(b=>bundles.push({url:r.url(),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')})).catch(e=>errors.push(String(e))));
 });
 await page.goto(base);await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:180000});
 await page.waitForFunction(()=>window.__PODRACING__.snapshot().game.vehiclePresentation.library.pending===0,undefined,{timeout:120000});
 await page.screenshot({path:`${dir}/live-setup-desktop.png`});
 const pods=['teemto','sebulba','polwo','blockrunner','verdigris','skybolt','needle','pog'];
 for(let i=0;i<pods.length;i++){
  if(i)await page.getByRole('button',{name:'Next pod',exact:true}).click();
  await page.waitForFunction(id=>{const p=window.__PODRACING__.snapshot().game.vehiclePresentation;return p.selected===id&&p.library.pending===0;},pods[i],{timeout:120000});
  const presentation=await page.evaluate(()=>window.__PODRACING__.snapshot().game.vehiclePresentation);
  if(presentation.racers.some(r=>r.status==='error'))throw new Error(`Pod adapter failed: ${pods[i]}`);
  results.push({pod:pods[i],presentation});
  if(i>=4)await page.screenshot({path:`${dir}/live-pod-${pods[i]}.png`});
 }
 for(const [biome,seed] of [['frozen',1179799379],['volcanic',1162691141],['jungle',1447383620]]){
  await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:180000});
  await page.locator(`[data-destination="${biome}"]`).click();
  await page.getByRole('button',{name:'Race',exact:true}).first().click();
  await page.locator('[data-action="start-race"]').click();
  await page.waitForFunction(expected=>{const s=window.__PODRACING__.snapshot();return s.game.course.seed===expected&&!s.game.awaitingStart&&s.game.vehiclePresentation.library.pending===0;},seed,{timeout:120000});
  await page.waitForTimeout(3500);await page.keyboard.down('w');await page.waitForTimeout(2000);await page.keyboard.up('w');
  const snapshot=await page.evaluate(()=>window.__PODRACING__.snapshot());
  if(!snapshot.game.position.every(Number.isFinite))throw new Error('Non-finite live position');
  results.push({biome,seed,position:snapshot.game.position,speed:snapshot.game.speed,renderer:snapshot.renderer,errors:snapshot.game.vehiclePresentation.racers.filter(r=>r.error)});
  await page.screenshot({path:`${dir}/live-${biome}-drive.png`});
  // Staged native view for scenery inspection, after the ordinary UI/input smoke test.
  await page.evaluate(()=>{const a=window.__PODRACING__;a.setCaptureMode(true);a.seekCourse(.34);a.setCamera('chase');a.step(2);});
  await page.screenshot({path:`${dir}/live-${biome}-scenery.png`});
 }
 await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:180000});
 await page.screenshot({path:`${dir}/live-setup-mobile.png`});
 const mobile=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,destinations:document.querySelectorAll('[data-destination]').length}));results.push({mobile});
 if(mobile.scroll!==mobile.width||mobile.destinations!==4)throw new Error('Mobile destination layout failed');
 await Promise.all(pending);
 if(!bundles.length||bundles.some(b=>b.sha256!=='721fd11bdb4abbe34de9ad509fe3368d8e59079cdac82994595c125c9cd68366'))throw new Error('Live bundle differs from tested expansion');
}finally{
 await Promise.allSettled(pending);
 await browser.close();
 await writeFile(`${dir}/live-qa.json`,JSON.stringify({base,checkedAt:new Date().toISOString(),bundles,errors,results},null,2));
}
if(errors.length)throw new Error(JSON.stringify(errors));
console.log(JSON.stringify({base,checks:results.length,bundle:bundles[0],errors}));
