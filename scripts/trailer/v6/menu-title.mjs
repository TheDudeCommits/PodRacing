/** Real menu opening + a typography-only end card. No captions over racing. */
import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const root='output/trailer-v6'; await mkdir(`${root}/stills`,{recursive:true}); await mkdir(`${root}/takes`,{recursive:true});
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
let encoder;
try {
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:43153'); await page.waitForFunction(()=>window.__PODRACING__?.ready);
 await page.waitForFunction(()=>document.querySelector('[data-vehicle-preview="hero"]')?.dataset.previewReady==='true');

 const encode=async(name,frames,render)=>{
  encoder=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate','60','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p',`${root}/${name}.mp4`],{stdio:['pipe','ignore','pipe']});
  let err='';encoder.stderr.on('data',b=>err+=b);const done=once(encoder,'exit');
  for(let f=0;f<frames;f++) {
   await render(f);const buffer=await page.screenshot({type:'jpeg',quality:94});
   if(!encoder.stdin.write(buffer))await once(encoder.stdin,'drain');
   if([0,Math.floor(frames/2),frames-1].includes(f))await writeFile(`${root}/stills/${name.replace('/','-')}-${f}.jpg`,buffer);
  }
  encoder.stdin.end();const [code]=await done;if(code)throw Error(err);encoder=null;
 };
 if(!process.argv.includes('--title-only')) {
  // Freeze only autonomous inspection; the actual pointer and selection handlers
  // continue to render the real mesh, including its changes of appearance.
  await page.emulateMedia({reducedMotion:'reduce'});
  await encode('takes/menu',360,async f=>{
   if(f===66) {await page.locator('.setup-racer[data-appearance="sebulba"]').click();await page.evaluate(()=>window.__PODRACING__.step(0));}
   if(f===150) {await page.locator('.setup-racer[data-appearance="teemto"]').click();await page.evaluate(()=>window.__PODRACING__.step(0));}
   if(f===180){await page.mouse.move(880,460);await page.mouse.down();}
   if(f>=180&&f<=240)await page.mouse.move(880+(f-180)*1.3,460);
   if(f===241)await page.mouse.up();
   if(f===315) {const b=await page.locator('[data-action="start-race"]').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);}
   if(f===342)await page.mouse.down();
  });
  await page.mouse.up();
  await writeFile(`${root}/takes/menu.json`,JSON.stringify({shot:{id:'menu'},frames:360,errors,telemetry:[],source:'Actual interactive DOM and 3D menu; pointer/selection input'}));
 }
 await page.goto('about:blank');
 const font=(await readFile('public/fonts/liquid-chrome/Orbitron-Variable.ttf')).toString('base64');
 await page.setContent(`<style>@font-face{font-family:Orbitron;src:url(data:font/ttf;base64,${font})}*{box-sizing:border-box}body{margin:0;width:1920px;height:1080px;background:#030806;color:#e4dfc0;font-family:Orbitron;display:flex;align-items:center;justify-content:center;text-align:center}body:after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,#0003 0 1px,transparent 1px 4px);pointer-events:none}.card{width:1560px}h1{font-size:145px;letter-spacing:8px;margin:0 0 90px;font-weight:900;text-shadow:0 0 45px #a0cc7b22}a{display:block;font-size:55px;color:#b3df9d;letter-spacing:3px;text-shadow:0 0 18px #9dff6733}.rule{height:2px;width:600px;background:#809b66;margin:56px auto}.credit{position:absolute;bottom:55px;width:100%;font-family:Arial,sans-serif;font-size:19px;color:#829079;letter-spacing:1px;line-height:1.7}</style><div class="card"><h1>PODRACING</h1><a>Podracing.Dude.Work</a><div class="rule"></div></div><div class="credit">Music: “Race The Sun” — Scott Buckley · CC BY 4.0 · scottbuckley.com.au<br>In-engine gameplay with cinematic inserts.</div>`);
 await page.evaluate(()=>document.fonts.ready);
 await encode('title',360,async f=>{await page.evaluate(f=>{const c=document.querySelector('.card');c.style.opacity=String(Math.min(1,f/18));c.style.transform=`scale(${.975+Math.min(f,300)/300*.025})`;},f)});
 console.log('menu/title captured',errors);
} finally {encoder?.kill(); await browser.close();}
