/** Frame-accurate EDL, beat-aligned phrase edit, sourced SFX and reproducible exports. */
import {mkdir,writeFile,readFile,access,stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const run=promisify(execFile),root='output/trailer-v6';const fps=60,beat=60/123;
const game=(src,b,from=0,label)=>({kind:'game',src,b,from,label});
const gen=(src,b,from=0,old=true)=>({kind:'gen',src,b,from,old});
export const CUTS=[
 {kind:'menu',src:'menu',b:12,from:0},gen('g1-engine-ignite',4,.6),game('launch',6,.2),
 game('teemto',2,.25),game('polwo',2,.25),game('desert-pack',6,.3),game('desert-drift',6,.3),
 game('frozen-wide',6,.3),game('verdigris',2,.25),game('skybolt',2,.25),game('frozen-boost',6,.3),game('frozen-hud',6,.3),gen('gen-pass',4,.6),
 game('volcanic-wide',6,.3),game('sebulba',2,.25),game('blockrunner',2,.25),game('flame',6,.3),game('impact',4,.3),gen('g4-crash',4,1.4),
 game('jungle-wide',6,.3),game('needle',2,.25),game('pog',2,.25),game('jungle-drift',6,.3),game('jungle-pov',6,.3),
 {...gen('refinery-hero',4,2,false),sourceOverride:'output/trailer-v5/generated/refinery-hero.mp4'},
 game('shield',4,.1),game('mine',4,.05),game('jump',4,.2),game('finish',6,.3),
 {kind:'title',src:'title',b:12,from:0},
];
let cursor=0;for(const s of CUTS){const start=Math.round(cursor*beat*fps);cursor+=s.b;const end=Math.round(cursor*beat*fps);Object.assign(s,{at:start/fps,dur:(end-start)/fps,frames:end-start});}
export const duration=Math.round(cursor*beat*fps)/fps;
const ff=async a=>run('ffmpeg',['-y','-hide_banner','-loglevel','error',...a],{maxBuffer:4e6});
const exists=async p=>{try{await access(p);return true}catch{return false}};
const path=s=>s.sourceOverride??(s.kind==='game'||s.kind==='menu'?`${root}/takes/${s.src}.mp4`:s.kind==='title'?`${root}/title.mp4`:s.old?`output/trailer/gen/${s.src}.mp4`:`${root}/generated/${s.src}.mp4`);
await mkdir(`${root}/edit-clips`,{recursive:true});
await writeFile(`${root}/edl.json`,JSON.stringify({fps,duration,bpm:123,cuts:CUTS},null,2));
if(process.argv.includes('--edl-only')){console.log(JSON.stringify({duration,cuts:CUTS.map(s=>[s.at,s.dur,s.src])},null,2));process.exit(0);}
const skip=process.argv.includes('--resume');const prepare=process.argv.includes('--prepare');let missing=false;
for(let i=0;i<CUTS.length;i++){
 const s=CUTS[i],output=`${root}/edit-clips/${String(i).padStart(2,'0')}.mp4`;
 const input=path(s);
 if(!await exists(input)||(s.kind==='game'&&!await exists(`${root}/takes/${s.src}.json`))){if(prepare){console.log('waiting',s.src);missing=true;continue;}throw Error(`Missing finished source ${input}`);}
 const identity=JSON.stringify({s,sourceBytes:(await stat(input)).size});
 if(skip&&await exists(output)&&await exists(output+'.json')&&(await readFile(output+'.json','utf8'))===identity)continue;const probe=JSON.parse((await run('ffprobe',['-v','error','-show_entries','format=duration','-of','json',input])).stdout);
 if(s.from+s.dur>Number(probe.format.duration)+.02)throw Error(`${s.src}: source overrun`);
 const inputs=['-ss',String(s.from),'-i',input];
 let filters=`[0:v]scale=1920:1080:flags=lanczos,fps=60,setsar=1,trim=duration=${s.dur},setpts=PTS-STARTPTS`;
 if(s.reframe==='bottom')filters+=',crop=1920:856:0:224,pad=1920:1080:0:112:color=0x070b10';
 if(s.kind!=='title'&&s.kind!=='menu')filters+=',eq=contrast=1.06:saturation=0.98:gamma=0.98,colorbalance=bs=.015:rs=.01,unsharp=3:3:.18';
 if(s.kind!=='title'&&s.kind!=='menu'&&!s.src.endsWith('-hud'))filters+=',drawbox=x=0:y=0:w=iw:h=112:color=0x070b10:t=fill,drawbox=x=0:y=ih-112:w=iw:h=112:color=0x070b10:t=fill';
 if(i===0)filters+=',fade=t=in:d=0.3';
 filters+='[base]';let out='base';

 await ff([...inputs,'-filter_complex',filters,'-map',`[${out}]`,'-frames:v',String(s.frames),'-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p',output]);
 await writeFile(output+'.json',identity);
 console.log(`cut ${i+1}/${CUTS.length}: ${s.src} ${s.dur.toFixed(3)}s`);
}
if(missing){console.log('Prepared available cuts; capture/generation still in progress.');process.exit(0);}
await writeFile(`${root}/concat.txt`,CUTS.map((_,i)=>`file 'edit-clips/${String(i).padStart(2,'0')}.mp4'`).join('\n'));
await ff(['-f','concat','-safe','0','-i',`${root}/concat.txt`,'-c','copy',`${root}/picture.mp4`]);
console.log('picture assembled',duration);
