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
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await page.goto(`http://127.0.0.1:${port}`);
 await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:120000});
 // A compact, transparent render uses the same framing and materials as the garage.
 await page.addStyleTag({content:'.pod-hud .simple-setup .pod-hud__garage-model {width:400px!important;height:250px!important;inset:100px auto auto 100px!important;}'});
 for (const id of ['teemto','sebulba','polwo','blockrunner','verdigris','skybolt','needle','pog']) {
  await page.locator(`.setup-racer[data-appearance="${id}"]`).click();
  await page.waitForFunction(id=>{const h=document.querySelector('[data-hud="garage-model"]');const img=h?.querySelector('img');return h?.dataset.previewAppearance===id&&h.dataset.previewReady==='true'&&img?.naturalWidth>=300;},id,{timeout:120000});
  const source=await page.locator('[data-hud="garage-model"] img').getAttribute('src');
  await writeFile(`${dir}/pod-${id}.webp`,Buffer.from(source.split(',')[1],'base64'));
  console.log('portrait',id);
 }
}finally{await browser?.close();server.kill();}
