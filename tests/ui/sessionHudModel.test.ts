import { describe, expect, it } from 'vitest';
import { createSessionHudViewModel, createVehicleSelectionViewModel } from '../../src/ui/model';
import type { HudMasteryViewModel } from '../../src/game/mastery/types';

const lesson: HudMasteryViewModel = {
  eventId: 'training', eventTitle: 'Flight School', eventSubtitle: 'Learn the controls', events: [],
  bestTime: null, medal: 'none', ghostAvailable: false, ghostEnabled: false, courseSaved: false,
  latestSector: null, tutorial: { step: 1, total: 5, title: 'Launch', instruction: 'Tap throttle during the countdown.', progress: 0, complete: false },
  result: null, championship: [], championshipRound: 0, storageWarning: null,
};

describe('session HUD navigation and teaching', () => {
  it('offers retry during the active solo countdown while teaching the launch input', () => {
    expect(createSessionHudViewModel({ phase: 'countdown', preRace: createVehicleSelectionViewModel('podracer', false), mastery: lesson }))
      .toMatchObject({ solo: true, canRestart: true, tutorialVisible: true, eventTitle: 'Flight School' });
  });

  it.each(['host', 'guest'] as const)('withholds local retry from an online %s', (role) => {
    const preRace = createVehicleSelectionViewModel('podracer', false);
    preRace.lobby = { ...preRace.lobby, role };
    expect(createSessionHudViewModel({ phase: 'racing', preRace })).toMatchObject({ solo: false, canRestart: false });
  });

  it('hides the launch lesson and mid-run navigation in the hangar and after finishing', () => {
    expect(createSessionHudViewModel({ phase: 'countdown', preRace: createVehicleSelectionViewModel('podracer', true), mastery: lesson }))
      .toMatchObject({ canRestart: false, tutorialVisible: false });
    expect(createSessionHudViewModel({ phase: 'finished', mastery: lesson })).toMatchObject({ canRestart: false, tutorialVisible: false });
  });
});
