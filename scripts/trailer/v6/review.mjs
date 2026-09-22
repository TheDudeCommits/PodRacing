/** Contact sheets for each finished cut: start, middle, end. Browser always closes. */
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from '@playwright/test';
const run=promisify(execFile),root='output/trailer-v6';
const {cuts}=JSON.parse(await readFile(`${root}/edl.json`));
await mkdir(`${root}/review/cuts`,{recursive:true});
const rows=[];
for(const [i,s] of cuts.entries()){
 const n=String(i).padStart(2,'0'),src=`${root}/edit-clips/${n}.mp4`;
 try{await access(src)}catch{continue}
 const frames=[];
 for(const [label,time] of [['start',Math.min(.15,s.dur/4)],['middle',s.dur/2],['end',s.dur-1/60]]){
  const out=`${root}/review/cuts/${n}-${label}.jpg`;
  await run('ffmpeg',['-y','-v','error','-ss',String(time),'-i',src,'-vf','scale=560:315','-frames:v','1',out]);frames.push(resolve(out));
 }
 rows.push(`<section><header>${String(i+1).padStart(2,'0')} · ${s.at.toFixed(2)}s · ${s.src} · ${s.kind}</header><div>${frames.map(f=>`<img src="file://${f}">`).join('')}</div></section>`);
}
const browser=await chromium.launch();
try{
 const p=await browser.newPage({viewport:{width:1740,height:1080}});
 for(let start=0;start<rows.length;start+=8){
  const html=`<style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#10141c;color:#fcebd8;font:20px system-ui}section{margin-bottom:18px}header{margin:8px 0}div{display:flex;gap:10px}img{width:560px;height:315px}</style>${rows.slice(start,start+8).join('')}`;
  const file=resolve(`${root}/review/sheet-${start/8+1}.html`);await writeFile(file,html);
  await p.goto(`file://${file}`);await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await p.screenshot({path:`${root}/review/sheet-${start/8+1}.jpg`,fullPage:true});
 }
}finally{await browser.close();}
console.log('Reviewed cut sheets:',rows.length);
