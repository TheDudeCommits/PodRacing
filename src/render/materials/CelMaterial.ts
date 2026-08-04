import {
  Color,
  FrontSide,
  ShaderMaterial,
  Vector3,
  type Blending,
  type ColorRepresentation,
  type Side,
} from 'three';

import {
  DEFAULT_CEL_PALETTE,
  DEFAULT_CEL_THRESHOLDS,
  DEFAULT_CEL_THRESHOLDS_THREE_BAND,
  type CelPalette,
} from './celPalette';
import { createCelRampTexture, createGraphicMatcapTexture, writeCelRampData } from './celRamp';
import { CEL_FRAGMENT_SHADER, CEL_VERTEX_SHADER } from './celShaders';

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
  readonly side?: Side;
  readonly blending?: Blending;
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

/**
 * Purpose-built NPR material. It intentionally opts out of Three's PBR light
 * stack: all highlights, reflections and fog are graphic, quantized operations.
 */
export class CelMaterial extends ShaderMaterial {
  private readonly celUniforms: CelUniforms;
  private thresholds: readonly number[];
  private paletteValue: CelPalette;

  constructor(options: CelMaterialOptions = {}) {
    const palette = options.palette ?? DEFAULT_CEL_PALETTE;
    const thresholds = thresholdsFor(palette, options.thresholds);
    const ramp = createCelRampTexture({ bands: palette.diffuseBands, thresholds });
    const matcap = createGraphicMatcapTexture();
    const opacity = clamp01(options.opacity ?? 1);
    const lightDirection = (options.lightDirection ?? new Vector3(-0.34, 0.82, 0.45)).clone().normalize();
    const uniforms: CelUniforms = {
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
    };

    super({
      name: options.name ?? 'CelMaterial',
      vertexShader: CEL_VERTEX_SHADER,
      fragmentShader: CEL_FRAGMENT_SHADER,
      uniforms,
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
