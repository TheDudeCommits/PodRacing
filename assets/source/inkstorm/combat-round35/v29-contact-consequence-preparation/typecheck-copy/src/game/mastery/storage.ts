import { MAX_GHOST_FRAMES } from './ghost';
import { MASTERY_GENERATOR_VERSION, MASTERY_PHYSICS_VERSION, MASTERY_RULES_VERSION } from './events';
import type { GhostRun, MasteryMedal, MasteryProfile, MasteryRecord, MasteryStartOptions, RecordIdentity, SavedCourse } from './types';

export const MASTERY_STORAGE_KEY = 'podracing.inkstorm.mastery.v1';
export interface MasteryStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }
const MAX_RECORDS = 36;
const MAX_GHOSTS = 3;
const MAX_ARCHIVED_RECORDS = 72;
const MAX_ARCHIVED_FAVORITES = 32;
const string = (value: unknown): value is string => typeof value === 'string' && value.length < 512;
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 10800;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const medal = (value: unknown): value is MasteryMedal => ['none', 'bronze', 'silver', 'gold'].includes(value as string);
const times = (value: unknown): value is number[] => Array.isArray(value) && value.length < 300 && value.every(positive);

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

export function createRecordIdentity(options: MasteryStartOptions): RecordIdentity {
  return {
    version: 1, courseId: options.event.courseId, courseSeed: options.courseSeed >>> 0,
    generatorVersion: MASTERY_GENERATOR_VERSION, physicsVersion: MASTERY_PHYSICS_VERSION,
    rulesVersion: MASTERY_RULES_VERSION, eventId: options.event.id, directorSeed: options.directorSeed >>> 0,
    profile: options.event.profile, mode: options.event.mode, laps: options.event.laps,
    difficulty: options.event.difficulty, vehicleClass: options.vehicleClass,
    loadoutKey: options.loadout ? stableStringify(options.loadout.slots) : 'stock',
    tuneKey: stableStringify(options.tune ?? 'default'),
  };
}

/** Full canonical metadata avoids hash collisions putting unrelated runs together. */
export function recordIdentityKey(identity: RecordIdentity): string { return stableStringify(identity); }

export function emptyMasteryProfile(): MasteryProfile {
  return { version: 1, records: {}, favorites: [], archivedRecords: [], archivedFavorites: [], history: [], championship: { version: 1, rounds: [] }, tutorialComplete: false, ghostEnabled: true };
}

function validIdentity(value: unknown): value is RecordIdentity {
  if (!object(value) || value.version !== 1) return false;
  return ['courseId', 'generatorVersion', 'physicsVersion', 'rulesVersion', 'eventId'].every((key) => string(value[key]))
    && ['courseSeed', 'directorSeed'].every((key) => Number.isInteger(value[key]) && Number(value[key]) >= 0 && Number(value[key]) <= 0xffff_ffff)
    && typeof value.tuneKey === 'string' && value.tuneKey.length < 12000
    && typeof value.loadoutKey === 'string' && value.loadoutKey.length < 2000
    && ['chaos', 'clean-race', 'time-trial', 'training'].includes(value.profile as string)
    && ['circuit', 'eliminator', 'checkpoint-sprint', 'combat-race', 'survival-gauntlet', 'drift-trial', 'team-race'].includes(value.mode as string)
    && [1, 2, 3].includes(value.laps as number)
    && ['easy', 'medium', 'hard'].includes(value.difficulty as string)
    && ['podracer', 'landspeeder', 'speeder-bike', 'skim-speeder'].includes(value.vehicleClass as string);
}

function validGhost(value: unknown, key: string, duration: number): value is GhostRun {
  if (!object(value) || value.version !== 1 || value.identityKey !== key || value.sampleHz !== 10 || value.duration !== duration
    || !Array.isArray(value.frames) || value.frames.length < 2 || value.frames.length > MAX_GHOST_FRAMES) return false;
  let previous = -1;
  for (const frame of value.frames) {
    if (!Array.isArray(frame) || frame.length !== 8 || !frame.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1e7)) return false;
    if (frame[0] < 0 || frame[0] <= previous || frame[0] > duration + 0.001) return false;
    previous = frame[0];
  }
  return value.frames[0][0] < 0.02 && Math.abs(previous - duration) < 0.11;
}

function readRecord(candidate: unknown, retainGhost: boolean): MasteryRecord | null {
  if (!object(candidate) || !validIdentity(candidate.identity) || !positive(candidate.time)
    || !times(candidate.lapTimes) || !times(candidate.sectors) || !medal(candidate.medal) || !string(candidate.recordedAt)) return null;
  const key = recordIdentityKey(candidate.identity);
  return { identity: candidate.identity, time: candidate.time, lapTimes: candidate.lapTimes,
    sectors: candidate.sectors, medal: candidate.medal, recordedAt: candidate.recordedAt,
    ghost: retainGhost && validGhost(candidate.ghost, key, candidate.time) ? candidate.ghost : null };
}

function readFavorite(entry: unknown): SavedCourse | null {
  if (!object(entry) || !string(entry.id) || !string(entry.title) || !string(entry.generatorVersion)
    || !Number.isInteger(entry.seed) || Number(entry.seed) < 0 || Number(entry.seed) > 0xffff_ffff || !string(entry.savedAt)) return null;
  return { id: entry.id, title: entry.title, seed: Number(entry.seed), generatorVersion: entry.generatorVersion, savedAt: entry.savedAt };
}

