import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackSide, Camera, LinearMipmapLinearFilter, Mesh, RepeatWrapping, ShaderMaterial, Texture, TextureLoader, Vector3 } from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { PRIMARY_SUN_DIRECTION, SkyAtmosphere } from '../../src/render/objects/SkyAtmosphere';
import { acquireDuskSkyAssets, duskSkyAssetReceipt, duskSkyUniforms, DUSK_SKY_URL } from '../../src/render/sky/DuskSkyAssets';
import { DUSK_SKY_EXPOSURE, DUSK_SKY_FRAGMENT, DUSK_SKY_GLSL, DUSK_SKY_ROTATION, DUSK_SKY_SUN } from '../../src/render/sky/DuskSkyShader';

const cryptoModule: string = 'node:crypto', fileModule: string = 'node:fs';
const { createHash } = await import(/* @vite-ignore */ cryptoModule);
const { readFileSync } = await import(/* @vite-ignore */ fileModule);

const releases: (() => void)[] = [];
const lease = () => {
  const result = acquireDuskSkyAssets();
  releases.push(result.release);
  return result;
};
const texture = () => {
  const result = new Texture();
  vi.spyOn(result, 'dispose');
  return result;
};
afterEach(() => {
  releases.splice(0).forEach(release => release());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('approved sky retained over Production visuals', () => {
  it('preserves the approved HDR photograph bytes, exposure, rotation and solar alignment', () => {
    const hdr = readFileSync(`public${DUSK_SKY_URL}`);
    expect(hdr.length).toBe(17_385_661);
    expect(createHash('sha256').update(hdr).digest('hex')).toBe('1bebd7cbbfb5c48a642f03d93bffbabb2c42d0b109061f37a72259d1cbdb3053');
    expect(hdr.subarray(0, 1024).toString('ascii')).toContain('-Y 2048 +X 4096');
    expect(DUSK_SKY_EXPOSURE).toBe(.34);
    expect(DUSK_SKY_ROTATION).toBe(-.045377173425);
    const u = (Math.atan2(DUSK_SKY_SUN.z, DUSK_SKY_SUN.x) / (Math.PI * 2) + .5 + DUSK_SKY_ROTATION + 1) % 1;
    const v = Math.asin(DUSK_SKY_SUN.y) / Math.PI + .5;
    expect(u).toBeCloseTo(.6119384765625, 8);
    expect(v).toBeCloseTo(.525634765625, 8);
    expect(PRIMARY_SUN_DIRECTION.toArray()).toEqual(new Vector3(-.42, .76, -.5).normalize().toArray());
    expect(PRIMARY_SUN_DIRECTION.equals(DUSK_SKY_SUN)).toBe(false);
  });

  it('keeps the approved fragment math exactly, without importing its surface-lighting functions', () => {
    // These hashes were captured from checkpoint 2e0bd77 before extraction.
    // Ignore formatting and comments; pin the actual approved projection,
    // grading, tone curve, sun disc, horizon seam and final color conversion.
    const hash = (source: string) => createHash('sha256')
      .update(source.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '')).digest('hex');
    const functionBody = (name: string) => {
      const source = DUSK_SKY_GLSL.slice(DUSK_SKY_GLSL.indexOf(` ${name}(`) + 1);
      return source.slice(0, source.indexOf('\n}') + 2);
    };
    expect(hash(functionBody('duskEnvironmentUv'))).toBe('6dba44fd1243b6860efa7dbd7fe99e6e13ef974e148865e4560c501c40eac409');
    expect(hash(functionBody('duskTone'))).toBe('ec0ffe68fdcc6175b058d49a954305a7dad93dec101dae8abb05aed85e93a2ca');
    expect(hash(functionBody('duskSkyGrade'))).toBe('cec2515db9891e0eb7ea8f5d20ac3a8237339477f7fc9158cd0eaba089518aa8');
    expect(hash(DUSK_SKY_FRAGMENT.slice(DUSK_SKY_FRAGMENT.indexOf('void main()')))).toBe('699085f51c697bc5676f99ddefe51b1229a35c38b8128a3fe9c627ff00e0e732');
    expect(DUSK_SKY_FRAGMENT).not.toMatch(/duskLight|duskAtmosphere|uDuskGround|uDuskRock/);
  });

  it('makes no texture request outside a browser', async () => {
    vi.stubGlobal('document', undefined);
    const hdr = vi.spyOn(HDRLoader.prototype, 'loadAsync');
    await lease().ready;
    expect(hdr).not.toHaveBeenCalled();
    expect(duskSkyUniforms().uDuskEnvironmentReady.value).toBe(0);
  });

  it('loads only one HDR for shared owners and disposes once after the last release', async () => {
    vi.stubGlobal('document', {});
    const image = texture();
    const hdr = vi.spyOn(HDRLoader.prototype, 'loadAsync').mockResolvedValue(image as never);
    const maps = vi.spyOn(TextureLoader.prototype, 'loadAsync');
    const first = lease(), second = lease();
    await Promise.all([first.ready, second.ready]);
    expect(hdr).toHaveBeenCalledExactlyOnceWith(DUSK_SKY_URL);
    expect(maps).not.toHaveBeenCalled();
    const u = duskSkyUniforms();
    expect(u.uDuskEnvironment.value).toBe(image);
    expect(image.wrapS).toBe(RepeatWrapping);
    expect(image.generateMipmaps).toBe(true);
    expect(image.minFilter).toBe(LinearMipmapLinearFilter);
    expect(duskSkyAssetReceipt).toEqual({ loaded: [DUSK_SKY_URL], failures: [] });
    first.release(); first.release();
    expect(image.dispose).not.toHaveBeenCalled();
    second.release();
    expect(image.dispose).toHaveBeenCalledTimes(1);
    expect(u.uDuskEnvironment.value).toBeNull();
    expect(u.uDuskEnvironmentReady.value).toBe(0);
    expect(duskSkyAssetReceipt.loaded).toEqual([]);
  });

  it('disposes an obsolete download without publishing into the next app generation', async () => {
    vi.stubGlobal('document', {});
    const pending: { image: Texture; resolve: (image: Texture) => void }[] = [];
    vi.spyOn(HDRLoader.prototype, 'loadAsync').mockImplementation(() => new Promise(resolve => {
      pending.push({ image: texture(), resolve: resolve as (image: Texture) => void });
    }));
    const obsolete = lease();
    obsolete.release();
    const current = lease();
    expect(pending).toHaveLength(2);
    pending[0]!.resolve(pending[0]!.image);
    await obsolete.ready;
    expect(pending[0]!.image.dispose).toHaveBeenCalledTimes(1);
    expect(duskSkyUniforms().uDuskEnvironmentReady.value).toBe(0);
    expect(duskSkyAssetReceipt).toEqual({ loaded: [], failures: [] });
    pending[1]!.resolve(pending[1]!.image);
    await current.ready;
    expect(duskSkyUniforms().uDuskEnvironment.value).toBe(pending[1]!.image);
    expect(duskSkyAssetReceipt.loaded).toEqual([DUSK_SKY_URL]);
    current.release();
    expect(pending[1]!.image.dispose).toHaveBeenCalledTimes(1);
  });

  it('records a failed load, settles readiness for fallback, and retries for a fresh app', async () => {
    vi.stubGlobal('document', {});
    const image = texture();
    const hdr = vi.spyOn(HDRLoader.prototype, 'loadAsync')
      .mockRejectedValueOnce(new Error('Unavailable HDR')).mockResolvedValueOnce(image as never);
    const failed = lease();
    await expect(failed.ready).resolves.toBeUndefined();
    expect(duskSkyAssetReceipt).toEqual({ loaded: [], failures: [DUSK_SKY_URL] });
    expect(duskSkyUniforms().uDuskEnvironmentReady.value).toBe(0);
    failed.release();
    await lease().ready;
    expect(hdr).toHaveBeenCalledTimes(2);
    expect(duskSkyAssetReceipt).toEqual({ loaded: [DUSK_SKY_URL], failures: [] });
  });

  it('ignores a rejected obsolete request after a new app has loaded successfully', async () => {
    vi.stubGlobal('document', {});
    let rejectOld!: (error: Error) => void;
    vi.spyOn(HDRLoader.prototype, 'loadAsync')
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; }))
      .mockResolvedValueOnce(texture() as never);
    const old = lease(); old.release();
    await lease().ready;
    rejectOld(new Error('Old request failed'));
    await old.ready;
    expect(duskSkyAssetReceipt).toEqual({ loaded: [DUSK_SKY_URL], failures: [] });
    expect(duskSkyUniforms().uDuskEnvironmentReady.value).toBe(1);
  });

  it('keeps the sky centered on the camera and releases geometry, material and HDR exactly once', async () => {
    vi.stubGlobal('document', {});
    const image = texture();
    vi.spyOn(HDRLoader.prototype, 'loadAsync').mockResolvedValue(image as never);
    const sky = new SkyAtmosphere();
    releases.push(() => sky.dispose());
    const mesh = sky.children[0] as Mesh;
    const material = mesh.material as ShaderMaterial;
    const disposeGeometry = vi.spyOn(mesh.geometry, 'dispose');
    const disposeMaterial = vi.spyOn(material, 'dispose');
    await sky.ready;
    expect(material.side).toBe(BackSide);
    expect(material.depthWrite).toBe(false);
    expect(material.depthTest).toBe(false);
    expect(material.toneMapped).toBe(false);
    expect(material.uniforms.uDuskEnvironment?.value).toBe(image);
    expect(mesh.frustumCulled).toBe(false);
    const camera = new Camera(); camera.position.set(530, 60, -940);
    sky.update(0, camera);
    expect(sky.position.equals(camera.position)).toBe(true);
    sky.setRegion('sunscar-dunes');
    expect(material.fragmentShader).toBe(DUSK_SKY_FRAGMENT);
    sky.dispose(); sky.dispose();
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(image.dispose).toHaveBeenCalledTimes(1);
    expect(sky.children).toHaveLength(0);
  });
});
