import type {
  AudioEnvelopePoint,
  AudioEnvelopeProfile,
  AudioEventLike,
  AudioEventMapOptions,
  PodracerAudioCue,
  PodracerAudioCueKind,
  PodracerAudioTargets,
  PodracerAudioTelemetry,
  RivalAudioTelemetry,
  RivalAudioTarget,
} from './types';

const MAX_REFERENCE_SPEED = 212;

/** Designed voices share the mix ceiling, with different register and articulation. */
export const ENGINE_VOICE_PROFILES: Readonly<Record<string, {
  pitch: number; intakeRatio: number; exhaustRatio: number; intakeGain: number; exhaustGain: number;
}>> = Object.freeze({
  podracer: Object.freeze({ pitch: 1, intakeRatio: 4.3, exhaustRatio: 0.5, intakeGain: 1, exhaustGain: 1 }),
  landspeeder: Object.freeze({ pitch: 0.7, intakeRatio: 3.1, exhaustRatio: 0.38, intakeGain: 0.55, exhaustGain: 1.35 }),
  'speeder-bike': Object.freeze({ pitch: 1.46, intakeRatio: 5.1, exhaustRatio: 0.72, intakeGain: 1.35, exhaustGain: 0.6 }),
  'skim-speeder': Object.freeze({ pitch: 1.16, intakeRatio: 3.6, exhaustRatio: 0.56, intakeGain: 0.82, exhaustGain: 0.84 }),
});

function voiceProfile(vehicleId: string | undefined) {
  return ENGINE_VOICE_PROFILES[vehicleId ?? 'podracer'] ?? ENGINE_VOICE_PROFILES.podracer!;
}

/** Deterministic distance rolloff and bounded Doppler keep pass-bys informative. */
export function deriveRivalAudioTargets(rivals: readonly RivalAudioTelemetry[] = []): RivalAudioTarget[] {
  return rivals.slice(0, 4).map((rival) => {
    const distance = Math.max(0, finite(rival.distanceM, 240));
    const speed = clampAudioUnit(finite(rival.speedMps) / MAX_REFERENCE_SPEED);
    const closing = Math.min(100, Math.max(-100, finite(rival.closingSpeedMps)));
    const doppler = 343 / (343 - closing);
    return {
      id: rival.id,
      frequency: (68 + speed * 154) * voiceProfile(rival.vehicleId).pitch * doppler,
      gain: distance >= 240 ? 0 : 0.085 / (1 + Math.pow(distance / 27, 2)),
      filterFrequency: 600 + (1 - clampAudioUnit(distance / 240)) * 2_000,
      pan: Math.min(1, Math.max(-1, finite(rival.pan))),
    };
  });
}

function finite(value: number | undefined, fallback = 0): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

export function clampAudioUnit(value: number | undefined): number {
  return Math.min(1, Math.max(0, finite(value)));
}

