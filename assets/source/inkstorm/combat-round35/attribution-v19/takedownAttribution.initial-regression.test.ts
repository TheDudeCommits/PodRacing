import { describe, expect, it } from 'vitest';
import { createRaceSimulation } from '../../src/game/race';
import { FLAT_HEIGHT_SAMPLER } from '../../src/game/simulation';

function collisionFixture() {
  const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, countdownSeconds: 0, fieldSize: 2 });
  race.state.galacticWorld.hazards = [];
  race.state.galacticWorld.pickups = [];
  race.step();
  const player = race.state.entries.find(entry => entry.isPlayer)!;
  const rival = race.state.entries.find(entry => !entry.isPlayer)!;
  const marker = (race as unknown as {
    markerColliders: readonly { x: number; z: number; id: string }[];
  }).markerColliders[0]!;
  const hitMarker = (damage: number) => {
    player.vehicle.position = { x: marker.x, y: 2.5, z: marker.z };
    player.vehicle.velocity = { x: 0, y: 0, z: 0 };
    player.vehicle.damage = damage;
    rival.vehicle.position.x = marker.x + 100;
    rival.vehicle.position.z = marker.z + 100;
    return race.step();
  };
  const hitRival = () => {
    const sample = race.course.sampleAtProgress(0.02);
    player.vehicle.position = { x: sample.x, y: 2.5, z: sample.z };
    rival.vehicle.position = { x: sample.x + 1, y: 2.5, z: sample.z };
    player.vehicle.velocity = { x: 40, y: 0, z: 0 };
    rival.vehicle.velocity = { x: -40, y: 0, z: 0 };
    return race.step();
  };
  return { race, player, rival, marker, hitMarker, hitRival };
}

describe('physical collision takedown attribution', () => {
  it('retains the actual scenery contact but does not register it as racer aggression', () => {
    const { player, marker, hitMarker } = collisionFixture();
    const result = hitMarker(0);
    expect(result.vehicleEvents[player.id]).toContainEqual(expect.objectContaining({
      type: 'collision', sourceId: marker.id,
    }));
    expect(player.galactic!.wreck.recentAggressorId).toBeNull();
    expect(player.galactic!.wreck.recentAggressorTime).toBe(0);
  });

  it('wrecks a damaged craft against scenery without inventing a rival takedown', () => {
    const { player, marker, hitMarker } = collisionFixture();
    const result = hitMarker(0.9);
    expect(result.vehicleEvents[player.id]).toContainEqual(expect.objectContaining({
      type: 'collision', sourceId: marker.id,
    }));
    expect(result.galacticEvents).toContainEqual(expect.objectContaining({
      type: 'wreck', racerId: player.id, cause: 'impact', sourceId: null, takedownBy: null,
    }));
    expect(result.galacticEvents.some(event => event.type === 'takedown')).toBe(false);
  });

  it('preserves a real recent rival ram when subsequent scenery damage wrecks the craft', () => {
    const { player, rival, hitRival, hitMarker } = collisionFixture();
    const ram = hitRival();
    expect(ram.vehicleEvents[player.id]).toContainEqual(expect.objectContaining({
      type: 'collision', sourceId: rival.id,
    }));
    expect(player.galactic!.wreck.recentAggressorId).toBe(rival.id);
    const result = hitMarker(0.9);
    expect(result.galacticEvents.filter(event => event.type === 'takedown')).toEqual([
      { type: 'takedown', attackerId: rival.id, victimId: player.id, cause: 'impact' },
    ]);
    expect(rival.galactic!.takedowns).toBe(1);
  });

  it('does not refresh an expired real rival assist when the craft hits scenery', () => {
    const { player, hitRival, hitMarker } = collisionFixture();
    hitRival();
    player.galactic!.wreck.recentAggressorTime = 0;
    const result = hitMarker(0.9);
    expect(result.galacticEvents).toContainEqual(expect.objectContaining({
      type: 'wreck', racerId: player.id, takedownBy: null,
    }));
    expect(result.galacticEvents.some(event => event.type === 'takedown')).toBe(false);
  });
});
