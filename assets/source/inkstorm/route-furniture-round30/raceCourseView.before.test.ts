import { BufferAttribute, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, ShaderMaterial, Vector2, Vector3 } from 'three';
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
  it('releases retired instance buffers when rebuilding and disposing a course', () => {
    const course = new RaceCourseView();
    const data = createCourse();
    data.branches = [{
      id: 'resource-test-branch',
      kind: 'shortcut',
      points: data.points.slice(4, 20),
    }];
    course.setCourse(data);
    const retiredInstances = course.children.filter(
      (child): child is InstancedMesh => child instanceof InstancedMesh,
    );
    const retiredDisposals = new Map(retiredInstances.map((mesh) => [mesh, 0]));
    for (const mesh of retiredInstances) {
      mesh.addEventListener('dispose', () => {
        retiredDisposals.set(mesh, retiredDisposals.get(mesh)! + 1);
      });
    }
    expect(retiredInstances.length).toBeGreaterThan(1);

    course.setCourse(createCourse(180));
    for (const mesh of retiredInstances) {
      expect(retiredDisposals.get(mesh), mesh.name).toBe(1);
      expect(mesh.parent).toBeNull();
    }
    const currentInstances = course.children.filter(
      (child): child is InstancedMesh => child instanceof InstancedMesh,
    );
    const currentDisposals = new Map(currentInstances.map((mesh) => [mesh, 0]));
    for (const mesh of currentInstances) {
      mesh.addEventListener('dispose', () => {
        currentDisposals.set(mesh, currentDisposals.get(mesh)! + 1);
      });
    }
    course.dispose();
    course.dispose();
    for (const mesh of currentInstances) {
      expect(currentDisposals.get(mesh), mesh.name).toBe(1);
    }
    expect(Array.from(retiredDisposals.values()).every((count) => count === 1)).toBe(true);
  });

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

  it('places branch lamps beyond both converging lanes and writes their real opaque depth', () => {
    const view = new RaceCourseView();
    const point = (x: number, z: number, width: number) => ({ x, y: 0, z, width });
    view.setCourse({
      points: [point(-200, 0, 30), point(200, 0, 30), point(200, -400, 30), point(-200, -400, 30)],
      checkpointIndices: [],
      branches: [{ id: 'perpendicular-junction', kind: 'shortcut', points: [
        point(0, 0, 12), point(0, 50, 12), point(0, 100, 12),
      ] }],
    });
    const lamps = view.getObjectByName('alternate-route-entry-exit-beacons') as InstancedMesh;
    expect(lamps.count).toBe(2);
    const matrix = new Matrix4(), position = new Vector3();
    for (let index = 0; index < lamps.count; index += 1) {
      lamps.getMatrixAt(index, matrix);
      position.setFromMatrixPosition(matrix);
      // Main is 60 m wide; the shortcut is 24 m wide. A lamp must clear both.
      expect(Math.abs(position.z)).toBeGreaterThan(33.5);
      if (position.z >= 0 && position.z <= 100) expect(Math.abs(position.x)).toBeGreaterThan(15.5);
    }
    expect((lamps.material as MeshBasicMaterial).depthWrite).toBe(true);
    expect((lamps.material as MeshBasicMaterial).transparent).toBe(false);
    lamps.geometry.computeBoundingBox();
    expect(lamps.geometry.boundingBox!.max.y).toBeLessThan(3.7);
    expect(lamps.geometry.boundingBox!.max.x).toBeLessThan(0.55);
    const colors = lamps.geometry.getAttribute('color');
    const brightVertices = Array.from({ length: colors.count }, (_, index) => colors.getX(index))
      .filter((red) => red > 0.9).length;
    expect(brightVertices).toBeLessThan(colors.count * 0.25);
    view.dispose();
  });
});
