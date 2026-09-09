import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const port=5187, url=`http://127.0.0.1:${port}`, out=process.env.INKSTORM_OUTPUT??'output/gauntlet/performance';
const fixedQuality=process.env.INKSTORM_QUALITY===undefined?null:Number(process.env.INKSTORM_QUALITY);
if(fixedQuality!==null&&(!Number.isInteger(fixedQuality)||fixedQuality<0||fixedQuality>8))throw new Error('INKSTORM_QUALITY must be an integer0–8');
const server=spawn('npm',['run','preview','--','--port',String(port),'--strictPort'],{stdio:'ignore'});
await mkdir(out,{recursive:true});
let browser;
const summarize=values=>{
  const sorted=values.toSorted((a,b)=>a-b), q=p=>sorted[Math.floor((sorted.length-1)*p)];
  return {samples:values.length,averageFps:1000/(values.reduce((a,b)=>a+b,0)/values.length),p50Ms:q(.5),p95Ms:q(.95),p99Ms:q(.99),over25ms:values.filter(v=>v>25).length};
};
try{
  for(let i=0;i<150;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2});
  const page=await context.newPage(), errors=[], results=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url);await page.waitForFunction(()=>window.__PODRACING__?.ready,{timeout:30000});
  const buildScripts=await page.evaluate(()=>Array.from(document.scripts).map(script=>script.src).filter(Boolean));
  const build=await Promise.all(buildScripts.map(async scriptUrl=>({url:scriptUrl,sha256:createHash('sha256').update(new Uint8Array(await(await fetch(scriptUrl)).arrayBuffer())).digest('hex')})));
  const device=await page.evaluate(()=>{const canvas=document.querySelector('canvas'),gl=canvas?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):'unavailable'};});
  const sections=await page.evaluate(()=>window.__PODRACING__.snapshot().game.course.sections);
  for(const section of sections){
    await page.evaluate(({progress,quality})=>{const api=window.__PODRACING__;api.setCaptureMode(true);api.setCamera('chase');api.seekCourse(progress);api.setCaptureMode(false);api.setPerformanceQuality(quality);},{progress:section.progress,quality:fixedQuality});
    await page.keyboard.down('w');
    const sample=await page.evaluate(()=>new Promise(resolve=>{const intervals=[];let start=0,last=0;const frame=t=>{if(!start)start=t;if(last&&t-start>1500)intervals.push(t-last);last=t;if(t-start<7500)requestAnimationFrame(frame);else resolve({intervals,snapshot:window.__PODRACING__.snapshot()});};requestAnimationFrame(frame);}));
    await page.keyboard.up('w');
    await page.screenshot({path:`${out}/${section.id}-live.png`});
    const result={section,...summarize(sample.intervals),snapshot:sample.snapshot};results.push(result);
    console.log(JSON.stringify({section:section.id,...summarize(sample.intervals),renderer:sample.snapshot.renderer}));
  }
  await writeFile(`${out}/section-performance.json`,JSON.stringify({scope:'Seven separately staged section starts, then live simulation and W input; 1.5s warmup plus6s measured each. No continuous full-lap performance claim. Records disabled by capture staging.',build,fixedQuality,viewport:{width:1440,height:900,requestedDpr:2},device,results,errors},null,2));
  if(errors.length||results.some(r=>r.p95Ms>25))process.exitCode=1;
}finally{await browser?.close();server.kill('SIGTERM');}
