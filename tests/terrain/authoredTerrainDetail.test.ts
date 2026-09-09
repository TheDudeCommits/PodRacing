import { describe, expect, it } from 'vitest';
import { type BufferGeometry } from 'three';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { COURSE_GULF_SEED, createCourseGulfField } from '../../src/game/race/CourseGulfField';
import { TerrainSystem } from '../../src/render/terrain/TerrainSystem';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { authoredTerrainRound26 } from './authoredTerrainRound26';

const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, COURSE_GULF_SEED);
const field = createCourseGulfField(course)!;
const height = (x: number, z: number) => sampleTerrainHeight(x, z) + field.sampleOffset(x, z);

function boundary(geometry: BufferGeometry, extent: number): number[] {
  const position = geometry.getAttribute('position'), points = new Set<number>();
  for (let i = 0; i < position.count; i++) {
    if (position.getZ(i) === extent && Math.abs(position.getX(i)) <= extent && position.getY(i) === 0) points.add(position.getX(i));
  }
  return [...points].sort((a, b) => a - b);
}

/** Vertical hit on the actual indexed triangle, with the shader's physical height sampled at its vertices. */
function surfaceHit(geometry: BufferGeometry, cameraX: number, cameraZ: number, x: number, z: number,
  heightAt: (x: number, z: number) => number = height): number {
  const positions = geometry.getAttribute('position'), index = geometry.index!;
  for (let i = 0; i < index.count; i += 3) {
    const ia = index.getX(i), ib = index.getX(i + 1), ic = index.getX(i + 2);
    const ax = positions.getX(ia) + cameraX, az = positions.getZ(ia) + cameraZ;
    const bx = positions.getX(ib) + cameraX, bz = positions.getZ(ib) + cameraZ;
    const cx = positions.getX(ic) + cameraX, cz = positions.getZ(ic) + cameraZ;
    if (x < Math.min(ax, bx, cx) || x > Math.max(ax, bx, cx) || z < Math.min(az, bz, cz) || z > Math.max(az, bz, cz)) continue;
    const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(denominator) < 1e-10) continue;
    const a = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominator;
    const b = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominator;
    const c = 1 - a - b;
    if (Math.min(a, b, c) < -1e-8) continue;
    return a * (heightAt(ax, az) + positions.getY(ia))
      + b * (heightAt(bx, bz) + positions.getY(ib)) + c * (heightAt(cx, cz) + positions.getY(ic));
  }
  throw new Error('No terrain triangle at the recorded cliff site');
}

describe('authored cliff terrain detail', () => {
  it('retains the original missing-face regression against frozen pre-sculpt physical heights', () => {
    const terrain = new TerrainSystem();
    // Round27 intentionally cuts this exact cliff site. Keep the original
    // >130m reproduction independent of that authored terrain change.
    const {cameraX,cameraZ,x,z,expected,points} = authoredTerrainRound26;
    const recordedHeight = (x: number, z: number): number => {
      const point = points.find(p => Math.abs(p.x - x) < 1e-7 && Math.abs(p.z - z) < 1e-7);
      if (!point) throw new Error(`Missing frozen terrain sample at ${x},${z}`);
      return point.height;
    };
    try {
      const before = surfaceHit(terrain.meshes[4]!.geometry, cameraX, cameraZ, x, z, recordedHeight);
      expect(Math.abs(before - expected)).toBeGreaterThan(130);
      terrain.setCourseGulfField(field);
      const after = surfaceHit(terrain.meshes[4]!.geometry, cameraX, cameraZ, x, z, recordedHeight);
      expect(Math.abs(after - expected)).toBeLessThan(8);
      expect(Math.abs(after - expected)).toBeLessThan(Math.abs(before - expected) * .1);
    } finally { terrain.dispose(); }
  });

  it('resolves the current sculpted site without changing its physical height or mesh budget', () => {
    const terrain = new TerrainSystem();
    const {cameraX,cameraZ,x,z} = authoredTerrainRound26;
    const expected = height(x, z);
    try {
      const before = surfaceHit(terrain.meshes[4]!.geometry, cameraX, cameraZ, x, z);
      terrain.setCourseGulfField(field);
      const after = surfaceHit(terrain.meshes[4]!.geometry, cameraX, cameraZ, x, z);
      expect(Math.abs(after - expected)).toBeLessThan(8);
      expect(Math.abs(after - expected)).toBeLessThan(Math.abs(before - expected) * .25);
      expect(height(x, z)).toBe(expected);
      expect(terrain.meshes.reduce((sum, mesh) => sum + mesh.geometry.index!.count / 3, 0)).toBeLessThanOrEqual(400000);
      expect(terrain.maximumDrawCalls).toBe(6);
    } finally { terrain.dispose(); }
  });

  it('stitches every adjacent detail boundary including equal-resolution rings', () => {
    const terrain = new TerrainSystem();
    try {
      terrain.setCourseGulfField(field);
      for (let level = 1; level < terrain.meshes.length; level++) {
        const extent = terrain.meshes[level]!.geometry.userData.terrainRing.innerHalfExtent;
        expect(boundary(terrain.meshes[level]!.geometry, extent))
          .toEqual(boundary(terrain.meshes[level - 1]!.geometry, extent));
      }
    } finally { terrain.dispose(); }
  });

  it('reuses each mode and disposes both sets exactly once while retaining stable registered meshes', () => {
    const terrain = new TerrainSystem();
    const meshes = [...terrain.meshes], base = meshes.map(mesh => mesh.geometry);
    terrain.setLevelCount(4);
    terrain.setCourseGulfField(field);
    const detailed = meshes.map(mesh => mesh.geometry);
    const disposals = new Map<BufferGeometry, number>();
    for (const geometry of new Set([...base, ...detailed])) {
      disposals.set(geometry, 0);
      geometry.addEventListener('dispose', () => disposals.set(geometry, disposals.get(geometry)! + 1));
    }
    for (let cycle = 0; cycle < 3; cycle++) {
      terrain.setCourseGulfField(null);
      expect(terrain.meshes.map(mesh => mesh.geometry)).toEqual(base);
      expect(terrain.levelCount).toBe(4);
      terrain.setCourseGulfField(field);
      expect(terrain.meshes.map(mesh => mesh.geometry)).toEqual(detailed);
      expect(terrain.levelCount).toBe(6);
      expect(terrain.meshes.every((mesh, i) => mesh === meshes[i])).toBe(true);
    }
    expect([...disposals.values()].every(value => value === 0)).toBe(true);
    terrain.dispose();
    expect([...disposals.values()].every(value => value === 1)).toBe(true);
  });
});
