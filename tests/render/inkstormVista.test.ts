import { describe, expect, it } from 'vitest';
import { Color, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { createPodraceCourse, createProceduralPodraceCourse, PODRACE_CONTROL_POINTS } from '../../src/game/race/course';
import { createInkstormVista, getInkstormVistaPlan, type VistaFootprint } from '../../src/render/inkstorm/InkstormVista';
import { CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY } from '../../src/render/post/CelPrepassMaterial';
import { LAUNCH_INDUSTRIAL_CENTER } from '../../src/game/race/LaunchBasinPlan';
import { createCourseGulfField } from '../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const terrain = { heightAt: sampleTerrainHeight };
const hero = createProceduralPodraceCourse(terrain, 0x494e4b53);

function dispose(meshes: readonly Mesh[]): void {
  for (const mesh of meshes) {
    mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
  }
}

function approachCamera(x: number, z: number, yaw: number, y: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(65, 16 / 9, .1, 3000);
  camera.position.set(x - Math.sin(yaw) * 120, y, z - Math.cos(yaw) * 120);
  camera.lookAt(x + Math.sin(yaw) * 100, y, z + Math.cos(yaw) * 100);
  camera.updateMatrixWorld(true);
  return camera;
}

function coloredVertices(mesh: Mesh, hex: string): Vector3[] {
  const position = mesh.geometry.getAttribute('position'), colors = mesh.geometry.getAttribute('color');
  const color = new Color(hex), vertices: Vector3[] = [];
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(colors.getX(i) - color.r) + Math.abs(colors.getY(i) - color.g) + Math.abs(colors.getZ(i) - color.b) < .001) {
      vertices.push(new Vector3().fromBufferAttribute(position, i));
    }
  }
  return vertices;
}

function mean(points: readonly Vector3[]): Vector3 {
  expect(points.length).toBeGreaterThan(0);
  return points.reduce((sum, point) => sum.add(point), new Vector3()).divideScalar(points.length);
}

