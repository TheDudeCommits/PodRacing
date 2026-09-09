import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';
import { vi } from 'vitest';
import type { VehicleArtDefinition } from '../../src/render/vehicles';

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

export function source(id: string): VehicleArtDefinition {
  return { id, revision: 'test-1', url: `/test-art/${id}.glb` };
}

export function artFixture(bodyCount = 2, pilotCount = 0) {
  const root = new Group();
  const geometry = new BoxGeometry(2, 1, 4);
  const map = new Texture();
  const material = new MeshStandardMaterial({ color: '#b8a67a', map });
  const engine = new Group();
  engine.name = 'engine-left';
  engine.position.set(-3, 1, 6);
  engine.rotation.y = .3;
  root.add(engine);
  const meshes: Mesh[] = [];
  for (let i = 0; i < bodyCount + pilotCount; i += 1) {
    const mesh = new Mesh(geometry, material);
    mesh.name = i < bodyCount ? `body-${i}` : `test-pilot-${i - bodyCount}`;
    mesh.position.set(i, .2 * i, -i);
    (i === 0 ? engine : root).add(mesh);
    meshes.push(mesh);
  }
  const disposed = {
    geometry: vi.spyOn(geometry, 'dispose'),
    material: vi.spyOn(material, 'dispose'),
    map: vi.spyOn(map, 'dispose'),
  };
  return { root, geometry, map, material, engine, meshes, disposed };
}
