/** Technical acceptance and per-cut action receipts. */
import {readFile,writeFile,stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const run=promisify(execFile),root='output/trailer-v6';
const edl=JSON.parse(await readFile(`${root}/edl.json`));
const evidence=[];
for(const s of edl.cuts){
 if(s.kind!=='game')continue;
 const take=JSON.parse(await readFile(`${root}/takes/${s.src}.json`));
 const samples=take.telemetry.filter(t=>t.time>=s.from&&t.time<s.from+s.dur);
 if(!samples.length)throw Error(`Missing telemetry for ${s.src}`);
 evidence.push({source:s.src,at:s.at,duration:s.dur,localPod:take.shot.localPod??'teemto',biome:take.shot.biome,abilityFrames:samples.filter(t=>t.ability?.remaining>0).length,
  minimumRivals:Math.min(...samples.map(t=>t.near)),maxAbsLateral:Math.max(...samples.map(t=>Math.abs(t.lat))),
  unexpectedHeroWreckFrames:samples.filter(t=>t.wreck!=='running').length,
  lanceFireTimes:samples.filter(t=>t.firedNow).map(t=>s.at+t.time-s.from),
  mineDropTimes:samples.filter(t=>t.minedNow).map(t=>s.at+t.time-s.from),
  shieldFrames:samples.filter(t=>t.shield).length,towFrames:samples.filter(t=>t.tow?.targetId).length,
  driftPeak:Math.max(...samples.map(t=>t.drift)),qualityLevels:[...new Set(samples.map(t=>t.quality))],
  errors:take.errors,stagedImpact:!!take.shot.wreckAt,
  events:[...new Set(samples.flatMap(t=>t.events.map(e=>`${e.type}:${e.racerId??''}`)))]});
}
const podIds=[...new Set(evidence.map(s=>s.localPod))].sort();
const biomes=[...new Set(evidence.map(s=>s.biome))].sort();
if(podIds.length!==8||biomes.length!==4)throw Error('Required pod/map coverage is incomplete');
if(evidence.some(s=>s.errors.length||s.unexpectedHeroWreckFrames))throw Error('Capture has errors or unexpected player wrecks');
for(const id of ['flame','frozen-boost'])if(!evidence.find(s=>s.source===id)?.abilityFrames)throw Error(`${id}: ability absent from selected cut`);
for(const id of ['desert-drift','jungle-drift'])if(evidence.find(s=>s.source===id)?.driftPeak<.8)throw Error(`${id}: drift absent from selected cut`);
if(!evidence.find(s=>s.source==='shield')?.shieldFrames||!evidence.find(s=>s.source==='mine')?.mineDropTimes.length||!evidence.some(s=>s.lanceFireTimes.length))throw Error('Required combat action is absent');
const paths=['PodRacing-Trailer-v6.mp4','PodRacing-Trailer-v6-web.mp4'];const exports=[];
for(const name of paths){
 const file=`${root}/${name}`;const probe=JSON.parse((await run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file])).stdout);
 await run('ffmpeg',['-v','error','-i',file,'-f','null','-'],{maxBuffer:2e6});
 const v=probe.streams.find(s=>s.codec_type==='video'),a=probe.streams.find(s=>s.codec_type==='audio');
 if(v.width!==1920||v.height!==1080||v.avg_frame_rate!=='60/1'||Number(v.nb_read_frames)!==Math.round(edl.duration*60)||!a)throw Error('Export does not meet specification');
 exports.push({file:name,bytes:(await stat(file)).size,duration:Number(probe.format.duration),video:{codec:v.codec_name,width:v.width,height:v.height,fps:v.avg_frame_rate,frames:Number(v.nb_read_frames)},audio:{codec:a.codec_name,sampleRate:a.sample_rate,channels:a.channels},completeDecode:'pass'});
}
const seconds=kind=>edl.cuts.filter(s=>s.kind===kind).reduce((a,s)=>a+s.dur,0);
const genSeconds=seconds('gen'),gameSeconds=seconds('game');
const result={status:'technical-and-sampled-visual-QA',duration:edl.duration,cuts:edl.cuts.length,gameSeconds,generatedSeconds:genSeconds,menuSeconds:seconds('menu'),titleSeconds:seconds('title'),podIds,biomes,exports,evidence,limitations:['Gameplay uses staged starting positions and capture cameras; subsequent movement is the actual game simulation.','The impact shot uses the existing diagnostic wreck trigger.','Generated inserts have native model cadence conformed to the 60 fps master.','Measured loudness, full decode and sampled frames are not continuous human audiovisual approval.']};
await writeFile(`${root}/QA.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({exports,gameSeconds,genSeconds},null,2));
