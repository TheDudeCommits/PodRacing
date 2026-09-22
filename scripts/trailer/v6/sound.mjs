import {readFile,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const run=promisify(execFile),root='output/trailer-v6';const {duration,cuts}=JSON.parse(await readFile(`${root}/edl.json`));
const music='output/trailer-v5/music/race-the-sun.mp3',bank='public/audio/salt-dusk-v2',old='public/audio/salt-dusk';
const layers=[];
const add=(file,at,dur,gain=1,extra={})=>layers.push({file,at,dur,gain,...extra});
// Quiet console anticipation, orchestral launch, escalating destinations, final cadence.
add(music,0,7.8,.62,{from:32.389,fadeIn:.25,fadeOut:.05});
add(music,7.8,35.133333,1,{from:40.194,fadeIn:.02,fadeOut:.2});
add(music,42.933333,duration-42.933333,1,{from:241.1696,fadeIn:.16,fadeOut:2.2});
add('public/audio/cockpit/select.ogg',1.1,.3,.8);
add('public/audio/cockpit/select.ogg',2.5,.3,.8);
add('public/audio/cockpit/press.ogg',3,.15,.55);
add('public/audio/cockpit/launch.ogg',5.7,.65,.8);
add(`${old}/turbine.ogg`,5.85,1.95,.4,{loop:true,fadeIn:.1,fadeOut:.06,pitch:.85});
for(const s of cuts){
 if(s.kind==='game'){
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
add(`${bank}/boost.ogg`,at('launch'),2.9,.66);
add(`${bank}/boost.ogg`,at('frozen-boost')+.12,2.6,.55);
add(`${old}/thrusterFire_002.ogg`,at('flame')+.05,1.2,.7);
add(`${bank}/rupture.ogg`,at('impact')+.4,1.72,.86);
add(`${old}/explosionCrunch_000.ogg`,at('g4-crash')+1.2,1.4,.62);
add(`${bank}/shield-pulse.ogg`,at('shield')+.05,1.3,.8);
add(`${old}/forceField_002.ogg`,at('mine')+.15,.8,.4);
add(`${bank}/boost.ogg`,at('finish'),2.9,.65);
add(`${old}/bong_001.ogg`,at('title'),1,.65);
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
