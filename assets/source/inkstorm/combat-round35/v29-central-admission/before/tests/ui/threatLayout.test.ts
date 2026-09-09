import { describe, expect, it } from 'vitest';
import { layoutThreatCues, threatBearingLabel, threatCueBounds } from '../../src/ui/threatLayout';
import type { HudThreatCueViewModel } from '../../src/ui/types';

function threat(id: string, bearingDegrees: number, urgency: number): HudThreatCueViewModel {
  return { id, bearingDegrees, urgency, label: id, kind: 'hazard' };
}

describe('threat cue collision handling', () => {
  it('collapses a crowded 720p danger cluster into its most urgent truthful direction', () => {
    const cues = layoutThreatCues([threat('vent', 137, 0.5), threat('lance', 139, 0.95), threat('rival', 143, 0.7)], 1280, 720);
    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({ threat: { id: 'lance' }, bearing: 139, count: 3 });
  });

  it('retains separated directions and keeps labels clear of the landing panel', () => {
    const cues = layoutThreatCues([threat('front', 0, 0.9), threat('right', 90, 0.8), threat('left', -90, 0.7), threat('rear', 180, 0.6)], 1280, 720, true);
    expect(cues.map((cue) => cue.threat.id)).toEqual(['front', 'right', 'left']);
    const right = threatCueBounds(cues.find((cue) => cue.threat.id === 'right')!);
    expect(right.right < 1032 || right.bottom < 720 - 406).toBe(true);
    for (const a of cues) for (const b of cues) {
      if (a !== b) expect(Math.abs(a.x - b.x) >= 170 || Math.abs(a.y - b.y) >= 42).toBe(true);
    }
  });

  it('groups bearings across the rear wrap without changing the selected direction', () => {
    const cues = layoutThreatCues([threat('a', -179, 0.8), threat('b', 179, 0.9)], 1280, 720);
    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({ bearing: 179, count: 2 });
  });

  it('moves a forward launch hazard above the central vista at every desktop size', () => {
    for (const [width, height] of [[1280, 720], [1440, 900], [1920, 1080], [2160, 1350]] as const) {
      const [cue] = layoutThreatCues([threat('geyser', 4, 0.9)], width, height);
      expect(cue!.bearing).toBe(4);
      expect(threatCueBounds(cue!).bottom).toBeLessThanOrEqual(166);
    }
  });

  it('keeps three distinct bearings available around occupied HUD areas at 720p and desktop', () => {
    for (const [width, height] of [[1280, 720], [1440, 900], [1920, 1080], [2160, 1350]] as const) {
      for (const airborne of [false, true]) {
        for (const detailVisible of [false, true]) {
          for (let angle = -180; angle < 180; angle += 15) {
            const cues = layoutThreatCues([
              threat('primary', angle, 0.95), threat('second', angle + 50, 0.8), threat('third', angle + 110, 0.7),
            ], width, height, airborne, { detailVisible, assetStatusVisible: true, controlsVisible: true, tutorialVisible: true });
            expect(cues.map((cue) => cue.threat.id)).toEqual(['primary', 'second', 'third']);
            for (const cue of cues) {
              const bounds = threatCueBounds(cue);
              expect(bounds.left).toBeGreaterThanOrEqual(15);
              expect(bounds.right).toBeLessThanOrEqual(width - 15);
              expect(bounds.top).toBeGreaterThanOrEqual(0);
              expect(bounds.bottom).toBeLessThanOrEqual(height - 15);
              // Perimeter placement protects the center even after collision avoidance.
              expect(bounds.left <= 17 || bounds.right >= width - 17 || bounds.top <= 135 || bounds.bottom >= height - 17).toBe(true);
              // The instrument reserve covers the speed ring, heat and damage meters.
              expect(bounds.right < width - 270 || bounds.bottom < height - 274).toBe(true);
              if (airborne) expect(bounds.right < width - 270 || bounds.bottom < height - 406).toBe(true);
              for (const other of cues) {
                if (other !== cue) expect(Math.abs(cue.x - other.x) >= 170 || Math.abs(cue.y - other.y) >= 42).toBe(true);
              }
            }
          }
        }
      }
    }
  });

  it('groups nearby bearings before placement without merging unrelated displaced threats', () => {
    const cues = layoutThreatCues([threat('lance', 90, 0.95), threat('vent', 100, 0.8), threat('rear', 155, 0.7)], 1280, 720, true);
    expect(cues.map((cue) => [cue.threat.id, cue.bearing, cue.count])).toEqual([['lance', 90, 2], ['rear', 155, 1]]);
  });

  it('gives displaced arrows an accessible direction in the craft coordinate system', () => {
    expect([-179, -90, -45, 0, 45, 90, 179].map(threatBearingLabel))
      .toEqual(['behind', 'left', 'ahead-left', 'ahead', 'ahead-right', 'right', 'behind']);
    const [cue] = layoutThreatCues([threat('invalid', Number.NaN, Number.POSITIVE_INFINITY)], 1280, 720);
    expect(cue).toMatchObject({ bearing: 0, urgency: 0 });
  });
});


describe('active Director banner reservation', () => {
  const threats = [threat('vent', -8, .9), threat('dust', 2, .5)];
  it.each([
    [1440, 900, { left: 525, top: 132, right: 915, bottom: 211.140625 }],
    [390, 844, { left: 45, top: 145, right: 345, bottom: 224.140625 }],
    [844, 390, { left: 253.203125, top: 132, right: 590.796875, bottom: 211.140625 }],
  ] as const)('keeps the grouped world bearing clear of actual %ipx banner bounds', (width, height, banner) => {
    const [cue] = layoutThreatCues(threats, width, height, false, { reservedRects: [banner] });
    expect(cue).toMatchObject({ threat: { id: 'vent' }, bearing: -8, count: 2, urgency: .9 });
    const bounds = threatCueBounds(cue!);
    expect(bounds.right <= banner.left - 10 || bounds.left >= banner.right + 10
      || bounds.bottom <= banner.top - 10 || bounds.top >= banner.bottom + 10).toBe(true);
    expect(bounds.left >= 15 && bounds.right <= width - 15 && bounds.top >= 0 && bounds.bottom <= height - 15).toBe(true);
    expect(bounds.left <= 17 || bounds.right >= width - 17 || bounds.top <= 135 || bounds.bottom >= height - 17).toBe(true);
  });
  it('reproduces the former overlap and changes only occupied-banner placement', () => {
    const original = layoutThreatCues(threats, 1440, 900);
    expect(threatCueBounds(original[0]!)).toMatchObject({ top: 134, bottom: 166 });
    expect(threatCueBounds(original[0]!).right).toBeGreaterThan(525);
    expect(threatCueBounds(original[0]!).left).toBeLessThan(915);
    expect(layoutThreatCues(threats, 1440, 900, false, { reservedRects: [] })).toEqual(original);
  });
});
