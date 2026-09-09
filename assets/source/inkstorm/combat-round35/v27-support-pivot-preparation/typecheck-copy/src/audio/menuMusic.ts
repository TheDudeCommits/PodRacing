/**
 * Original selection-screen score authored for Now This Is PodRacing.
 *
 * The supplied intro resolves around A minor / C major at roughly 148 BPM.
 * The score keeps that tonal centre and pulse for a clean transition, but uses
 * its own progression, voicings, and syncopated motif. No source melody is
 * transcribed or reproduced here.
 */

export const MENU_MUSIC_BPM = 148;
export const MENU_MUSIC_TONIC_MIDI = 57; // A3
export const MENU_MUSIC_BEATS_PER_BAR = 4;
export const MENU_MUSIC_BAR_COUNT = 16;

export type MenuScoreVoice = 'strings' | 'brass' | 'pulse' | 'bass' | 'bell';

export interface MenuScoreNote {
  beat: number;
  durationBeats: number;
  midi: number;
  gain: number;
  pan: number;
  voice: MenuScoreVoice;
}

export interface MenuScoreHit {
  beat: number;
  gain: number;
  kind: 'drum' | 'cymbal';
  pan: number;
}

export interface MenuScorePlan {
  bpm: number;
  beatsPerBar: number;
  bars: number;
  durationSeconds: number;
  tonicMidi: number;
  notes: readonly MenuScoreNote[];
  hits: readonly MenuScoreHit[];
}

export interface MenuMusicTransitionSchedule {
  introStartSeconds: number;
  introEndSeconds: number;
  scoreStartSeconds: number;
  scoreFadeEndSeconds: number;
  crossfadeSeconds: number;
}

export interface AsyncMenuScoreRenderOptions {
  eventsPerYield?: number;
  samplesPerYield?: number;
  yieldControl?: () => Promise<void>;
}

const CHORD_VOICINGS: readonly (readonly number[])[] = Object.freeze([
  [45, 52, 59, 60, 64], // Am(add9)
  [48, 55, 62, 64, 69], // C6/9
  [41, 48, 52, 57, 59], // Fmaj7(#11)
  [38, 45, 48, 52, 53], // Dm9
  [40, 47, 52, 55, 59], // Em7
  [43, 50, 52, 59, 64], // G6
  [41, 48, 52, 55, 57], // Fmaj9
  [40, 47, 50, 56, 59], // E7sus(b9), resolving toward A
  [48, 55, 59, 62, 64], // Cmaj9
  [47, 50, 55, 59, 64], // G6/B
  [45, 52, 57, 59, 60], // Am9
  [43, 47, 52, 55, 59], // Em7/G
  [41, 48, 53, 57, 62], // F6/9
  [38, 45, 48, 52, 57], // Dm9
  [40, 47, 50, 57, 59], // E7sus4
  [40, 47, 52, 56, 59], // E(add b6), a dark dominant handoff
]);

const LEAD_CELLS: readonly (readonly [number, number, number][])[] = Object.freeze([
  [[0, 69, 0.72], [1.5, 76, 0.46], [2.5, 71, 0.78]],
  [[0.5, 74, 0.42], [1.75, 81, 0.58], [3, 79, 0.58]],
  [[0, 72, 0.66], [1.25, 71, 0.42], [2.25, 77, 0.72]],
  [[0.75, 69, 0.4], [1.5, 74, 0.52], [2.75, 76, 0.72]],
  [[0, 71, 0.62], [1, 76, 0.38], [2.5, 74, 0.8]],
  [[0.5, 67, 0.44], [1.5, 74, 0.48], [2.75, 76, 0.66]],
  [[0, 69, 0.58], [1.25, 72, 0.46], [2, 79, 0.74]],
  [[0.75, 68, 0.48], [1.75, 71, 0.42], [3, 76, 0.84]],
]);

function secondsPerBeat(bpm: number): number {
  return 60 / bpm;
}

