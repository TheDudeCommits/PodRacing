import { describe, expect, it } from 'vitest';
import { createRaceSimulation } from '../../src/game/race';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createBridgeHeightSampler, groundPylonConflictsWithBridge, INKSTORM_BRIDGE_SEED, sampleBridgeSurface } from '../../src/game/race/bridgeSurface';
import { createPodracerState } from '../../src/game/simulation/podracer';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const base = { heightAt: sampleTerrainHeight };
const digest = async (value: unknown) => [...new Uint8Array(await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(JSON.stringify(value))))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const hero = createProceduralPodraceCourse(base, INKSTORM_BRIDGE_SEED);
const bridge = hero.branches[0]!;

describe('flagship supported viaduct', () => {
  it('keeps the authored early divergence deterministic and preserves checkpoint identity', async () => {
    expect(bridge.elevated).toBe(true);
    expect(hero.branches.filter((branch) => branch.elevated)).toHaveLength(1);
    const horizontal = hero.branches.map(({ elevated: _elevated, ...branch }) => ({
      ...branch, points: branch.points.map(({ y: _y, ...point }) => point),
    }));
    // Course8 deliberately opens the early bridge away from the canonical road.
    expect(await digest(horizontal)).toBe('980ade25fe684b537a1e39c321f2fb39aca49a694c0f00b28262dbe07fee22bc');
    expect(await digest(hero.checkpoints)).toBe('07f85f04e4bdd2461e285892e0cd6e32fb9ba94dc89aef45d307394fd02ea3a8');
    expect(createProceduralPodraceCourse(base, INKSTORM_BRIDGE_SEED).branches).toEqual(hero.branches);
  });

  it.each([
    [0x464f554e, 'e609ffa1b138b5452484de7c95b5078bf80acf0964f8b19024f9f4d747b81ecd'],
    [0x474c4153, '98553734514d63348253f5d16b2b82de54dbf0949fe31a89a3f9e5a046d21b61'],
    [1234, '20d9e7a9f8d523c458aed5f0e08c9e4ae03f467c8a9a4fa060efb3580c0998ba'],
  ])('leaves course %i and its original terrain sampler unchanged', async (seed, hash) => {
    const course = createProceduralPodraceCourse(base, Number(seed));
    expect(await digest(course.branches)).toBe(hash);
    expect(createBridgeHeightSampler(base, course.branches)).toBe(base);
  });

  it('joins ground at both ends, has no holes in its centerline and uses the same projected height', () => {
    const surface = createBridgeHeightSampler(base, hero.branches);
    for (const point of [bridge.points[0]!, bridge.points.at(-1)!]) {
      expect(point.y).toBeCloseTo(base.heightAt(point.x, point.z), 10);
    }
    let maximumRise = 0;
    for (let index = 0; index < bridge.points.length - 1; index += 1) {
      const point = bridge.points[index]!, next = bridge.points[index + 1]!;
      for (const fraction of [0.001, 0.25, 0.5, 0.75, 0.999]) {
        const x = point.x + (next.x - point.x) * fraction;
        const z = point.z + (next.z - point.z) * fraction;
        const expected = point.y + (next.y - point.y) * fraction;
        expect(sampleBridgeSurface(hero.branches, x, z)?.height).toBeCloseTo(expected, 8);
        expect(surface.heightAt(x, z)).toBeCloseTo(Math.max(base.heightAt(x, z), expected), 8);
        const projection = hero.projectPoint(x, z, point.canonicalProgress);
        // At the shared entry/exit the canonical road can win projection.
        // Once the bridge is the selected route, its authoritative y must win.
        if (projection.branchId === bridge.id) expect(projection.y).toBeCloseTo(expected, 7);
        if (index > 3 && index < 20) expect(projection.branchId).toBe(bridge.id);
        maximumRise = Math.max(maximumRise, expected - base.heightAt(x, z));
      }
    }
    // The profile's control points rise at most 24 m; dunes between samples
    // can be slightly lower than that envelope.
    expect(maximumRise).toBeGreaterThan(20);
    expect(maximumRise).toBeLessThan(27);
  });

  it('supports the full interior width and restores actual ground beyond a bridge edge', () => {
    const surface = createBridgeHeightSampler(base, hero.branches);
    const point = bridge.points[11]!, next = bridge.points[12]!;
    const dx = next.x - point.x, dz = next.z - point.z, length = Math.hypot(dx, dz);
    const x = (point.x + next.x) / 2, z = (point.z + next.z) / 2;
    const width = (point.width + next.width) / 2;
    for (const side of [-1, 1]) {
      const insideX = x + dz / length * (width - 0.01) * side;
      const insideZ = z - dx / length * (width - 0.01) * side;
      expect(sampleBridgeSurface(hero.branches, insideX, insideZ)?.height).toBeCloseTo((point.y + next.y) / 2, 7);
      const outsideX = x + dz / length * (width + 3) * side;
      const outsideZ = z - dx / length * (width + 3) * side;
      expect(sampleBridgeSurface(hero.branches, outsideX, outsideZ)).toBeNull();
      expect(surface.heightAt(outsideX, outsideZ)).toBe(base.heightAt(outsideX, outsideZ));
    }
  });

  it.each([6, 12, 18])('holds a braking craft on deck sample %i without falling through or resetting', (index) => {
    const race = createRaceSimulation({ terrain: base, seed: INKSTORM_BRIDGE_SEED, competitionProfile: 'time-trial', countdownSeconds: 0 });
    race.step();
    const point = bridge.points[index]!, next = bridge.points[index + 1]!;
    const player = race.state.entries[0]!;
    player.vehicle = createPodracerState({ id: player.id, terrain: race.terrain,
      position: { x: point.x, z: point.z }, yaw: Math.atan2(next.x - point.x, next.z - point.z) });
    player.progress.courseProgress = point.canonicalProgress;
    player.progress.previousProgress = point.canonicalProgress;
    player.progress.unwrappedProgress = point.canonicalProgress;
    let resets = 0, supported = 0;
    // Initial fixture only: every subsequent pose is produced by normal physics.
    for (let tick = 0; tick < 360; tick += 1) {
      const result = race.step({ throttle: 0, brake: 1 });
      resets += (result.vehicleEvents[player.id] ?? []).filter((event) => event.type === 'reset').length;
      if (player.vehicle.grounded) supported += 1;
      const deck = sampleBridgeSurface(race.course.branches, player.vehicle.position.x, player.vehicle.position.z)!;
      expect(deck).not.toBeNull();
      expect(player.vehicle.position.y - deck.height).toBeGreaterThan(0.4);
    }
    expect(resets).toBe(0);
    expect(supported).toBe(360);
    expect(player.progress.offCourseDistance).toBe(0);
  });

  it('lets a craft beyond the bridge edge fall to the actual desert', () => {
    const race = createRaceSimulation({ terrain: base, seed: INKSTORM_BRIDGE_SEED,
      competitionProfile: 'time-trial', countdownSeconds: 0 });
    race.step();
    const point = bridge.points[11]!, next = bridge.points[12]!;
    const dx = next.x - point.x, dz = next.z - point.z, length = Math.hypot(dx, dz);
    const x = (point.x + next.x) / 2 + dz / length * (point.width + 15);
    const z = (point.z + next.z) / 2 - dx / length * (point.width + 15);
    const initialY = (point.y + next.y) / 2 + 2.45;
    const player = race.state.entries[0]!;
    player.vehicle = createPodracerState({ id: player.id, terrain: race.terrain,
      position: { x, y: initialY, z }, yaw: Math.atan2(dx, dz) });
    player.progress.courseProgress = point.canonicalProgress;
    player.progress.previousProgress = point.canonicalProgress;
    player.progress.unwrappedProgress = point.canonicalProgress;
    expect(sampleBridgeSurface(race.course.branches, x, z)).toBeNull();
    let resets = 0;
    for (let tick = 0; tick < 300; tick += 1) {
      const result = race.step({ throttle: 0, brake: 1 });
      resets += (result.vehicleEvents[player.id] ?? []).filter((event) => event.type === 'reset').length;
    }
    expect(resets).toBe(0);
    expect(player.vehicle.position.y).toBeLessThan(initialY - 12);
    expect(player.vehicle.position.y - base.heightAt(player.vehicle.position.x, player.vehicle.position.z)).toBeLessThan(5);
    expect(player.vehicle.grounded).toBe(true);
  });
});

