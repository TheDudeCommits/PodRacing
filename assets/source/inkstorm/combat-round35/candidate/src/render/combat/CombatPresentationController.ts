import type { GalacticEvent } from '../../game/galactic/types';

export type CombatCueKind = 'hit' | 'shield-hit' | 'takedown' | 'wreck' | 'emp' | 'repair';
export interface CombatCue {
  readonly kind: CombatCueKind;
  readonly title: string;
  readonly detail: string;
  /** Wall-clock lifetime, from zero to one. */
  readonly progress: number;
}
export interface CombatPresentationFrame {
  readonly cue: CombatCue | null;
  readonly cinematic: {
    readonly active: boolean;
    readonly progress: number;
    readonly focusRacerId: string | null;
    readonly cameraCut: boolean;
    readonly letterbox: boolean;
  };
  readonly timeScale: number;
}
export interface CombatPresentationContext {
  readonly role: 'solo' | 'host' | 'guest';
  readonly localRacerId: string;
  readonly racing: boolean;
  readonly paused: boolean;
  readonly capture: boolean;
  readonly reducedMotion: boolean;
  readonly motionIntensity: number;
  /** Set only for chaos/practice/unranked combat; never invalidate a record here. */
  readonly allowOffensiveSlowMotion: boolean;
  /** The existing mastery observer must have invalidated the local wreck first. */
  readonly allowVictimSlowMotion: boolean;
  readonly racerName: (id: string) => string;
}
export interface AuthoritativeCombatEvent {
  /** Race-scoped authoritative step/index, or the room's event sequence. */
  readonly id: string;
  readonly event: Readonly<GalacticEvent>;
}

export const COMBAT_CINEMATIC_DURATION_MS = 820;
export const COMBAT_CINEMATIC_COOLDOWN_MS = 6000;
const MIN_SCALE = 0.18;
const ENTER_MS = 80;
const EXIT_MS = 200;
const EXIT_START = COMBAT_CINEMATIC_DURATION_MS - EXIT_MS;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (value: number): number => value * value * (3 - 2 * value);
const smoothIntegral = (value: number): number => value ** 3 - value ** 4 / 2;

/** Integral of the removed wall time, in milliseconds, with exact segment edges. */
function deficitIntegral(elapsed: number): number {
  if (elapsed <= 0) return 0;
  const enter = Math.min(elapsed, ENTER_MS);
  const hold = Math.max(0, Math.min(elapsed, EXIT_START) - ENTER_MS);
  const exit = Math.max(0, Math.min(elapsed - EXIT_START, EXIT_MS));
  return (1 - MIN_SCALE) * (ENTER_MS * smoothIntegral(enter / ENTER_MS)
    + hold + exit - EXIT_MS * smoothIntegral(exit / EXIT_MS));
}

interface CueState {
  kind: CombatCueKind;
  title: string;
  detail: string;
  startedAt: number;
  duration: number;
  priority: number;
  focusRacerId: string | null;
  cinematicEligible: boolean;
  victim: boolean;
}

/**
 * Presentation clock only. It never owns or changes simulation state, fixed dt,
 * input, record eligibility, random state, or network snapshots.
 */
export class CombatPresentationController {
  private readonly seen = new Set<string>();
  private readonly seenOrder: string[] = [];
  private cue: CueState | null = null;
  private cinematic: CueState | null = null;
  private nextCinematicAt = -Infinity;

  reset(): void {
    this.seen.clear();
    this.seenOrder.length = 0;
    this.cancel();
    this.nextCinematicAt = -Infinity;
  }

  /** Pauses and visibility changes cancel a cut; they do not erase its cooldown. */
  cancel(): void { this.cue = null; this.cinematic = null; }

  consume(events: readonly AuthoritativeCombatEvent[], nowMs: number, context: CombatPresentationContext): void {
    if (!Number.isFinite(nowMs)) return;
    this.reconcile(context);
    let strongest: CueState | null = null;
    for (const envelope of events) {
      if (this.seen.has(envelope.id)) continue;
      this.seen.add(envelope.id);
      this.seenOrder.push(envelope.id);
      if (this.seenOrder.length > 256) this.seen.delete(this.seenOrder.shift()!);
      if (!context.racing || context.paused || context.capture) continue;
      const candidate = this.classify(envelope.event, nowMs, context);
      if (candidate && (!strongest || candidate.priority > strongest.priority)) strongest = candidate;
    }
    if (!strongest) return;
    // A burst of damage, wreck and takedown events must not restart the same shot.
    if (this.cinematic && nowMs < this.cinematic.startedAt + COMBAT_CINEMATIC_DURATION_MS) return;
    if (this.cue && nowMs < this.cue.startedAt + this.cue.duration
      && strongest.priority < this.cue.priority) return;
    this.cue = strongest;
    if (strongest.cinematicEligible && context.role === 'solo' && nowMs >= this.nextCinematicAt) {
      this.cinematic = strongest;
      this.nextCinematicAt = nowMs + COMBAT_CINEMATIC_COOLDOWN_MS;
    }
  }