/** Pure target derivation. Time comes from the simulation for capture stability. */
export function derivePodracerAudioTargets(model: PodracerAudioTelemetry): PodracerAudioTargets {
  const speed = Math.max(0, finite(model.speedMps));
  const speedT = model.normalizedSpeed === undefined
    ? clampAudioUnit(speed / MAX_REFERENCE_SPEED)
    : clampAudioUnit(model.normalizedSpeed);
  const throttle = clampAudioUnit(model.throttle);
  const boost = model.boostActive ? Math.max(clampAudioUnit(model.boost), 0.72) : 0;
  const drift = clampAudioUnit(model.drift);
  const heat = clampAudioUnit(model.heat);
  const damage = clampAudioUnit(model.damage);
  const torque = Math.min(1, Math.abs(finite(model.engineTorque)));
  const time = finite(model.simulationTime);
  const load = clampAudioUnit(throttle * 0.57 + speedT * 0.34 + torque * 0.16 + boost * 0.24);

  const voice = voiceProfile(model.vehicleId);
  const baseFrequency = (54 + speedT * 117 + load * 55 + boost * 34) * voice.pitch;
  const criticalHeat = clampAudioUnit((heat - 0.73) / 0.27);
  const warningPulse = Math.pow(Math.max(0, Math.sin(time * (criticalHeat > 0.7 ? 13 : 7.5))), 8);
  const nearestRival = model.rivals?.[0];
  const rivalry = nearestRival ? 1 - clampAudioUnit(finite(nearestRival.distanceM, 120) / 120) : 0;
  const damageFlutter = damage * Math.sin(time * 17.3) * 0.018;
  const leftDrift = Math.sin(time * 4.73 + 0.31) * 0.009 + Math.sin(time * 11.7) * 0.003;
  const rightDrift = Math.sin(time * 5.19 + 2.07) * 0.011 + Math.sin(time * 9.2 + 0.8) * 0.0035;

  return {
    engineLeft: {
      frequency: Math.max(38, baseFrequency * (1 + leftDrift + damageFlutter)),
      gain: 0.055 + load * 0.115 + boost * 0.035,
      filterFrequency: 520 + load * 2_650 + boost * 1_500,
    },
    engineRight: {
      frequency: Math.max(38, baseFrequency * 1.018 * (1 + rightDrift - damageFlutter * 0.72)),
      gain: 0.054 + load * 0.112 + boost * 0.038,
      filterFrequency: 560 + load * 2_500 + boost * 1_650,
    },
    repulsorFrequency: 39 + speedT * 18 + (model.grounded ? 0 : -7) + Math.sin(time * 6.4) * 1.4,
    repulsorGain: 0.025 + (model.grounded ? 0.065 : 0.022) + throttle * 0.018,
    windGain: 0.008 + Math.pow(speedT, 1.35) * 0.29 + (model.grounded ? 0 : 0.035),
    windFilterFrequency: 750 + Math.pow(speedT, 0.72) * 6_000,
    couplingGain: 0.004 + load * 0.018 + boost * 0.055 + drift * 0.014 + heat * 0.012,
    couplingFilterFrequency: 1_350 + speedT * 1_900 + boost * 2_300,
    intakeFrequency: baseFrequency * voice.intakeRatio + heat * 120,
    intakeGain: (0.004 + load * 0.025 + boost * 0.018) * voice.intakeGain,
    exhaustFrequency: Math.max(24, baseFrequency * voice.exhaustRatio),
    exhaustGain: (0.022 + throttle * 0.058 + boost * 0.026) * voice.exhaustGain,
    // Mechanical distress sounds before the destructive warning, with a sparse
    // pulse so it remains audible through the full engine and music mix.
    damageGain: damage * damage * (0.18 + Math.pow(Math.max(0, Math.sin(time * 21.7)), 12) * 0.82) * 0.07,
    heatWarningGain: criticalHeat * warningPulse * 0.032,
    raceIntensity: clampAudioUnit(speedT * 0.5 + boost * 0.22 + rivalry * 0.22 + drift * 0.12),
    environmentClosure: clampAudioUnit(model.environmentClosure),
  };
}