/** Returns a fresh, deterministic score plan suitable for tests and rendering. */
export function createOriginalMenuScorePlan(): MenuScorePlan {
  const notes: MenuScoreNote[] = [];
  const hits: MenuScoreHit[] = [];

  for (let bar = 0; bar < MENU_MUSIC_BAR_COUNT; bar += 1) {
    const chord = CHORD_VOICINGS[bar];
    if (!chord) continue;
    const barBeat = bar * MENU_MUSIC_BEATS_PER_BAR;

    // Broad chord beds preserve the harmonic identity while the propulsion
    // comes from short string pulses and low drums.
    for (let voiceIndex = 0; voiceIndex < chord.length; voiceIndex += 1) {
      const midi = chord[voiceIndex];
      if (midi === undefined) continue;
      notes.push({
        beat: barBeat,
        durationBeats: 4.35,
        midi: midi + (voiceIndex >= 3 ? 12 : 0),
        gain: voiceIndex === 0 ? 0.072 : 0.045,
        pan: (voiceIndex - 2) * 0.2,
        voice: 'strings',
      });
    }

    const bass = chord[0];
    if (bass !== undefined) {
      notes.push({ beat: barBeat, durationBeats: 1.65, midi: bass, gain: 0.19, pan: -0.08, voice: 'bass' });
      notes.push({ beat: barBeat + 2, durationBeats: 1.45, midi: bass + 7, gain: 0.13, pan: 0.08, voice: 'bass' });
    }

    const pulseNotes = chord.slice(1);
    for (let pulse = 0; pulse < 8; pulse += 1) {
      const midi = pulseNotes[(pulse * 3 + bar) % pulseNotes.length];
      if (midi === undefined) continue;
      notes.push({
        beat: barBeat + pulse * 0.5,
        durationBeats: pulse % 4 === 3 ? 0.42 : 0.27,
        midi: midi + 12 + (pulse % 3 === 2 ? 12 : 0),
        gain: pulse % 2 === 0 ? 0.043 : 0.032,
        pan: pulse % 2 === 0 ? -0.32 : 0.32,
        voice: pulse % 4 === 3 ? 'bell' : 'pulse',
      });
    }

    const cell = LEAD_CELLS[bar % LEAD_CELLS.length];
    if (cell && bar >= 2) {
      for (const [offset, midi, duration] of cell) {
        notes.push({
          beat: barBeat + offset,
          durationBeats: duration,
          midi: midi + (bar >= 8 ? 0 : -12),
          gain: bar % 4 === 3 ? 0.105 : 0.082,
          pan: ((bar % 3) - 1) * 0.16,
          voice: 'brass',
        });
      }
    }

    hits.push({ beat: barBeat, gain: 0.2, kind: 'drum', pan: -0.12 });
    hits.push({ beat: barBeat + 1.5, gain: 0.105, kind: 'drum', pan: 0.12 });
    hits.push({ beat: barBeat + 2.5, gain: 0.145, kind: 'drum', pan: 0.04 });
    if (bar % 4 === 0) hits.push({ beat: barBeat, gain: 0.055, kind: 'cymbal', pan: 0.22 });
  }

  const totalBeats = MENU_MUSIC_BEATS_PER_BAR * MENU_MUSIC_BAR_COUNT;
  return {
    bpm: MENU_MUSIC_BPM,
    beatsPerBar: MENU_MUSIC_BEATS_PER_BAR,
    bars: MENU_MUSIC_BAR_COUNT,
    durationSeconds: totalBeats * secondsPerBeat(MENU_MUSIC_BPM),
    tonicMidi: MENU_MUSIC_TONIC_MIDI,
    notes,
    hits,
  };
}

/**
 * The synth begins under the intro's decaying tail. The intro itself is not
 * cropped or looped: its source plays once, in full, at its original speed.
 */
export function createMenuMusicTransitionSchedule(
  introDurationSeconds: number,
  desiredCrossfadeSeconds = 1.55,
): MenuMusicTransitionSchedule {
  const introDuration = Number.isFinite(introDurationSeconds)
    ? Math.max(0.1, introDurationSeconds)
    : 0.1;
  const crossfade = Math.min(
    introDuration * 0.72,
    Math.max(0.25, Number.isFinite(desiredCrossfadeSeconds) ? desiredCrossfadeSeconds : 1.55),
  );
  const scoreStart = Math.max(0, introDuration - crossfade);
  return {
    introStartSeconds: 0,
    introEndSeconds: introDuration,
    scoreStartSeconds: scoreStart,
    scoreFadeEndSeconds: introDuration + 0.08,
    crossfadeSeconds: crossfade,
  };
}

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function seededNoise(seed: number): number {
  let state = seed | 0;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return ((state >>> 0) / 0xffffffff) * 2 - 1;
}

function addCircularSample(channel: Float32Array, index: number, value: number): void {
  const wrapped = ((index % channel.length) + channel.length) % channel.length;
  channel[wrapped] = (channel[wrapped] ?? 0) + value;
}

