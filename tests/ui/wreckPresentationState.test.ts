import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameApp } from '../../src/render/app/GameApp';
import { CombatPresentationController, type CombatPresentationContext } from '../../src/render/combat/CombatPresentationController';
import { RaceHud, type CombatHudFrame } from '../../src/ui/RaceHud';
import type { GalacticEvent, GalacticWreckPhase } from '../../src/game/galactic/types';

afterEach(() => vi.restoreAllMocks());

function element() {
  const classes = new Set<string>();
  return {
    classList: {
      contains: (name: string) => classes.has(name),
      toggle(name: string, force: boolean) { if (force) classes.add(name); else classes.delete(name); return force; },
    },
    dataset: {} as Record<string, string>, textContent: '', hidden: true,
    setAttribute: vi.fn(), style: { setProperty: vi.fn() },
  };
}

function fixture(reducedMotion = false, role: 'solo' | 'guest' = 'solo') {
  const root = element(); root.dataset.phase = 'racing';
  root.classList.toggle('is-reduced-motion', reducedMotion);
  const hud = Object.create(RaceHud.prototype) as RaceHud;
  Object.assign(hud, { root, pause: element(), combatFeedback: element(), combatFeedbackTitle: element(),
    combatFeedbackDetail: element(), combatFeedbackKey: '', systemMotionPreference: null });
  const fullTelemetry = vi.spyOn(hud, 'update');
  const controller = new CombatPresentationController();
  let now = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  let context: CombatPresentationContext = { role, localRacerId: 'local', racing: true, paused: false,
    capture: false, reducedMotion, motionIntensity: 1, allowOffensiveSlowMotion: true,
    allowVictimSlowMotion: true, racerName: id => id };
  const app = Object.create(GameApp.prototype) as any;
  Object.assign(app, { renderer: { info: { reset: vi.fn() } }, combatPresentation: controller,
    combatContext: () => context, room: { lobby: { localRacerId: 'local' } },
    race: { state: { entries: [] } }, simulationFrame: 912, nextHudFrame: 916 });
  const received: (GalacticWreckPhase | undefined)[] = [];
  const stopBeforeGpu = new Error('component stops after real render-to-HUD handoff');
  app.hud = { updateCombat(frame: CombatHudFrame, phase?: GalacticWreckPhase) {
    received.push(phase); hud.updateCombat(frame, phase); throw stopBeforeGpu;
  } };
  const entry = (id: string, phase?: GalacticWreckPhase) => Object.freeze({ id, isPlayer: id === 'host',
    ...(phase ? { galactic: Object.freeze({ wreck: Object.freeze({ phase }) }) } : {}) });
  const render = (phase: GalacticWreckPhase | undefined, paused = false, missing = false) => {
    now += 16.7; context = { ...context, paused }; hud.setPaused(paused);
    // Retain a wrecked remote/host entry: only the actual local id may drive this HUD bit.
    app.race.state.entries = Object.freeze([entry('host', 'wrecked'), ...(missing ? [] : [entry('local', phase)])]);
    const before = JSON.stringify(app.race.state);
    expect(() => app.render(1 / 60)).toThrow(stopBeforeGpu);
    expect(JSON.stringify(app.race.state)).toBe(before);
    expect(app.nextHudFrame).toBe(916);
    expect(fullTelemetry).not.toHaveBeenCalled();
  };
  return { root, hud, controller, context, render, received, fullTelemetry,
    suppressed: () => ['is-paused', 'has-wreck-state', 'has-wreck-cue', 'has-cinematic-matte'].some(c => root.classList.contains(c)) };
}

const wreck: GalacticEvent = Object.freeze({ type: 'wreck', racerId: 'local', cause: 'redline-explosion',
  sourceId: null, takedownBy: null, runTokens: 2 });

describe('per-render authoritative wreck presentation', () => {
  it.each([false, true])('keeps feedback suppressed across cue cancellation and resume before another telemetry tick (reduced=%s)', reduced => {
    const f = fixture(reduced);
    f.render('running'); expect(f.suppressed()).toBe(false);
    f.controller.consume([{ id: '912:0', event: wreck }], 1000, f.context);
    f.render('wrecked'); expect(f.root.classList.contains('has-wreck-cue')).toBe(true);
    expect(f.suppressed()).toBe(true);
    f.render('wrecked', true); // Real controller reconciliation cancels the cue during pause.
    expect(f.root.classList.contains('has-wreck-cue')).toBe(false);
    expect(f.suppressed()).toBe(true);
    f.render('wrecked'); // Native V32 failure: paused=false, cue=null, no full-HUD refresh yet.
    expect(f.root.classList.contains('is-paused')).toBe(false);
    expect(f.root.classList.contains('has-wreck-cue')).toBe(false);
    expect(f.root.classList.contains('has-wreck-state')).toBe(true);
    expect(f.suppressed()).toBe(true);
    f.render('recovering'); expect(f.root.classList.contains('has-wreck-state')).toBe(true);
    f.render('running'); expect(f.root.classList.contains('has-wreck-state')).toBe(false);
    expect(f.suppressed()).toBe(false);
    expect(f.received).toEqual(['running', 'wrecked', 'wrecked', 'wrecked', 'recovering', 'running']);
    expect(f.fullTelemetry).not.toHaveBeenCalled();
  });

  it('uses the current guest-local entry and explicitly clears stale state when galactic state or the entry disappears', () => {
    const f = fixture(false, 'guest');
    f.render('wrecked'); expect(f.root.classList.contains('has-wreck-state')).toBe(true);
    f.render(undefined); expect(f.suppressed()).toBe(false);
    f.render('recovering'); expect(f.root.classList.contains('has-wreck-state')).toBe(true);
    f.render(undefined, false, true); expect(f.suppressed()).toBe(false);
    f.render('running'); expect(f.suppressed()).toBe(false);
    expect(f.received).toEqual(['wrecked', 'running', 'recovering', 'running', 'running']);
  });

  it('preserves one-argument event-only callers without treating a cleared cue as authoritative recovery', () => {
    const f = fixture();
    f.root.classList.toggle('has-wreck-state', true);
    f.hud.updateCombat({ cue: null, cinematic: { active: false, progress: 1, letterbox: false } });
    expect(f.root.classList.contains('has-wreck-state')).toBe(true);
    expect(f.root.classList.contains('has-wreck-cue')).toBe(false);
  });
});
