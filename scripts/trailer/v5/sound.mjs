import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const run=promisify(execFile),root='output/trailer-v5';const {duration,cuts}=JSON.parse(await readFile(`${root}/edl.json`));
const music=`${root}/music/race-the-sun.mp3`,bank='public/audio/salt-dusk-v2',old='public/audio/salt-dusk';
const layers=[];
const add=(file,at,dur,gain=1,extra={})=>layers.push({file,at,dur,gain,...extra});
// Phrase edit at the track's measured 123 BPM pulse: anticipation, drive, breath, final statement.
add(music,0,15.616667,.9,{from:24.5842,fadeIn:.25,fadeOut:.06});
add(music,15.616667,24.50,1.03,{from:40.194,fadeIn:.03,fadeOut:.15});
add(music,41.466667,duration-41.466667,1.0,{from:241.1696,fadeIn:.22,fadeOut:2.0});
// No synthesized material: beds and all accents come from the game's sourced bank.
add(`${old}/wind.ogg`,0,7.8,.27,{loop:true,fadeIn:.15,fadeOut:1.8});
add(`${old}/turbine.ogg`,.5,5.4,.27,{loop:true,fadeIn:1.5,fadeOut:.3,pitch:.82});
add(`${bank}/boost.ogg`,1.95,3.59,.7);
for(const s of cuts){
 if(s.kind==='game'&&s.src!=='01-grid'){
  add(`${bank}/propulsion.ogg`,s.at,s.dur,s.at>15?.31:.23,{loop:true,fadeIn:.045,fadeOut:.08,pitch:s.src.includes('pov')?1.1:1.0});
 }
 if(s.kind==='gen'&&s.src!=='g6-dust-plate')add(`${bank}/propulsion.ogg`,s.at,s.dur,.21,{loop:true,fadeIn:.1,fadeOut:.15});
 if(s.kind==='game'){
  let rec;try{rec=JSON.parse(await readFile(`${root}/takes/${s.src}.json`));}catch{continue;}
  const used=rec.telemetry.filter(t=>t.time>=s.from&&t.time<s.from+s.dur);
  for(const t of used.filter(t=>t.firedNow))add(`${bank}/weapon.ogg`,s.at+t.time-s.from,.731,.76);
  for(const t of used.filter(t=>t.minedNow))add(`${bank}/mechanical-click.ogg`,s.at+t.time-s.from,.3,.8);
 }
}
const at=id=>cuts.find(s=>s.src===id)?.at;
add(`${bank}/boost.ogg`,at('06-launch'),3.59,.8);
add(`${bank}/boost.ogg`,at('07-pack-chase')+.7,2.7,.37);
add(`${bank}/shield-pulse.ogg`,at('25-shield'),1.3,.82);
add(`${old}/forceField_002.ogg`,at('24-mine')+.45,.8,.45);
add(`${bank}/rupture.ogg`,at('27-impact')+.5,1.72,.86);
add(`${old}/lowFrequency_explosion_000.ogg`,39.466667,.8,.85);
add(`${old}/explosionCrunch_000.ogg`,39.566667,1.4,.75);
add(`${bank}/mechanical-click.ogg`,at('26-tow'),.3,.7);
add(`${bank}/boost.ogg`,at('26-tow')+1.65,1.25,.55);
add(`${bank}/boost.ogg`,at('20-sunset-sprint'),2.91,.63);
add(`${bank}/boost.ogg`,at('21-finish'),2.91,.73);
add(`${old}/bong_001.ogg`,63.9,1,.65);
add(`${bank}/boost.ogg`,67.8,.98,.65);
await writeFile(`${root}/audio-edl.json`,JSON.stringify({duration,layers},null,2));
const inputs=[],filters=[],labels=[];
for(const [i,l] of layers.entries()){
 if(l.loop)inputs.push('-stream_loop','-1');if(l.from)inputs.push('-ss',String(l.from));
 inputs.push('-t',String(l.dur),'-i',l.file);
 let chain=`[${i}:a]aresample=48000,aformat=channel_layouts=stereo`;
 if(l.pitch)chain+=`,asetrate=${Math.round(48000*l.pitch)},aresample=48000`;
 chain+=`,atrim=duration=${l.dur},asetpts=PTS-STARTPTS,afade=t=in:d=${l.fadeIn??.012},afade=t=out:st=${Math.max(0,l.dur-(l.fadeOut??.04))}:d=${l.fadeOut??.04},volume=${l.gain},adelay=${Math.round(l.at*1000)}|${Math.round(l.at*1000)}[a${i}]`;
 filters.push(chain);labels.push(`[a${i}]`);
}
filters.push(`${labels.join('')}amix=inputs=${layers.length}:duration=longest:normalize=0,alimiter=limit=.93:level=false,atrim=duration=${duration}[mix]`);
const r=await run('ffmpeg',['-y','-hide_banner',...inputs,'-filter_complex',filters.join(';'),'-map','[mix]','-ar','48000','-c:a','pcm_s24le',`${root}/premix.wav`],{maxBuffer:8e6});
const measure=await run('ffmpeg',['-hide_banner','-i',`${root}/premix.wav`,'-af','loudnorm=I=-14.5:TP=-1.5:LRA=11:print_format=json','-f','null','-'],{maxBuffer:4e6});
const match=measure.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);if(!match)throw Error('Loudness analysis did not return measurements');
const m=JSON.parse(match[0]);
const normalize=`loudnorm=I=-14.5:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`;
const final=await run('ffmpeg',['-y','-hide_banner','-i',`${root}/premix.wav`,'-af',normalize,'-ar','48000','-c:a','pcm_s24le',`${root}/mix.wav`],{maxBuffer:4e6});
await writeFile(`${root}/audio-render.log`,r.stderr+'\nMEASURE\n'+measure.stderr+'\nFINAL\n'+final.stderr);
console.log('mixed',layers.length,'sourced layers',duration,'seconds');
