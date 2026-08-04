import { BufferAttribute, InstancedMesh, Mesh, ShaderMaterial, Vector2 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  RaceCourseView,
  type CourseRenderData,
} from '../../src/render/objects/RaceCourseView';

function createCourse(pointCount = 160): CourseRenderData {
  return {
    points: Array.from({ length: pointCount }, (_, index) => {
      const angle = index / pointCount * Math.PI * 2;
      return {
        x: Math.sin(angle) * 420,
        y: Math.sin(angle * 3) * 9,
        z: Math.cos(angle) * 420,
        width: 20,
        tag: index >= 32 && index < 72 ? 'narrow-canyon' : 'fast-straight',
      };
    }),
    checkpointIndices: [0, 40, 80, 120],
  };
}

describe('race course rendering', () => {
  it('keeps near/far route LODs and a continuous canyon inside nine draw surfaces', () => {
    const course = new RaceCourseView();
    course.setCourse(createCourse());

    expect(course.children).toHaveLength(9);
    expect(course.children.filter((child) => child.name === 'conforming-racing-line')).toHaveLength(1);
    expect(course.children.filter((child) => child.name === 'solid-far-racing-line-lod')).toHaveLength(1);
    expect(course.children.filter((child) => child.name === 'far-route-visibility-overlay')).toHaveLength(1);
    expect(course.children.filter((child) => child.name === 'coherent-far-pylon-marker-lod')).toHaveLength(1);

    const ribbon = course.children.find((child) => child.name === 'conforming-racing-line');
    expect(ribbon).toBeInstanceOf(Mesh);
    const positions = (ribbon as Mesh).geometry.getAttribute('position') as BufferAttribute;
    const widthAtStart = Math.hypot(
      positions.getX(1) - positions.getX(0),
      positions.getZ(1) - positions.getZ(0),
    );
    expect(widthAtStart).toBeGreaterThanOrEqual(3.2);
    expect(widthAtStart).toBeLessThan(3.5);

    const farRibbon = course.children.find((child) => child.name === 'solid-far-racing-line-lod');
    expect(farRibbon).toBeInstanceOf(Mesh);
    const farStarts = (farRibbon as Mesh).geometry.getAttribute('aStart') as BufferAttribute;
    const farEnds = (farRibbon as Mesh).geometry.getAttribute('aEnd') as BufferAttribute;
    expect(farStarts.count).toBe(160 * 6);
    expect(farEnds.count).toBe(farStarts.count);
    expect(farStarts.getX(0)).not.toBe(farEnds.getX(0));
    const farMaterial = (farRibbon as Mesh).material;
    expect(Array.isArray(farMaterial)).toBe(false);
    if (Array.isArray(farMaterial)) throw new Error('Far route must use one material.');
    expect(farMaterial.depthTest).toBe(true);
    expect(farMaterial).toBeInstanceOf(ShaderMaterial);
    const farShader = farMaterial as ShaderMaterial;
    expect(farShader.uniforms.uHalfWidthPx?.value).toBe(2.4);
    expect(farShader.uniforms.uViewportSize?.value).toBeInstanceOf(Vector2);
    expect(farShader.vertexShader).toContain('uViewportSize');
    expect(farShader.vertexShader).toContain('routeClip.z -=');

    const farOverlay = course.children.find((child) => child.name === 'far-route-visibility-overlay');
    expect(farOverlay).toBeInstanceOf(Mesh);
    const overlayMaterial = (farOverlay as Mesh).material;
    expect(Array.isArray(overlayMaterial)).toBe(false);
    if (Array.isArray(overlayMaterial)) throw new Error('Far route overlay must use one material.');
    expect(overlayMaterial.depthTest).toBe(false);

    const farPylons = course.children.find(
      (child) => child.name === 'coherent-far-pylon-marker-lod',
    );
    expect(farPylons).toBeInstanceOf(InstancedMesh);
    const farPylonMaterial = (farPylons as InstancedMesh).material;
    expect(Array.isArray(farPylonMaterial)).toBe(false);
    if (Array.isArray(farPylonMaterial)) throw new Error('Far pylons must use one material.');
    expect(farPylonMaterial).toBeInstanceOf(ShaderMaterial);
    const markerSize = (farPylonMaterial as ShaderMaterial).uniforms.uMarkerSizePx?.value;
    expect(markerSize).toBeInstanceOf(Vector2);
    expect((markerSize as Vector2).toArray()).toEqual([4.6, 14]);
    expect((farPylonMaterial as ShaderMaterial).vertexShader).toContain('markerOffsetNdc');

    const canyon = course.children.find((child) => child.name.includes('narrow canyon'));
    expect(canyon).toBeInstanceOf(InstancedMesh);
    expect((canyon as InstancedMesh).count).toBeGreaterThan(10);

    course.dispose();
    expect(course.children).toHaveLength(0);
  });

  it('merges all alternate paths into three bounded draw surfaces', () => {
    const data = createCourse(160);
    data.branches = [
      {
        id: 'branch-a',
        kind: 'shortcut',
        points: Array.from({ length: 17 }, (_, index) => ({
          x: -240 + index * 28,
          y: 0,
          z: 390 - Math.sin(index / 16 * Math.PI) * 110,
          width: 12,
        })),
      },
      {
        id: 'branch-b',
        kind: 'safe',
        points: Array.from({ length: 21 }, (_, index) => ({
          x: 390 - Math.sin(index / 20 * Math.PI) * 130,
          y: 0,
          z: 250 - index * 25,
          width: 20,
        })),
      },
    ];
    const course = new RaceCourseView();
    course.setCourse(data);

    expect(course.children).toHaveLength(12);
    expect(course.children.filter((child) => (
      child.name === 'merged-conforming-alternate-routes'
    ))).toHaveLength(1);
    expect(course.children.filter((child) => (
      child.name === 'merged-alternate-route-far-lod'
    ))).toHaveLength(1);
    const beacons = course.children.find((child) => (
      child.name === 'alternate-route-entry-exit-beacons'
    ));
    expect(beacons).toBeInstanceOf(InstancedMesh);
    expect((beacons as InstancedMesh).count).toBe(4);

    course.dispose();
    expect(course.children).toHaveLength(0);
  });
});
