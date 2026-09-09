import type { MasteryEvent } from './types';

// Round31 launch escarpment: 138m concave descent and excavated bowl throat
// change physical racing/recovery paths. Course8 records/favorites use the
// existing archive migration; their ghosts cannot be course9 comparison targets.
export const MASTERY_GENERATOR_VERSION = 'inkstorm-course-9';
export const MASTERY_PHYSICS_VERSION = 'inkstorm-drive-4';
export const MASTERY_RULES_VERSION = 'inkstorm-rules-2';
export const INKSTORM_HERO_SEED = 0x494e4b53;

export const MASTERY_EVENTS: readonly MasteryEvent[] = Object.freeze([
  {
    id: 'inkstorm-trial', title: 'Inkstorm • Time Attack',
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
  {
    id: 'cup-canyon', title: 'Inkstorm Cup • Canyon',
    subtitle: 'Round 1 / 3. Eight-racer grid. Two laps. Stock machinery.',
    courseId: 'inkstorm-canyon', seed: INKSTORM_HERO_SEED,
    mode: 'circuit', profile: 'clean-race', laps: 2, difficulty: 'medium', stock: true,
    medalTimes: { gold: 180, silver: 220, bronze: 290 }, championshipRound: 1,
  },
  {
    id: 'cup-foundry', title: 'Inkstorm Cup • Foundry',
    subtitle: 'Round 2 / 3. Industrial sweepers reward patient boost timing.',
    courseId: 'foundry-run', seed: 0x464f554e,
    mode: 'circuit', profile: 'clean-race', laps: 2, difficulty: 'medium', stock: true,
    medalTimes: { gold: 180, silver: 225, bronze: 300 }, championshipRound: 2,
  },
  {
    id: 'cup-glass', title: 'Inkstorm Cup • Glasslands',
    subtitle: 'Final round. Carry your championship points into the high-speed flats.',
    courseId: 'glasslands-run', seed: 0x474c4153,
    mode: 'circuit', profile: 'clean-race', laps: 2, difficulty: 'medium', stock: true,
    medalTimes: { gold: 180, silver: 225, bronze: 300 }, championshipRound: 3,
  },
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

export const CHAMPIONSHIP_EVENT_IDS = ['cup-canyon', 'cup-foundry', 'cup-glass'] as const;
export const CHAMPIONSHIP_POINTS = [15, 12, 10, 8, 6, 4, 2, 1] as const;
