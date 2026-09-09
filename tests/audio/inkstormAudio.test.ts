import { describe, expect, it } from 'vitest';
import { derivePodracerAudioTargets, deriveRivalAudioTargets, type PodracerAudioTelemetry } from '../../src/audio';

const cruising: PodracerAudioTelemetry = {
  speedMps: 155, throttle: 0.8, boost: 0.8, boostActive: false,
  drift: 0, heat: 0.2, damage: 0, grounded: true, simulationTime: 9.2,
};

describe('Inkstorm engine identity and race mix', () => {
  it('gives the heavy vehicle a lower register and the bike a higher intake voice', () => {
    const heavy = derivePodracerAudioTargets({ ...cruising, vehicleId: 'landspeeder' });
    const pod = derivePodracerAudioTargets({ ...cruising, vehicleId: 'podracer' });
    const bike = derivePodracerAudioTargets({ ...cruising, vehicleId: 'speeder-bike' });
    expect(heavy.engineLeft.frequency).toBeLessThan(pod.engineLeft.frequency * 0.8);
    expect(bike.intakeFrequency).toBeGreaterThan(pod.intakeFrequency * 1.5);
    expect(heavy.exhaustGain).toBeGreaterThan(bike.exhaustGain);
    expect(derivePodracerAudioTargets({ ...cruising, vehicleId: 'unknown' })).toEqual(pod);
  });

  it('keeps healthy engines quiet and makes thermal/damage warnings and rivalry explicit', () => {
    const healthy = derivePodracerAudioTargets(cruising);
    const distressed = Array.from({ length: 20 }, (_, step) => derivePodracerAudioTargets({
      ...cruising, heat: 0.94, damage: 0.7, simulationTime: step / 20,
      rivals: [{ id: 'rival', distanceM: 12, pan: -0.5, closingSpeedMps: 20, speedMps: 175 }],
      environmentClosure: 1,
    }));
    expect(healthy.heatWarningGain).toBe(0);
    expect(healthy.damageGain).toBe(0);
    expect(distressed.some((target) => target.heatWarningGain > 0.01)).toBe(true);
    expect(distressed.every((target) => target.damageGain > 0)).toBe(true);
    expect(distressed[0]!.raceIntensity).toBeGreaterThan(healthy.raceIntensity);
    expect(distressed[0]!.environmentClosure).toBe(1);
  });

  it('makes approaching rivals higher pitched, attenuates distance and caps concurrent voices', () => {
    const rival = { id: 'rival', distanceM: 15, pan: -0.8, closingSpeedMps: 70, speedMps: 150 };
    const approach = deriveRivalAudioTargets([rival])[0]!;
    const receding = deriveRivalAudioTargets([{ ...rival, closingSpeedMps: -70 }])[0]!;
    const far = deriveRivalAudioTargets([{ ...rival, distanceM: 240 }])[0]!;
    expect(approach.frequency).toBeGreaterThan(receding.frequency);
    expect(approach.pan).toBe(-0.8);
    expect(approach.gain).toBeGreaterThan(0.04);
    expect(far.gain).toBe(0);
    expect(deriveRivalAudioTargets(Array(8).fill(rival))).toHaveLength(4);
    const invalid = deriveRivalAudioTargets([{ ...rival, pan: NaN, distanceM: NaN, closingSpeedMps: Infinity }])[0]!;
    expect(Object.values(invalid).filter((value) => typeof value === 'number').every(Number.isFinite)).toBe(true);
    expect(invalid.gain).toBe(0);
  });
});
