import {
  Color,
  FrontSide,
  Matrix3,
  NoColorSpace,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Blending,
  type ColorRepresentation,
  type Side,
  type Texture,
} from 'three';

import {
  DEFAULT_CEL_PALETTE,
  DEFAULT_CEL_THRESHOLDS,
  DEFAULT_CEL_THRESHOLDS_THREE_BAND,
  type CelPalette,
} from './celPalette';
import { createCelRampTexture, createGraphicMatcapTexture, writeCelRampData } from './celRamp';
import { CEL_FRAGMENT_SHADER, CEL_VERTEX_SHADER } from './celShaders';
import { createInkstormShadowUniforms } from '../inkstorm/InkstormSunShadow';

interface ValueUniform<T> {
  value: T;
}

interface CelUniforms {
  [uniform: string]: ValueUniform<unknown>;
  uRamp: ValueUniform<ReturnType<typeof createCelRampTexture>>;
  uMatcap: ValueUniform<ReturnType<typeof createGraphicMatcapTexture>>;
  uLightDirection: ValueUniform<Vector3>;
  uTint: ValueUniform<Color>;
  uSpecularColor: ValueUniform<Color>;
  uRimColor: ValueUniform<Color>;
  uReflectionColor: ValueUniform<Color>;
  uEmissiveColor: ValueUniform<Color>;
  uHazeColor: ValueUniform<Color>;
  uSpecularPower: ValueUniform<number>;
  uSpecularCutoff: ValueUniform<number>;
  uSpecularStrength: ValueUniform<number>;
  uRimPower: ValueUniform<number>;
  uRimCutoff: ValueUniform<number>;
  uRimStrength: ValueUniform<number>;
  uReflectionStrength: ValueUniform<number>;
  uEmissiveStrength: ValueUniform<number>;
  uHazeNear: ValueUniform<number>;
  uHazeFar: ValueUniform<number>;
  uHazeBands: ValueUniform<number>;
  uOpacity: ValueUniform<number>;
  uWear: ValueUniform<number>;
  uBaseColorMap: ValueUniform<Texture | null>;
  uBaseColorUvTransform: ValueUniform<Matrix3>;
  uBaseColorStrength: ValueUniform<number>;
  uBaseColorSaturation: ValueUniform<number>;
  uBaseColorContrast: ValueUniform<number>;
  uNormalMap: ValueUniform<Texture | null>;
  uNormalUvTransform: ValueUniform<Matrix3>;
  uNormalScale: ValueUniform<Vector2>;
  uRoughnessMap: ValueUniform<Texture | null>;
  uRoughnessUvTransform: ValueUniform<Matrix3>;
  uRoughness: ValueUniform<number>;
}

export interface CelMaterialOptions {
  readonly name?: string;
  readonly palette?: CelPalette;
  readonly thresholds?: readonly number[];
  readonly tint?: ColorRepresentation;
  /** World-space direction from a shaded point toward the key light. */
  readonly lightDirection?: Vector3;
  readonly specularPower?: number;
  readonly specularCutoff?: number;
  readonly specularStrength?: number;
  readonly rimPower?: number;
  readonly rimCutoff?: number;
  readonly rimStrength?: number;
  readonly reflectionStrength?: number;
  readonly emissiveStrength?: number;
  readonly hazeNear?: number;
  readonly hazeFar?: number;
  readonly hazeBands?: number;
  readonly opacity?: number;
  readonly vertexColors?: boolean;
  readonly wear?: number;
  readonly side?: Side;
  readonly blending?: Blending;
  /** Borrowed, loader-configured color texture. Disposing this material never disposes it. */
  readonly baseColorMap?: Texture | null;
  readonly baseColorStrength?: number;
  readonly baseColorSaturation?: number;
  readonly baseColorContrast?: number;
  /** Borrowed linear tangent-space data; no texture mutation or ownership transfer. */
  readonly normalMap?: Texture | null;
  readonly normalScale?: Vector2;
  /** Use authored tangent.xyz/w. Enable only when every using mesh has valid tangents. */
  readonly normalMapTangents?: boolean;
  /** Borrowed linear map. Green is roughness, as in glTF's metallic-roughness texture. */
  readonly roughnessMap?: Texture | null;
  /** Optional graphic highlight damping. Omit both this and the map for legacy shading. */
  readonly roughness?: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function thresholdsFor(palette: CelPalette, requested?: readonly number[]): readonly number[] {
  if (requested) return requested;
  return palette.diffuseBands.length === 3
    ? DEFAULT_CEL_THRESHOLDS_THREE_BAND
    : DEFAULT_CEL_THRESHOLDS;
}

function textureBinding(texture: Texture | null, label: string): { uv: string; channel: number; transform: Matrix3 } {
  const channel = texture?.channel ?? 0;
  if (!Number.isInteger(channel) || channel < 0 || channel > 3) {
    throw new RangeError(`Cel ${label} textures require UV channel 0, 1, 2 or 3.`);
  }
  // GLTFLoader has already resolved KHR_texture_transform and texCoord. Copy
  // without calling updateMatrix() on a texture borrowed by another lease.
  const transform = new Matrix3();
  if (texture) {
    if (texture.matrixAutoUpdate) {
      transform.setUvTransform(texture.offset.x, texture.offset.y,
        texture.repeat.x, texture.repeat.y, texture.rotation, texture.center.x, texture.center.y);
    } else transform.copy(texture.matrix);
  }
  return { uv: channel === 0 ? 'uv' : `uv${channel}`, channel, transform };
}

/**
 * Purpose-built NPR material. It intentionally opts out of Three's PBR light
 * stack: all highlights, reflections and fog are graphic, quantized operations.
 */
export class CelMaterial extends ShaderMaterial {
  private readonly celUniforms: CelUniforms;
  private thresholds: readonly number[];
  private paletteValue: CelPalette;