/** Fail closed per record; a damaged ghost does not discard a valid best time. */
export function parseMasteryProfile(raw: string | null): MasteryProfile {
  const clean = emptyMasteryProfile();
  if (!raw || raw.length > 5_000_000) return clean;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return clean; }
  if (!object(value) || value.version !== 1) return clean;
  if (Array.isArray(value.archivedRecords)) {
    for (const candidate of value.archivedRecords.slice(-MAX_ARCHIVED_RECORDS)) {
      const record = readRecord(candidate, false);
      if (record) clean.archivedRecords.push(record);
    }
  }
  if (Array.isArray(value.archivedFavorites)) {
    for (const candidate of value.archivedFavorites.slice(-MAX_ARCHIVED_FAVORITES)) {
      const favorite = readFavorite(candidate);
      if (favorite) clean.archivedFavorites.push(favorite);
    }
  }
  if (object(value.records)) {
    for (const candidate of Object.values(value.records).slice(-MAX_RECORDS)) {
      const record = readRecord(candidate, true);
      if (!record) continue;
      // Old versions cannot silently become the target of new ghost comparisons.
      if (record.identity.generatorVersion !== MASTERY_GENERATOR_VERSION
        || record.identity.physicsVersion !== MASTERY_PHYSICS_VERSION
        || record.identity.rulesVersion !== MASTERY_RULES_VERSION) {
        clean.archivedRecords.push({ ...record, ghost: null });
      } else clean.records[recordIdentityKey(record.identity)] = record;
    }
  }
  if (Array.isArray(value.favorites)) {
    for (const candidate of value.favorites.slice(-16)) {
      const favorite = readFavorite(candidate);
      if (!favorite) continue;
      if (favorite.generatorVersion === MASTERY_GENERATOR_VERSION) clean.favorites.push(favorite);
      else clean.archivedFavorites.push(favorite);
    }
  }
  if (Array.isArray(value.history)) {
    clean.history = value.history.filter((entry) => object(entry) && string(entry.id) && string(entry.eventId)
      && positive(entry.time) && Number.isInteger(entry.placement) && Number(entry.placement) >= 1 && Number(entry.placement) <= 8
      && medal(entry.medal) && typeof entry.valid === 'boolean' && string(entry.recordedAt)).slice(-40) as MasteryProfile['history'];
  }
  if (object(value.championship) && value.championship.version === 1 && Array.isArray(value.championship.rounds)) {
    for (const entry of value.championship.rounds.slice(0, 3)) {
      if (!object(entry) || !string(entry.eventId) || !Array.isArray(entry.results) || entry.results.length > 8) break;
      if (!entry.results.every((r) => object(r) && string(r.id) && string(r.name) && Number.isInteger(r.placement)
        && Number(r.placement) >= 1 && Number(r.placement) <= 8 && Number.isInteger(r.points) && Number(r.points) >= 0 && Number(r.points) <= 15)) break;
      const expected = ['cup-canyon', 'cup-foundry', 'cup-glass'][clean.championship.rounds.length];
      if (entry.eventId !== expected) break;
      clean.championship.rounds.push(entry as unknown as MasteryProfile['championship']['rounds'][number]);
    }
  }
  clean.tutorialComplete = value.tutorialComplete === true;
  clean.ghostEnabled = value.ghostEnabled !== false;
  return boundMasteryProfile(clean);
}

export function boundMasteryProfile(profile: MasteryProfile): MasteryProfile {
  const records = Object.entries(profile.records).sort(([, a], [, b]) => b.recordedAt.localeCompare(a.recordedAt)).slice(0, MAX_RECORDS);
  let ghosts = 0;
  profile.records = Object.fromEntries(records.map(([key, value]) => [key, { ...value,
    ghost: value.ghost && ghosts++ < MAX_GHOSTS ? value.ghost : null,
  }]));
  profile.history = profile.history.slice(-40);
  profile.favorites = profile.favorites.slice(-16);
  profile.archivedRecords = [...new Map(profile.archivedRecords.map(record => [recordIdentityKey(record.identity), record])).values()]
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).slice(0, MAX_ARCHIVED_RECORDS)
    .map(record => ({ ...record, ghost: null }));
  profile.archivedFavorites = [...new Map(profile.archivedFavorites.map(course => [`${course.generatorVersion}:${course.id}:${course.seed}`, course])).values()]
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, MAX_ARCHIVED_FAVORITES);
  return profile;
}

export function browserMasteryStorage(): MasteryStorage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

export function loadMasteryProfile(storage: MasteryStorage | null): MasteryProfile {
  try { return parseMasteryProfile(storage?.getItem(MASTERY_STORAGE_KEY) ?? null); } catch { return emptyMasteryProfile(); }
}

/** Returns a player-facing limitation only when durable saving was unavailable. */
export function saveMasteryProfile(profile: MasteryProfile, storage: MasteryStorage | null): string | null {
  boundMasteryProfile(profile);
  if (!storage) return 'Records are available this session; browser storage is unavailable.';
  try { storage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(profile)); return null; } catch {
    const compact = { ...profile, records: Object.fromEntries(Object.entries(profile.records).map(([key, record]) => [key, { ...record, ghost: null }])) };
    try { storage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(compact)); return 'Best times saved. Ghost storage is full.'; }
    catch { return 'Storage is full. This result is available until the page closes.'; }
  }
}
