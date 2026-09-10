const cryptoModule: string = 'node:crypto', fileModule: string = 'node:fs';
const { createHash } = await import(/* @vite-ignore */ cryptoModule);
const { readFileSync } = await import(/* @vite-ignore */ fileModule);
import { describe, expect, it } from 'vitest';
import { PodracerAudio, createMenuMusicTransitionSchedule } from '../../src/audio';

describe('existing music and preserved supplied intro', () => {
  it('preserves the authorized intro bytes exactly', () => {
    const bytes = readFileSync('public/audio/podracing-selection-intro.webm');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('39c4d411570a2591be5cbf7fc27d86a63c36d3befa5de8d57c0d2018e1c89260');
  });
  it('crossfades beneath the full supplied intro without trimming it', () => {
    const schedule = createMenuMusicTransitionSchedule(6.058685);
    expect(schedule.introStartSeconds).toBe(0);
    expect(schedule.introEndSeconds).toBeCloseTo(6.058685);
    expect(schedule.scoreStartSeconds).toBeCloseTo(4.508685);
    expect(schedule.scoreFadeEndSeconds).toBeGreaterThan(schedule.introEndSeconds);
  });
});

describe('menu music lifecycle diagnostics', () => {
  it('clamps and exposes the independent accessibility mix buses', () => {
    const audio = new PodracerAudio();
    audio.setMix({ master: 2, music: -1, engine: 0.55, effects: Number.NaN, voice: 0.2 });
    expect(audio.mixSettings).toEqual({
      master: 1,
      music: 0,
      engine: 0.55,
      effects: 1,
      voice: 0.2,
    });
    audio.dispose();
  });

  it('reports a clean stopped state before a browser context is created', () => {
    const audio = new PodracerAudio();
    expect(audio.menuMusicStatus).toEqual({
      mode: 'off',
      requested: false,
      loading: false,
      introScheduled: false,
      scoreScheduled: false,
      awaitingGesture: false,
      url: null,
    });
    audio.dispose();
  });

  it('contains context creation failures and clears a failed autoplay request', async () => {
    const audio = new PodracerAudio({
      createContext: () => {
        throw new Error('Audio unavailable');
      },
    });
    await expect(audio.startMenuMusic('/audio/podracing-selection-intro.webm')).resolves.toBe(false);
    expect(audio.menuMusicStatus.mode).toBe('off');
    expect(audio.menuMusicStatus.requested).toBe(false);
    audio.dispose();
  });
});
