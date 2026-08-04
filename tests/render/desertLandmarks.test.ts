import { InstancedMesh } from 'three';
import { describe, expect, it } from 'vitest';
import { DesertLandmarks } from '../../src/render/objects/DesertLandmarks';

describe('infinite desert landmarks', () => {
  it('keeps three instanced families with stable distance-safe ink', () => {
    const landmarks = new DesertLandmarks();
    landmarks.setHeightSampler(() => 0);
    landmarks.update(0, 0);

    expect(landmarks.children).toHaveLength(3);
    const formations = landmarks.children as InstancedMesh[];
    expect(formations.every((formation) => formation instanceof InstancedMesh)).toBe(true);
    expect(formations.every((formation) => formation.userData.celPostExclude === true)).toBe(true);
    expect(formations.reduce((total, formation) => total + formation.count, 0)).toBeGreaterThan(14);
    // Macro clustering may intentionally move one rare family outside a given
    // recycled window, but the view must never collapse to one repeated kit.
    expect(formations.filter((formation) => formation.count > 0).length).toBeGreaterThanOrEqual(2);

    const counts = formations.map((formation) => formation.count);
    landmarks.update(0, 0);
    expect(formations.map((formation) => formation.count)).toEqual(counts);
    landmarks.dispose();
  });
});
