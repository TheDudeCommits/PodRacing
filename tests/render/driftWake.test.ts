import { describe, expect, it } from 'vitest';
import { WakeRibbons } from '../../src/render/terrain/WakeRibbons';

/**
 * The drift widening lives in GameApp's wake push, but the ribbon itself must
 * accept a wider pair and keep it in one draw. These are the invariants the
 * drift mark depends on.
 */
describe('drift wake ribbon', () => {
  it('accepts a widened pair without adding draws or dropping the trail', () => {
    const ribbons = new WakeRibbons({ maxRacers: 2, samplesPerTrail: 16 });
    const geometry = ribbons.mesh.geometry;
    const before = geometry.getAttribute('position').count;
    for (let sample = 0; sample < 12; sample += 1) {
      // A straight pair, then a pair widened and pushed to one side as a slide does.
      const widen = sample < 6 ? 1 : 1.85;
      const outside = sample < 6 ? 0 : 4.6;
      ribbons.pushPair(0, -8.4 * widen + outside, sample * 6, 8.4 * widen + outside, sample * 6, 1, sample * 0.05);
    }
    ribbons.update(0.6, 0, 0);
    expect(geometry.getAttribute('position').count).toBe(before);
    expect(ribbons.mesh.visible).toBe(true);
    ribbons.dispose();
  });
});
