import { Matrix3, NoColorSpace, SRGBColorSpace, Texture, Vector2 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CelMaterial } from '../../src/render/materials/CelMaterial';

describe('authored cel surface maps', () => {
  it('keeps all new samples and roughness damping disabled for legacy materials', () => {
    const baseColorMap = new Texture();
    for (const material of [new CelMaterial(), new CelMaterial({ baseColorMap })]) {
      expect(material.defines.USE_CEL_NORMAL_MAP).toBeUndefined();
      expect(material.defines.USE_CEL_ROUGHNESS_MAP).toBeUndefined();
      expect(material.defines.USE_CEL_ROUGHNESS).toBeUndefined();
      material.dispose();
    }
    baseColorMap.dispose();
  });

  it('binds three independent UV sets and copies automatic/manual transforms and signed normal scale', () => {
    const color = new Texture(), normal = new Texture(), roughness = new Texture();
    color.channel = 1; color.colorSpace = SRGBColorSpace;
    normal.channel = 2; normal.flipY = false;
    normal.offset.set(.1, .2); normal.repeat.set(-2, 3); normal.rotation = .7; normal.center.set(.3, .4);
    roughness.channel = 3; roughness.matrixAutoUpdate = false;
    roughness.matrix.set(1.5, .2, .3, -.1, 2, .4, 0, 0, 1);
    const originalNormalMatrix = normal.matrix.clone();
    const scale = new Vector2(.45, -.7);
    const material = new CelMaterial({ baseColorMap: color, normalMap: normal, normalScale: scale,
      roughnessMap: roughness, roughness: .8 });
    expect(material.defines).toMatchObject({
      USE_CEL_BASE_COLOR_MAP: '', CEL_BASE_COLOR_UV: 'uv1', USE_UV1: '',
      USE_CEL_NORMAL_MAP: '', CEL_NORMAL_UV: 'uv2', USE_UV2: '',
      USE_CEL_ROUGHNESS_MAP: '', USE_CEL_ROUGHNESS: '', CEL_ROUGHNESS_UV: 'uv3', USE_UV3: '',
    });
    const expected = new Matrix3().setUvTransform(.1, .2, -2, 3, .7, .3, .4);
    expect(material.uniforms.uNormalUvTransform?.value).toEqual(expected);
    expect(material.uniforms.uRoughnessUvTransform?.value).toEqual(roughness.matrix);
    expect(material.uniforms.uRoughnessUvTransform?.value).not.toBe(roughness.matrix);
    expect(material.uniforms.uNormalScale?.value).toEqual(scale);
    expect(material.uniforms.uNormalScale?.value).not.toBe(scale);
    scale.set(2, 2); roughness.matrix.identity();
    expect(material.uniforms.uNormalScale?.value.toArray()).toEqual([.45, -.7]);
    expect(material.uniforms.uRoughnessUvTransform?.value.equals(roughness.matrix)).toBe(false);
    expect(normal.matrix).toEqual(originalNormalMatrix);
    expect(normal.colorSpace).toBe(NoColorSpace);
    expect(normal.flipY).toBe(false);
    expect(material.uniforms.uNormalMap?.value).toBe(normal);
    expect(material.uniforms.uRoughnessMap?.value).toBe(roughness);
    expect(material.uniforms.uRoughness?.value).toBe(.8);
    material.dispose(); color.dispose(); normal.dispose(); roughness.dispose();
  });

  it('does not release shared data textures, including a texture used in multiple slots', () => {
    const data = new Texture();
    const dispose = vi.spyOn(data, 'dispose');
    const a = new CelMaterial({ normalMap: data, roughnessMap: data });
    const b = new CelMaterial({ normalMap: data });
    a.dispose(); b.dispose();
    expect(dispose).not.toHaveBeenCalled();
    data.dispose();
  });

  it('enables the authored tangent branch only with both a map and an explicit tangent contract', () => {
    const texture = new Texture();
    const withoutMap = new CelMaterial({ normalMapTangents: true });
    const derivative = new CelMaterial({ normalMap: texture });
    const authored = new CelMaterial({ normalMap: texture, normalMapTangents: true });
    expect(withoutMap.defines.USE_TANGENT).toBeUndefined();
    expect(derivative.defines.USE_TANGENT).toBeUndefined();
    expect(authored.defines.USE_TANGENT).toBe('');
    withoutMap.dispose(); derivative.dispose(); authored.dispose(); texture.dispose();
  });

  it.each(['normalMap', 'roughnessMap'] as const)('rejects misencoded or unsupported %s without mutating it', (key) => {
    const texture = new Texture();
    texture.colorSpace = SRGBColorSpace;
    expect(() => new CelMaterial({ [key]: texture })).toThrow('NoColorSpace');
    expect(texture.colorSpace).toBe(SRGBColorSpace);
    texture.colorSpace = NoColorSpace; texture.channel = 4;
    expect(() => new CelMaterial({ [key]: texture })).toThrow('UV channel');
    texture.dispose();
  });

  it('enables factor-only roughness without allocating a texture path and rejects NaN inputs', () => {
    const material = new CelMaterial({ roughness: .95 });
    expect(material.defines.USE_CEL_ROUGHNESS).toBe('');
    expect(material.defines.USE_CEL_ROUGHNESS_MAP).toBeUndefined();
    expect(material.uniforms.uRoughness?.value).toBe(.95);
    material.dispose();
    expect(() => new CelMaterial({ roughness: Number.NaN })).toThrow('finite');
    expect(() => new CelMaterial({ normalScale: new Vector2(1, Number.POSITIVE_INFINITY) })).toThrow('finite');
  });
});
