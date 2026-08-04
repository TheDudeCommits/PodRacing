import { describe, expect, it } from 'vitest';
import { deriveCameraImpulses } from '../../src/camera/RaceCameraDirector';

describe('Galactic Racer camera feedback', () => {
  it('selects the strongest expansion impact without stacking one fixed tick', () => {
    const impulses = deriveCameraImpulses([
      { type: 'heat-lance-fired', racerId: 'player' },
      { type: 'shield-block', racerId: 'player', absorbed: 0.6 },
      { type: 'hazard-hit', racerId: 'player', intensity: 0.8 },
    ], { playerId: 'player' });
    expect(impulses).toHaveLength(1);
    expect(impulses[0]?.reason).toBe('hazard');
    expect(impulses[0]?.amount).toBeCloseTo(0.84);
  });

  it('filters off-camera AI events and gives wrecks a bounded authored hit', () => {
    expect(deriveCameraImpulses([
      { type: 'wreck', racerId: 'ai-vexa' },
    ], { playerId: 'player' })).toEqual([]);

    expect(deriveCameraImpulses([
      { type: 'redline-explosion', racerId: 'player', heat: 1.2 },
      { type: 'wreck', racerId: 'player' },
    ], { playerId: 'player' })).toEqual([
      { reason: 'redline-explosion', amount: 1.85 },
    ]);
  });

  it('lets an explicit simulation shake suppress duplicate inferred impacts', () => {
    const impulses = deriveCameraImpulses([
      { type: 'camera-shake', reason: 'wreck', amplitude: 0.92 },
      { type: 'wreck', racerId: 'player' },
    ], { playerId: 'player' });
    expect(impulses).toEqual([{ reason: 'wreck', amount: 0.92 }]);
  });
});
