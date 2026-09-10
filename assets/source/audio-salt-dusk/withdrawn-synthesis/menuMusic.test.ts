import { describe, expect, it } from 'vitest';
import {
  MENU_MUSIC_BAR_COUNT,
  MENU_MUSIC_BEATS_PER_BAR,
  MENU_MUSIC_BPM,
  MENU_MUSIC_TONIC_MIDI,
  PodracerAudio,
  createMenuMusicTransitionSchedule,
  createOriginalMenuScorePlan,
  renderOriginalMenuScore,
  renderOriginalMenuScoreAsync,
  type MenuScorePlan,
} from '../../src/audio';

function fakeAudioContext(sampleRate = 48_000): BaseAudioContext {
  return {
    sampleRate,
    createBuffer: (channels: number, length: number, bufferSampleRate: number) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return {
        duration: length / bufferSampleRate,
        getChannelData: (channel: number) => data[channel]!,
      } as AudioBuffer;
    },
  } as BaseAudioContext;
}

describe('original procedural menu score', () => {
  it('uses the analyzed A-minor centre and 148 BPM handoff deterministically', () => {
    const first = createOriginalMenuScorePlan();
    const second = createOriginalMenuScorePlan();

    expect(first).toEqual(second);
    expect(first.bpm).toBe(MENU_MUSIC_BPM);
    expect(first.tonicMidi).toBe(MENU_MUSIC_TONIC_MIDI);
    expect(first.bars).toBe(MENU_MUSIC_BAR_COUNT);
    expect(first.beatsPerBar).toBe(MENU_MUSIC_BEATS_PER_BAR);
    expect(first.durationSeconds).toBeCloseTo(64 * 60 / 148);
    expect(first.notes.length).toBeGreaterThan(200);
    expect(first.hits.length).toBeGreaterThan(40);
    expect(first.notes.some((note) => note.midi % 12 === 9)).toBe(true);
  });

  it('keeps every authored event finite, bounded, and inside the circular score', () => {
    const plan = createOriginalMenuScorePlan();
    const totalBeats = plan.bars * plan.beatsPerBar;
    for (const note of plan.notes) {
      expect(Number.isFinite(note.beat + note.durationBeats + note.midi + note.gain + note.pan)).toBe(true);
      expect(note.beat).toBeGreaterThanOrEqual(0);
      expect(note.beat).toBeLessThan(totalBeats);
      expect(note.durationBeats).toBeGreaterThan(0);
      expect(note.gain).toBeGreaterThan(0);
      expect(Math.abs(note.pan)).toBeLessThanOrEqual(1);
    }
  });

  it('crossfades beneath the supplied six-second intro without trimming it', () => {
    const schedule = createMenuMusicTransitionSchedule(6.058_685);
    expect(schedule.introStartSeconds).toBe(0);
    expect(schedule.introEndSeconds).toBeCloseTo(6.058_685);
    expect(schedule.crossfadeSeconds).toBeCloseTo(1.55);
    expect(schedule.scoreStartSeconds).toBeCloseTo(4.508_685);
    expect(schedule.scoreFadeEndSeconds).toBeGreaterThan(schedule.introEndSeconds);
  });

  it('renders a finite, audible stereo Web Audio buffer with a bounded peak', () => {
    const shortPlan: MenuScorePlan = {
      bpm: 120,
      beatsPerBar: 1,
      bars: 1,
      durationSeconds: 0.5,
      tonicMidi: 57,
      notes: [
        { beat: 0, durationBeats: 0.35, midi: 57, gain: 0.2, pan: -0.2, voice: 'strings' },
        { beat: 0.2, durationBeats: 0.2, midi: 64, gain: 0.16, pan: 0.2, voice: 'brass' },
      ],
      hits: [{ beat: 0, gain: 0.2, kind: 'drum', pan: 0 }],
    };
    const buffer = renderOriginalMenuScore(fakeAudioContext(), shortPlan);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const peak = Math.max(
      ...left.map((value) => Math.abs(value)),
      ...right.map((value) => Math.abs(value)),
    );

    expect(buffer.duration).toBeCloseTo(0.5);
    expect(left.length).toBe(12_000);
    expect(right.length).toBe(left.length);
    expect(left.every(Number.isFinite)).toBe(true);
    expect(right.every(Number.isFinite)).toBe(true);
    expect(peak).toBeGreaterThan(0.05);
    expect(peak).toBeLessThanOrEqual(0.85);
    expect(left).not.toEqual(right);
  });

  it('renders cooperatively so the live selector never takes one long synthesis task', async () => {
    const plan: MenuScorePlan = {
      bpm: 120,
      beatsPerBar: 1,
      bars: 1,
      durationSeconds: 0.25,
      tonicMidi: 57,
      notes: [{ beat: 0, durationBeats: 0.2, midi: 57, gain: 0.2, pan: 0, voice: 'brass' }],
      hits: [{ beat: 0, gain: 0.12, kind: 'cymbal', pan: 0 }],
    };
    let yields = 0;
    const buffer = await renderOriginalMenuScoreAsync(fakeAudioContext(), plan, {
      eventsPerYield: 1,
      samplesPerYield: 1_024,
      yieldControl: async () => {
        yields += 1;
      },
    });

    expect(buffer.duration).toBeCloseTo(0.25);
    expect(yields).toBeGreaterThan(4);
    expect(buffer.getChannelData(0).some((sample) => Math.abs(sample) > 0.01)).toBe(true);
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
