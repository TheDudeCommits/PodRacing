import type { CaptureCamera } from '../diagnostics/reviewTypes';

export type RaceCameraShot = 'countdown-orbit' | 'chase' | 'results-orbit';

export interface RaceCameraViewModel {
  phase: 'countdown' | 'racing' | 'finished';
  /** Lets the player receive a finish orbit while AI racers complete the lap. */
  playerFinished?: boolean;
}

export interface RaceCameraPresentation {
  shot: RaceCameraShot;
  mode: CaptureCamera;
  gameplayInputEnabled: boolean;
}

export interface RaceCameraRigPort {
  setMode(mode: CaptureCamera): void;
  impulse(amount: number): void;
  landingImpulse?(amount: number): void;
}

export interface CameraEventLike {
  readonly type: string;
}

export interface CameraImpulse {
  reason: string;
  amount: number;
}

export interface CameraImpulseOptions {
  /** Filters racer-scoped expansion events so off-camera AI hits do not shake the player. */
  playerId?: string;
}

function recordOf(event: CameraEventLike): Readonly<Record<string, unknown>> {
  return event as unknown as Readonly<Record<string, unknown>>;
}

function numberFrom(event: CameraEventLike, key: string, fallback: number): number {
  const value = recordOf(event)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringFrom(event: CameraEventLike, key: string): string | undefined {
  const value = recordOf(event)[key];
  return typeof value === 'string' ? value : undefined;
}

function clampImpulse(value: number): number {
  return Math.min(2.4, Math.max(0, Number.isFinite(value) ? value : 0));
}

function eventBelongsToPlayer(event: CameraEventLike, playerId: string | undefined): boolean {
  if (!playerId) return true;
  const record = recordOf(event);
  return ['racerId', 'attackerId', 'targetId', 'ownerId', 'victimId'].some(
    (key) => record[key] === playerId,
  );
}

export function deriveRaceCameraPresentation(view: RaceCameraViewModel): RaceCameraPresentation {
  if (view.phase === 'countdown') {
    return { shot: 'countdown-orbit', mode: 'hero', gameplayInputEnabled: false };
  }
  if (view.phase === 'finished' || view.playerFinished === true) {
    return { shot: 'results-orbit', mode: 'hero', gameplayInputEnabled: false };
  }
  return { shot: 'chase', mode: 'chase', gameplayInputEnabled: true };
}

/** Converts serializable race/vehicle events into bounded camera impulses. */
export function deriveCameraImpulses<TEvent extends CameraEventLike>(
  events: readonly TEvent[],
  options: CameraImpulseOptions = {},
): CameraImpulse[] {
  const explicitShake = events.filter((event) => event.type === 'camera-shake');
  const output: CameraImpulse[] = [];

  if (explicitShake.length > 0) {
    const strongest = explicitShake.reduce((maximum, event) =>
      Math.max(maximum, numberFrom(event, 'amplitude', 0.2)), 0,
    );
    const reason = stringFrom(explicitShake.find((event) =>
      numberFrom(event, 'amplitude', 0.2) === strongest,
    ) ?? explicitShake[0]!, 'reason') ?? 'vehicle';
    output.push({ reason, amount: clampImpulse(strongest) });
  } else {
    let impact = 0;
    let reason = 'impact';
    for (const event of events) {
      if (options.playerId && stringFrom(event, 'racerId') && stringFrom(event, 'racerId') !== options.playerId) continue;
      if (event.type === 'landing') {
        const amount = 0.12 + numberFrom(event, 'intensity', 0.3) * 0.62;
        if (amount > impact) {
          impact = amount;
          reason = 'landing';
        }
      }
      if (event.type === 'collision') {
        const amount = 0.2 + numberFrom(event, 'intensity', 0.4) * 0.9;
        if (amount > impact) {
          impact = amount;
          reason = 'collision';
        }
      }
      if (event.type === 'boost-start' || event.type === 'drift-boost') {
        const amount = 0.16 + numberFrom(event, 'charge', 0.25) * 0.24;
        if (amount > impact) {
          impact = amount;
          reason = 'boost';
        }
      }
      if (!eventBelongsToPlayer(event, options.playerId)) continue;
      if (
        (event.type === 'pulse-shell' || event.type === 'shield-active' || event.type === 'redline-surge')
        && recordOf(event).active === false
      ) continue;
      const galacticImpact: Readonly<Record<string, readonly [number, string]>> = {
        'weapon-fired': [0.07, 'weapon'],
        'heat-lance-fired': [0.07, 'weapon'],
        'weapon-hit': [0.22 + numberFrom(event, 'damage', 0.35) * 0.45, 'weapon-hit'],
        'shield-active': [0.1, 'shield'],
        'pulse-shell': [0.1, 'shield'],
        'shield-hit': [0.2 + numberFrom(event, 'absorbed', 0.3) * 0.5, 'shield-hit'],
        'shield-block': [0.2 + numberFrom(event, 'absorbed', 0.3) * 0.5, 'shield-hit'],
        'shield-break': [0.7, 'shield-break'],
        'mine-deployed': [0.08, 'mine'],
        'scrap-mine-deployed': [0.08, 'mine'],
        'scrap-mine-triggered': [0.92, 'mine'],
        'hazard-hit': [0.28 + numberFrom(event, 'intensity', 0.4) * 0.7, 'hazard'],
        'redline-start': [0.17, 'redline'],
        'redline-surge': [0.16 + numberFrom(event, 'heat', 0.4) * 0.24, 'redline'],
        'redline-critical': [0.58, 'redline-critical'],
        'redline-explosion': [1.85, 'redline-explosion'],
        wreck: [1.7, 'wreck'],
        takedown: [0.3, 'takedown'],
        recovered: [0.14, 'recovered'],
        'upgrade-collected': [0.1, 'upgrade'],
        'vehicle-class-changed': [0.1, 'vehicle'],
      };
      const mapped = galacticImpact[event.type];
      if (mapped && mapped[0] > impact) {
        impact = mapped[0];
        reason = mapped[1];
      }
    }
    if (impact > 0) output.push({ reason, amount: clampImpulse(impact) });
  }

  if (events.some((event) => event.type === 'start-horn')) {
    output.push({ reason: 'start-horn', amount: 0.11 });
  }
  return output;
}

/**
 * Presentation-only coordinator. It never advances the race or camera spring;
 * it merely chooses an authored CinematicCamera mode and forwards impulses.
 */
export class RaceCameraDirector {
  private currentMode: CaptureCamera | null = null;
  private manualMode: CaptureCamera | null = null;

  constructor(private readonly rig: RaceCameraRigPort) {}

  update(view: RaceCameraViewModel): RaceCameraPresentation {
    const presentation = deriveRaceCameraPresentation(view);
    const mode = this.manualMode ?? presentation.mode;
    if (mode !== this.currentMode) {
      this.currentMode = mode;
      this.rig.setMode(mode);
    }
    return mode === presentation.mode ? presentation : { ...presentation, mode };
  }

  consumeEvents<TEvent extends CameraEventLike>(
    events: readonly TEvent[],
    options: CameraImpulseOptions = {},
  ): readonly CameraImpulse[] {
    const impulses = deriveCameraImpulses(events, options);
    for (const impulse of impulses) {
      if (impulse.reason === 'landing' && this.rig.landingImpulse) this.rig.landingImpulse(impulse.amount);
      else this.rig.impulse(impulse.amount);
    }
    return impulses;
  }

  /** Read-only access lets a temporary combat cut restore the exact user override. */
  getManualMode(): CaptureCamera | null { return this.manualMode; }

  setManualMode(mode: CaptureCamera | null): void {
    this.manualMode = mode;
    if (mode !== null && mode !== this.currentMode) {
      this.currentMode = mode;
      this.rig.setMode(mode);
    }
  }

  reset(): void {
    this.currentMode = null;
    this.manualMode = null;
  }
}
