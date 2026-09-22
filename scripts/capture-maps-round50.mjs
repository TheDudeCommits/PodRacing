/** Menu art is captured from our own runtime and meshes; no reference assets. */
import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='public/assets/inkstorm/home';await mkdir(dir,{recursive:true});await mkdir('output/round50',{recursive:true});
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try {
 await new Promise(r=>setTimeout(r,800));
 browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:1});
 await page.goto(`http://127.0.0.1:${port}`);
 await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:120000});
 for (const [i,[id,destination,progress]] of [['desert','desert',.29],['frozen','frozen',.34],['volcanic','volcanic',.4],['jungle','jungle',.43]].entries()) {
  if(i){await page.reload();await page.waitForFunction(()=>window.__PODRACING__?.ready);}
  await page.locator(`[data-destination="${destination}"]`).click();
  await page.locator(`.setup-racer[data-appearance="${id==='battle'?'sebulba':'teemto'}"]`).click();
  await page.locator('[data-action="start-race"]').click();
  await page.waitForFunction(()=>!window.__PODRACING__.snapshot().game.awaitingStart,undefined,{timeout:120000});
  await page.evaluate(({progress,id})=>{
   const a=window.__PODRACING__;a.setCaptureMode(true);a.stageTrailerRace(progress,[{forward:0,lane:0}],true);
   a.setTrailerCamera({racerIndex:0,eye:[38,28,-35],target:[0,6,55],fov:65});a.step(2);
  }, {progress,id});
  await page.addStyleTag({content:'.pod-hud {display:none!important;}'});
  const png=await page.screenshot({path:`output/round50/map-${id}.png`});
  const webp=await page.evaluate(async source=>{
   const image=new Image();image.src=source;await image.decode();const canvas=document.createElement('canvas');canvas.width=800;canvas.height=450;
   canvas.getContext('2d').drawImage(image,0,0,800,450);return canvas.toDataURL('image/webp',.85);
  },`data:image/png;base64,${png.toString('base64')}`);
  await writeFile(`${dir}/map-${id}.webp`,Buffer.from(webp.split(',')[1],'base64'));console.log('mode',id);
 }
}finally{await browser?.close();server.kill();}
