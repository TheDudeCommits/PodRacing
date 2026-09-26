import { RACING_BIOMES, RACING_BIOME_SEEDS } from '../race/racingBiomes';
import type { MasteryEvent } from './types';

// Round31 launch escarpment: 138m concave descent and excavated bowl throat
// change physical racing/recovery paths. Course8 records/favorites use the
// existing archive migration; their ghosts cannot be course9 comparison targets.
// Course 10 banks the flagship sweeper in the shared physical field and thins
// its roadside props; drive 6 changes braking, drift exit, airborne grip,
// hover attraction and bank assist, and gives each pod its own tune. Earlier
// records and ghosts are archived rather than compared against the new feel.
export const MASTERY_GENERATOR_VERSION = 'inkstorm-course-11';
export const MASTERY_PHYSICS_VERSION = 'inkstorm-drive-7';
// The expanded opponent roster changes race competition; archive earlier records.
export const MASTERY_RULES_VERSION = 'inkstorm-rules-4';
export const INKSTORM_HERO_SEED = 0x494e4b53;
export const DEFAULT_MASTERY_EVENT_ID = 'inkstorm-battle';

// Calibrated against complete stock-pod laps through every destination (round 48).
const WORLD_CUP_MEDALS = {
  desert: { gold: 63, silver: 76, bronze: 95 },
  frozen: { gold: 70, silver: 84, bronze: 105 },
  volcanic: { gold: 62, silver: 74, bronze: 93 },
  jungle: { gold: 60, silver: 72, bronze: 90 },
} as const;

export const MASTERY_EVENTS: readonly MasteryEvent[] = Object.freeze([
  {
    id: 'inkstorm-battle', title: 'Battle', subtitle: '8 racers · Weapons on',
    courseId: 'inkstorm-canyon', seed: INKSTORM_HERO_SEED,
    mode: 'circuit', profile: 'chaos', laps: 1, difficulty: 'medium', stock: true,
    medalTimes: { gold: 90, silver: 110, bronze: 145 },
  },
  {
    id: 'inkstorm-race', title: 'Race', subtitle: '8 racers · Weapons off',
    courseId: 'inkstorm-canyon', seed: INKSTORM_HERO_SEED,
    mode: 'circuit', profile: 'clean-race', laps: 1, difficulty: 'medium', stock: true,
    medalTimes: { gold: 90, silver: 110, bronze: 145 },
  },
  {
    id: 'inkstorm-trial', title: 'Sunscar • Time Attack',
    subtitle: 'One clean lap. Stock machine. Chase your personal best.',
    courseId: 'inkstorm-canyon', seed: INKSTORM_HERO_SEED,
    mode: 'circuit', profile: 'time-trial', laps: 1, difficulty: 'medium', stock: true,
    medalTimes: { gold: 90, silver: 110, bronze: 145 },
  },
  {
    id: 'flight-school', title: 'Flight School',
    subtitle: 'Learn launch, braking, drift release and heat control at your own pace.',
    courseId: 'inkstorm-canyon', seed: INKSTORM_HERO_SEED,
    mode: 'circuit', profile: 'training', laps: 1, difficulty: 'easy', stock: true,
    medalTimes: { gold: 110, silver: 145, bronze: 210 },
  },
  ...(['desert', 'frozen', 'jungle', 'volcanic'] as const).map((id, index): MasteryEvent => ({
    id: ['cup-canyon', 'cup-frostline', 'cup-verdant', 'cup-ember'][index]!,
    title: `World Cup · ${RACING_BIOMES[id].title}`,
    subtitle: `Round ${index + 1} / 4 · One lap · Stock pods · Weapons off`,
    courseId: id === 'desert' ? 'inkstorm-canyon' : `biome-${id}-v1`,
    seed: id === 'desert' ? INKSTORM_HERO_SEED : RACING_BIOME_SEEDS[id],
    mode: 'circuit', profile: 'clean-race', laps: 1, difficulty: 'medium', stock: true,
    medalTimes: WORLD_CUP_MEDALS[id],
    championshipRound: index + 1,
  })),
  ...(['frozen', 'volcanic', 'jungle'] as const).flatMap((id) =>
    (['battle', 'race', 'trial'] as const).map((kind): MasteryEvent => ({
      id: `biome-${id}-${kind}`, title: `${RACING_BIOMES[id].title} · ${kind === 'trial' ? 'Time Trial' : kind === 'race' ? 'Race' : 'Battle'}`,
      subtitle: RACING_BIOMES[id].subtitle, courseId: `biome-${id}-v1`, seed: RACING_BIOME_SEEDS[id],
      mode: 'circuit', profile: kind === 'trial' ? 'time-trial' : kind === 'race' ? 'clean-race' : 'chaos',
      laps: 1, difficulty: 'medium', stock: true,
      medalTimes: { gold: 110, silver: 140, bronze: 180 },
    }))),
  {
    id: 'open-expedition', title: 'Open Expedition',
    subtitle: 'Fresh course every race. Your rules, Workshop builds and combat.',
    courseId: 'procedural', seed: INKSTORM_HERO_SEED,
    mode: 'circuit', profile: 'chaos', laps: 1, difficulty: 'medium', stock: false,
    medalTimes: { gold: 90, silver: 120, bronze: 170 },
  },
]);

/** UTC makes the same daily challenge available to every player worldwide. */
export function dailyMasteryEvent(date = new Date()): MasteryEvent {
  const day = date.toISOString().slice(0, 10);
  let seed = 2166136261;
  for (const char of `inkstorm-daily-v1:${day}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return {
    id: `daily-${day}`, title: 'Daily Flight',
    subtitle: `${day} • Shared course, stock build, one clean lap.`,
    courseId: `daily-${day}`, seed, mode: 'circuit', profile: 'time-trial',
    laps: 1, difficulty: 'medium', stock: true, dailyDate: day,
    medalTimes: { gold: 90, silver: 120, bronze: 170 },
  };
}

export function getMasteryEvent(id: string, date = new Date()): MasteryEvent {
  if (id === 'daily' || id === dailyMasteryEvent(date).id) return dailyMasteryEvent(date);
  return MASTERY_EVENTS.find((event) => event.id === id) ?? MASTERY_EVENTS[0]!;
}

export const CHAMPIONSHIP_EVENT_IDS = ['cup-canyon', 'cup-frostline', 'cup-verdant', 'cup-ember'] as const;
export const CHAMPIONSHIP_POINTS = [15, 12, 10, 8, 6, 4, 2, 1] as const;
