/** Finish already captured/generated sources, then validate both delivery files. */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const root='output/trailer-v6';
const run=(bin,args)=>new Promise((resolve,reject)=>{
  const child=spawn(bin,args,{stdio:'inherit'});
  child.on('error',reject);
  child.on('exit',code=>code===0?resolve():reject(new Error(`${bin} exited ${code}`)));
});
await run(process.execPath,['scripts/trailer/v6/edit.mjs','--resume']);
await run(process.execPath,['scripts/trailer/v6/sound.mjs']);
const {duration}=JSON.parse(await readFile(`${root}/edl.json`));
await run('ffmpeg',['-y','-hide_banner','-loglevel','warning','-i',`${root}/picture.mp4`,'-i',`${root}/mix.wav`,
  '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-t',String(duration),'-movflags','+faststart',`${root}/PodRacing-Trailer-v6.mp4`]);
await run('ffmpeg',['-y','-hide_banner','-loglevel','warning','-i',`${root}/PodRacing-Trailer-v6.mp4`,
  '-c:v','libx264','-preset','slow','-crf','20','-c:a','aac','-b:a','192k','-movflags','+faststart',`${root}/PodRacing-Trailer-v6-web.mp4`]);
await run(process.execPath,['scripts/trailer/v6/qa.mjs']);
