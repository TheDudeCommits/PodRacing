import {
  createRaceDirectorHudViewModel,
  createRaceModeStatusViewModel,
  createSettingsHudViewModel,
  createVehicleSelectionViewModel,
  createWorkshopHudViewModel,
  RaceHud,
  type RaceHudViewModel,
} from '../../src/ui';

const mount = document.querySelector<HTMLElement>('#hud-stage');
if (!mount) throw new Error('Missing HUD stage.');

const course = Array.from({ length: 128 }, (_, index) => {
  const angle = index / 128 * Math.PI * 2;
  const radiusX = 920 + Math.sin(angle * 3) * 170;
  const radiusZ = 1_150 + Math.cos(angle * 4) * 220;
  return { x: Math.cos(angle) * radiusX, z: Math.sin(angle) * radiusZ, progress: index / 128 };
});

const pointAt = (progress: number): { x: number; z: number } => {
  const point = course[Math.floor(progress * course.length) % course.length];
  return point ?? { x: 0, z: 0 };
};
const branchStart = 0.08;
const branchEnd = 0.22;
const shortcutPoints = Array.from({ length: 22 }, (_, index) => {
  const routeProgress = index / 21;
  const point = pointAt(branchStart + (branchEnd - branchStart) * routeProgress);
  const bow = Math.sin(routeProgress * Math.PI);
  return { x: point.x - bow * 260, z: point.z + bow * 80 };
});
const query = new URLSearchParams(location.search);
const requestedPhase = query.get('phase');
const phase = requestedPhase === 'finish' ? 'finished' : requestedPhase === 'countdown' ? 'countdown' : 'racing';
const racerData = [
  { id: 'player', name: 'You', progress: 0.48, placement: 2, isPlayer: true },
  { id: 'ai-vexa', name: 'Vexa Ruun', progress: 0.51, placement: 1, isPlayer: false },
  { id: 'ai-talik', name: 'Talik Venn', progress: 0.43, placement: 3, isPlayer: false },
  { id: 'ai-kodo', name: 'Kodo Fizz', progress: 0.39, placement: 4, isPlayer: false },
];
const selectedVehicle = query.get('vehicle') === 'landspeeder'
  ? 'landspeeder'
  : query.get('vehicle') === 'speeder-bike'
    ? 'speeder-bike'
    : query.get('vehicle') === 'skim-speeder'
      ? 'skim-speeder'
      : 'podracer';

