/**
 * Assembles the trailer from the EDL: renders one normalised 1080p60 clip per
 * cut, concatenates them, applies a finishing grade, then mixes the sourced
 * music bed with the game's own sourced SFX hits.
 *   node scripts/trailer/edit.mjs [--skip-clips]
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { EDL, MUSIC, SFX } from './edl.mjs';

const run = promisify(execFile);
const ff = (args) => run('ffmpeg', ['-y', '-loglevel', 'error', ...args], { maxBuffer: 1 << 26 });
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

const FPS = 60, W = 1920, H = 1080;
const clipsDir = 'output/trailer/clips';
const outDir = 'output/trailer';
await mkdir(clipsDir, { recursive: true });

// A slow punch-in over the shot. zoompan re-renders each source frame once.
const pushFilter = (push, frames) => push && push > 1
  ? `zoompan=z='1+(${(push - 1).toFixed(4)})*on/${frames}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS}`
  : null;
const flashFilter = (n) => n ? `fade=t=in:st=0:d=${(n / FPS).toFixed(4)}:color=0xffe0c0` : null;

const gameInput = (src, inSec) => ['-framerate', String(FPS), '-start_number',
  String(Math.max(0, Math.round(inSec * FPS))), '-i', `output/trailer/shots/${src}/f%05d.jpg`];
const genInput = (src, inSec) => ['-ss', String(inSec), '-i', `output/trailer/gen/${src}.mp4`];

const skipClips = process.argv.includes('--skip-clips');
const list = [];

for (const [i, shot] of EDL.entries()) {
  const frames = Math.round(shot.dur * FPS);
  const name = `${String(i).padStart(2, '0')}-${shot.src}`;
  const out = `${clipsDir}/${name}.mp4`;
  list.push(out);
  if (skipClips && await exists(out)) continue;

  // Resolve a generated shot that never arrived to its real-gameplay fallback.
  let s = shot;
  if (s.kind === 'gen' && !(await exists(`output/trailer/gen/${s.src}.mp4`))) {
    if (!s.fallback) throw new Error(`missing generated clip ${s.src} and no fallback`);
    console.log(`  (${s.src} missing -> falling back to ${s.fallback.src})`);
    s = { ...s, ...s.fallback };
  }

  const chain = [];
  const enc = ['-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-r', String(FPS),
    '-pix_fmt', 'yuv420p', '-an', '-frames:v', String(frames)];

  if (s.kind === 'card') {
    const plateKind = s.plateKind ?? 'game';
    const plateIn = plateKind === 'gen'
      ? genInput(s.plate, s.plateIn ?? 0)
      : gameInput(s.plate, s.plateIn ?? 0);
    const bg = [
      plateKind === 'gen' ? `scale=${W}:${H},fps=${FPS}` : null,
      pushFilter(s.push ?? 1.04, frames),
      'gblur=sigma=4',
      `eq=brightness=-${(s.dim ?? 0.34).toFixed(2)}:saturation=0.72`,
      flashFilter(s.flash),
    ].filter(Boolean).join(',');
    await ff([...plateIn, '-loop', '1', '-i', `output/trailer/cards/${s.src}.png`,
      '-filter_complex',
      `[0:v]${bg}[bg];[1:v]format=rgba,fade=t=in:st=0:d=0.12:alpha=1[fg];[bg][fg]overlay=0:0:format=auto[v]`,
      '-map', '[v]', ...enc, out]);
  } else {
    const input = s.kind === 'gen' ? genInput(s.src, s.in ?? 0) : gameInput(s.src, s.in ?? 0);
    chain.push(s.kind === 'gen' ? `scale=${W}:${H},fps=${FPS}` : `scale=${W}:${H}`);
    const p = pushFilter(s.push, frames); if (p) chain.push(p);
    const f = flashFilter(s.flash); if (f) chain.push(f);
    await ff([...input, '-vf', chain.join(','), ...enc, out]);
  }
  console.log(`clip ${name} ${shot.dur}s`);
}

// Concat: every clip shares codec and timebase, so this is a stream copy.
await writeFile(`${outDir}/concat.txt`, list.map((p) => `file 'clips/${p.split('/').pop()}'`).join('\n'));
await ff(['-f', 'concat', '-safe', '0', '-i', `${outDir}/concat.txt`, '-c', 'copy', `${outDir}/cut-raw.mp4`]);
console.log('concatenated');

// Finishing pass: a light trailer grade, vignette and grain over the whole cut.
await ff(['-i', `${outDir}/cut-raw.mp4`, '-vf',
  'eq=contrast=1.07:saturation=1.12:gamma=0.98,unsharp=5:5:0.45:5:5:0.0,vignette=PI/5,noise=alls=3:allf=t+u,format=yuv420p',
  '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-r', String(FPS), '-an', `${outDir}/cut-graded.mp4`]);
console.log('graded');

// Audio: sourced music bed plus the game's own sourced SFX, limited and normalised.
const aIn = ['-ss', String(MUSIC.in), '-t', String(MUSIC.dur), '-i', MUSIC.file];
const aFilters = [`[0:a]afade=t=in:st=0:d=0.5,afade=t=out:st=${MUSIC.dur - 3}:d=3,volume=0.92[m]`];
const mixLabels = ['[m]'];
SFX.forEach((s, i) => {
  aIn.push('-i', s.file);
  const ms = Math.round(s.at * 1000);
  aFilters.push(`[${i + 1}:a]aformat=channel_layouts=stereo,adelay=${ms}|${ms},volume=${s.gain}[s${i}]`);
  mixLabels.push(`[s${i}]`);
});
aFilters.push(`${mixLabels.join('')}amix=inputs=${mixLabels.length}:normalize=0:duration=first[mixed]`);
aFilters.push(`[mixed]alimiter=limit=0.97,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
await ff([...aIn, '-filter_complex', aFilters.join(';'), '-map', '[a]',
  '-c:a', 'pcm_s16le', '-ar', '48000', `${outDir}/mix.wav`]);
console.log('mixed audio');

await ff(['-i', `${outDir}/cut-graded.mp4`, '-i', `${outDir}/mix.wav`,
  '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
  '-movflags', '+faststart', '-shortest', `${outDir}/PodRacing-Trailer.mp4`]);
console.log('done -> output/trailer/PodRacing-Trailer.mp4');