const ENVELOPES: Readonly<Record<PodracerAudioCueKind, AudioEnvelopeProfile>> = Object.freeze({
  impact: { attack: 0.003, decay: 0.075, sustain: 0.34, release: 0.32, peak: 0.72 },
  sand: { attack: 0.006, decay: 0.09, sustain: 0.28, release: 0.21, peak: 0.33 },
  boost: { attack: 0.018, decay: 0.14, sustain: 0.62, release: 0.48, peak: 0.54 },
  horn: { attack: 0.025, decay: 0.22, sustain: 0.7, release: 0.75, peak: 0.58 },
  countdown: { attack: 0.008, decay: 0.075, sustain: 0.34, release: 0.13, peak: 0.31 },
  checkpoint: { attack: 0.005, decay: 0.08, sustain: 0.28, release: 0.16, peak: 0.24 },
  lap: { attack: 0.008, decay: 0.11, sustain: 0.46, release: 0.31, peak: 0.35 },
  finish: { attack: 0.012, decay: 0.24, sustain: 0.58, release: 1.05, peak: 0.46 },
  warning: { attack: 0.006, decay: 0.13, sustain: 0.5, release: 0.28, peak: 0.36 },
  electric: { attack: 0.001, decay: 0.035, sustain: 0.2, release: 0.12, peak: 0.31 },
  ui: { attack: 0.004, decay: 0.045, sustain: 0.25, release: 0.09, peak: 0.2 },
  weapon: { attack: 0.001, decay: 0.052, sustain: 0.2, release: 0.14, peak: 0.46 },
  'weapon-hit': { attack: 0.001, decay: 0.075, sustain: 0.24, release: 0.24, peak: 0.56 },
  shield: { attack: 0.002, decay: 0.085, sustain: 0.42, release: 0.24, peak: 0.39 },
  mine: { attack: 0.002, decay: 0.09, sustain: 0.3, release: 0.34, peak: 0.55 },
  hazard: { attack: 0.004, decay: 0.11, sustain: 0.33, release: 0.3, peak: 0.46 },
  redline: { attack: 0.006, decay: 0.16, sustain: 0.58, release: 0.42, peak: 0.48 },
  wreck: { attack: 0.002, decay: 0.15, sustain: 0.38, release: 0.72, peak: 0.74 },
  takedown: { attack: 0.004, decay: 0.12, sustain: 0.52, release: 0.43, peak: 0.5 },
  recovery: { attack: 0.01, decay: 0.11, sustain: 0.48, release: 0.38, peak: 0.38 },
  upgrade: { attack: 0.003, decay: 0.09, sustain: 0.45, release: 0.3, peak: 0.38 },
  vehicle: { attack: 0.004, decay: 0.08, sustain: 0.36, release: 0.22, peak: 0.31 },
});

export function getAudioEnvelope(kind: PodracerAudioCueKind): AudioEnvelopeProfile {
  return { ...ENVELOPES[kind] };
}

export function createAudioEnvelopeSchedule(
  cue: PodracerAudioCue,
  startTime = 0,
): AudioEnvelopePoint[] {
  const profile = ENVELOPES[cue.kind];
  const intensity = clampAudioUnit(cue.intensity);
  const peak = Math.max(0.0001, profile.peak * intensity);
  const start = Math.max(0, finite(startTime));
  const attackEnd = start + profile.attack;
  const decayEnd = attackEnd + profile.decay;
  const releaseEnd = decayEnd + profile.release;
  return [
    { time: start, value: 0.0001, curve: 'linear' },
    { time: attackEnd, value: peak, curve: 'linear' },
    { time: decayEnd, value: Math.max(0.0001, peak * profile.sustain), curve: 'exponential' },
    { time: releaseEnd, value: 0.0001, curve: 'exponential' },
  ];
}

function recordOf(event: AudioEventLike): Readonly<Record<string, unknown>> {
  return event as unknown as Readonly<Record<string, unknown>>;
}

