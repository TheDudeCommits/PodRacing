import {
  AdditiveBlending,
  DepthTexture,
  FloatType,
  HalfFloatType,
  LinearFilter,
  Matrix4,
  Mesh,
  NearestFilter,
  NoBlending,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

import { CelPrepassMaterial } from './CelPrepassMaterial';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import {
  SobelEdgePass,
  type SobelEdgeConfig,
} from './SobelEdgePass';
import {
  BLOOM_DOWNSAMPLE_FRAGMENT,
  BLOOM_UPSAMPLE_FRAGMENT,
  FULLSCREEN_VERTEX,
  GRADE_FRAGMENT,
  RAYS_BLUR_FRAGMENT,
  RAYS_SOURCE_FRAGMENT,
} from './cinematicShaders';
import {
  applyCinematicLook,
  createCinematicFrame,
  createCinematicLook,
  type CinematicFrame,
  type CinematicLook,
} from './CinematicLook';
import { SKY_SUN } from '../lighting/WorldLight';
import type { RacingBiomeId } from '../../game/race/racingBiomes';

export type CelPostMode = 'mrt-sobel' | 'direct';

export interface CelPostPipelineOptions {
  readonly enabled?: boolean;
  /** Adaptive range is clamped to 0.65–1.0 to prevent illegible line breakup. */
  readonly prepassScale?: number;
  readonly edges?: Partial<SobelEdgeConfig>;
}

export interface CelPostPipelineConfig {
  readonly enabled?: boolean;
  readonly prepassScale?: number;
  readonly edges?: Partial<SobelEdgeConfig>;
}

interface CustomPrepassRegistration {
  readonly mesh: Mesh;
  readonly material: CelPrepassMaterial;
  wasVisible: boolean;
}

const BLOOM_LEVELS = 6;

function clampPrepassScale(scale: number): number {
  return Math.min(1, Math.max(0.65, scale));
}

function mrtSupportFailure(renderer: WebGLRenderer): string | null {
  if (!renderer.capabilities.isWebGL2) return 'WebGL2 is unavailable.';
  try {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const drawBuffers = gl.getParameter(gl.MAX_DRAW_BUFFERS) as number;
    return drawBuffers >= 2 ? null : 'The GPU exposes fewer than two MRT draw buffers.';
  } catch (error) {
    return error instanceof Error ? error.message : 'Unable to query MRT support.';
  }
}

function hdrTarget(name: string, filter = LinearFilter): WebGLRenderTarget {
  const target = new WebGLRenderTarget(1, 1, {
    format: RGBAFormat, type: HalfFloatType, minFilter: filter, magFilter: filter,
    depthBuffer: false, stencilBuffer: false, generateMipmaps: false, samples: 0,
  });
  target.texture.name = name;
  return target;
}

function passMaterial(name: string, fragmentShader: string, uniforms: Record<string, { value: unknown }>,
  additive = false): ShaderMaterial {
  return new ShaderMaterial({
    name, uniforms, vertexShader: FULLSCREEN_VERTEX, fragmentShader,
    depthTest: false, depthWrite: false, toneMapped: false,
    blending: additive ? AdditiveBlending : NoBlending, transparent: additive,
  });
}

/**
 * Owns the render graph: MRT prepass (normals + linear depth for ink lines),
 * HDR beauty with a depth texture, Sobel ink composite, a physically based
 * bloom mip chain, depth-masked god rays, and a cinematic grade (height fog,
 * PBR Neutral tone mapping, display grade, lens effects) finished with FXAA.
 * It falls back to a direct scene render if setup or a render-time operation fails.
 */
export class CelPostPipeline {
  private readonly renderer: WebGLRenderer;
  private sceneValue: Scene;
  private cameraValue: Camera;
  private edgePass: SobelEdgePass | null = null;
  private prepassTarget: WebGLRenderTarget | null = null;
  private prepassMaterial: CelPrepassMaterial | null = null;
  private sceneTarget: WebGLRenderTarget | null = null;
  private edgeTarget: WebGLRenderTarget | null = null;
  private gradeTarget: WebGLRenderTarget | null = null;
  private readonly bloomTargets: WebGLRenderTarget[] = [];
  private raysSourceTarget: WebGLRenderTarget | null = null;
  private raysTarget: WebGLRenderTarget | null = null;
  private readonly materials: ShaderMaterial[] = [];
  private downsampleMaterial: ShaderMaterial | null = null;
  private upsampleMaterial: ShaderMaterial | null = null;
  private raysSourceMaterial: ShaderMaterial | null = null;
  private raysBlurMaterial: ShaderMaterial | null = null;
  private gradeMaterial: ShaderMaterial | null = null;
  private fxaaMaterial: ShaderMaterial | null = null;
  private quad: FullScreenQuad | null = null;
  private readonly customPrepasses: CustomPrepassRegistration[] = [];
  private readonly customPrepassIds = new Set<number>();
  private readonly hiddenForPrepass: Mesh[] = [];
  private enabledValue: boolean;
  private prepassScaleValue: number;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private disposed = false;
  private failureReasonValue: string | null = null;
  private qualityLevel = 0;
  private readonly normalClear = new Float32Array([0.5, 0.5, 1, 0]);
  private readonly depthClear = new Float32Array([1, 1, 1, 0]);
  private readonly sunProbe = new Vector3();
  private readonly cameraForward = new Vector3();
  private readonly sunUv = new Vector2(0.5, 0.5);
  /** Art-directed response for the current world; mutate or call setBiome. */
  readonly look: CinematicLook = createCinematicLook('desert');
  /** Gameplay-driven lens response for this frame. */
  readonly frame: CinematicFrame = createCinematicFrame();

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    options: CelPostPipelineOptions = {},
  ) {
    this.renderer = renderer;
    this.sceneValue = scene;
    this.cameraValue = camera;
    this.enabledValue = options.enabled ?? true;
    this.prepassScaleValue = clampPrepassScale(options.prepassScale ?? 0.78);

    const supportFailure = mrtSupportFailure(renderer);
    if (supportFailure) {
      this.failureReasonValue = supportFailure;
      return;
    }

    try {
      const sceneTarget = new WebGLRenderTarget(1, 1, {
        format: RGBAFormat, type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter,
        depthBuffer: true, stencilBuffer: false, generateMipmaps: false, samples: 0,
      });
      sceneTarget.texture.name = 'cinematic-hdr-beauty';
      sceneTarget.depthTexture = new DepthTexture(1, 1, FloatType);
      this.sceneTarget = sceneTarget;
      this.edgeTarget = hdrTarget('cinematic-hdr-ink');
      const gradeTarget = new WebGLRenderTarget(1, 1, {
        format: RGBAFormat, type: UnsignedByteType, minFilter: LinearFilter, magFilter: LinearFilter,
        depthBuffer: false, stencilBuffer: false, generateMipmaps: false, samples: 0,
      });
      gradeTarget.texture.name = 'cinematic-display-graded';
      this.gradeTarget = gradeTarget;
      for (let level = 0; level < BLOOM_LEVELS; level++) this.bloomTargets.push(hdrTarget(`cinematic-bloom-${level}`));
      this.raysSourceTarget = hdrTarget('cinematic-rays-source');
      this.raysTarget = hdrTarget('cinematic-rays');

      this.downsampleMaterial = passMaterial('CinematicBloomDownsample', BLOOM_DOWNSAMPLE_FRAGMENT, {
        tSource: { value: null }, uTexel: { value: new Vector2() }, uPrefilter: { value: 0 },
        uThreshold: { value: new Vector4() },
      });
      this.upsampleMaterial = passMaterial('CinematicBloomUpsample', BLOOM_UPSAMPLE_FRAGMENT, {
        tSource: { value: null }, uTexel: { value: new Vector2() }, uRadius: { value: 1 }, uWeight: { value: 1 },
      }, true);
      this.raysSourceMaterial = passMaterial('CinematicRaysSource', RAYS_SOURCE_FRAGMENT, {
        tColor: { value: null }, tDepth: { value: null }, uSunUv: { value: this.sunUv },
        uAspect: { value: 1 }, uSunSpread: { value: .08 }, uThreshold: { value: .6 },
      });
      this.raysBlurMaterial = passMaterial('CinematicRaysBlur', RAYS_BLUR_FRAGMENT, {
        tSource: { value: null }, uSunUv: { value: this.sunUv }, uDensity: { value: .9 },
        uDecay: { value: .96 }, uWeight: { value: .05 }, uJitter: { value: 0 },
      });
      this.gradeMaterial = passMaterial('CinematicGrade', GRADE_FRAGMENT, {
        tColor: { value: null }, tBloom: { value: null }, tRays: { value: null }, tDepth: { value: null },
        uHasBloom: { value: 1 }, uHasRays: { value: 0 },
        uProjectionInverse: { value: new Matrix4() }, uCameraWorld: { value: new Matrix4() },
        uCameraPosition: { value: new Vector3() }, uSunDirection: { value: SKY_SUN.value },
        uSunColor: { value: this.look.sunColor }, uFogColor: { value: this.look.fogColor },
        uFogSunColor: { value: this.look.fogSunColor }, uFogDensity: { value: 0 }, uFogFalloff: { value: 0 },
        uFogBase: { value: 0 }, uFogMax: { value: 0 }, uFogStart: { value: 0 },
        uBloomStrength: { value: 0 }, uRaysStrength: { value: 0 }, uExposure: { value: 1 },
        uLift: { value: this.look.lift }, uGamma: { value: this.look.gamma }, uGain: { value: this.look.gain },
        uSaturation: { value: 1 }, uContrast: { value: 1 },
        uShadowTint: { value: this.look.shadowTint }, uHighlightTint: { value: this.look.highlightTint },
        uSplitTone: { value: 0 }, uVignette: { value: 0 }, uVignetteColor: { value: this.look.vignetteColor },
        uGrain: { value: 0 }, uTime: { value: 0 }, uSpeedBlur: { value: 0 }, uChromatic: { value: 0 },
        uBlurCenter: { value: new Vector2(.5, .56) }, uAspect: { value: 1 },
        uFlash: { value: 0 }, uFlashColor: { value: this.frame.flashColor },
      });
      this.fxaaMaterial = new ShaderMaterial({
        name: 'CinematicFXAA',
        uniforms: { tDiffuse: { value: null }, resolution: { value: new Vector2(1, 1) } },
        vertexShader: FXAAShader.vertexShader, fragmentShader: FXAAShader.fragmentShader,
        depthTest: false, depthWrite: false, toneMapped: false, blending: NoBlending,
      });
      this.materials.push(this.downsampleMaterial, this.upsampleMaterial, this.raysSourceMaterial,
        this.raysBlurMaterial, this.gradeMaterial, this.fxaaMaterial);
      this.quad = new FullScreenQuad(this.gradeMaterial);

      const edgePass = new SobelEdgePass(options.edges);
      edgePass.renderToScreen = false;
      this.edgePass = edgePass;

      const prepassTarget = new WebGLRenderTarget(1, 1, {
        count: 2,
        format: RGBAFormat,
        type: UnsignedByteType,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        generateMipmaps: false,
        depthBuffer: true,
        stencilBuffer: false,
        samples: 0,
      });
      this.prepassTarget = prepassTarget;
      const normalTexture = prepassTarget.textures[0];
      const depthMaskTexture = prepassTarget.textures[1];
      if (!normalTexture || !depthMaskTexture) throw new Error('Three.js did not allocate two MRT textures.');
      normalTexture.name = 'cel-prepass-view-normal';
      depthMaskTexture.name = 'cel-prepass-linear-depth-hull-mask';
      normalTexture.minFilter = NearestFilter;
      normalTexture.magFilter = NearestFilter;
      depthMaskTexture.minFilter = NearestFilter;
      depthMaskTexture.magFilter = NearestFilter;
      edgePass.setPrepassTextures(normalTexture, depthMaskTexture);

      const prepassMaterial = new CelPrepassMaterial();
      prepassMaterial.setExclusionPredicate((object) => this.customPrepassIds.has(object.id));
      this.prepassMaterial = prepassMaterial;

      const size = renderer.getSize(new Vector2());
      this.resize(size.x, size.y, renderer.getPixelRatio());
      if (!this.validateFramebuffer()) {
        this.degrade('The normal/depth MRT framebuffer is incomplete.');
      }
    } catch (error) {
      this.degrade(error instanceof Error ? error.message : 'Cel post initialization failed.');
    }
  }

  get mode(): CelPostMode {
    return this.sceneTarget && this.prepassTarget && this.prepassMaterial ? 'mrt-sobel' : 'direct';
  }

  get enabled(): boolean {
    return this.enabledValue;
  }

  get available(): boolean {
    return this.mode === 'mrt-sobel';
  }

  get failureReason(): string | null {
    return this.failureReasonValue;
  }

  setEnabled(enabled: boolean): void {
    this.enabledValue = enabled;
  }

  setScene(scene: Scene): void {
    this.sceneValue = scene;
  }

  setCamera(camera: Camera): void {
    this.cameraValue = camera;
  }

  setConfig(config: CelPostPipelineConfig): void {
    if (config.enabled !== undefined) this.setEnabled(config.enabled);
    if (config.prepassScale !== undefined) this.setPrepassScale(config.prepassScale);
    if (config.edges) this.edgePass?.setConfig(config.edges);
  }

  setPrepassScale(scale: number): void {
    this.prepassScaleValue = clampPrepassScale(scale);
    this.resizePrepass();
  }

  /** Performance governor level: higher levels drop rays first, then half the bloom chain. */
  setQualityLevel(level: number): void {
    this.qualityLevel = Math.max(0, Math.floor(level));
  }

  /** Swap to a world's art-directed look without reallocating uniforms. */
  setBiome(biome: RacingBiomeId): void {
    applyCinematicLook(this.look, biome);
  }

  /**
   * Registers a displacement-aware MRT material for one mesh. The generic pass
   * discards that mesh, then renders this material into the same attachments.
   */
  registerCustomPrepass(mesh: Mesh, material: CelPrepassMaterial): () => void {
    if (this.customPrepassIds.has(mesh.id)) {
      throw new Error(`Mesh "${mesh.name || mesh.uuid}" already has a custom cel prepass.`);
    }
    const registration = { mesh, material, wasVisible: false };
    this.customPrepasses.push(registration);
    this.customPrepassIds.add(mesh.id);
    let registered = true;
    return () => {
      if (!registered) return;
      registered = false;
      this.customPrepassIds.delete(mesh.id);
      const index = this.customPrepasses.indexOf(registration);
      if (index >= 0) this.customPrepasses.splice(index, 1);
    };
  }

  resize(width: number, height: number, pixelRatio = this.renderer.getPixelRatio()): void {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.pixelRatio = Math.max(0.25, pixelRatio);
    const w = Math.max(1, Math.floor(this.width * this.pixelRatio));
    const h = Math.max(1, Math.floor(this.height * this.pixelRatio));
    this.sceneTarget?.setSize(w, h);
    this.edgeTarget?.setSize(w, h);
    this.gradeTarget?.setSize(w, h);
    let bw = w, bh = h;
    for (const target of this.bloomTargets) {
      bw = Math.max(1, Math.floor(bw / 2)); bh = Math.max(1, Math.floor(bh / 2));
      target.setSize(bw, bh);
    }
    this.raysSourceTarget?.setSize(Math.max(1, Math.floor(w / 3)), Math.max(1, Math.floor(h / 3)));
    this.raysTarget?.setSize(Math.max(1, Math.floor(w / 3)), Math.max(1, Math.floor(h / 3)));
    (this.fxaaMaterial?.uniforms.resolution?.value as Vector2 | undefined)?.set(1 / w, 1 / h);
    this.resizePrepass();
  }

  render(deltaTime = 0): void {
    if (this.disposed) throw new Error('Cannot render a disposed CelPostPipeline.');
    if (!this.enabledValue || !this.sceneTarget || !this.prepassTarget || !this.prepassMaterial) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.sceneValue, this.cameraValue);
      return;
    }

    try {
      this.renderPrepass();
      this.renderer.setRenderTarget(this.sceneTarget);
      this.renderer.clear();
      this.renderer.render(this.sceneValue, this.cameraValue);
      this.edgePass!.setCamera(this.cameraValue);
      this.edgePass!.render(this.renderer, this.edgeTarget!, this.sceneTarget, deltaTime, false);
      const bloom = this.renderBloom();
      const rays = this.renderRays();
      this.renderGrade(bloom, rays);
      this.quad!.material = this.fxaaMaterial!;
      this.fxaaMaterial!.uniforms.tDiffuse!.value = this.gradeTarget!.texture;
      this.renderer.setRenderTarget(null);
      this.quad!.render(this.renderer);
    } catch (error) {
      this.degrade(error instanceof Error ? error.message : 'Cel post rendering failed.');
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.sceneValue, this.cameraValue);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.releasePostResources();
    this.customPrepasses.length = 0;
    this.customPrepassIds.clear();
  }

  private renderBloom(): Texture | null {
    if (this.qualityLevel >= 9 || this.look.bloomStrength <= 0) return null;
    const quad = this.quad!, down = this.downsampleMaterial!, up = this.upsampleMaterial!;
    const levels = this.qualityLevel >= 6 ? 4 : BLOOM_LEVELS;
    const knee = Math.max(1e-4, this.look.bloomThreshold * this.look.bloomKnee);
    (down.uniforms.uThreshold!.value as Vector4).set(this.look.bloomThreshold, knee, knee * 2, .25 / knee);
    let source: Texture = this.edgeTarget!.texture;
    let sourceWidth = this.edgeTarget!.width, sourceHeight = this.edgeTarget!.height;
    quad.material = down;
    for (let level = 0; level < levels; level++) {
      const target = this.bloomTargets[level]!;
      down.uniforms.tSource!.value = source;
      (down.uniforms.uTexel!.value as Vector2).set(1 / sourceWidth, 1 / sourceHeight);
      down.uniforms.uPrefilter!.value = level === 0 ? 1 : 0;
      this.renderer.setRenderTarget(target);
      quad.render(this.renderer);
      source = target.texture; sourceWidth = target.width; sourceHeight = target.height;
    }
    quad.material = up;
    up.uniforms.uRadius!.value = this.look.bloomRadius;
    // Upsamples accumulate onto the already-downsampled mip below them.
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    try {
      for (let level = levels - 1; level > 0; level--) {
        const from = this.bloomTargets[level]!, to = this.bloomTargets[level - 1]!;
        up.uniforms.tSource!.value = from.texture;
        (up.uniforms.uTexel!.value as Vector2).set(1 / from.width, 1 / from.height);
        up.uniforms.uWeight!.value = 1;
        this.renderer.setRenderTarget(to);
        quad.render(this.renderer);
      }
    } finally {
      this.renderer.autoClear = autoClear;
    }
    return this.bloomTargets[0]!.texture;
  }

  private renderRays(): { texture: Texture; strength: number } | null {
    if (this.qualityLevel >= 5 || this.look.raysStrength <= 0) return null;
    const camera = this.cameraValue as PerspectiveCamera;
    if (!(camera as { isPerspectiveCamera?: boolean }).isPerspectiveCamera) return null;
    camera.getWorldDirection(this.cameraForward);
    const facing = this.cameraForward.dot(SKY_SUN.value);
    if (facing <= 0.05) return null;
    this.sunProbe.copy(camera.position).addScaledVector(SKY_SUN.value, 1000).project(camera);
    this.sunUv.set(this.sunProbe.x * .5 + .5, this.sunProbe.y * .5 + .5);
    const offscreen = Math.max(0, Math.abs(this.sunUv.x - .5) - .5, Math.abs(this.sunUv.y - .5) - .5);
    const visibility = Math.min(1, Math.max(0, (facing - .05) / .3)) * Math.max(0, 1 - offscreen / .45);
    if (visibility <= 0.01) return null;
    const quad = this.quad!;
    const source = this.raysSourceMaterial!, blur = this.raysBlurMaterial!;
    source.uniforms.tColor!.value = this.edgeTarget!.texture;
    source.uniforms.tDepth!.value = this.sceneTarget!.depthTexture;
    source.uniforms.uAspect!.value = this.width / Math.max(1, this.height);
    source.uniforms.uSunSpread!.value = this.look.raysSpread;
    source.uniforms.uThreshold!.value = this.look.raysThreshold;
    quad.material = source;
    this.renderer.setRenderTarget(this.raysSourceTarget);
    quad.render(this.renderer);
    blur.uniforms.tSource!.value = this.raysSourceTarget!.texture;
    blur.uniforms.uDensity!.value = this.look.raysDensity;
    blur.uniforms.uDecay!.value = this.look.raysDecay;
    blur.uniforms.uWeight!.value = 1 / 16;
    blur.uniforms.uJitter!.value = (this.frame.time * 60) % 97;
    quad.material = blur;
    this.renderer.setRenderTarget(this.raysTarget);
    quad.render(this.renderer);
    return { texture: this.raysTarget!.texture, strength: this.look.raysStrength * visibility };
  }

  private renderGrade(bloom: Texture | null, rays: { texture: Texture; strength: number } | null): void {
    const material = this.gradeMaterial!, u = material.uniforms, look = this.look, frame = this.frame;
    const camera = this.cameraValue;
    camera.updateMatrixWorld();
    u.tColor!.value = this.edgeTarget!.texture;
    u.tDepth!.value = this.sceneTarget!.depthTexture;
    u.tBloom!.value = bloom;
    u.uHasBloom!.value = bloom ? 1 : 0;
    u.tRays!.value = rays?.texture ?? null;
    u.uHasRays!.value = rays ? 1 : 0;
    u.uRaysStrength!.value = rays?.strength ?? 0;
    (u.uProjectionInverse!.value as Matrix4).copy(camera.projectionMatrixInverse);
    (u.uCameraWorld!.value as Matrix4).copy(camera.matrixWorld);
    (u.uCameraPosition!.value as Vector3).setFromMatrixPosition(camera.matrixWorld);
    u.uSunDirection!.value = SKY_SUN.value;
    const visibility = Math.min(1, Math.max(.12, frame.visibility));
    u.uFogDensity!.value = look.fogDensity / visibility;
    u.uFogFalloff!.value = look.fogFalloff;
    u.uFogBase!.value = look.fogBase;
    u.uFogMax!.value = Math.min(.96, look.fogMax + (1 - visibility) * .5);
    u.uFogStart!.value = look.fogStart * visibility;
    u.uBloomStrength!.value = look.bloomStrength;
    u.uExposure!.value = look.exposure;
    u.uSaturation!.value = look.saturation;
    u.uContrast!.value = look.contrast;
    u.uSplitTone!.value = look.splitTone;
    u.uVignette!.value = look.vignette + frame.speedBlur * .18;
    u.uGrain!.value = look.grain;
    u.uTime!.value = frame.time;
    u.uSpeedBlur!.value = frame.speedBlur;
    u.uChromatic!.value = frame.chromatic * .012;
    u.uAspect!.value = this.width / Math.max(1, this.height);
    u.uFlash!.value = frame.flash;
    this.quad!.material = material;
    this.renderer.setRenderTarget(this.gradeTarget);
    this.quad!.render(this.renderer);
  }

  private resizePrepass(): void {
    if (!this.prepassTarget || !this.edgePass) return;
    const width = Math.max(1, Math.floor(this.width * this.pixelRatio * this.prepassScaleValue));
    const height = Math.max(1, Math.floor(this.height * this.pixelRatio * this.prepassScaleValue));
    this.prepassTarget.setSize(width, height);
    this.edgePass.setPrepassSize(width, height);
  }

  private validateFramebuffer(): boolean {
    const target = this.prepassTarget;
    if (!target) return false;
    const previousTarget = this.renderer.getRenderTarget();
    try {
      this.renderer.initRenderTarget(target);
      this.renderer.setRenderTarget(target);
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    } finally {
      this.renderer.setRenderTarget(previousTarget);
    }
  }

  private renderPrepass(): void {
    const target = this.prepassTarget;
    const material = this.prepassMaterial;
    if (!target || !material) return;
    const previousTarget = this.renderer.getRenderTarget();
    const previousOverride = this.sceneValue.overrideMaterial;
    const previousBackground = this.sceneValue.background;
    const previousAutoClear = this.renderer.autoClear;

    try {
      this.renderer.autoClear = false;
      // A Color background forces Three to clear even when autoClear is false.
      // Keep the two MRT clear values intact; beauty renders the background later.
      this.sceneValue.background = null;
      this.renderer.setRenderTarget(target);
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      gl.clearBufferfv(gl.COLOR, 0, this.normalClear);
      gl.clearBufferfv(gl.COLOR, 1, this.depthClear);
      this.renderer.clearDepth();
      this.sceneValue.overrideMaterial = material;
      for (const registration of this.customPrepasses) {
        registration.wasVisible = registration.mesh.visible;
      }
      this.hiddenForPrepass.length = 0;
      this.sceneValue.traverse((object) => {
        if (!(object instanceof Mesh) || !object.visible) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        const excluded = this.customPrepassIds.has(object.id)
          || object.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] === true
          || materials.some((candidate) => candidate.transparent || !candidate.depthWrite);
        if (!excluded) return;
        object.visible = false;
        this.hiddenForPrepass.push(object);
      });
      try {
        this.renderer.render(this.sceneValue, this.cameraValue);
      } finally {
        for (const mesh of this.hiddenForPrepass) mesh.visible = true;
        this.hiddenForPrepass.length = 0;
      }

      this.sceneValue.overrideMaterial = previousOverride;
      for (const registration of this.customPrepasses) {
        const { mesh, material: customMaterial } = registration;
        if (!registration.wasVisible) continue;
        const previousMaterial: Material | Material[] = mesh.material;
        mesh.material = customMaterial;
        mesh.updateWorldMatrix(true, false);
        customMaterial.setCamera(this.cameraValue);
        customMaterial.setObjectFlags(mesh);
        try {
          this.renderer.render(mesh, this.cameraValue);
        } finally {
          mesh.material = previousMaterial;
        }
      }
    } finally {
      this.sceneValue.overrideMaterial = previousOverride;
      this.sceneValue.background = previousBackground;
      this.renderer.autoClear = previousAutoClear;
      this.renderer.setRenderTarget(previousTarget);
    }
  }

  private degrade(reason: string): void {
    this.failureReasonValue = reason;
    this.releasePostResources();
  }

  private releasePostResources(): void {
    this.edgePass?.dispose();
    this.prepassMaterial?.dispose();
    this.prepassTarget?.dispose();
    this.sceneTarget?.depthTexture?.dispose();
    this.sceneTarget?.dispose();
    this.edgeTarget?.dispose();
    this.gradeTarget?.dispose();
    for (const target of this.bloomTargets) target.dispose();
    this.bloomTargets.length = 0;
    this.raysSourceTarget?.dispose();
    this.raysTarget?.dispose();
    for (const material of this.materials) material.dispose();
    this.materials.length = 0;
    this.quad?.dispose();
    this.edgePass = null;
    this.prepassMaterial = null;
    this.prepassTarget = null;
    this.sceneTarget = null;
    this.edgeTarget = null;
    this.gradeTarget = null;
    this.raysSourceTarget = null;
    this.raysTarget = null;
    this.quad = null;
  }
}

export function createCelPostPipeline(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  options: CelPostPipelineOptions = {},
): CelPostPipeline {
  return new CelPostPipeline(renderer, scene, camera, options);
}
