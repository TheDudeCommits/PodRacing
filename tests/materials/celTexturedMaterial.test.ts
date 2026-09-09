import { Matrix3, SRGBColorSpace, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CelMaterial } from '../../src/render/materials/CelMaterial';
import { createInkstormShadowUniforms } from '../../src/render/inkstorm/InkstormSunShadow';

describe('optional textured cel shading', () => {
  it('leaves the texture branch disabled for existing procedural materials', () => {
    const material = new CelMaterial();
    expect(material.defines.USE_CEL_BASE_COLOR_MAP).toBeUndefined();
    expect(material.uniforms.uBaseColorMap?.value).toBeNull();
    material.dispose();
  });

  it('borrows loader-configured color textures without mutation or disposal and preserves atlas binding', () => {
    const texture = new Texture(); texture.colorSpace = SRGBColorSpace; texture.flipY = false;
    texture.offset.set(.1, .3); texture.repeat.set(2, 3); texture.center.set(.5, .5); texture.rotation = .4;
    texture.channel = 1;
    const dispose = vi.spyOn(texture, 'dispose');
    const originalMatrix = texture.matrix.clone();
    const material = new CelMaterial({ baseColorMap: texture, baseColorSaturation: .8, baseColorContrast: 1.2 });
    expect(material.defines).toMatchObject({ USE_CEL_BASE_COLOR_MAP: '', CEL_BASE_COLOR_UV: 'uv1', USE_UV1: '' });
    expect(material.uniforms.uBaseColorUvTransform?.value).toEqual(new Matrix3().setUvTransform(.1, .3, 2, 3, .4, .5, .5));
    expect(texture.matrix).toEqual(originalMatrix);
    expect(texture.colorSpace).toBe(SRGBColorSpace);
    expect(texture.flipY).toBe(false);
    expect(material.uniforms.uBaseColorSaturation?.value).toBe(.8);
    expect(material.uniforms.uBaseColorContrast?.value).toBe(1.2);
    expect(material.fragmentShader.indexOf('texture2D(uBaseColorMap')).toBeLessThan(material.fragmentShader.indexOf('float specularLobe'));
    const atlas = createInkstormShadowUniforms();
    Object.assign(material.uniforms, atlas);
    expect(material.uniforms.uWorldShadowReady).toBe(atlas.uWorldShadowReady);
    expect(material.uniforms.uWorldShadowMatrix).toBe(atlas.uWorldShadowMatrix);
    material.dispose();
    expect(dispose).not.toHaveBeenCalled();
    texture.dispose();
  });

  it('copies manual texture matrices and rejects unsupported UV channels before creating owned ramps', () => {
    const texture = new Texture(); texture.matrixAutoUpdate = false;
    texture.matrix.set(2, 0, .5, 0, 2, .2, 0, 0, 1);
    const material = new CelMaterial({ baseColorMap: texture });
    expect(material.uniforms.uBaseColorUvTransform?.value).toEqual(texture.matrix);
    expect(material.uniforms.uBaseColorUvTransform?.value).not.toBe(texture.matrix);
    material.dispose();
    texture.channel = 4;
    expect(() => new CelMaterial({ baseColorMap: texture })).toThrow('UV channel');
    texture.dispose();
  });
});
