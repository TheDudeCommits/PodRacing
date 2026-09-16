import { describe, expect, it } from 'vitest';
import { PodracerAudio } from '../../src/audio';
import { RECORDED_RACE_MUSIC, RECORDED_VOICE_LINES } from '../../src/audio/catalogue';

class Param {
  value: number;
  readonly events: Array<{ kind: string; value?: number; time: number }> = [];
  constructor(value = 0) { this.value = value; }
  cancelScheduledValues(time: number): this { this.events.push({ kind: 'cancel', time }); return this; }
  setValueAtTime(value: number, time: number): this { this.value = value; this.events.push({ kind: 'set', value, time }); return this; }
  linearRampToValueAtTime(value: number, time: number): this { this.value = value; this.events.push({ kind: 'linear', value, time }); return this; }
  exponentialRampToValueAtTime(value: number, time: number): this { this.value = value; this.events.push({ kind: 'exponential', value, time }); return this; }
  setTargetAtTime(value: number, time: number): this { this.value = value; this.events.push({ kind: 'target', value, time }); return this; }
}
class Node {
  readonly connections: Node[] = [];
  connect<T extends Node>(destination: T): T { this.connections.push(destination); return destination; }
  disconnect(): void { this.connections.length = 0; }
}
class Gain extends Node { readonly gain = new Param(1); }
class Filter extends Node { type = 'lowpass'; readonly frequency = new Param(350); readonly Q = new Param(1); readonly gain = new Param(0); }
class Compressor extends Node { readonly threshold = new Param(-24); readonly knee = new Param(30); readonly ratio = new Param(12); readonly attack = new Param(0.003); readonly release = new Param(0.25); }
class Source extends Node {
  buffer: unknown = null; loop = false; loopStart = 0; loopEnd = 0; readonly playbackRate = new Param(1);
  readonly starts: number[] = []; readonly stops: number[] = [];
  start(time = 0): void { this.starts.push(time); }
  stop(time = 0): void { this.stops.push(time); }
  addEventListener(): void { /* ended listeners are not exercised here */ }
}
class Panner extends Node { readonly pan = new Param(0); }
class Delay extends Node { readonly delayTime = new Param(0); }
class Shaper extends Node { curve: unknown = null; oversample = 'none'; }
class Buffer {
  readonly duration: number;
  constructor(readonly numberOfChannels: number, readonly length: number, readonly sampleRate: number) { this.duration = length / sampleRate; }
  getChannelData(): Float32Array { return new Float32Array(this.length); }
}
class Context {
  state: AudioContextState = 'running';
  currentTime = 0;
  readonly sampleRate = 8_000;
  readonly destination = new Node();
  readonly sources: Source[] = [];
  readonly gains: Gain[] = [];
  createGain(): Gain { const node = new Gain(); this.gains.push(node); return node; }
  createDynamicsCompressor(): Compressor { return new Compressor(); }
  createBufferSource(): Source { const node = new Source(); this.sources.push(node); return node; }
  createBiquadFilter(): Filter { return new Filter(); }
  createStereoPanner(): Panner { return new Panner(); }
  createDelay(): Delay { return new Delay(); }
  createWaveShaper(): Shaper { return new Shaper(); }
  async decodeAudioData(): Promise<Buffer> { return new Buffer(2, 80_000, 8_000); }
  async resume(): Promise<void> { this.state = 'running'; }
  async close(): Promise<void> { this.state = 'closed'; }
}