const model: RaceHudViewModel = {
  phase,
  speedMps: 147.5,
  normalizedSpeed: 0.76,
  lap: 2,
  totalLaps: 3,
  position: 2,
  racerCount: 4,
  raceTime: 94.287,
  lastSplit: 12.35,
  splitDelta: -0.386,
  boost: 0.68,
  boostActive: false,
  driftCharge: 0.53,
  heat: 0.72,
  damage: 0.19,
  wrongWay: query.has('wrongWay'),
  corner: { direction: 'left', severity: 0.82, distance: 86, label: 'narrow canyon' },
  countdownCue: phase === 'countdown' ? 2 : null,
  launch: phase === 'countdown'
    ? {
        stage: 'charging', rev: 0.69, target: 0.74,
        sweetSpotMin: 0.635, sweetSpotMax: 0.845, heat: 0.37, outcome: null,
      }
    : query.has('launchResult')
      ? {
          stage: 'result', rev: 0.73, target: 0.72,
          sweetSpotMin: 0.615, sweetSpotMax: 0.825, heat: 0.42, outcome: 'perfect',
        }
      : undefined,
  raceModeStatus: createRaceModeStatusViewModel('combat-race', {
    score: 1_240,
    objectiveTarget: 2_500,
    position: 2,
    racerCount: 4,
    lap: 2,
    totalLaps: 3,
  }),
  directorEvent: query.has('director')
    ? createRaceDirectorHudViewModel({
        events: [{
          id: 'director-preview', kind: 'lane-collapse', sectionTag: 'chicane', duration: 9,
          phase: query.get('director') === 'end' ? 'complete' : query.get('director') === 'warning' ? 'warning' : 'active',
          activatedAt: 90,
          completedAt: query.get('director') === 'end' ? 93.4 : null,
          side: 1,
        }],
      }, 94.287)
    : undefined,
  course,
  courseBranches: [{ id: 'glass-cut', kind: 'shortcut', points: shortcutPoints }],
  racers: racerData.map((racer) => ({
    id: racer.id,
    name: racer.name,
    ...pointAt(racer.progress),
    courseProgress: racer.progress,
    placement: racer.placement,
    isPlayer: racer.isPlayer,
  })),
  results: racerData.map((racer) => ({
    id: racer.id,
    name: racer.name,
    placement: racer.placement,
    finishTime: 182.4 + racer.placement * 1.73,
    bestLap: 59.1 + racer.placement * 0.42,
    isPlayer: racer.isPlayer,
  })).sort((a, b) => a.placement - b.placement),
  resultsPresentation: requestedPhase === 'finish'
    ? {
        headline: 'The canyon decided it by a wingtip',
        photoFinish: { rivalName: 'Vexa Ruun', gapSeconds: 0.047, won: false },
        highlights: [
          { id: 'finish', title: 'Wingtip deficit', detail: 'Final straight duel', kind: 'photo-finish', time: 184.13 },
          { id: 'lap', title: 'Boonta best lap', detail: 'No contact', kind: 'fastest-lap', time: 59.52 },
        ],
      }
    : undefined,
  controlsVisible: query.has('controls'),
  preRace: requestedPhase === 'selection'
      ? createVehicleSelectionViewModel(
        selectedVehicle,
        true,
        query.get('lobby') === 'guest'
          ? {
              selectedLaps: 2,
              lobby: {
                role: 'guest',
                roomCode: 'A1B2C3',
                status: 'waiting',
                statusText: 'Waiting for host to launch',
                members: [
                  { id: 'host', name: 'Boonta Host', isHost: true, isLocal: false },
                  { id: 'guest', name: 'You', isHost: false, isLocal: true },
                ],
                capacity: 4,
                canStart: false,
              },
            }
          : {
              selectedLaps: 3,
              aiDifficulty: 'hard',
              raceMode: 'combat-race',
              workshop: createWorkshopHudViewModel(selectedVehicle, undefined, {
                open: query.has('workshop'),
                activeSlot: 'engine',
              }),
            },
      )
    : undefined,
  settings: query.has('settings')
    ? createSettingsHudViewModel(undefined, {
        open: true,
        activeTab: query.get('settingsTab') === 'audio'
          ? 'audio'
          : query.get('settingsTab') === 'controls'
            ? 'controls'
            : 'comfort',
      })
    : undefined,
  threats: query.has('threats')
    ? [
        { id: 'lance', label: 'Heat Lance', bearingDegrees: -52, urgency: 0.91, kind: 'weapon' },
        { id: 'rock', label: 'Rockfall', bearingDegrees: 39, urgency: 0.68, kind: 'hazard' },
      ]
    : undefined,
  galactic: {
    vehicleClass: 'Needle Speeder Bike',
    shieldRemaining: 0.72,
    shieldActive: true,
    shieldCooldown: 0,
    shieldDuration: 0.95,
    weaponName: 'Heat Lance',
    weaponCooldown: 0.18,
    weaponCooldownDuration: 0.56,
    weaponTarget: 'Vexa Ruun',
    weaponShots: 21,
    weaponHits: 13,
    mineCount: 2,
    redlineHeat: 0.84,
    redlineActive: true,
    statusLabel: query.has('wreck') ? 'rockfall stun' : null,
    statusIntensity: query.has('wreck') ? 0.92 : 0,
    wreckPhase: query.has('wreck') ? 'recovering' : null,
    wreckTimer: query.has('wreck') ? 1.8 : 0,
    upgrades: ['afterburner 2', 'cornering 1', 'pulse capacitor'],
    takedowns: 3,
  },
};

const hud = new RaceHud(mount);
hud.update(model);
hud.setPaused(query.has('pause') || query.has('settings'));
(window as typeof window & { __HUD_READY__?: boolean }).__HUD_READY__ = true;
