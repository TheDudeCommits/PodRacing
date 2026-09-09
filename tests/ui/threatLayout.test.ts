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


describe('compact measured warning availability', () => {
  const occupied = [
  {
    "left": 10,
    "top": 10,
    "right": 657,
    "bottom": 71
  },
  {
    "left": 15,
    "top": 140,
    "right": 195,
    "bottom": 202
  },
  {
    "left": 435,
    "top": 116.25,
    "right": 459,
    "bottom": 345
  },
  {
    "left": 528,
    "top": 80,
    "right": 655,
    "bottom": 124
  },
  {
    "left": 14,
    "top": 283,
    "right": 206,
    "bottom": 356
  },
  {
    "left": 14,
    "top": 237,
    "right": 180,
    "bottom": 263
  },
  {
    "left": 479,
    "top": 172,
    "right": 653,
    "bottom": 361
  },
  {
    "left": 183.5,
    "top": 145,
    "right": 483.5,
    "bottom": 224.140625
  },
  {
    "left": 257,
    "top": 247.328125,
    "right": 423,
    "bottom": 357
  }
];
  const warning = [threat('vent', -8, .95), threat('dust', 2, .5), threat('rear', 170, .7)];
  const context = { occupiedRects: occupied, compactHeaderBottom: 71 };
  it('restores the actual saturated667 perimeter without moving into the center', () => {
    expect(layoutThreatCues(warning, 667, 375, true)).toHaveLength(0);
    const [cue] = layoutThreatCues(warning, 667, 375, true, context);
    expect(cue).toMatchObject({ threat: { id: 'vent' }, bearing: -8, urgency: .95, count: 2, directionOnly: false });
    expect(threatCueBounds(cue!).bottom).toBeLessThanOrEqual(121);
    for (const r of occupied) {
      const b = threatCueBounds(cue!);
      expect(b.right <= r.left - 10 || b.left >= r.right + 10 || b.bottom <= r.top - 10 || b.top >= r.bottom + 10).toBe(true);
    }
  });
  it('preserves the highest urgency and world bearing across the compass', () => {
    for (let bearing = -180; bearing < 180; bearing += 15) {
      const [cue] = layoutThreatCues([threat('urgent', bearing, .95), threat('lower', bearing + 60, .3)], 667, 375, true, context);
      expect(cue).toMatchObject({ threat: { id: 'urgent' }, bearing, directionOnly: false });
    }
  });
  it('only uses measured compact geometry inside its matching CSS band', () => {
    for (const [width, height] of [[390,844], [650,375], [761,375], [844,390], [1440,900], [667,541]]) {
      expect(layoutThreatCues(warning, width!, height!, false, context)).toEqual(layoutThreatCues(warning, width!, height!));
    }
  });
  it('keeps a smaller truthful grouped arrow when a full caption cannot fit', () => {
    // Explicit geometry stress: only the80x40 upper-left pocket remains.
    const blocked = [{left:0,top:0,right:667,bottom:71},{left:120,top:78,right:667,bottom:375},{left:0,top:141,right:120,bottom:375}];
    const [cue] = layoutThreatCues(warning, 667, 375, false, {occupiedRects:blocked,compactHeaderBottom:71});
    expect(cue).toMatchObject({ threat: { id: 'vent' }, bearing: -8, count: 2, directionOnly: true, footprintWidth: 80, footprintHeight: 40 });
    const b = threatCueBounds(cue!);
    expect(b.right).toBeLessThanOrEqual(110);expect(b.top).toBeGreaterThanOrEqual(81);expect(b.bottom).toBeLessThanOrEqual(131);
    for (const r of blocked) expect(b.right <= r.left - 10 || b.left >= r.right + 10 || b.bottom <= r.top - 10 || b.top >= r.bottom + 10).toBe(true);
  });
  it('does not invent an unoccupied location when even the arrow footprint is blocked', () => {
    expect(layoutThreatCues(warning, 667, 375, false, {occupiedRects:[{left:0,top:0,right:667,bottom:375}],compactHeaderBottom:71})).toEqual([]);
  });
});


describe('measured driving feedback reservation', () => {
  it('keeps the actual 844px grouped lance cue out of the flight/drift lane', () => {
    // Paired native-DOM component receipt: both V31 and V32 ability styling
    // expose this same overlap. Coordinates are the measured full lane.
    const feedback = { left: 410, top: 276.328125, right: 600, bottom: 372 };
    const warnings = [threat('lance-1', -164, .98), threat('lance-2', -163, .97)];
    const [former] = layoutThreatCues(warnings, 844, 390, true);
    const before = threatCueBounds(former!);
    expect(before.left).toBeCloseTo(312.1875, 1);
    expect(before.right > feedback.left && before.top < feedback.bottom && before.bottom > feedback.top).toBe(true);
    const [corrected] = layoutThreatCues(warnings, 844, 390, true, { reservedRects: [feedback] });
    expect(corrected).toMatchObject({ threat: { id: 'lance-1' }, bearing: -164, count: 2, urgency: .98 });
    const after = threatCueBounds(corrected!);
    expect(after.right <= feedback.left - 10 || after.left >= feedback.right + 10
      || after.bottom <= feedback.top - 10 || after.top >= feedback.bottom + 10).toBe(true);
    expect(after.left >= 16 && after.right <= 828 && after.top >= 0 && after.bottom <= 374).toBe(true);
  });
});
