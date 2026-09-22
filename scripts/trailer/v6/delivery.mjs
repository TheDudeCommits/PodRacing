/** Publication notes and byte-level provenance for the final media package. */
import { readFile,writeFile,stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
const root='output/trailer-v6';
const edl=JSON.parse(await readFile(`${root}/edl.json`));
const audio=JSON.parse(await readFile(`${root}/audio-edl.json`));
const pad=n=>String(n).padStart(2,'0');
const tc=n=>`${pad(Math.floor(n/60))}:${(n%60).toFixed(3).padStart(6,'0')}`;
const generated=edl.cuts.filter(s=>s.kind==='gen');
const ranges=generated.map(s=>`${tc(s.at)}–${tc(s.at+s.dur)} — ${s.src}`).join('\n');
const description=(await readFile('scripts/trailer/v6/PUBLICATION.txt','utf8')).trimEnd()+'\n';
await writeFile(`${root}/PUBLICATION.txt`,description+'\nGenerated cinematic windows:\n'+ranges+'\n');
const files=new Set([`${root}/PodRacing-Trailer-v6.mp4`,`${root}/PodRacing-Trailer-v6-web.mp4`,`${root}/title.mp4`,`${root}/edl.json`,`${root}/audio-edl.json`,`${root}/audio-render.log`,`${root}/QA.json`,`${root}/PUBLICATION.txt`,...audio.layers.map(l=>l.file)]);
for(const s of edl.cuts){
 files.add(s.sourceOverride??(s.kind==='game'||s.kind==='menu'?`${root}/takes/${s.src}.mp4`:s.kind==='title'?`${root}/title.mp4`:s.old?`output/trailer/gen/${s.src}.mp4`:`${root}/generated/${s.src}.mp4`));
 if(s.kind==='game'||s.kind==='menu')files.add(`${root}/takes/${s.src}.json`);
 
}
const entries=[];
for(const file of [...files].sort()){
 const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);
 entries.push({file,bytes:(await stat(file)).size,sha256:hash.digest('hex')});
}
await writeFile(`${root}/MANIFEST.json`,JSON.stringify({createdAt:new Date().toISOString(),entries},null,2));
console.log(`Wrote publication notes and ${entries.length} file hashes.`);
