import { describe, expect, it } from 'vitest';
import { dailyMasteryEvent, MASTERY_EVENTS } from '../../src/game/mastery/events';
import type { HudMasteryViewModel } from '../../src/game/mastery/types';
import { createRaceEventAtlasModel, raceEventAtlasKeyIndex } from '../../src/ui/RaceEventAtlas';

function model(day = '2026-09-09'): HudMasteryViewModel {
  const events = [...MASTERY_EVENTS, dailyMasteryEvent(new Date(`${day}T12:00:00Z`))].map(({ id, title, subtitle }) => ({ id, title, subtitle }));
  return { eventId: events[0]!.id, eventTitle: events[0]!.title, eventSubtitle: events[0]!.subtitle, events,
    bestTime: null, medal: 'none', ghostAvailable: false, ghostEnabled: false, courseSaved: false,
    latestSector: null, tutorial: null, result: null, championship: [], championshipRound: 0, storageWarning: null };
}

describe('race event atlas calendar and selection contract', () => {
  it('shows exactly the seven actual calendar entries with no invented courses or event labels', () => {
    const input = model(), actual = createRaceEventAtlasModel(input);
    expect(actual.events).toEqual(input.events); expect(actual.events).toHaveLength(7);
    expect(actual.selectedId).toBe(input.eventId); expect(actual.canStart).toBe(true);
    expect(actual.title).toBe(input.events[0]!.title); expect(actual.subtitle).toBe(input.events[0]!.subtitle);
  });
  it('tracks authoritative selection and permission changes without changing the source view model', () => {
    const input = model(), before = JSON.stringify(input);
    expect(createRaceEventAtlasModel(input, false).canStart).toBe(false);
    const switched = { ...input, eventId: 'cup-foundry' };
    expect(createRaceEventAtlasModel(switched)).toMatchObject({ selectedId: 'cup-foundry', title: 'Inkstorm Cup • Foundry', canStart: true });
    expect(JSON.stringify(input)).toBe(before);
    const projected = createRaceEventAtlasModel(input); projected.events[0]!.title = 'Changed outside';
    expect(input.events[0]!.title).toBe('Inkstorm • Time Attack');
  });
  it('replaces the old daily ID and disables launch until the new calendar selection is valid', () => {
    const yesterday = model('2026-09-08'), today = model();
    yesterday.eventId = 'daily-2026-09-08'; today.eventId = yesterday.eventId;
    expect(createRaceEventAtlasModel(yesterday).canStart).toBe(true);
    const stale = createRaceEventAtlasModel(today);
    expect(stale.selectedId).toBeNull(); expect(stale.canStart).toBe(false);
    expect(stale.events.map(event => event.id)).not.toContain(yesterday.eventId);
    today.eventId = 'daily-2026-09-09';
    expect(createRaceEventAtlasModel(today)).toMatchObject({ selectedId: today.eventId, canStart: true, title: 'Daily Flight' });
  });
  it('has a safe empty lifecycle and no silent first-event fallback for an unknown selected ID', () => {
    expect(createRaceEventAtlasModel(undefined)).toMatchObject({ events: [], selectedId: null, canStart: false });
    const input = model(); input.eventId = 'unknown';
    expect(createRaceEventAtlasModel(input)).toMatchObject({ selectedId: null, canStart: false, title: 'Choose an event' });
    input.events = []; expect(createRaceEventAtlasModel(input).canStart).toBe(false);
  });
  it('keeps first identity on duplicate IDs and preserves event text literally for textContent rendering', () => {
    const input = model(); input.events[0]!.title = '<img onerror="bad()"> & event';
    input.events.push({ id: input.events[0]!.id, title: 'Duplicate', subtitle: '' }, { id: '', title: 'No identity', subtitle: '' });
    const actual = createRaceEventAtlasModel(input);
    expect(actual.events).toHaveLength(7); expect(actual.title).toBe('<img onerror="bad()"> & event');
  });
});

describe('race event atlas keyboard reachability', () => {
  it('reaches all seven events in order, wraps both directions and supports Home/End', () => {
    let index = 0; const visited = [index];
    for (let i = 0; i < 6; i++) { index = raceEventAtlasKeyIndex('ArrowRight', index, 7)!; visited.push(index); }
    expect(visited).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(raceEventAtlasKeyIndex('ArrowRight', 6, 7)).toBe(0);
    expect(raceEventAtlasKeyIndex('ArrowLeft', 0, 7)).toBe(6);
    expect(raceEventAtlasKeyIndex('Home', 4, 7)).toBe(0);
    expect(raceEventAtlasKeyIndex('End', 0, 7)).toBe(6);
    expect(raceEventAtlasKeyIndex('ArrowDown', 3, 7)).toBe(4);
    expect(raceEventAtlasKeyIndex('ArrowUp', 3, 7)).toBe(2);
  });
  it('leaves Enter/Space/Tab native and handles an empty calendar without an invalid index', () => {
    for (const key of ['Enter', ' ', 'Tab', 'Escape']) expect(raceEventAtlasKeyIndex(key, 1, 7)).toBeNull();
    expect(raceEventAtlasKeyIndex('ArrowRight', -1, 0)).toBeNull();
    expect(raceEventAtlasKeyIndex('ArrowRight', -1, 7)).toBe(0);
  });
});