  constructor(options: CelMaterialOptions = {}) {
    const baseColorMap = options.baseColorMap ?? null;
    const normalMap = options.normalMap ?? null;
    const roughnessMap = options.roughnessMap ?? null;
    const baseColorBinding = textureBinding(baseColorMap, 'base-color');
    const normalBinding = textureBinding(normalMap, 'normal');
    const roughnessBinding = textureBinding(roughnessMap, 'roughness');
    for (const [label, texture] of [['normal', normalMap], ['roughness', roughnessMap]] as const) {
      if (texture && texture.colorSpace !== NoColorSpace) {
        throw new Error(`Cel ${label} textures must use linear data (NoColorSpace).`);
      }
    }
    const normalScale = options.normalScale?.clone() ?? new Vector2(1, 1);
    if (![normalScale.x, normalScale.y, options.roughness ?? 1].every(Number.isFinite)) {
      throw new RangeError('Cel normal scale and roughness must be finite.');
    }
    const defines: Record<string, string> = {};
    for (const [kind, texture, binding] of [
      ['BASE_COLOR', baseColorMap, baseColorBinding], ['NORMAL', normalMap, normalBinding],
      ['ROUGHNESS', roughnessMap, roughnessBinding],
    ] as const) {
      if (!texture) continue;
      defines[`USE_CEL_${kind}_MAP`] = '';
      defines[`CEL_${kind}_UV`] = binding.uv;
      if (binding.channel > 0) defines[`USE_UV${binding.channel}`] = '';
    }
    if (roughnessMap || options.roughness !== undefined) defines.USE_CEL_ROUGHNESS = '';
    if (normalMap && options.normalMapTangents) defines.USE_TANGENT = '';
    const palette = options.palette ?? DEFAULT_CEL_PALETTE;
    const thresholds = thresholdsFor(palette, options.thresholds);
    const ramp = createCelRampTexture({ bands: palette.diffuseBands, thresholds });
    const matcap = createGraphicMatcapTexture();
    const opacity = clamp01(options.opacity ?? 1);
    const lightDirection = (options.lightDirection ?? new Vector3(-0.42, 0.76, -0.5)).clone().normalize();
    const uniforms: CelUniforms = {
      ...createInkstormShadowUniforms(),
      uRamp: { value: ramp },
      uMatcap: { value: matcap },
      uLightDirection: { value: lightDirection },
      uTint: { value: new Color(options.tint ?? 0xffffff) },
      uSpecularColor: { value: new Color(palette.specular) },
      uRimColor: { value: new Color(palette.rim) },
      uReflectionColor: { value: new Color(palette.reflection) },
      uEmissiveColor: { value: new Color(palette.emissive) },
      uHazeColor: { value: new Color(palette.haze) },
      uSpecularPower: { value: Math.max(1, options.specularPower ?? 32) },
      uSpecularCutoff: { value: clamp01(options.specularCutoff ?? 0.2) },
      uSpecularStrength: { value: Math.max(0, options.specularStrength ?? 0.42) },
      uRimPower: { value: Math.max(0.01, options.rimPower ?? 1.75) },
      uRimCutoff: { value: clamp01(options.rimCutoff ?? 0.52) },
      uRimStrength: { value: Math.max(0, options.rimStrength ?? 0.32) },
      uReflectionStrength: { value: Math.max(0, options.reflectionStrength ?? 0.2) },
      uEmissiveStrength: { value: Math.max(0, options.emissiveStrength ?? 0) },
      uHazeNear: { value: Math.max(0, options.hazeNear ?? 420) },
      uHazeFar: { value: Math.max(0.001, options.hazeFar ?? 1750) },
      uHazeBands: { value: Math.max(1, Math.floor(options.hazeBands ?? 5)) },
      uOpacity: { value: opacity },
      uWear: { value: options.wear ?? 0 },
      uBaseColorMap: { value: baseColorMap },
      uBaseColorUvTransform: { value: baseColorBinding.transform },
      uBaseColorStrength: { value: clamp01(options.baseColorStrength ?? 1) },
      uBaseColorSaturation: { value: Math.max(0, options.baseColorSaturation ?? 1) },
      uBaseColorContrast: { value: Math.max(0, options.baseColorContrast ?? 1) },
      uNormalMap: { value: normalMap },
      uNormalUvTransform: { value: normalBinding.transform },
      uNormalScale: { value: normalScale },
      uRoughnessMap: { value: roughnessMap },
      uRoughnessUvTransform: { value: roughnessBinding.transform },
      uRoughness: { value: clamp01(options.roughness ?? 1) },
    };

    super({
      name: options.name ?? 'CelMaterial',
      vertexShader: CEL_VERTEX_SHADER,
      fragmentShader: CEL_FRAGMENT_SHADER,
      uniforms,
      defines,
      vertexColors: options.vertexColors ?? false,
      side: options.side ?? FrontSide,
      ...(options.blending === undefined ? {} : { blending: options.blending }),
      transparent: opacity < 1,
      depthWrite: opacity >= 1,
      fog: false,
      lights: false,
      toneMapped: false,
    });

    this.celUniforms = uniforms;
    this.thresholds = thresholds;
    this.paletteValue = palette;
  }

