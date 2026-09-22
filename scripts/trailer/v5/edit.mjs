/** Frame-accurate EDL, beat-aligned phrase edit, sourced SFX and reproducible exports. */
import {mkdir,writeFile,readFile,access,stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const run=promisify(execFile),root='output/trailer-v5';const fps=60,beat=60/123;
const game=(src,b,from=0,label)=>({kind:'game',src,b,from,label});
const gen=(src,b,from=0,old=true)=>({kind:'gen',src,b,from,old});
export const CUTS=[
 gen('g6-dust-plate',4,.2),gen('g1-engine-ignite',4,.6),gen('gen-pilot',4,2.4),game('01-grid',4,.4),
 game('p1-teemto',4,.6,'teemto'),game('p2-polwo',4,.4,'polwo'),game('p3-sebulba',4,.5,'sebulba'),game('p4-blockrunner',4,.5,'blockrunner'),
 game('06-launch',6,.5),game('07-pack-chase',6,.85),gen('gen-pass',3,.6),game('23-hud',5,.7),
 game('09-drift-side',6,.8,'drift'),game('10-drift-chase',4,.5),game('11-lance',6,.55,'combat'),game('25-shield',4,.1,'shield'),
 {...game('24-mine',4,.05,'mine'),reframe:'bottom'},game('27-impact',3,.15),gen('g4-crash',6,1.4),
 gen('refinery-hero',5,2.0,false),game('26-tow',6,.1,'tow'),game('16-arch',4,.65),game('17-foundry',6,.6),game('18-foundry-pov',4,.7),
 game('19-jump',5,.8),game('20-sunset-sprint',6,.75,'sprint'),gen('g5-canyon',4,.8),game('21-finish',6,.05),
 {kind:'title',src:'title',b:8,from:0},game('22-pilot',2,.7),{kind:'title',src:'title',b:8,from:4},
];
let cursor=0;for(const s of CUTS){const start=Math.round(cursor*beat*fps);cursor+=s.b;const end=Math.round(cursor*beat*fps);Object.assign(s,{at:start/fps,dur:(end-start)/fps,frames:end-start});}
export const duration=Math.round(cursor*beat*fps)/fps;
const ff=async a=>run('ffmpeg',['-y','-hide_banner','-loglevel','error',...a],{maxBuffer:4e6});
const exists=async p=>{try{await access(p);return true}catch{return false}};
const path=s=>s.kind==='game'?`${root}/takes/${s.src}.mp4`:s.kind==='title'?`${root}/title.mp4`:s.old?`output/trailer/gen/${s.src}.mp4`:`${root}/generated/${s.src}.mp4`;
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
 if(s.kind!=='title')filters+=',eq=contrast=1.06:saturation=0.98:gamma=0.98,colorbalance=bs=.015:rs=.01,unsharp=3:3:.18';
 if(s.kind!=='title'&&s.src!=='23-hud')filters+=',drawbox=x=0:y=0:w=iw:h=112:color=0x070b10:t=fill,drawbox=x=0:y=ih-112:w=iw:h=112:color=0x070b10:t=fill';
 if(i===0)filters+=',fade=t=in:d=0.3';
 filters+='[base]';let out='base';
 if(s.label){inputs.push('-loop','1','-i',`${root}/labels/${s.label}.png`);filters+=`;[1:v]format=rgba,fade=t=in:st=0:d=0.12:alpha=1[lab];[base][lab]overlay=0:0:format=auto[v]`;out='v';}
 await ff([...inputs,'-filter_complex',filters,'-map',`[${out}]`,'-frames:v',String(s.frames),'-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p',output]);
 await writeFile(output+'.json',identity);
 console.log(`cut ${i+1}/${CUTS.length}: ${s.src} ${s.dur.toFixed(3)}s`);
}
if(missing){console.log('Prepared available cuts; capture/generation still in progress.');process.exit(0);}
await writeFile(`${root}/concat.txt`,CUTS.map((_,i)=>`file 'edit-clips/${String(i).padStart(2,'0')}.mp4'`).join('\n'));
await ff(['-f','concat','-safe','0','-i',`${root}/concat.txt`,'-c','copy',`${root}/picture.mp4`]);
console.log('picture assembled',duration);
