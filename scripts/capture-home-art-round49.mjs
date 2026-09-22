/** Menu art is captured from our own runtime and meshes; no reference assets. */
import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='public/assets/inkstorm/home';await mkdir(dir,{recursive:true});await mkdir('output/round49',{recursive:true});
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try {
 await new Promise(r=>setTimeout(r,800));
 browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await page.goto(`http://127.0.0.1:${port}`);
 await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:120000});
 // A compact, transparent render uses the same framing and materials as the garage.
 await page.addStyleTag({content:'.pod-hud .simple-setup .pod-hud__garage-model {width:400px!important;height:250px!important;inset:100px auto auto 100px!important;}'});
 for (const [i,id] of (process.env.MODES_ONLY ? [] : ['teemto','sebulba','polwo','blockrunner','verdigris','skybolt','needle','pog']).entries()) {
  if(i)await page.getByRole('button',{name:'Next pod',exact:true}).click();
  await page.waitForFunction(id=>{const h=document.querySelector('[data-hud="garage-model"]');const img=h?.querySelector('img');return h?.dataset.previewAppearance===id&&h.dataset.previewReady==='true'&&img?.naturalWidth===400;},id,{timeout:120000});
  const source=await page.locator('[data-hud="garage-model"] img').getAttribute('src');
  await writeFile(`${dir}/pod-${id}.webp`,Buffer.from(source.split(',')[1],'base64'));
  console.log('portrait',id);
 }
 await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready);
 for (const [i,[id,destination,progress]] of [['battle','desert',.055],['race','desert',.29],['trial','frozen',.34],['cup','jungle',.43]].entries()) {
  if(i){await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready);}
  await page.locator('.setup-destination>summary').click();await page.locator(`[data-destination="${destination}"]`).click();
  await page.locator(`.setup-racer[data-appearance="${id==='battle'?'sebulba':'teemto'}"]`).click();
  await page.locator('[data-action="start-race"]').click();
  await page.waitForFunction(()=>!window.__PODRACING__.snapshot().game.awaitingStart,undefined,{timeout:120000});
  await page.evaluate(({progress,id})=>{
   const a=window.__PODRACING__;a.setCaptureMode(true);a.stageTrailerRace(id==='battle'?.08:progress,[{forward:0,lane:0},{forward:16,lane:-5},{forward:30,lane:4}],false);
   a.setTrailerCamera({racerIndex:0,eye:id==='cup'?[24,25,-24]:id==='trial'?[14,7,-18]:id==='battle'?[32,17,-22]:[-34,15,34],target:id==='battle'||id==='race'?[0,3,10]:[0,2,2],fov:55});
   if(id==='battle'){a.setInput({throttle:.4,ability:true});for(let i=0;i<25;i++)a.step(2);}else a.step(2);
  }, {progress,id});
  await page.addStyleTag({content:'.pod-hud {display:none!important;}'});
  const png=await page.screenshot({path:`output/round49/mode-${id}.png`});
  const webp=await page.evaluate(async source=>{
   const image=new Image();image.src=source;await image.decode();const canvas=document.createElement('canvas');canvas.width=800;canvas.height=500;
   canvas.getContext('2d').drawImage(image,0,0,800,500);return canvas.toDataURL('image/webp',.85);
  },`data:image/png;base64,${png.toString('base64')}`);
  await writeFile(`${dir}/mode-${id}.webp`,Buffer.from(webp.split(',')[1],'base64'));console.log('mode',id);
 }
}finally{await browser?.close();server.kill();}
