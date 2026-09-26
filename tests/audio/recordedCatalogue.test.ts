import { describe, expect, it } from 'vitest';
import { ANNOUNCER_WELCOME_URL, RECORDED_CUES, RECORDED_CUE_ROLES, RECORDED_EFFECT_URLS, RECORDED_MUSIC_URL, RECORDED_RACE_MUSIC, RECORDED_RACE_MUSIC_URLS, RECORDED_VOICE_LINES, RECORDED_VOICE_LINE_URLS } from '../../src/audio/catalogue';
const fsModule: string = 'node:fs', cryptoModule: string = 'node:crypto';
const { readFileSync } = await import(/* @vite-ignore */ fsModule);
const { createHash } = await import(/* @vite-ignore */ cryptoModule);

describe('downloaded recording admission', () => {
  it('ships every playback URL with exact source-operation and runtime hash provenance', () => {
    const ledger = ['audio-salt-dusk', 'audio-salt-dusk-v2', 'audio-race-set', 'audio-voice-fighter', 'audio-announcer'].flatMap(folder => JSON.parse(readFileSync(`assets/source/${folder}/runtime-files.json`, 'utf8'))) as Array<{
      source: string; runtime: string; operation: string | string[]; sha256: string;
    }>;
    const urls = [...RECORDED_EFFECT_URLS, RECORDED_MUSIC_URL, ...RECORDED_RACE_MUSIC_URLS, ...RECORDED_VOICE_LINE_URLS, ANNOUNCER_WELCOME_URL];
    for (const url of urls) {
      const item = ledger.find(file => file.runtime === `public${url}`);
      expect(item, url).toBeDefined();
      const bytes = readFileSync(item!.runtime);
      expect(createHash('sha256').update(bytes).digest('hex'), url).toBe(item!.sha256);
      expect(readFileSync(item!.source).length).toBeGreaterThan(0);
      if (item!.operation === 'byte-exact copy') expect(bytes.equals(readFileSync(item!.source))).toBe(true);
    }
    expect(Object.keys(RECORDED_CUES)).toHaveLength(27);
    const credits = readFileSync('public/audio/salt-dusk-v2/CREDITS.html', 'utf8');
    for (const author of ['Scott Buckley', 'Little Robot Sound Factory', 'qubodup', 'dklon', '7of9Designs', 'Michel Baradari']) expect(credits).toContain(author);
    for (const url of RECORDED_EFFECT_URLS) expect(url).toMatch(/\/salt-dusk(?:-v2)?\//);
    // Race scores: two existing Kevin MacLeod compositions, credited beside the files.
    const raceCredits = readFileSync('public/audio/race-set/CREDITS.html', 'utf8');
    expect(RECORDED_RACE_MUSIC).toHaveLength(2);
    for (const track of RECORDED_RACE_MUSIC) {
      expect(track.url).toContain('/race-set/');
      expect(raceCredits).toContain(track.title);
      expect(raceCredits).toContain(track.artist);
    }
    expect(raceCredits).toContain('creativecommons.org/licenses/by/4.0/');
    // Announcer: original Thrustline lines, owner-approved generated voice,
    // documented beside the files with the exact voice and processing chain.
    const announcerSources = readFileSync('public/audio/announcer/SOURCES.md', 'utf8');
    expect(Object.keys(RECORDED_VOICE_LINES)).toHaveLength(15);
    for (const url of [...RECORDED_VOICE_LINE_URLS, ANNOUNCER_WELCOME_URL]) expect(url).toContain('/announcer/');
    for (const fact of ['text2speech_v2', 'ElevenLabs', '195e386a-cb61-5c1b-a53b-0e2f0669c408', '-15 LUFS']) expect(announcerSources).toContain(fact);
    expect(readFileSync('assets/source/audio-announcer/PROVENANCE.md', 'utf8')).toContain('owner approved');
    expect(RECORDED_EFFECT_URLS).toHaveLength(10);
    for (const url of Object.values(RECORDED_CUES).flat()) expect(RECORDED_CUE_ROLES[url]).toBeDefined();
  });

  it('has no synthesis, oscillator or sample-writing path in the runtime audio owner', () => {
    for (const file of ['PodracerAudio.ts', 'menuMusic.ts', 'catalogue.ts']) {
      const source = readFileSync(`src/audio/${file}`, 'utf8');
      expect(source).not.toMatch(/createOscillator\s*\(|createBuffer\s*\(|getChannelData\s*\(|renderOriginalMenuScore|createNoiseBuffer|OfflineAudioContext/);
    }
  });
});
