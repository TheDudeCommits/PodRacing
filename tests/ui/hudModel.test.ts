import { describe, expect, it } from 'vitest';
import {
  cornerGlyph,
  createRaceModeStatusViewModel,
  createSettingsHudViewModel,
  deriveRaceHudViewModel,
  formatOrdinal,
  formatRaceTime,
  formatRaceTimeHundredths,
  formatSpeed,
  formatSplitDelta,
  type RaceHudSnapshotLike,
} from '../../src/ui';

function raceSnapshot(): RaceHudSnapshotLike {
  return {
    phase: 'countdown',
    countdownRemaining: 2.18,
    countdownCue: 3,
    raceTime: 65.4329,
    totalLaps: 3,
    entries: [
      {
        id: 'player',
        name: 'You',
        isPlayer: true,
        status: 'racing',
        vehicle: {
          position: { x: 25, z: -45 },
          telemetry: { speed: 100, normalizedSpeed: 0.5 },
          boost: { energy: 0.72, active: true },
          drift: { charge: 0.44 },
          heat: 0.63,
          damage: 0.12,
        },
        progress: {
          courseProgress: 0.42,
          completedLaps: 1,
          currentLap: 2,
          placement: 2,
          wrongWay: false,
          cornerPreview: {
            direction: 'left',
            severity: 0.76,
            distance: 83.4,
            tag: 'narrow-canyon',
          },
          splits: [
            { lap: 2, checkpointIndex: 4, raceTime: 62, segmentTime: 12.5 },
          ],
        },
      },
      {
        id: 'ai-vexa',
        name: 'Vexa Ruun',
        isPlayer: false,
        status: 'racing',
        vehicle: {
          position: { x: 30, z: -31 },
          telemetry: { speed: 104 },
          boost: { energy: 0.34 },
          heat: 0.42,
          damage: 0.08,
        },
        progress: {
          courseProgress: 0.45,
          completedLaps: 1,
          currentLap: 2,
          placement: 1,
          wrongWay: false,
          cornerPreview: { direction: 'left', severity: 0.7, distance: 71 },
          splits: [
            { lap: 2, checkpointIndex: 4, raceTime: 60, segmentTime: 11.9 },
          ],
        },
      },
    ],
    results: [
      { id: 'ai-vexa', name: 'Vexa Ruun', placement: 1, finishTime: 182.4, lapTimes: [61.2, 59.8, 61.4] },
      { id: 'player', name: 'You', placement: 2, finishTime: 183.1, lapTimes: [62.1, 60.2, 60.8] },
    ],
  };
}

describe('cel HUD formatting', () => {
  it('formats speed, race clocks, deltas, and ordinal edge cases', () => {
    expect(formatSpeed(100)).toBe('360');
    expect(formatSpeed(Number.NaN)).toBe('000');
    expect(formatRaceTime(65.4329)).toBe('1:05.432');
    expect(formatRaceTime(3_661.009)).toBe('1:01:01.009');
    expect(formatRaceTime(null)).toBe('—:——.———');
    expect(formatRaceTimeHundredths(65.4329)).toBe('1:05.43');
    expect(formatRaceTimeHundredths(3_661.009)).toBe('1:01:01.00');
    expect(formatRaceTimeHundredths(null)).toBe('—:——.——');
    expect(formatSplitDelta(0.613)).toBe('+0.613');
    expect(formatSplitDelta(-1.2)).toBe('−1.200');
    expect(formatOrdinal(1)).toBe('1ST');
    expect(formatOrdinal(2)).toBe('2ND');
    expect(formatOrdinal(3)).toBe('3RD');
    expect(formatOrdinal(11)).toBe('11TH');
    expect(formatOrdinal(112)).toBe('112TH');
  });

  it('uses distinct corner glyphs for hard and mild cuts', () => {
    expect(cornerGlyph('straight', 1)).toBe('↑');
    expect(cornerGlyph('left', 0.2)).toBe('↖');
    expect(cornerGlyph('left', 0.8)).toBe('↰');
    expect(cornerGlyph('right', 0.8)).toBe('↱');
  });
});

