import {
  Color,
  NoBlending,
  ShaderMaterial,
  Vector2,
  type ColorRepresentation,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';

import { SOBEL_FRAGMENT_SHADER, SOBEL_VERTEX_SHADER } from './sobelShader';

interface ValueUniform<T> {
  value: T;
}

interface SobelUniforms {
  [uniform: string]: ValueUniform<unknown>;
  uBeauty: ValueUniform<Texture | null>;
  uNormal: ValueUniform<Texture | null>;
  uDepthMask: ValueUniform<Texture | null>;
  uPrepassTexel: ValueUniform<Vector2>;
  uLineColor: ValueUniform<Color>;
  uNormalWeight: ValueUniform<number>;
  uDepthWeight: ValueUniform<number>;
  uEdgeThreshold: ValueUniform<number>;
  uEdgeSoftness: ValueUniform<number>;
  uThickness: ValueUniform<number>;
  uOpacity: ValueUniform<number>;
  uSilhouetteDepthThreshold: ValueUniform<number>;
  uHullSilhouetteSuppression: ValueUniform<number>;
}

export interface SobelEdgeConfig {
  readonly lineColor: ColorRepresentation;
  readonly normalWeight: number;
  readonly depthWeight: number;
  readonly edgeThreshold: number;
  readonly edgeSoftness: number;
  readonly thickness: number;
  readonly opacity: number;
  readonly silhouetteDepthThreshold: number;
  /** 0 fully removes doubled post silhouettes; 1 leaves them unchanged. */
  readonly hullSilhouetteSuppression: number;
}

export const DEFAULT_SOBEL_EDGE_CONFIG: Readonly<SobelEdgeConfig> = Object.freeze({
  lineColor: '#100d1b',
  normalWeight: 1,
  depthWeight: 1.4,
  edgeThreshold: 0.115,
  edgeSoftness: 0.025,
  thickness: 1,
  opacity: 0.88,
  silhouetteDepthThreshold: 0.12,
  hullSilhouetteSuppression: 0.12,
});

function nonNegative(value: number): number {
  return Math.max(0, value);
}

function unit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export class SobelEdgePass extends Pass {
  private readonly shaderMaterial: ShaderMaterial;
  private readonly quad: FullScreenQuad;
  private readonly sobelUniforms: SobelUniforms;

  constructor(config: Partial<SobelEdgeConfig> = {}) {
    super();
    const values = { ...DEFAULT_SOBEL_EDGE_CONFIG, ...config };
    const uniforms: SobelUniforms = {
      uBeauty: { value: null },
      uNormal: { value: null },
      uDepthMask: { value: null },
      uPrepassTexel: { value: new Vector2(1, 1) },
      uLineColor: { value: new Color(values.lineColor) },
      uNormalWeight: { value: nonNegative(values.normalWeight) },
      uDepthWeight: { value: nonNegative(values.depthWeight) },
      uEdgeThreshold: { value: nonNegative(values.edgeThreshold) },
      uEdgeSoftness: { value: Math.max(0.00001, values.edgeSoftness) },
      uThickness: { value: Math.max(0.5, values.thickness) },
      uOpacity: { value: unit(values.opacity) },
      uSilhouetteDepthThreshold: { value: nonNegative(values.silhouetteDepthThreshold) },
      uHullSilhouetteSuppression: { value: unit(values.hullSilhouetteSuppression) },
    };
    this.shaderMaterial = new ShaderMaterial({
      name: 'CelSobelComposite',
      uniforms,
      vertexShader: SOBEL_VERTEX_SHADER,
      fragmentShader: SOBEL_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
      toneMapped: false,
    });
    this.sobelUniforms = uniforms;
    this.quad = new FullScreenQuad(this.shaderMaterial);
    this.needsSwap = true;
  }

  setPrepassTextures(normal: Texture, depthMask: Texture): void {
    this.sobelUniforms.uNormal.value = normal;
    this.sobelUniforms.uDepthMask.value = depthMask;
  }

  setPrepassSize(width: number, height: number): void {
    this.sobelUniforms.uPrepassTexel.value.set(
      1 / Math.max(1, width),
      1 / Math.max(1, height),
    );
  }

  setConfig(config: Partial<SobelEdgeConfig>): void {
    if (config.lineColor !== undefined) this.sobelUniforms.uLineColor.value.set(config.lineColor);
    if (config.normalWeight !== undefined) {
      this.sobelUniforms.uNormalWeight.value = nonNegative(config.normalWeight);
    }
    if (config.depthWeight !== undefined) {
      this.sobelUniforms.uDepthWeight.value = nonNegative(config.depthWeight);
    }
    if (config.edgeThreshold !== undefined) {
      this.sobelUniforms.uEdgeThreshold.value = nonNegative(config.edgeThreshold);
    }
    if (config.edgeSoftness !== undefined) {
      this.sobelUniforms.uEdgeSoftness.value = Math.max(0.00001, config.edgeSoftness);
    }
    if (config.thickness !== undefined) {
      this.sobelUniforms.uThickness.value = Math.max(0.5, config.thickness);
    }
    if (config.opacity !== undefined) this.sobelUniforms.uOpacity.value = unit(config.opacity);
    if (config.silhouetteDepthThreshold !== undefined) {
      this.sobelUniforms.uSilhouetteDepthThreshold.value = nonNegative(
        config.silhouetteDepthThreshold,
      );
    }
    if (config.hullSilhouetteSuppression !== undefined) {
      this.sobelUniforms.uHullSilhouetteSuppression.value = unit(
        config.hullSilhouetteSuppression,
      );
    }
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
    _deltaTime: number,
    _maskActive: boolean,
  ): void {
    this.sobelUniforms.uBeauty.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);
  }

  override dispose(): void {
    this.shaderMaterial.dispose();
    this.quad.dispose();
  }
}