describe('Inkstorm scenic composition', () => {
  it('keeps every actual primitive inside a declared footprint and all geometry below its fixed budget', () => {
    const meshes = createInkstormVista(hero, sampleTerrainHeight);
    try {
      expect(meshes.length).toBeGreaterThan(0);
      expect(meshes.length).toBeLessThanOrEqual(3);
      let triangles = 0;
      for (const mesh of meshes) {
        const vertices = mesh.geometry.getAttribute('position');
        const footprints = mesh.userData.inkstormVistaFootprints as VistaFootprint[];
        expect(mesh.geometry.groups).toHaveLength(0);
        expect(Array.isArray(mesh.material)).toBe(false);
        expect(mesh.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY]).toBe(true);
        expect(mesh.geometry.getAttribute('color').count).toBe(vertices.count);
        triangles += (mesh.geometry.index?.count ?? vertices.count) / 3;
        for (let i = 0; i < vertices.count; i++) {
          const x = vertices.getX(i), z = vertices.getZ(i);
          expect(Number.isFinite(vertices.getY(i))).toBe(true);
          expect(footprints.some(p => Math.hypot(x - p.x, z - p.z) <= p.radius + .02),
            `${mesh.name} has geometry outside its clearance proof`).toBe(true);
        }
      }
      expect(triangles).toBeLessThanOrEqual(40_000);
    } finally { dispose(meshes); }
  });

  it.each([0x494e4b53, 0x464f554e, 1234])('clears dense canonical lanes and every elevated/ground branch for course %i', seed => {
    const course = seed === 0x494e4b53 ? hero : createProceduralPodraceCourse(terrain, seed);
    const plan = getInkstormVistaPlan(course, sampleTerrainHeight);
    const footprints: VistaFootprint[] = [...plan.landforms, ...plan.barriers, ...plan.signs, ...plan.beacons, ...(plan.citadel ? [plan.citadel] : [])];
    // Independent dense route samples check the complete enclosing disks, not only mesh vertices.
    const points = course.getRenderData(4096).points.map(point => ({ ...point }));
    for (const branch of course.branches) {
      for (let i = 1; i < branch.points.length; i++) {
        const a = branch.points[i - 1]!, b = branch.points[i]!;
        for (let step = 0; step <= 10; step++) {
          const t = step / 10;
          points.push({ x: a.x + (b.x - a.x) * t, y: 0, z: a.z + (b.z - a.z) * t,
            width: a.width + (b.width - a.width) * t, progress: 0, tag: 'recovery-straight' });
        }
      }
    }
    for (const p of footprints) {
      const minimum = Math.min(...points.map(point => Math.hypot(p.x - point.x, p.z - point.z) - point.width - p.radius));
      expect(minimum, p.id).toBeGreaterThanOrEqual(8);
    }
  });

  it('places the flagship refinery on its shared physical hillside benches with a readable skyline', () => {
    const field = createCourseGulfField(hero)!;
    const ground = (x: number, z: number) => sampleTerrainHeight(x,z) + field.sampleOffset(x,z);
    const plan = getInkstormVistaPlan(hero, ground);
    expect(plan.citadel).not.toBeNull();
    const c = plan.citadel!;
    const forward = (c.x-c.launch.x)*c.launch.tangentX + (c.z-c.launch.z)*c.launch.tangentZ;
    const right = -(c.x-c.launch.x)*c.launch.rightX - (c.z-c.launch.z)*c.launch.rightZ;
    expect(forward).toBeCloseTo(LAUNCH_INDUSTRIAL_CENTER.forward,6);
    expect(right).toBeCloseTo(LAUNCH_INDUSTRIAL_CENTER.right,6);
    // Source safety is established by the independent dense corridor test above;
    // this verifies that the shortened destination is physically founded.
    expect(forward).toBeLessThan(900);
    const meshes = createInkstormVista(hero, ground);
    try {
      const citadel = meshes.find(mesh => mesh.name.includes('citadel'))!;
      citadel.geometry.computeBoundingBox();
      const bounds = citadel.geometry.boundingBox!;
      expect(bounds.max.y - Math.max(...plan.terraces.map(t=>t.y))).toBeGreaterThan(225);
      expect(bounds.max.x - bounds.min.x).toBeGreaterThan(180);
      for(const terrace of plan.terraces) {
        expect(terrace.y).toBeGreaterThan(ground(terrace.x,terrace.z));
        expect(terrace.bottom).toBeLessThan(ground(terrace.x,terrace.z));
      }
    } finally { dispose(meshes); }
  });

  it('seats all three refinery yards on founded terraces inside the cleared citadel disk', () => {
    const plan = getInkstormVistaPlan(hero, sampleTerrainHeight), c = plan.citadel!;
    const meshes = createInkstormVista(hero, sampleTerrainHeight);
    try {
      const mesh = meshes.find(mesh => mesh.name.includes('citadel'))!;
      expect(mesh.userData.inkstormVistaRockSupports).toEqual([]);
      expect(plan.terraces).toHaveLength(3);
      for (const terrace of plan.terraces) {
        expect(Math.hypot(terrace.x - c.x, terrace.z - c.z) + terrace.radius).toBeLessThan(c.radius);
        for (let row = -4; row <= 4; row++) for (let col = -4; col <= 4; col++) {
          const x = col * terrace.width / 8, z = row * terrace.depth / 8;
          const worldX = terrace.x + Math.cos(terrace.yaw) * x + Math.sin(terrace.yaw) * z;
          const worldZ = terrace.z - Math.sin(terrace.yaw) * x + Math.cos(terrace.yaw) * z;
          expect(terrace.bottom).toBeLessThan(sampleTerrainHeight(worldX, worldZ));
        }
      }
      expect(new Set(plan.terraces.map(terrace => Math.round(terrace.y))).size).toBe(3);
    } finally { dispose(meshes); }
  });

  it('points each fork arrow toward a real canonical or branch target and does not create signs without branches', () => {
    const plan = getInkstormVistaPlan(hero, sampleTerrainHeight);
    expect(plan.signs.some(sign => sign.routeId === 'canonical')).toBe(true);
    expect(plan.signs.some(sign => sign.routeId === hero.branches[0]!.id)).toBe(true);
    for (const sign of plan.signs) {
      const dx = sign.target.x - sign.approach.x, dz = sign.target.z - sign.approach.z;
      const expected = Math.atan2(-dx * Math.cos(sign.yaw) + dz * Math.sin(sign.yaw), dx * Math.sin(sign.yaw) + dz * Math.cos(sign.yaw));
      expect(sign.direction).toBeCloseTo(expected, 10);
      const projected = hero.projectPoint(sign.target.x, sign.target.z);
      expect(projected.distanceToCenter).toBeLessThan(.5);
    }
    const withoutBranches = createPodraceCourse(terrain, { branches: [] });
    expect(getInkstormVistaPlan(withoutBranches, sampleTerrainHeight).signs).toHaveLength(0);
  });

  it.each([-1, 1])('projects actual chevron tips toward the real ahead tangent for mirrored bend %i', mirror => {
    const flat = { heightAt: () => 0 };
    const course = createPodraceCourse(flat, { branches: [], controlPoints: PODRACE_CONTROL_POINTS.map(point => ({ ...point, x: point.x * mirror })) });
    const plan = getInkstormVistaPlan(course, flat.heightAt), meshes = createInkstormVista(course, flat.heightAt);
    try {
      const mesh = meshes.find(item => item.name.includes('barriers'))!;
      const vertices = coloredVertices(mesh, '#ce8b48');
      const signs = plan.barriers.filter(item => item.sign);
      expect(signs.length).toBeGreaterThan(1);
      for (const sign of signs) {
        const origin = course.sampleAtProgress(sign.progress);
        const ahead = course.sampleAtDistance(origin.distance + 55);
        const camera = approachCamera(origin.x, origin.z, sign.yaw, sign.y + 12);
        const projectedAhead = new Vector3(origin.x + ahead.tangentX * 180, sign.y + 12, origin.z + ahead.tangentZ * 180).project(camera);
        // Read the visible arms from the merged geometry. Their low tips and high tails
        // form a directional chevron regardless of the implementation's sign metadata.
        const arrow = vertices.filter(point => Math.hypot(point.x - sign.x, point.z - sign.z) < 12);
        const tip = mean(arrow.filter(point => Math.abs(point.y - sign.y - 12) < .65)).project(camera);
        const tail = mean(arrow.filter(point => Math.abs(point.y - sign.y - 12) > 2.2)).project(camera);
        expect(Math.sign(tip.x - tail.x), sign.id).toBe(Math.sign(projectedAhead.x));
      }
      const first = signs[0]!, origin = course.sampleAtProgress(first.progress);
      const ahead = course.sampleAtDistance(origin.distance + 55);
      const projected = new Vector3(origin.x + ahead.tangentX * 180, first.y + 12, origin.z + ahead.tangentZ * 180)
        .project(approachCamera(origin.x, origin.z, first.yaw, first.y + 12));
      expect(Math.sign(projected.x)).toBe(-mirror);
    } finally { dispose(meshes); }
  });

  it('projects the actual fork triangle apex toward its actual route target using Camera.lookAt', () => {
    const plan = getInkstormVistaPlan(hero, sampleTerrainHeight), meshes = createInkstormVista(hero, sampleTerrainHeight);
    try {
      const mesh = meshes.find(item => item.name.includes('fork'))!;
      const seenDirections = new Set<number>();
      for (const sign of plan.signs) {
        const vertices = coloredVertices(mesh, sign.routeId === 'canonical' ? '#ce8b48' : '#53b8b7');
        const head = vertices.filter(point => {
          const depth = (point.x - sign.x) * Math.sin(sign.yaw) + (point.z - sign.z) * Math.cos(sign.yaw);
          return Math.hypot(point.x - sign.x, point.z - sign.z) < 9
            && Math.abs(depth + .8) < .005 && point.y > sign.y + 10 && point.y < sign.y + 22;
        });
        const unique = [...new Map(head.map(point => [point.toArray().join(','), point])).values()];
        expect(unique).toHaveLength(3);
        // The widest edge is the arrowhead's base; its opposite vertex is the rendered tip.
        const edges = [[0, 1], [1, 2], [0, 2]].sort((a, b) => unique[b[0]!]!.distanceToSquared(unique[b[1]!]!) - unique[a[0]!]!.distanceToSquared(unique[a[1]!]!));
        const base = edges[0]!, tip = unique.find((_point, i) => !base.includes(i))!.clone();
        const tail = unique[base[0]!]!.clone().add(unique[base[1]!]!).multiplyScalar(.5);
        const camera = approachCamera(sign.approach.x, sign.approach.z, sign.yaw, sign.y + 15.5);
        const projectedTarget = new Vector3(sign.target.x, sign.y + 15.5, sign.target.z).project(camera);
        const renderedDirection = Math.sign(tip.project(camera).x - tail.project(camera).x);
        expect(renderedDirection, sign.id).toBe(Math.sign(projectedTarget.x));
        seenDirections.add(renderedDirection);
      }
      expect([...seenDirections].sort()).toEqual([-1, 1]);
    } finally { dispose(meshes); }
  });
});