function renderNote(
  channels: readonly [Float32Array, Float32Array],
  sampleRate: number,
  secondsPerScoreBeat: number,
  note: MenuScoreNote,
): void {
  const start = Math.round(note.beat * secondsPerScoreBeat * sampleRate);
  const duration = note.durationBeats * secondsPerScoreBeat;
  const release = note.voice === 'strings' ? 0.62 : note.voice === 'bell' ? 0.52 : 0.24;
  const sampleCount = Math.max(1, Math.round((duration + release) * sampleRate));
  const frequency = midiToFrequency(note.midi);
  const pan = Math.min(1, Math.max(-1, note.pan));
  const leftPan = Math.cos((pan + 1) * Math.PI * 0.25);
  const rightPan = Math.sin((pan + 1) * Math.PI * 0.25);

  for (let sample = 0; sample < sampleCount; sample += 1) {
    const time = sample / sampleRate;
    const attack = note.voice === 'strings' ? 0.24 : note.voice === 'brass' ? 0.035 : 0.008;
    const attackEnvelope = Math.min(1, time / attack);
    const releaseEnvelope = time <= duration ? 1 : Math.max(0, 1 - (time - duration) / release);
    const envelope = attackEnvelope * releaseEnvelope;
    if (envelope <= 0) continue;

    const phase = Math.PI * 2 * frequency * time;
    let waveform: number;
    switch (note.voice) {
      case 'strings':
        waveform = Math.sin(phase) * 0.72 + Math.sin(phase * 2.002) * 0.19 + Math.sin(phase * 3.997) * 0.09;
        break;
      case 'brass': {
        const swell = 1 + Math.sin(time * Math.PI * 5.1) * 0.004;
        waveform = Math.sin(phase * swell) * 0.55 + Math.sin(phase * 2 * swell) * 0.27 + Math.sin(phase * 3 * swell) * 0.12;
        break;
      }
      case 'pulse':
        waveform = Math.sin(phase) * 0.68 + Math.sin(phase * 2) * 0.22 + Math.sin(phase * 4) * 0.1;
        break;
      case 'bass':
        waveform = Math.sin(phase) * 0.82 + Math.sin(phase * 2) * 0.18;
        break;
      case 'bell':
        waveform = (Math.sin(phase) * 0.62 + Math.sin(phase * 2.71) * 0.24 + Math.sin(phase * 4.09) * 0.14)
          * Math.exp(-time * 2.1);
        break;
    }
    const value = waveform * envelope * note.gain;
    addCircularSample(channels[0], start + sample, value * leftPan);
    addCircularSample(channels[1], start + sample, value * rightPan);
  }
}

function renderHit(
  channels: readonly [Float32Array, Float32Array],
  sampleRate: number,
  secondsPerScoreBeat: number,
  hit: MenuScoreHit,
  hitIndex: number,
): void {
  const start = Math.round(hit.beat * secondsPerScoreBeat * sampleRate);
  const duration = hit.kind === 'cymbal' ? 0.92 : 0.27;
  const count = Math.round(duration * sampleRate);
  const pan = Math.min(1, Math.max(-1, hit.pan));
  const leftPan = Math.cos((pan + 1) * Math.PI * 0.25);
  const rightPan = Math.sin((pan + 1) * Math.PI * 0.25);
  let filteredNoise = 0;
  for (let sample = 0; sample < count; sample += 1) {
    const time = sample / sampleRate;
    const envelope = Math.exp(-time * (hit.kind === 'cymbal' ? 4.7 : 15.5));
    const noise = seededNoise(0x504f4452 + hitIndex * 7_919 + sample * 31);
    filteredNoise += (noise - filteredNoise) * (hit.kind === 'cymbal' ? 0.72 : 0.19);
    const body = hit.kind === 'drum'
      ? Math.sin(Math.PI * 2 * (82 - time * 125) * time) * Math.exp(-time * 13)
      : 0;
    const value = (filteredNoise * (hit.kind === 'cymbal' ? 0.64 : 0.22) + body) * envelope * hit.gain;
    addCircularSample(channels[0], start + sample, value * leftPan);
    addCircularSample(channels[1], start + sample, value * rightPan);
  }
}

