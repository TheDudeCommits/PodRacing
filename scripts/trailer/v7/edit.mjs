/**
 * Thrustline showreel edit: beat-aligned cuts on "Juggernaut" (126 BPM), cinematic
 * letterbox, title cards, and the game's own announcer ducking the music.
 *   node scripts/trailer/v7/edit.mjs
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile), root = 'output/trailer-v7', fps = 60, beat = 60 / 126;
const game = (src, b, from = .3) => ({ kind: 'game', src, b, from });
export const CUTS = [
  { kind: 'card', src: 'card-open', b: 8 },
  { kind: 'still', src: 'menu', b: 4 },
  // GO lands on the downbeat of bar five.
  game('ceremony', 12, .123),
  game('colossus-run', 8), game('colossus-wide', 4), game('canyon-drift', 4),
  game('frost-wide', 8, .15), game('frost-chase', 4),
  game('ember-volcano', 8, .15), game('ember-flame', 4),
  game('verdant-canopy', 8, .15), game('verdant-wide', 4),
  game('impact', 4),
  { kind: 'card', src: 'card-end', b: 12 },
];
let cursor = 0;
for (const s of CUTS) { const start = Math.round(cursor * beat * fps); cursor += s.b; const end = Math.round(cursor * beat * fps); Object.assign(s, { at: start / fps, dur: (end - start) / fps, frames: end - start }); }
export const duration = Math.round(cursor * beat * fps) / fps;
const cutAt = id => CUTS.find(s => s.src === id).at;
/** Announcer lines from the game itself, placed on the timeline in seconds. */
const VOICE = [
  ['welcome', .35],
  ['count-3', cutAt('ceremony') + .02], ['count-2', cutAt('ceremony') + .877], ['count-1', cutAt('ceremony') + 1.877], ['count-go', cutAt('ceremony') + 2.857],
  ['world-desert', cutAt('colossus-run') + .1], ['world-frozen', cutAt('frost-wide') + .1],
  ['world-volcanic', cutAt('ember-volcano') + .1], ['world-jungle', cutAt('verdant-canopy') + .1],
  ['takedown', cutAt('impact') + .35], ['victory', cutAt('card-end') + .4],
];
const MUSIC_FROM = 65 * beat;
const ff = async a => run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...a], { maxBuffer: 8e6 });
await mkdir(`${root}/edit-clips`, { recursive: true });
await writeFile(`${root}/edl.json`, JSON.stringify({ fps, bpm: 126, duration, musicFrom: MUSIC_FROM, cuts: CUTS, voice: VOICE }, null, 2));
for (let i = 0; i < CUTS.length; i++) {
  const s = CUTS[i], out = `${root}/edit-clips/${String(i).padStart(2, '0')}.mp4`;
  let inputs, filter;
  if (s.kind === 'game') {
    const src = `${root}/takes/${s.src}.mp4`;
    await access(src);
    inputs = ['-ss', String(s.from), '-i', src];
    filter = `[0:v]scale=1920:1080:flags=lanczos,fps=60,setsar=1,trim=duration=${s.dur},setpts=PTS-STARTPTS,drawbox=x=0:y=0:w=iw:h=112:color=black:t=fill,drawbox=x=0:y=ih-112:w=iw:h=112:color=black:t=fill`;
  } else {
    inputs = ['-loop', '1', '-framerate', '60', '-t', String(s.dur + .2), '-i', `${root}/${s.src}.png`];
    const push = s.kind === 'still' ? .06 : .035;
    filter = `[0:v]scale=3840:2160,zoompan=z='1+${push}*on/${s.frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${s.frames}:s=1920x1080:fps=60,setsar=1,trim=duration=${s.dur},setpts=PTS-STARTPTS`;
    if (s.src === 'card-open') filter += ',fade=t=in:st=0:d=0.8';
    if (s.src === 'card-end') filter += `,fade=t=in:st=0:d=0.35,fade=t=out:st=${(s.dur - 1.2).toFixed(3)}:d=1.2`;
  }
  await ff([...inputs, '-filter_complex', filter + '[v]', '-map', '[v]', '-frames:v', String(s.frames), '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '16', '-pix_fmt', 'yuv420p', out]);
  console.log(`cut ${i + 1}/${CUTS.length} ${s.src} ${s.dur.toFixed(3)}s @ ${s.at.toFixed(3)}s`);
}
await writeFile(`${root}/concat.txt`, CUTS.map((_, i) => `file 'edit-clips/${String(i).padStart(2, '0')}.mp4'`).join('\n'));
await ff(['-f', 'concat', '-safe', '0', '-i', `${root}/concat.txt`, '-c', 'copy', `${root}/picture.mp4`]);
// Music bed ducked under the announcer, then loudness-normalised for web.
const voiceInputs = VOICE.flatMap(([id]) => ['-i', `public/audio/announcer/${id}.ogg`]);
const fmt = 'aformat=sample_rates=48000:channel_layouts=stereo';
const lines = VOICE.map(([, t], k) => `[${k + 1}:a]${fmt},adelay=${Math.round(t * 1000)}|${Math.round(t * 1000)}[v${k}]`);
const graph = [
  `[0:a]${fmt},atrim=start=${MUSIC_FROM.toFixed(4)}:duration=${duration},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.4,afade=t=out:st=${(duration - 2.4).toFixed(3)}:d=2.4,volume=0.85[m]`,
  ...lines,
  `${VOICE.map((_, k) => `[v${k}]`).join('')}amix=inputs=${VOICE.length}:normalize=0:duration=longest,volume=1.25,apad[vo]`,
  `[vo]asplit=2[vo1][vo2]`,
  `[m][vo1]sidechaincompress=threshold=0.035:ratio=6:attack=12:release=380[md]`,
  `[md][vo2]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.2:LRA=11,atrim=duration=${duration}[out]`,
].join(';');
await ff(['-i', 'public/audio/salt-dusk/juggernaut.mp3', ...voiceInputs, '-filter_complex', graph, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', `${root}/mix.wav`]);
await ff(['-i', `${root}/picture.mp4`, '-i', `${root}/mix.wav`, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-t', String(duration), '-movflags', '+faststart', `${root}/Thrustline-Showreel.mp4`]);
await ff(['-i', `${root}/Thrustline-Showreel.mp4`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', `${root}/Thrustline-Showreel-web.mp4`]);
console.log('showreel', duration.toFixed(3), 's');