  /**
   * Scale only the scheduler's incoming wall delta. The analytic integral gives
   * the same paced seconds at 30/60/144 Hz, including frames across shot edges.
   */
  scheduleDelta(deltaSeconds: number, nowMs: number, context: CombatPresentationContext): number {
    this.reconcile(context);
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || !Number.isFinite(nowMs)) return 0;
    if (!this.cinematic || context.role !== 'solo') return deltaSeconds;
    const end = nowMs - this.cinematic.startedAt;
    const start = end - deltaSeconds * 1000;
    return Math.max(0, deltaSeconds - (deficitIntegral(end) - deficitIntegral(start)) / 1000);
  }

  frame(nowMs: number, context: CombatPresentationContext): CombatPresentationFrame {
    this.reconcile(context);
    const elapsed = this.cinematic ? nowMs - this.cinematic.startedAt : Infinity;
    const active = Number.isFinite(nowMs) && elapsed >= 0 && elapsed < COMBAT_CINEMATIC_DURATION_MS;
    const motionAllowed = !context.reducedMotion && context.motionIntensity > 0;
    // Only the victim loses steering. An attacking driver keeps the chase view.
    const cameraCut = active && motionAllowed && this.cinematic?.victim === true;
    let timeScale = 1;
    if (active) {
      timeScale = elapsed < ENTER_MS ? 1 - (1 - MIN_SCALE) * smooth(elapsed / ENTER_MS)
        : elapsed < EXIT_START ? MIN_SCALE
          : MIN_SCALE + (1 - MIN_SCALE) * smooth((elapsed - EXIT_START) / EXIT_MS);
    }
    const cue = this.cue && Number.isFinite(nowMs) && nowMs >= this.cue.startedAt
      && nowMs < this.cue.startedAt + this.cue.duration
      ? { kind: this.cue.kind, title: this.cue.title, detail: this.cue.detail,
        progress: clamp01((nowMs - this.cue.startedAt) / this.cue.duration) } : null;
    return { cue, timeScale, cinematic: { active,
      progress: active ? clamp01(elapsed / COMBAT_CINEMATIC_DURATION_MS) : 1,
      focusRacerId: active ? this.cinematic?.focusRacerId ?? null : null,
      cameraCut, letterbox: cameraCut } };
  }

  private reconcile(context: CombatPresentationContext): void {
    if (!context.racing || context.paused || context.capture) this.cancel();
    else if (context.role !== 'solo') this.cinematic = null;
    else if (this.cinematic && !(this.cinematic.victim
      ? context.allowVictimSlowMotion : context.allowOffensiveSlowMotion)) this.cinematic = null;
  }

  private classify(event: Readonly<GalacticEvent>, now: number, context: CombatPresentationContext): CueState | null {
    const local = context.localRacerId;
    const make = (kind: CombatCueKind, title: string, detail: string, priority: number,
      focusRacerId: string | null = null, victim = false, cinematicEligible = false): CueState => ({
      kind, title, detail, priority, focusRacerId, victim, cinematicEligible, startedAt: now,
      duration: priority >= 3 ? 1250 : kind === 'hit' || kind === 'shield-hit' ? 420 : 1000,
    });
    switch (event.type) {
      case 'wreck':
        if (event.racerId !== local) return null;
        return make('wreck', event.takedownBy ? 'TAKEN DOWN' : 'WRECKED',
          event.takedownBy ? `BY ${context.racerName(event.takedownBy)}` : 'RECOVERY INBOUND',
          4, local, true, context.allowVictimSlowMotion);
      case 'takedown':
        if (event.attackerId !== local || event.victimId === local) return null;
        return make('takedown', 'TAKEDOWN', context.racerName(event.victimId), 3,
          event.victimId, false, context.allowOffensiveSlowMotion);
      case 'weapon-hit':
        if (event.attackerId !== local || event.targetId === local) return null;
        return make(event.shielded ? 'shield-hit' : 'hit', event.shielded ? 'SHIELD HIT' : 'HIT',
          context.racerName(event.targetId), 1);
      case 'emp-pulse':
        if (event.racerId !== local) return null;
        return make('emp', 'EMP PULSE', event.targetIds.length
          ? `${event.targetIds.length} RIVAL${event.targetIds.length === 1 ? '' : 'S'} DISRUPTED` : event.clearedOrdnance ? `${event.clearedOrdnance} ORDNANCE CLEARED`
            : event.blockedIds.length ? 'SHIELDS BLOCKED PULSE' : 'NO RIVALS IN RANGE', 2);
      case 'emp-hit':
        if (event.targetId !== local) return null;
        return make('emp', event.blocked ? 'EMP BLOCKED' : 'SYSTEMS DISRUPTED',
          event.blocked ? 'PULSE SHELL HELD' : 'BOOST + WEAPONS INTERRUPTED', 2);
      case 'repair-salvage-collected': {
        if (event.racerId !== local) return null;
        const restored: string[] = [];
        if (event.repaired > 0) restored.push(`${Math.round(event.repaired * 100)}% HULL RESTORED`);
        if (event.cooled > 0) restored.push(`${Math.round(event.cooled * 100)}% HEAT VENTED`);
        if (event.coreCooled > 0) restored.push(`${Math.round(event.coreCooled * 100)}% CORE VENTED`);
        return make('repair', 'REPAIR + COOLING', restored.join(' · ') || 'HULL + HEAT ALREADY STABLE', 2);
      }
      default: return null;
    }
  }
}