describe('finite ground pylon height', () => {
  it('clears the low ramp footprint for the wide vehicle but retains markers below high decks', () => {
    const entry = bridge.points[2]!, middle = bridge.points[12]!;
    expect(groundPylonConflictsWithBridge(hero.branches, entry.x, entry.z, base.heightAt(entry.x, entry.z))).toBe(true);
    expect(groundPylonConflictsWithBridge(hero.branches, middle.x, middle.z, base.heightAt(middle.x, middle.z))).toBe(false);
    const race = createRaceSimulation({ terrain: base, seed: INKSTORM_BRIDGE_SEED, competitionProfile: 'time-trial' });
    const markers = (race as unknown as { markerColliders: readonly { id: string }[] }).markerColliders;
    // This marker belonged inside the former bridge footprint. The authored
    // divergence now clears it, so it correctly remains on the ground route.
    expect(markers.some((marker) => marker.id === 'pylon-825-r')).toBe(true);
  });

  it.each([{ clearance: 2.5, hits: 1 }, { clearance: 18, hits: 0 }])('gives $hits impacts at $clearance m ground clearance', ({ clearance, hits }) => {
    const race = createRaceSimulation({ terrain: base, seed: INKSTORM_BRIDGE_SEED,
      competitionProfile: 'time-trial', countdownSeconds: 0 });
    race.step();
    const marker = (race as unknown as { markerColliders: readonly { x: number; z: number; id: string; minY: number; maxY: number }[] }).markerColliders[0]!;
    const player = race.state.entries[0]!;
    player.vehicle.position = { x: marker.x, z: marker.z, y: base.heightAt(marker.x, marker.z) + clearance };
    player.vehicle.velocity = { x: 0, y: 0, z: 0 };
    const result = race.step({ throttle: 0, brake: 1 });
    expect(marker.maxY).toBeCloseTo(base.heightAt(marker.x, marker.z) + 9.9);
    expect((result.vehicleEvents[player.id] ?? []).filter((event) => event.type === 'collision' && event.sourceId === marker.id)).toHaveLength(hits);
  });
});
