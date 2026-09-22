import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='output/round50';await mkdir(dir,{recursive:true});
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const server=process.env.PODRACING_QA_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const base=process.env.PODRACING_QA_URL||`http://127.0.0.1:${port}`;
const bundleFile=(await readdir('dist/assets')).find(f=>/^index-.*\.js$/.test(f));
const expectedHash=createHash('sha256').update(await readFile(`dist/assets/${bundleFile}`)).digest('hex');
let browser;const errors=[],results=[],bundles=[],pending=[];
try {
 await new Promise(r=>setTimeout(r,700));browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);if(r.status()===200&&/\/assets\/index-[^/]+\.js$/.test(r.url()))pending.push(r.body().then(b=>bundles.push({url:r.url(),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')})));});
 await page.goto(base);await page.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:120000});
 await page.waitForFunction(()=>document.querySelector('[data-hud="garage-model"]')?.dataset.previewReady==='true',undefined,{timeout:120000});
 await page.screenshot({path:`${dir}/home-desktop.png`});
 const homeText = await page.locator('.setup-frame').innerText();
 if (/Drag to rotate|browse racers|8 pods\.|NOW THIS IS PODRACING|INKSTORM/.test(homeText)) throw new Error('Removed home copy remains visible');
 if (await page.locator('.setup-map').count() !== 4) throw new Error('Missing visual map choices');
 console.log('Desktop loaded');
 const roster=page.locator('.setup-racer');
 for(const id of ['sebulba','polwo','blockrunner','verdigris','skybolt','needle','pog','teemto']){
  await page.locator(`.setup-racer[data-appearance="${id}"]`).click();
  await page.waitForFunction(id=>document.querySelector('[data-hud="garage-model"]')?.dataset.previewAppearance===id,id,{timeout:120000});
  const selected=await page.locator('.setup-racer[aria-pressed="true"]').getAttribute('data-appearance');
  if(selected!==id)throw new Error('Roster state mismatch');results.push({pod:id});
 }
 const hero=page.locator('[data-pod-inspection]');await hero.focus();await page.keyboard.press('ArrowRight');
 await page.waitForFunction(()=>Number(document.querySelector('[data-pod-inspection]').dataset.renderedAngle)===15);
 await page.keyboard.press('Home');await page.waitForFunction(()=>Number(document.querySelector('[data-pod-inspection]').dataset.renderedAngle)===0);
 const box=await hero.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+100,box.y+box.height/2,{steps:10});await page.mouse.up();
 await page.waitForFunction(()=>Number(document.querySelector('[data-pod-inspection]').dataset.renderedAngle)>35);
 results.push({inspection:await hero.getAttribute('data-rendered-angle')});
 await page.locator('[data-destination="frozen"]').click();
 await page.getByRole('button',{name:'Time Trial',exact:true}).click();
 await page.locator('.setup-more>summary').click();await page.screenshot({path:`${dir}/home-rules.png`});
 await page.locator('.setup-online>summary').click();
 await page.waitForFunction(()=>document.querySelectorAll('.setup-drawer[open]').length===1);
 if(await page.locator('.setup-online').getAttribute('open')===null)throw new Error('Online drawer did not open');
 await page.locator('[data-hud="room-code-input"]').fill('abc123');await page.keyboard.press('Escape');
 if(await page.locator('.setup-drawer[open]').count())throw new Error('Escape did not close drawer');
 if(!await page.evaluate(()=>window.__PODRACING__.snapshot().game.awaitingStart))throw new Error('Menu started a race');
 await page.getByRole('button',{name:'Options',exact:true}).click();await page.screenshot({path:`${dir}/home-options.png`});
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('.setup-frame').inert);
 // Exercise the production gamepad navigation adapter with a virtual standard pad.
 await page.evaluate(()=>{
  window.__homePad={id:'Home QA standard controller',index:0,mapping:'standard',connected:true,timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__homePad]});
 });
 const padButton=async index=>{
  await page.evaluate(i=>{window.__homePad.buttons[i]={pressed:true,touched:true,value:1};},index);await page.waitForTimeout(100);
  await page.evaluate(i=>{window.__homePad.buttons[i]={pressed:false,touched:false,value:0};},index);await page.waitForTimeout(100);
 };
 await page.locator('.setup-more>summary').focus();await padButton(15);
 const controllerFocus=await page.evaluate(()=>document.activeElement?.closest('details')?.className ?? document.activeElement?.outerHTML);
 if(!controllerFocus?.includes('setup-online'))throw new Error(`Controller did not navigate to race rules: ${controllerFocus}`);
 await page.locator('.setup-more>summary').focus();await padButton(0);await page.waitForFunction(()=>document.querySelector('.setup-more').open);
 await padButton(1);await page.waitForFunction(()=>!document.querySelector('.setup-more').open);
 await page.getByRole('button',{name:'Options',exact:true}).focus();await padButton(0);await page.waitForFunction(()=>document.querySelector('.pod-hud__pause').classList.contains('has-settings'));
 await padButton(1);await page.waitForFunction(()=>!document.querySelector('.pod-hud__pause').classList.contains('has-settings'));
 results.push({controller:'D-pad navigation, A opens rules/options, B closes drawers/settings'});
 await page.evaluate(()=>{window.__homePad.connected=false;});
 await page.emulateMedia({reducedMotion:'reduce'});
 const animation=await hero.locator('img').evaluate(el=>getComputedStyle(el).animationName);
 if(animation!=='none')throw new Error('Reduced motion animation still running');
 results.push({reducedMotion:animation});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.getByRole('button',{name:'World Cup',exact:true}).click();
 await page.locator('.setup-more>summary').click();await page.waitForTimeout(250);await page.screenshot({path:`${dir}/home-cup-rules.png`});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Race',exact:true}).click();
 await page.locator('.setup-more>summary').click();await page.locator('[data-action="select-ai-difficulty"][data-difficulty="hard"]').click();await page.locator('[data-action="select-laps"][data-laps="3"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-difficulty="hard"]').getAttribute('aria-pressed')==='true'&&document.querySelector('[data-laps="3"]').getAttribute('aria-pressed')==='true');
 await page.getByRole('button',{name:'Courses',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.race-event-atlas').hidden);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.setup-frame').inert);
 results.push({tools:'Race rules apply and Courses opens/closes without starting the race'});
 for(const [width,height] of [[1024,768],[390,844],[360,740],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(350);
  await page.screenshot({path:`${dir}/home-${width}x${height}.png`,fullPage:true});
  const sizing=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,home:document.querySelector('.simple-setup').clientWidth,homeScroll:document.querySelector('.simple-setup').scrollWidth}));
  if(sizing.width!==sizing.scroll||sizing.homeScroll>sizing.home+1)throw new Error(`Overflow ${JSON.stringify(sizing)}`);
  const layout=await page.evaluate(()=>{const mode=document.querySelector('.setup-header').getBoundingClientRect(),roster=document.querySelector('.setup-roster-heading').getBoundingClientRect();const maps=document.querySelector('.setup-maps').getBoundingClientRect(),pods=document.querySelector('.setup-roster-stage').getBoundingClientRect();return {modeBottom:mode.bottom,rosterTop:roster.top,mapsTop:maps.top,podsBottom:pods.bottom};});
  if(layout.mapsTop<layout.podsBottom||layout.rosterTop<layout.modeBottom)throw new Error('Mode and roster rows overlap');
  results.push({viewport:[width,height],sizing,layout});
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${dir}/home-mobile-destinations.png`});await page.locator('[data-destination="jungle"]').click();
 await page.locator('[data-action="start-race"]').click();await page.waitForFunction(()=>!window.__PODRACING__.snapshot().game.awaitingStart,undefined,{timeout:120000});
 results.push({start:await page.evaluate(()=>window.__PODRACING__.snapshot().game)});
 await page.screenshot({path:`${dir}/home-to-race.png`});
 const touchContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 try {
  const touch=await touchContext.newPage();touch.on('pageerror',e=>errors.push(String(e)));
  await touch.goto(base);await touch.waitForFunction(()=>document.querySelector('[data-pod-inspection]')?.dataset.previewReady==='true',undefined,{timeout:120000});
  await touch.locator('.setup-racer[data-appearance="sebulba"]').tap();
  await touch.waitForFunction(()=>document.querySelector('[data-pod-inspection]')?.dataset.previewAppearance==='sebulba',undefined,{timeout:120000});
  const bounds=await touch.locator('[data-pod-inspection]').boundingBox();const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
  const session=await touch.context().newCDPSession(touch);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+70,y}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await touch.waitForFunction(()=>Number(document.querySelector('[data-pod-inspection]').dataset.renderedAngle)>25);
  await touch.screenshot({path:`${dir}/home-touch-sebulba.png`});results.push({touch:'Tap selection and touch drag inspection passed'});
 }finally{await touchContext.close();}

 await Promise.all(pending);
 if(!bundles.length||bundles.some(b=>b.sha256!==expectedHash))throw new Error('Browser bundle differs from the tested local build');
}finally{await Promise.allSettled(pending);await browser?.close();server?.kill();await writeFile(`${dir}/home-qa.json`,JSON.stringify({base,expectedHash,bundles,errors,results},null,2));}
if(errors.length)throw new Error(JSON.stringify(errors));console.log(JSON.stringify({base,checks:results.length,errors}));
