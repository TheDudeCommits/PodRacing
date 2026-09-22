import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='output/round50';await mkdir(dir,{recursive:true});
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;const errors=[],receipt={};
try{
 await new Promise(r=>setTimeout(r,700));browser=await chromium.launch({args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
 const host=await browser.newPage({viewport:{width:1280,height:800}}),guest=await browser.newPage({viewport:{width:1280,height:800}});
 for(const p of [host,guest]){p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
 await Promise.all([host,guest].map(async p=>{await p.goto(`http://127.0.0.1:${port}`);await p.waitForFunction(()=>window.__PODRACING__?.ready,undefined,{timeout:120000});}));
 await host.getByRole('button',{name:'Next pod',exact:true}).click();
 for(let i=0;i<6;i++)await guest.getByRole('button',{name:'Next pod',exact:true}).click();
 for(const p of [host,guest]) {await p.locator('[data-hud="room-panel"] > summary').click();}
 await host.locator('[data-action="create-room"]').click();
 await host.waitForFunction(()=>window.__PODRACING__.snapshot().game.onlineRoom.status==='ready',undefined,{timeout:25000});
 const code=await host.evaluate(()=>window.__PODRACING__.snapshot().game.onlineRoom.code);
 await guest.locator('[data-hud="room-code-input"]').fill(code);await guest.locator('[data-action="join-room"]').click();
 await host.waitForFunction(()=>window.__PODRACING__.snapshot().game.onlineRoom.members.length===2,undefined,{timeout:25000});
 console.log('Peers connected');
 await host.keyboard.press('Escape');await host.locator('[data-destination="frozen"]').click();await host.getByRole('button',{name:'Race',exact:true}).first().click();
 await guest.waitForFunction(()=>window.__PODRACING__.snapshot().game.onlineRoom.courseSeed===0x46524f53);
 await guest.waitForFunction(()=>document.querySelector('[data-hud="setup-destination"]').textContent==='Frostline'&&document.querySelector('.setup-types [aria-pressed="true"]').dataset.mode==='race');
 await guest.locator('.setup-online>summary').click();
 if(await guest.locator('.setup-map:disabled').count()!==4||await guest.locator('.setup-types button:disabled').count()!==4)throw new Error('Guest mode controls are not locked');
 await guest.screenshot({path:`${dir}/multiplayer-guest-home.png`});
 receipt.lobbies=await Promise.all([host,guest].map(p=>p.evaluate(()=>window.__PODRACING__.snapshot().game.onlineRoom)));
 if(receipt.lobbies.some(l=>l.members.map(m=>m.podIdentity).join(',')!=='sebulba,needle'))throw new Error('Pod selection differs across lobby peers');
 console.log('Lobby selection parity passed');
 await host.locator('[data-action="start-race"]').click();
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!window.__PODRACING__.snapshot().game.awaitingStart,undefined,{timeout:120000})));
 await guest.waitForFunction(()=>window.__PODRACING__.snapshot().raceTime>1,undefined,{timeout:20000});
 await guest.keyboard.press('c',{delay:120});await guest.keyboard.down('w');await new Promise(r=>setTimeout(r,650));await guest.keyboard.up('w');
 receipt.races=await Promise.all([host,guest].map(p=>p.evaluate(()=>window.__PODRACING__.snapshot())));
 for(const s of receipt.races){if(s.game.course.seed!==0x46524f53||s.game.competitionProfile!=='clean-race')throw new Error('Start lost destination/rules');const a=s.galactic.racers.find(r=>r.id==='ai-vexa').galactic.ability;if(a?.kind!=='shunt'||a.cooldown<=0)throw new Error('Guest ability did not reach authoritative host');}
 await host.screenshot({path:`${dir}/multiplayer-host.png`}); await guest.screenshot({path:`${dir}/multiplayer-guest.png`});
}catch(error){receipt.error=String(error);throw error;}finally{await browser?.close();server.kill();await writeFile(`${dir}/multiplayer.json`,JSON.stringify({errors,...receipt},null,2));}
if(errors.length)throw new Error(JSON.stringify(errors));console.log('Live host/guest map, rules, pod selection and ability input passed.');