function eventNumber(event: AudioEventLike, key: string, fallback = 0): number {
  const value = recordOf(event)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function eventString(event: AudioEventLike, key: string): string | undefined {
  const value = recordOf(event)[key];
  return typeof value === 'string' ? value : undefined;
}

function eventBoolean(event: AudioEventLike, key: string): boolean {
  return recordOf(event)[key] === true;
}

function racerEventBelongsToPlayer(event: AudioEventLike, playerId: string | undefined): boolean {
  if (!playerId) return true;
  const racerId = eventString(event, 'racerId');
  return racerId === undefined || racerId === playerId;
}

function combatEventBelongsToPlayer(event: AudioEventLike, playerId: string | undefined): boolean {
  if (!playerId) return true;
  const record = recordOf(event);
  return ['racerId', 'attackerId', 'targetId', 'ownerId', 'victimId'].some(
    (key) => record[key] === playerId,
  );
}

function cue(kind: PodracerAudioCueKind, intensity: number, pitch?: number): PodracerAudioCue {
  return pitch === undefined
    ? { kind, intensity: clampAudioUnit(intensity) }
    : { kind, intensity: clampAudioUnit(intensity), pitch: Math.max(0.25, finite(pitch, 1)) };
}

function cuesForEvent(event: AudioEventLike, options: AudioEventMapOptions): PodracerAudioCue[] {
  const ownRacer = racerEventBelongsToPlayer(event, options.playerId);
  switch (event.type) {
    case 'landing': {
      if (!ownRacer) return [];
      const intensity = eventNumber(event, 'intensity', 0.4);
      return [cue('impact', 0.28 + intensity * 0.72), cue('sand', 0.24 + intensity * 0.68)];
    }
    case 'sand-spray':
      return ownRacer ? [cue('sand', 0.18 + eventNumber(event, 'intensity', 0.3) * 0.66)] : [];
    case 'collision': {
      if (!ownRacer) return [];
      const intensity = eventNumber(event, 'intensity', 0.5);
      return [cue('impact', 0.36 + intensity * 0.64), cue('electric', 0.15 + intensity * 0.58)];
    }
    case 'camera-shake': {
      const reason = eventString(event, 'reason');
      const amount = eventNumber(event, 'amplitude', 0.25);
      if (reason === 'boost') return [cue('boost', 0.35 + amount * 0.4)];
      if (reason === 'overheat') return [cue('warning', 0.45 + amount * 0.35)];
      return [cue('impact', 0.22 + amount * 0.45)];
    }
    case 'drift-boost':
      return [cue('boost', 0.48 + eventNumber(event, 'charge', 0.4) * 0.5, 1.08)];
    case 'boost-start':
      return [cue('boost', 0.72, eventString(event, 'source') === 'drift' ? 1.12 : 1)];
    case 'overheat':
      return eventBoolean(event, 'active') ? [cue('warning', 0.88, 0.82)] : [cue('ui', 0.25, 1.3)];
    case 'countdown': {
      const rawCue = recordOf(event).cue;
      if (rawCue === 'go') return [cue('horn', 1)];
      const count = typeof rawCue === 'number' ? rawCue : 3;
      return [cue('countdown', 0.82, 1 + (3 - count) * 0.09)];
    }
    case 'start-horn':
      return [cue('horn', 1)];
    case 'checkpoint':
      return ownRacer ? [cue('checkpoint', 0.72, 1 + (eventNumber(event, 'checkpointIndex') % 3) * 0.08)] : [];
    case 'lap-complete':
      return ownRacer ? [cue('lap', 0.88, 1 + eventNumber(event, 'lap', 1) * 0.04)] : [];
    case 'finish':
      return ownRacer ? [cue('finish', 1, 1.04)] : [];
    case 'wrong-way':
      return ownRacer && eventBoolean(event, 'active') ? [cue('warning', 0.82, 0.74)] : [];
    case 'ui-confirm':
      return [cue('ui', 0.62, 1.35)];
    case 'ui-cancel':
      return [cue('ui', 0.52, 0.72)];
    case 'sand-strike':
      return [cue('sand', eventNumber(event, 'intensity', 0.35))];
    case 'electrical-coupling':
      return [cue('electric', eventNumber(event, 'intensity', 0.45))];
    case 'weapon-fired':
    case 'heat-lance-fired':
      return ownRacer ? [cue('weapon', 0.82, 1.08)] : [];
    case 'weapon-hit': {
      if (!combatEventBelongsToPlayer(event, options.playerId)) return [];
      const damage = eventNumber(event, 'damage', 0.45);
      if (eventBoolean(event, 'shielded')) {
        return [cue('shield', 0.42 + damage * 0.45, 1.16), cue('electric', 0.22 + damage * 0.35)];
      }
      return eventString(event, 'weapon') === 'heat-lance'
        ? [cue('weapon-hit', 0.52 + damage * 0.46, 0.92)]
        : [cue('impact', 0.38 + damage * 0.58)];
    }
    case 'shield-active':
      return ownRacer && recordOf(event).active !== false
        ? [cue('shield', 0.76, 1.12)]
        : ownRacer ? [cue('ui', 0.24, 0.8)] : [];
    case 'pulse-shell':
      return ownRacer && eventBoolean(event, 'active')
        ? [cue('shield', 0.82, 1.08)]
        : ownRacer ? [cue('ui', 0.22, 0.78)] : [];
    case 'shield-hit':
    case 'shield-block':
      return combatEventBelongsToPlayer(event, options.playerId)
        ? [cue('shield', 0.55 + eventNumber(event, 'absorbed', 0.35) * 0.4), cue('electric', 0.38, 1.18)]
        : [];
    case 'shield-break':
      return combatEventBelongsToPlayer(event, options.playerId)
        ? [cue('shield', 1, 0.62), cue('warning', 0.78, 0.76)]
        : [];
    case 'mine-deployed':
    case 'scrap-mine-deployed':
      return ownRacer ? [cue('mine', 0.42, 1.24)] : [];
    case 'scrap-mine-triggered':
      return combatEventBelongsToPlayer(event, options.playerId)
        ? [cue('mine', 1, 0.72), cue('impact', 0.72)]
        : [];
    case 'hazard-hit':
      return ownRacer
        ? [cue('hazard', 0.52 + eventNumber(event, 'intensity', 0.5) * 0.46)]
        : [];
    case 'redline-start':
      return ownRacer ? [cue('redline', 0.72, 1.12)] : [];
    case 'redline-surge':
      return ownRacer && eventBoolean(event, 'active')
        ? [cue('redline', 0.7 + eventNumber(event, 'heat', 0.5) * 0.25, 1.08)]
        : ownRacer ? [cue('ui', 0.25, 0.75)] : [];
    case 'redline-critical':
      return ownRacer ? [cue('redline', 1, 0.7), cue('warning', 0.92, 0.68)] : [];
    case 'redline-explosion':
      return ownRacer ? [cue('wreck', 1, 0.7), cue('warning', 0.88, 0.58)] : [];
    case 'wreck':
      return ownRacer ? [cue('wreck', 1, 0.78)] : [];
    case 'takedown':
      return eventString(event, 'attackerId') === options.playerId || !options.playerId
        ? [cue('takedown', 1, 1.08)]
        : [];
    case 'recovery-start':
      return ownRacer ? [cue('recovery', 0.4, 0.72)] : [];
    case 'recovered':
      return ownRacer ? [cue('recovery', 0.88, 1.18)] : [];
    case 'upgrade-collected':
      return ownRacer ? [cue('upgrade', 0.92, 1 + eventNumber(event, 'level', 1) * 0.06)] : [];
    case 'vehicle-class-changed':
      return ownRacer ? [cue('vehicle', 0.82, 0.96)] : [];
    default:
      return [];
  }
}

/**
 * Maps arbitrary JSON events and coalesces duplicate voices in one fixed tick.
 * This prevents a landing plus its camera-shake event from doubling the thud.
 */
export function mapGameEventsToAudioCues<TEvent extends AudioEventLike>(
  events: readonly TEvent[],
  options: AudioEventMapOptions = {},
): PodracerAudioCue[] {
  const strongest = new Map<PodracerAudioCueKind, PodracerAudioCue>();
  for (const event of events) {
    for (const next of cuesForEvent(event, options)) {
      const previous = strongest.get(next.kind);
      if (!previous || next.intensity > previous.intensity) strongest.set(next.kind, next);
    }
  }
  return [...strongest.values()];
}
