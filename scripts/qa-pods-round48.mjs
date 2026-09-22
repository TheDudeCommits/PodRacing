import {chromium} from '@playwright/test';import {spawn} from 'node:child_process';import {createServer} from 'node:net';import {mkdir,writeFile} from 'node:fs/promises';
const dir='output/round48';await mkdir(dir,{recursive:true});const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;const errors=[],results=[];
try{await new Promise(r=>setTimeout(r,700));browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 for(const [i,id]of (process.env.PODRACING_POD_CHECK==='pog'?['pog']:['teemto','sebulba','polwo','blockrunner','verdigris','skybolt','needle','pog']).entries()){
  await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:120000});
  if(process.env.PODRACING_POD_CHECK==='pog')for(let j=0;j<7;j++)await page.getByRole('button',{name:'Next pod',exact:true}).click();
  if(i)await page.getByRole('button',{name:'Next pod',exact:true}).click();
  await page.waitForFunction(id=>{const v=window.__PODRACING__.snapshot().game.vehiclePresentation;return v.selected===id&&v.library.pending===0;},id,{timeout:120000});
  await page.locator('[data-action="start-race"]').click();await page.waitForFunction(()=>!window.__PODRACING__.snapshot().game.awaitingStart);
  await page.evaluate(()=>{const a=window.__PODRACING__;a.setCaptureMode(true);a.seekCourse(.29);a.setCamera('chase');a.step(2);});
  const s=await page.evaluate(()=>window.__PODRACING__.snapshot());results.push({id,snapshot:s});
  await page.screenshot({path:`${dir}/chase-${id}.png`});console.log('Chase',id,'errors',errors.length);
 }
 // Earn drift charge from neutral state using ordinary fixed-step input on a broad curve.
 const drift=await page.evaluate(()=>{
  const a=window.__PODRACING__;let best={label:'',score:0,progress:0,steer:0,tick:0};
  for(const progress of [.265,.285,.31,.79])for(const steer of [.32,-.32]){
   a.stageTrailerRace(progress,[{forward:0,lane:0}],false);a.setInput({throttle:1,steer,drift:true});
   for(let tick=2;tick<=400;tick+=2){a.step(2);const label=document.querySelector('[data-hud="drift-value"]').textContent;const score=label==='TURBO III'?3:label==='TURBO II'?2:label==='TURBO I'?1:0;if(score>best.score){best={label,score,progress,steer,tick};}if(score===3)break;}
   if(best.score===3)break;
  }
  if(best.score){a.stageTrailerRace(best.progress,[{forward:0,lane:0}],false);a.setInput({throttle:1,steer:best.steer,drift:true});for(let tick=0;tick<best.tick;tick+=2)a.step(2);}
  return best;
 });results.push({drift});await page.screenshot({path:`${dir}/drift-earned.png`});console.log('Earned drift',JSON.stringify(drift));
}finally{await browser?.close();server.kill();await writeFile(`${dir}/${process.env.PODRACING_POD_CHECK==='pog'?'pog-camera-final':'pod-cameras'}.json`,JSON.stringify({errors,results},null,2));}
if(errors.length)throw new Error(JSON.stringify(errors));