describe('race snapshot to HUD model', () => {
  it('derives a complete JSON view model without importing simulation classes', () => {
    const snapshot = raceSnapshot();
    const course = [
      { x: -10, z: 4, progress: 0 },
      { x: 30, z: 40, progress: 0.5 },
    ];
    const model = deriveRaceHudViewModel(snapshot, { course, controlsVisible: false });

    expect(model.phase).toBe('countdown');
    expect(model.countdownCue).toBe(3);
    expect(model.speedMps).toBe(100);
    expect(model.normalizedSpeed).toBe(0.5);
    expect(model.lap).toBe(2);
    expect(model.position).toBe(2);
    expect(model.lastSplit).toBe(12.5);
    expect(model.splitDelta).toBeCloseTo(0.6);
    expect(model.corner).toEqual({
      direction: 'left',
      severity: 0.76,
      distance: 83.4,
      label: 'narrow canyon',
    });
    expect(model.course).toBe(course);
    expect(model.racers).toHaveLength(2);
    expect(model.results[0]).toMatchObject({ placement: 1, bestLap: 59.8, isPlayer: false });
    expect(model.results[1]).toMatchObject({ placement: 2, bestLap: 60.2, isPlayer: true });
    expect(JSON.parse(JSON.stringify(model))).toEqual(model);
  });

  it('derives stable placement and clamps corrupt telemetry', () => {
    const snapshot = raceSnapshot();
    snapshot.entries[0]!.progress.placement = null;
    snapshot.entries[1]!.progress.placement = null;
    snapshot.entries[0]!.vehicle.telemetry.speed = Number.NaN;
    snapshot.entries[0]!.vehicle.boost.energy = 9;
    snapshot.entries[0]!.vehicle.heat = -4;

    const model = deriveRaceHudViewModel(snapshot);
    expect(model.position).toBe(2);
    expect(model.speedMps).toBe(0);
    expect(model.boost).toBe(1);
    expect(model.heat).toBe(0);
  });

  it('forwards settings, alternate routes, directional threats, and result highlights unchanged', () => {
    const settings = createSettingsHudViewModel();
    const courseBranches = [{
      id: 'glass-cut',
      kind: 'shortcut',
      points: [{ x: 4, z: 8 }, { x: 12, z: 18 }],
    }] as const;
    const threats = [{ id: 'rear', label: 'Rival', bearingDegrees: 160, urgency: 0.8, kind: 'rival' }] as const;
    const resultsPresentation = {
      photoFinish: { rivalName: 'Vexa', gapSeconds: 0.019, won: true },
      highlights: [{ id: 'line', title: 'Nose ahead', detail: 'At the stripe', kind: 'photo-finish' }],
    } as const;
    const model = deriveRaceHudViewModel(raceSnapshot(), {
      settings,
      courseBranches,
      threats,
      resultsPresentation,
    });
    expect(model.settings).toBe(settings);
    expect(model.courseBranches).toBe(courseBranches);
    expect(model.threats).toBe(threats);
    expect(model.resultsPresentation).toBe(resultsPresentation);
  });

  it('derives launch timing, race-mode scoring, and Race Director phases from live race state', () => {
    const snapshot = raceSnapshot();
    snapshot.settings = { mode: 'combat-race' };
    snapshot.modeState = {
      mode: 'combat-race',
      objectiveTarget: 2_500,
      nextEliminationAt: 30,
      teamScores: { sun: 600, shadow: 450 },
    };
    snapshot.entries[0]!.launch = {
      outcome: 'pending', targetThrottle: 0.72, displayedRev: 0.68, engineHeat: 0.34,
    };
    snapshot.entries[0]!.competition = {
      teamId: 'sun', score: 1_240, checkpointsPassed: 4, survivalLives: 2,
    };
    snapshot.director = {
      events: [{
        id: 'storm-1', kind: 'sandstorm', sectionTag: 'wide-sweeper', duration: 12,
        phase: 'warning', activatedAt: null, completedAt: null, side: -1,
      }],
    };

    const countdown = deriveRaceHudViewModel(snapshot);
    expect(countdown.launch).toMatchObject({
      stage: 'charging', rev: 0.68, target: 0.72, outcome: null,
    });
    expect(countdown.launch?.sweetSpotMin).toBeCloseTo(0.615);
    expect(countdown.raceModeStatus).toMatchObject({
      name: 'Combat', scoreLabel: 'Score', scoreValue: '1,240 / 2,500', progress: 0.496,
    });
    expect(countdown.directorEvent).toMatchObject({
      id: 'storm-1', phase: 'warning', title: 'Sandstorm inbound',
    });

    snapshot.phase = 'racing';
    snapshot.raceTime = 0.6;
    snapshot.entries[0]!.launch!.outcome = 'perfect';
    snapshot.director.events[0]!.phase = 'active';
    snapshot.director.events[0]!.activatedAt = 0.25;
    const launched = deriveRaceHudViewModel(snapshot);
    expect(launched.launch).toMatchObject({ stage: 'result', outcome: 'perfect' });
    expect(launched.directorEvent).toMatchObject({ phase: 'active', title: 'Sandstorm active' });

    snapshot.raceTime = 3;
    snapshot.director.events[0]!.phase = 'complete';
    snapshot.director.events[0]!.completedAt = 2.2;
    const cleared = deriveRaceHudViewModel(snapshot);
    expect(cleared.launch).toBeUndefined();
    expect(cleared.directorEvent).toMatchObject({ phase: 'end', title: 'Sandstorm cleared' });
  });

  it('keeps all seven race mode summaries short and JSON-safe', () => {
    const modes = [
      'circuit', 'eliminator', 'checkpoint-sprint', 'combat-race',
      'survival-gauntlet', 'drift-trial', 'team-race',
    ] as const;
    const summaries = modes.map((mode) => createRaceModeStatusViewModel(mode, {
      position: 2,
      racerCount: 8,
      lap: 2,
      totalLaps: 3,
      score: 4_200,
      objectiveTarget: 12_000,
      checkpointsPassed: 5,
      survivalLives: 2,
      nextEliminationAt: 30,
      raceTime: 18.2,
      teamId: 'sun',
      teamScores: { sun: 2_300, shadow: 1_900 },
    }));
    expect(summaries.map((summary) => summary.mode)).toEqual(modes);
    expect(summaries.every((summary) => summary.objective.length < 64)).toBe(true);
    expect(summaries.find((summary) => summary.mode === 'eliminator')?.scoreValue).toBe('12 S');
    expect(summaries.find((summary) => summary.mode === 'team-race')?.scoreValue).toBe('2,300 / 1,900');
    expect(JSON.parse(JSON.stringify(summaries))).toEqual(summaries);
  });
});