/** Renders the original loop into a Web Audio buffer; no downloaded score is used. */
export function renderOriginalMenuScore(
  context: BaseAudioContext,
  plan: MenuScorePlan = createOriginalMenuScorePlan(),
): AudioBuffer {
  const sampleRate = Math.min(context.sampleRate, 24_000);
  const length = Math.max(1, Math.round(plan.durationSeconds * sampleRate));
  const buffer = context.createBuffer(2, length, sampleRate);
  const channels: [Float32Array, Float32Array] = [
    buffer.getChannelData(0),
    buffer.getChannelData(1),
  ];
  const secondsPerScoreBeat = secondsPerBeat(plan.bpm);

  for (const note of plan.notes) renderNote(channels, sampleRate, secondsPerScoreBeat, note);
  for (let index = 0; index < plan.hits.length; index += 1) {
    const hit = plan.hits[index];
    if (hit) renderHit(channels, sampleRate, secondsPerScoreBeat, hit, index);
  }

  // A short circular echo gives the small procedural orchestra a shared hall
  // and also keeps the loop boundary continuous.
  const dryLeft = channels[0].slice();
  const dryRight = channels[1].slice();
  const delayA = Math.round(sampleRate * 0.173);
  const delayB = Math.round(sampleRate * 0.347);
  let peak = 0;
  for (let index = 0; index < length; index += 1) {
    const a = (index - delayA + length) % length;
    const b = (index - delayB + length) % length;
    const left = (channels[0][index] ?? 0) + (dryRight[a] ?? 0) * 0.16 + (dryLeft[b] ?? 0) * 0.09;
    const right = (channels[1][index] ?? 0) + (dryLeft[a] ?? 0) * 0.16 + (dryRight[b] ?? 0) * 0.09;
    channels[0][index] = Math.tanh(left * 1.18);
    channels[1][index] = Math.tanh(right * 1.18);
    peak = Math.max(peak, Math.abs(channels[0][index] ?? 0), Math.abs(channels[1][index] ?? 0));
  }
  const normalization = peak > 0 ? Math.min(1.55, 0.84 / peak) : 1;
  if (normalization !== 1) {
    for (let index = 0; index < length; index += 1) {
      channels[0][index] = (channels[0][index] ?? 0) * normalization;
      channels[1][index] = (channels[1][index] ?? 0) * normalization;
    }
  }
  return buffer;
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}

/**
 * Cooperative form used by the live menu. Individual orchestral events and
 * reverb blocks are bounded so score generation cannot stall WebGL rendering.
 */
export async function renderOriginalMenuScoreAsync(
  context: BaseAudioContext,
  plan: MenuScorePlan = createOriginalMenuScorePlan(),
  options: AsyncMenuScoreRenderOptions = {},
): Promise<AudioBuffer> {
  const sampleRate = Math.min(context.sampleRate, 24_000);
  const length = Math.max(1, Math.round(plan.durationSeconds * sampleRate));
  const buffer = context.createBuffer(2, length, sampleRate);
  const channels: [Float32Array, Float32Array] = [
    buffer.getChannelData(0),
    buffer.getChannelData(1),
  ];
  const secondsPerScoreBeat = secondsPerBeat(plan.bpm);
  // Two voices at a time keeps even the longest string beds below a normal
  // 60 fps frame budget on the target MacBook, while the intro gives the full
  // score several seconds to finish before its first audible beat.
  const eventsPerYield = Math.max(1, Math.floor(options.eventsPerYield ?? 2));
  const samplesPerYield = Math.max(1_024, Math.floor(options.samplesPerYield ?? 8_192));
  const yieldControl = options.yieldControl ?? yieldToBrowser;
  let renderedEvents = 0;

  for (const note of plan.notes) {
    renderNote(channels, sampleRate, secondsPerScoreBeat, note);
    renderedEvents += 1;
    if (renderedEvents % eventsPerYield === 0) await yieldControl();
  }
  for (let index = 0; index < plan.hits.length; index += 1) {
    const hit = plan.hits[index];
    if (hit) renderHit(channels, sampleRate, secondsPerScoreBeat, hit, index);
    renderedEvents += 1;
    if (renderedEvents % eventsPerYield === 0) await yieldControl();
  }

  const dryLeft = channels[0].slice();
  const dryRight = channels[1].slice();
  const delayA = Math.round(sampleRate * 0.173);
  const delayB = Math.round(sampleRate * 0.347);
  let peak = 0;
  for (let block = 0; block < length; block += samplesPerYield) {
    const end = Math.min(length, block + samplesPerYield);
    for (let index = block; index < end; index += 1) {
      const a = (index - delayA + length) % length;
      const b = (index - delayB + length) % length;
      const left = (channels[0][index] ?? 0) + (dryRight[a] ?? 0) * 0.16 + (dryLeft[b] ?? 0) * 0.09;
      const right = (channels[1][index] ?? 0) + (dryLeft[a] ?? 0) * 0.16 + (dryRight[b] ?? 0) * 0.09;
      channels[0][index] = Math.tanh(left * 1.18);
      channels[1][index] = Math.tanh(right * 1.18);
      peak = Math.max(peak, Math.abs(channels[0][index] ?? 0), Math.abs(channels[1][index] ?? 0));
    }
    if (end < length) await yieldControl();
  }

  const normalization = peak > 0 ? Math.min(1.55, 0.84 / peak) : 1;
  if (normalization !== 1) {
    for (let block = 0; block < length; block += samplesPerYield) {
      const end = Math.min(length, block + samplesPerYield);
      for (let index = block; index < end; index += 1) {
        channels[0][index] = (channels[0][index] ?? 0) * normalization;
        channels[1][index] = (channels[1][index] ?? 0) * normalization;
      }
      if (end < length) await yieldControl();
    }
  }
  return buffer;
}
