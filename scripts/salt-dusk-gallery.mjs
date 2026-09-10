import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const output=process.argv[2];
if(!output)throw new Error('Supply a fresh output directory');
await mkdir(output,{recursive:true});
const buildHtml=await readFile('dist/index.html','utf8');
const bundlePath=buildHtml.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
if(!bundlePath)throw new Error('Built game bundle was not found');
const bundleBytes=await readFile(`dist${bundlePath}`);
const bundle={path:bundlePath,bytes:bundleBytes.length,sha256:createHash('sha256').update(bundleBytes).digest('hex')};
const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
const receipt={bundle,scope:'Diagnostic world and UI framing only. Course seeking is not native play or a framerate measurement.',errors:[],shots:[],cleanup:{browserClosed:false,serverClosed:false}};
try{
  for(let i=0;i<80;i++){
    try{if((await fetch(`http://127.0.0.1:${port}`)).ok)break;}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
  page.on('pageerror',e=>receipt.errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')receipt.errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(()=>window.__PODRACING__?.ready,{timeout:60000});
  await page.waitForTimeout(1200);
  await page.screenshot({path:`${output}/00-menu.png`});
  for(let i=1;i<=4;i++){
    await page.getByRole('button',{name:'Next pod',exact:true}).click();
    await page.waitForTimeout(650);
    await page.screenshot({path:`${output}/00-pod-${i%4}.png`});
  }
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(700);
  await page.screenshot({path:`${output}/00-portrait.png`});
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(500);

  await page.locator('[data-hud="start-button"]:visible').click();
  await page.waitForFunction(()=>!window.__PODRACING__.snapshot().game.awaitingStart);
  await page.evaluate(()=>{window.__PODRACING__.setCaptureMode(true);window.__PODRACING__.setCamera('chase');});
  const sections=await page.evaluate(()=>{const course=window.__PODRACING__.snapshot().game.course;return [...course.sections,{id:'02b-salt-basin',progress:830/course.totalLength}];});
  for(const section of sections){
    await page.evaluate(p=>{window.__PODRACING__.seekCourse(p);window.__PODRACING__.step(2);},section.progress);
    await page.waitForTimeout(300);
    await page.screenshot({path:`${output}/${section.id}.png`});
    receipt.shots.push({section,snapshot:await page.evaluate(()=>window.__PODRACING__.snapshot())});
  }
}catch(error){receipt.failure=String(error);process.exitCode=1;}
finally{
  await browser?.close();receipt.cleanup.browserClosed=true;
  if(server.exitCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}
  receipt.cleanup.serverClosed=true;
  await writeFile(`${output}/receipt.json`,JSON.stringify(receipt,null,2));
  console.log(JSON.stringify({output,errors:receipt.errors,failure:receipt.failure,shots:receipt.shots.length,cleanup:receipt.cleanup}));
  if(receipt.errors.length)process.exitCode=1;
}
