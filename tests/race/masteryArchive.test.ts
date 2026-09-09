import { describe, expect, it } from 'vitest';
import { RaceMastery, createRecordIdentity, emptyMasteryProfile, getMasteryEvent, parseMasteryProfile,
  recordIdentityKey, saveMasteryProfile, type MasteryStartOptions, type MasteryStorage } from '../../src/game/mastery';
import type { MasteryRecord, SavedCourse } from '../../src/game/mastery/types';

const event = getMasteryEvent('inkstorm-trial');
const options: MasteryStartOptions = { event, courseSeed: event.seed, directorSeed: event.seed, vehicleClass: 'podracer' };
function record(change: Partial<MasteryRecord['identity']> = {}): MasteryRecord {
  const identity = { ...createRecordIdentity(options), ...change };
  return { identity, time: 100, lapTimes: [100], sectors: [50, 50], medal: 'silver', recordedAt: '2026-09-06T11:00:00.000Z',
    ghost: { version: 1, sampleHz: 10, duration: 100, identityKey: recordIdentityKey(identity), frames: [[0, 0, 0, 0, 0, 0, 0, 0], [100, 100, 0, 0, 0, 0, 0, 0]] } };
}
function favorite(generatorVersion = createRecordIdentity(options).generatorVersion): SavedCourse {
  return { id: 'saved-course', title: 'Saved canyon', seed: event.seed, generatorVersion, savedAt: '2026-09-06T11:00:00.000Z' };
}

describe('past-edition progress retention', () => {
  it('migrates old course, physics and rules metadata once without activating their ghosts or saved events', () => {
    const profile = emptyMasteryProfile();
    const old = [record({ generatorVersion: 'old-course' }), record({ physicsVersion: 'old-drive' }), record({ rulesVersion: 'old-rules' })];
    profile.records = Object.fromEntries(old.map(value => [recordIdentityKey(value.identity), value]));
    profile.favorites = [favorite('old-course')];
    const history = { id: 'old-run', eventId: event.id, time: 100, placement: 1, medal: 'silver' as const, valid: true, recordedAt: old[0]!.recordedAt };
    profile.history.push(history);
    let raw = JSON.stringify(profile);
    const storage: MasteryStorage = { getItem: () => raw, setItem: (_key, value) => { raw = value; } };
    for (let i = 0; i < 3; i++) {
      const loaded = new RaceMastery(storage);
      loaded.beginRun(options);
      expect(loaded.model()).toMatchObject({ bestTime: null, ghostAvailable: false, courseSaved: false });
      expect(loaded.ghostPose(50)).toBeNull();
      expect(loaded.model().events.some(value => value.id === 'saved-course')).toBe(false);
      expect(loaded.profile.archivedRecords).toHaveLength(3);
      expect(loaded.profile.archivedRecords.every(value => value.ghost === null)).toBe(true);
      expect(loaded.profile.archivedRecords.map(value => value.identity)).toEqual(old.map(value => value.identity));
      expect(loaded.profile.archivedFavorites).toEqual([favorite('old-course')]);
      expect(loaded.profile.history).toEqual([history]);
      expect(saveMasteryProfile(loaded.profile, storage)).toBeNull();
    }
  });

  it('retains archives and current best times when quota fallback has to remove active ghosts', () => {
    const profile = emptyMasteryProfile();
    const current = record();
    profile.records[recordIdentityKey(current.identity)] = current;
    profile.archivedRecords = [record({ generatorVersion: 'old-course' })];
    profile.archivedFavorites = [favorite('old-course')];
    let raw = '';
    const storage: MasteryStorage = { getItem: () => raw, setItem: (_key, value) => {
      const saved = JSON.parse(value);
      if (Object.values(saved.records).some((entry: any) => entry.ghost)) throw new Error('quota');
      raw = value;
    } };
    expect(saveMasteryProfile(profile, storage)).toContain('Ghost storage is full');
    const loaded = parseMasteryProfile(raw);
    expect(loaded.records[recordIdentityKey(current.identity)]).toMatchObject({ time: 100, ghost: null });
    expect(loaded.archivedRecords).toEqual([{ ...profile.archivedRecords[0], ghost: null }]);
    expect(loaded.archivedFavorites).toEqual(profile.archivedFavorites);
  });

  it('bounds archives, deduplicates identity metadata, rejects damaged entries and never promotes archived records', () => {
    const archived = Array.from({ length: 90 }, (_, i) => ({ ...record({ courseId: `old-${i}` }),
      recordedAt: new Date(Date.UTC(2026, 1, 1 + i)).toISOString() }));
    const profile = { ...emptyMasteryProfile(), archivedRecords: [...archived, archived.at(-1), { ...record(), time: -1 }],
      archivedFavorites: [favorite('old-course'), favorite('old-course'), { ...favorite(), seed: -1 }] };
    const loaded = parseMasteryProfile(JSON.stringify(profile));
    expect(loaded.archivedRecords.length).toBeLessThanOrEqual(72);
    expect(new Set(loaded.archivedRecords.map(value => recordIdentityKey(value.identity))).size).toBe(loaded.archivedRecords.length);
    expect(loaded.archivedRecords.every(value => value.ghost === null && value.time > 0)).toBe(true);
    expect(loaded.archivedRecords[0]!.identity.courseId).toBe('old-89');
    expect(loaded.archivedFavorites).toEqual([favorite('old-course')]);
    expect(loaded.records).toEqual({});
    expect(loaded.favorites).toEqual([]);
  });
});
