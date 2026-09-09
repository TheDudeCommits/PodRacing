import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Texture, TextureLoader } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { getInkstormLayout, getInkstormObstacleContact } from '../../src/game/race/inkstormLayout';
import { INKSTORM_SERVICE_GANTRY, inkstormRenderFamily } from '../../src/render/inkstorm/InkstormGantryAppearance';
import { InkstormWorld } from '../../src/render/inkstorm/InkstormWorld';

afterEach(() => vi.restoreAllMocks());
const flat = { heightAt: () => 0 };

describe('industrial equipment on the existing physical gantry', () => {
  it.each([0x494e4b53, 0x43414e59, 0x464f554e, 1234])('retains grid lamps and both solid industrial feet for seed %s', seed => {
    const course = createProceduralPodraceCourse(flat, seed);
    const gantries = getInkstormLayout(course).filter(p => p.family === 'foundry-gantry');
    expect(gantries).toHaveLength(2);
    const grid = gantries.find(p => p.progress === .012)!;
    const industrial = gantries.find(p => p !== grid)!;
    expect(inkstormRenderFamily(grid)).toBe('foundry-gantry');
    expect(inkstormRenderFamily(industrial)).toBe(INKSTORM_SERVICE_GANTRY);
    for (const p of gantries) for (const side of [-1, 1]) {
      const x = p.x + Math.cos(p.yaw) * 46 * p.sx * side;
      const z = p.z - Math.sin(p.yaw) * 46 * p.sx * side;
      const hit = getInkstormObstacleContact(course, x, z, 2, 2, flat.heightAt);
      expect(hit?.id).toBe(`${p.id}-${side}`);
      expect(hit?.penetration).toBeGreaterThan(0);
    }
  });

  it('uploads separate equipment batches and includes both in static shadow ownership', async () => {
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => {
      const scene = new Group(), geometry = new BoxGeometry(104, 86, 14);
      geometry.setAttribute('uv1', geometry.getAttribute('uv').clone());
      scene.add(new Mesh(geometry, new MeshBasicMaterial()));
      return { scene, scenes: [scene], animations: [], cameras: [], asset: { version: '2.0' }, userData: {} } as unknown as GLTF;
    });
    vi.spyOn(TextureLoader.prototype, 'loadAsync').mockResolvedValue(new Texture());
    const world = new InkstormWorld(flat.heightAt);
    try {
      await world.ready;
      const course = createProceduralPodraceCourse(flat, 0x494e4b53);
      world.setCourse(course);
      const grid = world.children.find(o => o.name === 'Inkstorm / foundry-gantry') as InstancedMesh;
      const service = world.children.find(o => o.name === `Inkstorm / ${INKSTORM_SERVICE_GANTRY}`) as InstancedMesh;
      expect(grid.count).toBe(1); expect(service.count).toBe(1);
      const placement = getInkstormLayout(course).find(p => inkstormRenderFamily(p) === INKSTORM_SERVICE_GANTRY)!;
      const transform = new Matrix4(); service.getMatrixAt(0, transform);
      expect(transform.elements[12]).toBeCloseTo(placement.x, 2);
      expect(transform.elements[13]).toBe(-1.5);
      expect(transform.elements[14]).toBeCloseTo(placement.z, 2);
      const shadows = world.createShadowCasters();
      for (const source of [grid, service]) {
        const owned = shadows.children.find(o => o instanceof InstancedMesh && o.geometry === source.geometry) as InstancedMesh;
        expect(owned.count).toBe(1); expect(owned.material).toBe(source.material);
      }
      for (const child of shadows.children) if (child instanceof InstancedMesh) child.dispose();
    } finally { world.dispose(); }
  });
});
