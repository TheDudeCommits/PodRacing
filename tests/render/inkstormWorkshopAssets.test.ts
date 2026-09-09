import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, SRGBColorSpace, Texture, TextureLoader } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { InkstormWorld } from '../../src/render/inkstorm/InkstormWorld';
import type { InkstormSurfaceMaterial } from '../../src/render/inkstorm/InkstormSurfaceMaterial';

function model(withUv = true): GLTF {
  const scene = new Group(), geometry = new BoxGeometry();
  if (withUv) geometry.setAttribute('uv1', geometry.getAttribute('uv').clone());
  scene.add(new Mesh(geometry, new MeshBasicMaterial()));
  return { scene, scenes: [scene], animations: [], cameras: [], asset: { version: '2.0' }, userData: {} } as unknown as GLTF;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
afterEach(() => vi.restoreAllMocks());

describe('paired workshop atlas ownership', () => {
  it('keeps UV1 through the real clone/merge path and binds only the pit family', async () => {
    const loader = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => model());
    const texture = new Texture<HTMLImageElement>(), released = vi.spyOn(texture, 'dispose');
    vi.spyOn(TextureLoader.prototype, 'loadAsync').mockResolvedValue(texture);
    const world = new InkstormWorld(() => 0);
    try {
      await world.ready;
      expect(world.loaded).toBe(true); expect(world.error).toBeNull();
      expect(loader.mock.calls.some(([url]) => url.endsWith('/pit-complex-light-v1.glb'))).toBe(true);
      const pit = world.children.find(c => c.name === 'Inkstorm / pit-complex') as InstancedMesh;
      const district = world.children.find(c => c.name === 'Inkstorm / pit-district') as InstancedMesh;
      expect(pit.geometry.getAttribute('uv1').array).toEqual(pit.geometry.getAttribute('uv').array);
      const material = pit.material as InkstormSurfaceMaterial;
      expect(material.uniforms.uWorkshopBake!.value).toBe(texture);
      expect(material.defines.INKSTORM_WORKSHOP_BAKE).toBe(1);
      expect((district.material as InkstormSurfaceMaterial).defines.INKSTORM_WORKSHOP_BAKE).toBeUndefined();
      expect(texture.colorSpace).toBe(SRGBColorSpace); expect(texture.flipY).toBe(false);
      expect(released).not.toHaveBeenCalled();
    } finally { world.dispose(); }
    expect(released).toHaveBeenCalledTimes(1);
  });

  it('releases every late model and atlas if disposed during loading', async () => {
    const pending = deferred<Texture<HTMLImageElement>>(), texture = new Texture<HTMLImageElement>(), released = vi.spyOn(texture, 'dispose');
    const releases: ReturnType<typeof vi.fn>[] = [];
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => {
      const result = model(); result.scene.traverse(o => {
        if (o instanceof Mesh) { const listener = vi.fn(); o.geometry.addEventListener('dispose', listener); releases.push(listener); }
      }); return result;
    });
    const textureLoader = vi.spyOn(TextureLoader.prototype, 'loadAsync').mockReturnValue(pending.promise);
    const world = new InkstormWorld(() => 0);
    await vi.waitFor(() => expect(textureLoader).toHaveBeenCalled());
    world.dispose(); pending.resolve(texture); await world.ready;
    expect(world.loaded).toBe(false); expect(world.children).toHaveLength(0);
    expect(releases.length).toBeGreaterThan(10);
    for (const release of releases) expect(release).toHaveBeenCalledTimes(1);
    expect(released).toHaveBeenCalledTimes(1); expect(world.error).toBeNull();
  });

  it.each(['missing-map', 'missing-uv'] as const)('fails the pair and releases resources for %s', async failure => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const releases: ReturnType<typeof vi.fn>[] = [], texture = new Texture<HTMLImageElement>(), released = vi.spyOn(texture, 'dispose');
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async url => {
      const result = model(!(failure === 'missing-uv' && url.endsWith('/pit-complex-light-v1.glb')));
      result.scene.traverse(o => { if (o instanceof Mesh) { const listener = vi.fn(); o.geometry.addEventListener('dispose', listener); releases.push(listener); } });
      return result;
    });
    const textureLoader = vi.spyOn(TextureLoader.prototype, 'loadAsync');
    if (failure === 'missing-map') textureLoader.mockRejectedValue(new Error('atlas unavailable'));
    else textureLoader.mockResolvedValue(texture);
    const world = new InkstormWorld(() => 0);
    await world.ready;
    expect(world.loaded).toBe(false); expect(world.error).toContain(failure === 'missing-map' ? 'atlas unavailable' : 'paired uv1');
    expect(world.children).toHaveLength(0);
    for (const release of releases) expect(release).toHaveBeenCalledTimes(1);
    expect(released).toHaveBeenCalledTimes(failure === 'missing-map' ? 0 : 1);
    world.dispose();
  });
});
