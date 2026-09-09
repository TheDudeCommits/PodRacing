import { describe, expect, it, vi } from 'vitest';
import { Color, Group, Raycaster, Scene, Vector3, type WebGLRenderer } from 'three';
import { InkstormSunShadow } from '../../src/render/inkstorm/InkstormSunShadow';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createCourseGulfField, COURSE_GULF_SEED } from '../../src/game/race/CourseGulfField';
import { LAUNCH_LANDSCAPE_BOUNDS, LAUNCH_RIDGES, launchRidgeSurface } from '../../src/game/race/LaunchBasinPlan';
import { getLaunchBasinAnchor } from '../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { InkstormTerrainShadow, INKSTORM_TERRAIN_SHADOW_STEP } from '../../src/render/inkstorm/InkstormTerrainShadow';

const base = { heightAt: sampleTerrainHeight };
const hero = createProceduralPodraceCourse(base, COURSE_GULF_SEED);
const field = createCourseGulfField(hero)!;
const grid = field.grids[0];
const physical = (x: number, z: number) => sampleTerrainHeight(x, z, field);

// Draft tests are applied alongside the signed-field change, then run. They are
// deliberately not executed against the frozen round19 runtime's negative field.
describe('revision-owned physical launch terrain shadow', () => {
  it('uses installed positive physical heights, local footprint and finite upward-facing triangles', () => {
    const owner = new InkstormTerrainShadow();
    owner.setCourse(hero, physical, grid);
    const mesh = owner.createCaster()!;
    expect(mesh).not.toBeNull(); expect(mesh.visible).toBe(true); expect(mesh.parent).toBeNull();
    expect(mesh.position.toArray()).toEqual([0, 0, 0]);
    expect(mesh.scale.toArray()).toEqual([1, 1, 1]);
    const positions = mesh.geometry.getAttribute('position'), indices = mesh.geometry.index!;
    expect(owner.receipt.triangles).toBeGreaterThan(500);
    expect(owner.receipt.triangles).toBeLessThan(40_000);
    expect(indices.count).toBe(owner.receipt.triangles * 3);
    expect(positions.count).toBe(owner.receipt.vertices);
    expect(INKSTORM_TERRAIN_SHADOW_STEP).toBeGreaterThanOrEqual(12);
    expect(INKSTORM_TERRAIN_SHADOW_STEP).toBeLessThanOrEqual(24);
    const anchor = getLaunchBasinAnchor(hero)!;
    let actualMin = Infinity, actualMax = -Infinity, maximumPad = 0;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const actual = physical(x, z), pad = actual - y;
      expect(Number.isFinite(y)).toBe(true);
      expect(actual - sampleTerrainHeight(x, z)).toBeGreaterThan(.25);
      expect(pad).toBeGreaterThan(.799);
      actualMin = Math.min(actualMin, actual); actualMax = Math.max(actualMax, actual); maximumPad = Math.max(maximumPad, pad);
      expect(x).toBeGreaterThanOrEqual(grid.minX); expect(z).toBeGreaterThanOrEqual(grid.minZ);
      expect(x).toBeLessThanOrEqual(grid.minX + (grid.size - 1) * grid.cellSize);
      expect(z).toBeLessThanOrEqual(grid.minZ + (grid.size - 1) * grid.cellSize);
      const dx = x - anchor.x, dz = z - anchor.z;
      const f = dx * anchor.tangentX + dz * anchor.tangentZ, r = -dx * anchor.rightX - dz * anchor.rightZ;
      expect(launchRidgeSurface(f, r).weight).toBeGreaterThan(0);
      expect(f).toBeGreaterThanOrEqual(LAUNCH_LANDSCAPE_BOUNDS.minForward - 36);
      expect(f).toBeLessThanOrEqual(LAUNCH_LANDSCAPE_BOUNDS.maxForward + 36);
      expect(r).toBeGreaterThanOrEqual(LAUNCH_LANDSCAPE_BOUNDS.minRight - 36);
      expect(r).toBeLessThanOrEqual(LAUNCH_LANDSCAPE_BOUNDS.maxRight + 36);
    }
    expect(owner.receipt.physicalMinHeight).toBe(actualMin); expect(owner.receipt.physicalMaxHeight).toBe(actualMax);
    expect(owner.receipt.maxDownwardPad).toBeCloseTo(maximumPad, 3);
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i), b = indices.getX(i + 1), c = indices.getX(i + 2);
      const crossY = (positions.getZ(b) - positions.getZ(a)) * (positions.getX(c) - positions.getX(a))
        - (positions.getX(b) - positions.getX(a)) * (positions.getZ(c) - positions.getZ(a));
      expect(crossY).toBeGreaterThan(0);
      // Independent edge/interior lattice check of the final padded geometry.
      for (let u = 0; u <= 3; u++) for (let v = 0; v <= 3 - u; v++) {
        const wa = 1 - (u + v) / 3, wb = u / 3, wc = v / 3;
        const x = positions.getX(a) * wa + positions.getX(b) * wb + positions.getX(c) * wc;
        const z = positions.getZ(a) * wa + positions.getZ(b) * wb + positions.getZ(c) * wc;
        const y = positions.getY(a) * wa + positions.getY(b) * wb + positions.getY(c) * wc;
        expect(physical(x, z) - y).toBeGreaterThan(.799);
      }
    }
    // Independent plan-space anchor: screen right is NEGATIVE course.right.
    // This known asymmetric west station catches a mirror in either world
    // bounds or mask conversion; inverse-converting generated vertices alone
    // would incorrectly accept the same sign error in source and test.
    const west = LAUNCH_RIDGES.find(ridge => ridge.id === 'near-west-rim')!.stations[1]!;
    const westX = anchor.x + anchor.tangentX * west.forward - anchor.rightX * west.right;
    const westZ = anchor.z + anchor.tangentZ * west.forward - anchor.rightZ * west.right;
    expect(physical(westX, westZ) - sampleTerrainHeight(westX, westZ)).toBeGreaterThan(10);
    mesh.updateMatrixWorld(true);
    const probe = new Raycaster(new Vector3(westX, physical(westX, westZ) + 500, westZ), new Vector3(0, -1, 0), 0, 1000);
    expect(probe.intersectObject(mesh).length, 'known west mountain must cast at its actual authored world position').toBeGreaterThan(0);
    owner.dispose();
  });

  it('never adds flat/negative terrain or a nonflagship course to the atlas', () => {
    const owner = new InkstormTerrainShadow(), sampler = vi.fn(sampleTerrainHeight);
    owner.setCourse(createProceduralPodraceCourse(base, 42), sampler, grid);
    expect(sampler).not.toHaveBeenCalled(); expect(owner.createCaster()).toBeNull();
    owner.setCourse(hero, sampler, null); expect(sampler).not.toHaveBeenCalled();
    owner.setCourse(hero, (x, z) => sampleTerrainHeight(x, z) - 150, grid);
    expect(owner.createCaster()).toBeNull(); expect(owner.receipt.triangles).toBe(0); owner.dispose();
  });

  it('keeps bake clones borrowed and disposes each source geometry/material once per rebuild', () => {
    const owner = new InkstormTerrainShadow(); owner.setCourse(hero, physical, grid);
    const first = owner.createCaster()!, second = owner.createCaster()!;
    expect(first.geometry).toBe(second.geometry); expect(first.material).toBe(second.material);
    const geometryDispose = vi.fn(), materialDispose = vi.fn();
    first.geometry.addEventListener('dispose', geometryDispose); first.material.addEventListener('dispose', materialDispose);
    const atlas = new InkstormSunShadow(), render = vi.fn();
    const renderer = {
      capabilities: { maxTextureSize: 4096 }, autoClear: false,
      getContext: () => ({ isContextLost: () => false, checkFramebufferStatus: () => 36053, FRAMEBUFFER: 36160, FRAMEBUFFER_COMPLETE: 36053 }),
      getRenderTarget: () => null, getClearColor: (color: Color) => color.set('#aabbcc'), getClearAlpha: () => .4,
      setRenderTarget: vi.fn(), setClearColor: vi.fn(), clear: vi.fn(), render,
    } as unknown as WebGLRenderer;
    const create = () => { const group = new Group(); group.add(owner.createCaster()!); return group; };
    atlas.update(renderer, 1, create, new Scene()); atlas.update(renderer, 1, create, new Scene());
    expect(render).toHaveBeenCalledTimes(1); expect(geometryDispose).not.toHaveBeenCalled(); expect(materialDispose).not.toHaveBeenCalled();
    atlas.invalidate(); atlas.update(renderer, 1, create, new Scene());
    expect(render).toHaveBeenCalledTimes(2); expect(geometryDispose).not.toHaveBeenCalled();
    owner.setCourse(hero, physical, grid);
    expect(geometryDispose).toHaveBeenCalledTimes(1); expect(materialDispose).toHaveBeenCalledTimes(1);
    const next = owner.createCaster()!, nextDispose = vi.fn(); next.geometry.addEventListener('dispose', nextDispose);
    expect(next.geometry).not.toBe(first.geometry);
    owner.dispose(); owner.dispose(); expect(nextDispose).toHaveBeenCalledTimes(1);
    expect(owner.createCaster()).toBeNull(); expect(owner.receipt.vertices).toBe(0); atlas.dispose();
  });
});