  get palette(): CelPalette {
    return this.paletteValue;
  }

  get diffuseThresholds(): readonly number[] {
    return this.thresholds;
  }

  setPalette(palette: CelPalette, thresholds = thresholdsFor(palette)): void {
    const image = this.celUniforms.uRamp.value.image;
    if (!(image.data instanceof Uint8Array)) {
      throw new Error('Cel ramp texture data is unavailable.');
    }
    writeCelRampData(image.data, {
      bands: palette.diffuseBands,
      thresholds,
      resolution: image.width,
    });
    this.celUniforms.uRamp.value.needsUpdate = true;
    this.celUniforms.uSpecularColor.value.set(palette.specular);
    this.celUniforms.uRimColor.value.set(palette.rim);
    this.celUniforms.uReflectionColor.value.set(palette.reflection);
    this.celUniforms.uEmissiveColor.value.set(palette.emissive);
    this.celUniforms.uHazeColor.value.set(palette.haze);
    this.thresholds = thresholds;
    this.paletteValue = palette;
  }

  setLightDirection(direction: Vector3): void {
    if (direction.lengthSq() === 0) throw new RangeError('Cel light direction cannot be zero.');
    this.celUniforms.uLightDirection.value.copy(direction).normalize();
  }

  setHaze(near: number, far: number, color?: ColorRepresentation, bands = 5): void {
    if (near < 0 || far <= near) throw new RangeError('Cel haze far must be greater than near.');
    this.celUniforms.uHazeNear.value = near;
    this.celUniforms.uHazeFar.value = far;
    this.celUniforms.uHazeBands.value = Math.max(1, Math.floor(bands));
    if (color !== undefined) this.celUniforms.uHazeColor.value.set(color);
  }

  setEmissiveStrength(strength: number): void {
    this.celUniforms.uEmissiveStrength.value = Math.max(0, strength);
  }

  override dispose(): void {
    this.celUniforms.uRamp.value.dispose();
    this.celUniforms.uMatcap.value.dispose();
    super.dispose();
  }
}

export function createCelMaterial(options: CelMaterialOptions = {}): CelMaterial {
  return new CelMaterial(options);
}
