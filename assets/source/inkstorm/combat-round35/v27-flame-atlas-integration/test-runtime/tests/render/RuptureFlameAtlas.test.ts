import { ClampToEdgeWrapping, LinearFilter, SRGBColorSpace, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { RuptureFlameAtlas, type RuptureAtlasOptions } from '/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/v27-flame-atlas-integration/test-runtime/src/render/galactic/RuptureFlameAtlas.ts';

function loaderFixture() {
  const texture = new Texture({ width: 1254, height: 1254 } as HTMLImageElement);
  const dispose = vi.spyOn(texture, 'dispose');
  let succeed: ((value: Texture<HTMLImageElement>) => void) | undefined;
  let fail: (() => void) | undefined;
  const load = vi.fn<NonNullable<RuptureAtlasOptions['loader']>['load']>((_url, ok, _progress, error) => {
    succeed = ok; fail = () => error?.(new Error('offline')); return texture;
  });
  return { texture, dispose, load, succeed: () => succeed?.(texture), fail: () => fail?.() };
}

describe('one owned optional rupture atlas', () => {
  it('stays disabled without a boot request and copies scalar diagnostics', () => {
    const owner = new RuptureFlameAtlas();
    const d = owner.diagnostics; expect(d).toEqual({ status: 'disabled', url: null, width: 0, height: 0, frameCount: 0 });
    d.width = 99; expect(owner.diagnostics.width).toBe(0);
    expect(owner.uniforms.uRuptureAtlasReady.value).toBe(0); owner.dispose();
  });
  it('assigns the actual loaded texture before ready, uses straight sRGB/linear sampling and disposes once', () => {
    const f = loaderFixture(), owner = new RuptureFlameAtlas();
    owner.load({ url: '/test.png', loader: f }); owner.load({ url: '/ignored.png', loader: f });
    expect(f.load).toHaveBeenCalledTimes(1); expect(owner.diagnostics.status).toBe('loading');
    expect(owner.uniforms.uRuptureAtlasReady.value).toBe(0);
    f.succeed(); expect(owner.uniforms.uRuptureAtlas.value).toBe(f.texture);
    expect(owner.uniforms.uRuptureAtlasReady.value).toBe(1);
    expect(owner.diagnostics).toEqual({ status: 'ready', url: '/test.png', width: 1254, height: 1254, frameCount: 4 });
    expect(f.texture.colorSpace).toBe(SRGBColorSpace); expect(f.texture.flipY).toBe(false);
    expect(f.texture.premultiplyAlpha).toBe(false); expect(f.texture.generateMipmaps).toBe(false);
    expect(f.texture.minFilter).toBe(LinearFilter); expect(f.texture.magFilter).toBe(LinearFilter);
    expect(f.texture.wrapS).toBe(ClampToEdgeWrapping); expect(f.texture.wrapT).toBe(ClampToEdgeWrapping);
    owner.dispose(); owner.dispose(); expect(f.dispose).toHaveBeenCalledTimes(1);
    expect(owner.uniforms.uRuptureAtlas.value).toBeNull(); expect(owner.uniforms.uRuptureAtlasReady.value).toBe(0);
  });
  it('keeps the procedural fallback on network error and releases the failed handle', () => {
    const f = loaderFixture(), owner = new RuptureFlameAtlas(); owner.load({ url: '/missing.png', loader: f });
    f.fail(); expect(owner.diagnostics.status).toBe('error'); expect(owner.uniforms.uRuptureAtlasReady.value).toBe(0);
    owner.dispose(); expect(f.dispose).toHaveBeenCalledTimes(1);
  });
  it('cannot resurrect a disposed view after delayed decode or failure', () => {
    const f = loaderFixture(), owner = new RuptureFlameAtlas(); owner.load({ url: '/late.png', loader: f });
    owner.dispose(); f.succeed(); f.fail(); owner.dispose();
    expect(f.dispose).toHaveBeenCalledTimes(1); expect(owner.diagnostics.status).toBe('disposed');
    expect(owner.uniforms.uRuptureAtlas.value).toBeNull(); expect(owner.uniforms.uRuptureAtlasReady.value).toBe(0);
  });
  it('rejects unexpected decoded dimensions without exposing an atlas-ready diagnostic', () => {
    const f = loaderFixture(), owner = new RuptureFlameAtlas(); f.texture.image = { width: 1024, height: 1024 } as HTMLImageElement;
    owner.load({ url: '/wrong.png', loader: f }); f.succeed();
    expect(owner.diagnostics.status).toBe('error'); expect(f.dispose).toHaveBeenCalledTimes(1);
    expect(owner.uniforms.uRuptureAtlasReady.value).toBe(0); owner.dispose();
  });
  it('handles synchronous loader completion and thrown start failures without retaining a second texture', () => {
    const f = loaderFixture(), owner = new RuptureFlameAtlas();
    owner.load({ url: '/sync.png', loader: { load: (_url, ok) => { ok?.(f.texture); return f.texture; } } });
    expect(owner.diagnostics.status).toBe('ready'); owner.dispose(); expect(f.dispose).toHaveBeenCalledTimes(1);
    const error = new RuptureFlameAtlas(); error.load({ url: '/throws.png', loader: { load: () => { throw new Error('start'); } } });
    expect(error.diagnostics.status).toBe('error'); error.dispose();
  });
});
