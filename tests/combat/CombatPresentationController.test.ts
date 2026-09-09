import { describe, expect, it } from 'vitest';
import { CombatPresentationController, type CombatPresentationContext } from '../../src/render/combat/CombatPresentationController';
import type { GalacticEvent } from '../../src/game/galactic/types';

const context = (change: Partial<CombatPresentationContext> = {}): CombatPresentationContext => ({
  role: 'solo', localRacerId: 'player', racing: true, paused: false, capture: false,
  reducedMotion: false, motionIntensity: 1, allowOffensiveSlowMotion: true,
  allowVictimSlowMotion: true, racerName: (id) => id === 'rival' ? 'Rival One' : id,
  ...change,
});
const wreck: GalacticEvent = { type: 'wreck', racerId: 'player', cause: 'heat-lance',
  sourceId: 'rival', takedownBy: 'rival', runTokens: 2 };
const takedown: GalacticEvent = { type: 'takedown', attackerId: 'player', victimId: 'rival', cause: 'heat-lance' };
const hit: GalacticEvent = { type: 'weapon-hit', attackerId: 'player', targetId: 'rival',
  weapon: 'heat-lance', damage: 0.2, shielded: false };

describe('authoritative combat presentation', () => {
  it('exposes isolated diagnostic copies without changing the accepted shot or scheduler', () => {
    const controller = new CombatPresentationController();
    controller.consume([{ id: 'diagnostic-wreck', event: wreck }], 1000, context());
    const before = controller.frame(1200, context());
    const paced = controller.scheduleDelta(1 / 60, 1200, context());
    const copy = controller.diagnostics as { cooldownUntilWallMs: number | null;
      cinematic: { startedAtWallMs: number; focusRacerId: string | null; victim: boolean } | null };
    expect(copy).toEqual({ cooldownUntilWallMs: 7000,
      cinematic: { startedAtWallMs: 1000, focusRacerId: 'player', victim: true } });
    copy.cooldownUntilWallMs = 0;
    copy.cinematic!.startedAtWallMs = -10000;
    copy.cinematic!.focusRacerId = 'changed';
    copy.cinematic!.victim = false;
    expect(controller.diagnostics.cooldownUntilWallMs).toBe(7000);
    expect(controller.frame(1200, context())).toEqual(before);
    expect(controller.scheduleDelta(1 / 60, 1200, context())).toBe(paced);
  });

  it('retains the shared cooldown across denied outgoing cues and cancellation, then clears it on reset', () => {
    const controller = new CombatPresentationController();
    expect(controller.diagnostics).toEqual({ cooldownUntilWallMs: null, cinematic: null });
    controller.consume([{ id: 'victim', event: wreck }], 1000, context());
    controller.consume([{ id: 'late-hit', event: takedown }], 3750, context());
    expect(controller.frame(3800, context())).toMatchObject({ cue: { kind: 'takedown' }, timeScale: 1 });
    expect(controller.diagnostics).toEqual({ cooldownUntilWallMs: 7000,
      cinematic: { startedAtWallMs: 1000, focusRacerId: 'player', victim: true } });
    controller.cancel();
    expect(controller.diagnostics).toEqual({ cooldownUntilWallMs: 7000, cinematic: null });
    controller.consume([{ id: 'ready-again', event: takedown }], 7000, context());
    expect(controller.diagnostics).toEqual({ cooldownUntilWallMs: 13000,
      cinematic: { startedAtWallMs: 7000, focusRacerId: 'rival', victim: false } });
    controller.reset();
    expect(controller.diagnostics).toEqual({ cooldownUntilWallMs: null, cinematic: null });
  });

  it('prioritizes the local wreck in the same event batch without changing any event', () => {
    const controller = new CombatPresentationController();
    const events = [hit, takedown, wreck].map((event, index) => Object.freeze({ id: `1:${index}`, event: Object.freeze(event) }));
    const original = JSON.stringify(events);
    controller.consume(events, 1000, context());
    expect(controller.frame(1100, context())).toMatchObject({
      cue: { kind: 'wreck', title: 'TAKEN DOWN', detail: 'BY Rival One' }, timeScale: 0.18,
      cinematic: { active: true, cameraCut: true, letterbox: true, focusRacerId: 'player' },
    });
    expect(JSON.stringify(events)).toBe(original);
    expect(controller.frame(1820, context())).toMatchObject({ timeScale: 1, cinematic: { active: false } });
    expect(controller.frame(2250, context()).cue).toBeNull();
  });

  it('requires the existing record-invalidated victim policy and never authorizes outgoing clean-run slow motion', () => {
    for (const [event, flags] of [
      [wreck, { allowVictimSlowMotion: false }],
      [takedown, { allowOffensiveSlowMotion: false }],
    ] as const) {
      const controller = new CombatPresentationController();
      const ctx = context(flags);
      controller.consume([{ id: '1', event }], 0, ctx);
      expect(controller.frame(100, ctx).cue).not.toBeNull();
      expect(controller.frame(100, ctx).cinematic.active).toBe(false);
      expect(controller.scheduleDelta(1 / 60, 100, ctx)).toBe(1 / 60);
    }
  });

  it('slows an allowed solo takedown while leaving the attacker in the driving camera', () => {
    const controller = new CombatPresentationController();
    controller.consume([{ id: '1', event: takedown }], 0, context());
    expect(controller.frame(200, context())).toMatchObject({
      cue: { kind: 'takedown' }, timeScale: 0.18,
      cinematic: { active: true, cameraCut: false, letterbox: false },
    });
  });

  it.each(['host', 'guest'] as const)('keeps %s simulation scheduling real time while showing one-shot feedback', (role) => {
    const controller = new CombatPresentationController();
    const ctx = context({ role });
    controller.consume([{ id: 'room:7', event: wreck }], 0, ctx);
    expect(controller.frame(100, ctx).cue?.kind).toBe('wreck');
    expect(controller.scheduleDelta(0.05, 100, ctx)).toBe(0.05);
    expect(controller.frame(100, ctx).cinematic).toMatchObject({ active: false, cameraCut: false, letterbox: false });
    controller.consume([{ id: 'room:7', event: wreck }], 2000, ctx);
    expect(controller.frame(2000, ctx).cue).toBeNull();
  });

  it.each([{ reducedMotion: true }, { motionIntensity: 0 }])('suppresses camera cuts and letterbox for comfort %j', (comfort) => {
    const controller = new CombatPresentationController();
    const ctx = context(comfort);
    controller.consume([{ id: '1', event: wreck }], 0, ctx);
    expect(controller.frame(100, ctx)).toMatchObject({ timeScale: 0.18,
      cinematic: { active: true, cameraCut: false, letterbox: false } });
  });

  it('does not stack, refresh or replay an event, and admits a new cinematic at exactly six seconds', () => {
    const controller = new CombatPresentationController();
    const ctx = context();
    controller.consume([{ id: '1', event: wreck }], 0, ctx);
    controller.consume([{ id: '2', event: wreck }], 500, ctx);
    expect(controller.frame(600, ctx).cinematic.progress).toBeCloseTo(600 / 820);
    controller.consume([{ id: '3', event: wreck }], 5999, ctx);
    expect(controller.frame(5999, ctx).cinematic.active).toBe(false);
    controller.consume([{ id: '1', event: wreck }], 6000, ctx);
    expect(controller.frame(6000, ctx).cinematic.active).toBe(false);
    controller.consume([{ id: '4', event: wreck }], 6000, ctx);
    expect(controller.frame(6100, ctx).cinematic.active).toBe(true);
  });

  it('integrates equal scheduled time at 30, 60 and 144 Hz while every simulation tick remains 1/120', () => {
    const results = [30, 60, 144].map((hz) => {
      const controller = new CombatPresentationController();
      const ctx = context();
      controller.consume([{ id: '1', event: wreck }], 0, ctx);
      let accumulator = 0; let ticks = 0; let total = 0;
      for (let frame = 1; frame <= hz; frame += 1) {
        const delta = controller.scheduleDelta(1 / hz, frame / hz * 1000, ctx);
        total += delta; accumulator += delta;
        while (accumulator >= 1 / 120) { ticks += 1; accumulator -= 1 / 120; }
      }
      expect(total).toBeCloseTo(0.4424, 10);
      return ticks;
    });
    expect(results).toEqual([53, 53, 53]);
  });

  it.each([{ paused: true }, { capture: true }, { racing: false }])('cancels on presentation discontinuity %j without resurrecting a shot', (change) => {
    const controller = new CombatPresentationController();
    controller.consume([{ id: '1', event: wreck }], 0, context());
    expect(controller.frame(100, context(change)).cue).toBeNull();
    expect(controller.frame(110, context()).cinematic.active).toBe(false);
    controller.consume([{ id: '2', event: wreck }], 120, context());
    expect(controller.frame(150, context()).cinematic.active).toBe(false);
    controller.reset();
    controller.consume([{ id: '1', event: wreck }], 200, context());
    expect(controller.frame(300, context()).cinematic.active).toBe(true);
  });

  it('shows bounded hits and distinct powerup cues without slow motion or camera cuts', () => {
    const controller = new CombatPresentationController();
    const ctx = context();
    controller.consume([{ id: '1', event: { ...hit, shielded: true } }], 0, ctx);
    expect(controller.frame(210, ctx).cue).toMatchObject({ kind: 'shield-hit', progress: 0.5 });
    expect(controller.frame(420, ctx).cue).toBeNull();
    controller.consume([{ id: '2', event: { type: 'emp-hit', attackerId: 'rival', targetId: 'player', blocked: false, duration: 1.35 } }], 500, ctx);
    expect(controller.frame(600, ctx).cue?.title).toBe('SYSTEMS DISRUPTED');
    controller.consume([{ id: '3', event: { type: 'repair-salvage-collected', racerId: 'player', pickupId: 'repair', repaired: 0.24, cooled: 0.4, coreCooled: 0.4 } }], 1600, ctx);
    expect(controller.frame(1700, ctx).cue).toMatchObject({ kind: 'repair', title: 'REPAIR + COOLING' });
    expect(controller.frame(1700, ctx).cinematic.active).toBe(false);
  });

  it('reports actual EMP outcomes and core-only cooling without claiming an empty area was cleared', () => {
    const controller = new CombatPresentationController();
    const ctx = context();
    const pulse: GalacticEvent = { type: 'emp-pulse', racerId: 'player', pickupId: 'emp', radius: 42,
      targetIds: [], blockedIds: [], clearedOrdnance: 0 };
    controller.consume([{ id: '1', event: pulse }], 0, ctx);
    expect(controller.frame(100, ctx).cue?.detail).toBe('NO RIVALS IN RANGE');
    controller.consume([{ id: '2', event: { ...pulse, blockedIds: ['rival'] } }], 1100, ctx);
    expect(controller.frame(1200, ctx).cue?.detail).toBe('SHIELDS BLOCKED PULSE');
    controller.consume([{ id: '3', event: { ...pulse, clearedOrdnance: 2 } }], 2200, ctx);
    expect(controller.frame(2300, ctx).cue?.detail).toBe('2 ORDNANCE CLEARED');
    controller.consume([{ id: '4', event: { type: 'repair-salvage-collected', racerId: 'player', pickupId: 'repair',
      repaired: 0, cooled: 0, coreCooled: 0.4 } }], 3300, ctx);
    expect(controller.frame(3400, ctx).cue?.detail).toBe('40% CORE VENTED');
  });
});
