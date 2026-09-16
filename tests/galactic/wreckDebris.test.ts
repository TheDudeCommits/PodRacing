import { describe, expect, it } from 'vitest';
import {
  DEBRIS_LIFETIME,
  DEBRIS_PIECES_PER_WRECK,
  beginGalacticWreck,
  createGalacticRacerState,
  createGalacticWorldState,
  deriveGalacticVehicleConfig,
  snapshotGalacticRacer,
  stepGalacticWorld,
} from '../../src/game/galactic';
import { DEFAULT_PODRACER_CONFIG, FLAT_HEIGHT_SAMPLER, createPodracerState } from '../../src/game/simulation';

function racer(id: string, x: number, z: number) {
  const galactic = createGalacticRacerState('podracer');
  const vehicle = createPodracerState({ id, position: { x, z }, terrain: FLAT_HEIGHT_SAMPLER },
    deriveGalacticVehicleConfig('podracer', DEFAULT_PODRACER_CONFIG, galactic.upgrades));
  return { galactic, vehicle, snapshot: () => snapshotGalacticRacer(id, vehicle, galactic, 0, 0, false) };
}

describe('wreck debris', () => {
  it('sheds parts onto the course when a pod wrecks, and they hurt whoever drives through them', () => {
    const world = createGalacticWorldState(); world.hazards = [];
    const victim = racer('victim', 0, 0);
    const events = beginGalacticWreck('victim', victim.galactic, victim.vehicle, world, 'impact', null, false, true);
    expect(events.some((event) => event.type === 'debris-spawned')).toBe(true);
    expect(world.debris).toHaveLength(DEBRIS_PIECES_PER_WRECK);
    for (const piece of world.debris!) {
      expect(Math.hypot(piece.position.x, piece.position.z)).toBeLessThan(45);
      expect(piece.remaining).toBe(DEBRIS_LIFETIME);
    }
    const piece = world.debris![0]!;
    const other = racer('other', piece.position.x, piece.position.z);
    // The wrecked owner is never hit by its own parts while it is down.
    const result = stepGalacticWorld(world, [victim.snapshot(), other.snapshot()], 1 / 120);
    // Pieces can lie within a hull's reach of each other, so one pass may clip more than one.
    expect(result.impacts.length).toBeGreaterThanOrEqual(1);
    for (const impact of result.impacts) expect(impact).toMatchObject({ targetId: 'other', sourceId: 'victim', cause: 'hazard' });
    expect(result.impacts.some((impact) => impact.hazardId === piece.id)).toBe(true);
    expect(result.events).toContainEqual({ type: 'debris-hit', racerId: 'other', ownerId: 'victim', debrisId: piece.id });
    expect(world.debris).toHaveLength(DEBRIS_PIECES_PER_WRECK - result.impacts.length);
  });

  it('clears itself after its lifetime', () => {
    const world = createGalacticWorldState(); world.hazards = [];
    const victim = racer('victim', 0, 0);
    beginGalacticWreck('victim', victim.galactic, victim.vehicle, world, 'impact', null, false, true);
    for (let tick = 0; tick < 120 * (DEBRIS_LIFETIME + 0.1); tick += 1) stepGalacticWorld(world, [], 1 / 120);
    expect(world.debris).toHaveLength(0);
  });
});
