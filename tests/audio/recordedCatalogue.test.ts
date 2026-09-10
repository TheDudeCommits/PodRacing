import { describe, expect, it } from 'vitest';
import { RECORDED_CUES, RECORDED_EFFECT_URLS, RECORDED_MUSIC_URL } from '../../src/audio/catalogue';
const fsModule: string = 'node:fs', cryptoModule: string = 'node:crypto';
const { readFileSync } = await import(/* @vite-ignore */ fsModule);
const { createHash } = await import(/* @vite-ignore */ cryptoModule);

describe('downloaded recording admission', () => {
  it('ships every playback URL with exact source-operation and runtime hash provenance', () => {
    const ledger = JSON.parse(readFileSync('assets/source/audio-salt-dusk/runtime-files.json', 'utf8')) as Array<{
      source: string; runtime: string; operation: string | string[]; sha256: string;
    }>;
    const urls = [...RECORDED_EFFECT_URLS, RECORDED_MUSIC_URL];
    for (const url of urls) {
      const item = ledger.find(file => file.runtime === `public${url}`);
      expect(item, url).toBeDefined();
      const bytes = readFileSync(item!.runtime);
      expect(createHash('sha256').update(bytes).digest('hex'), url).toBe(item!.sha256);
      expect(readFileSync(item!.source).length).toBeGreaterThan(0);
      if (item!.operation === 'byte-exact copy') expect(bytes.equals(readFileSync(item!.source))).toBe(true);
    }
    expect(Object.keys(RECORDED_CUES)).toHaveLength(24);
    expect(readFileSync('public/audio/salt-dusk/CREDITS.html', 'utf8')).toContain('Scott Buckley');
  });

  it('has no synthesis, oscillator or sample-writing path in the runtime audio owner', () => {
    for (const file of ['PodracerAudio.ts', 'menuMusic.ts', 'catalogue.ts']) {
      const source = readFileSync(`src/audio/${file}`, 'utf8');
      expect(source).not.toMatch(/createOscillator\s*\(|createBuffer\s*\(|getChannelData\s*\(|renderOriginalMenuScore|createNoiseBuffer|OfflineAudioContext/);
    }
  });
});
