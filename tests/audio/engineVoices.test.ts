import { describe, expect, it } from 'vitest';
import { DEFAULT_ENGINE_VOICE_ID, RECORDED_ENGINE_VOICES, RECORDED_ENGINE_VOICE_URLS, RECORDED_EFFECT_URLS } from '../../src/audio/catalogue';
import { derivePodracerAudioTargets, deriveRivalAudioTargets } from '../../src/audio/model';
const fsModule = 'node:fs';
const { readFileSync } = await import(/* @vite-ignore */ fsModule);

describe('sourced pod engine voices', () => {
  it('uses only existing licensed loops recorded in the source ledgers and credits', () => {
    const ledger = ['audio-salt-dusk', 'audio-salt-dusk-v2'].flatMap((folder) =>
      JSON.parse(readFileSync(`assets/source/${folder}/runtime-files.json`, 'utf8')) as Array<{ runtime: string; sha256: string }>);
    const credits = readFileSync('public/audio/salt-dusk-v2/CREDITS.html', 'utf8');
    expect(Object.hasOwn(RECORDED_ENGINE_VOICES, DEFAULT_ENGINE_VOICE_ID)).toBe(true);
    for (const voice of Object.values(RECORDED_ENGINE_VOICES)) {
      const item = ledger.find((entry) => `/${entry.runtime.replace(/^public\//, '')}` === voice.url);
      expect(item, voice.url).toBeDefined();
      expect(readFileSync(item!.runtime).length).toBeGreaterThan(0);
      expect(voice.rate).toBeGreaterThan(0.7);
      expect(voice.rate).toBeLessThan(1.3);
      expect(voice.credit.length).toBeGreaterThan(8);
    }
    expect(credits).toContain('Pod engine identities');
    expect(credits).toContain('Fan motor');
    expect(credits).toContain('Car Engine Loop');
    // The core effect bank is unchanged; voices only add two shared loops.
    expect(RECORDED_EFFECT_URLS).toHaveLength(10);
    expect(RECORDED_ENGINE_VOICE_URLS.filter((url) => !RECORDED_EFFECT_URLS.includes(url))).toHaveLength(2);
  });

  it('gives registered pods distinct engine registers for the player and passing rivals', () => {
    const cruising = { speedMps: 120, throttle: 0.8, boost: 0.5, boostActive: false, drift: 0, heat: 0.2, damage: 0, grounded: true };
    const heavy = derivePodracerAudioTargets({ ...cruising, vehicleId: 'blockrunner' });
    const balanced = derivePodracerAudioTargets({ ...cruising, vehicleId: 'teemto' });
    const agile = derivePodracerAudioTargets({ ...cruising, vehicleId: 'polwo' });
    const fast = derivePodracerAudioTargets({ ...cruising, vehicleId: 'sebulba' });
    expect(heavy.engineLeft.frequency).toBeLessThan(balanced.engineLeft.frequency);
    expect(fast.engineLeft.frequency).toBeGreaterThan(balanced.engineLeft.frequency);
    expect(agile.engineLeft.frequency).toBeGreaterThan(fast.engineLeft.frequency);
    expect(balanced).toEqual(derivePodracerAudioTargets({ ...cruising, vehicleId: 'podracer' }));
    const rivals = deriveRivalAudioTargets([
      { id: 'a', distanceM: 30, pan: 0, closingSpeedMps: 0, speedMps: 100, vehicleId: 'blockrunner' },
      { id: 'b', distanceM: 30, pan: 0, closingSpeedMps: 0, speedMps: 100, vehicleId: 'polwo' },
    ]);
    expect(rivals[0]!.frequency).toBeLessThan(rivals[1]!.frequency);
  });
});