const flush = async (ticks = 24): Promise<void> => {
  for (let index = 0; index < ticks; index += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('race-phase music', () => {
  it('rotates a sourced race score in beneath the engines and hands back to the selection score', async () => {
    const context = new Context();
    const fetched: string[] = [];
    const audio = new PodracerAudio({
      createContext: () => context as unknown as AudioContext,
      fetchAudio: async (url) => { fetched.push(url); return new ArrayBuffer(16); },
    });
    await audio.startMenuMusic('/audio/podracing-selection-intro.webm');
    await flush();
    expect(audio.menuMusicStatus.mode).toBe('selection');
    expect(audio.menuMusicStatus.raceTrack).toBeNull();
    expect(fetched).not.toContain(RECORDED_RACE_MUSIC[0]!.url);

    audio.transitionMenuMusicToRace();
    await flush();
    expect(audio.menuMusicStatus.mode).toBe('race');
    expect(audio.menuMusicStatus.raceTrack).toBe(RECORDED_RACE_MUSIC[0]!.url);
    expect(fetched).toContain(RECORDED_RACE_MUSIC[0]!.url);
    const race = context.sources.at(-1)!;
    expect(race.loop).toBe(true);
    expect(race.starts).toHaveLength(1);
    // The race group fades up to its steady level; the music bus sits higher than the old restrained race mix.
    const raceGroup = race.connections[0] as Gain;
    expect(raceGroup.gain.events.at(-1)).toMatchObject({ kind: 'linear', value: 0.56 });
    const musicBus = raceGroup.connections[0] as Gain;
    expect(musicBus.gain.events.at(-1)).toMatchObject({ kind: 'linear', value: 0.5 });

    audio.transitionMenuMusicToSelection();
    expect(audio.menuMusicStatus.raceTrack).toBeNull();
    expect(race.stops).toHaveLength(1);
    expect(musicBus.gain.events.at(-1)).toMatchObject({ kind: 'linear', value: 0.78 });

    // The next race takes the other track, so back-to-back races do not repeat.
    audio.transitionMenuMusicToRace();
    await flush();
    expect(audio.menuMusicStatus.raceTrack).toBe(RECORDED_RACE_MUSIC[1]!.url);
    audio.transitionMenuMusicToRace();
    await flush();
    expect(audio.menuMusicStatus.raceTrack).toBe(RECORDED_RACE_MUSIC[0]!.url);
    audio.dispose();
    expect(audio.menuMusicStatus.raceTrack).toBeNull();
  });

  it('speaks sourced voice lines one at a time through the callout bus and lifts the score on the final lap', async () => {
    const context = new Context();
    const audio = new PodracerAudio({ createContext: () => context as unknown as AudioContext, fetchAudio: async () => new ArrayBuffer(16) });
    await audio.startMenuMusic('/audio/podracing-selection-intro.webm');
    await flush();
    audio.transitionMenuMusicToRace();
    await flush();
    const race = context.sources.at(-1)!;
    expect(audio.playVoiceLine(RECORDED_VOICE_LINES['revenge-pass'])).toBe(true);
    const line = context.sources.at(-1)!;
    expect(line).not.toBe(race);
    expect(line.starts).toHaveLength(1);
    // No overlap: a second beat in the same breath is dropped, not stacked.
    expect(audio.playVoiceLine(RECORDED_VOICE_LINES['final-lap'])).toBe(false);
    expect(audio.raceMusicIntensity).toBe(false);
    audio.setRaceMusicIntensity(true);
    expect(audio.raceMusicIntensity).toBe(true);
    expect(race.playbackRate.events.at(-1)).toMatchObject({ kind: 'linear', value: 1.05 });
    const group = race.connections[0] as Gain;
    expect(group.gain.events.at(-1)).toMatchObject({ kind: 'linear', value: 0.56 * 1.22 });
    audio.transitionMenuMusicToSelection();
    audio.transitionMenuMusicToRace();
    expect(audio.raceMusicIntensity).toBe(false);
    audio.dispose();
  });

  it('keeps the selection score audible at its former race level when no race score is scheduled', () => {
    const audio = new PodracerAudio({ createContext: () => { throw new Error('unavailable'); } });
    audio.transitionMenuMusicToRace();
    expect(audio.menuMusicStatus).toMatchObject({ mode: 'off', raceTrack: null });
    audio.dispose();
  });
});
