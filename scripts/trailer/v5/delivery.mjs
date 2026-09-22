/** Publication notes and byte-level provenance for the final media package. */
import { readFile,writeFile,stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
const root='output/trailer-v5';
const edl=JSON.parse(await readFile(`${root}/edl.json`));
const audio=JSON.parse(await readFile(`${root}/audio-edl.json`));
const pad=n=>String(n).padStart(2,'0');
const tc=n=>`${pad(Math.floor(n/60))}:${(n%60).toFixed(3).padStart(6,'0')}`;
const generated=edl.cuts.filter(s=>s.kind==='gen');
const ranges=generated.map(s=>`${tc(s.at)}–${tc(s.at+s.dur)} — ${s.src}`).join('\n');
const description=`NOW THIS IS PODRACING — The Line Is Yours\n\nFour machines. Eight racers. One desert circuit.\nPlay free in your browser: https://podracing.dude.work\n\nMusic: “Race The Sun” by Scott Buckley — released under CC BY 4.0.\nhttps://www.scottbuckley.com.au/library/race-the-sun/\nhttps://creativecommons.org/licenses/by/4.0/\nMusic edited for this trailer. Sound effects use the game's existing credited source bank.\n\nThis trailer combines real gameplay with AI-generated cinematic inserts made using Seedance 2.5 through Higgsfield. Gameplay was captured offline at 60 fps using the game's actual simulation, with staged starting positions and capture cameras. The in-game impact shot uses a diagnostic wreck trigger.\n\nGenerated cinematic windows:\n${ranges}\n\nAll other racing shots come from the game. Typography occupies ${tc(63.9)}–${tc(67.8)} and ${tc(68.783333)}–${tc(edl.duration)}.\n`;
await writeFile(`${root}/PUBLICATION.txt`,description);
const files=new Set([`${root}/PodRacing-Trailer-v5.mp4`,`${root}/PodRacing-Trailer-v5-web.mp4`,`${root}/title.mp4`,`${root}/higgsedit-title-project.zip`,`${root}/edl.json`,`${root}/audio-edl.json`,`${root}/generation-receipts.json`,`${root}/QA.json`,...audio.layers.map(l=>l.file)]);
for(const s of edl.cuts){
 files.add(s.kind==='game'?`${root}/takes/${s.src}.mp4`:s.kind==='title'?`${root}/title.mp4`:s.old?`output/trailer/gen/${s.src}.mp4`:`${root}/generated/${s.src}.mp4`);
 if(s.kind==='game')files.add(`${root}/takes/${s.src}.json`);
 if(s.label)files.add(`${root}/labels/${s.label}.png`);
}
const entries=[];
for(const file of [...files].sort()){
 const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);
 entries.push({file,bytes:(await stat(file)).size,sha256:hash.digest('hex')});
}
await writeFile(`${root}/MANIFEST.json`,JSON.stringify({createdAt:new Date().toISOString(),entries},null,2));
console.log(`Wrote publication notes and ${entries.length} file hashes.`);
