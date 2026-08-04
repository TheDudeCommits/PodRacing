import { describe, expect, it } from 'vitest';
import {
  createAudioEnvelopeSchedule,
  derivePodracerAudioTargets,
  getAudioEnvelope,
  mapGameEventsToAudioCues,
  type PodracerAudioTelemetry,
} from '../../src/audio';

const idle: PodracerAudioTelemetry = {
  speedMps: 0,
  normalizedSpeed: 0,
  throttle: 0,
  boost: 1,
  boostActive: false,
  drift: 0,
  heat: 0,
  damage: 0,
  grounded: true,
  simulationTime: 12,
};

describe('procedural audio target model', () => {
  it('raises engine pitch and wind with speed while keeping twin engines independent', () => {
    const slow = derivePodracerAudioTargets(idle);
    const fast = derivePodracerAudioTargets({
      ...idle,
      speedMps: 190,
      normalizedSpeed: 0.9,
      throttle: 1,
      boost: 0.7,
      boostActive: true,
      engineTorque: 0.8,
    });

    expect(fast.engineLeft.frequency).toBeGreaterThan(slow.engineLeft.frequency * 2);
    expect(fast.engineRight.frequency).not.toBe(fast.engineLeft.frequency);
    expect(fast.windGain).toBeGreaterThan(slow.windGain * 8);
    expect(fast.windFilterFrequency).toBeGreaterThan(slow.windFilterFrequency);
    expect(fast.couplingGain).toBeGreaterThan(slow.couplingGain);
  });

  it('contains non-finite telemetry and returns only finite bounded gains', () => {
    const targets = derivePodracerAudioTargets({
      ...idle,
      speedMps: Number.NaN,
      throttle: Number.POSITIVE_INFINITY,
      heat: -3,
      damage: 5,
      simulationTime: Number.NaN,
    });
    const values = [
      targets.engineLeft.frequency,
      targets.engineRight.frequency,
      targets.engineLeft.gain,
      targets.engineRight.gain,
      targets.repulsorGain,
      targets.windGain,
      targets.couplingGain,
    ];
    expect(values.every(Number.isFinite)).toBe(true);
    expect(targets.engineLeft.gain).toBeLessThan(0.25);
    expect(targets.windGain).toBeLessThan(0.4);
  });
});

describe('audio event mapping and envelopes', () => {
  it('maps and coalesces vehicle events so camera shake does not double a collision thud', () => {
    const cues = mapGameEventsToAudioCues([
      { type: 'collision', intensity: 0.8, racerId: 'player' },
      { type: 'camera-shake', reason: 'collision', amplitude: 0.5 },
      { type: 'sand-spray', intensity: 0.6, racerId: 'player' },
      { type: 'checkpoint', racerId: 'ai-vexa', checkpointIndex: 4 },
    ], { playerId: 'player' });

    expect(cues.filter((cue) => cue.kind === 'impact')).toHaveLength(1);
    expect(cues.find((cue) => cue.kind === 'impact')?.intensity).toBeCloseTo(0.872);
    expect(cues.some((cue) => cue.kind === 'electric')).toBe(true);
    expect(cues.some((cue) => cue.kind === 'sand')).toBe(true);
    expect(cues.some((cue) => cue.kind === 'checkpoint')).toBe(false);
  });

  it('maps countdown GO and the race horn to one strongest horn voice', () => {
    const cues = mapGameEventsToAudioCues([
      { type: 'countdown', cue: 'go' },
      { type: 'start-horn' },
    ]);
    expect(cues).toEqual([{ kind: 'horn', intensity: 1 }]);
  });

  it('builds finite ordered attack/decay/release schedules from authored profiles', () => {
    const profile = getAudioEnvelope('impact');
    const schedule = createAudioEnvelopeSchedule({ kind: 'impact', intensity: 0.5 }, 2);
    expect(schedule).toHaveLength(4);
    expect(schedule[0]).toEqual({ time: 2, value: 0.0001, curve: 'linear' });
    expect(schedule[1]?.time).toBeCloseTo(2 + profile.attack);
    expect(schedule[1]?.value).toBeCloseTo(profile.peak * 0.5);
    expect(schedule[2]?.curve).toBe('exponential');
    expect(schedule[3]?.value).toBe(0.0001);
    expect(schedule.every((point, index) =>
      Number.isFinite(point.time) && Number.isFinite(point.value) &&
      (index === 0 || point.time >= (schedule[index - 1]?.time ?? 0)),
    )).toBe(true);
  });
});
