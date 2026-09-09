// Prepared only. Intended destination: tests/materials/celPaintedShading.test.ts.
// These CPU contracts do not establish rendered highlight quality or GPU parity.
import { Color, DataTexture, NearestFilter, NoColorSpace, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CelMaterial } from '../../src/render/materials/CelMaterial';
import { CEL_PALETTES, type CelPalette } from '../../src/render/materials/celPalette';
import * as celRamp from '../../src/render/materials/celRamp';
import { CEL_FRAGMENT_SHADER } from '../../src/render/materials/celShaders';

function bytes(texture: DataTexture): Uint8Array {
  const data = texture.image.data;
  if (!(data instanceof Uint8Array)) throw new Error('Expected byte-backed ramp.');
  return data;
}

function materialRamp(material: CelMaterial): DataTexture {
  const ramp: unknown = material.uniforms.uRamp?.value;
  if (!(ramp instanceof DataTexture)) throw new Error('Expected material ramp.');
  return ramp;
}

function rgbaRuns(runs: readonly (readonly [number, number, number, number])[]): Uint8Array {
  return Uint8Array.from(runs.flatMap(([count, r, g, b]) =>
    Array.from({ length: count }, () => [r, g, b, 255]).flat()));
}

const fourBands = ['#000000', '#ff0000', '#00ff00', '#ffffff'] as const;
const threeBands = ['#000000', '#ff0000', '#ffffff'] as const;
const invalidSoftness = [-.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

describe('optional painted ramp transitions', () => {
  it.each([
    { bands: fourBands, thresholds: [.2, .5, .8], expected: rgbaRuns([[51, 0, 0, 0], [77, 255, 0, 0], [77, 0, 255, 0], [51, 255, 255, 255]]) },
    { bands: threeBands, thresholds: [.25, .75], expected: rgbaRuns([[64, 0, 0, 0], [128, 255, 0, 0], [64, 255, 255, 255]]) },
  ])('retains every legacy center-sampled byte for $bands.length bands when omitted or zero', ({ bands, thresholds, expected }) => {
    const omitted = celRamp.createCelRampTexture({ bands, thresholds });
    const zero = celRamp.createCelRampTexture({ bands, thresholds, paintedShadingSoftness: 0 });
    expect(bytes(omitted)).toEqual(expected);
    expect(bytes(zero)).toEqual(expected);
    omitted.dispose(); zero.dispose();
  });

  it('writes centered smoothstep transitions in the existing 256 by 1 nearest-filtered texture', () => {
    const texture = celRamp.createCelRampTexture({ bands: fourBands, thresholds: [.2, .5, .8], paintedShadingSoftness: 1 });
    const data = bytes(texture);
    const rgba = (x: number) => Array.from(data.slice(x * 4, x * 4 + 4));
    expect(texture.image.width).toBe(256); expect(texture.image.height).toBe(1);
    expect(texture.minFilter).toBe(NearestFilter); expect(texture.magFilter).toBe(NearestFilter);
    expect(texture.colorSpace).toBe(NoColorSpace); expect(texture.generateMipmaps).toBe(false);
    // The middle threshold has half-width .10; these are fixed smoothstep samples.
    expect(rgba(115)).toEqual([213, 42, 0, 255]);
    expect(rgba(127)).toEqual([131, 124, 0, 255]);
    expect(rgba(128)).toEqual([124, 131, 0, 255]);
    expect(rgba(140)).toEqual([42, 213, 0, 255]);
    expect(rgba(0)).toEqual([0, 0, 0, 255]);
    expect(rgba(90)).toEqual([255, 0, 0, 255]);
    expect(rgba(165)).toEqual([0, 255, 0, 255]);
    expect(rgba(255)).toEqual([255, 255, 255, 255]);
    for (let offset = 3; offset < data.length; offset += 4) expect(data[offset]).toBe(255);
    texture.dispose();
  });

  it.each([
    { thresholds: [.02, .05], plateau: 7 },
    { thresholds: [.95, .98], plateau: 247 },
  ])('limits transition width by neighboring intervals near $thresholds', ({ thresholds, plateau }) => {
    const texture = celRamp.createCelRampTexture({ bands: threeBands, thresholds, paintedShadingSoftness: 1 });
    const data = bytes(texture);
    expect(Array.from(data.slice(plateau * 4, plateau * 4 + 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(data.slice(0, 4))).toEqual([0, 0, 0, 255]);
    expect(Array.from(data.slice(-4))).toEqual([255, 255, 255, 255]);
    texture.dispose();
  });

  it('keeps plateaus in linear color space and interpolates without channel overshoot', () => {
    const texture = celRamp.createCelRampTexture({ bands: ['#000000', '#808080', '#ffffff'], thresholds: [.25, .75], paintedShadingSoftness: .5 });
    const data = bytes(texture);
    expect(Array.from(data.slice(128 * 4, 128 * 4 + 4))).toEqual([55, 55, 55, 255]);
    for (let x = 1; x < 256; x += 1) {
      expect(data[x * 4]).toBeGreaterThanOrEqual(data[(x - 1) * 4]!);
      expect(data[x * 4 + 1]).toBe(data[x * 4]);
      expect(data[x * 4 + 2]).toBe(data[x * 4]);
    }
    expect(data[64 * 4]).toBeGreaterThan(0);
    expect(data[64 * 4]).toBeLessThan(55);
    texture.dispose();
  });

  it.each(invalidSoftness)('rejects invalid ramp softness %s before writing caller data', (paintedShadingSoftness) => {
    const config = { bands: fourBands, thresholds: [.2, .5, .8], paintedShadingSoftness };
    const target = new Uint8Array(256 * 4).fill(173);
    expect(() => celRamp.createCelRampTexture(config)).toThrow(/finite.*between 0 and 1/i);
    expect(() => celRamp.writeCelRampData(target, config)).toThrow(/finite.*between 0 and 1/i);
    expect(target.every((value) => value === 173)).toBe(true);
  });
});

describe('optional painted material contracts', () => {
  it.each([0, .4, 1, 1.5])('preserves the exact legacy shader, uniform keys and ramp with wear %s when omitted or zero', (wear) => {
    const omitted = new CelMaterial({ wear });
    const zero = new CelMaterial({ wear, paintedShadingSoftness: 0 });
    expect(omitted.fragmentShader).toBe(CEL_FRAGMENT_SHADER);
    expect(zero.fragmentShader).toBe(CEL_FRAGMENT_SHADER);
    expect(Object.keys(zero.uniforms).sort()).toEqual(Object.keys(omitted.uniforms).sort());
    expect(zero.uniforms.uPaintedShadingSoftness).toBeUndefined();
    expect(zero.defines).toEqual(omitted.defines);
    expect(bytes(materialRamp(zero))).toEqual(bytes(materialRamp(omitted)));
    for (const key of ['uWear', 'uSpecularPower', 'uSpecularCutoff', 'uSpecularStrength', 'uRimStrength', 'uReflectionStrength', 'uRoughness']) {
      expect(zero.uniforms[key]?.value).toBe(omitted.uniforms[key]?.value);
    }
    omitted.dispose(); zero.dispose();
  });

  it.each([.35, 1])('adds only the softness uniform and separate fragment path at %s, with wear still zero', (paintedShadingSoftness) => {
    const legacy = new CelMaterial({ wear: 0, specularStrength: .32, roughness: .7 });
    const painted = new CelMaterial({ wear: 0, specularStrength: .32, roughness: .7, paintedShadingSoftness });
    expect(painted.uniforms.uPaintedShadingSoftness?.value).toBe(paintedShadingSoftness);
    expect(Object.keys(painted.uniforms).filter((key) => !(key in legacy.uniforms))).toEqual(['uPaintedShadingSoftness']);
    expect(painted.defines).toEqual(legacy.defines);
    expect(painted.uniforms.uWear?.value).toBe(0);
    expect(painted.uniforms.uSpecularStrength?.value).toBe(.32);
    expect(painted.uniforms.uRoughness?.value).toBe(.7);
    expect(painted.fragmentShader).not.toBe(CEL_FRAGMENT_SHADER);
    expect(painted.fragmentShader).toContain('uPaintedShadingSoftness');
    expect(painted.fragmentShader).not.toContain('paintedRamp');
    expect(painted.fragmentShader.match(/texture2D\(uRamp\b/g)).toHaveLength(1);
    expect(bytes(materialRamp(painted))).not.toEqual(bytes(materialRamp(legacy)));
    legacy.dispose(); painted.dispose();
  });

  it('retains softness and owned ramp identity when setPalette changes band count and thresholds', () => {
    const material = new CelMaterial({ paintedShadingSoftness: .6 });
    const ramp = materialRamp(material), data = bytes(ramp), prior = data.slice();
    const version = ramp.version;
    const palette: CelPalette = { ...CEL_PALETTES.rivalTeal, diffuseBands: ['#000000', '#808080', '#ffffff'] };
    material.setPalette(palette, [.25, .75]);
    const expected = celRamp.createCelRampTexture({ bands: palette.diffuseBands, thresholds: [.25, .75], paintedShadingSoftness: .6 });
    const hard = celRamp.createCelRampTexture({ bands: palette.diffuseBands, thresholds: [.25, .75] });
    expect(materialRamp(material)).toBe(ramp); expect(bytes(ramp)).toBe(data);
    expect(ramp.version).toBeGreaterThan(version);
    expect(data).not.toEqual(prior); expect(data).toEqual(bytes(expected)); expect(data).not.toEqual(bytes(hard));
    expect(material.uniforms.uPaintedShadingSoftness?.value).toBe(.6);
    expect(material.uniforms.uSpecularColor?.value).toEqual(new Color(palette.specular));
    expect(material.palette).toBe(palette); expect(material.diffuseThresholds).toEqual([.25, .75]);
    material.dispose(); expected.dispose(); hard.dispose();
  });

  it('preserves borrowed color/roughness maps, transforms and disposal ownership with positive softness', () => {
    const color = new Texture(), roughness = new Texture();
    color.offset.set(.2, .3); color.repeat.set(2, -1); color.channel = 1;
    roughness.matrixAutoUpdate = false; roughness.matrix.set(2, 0, .1, 0, 3, .2, 0, 0, 1);
    const colorMatrix = color.matrix.clone(), roughnessMatrix = roughness.matrix.clone();
    const colorDispose = vi.spyOn(color, 'dispose'), roughnessDispose = vi.spyOn(roughness, 'dispose');
    const options = { baseColorMap: color, baseColorStrength: .86, roughnessMap: roughness, roughness: .7, wear: 0 };
    const legacy = new CelMaterial(options), painted = new CelMaterial({ ...options, paintedShadingSoftness: .8 });
    expect(painted.uniforms.uBaseColorMap?.value).toBe(color); expect(painted.uniforms.uRoughnessMap?.value).toBe(roughness);
    expect(painted.uniforms.uBaseColorUvTransform?.value).toEqual(legacy.uniforms.uBaseColorUvTransform?.value);
    expect(painted.uniforms.uRoughnessUvTransform?.value).toEqual(roughnessMatrix);
    expect(painted.uniforms.uBaseColorStrength?.value).toBe(.86); expect(painted.uniforms.uRoughness?.value).toBe(.7);
    expect(color.matrix).toEqual(colorMatrix); expect(roughness.matrix).toEqual(roughnessMatrix);
    expect(painted.defines).toEqual(legacy.defines);
    legacy.dispose(); painted.dispose();
    expect(colorDispose).not.toHaveBeenCalled(); expect(roughnessDispose).not.toHaveBeenCalled();
    color.dispose(); roughness.dispose();
  });

  it('rejects invalid material softness before allocating owned lookup textures', () => {
    const ramp = vi.spyOn(celRamp, 'createCelRampTexture');
    const matcap = vi.spyOn(celRamp, 'createGraphicMatcapTexture');
    try {
      for (const paintedShadingSoftness of invalidSoftness) {
        expect(() => new CelMaterial({ paintedShadingSoftness })).toThrow(/finite.*between 0 and 1/i);
      }
      expect(ramp).not.toHaveBeenCalled(); expect(matcap).not.toHaveBeenCalled();
    } finally {
      ramp.mockRestore(); matcap.mockRestore();
    }
  });
});
