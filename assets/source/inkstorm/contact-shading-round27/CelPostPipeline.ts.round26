import {
  LinearFilter,
  Mesh,
  NearestFilter,
  RGBAFormat,
  Scene,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

import { CelPrepassMaterial } from './CelPrepassMaterial';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import {
  SobelEdgePass,
  type SobelEdgeConfig,
} from './SobelEdgePass';

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

/**
 * Owns the cel render graph: MRT prepass -> beauty render -> tuned Sobel composite.
 * It falls back to a direct scene render if MRT setup or a render-time operation fails.
 */
export class CelPostPipeline {
  private readonly renderer: WebGLRenderer;
  private sceneValue: Scene;
  private cameraValue: Camera;
  private composer: EffectComposer | null = null;
  private beautyPass: RenderPass | null = null;
  private edgePass: SobelEdgePass | null = null;
  private prepassTarget: WebGLRenderTarget | null = null;
  private prepassMaterial: CelPrepassMaterial | null = null;
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
  private readonly normalClear = new Float32Array([0.5, 0.5, 1, 0]);
  private readonly depthClear = new Float32Array([1, 1, 1, 0]);

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
      const composerTarget = new WebGLRenderTarget(1, 1, {
        format: RGBAFormat,
        type: UnsignedByteType,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        depthBuffer: true,
        stencilBuffer: false,
        samples: 0,
      });
      composerTarget.texture.name = 'cel-beauty-composer';
      const composer = new EffectComposer(renderer, composerTarget);
      const beautyPass = new RenderPass(scene, camera);
      const edgePass = new SobelEdgePass(options.edges);
      composer.addPass(beautyPass);
      composer.addPass(edgePass);
      this.composer = composer;
      this.beautyPass = beautyPass;
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
    return this.composer && this.prepassTarget && this.prepassMaterial ? 'mrt-sobel' : 'direct';
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
    if (this.beautyPass) this.beautyPass.scene = scene;
  }

  setCamera(camera: Camera): void {
    this.cameraValue = camera;
    if (this.beautyPass) this.beautyPass.camera = camera;
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
    if (this.composer) {
      this.composer.setPixelRatio(this.pixelRatio);
      this.composer.setSize(this.width, this.height);
    }
    this.resizePrepass();
  }

  render(deltaTime = 0): void {
    if (this.disposed) throw new Error('Cannot render a disposed CelPostPipeline.');
    if (!this.enabledValue || !this.composer || !this.prepassTarget || !this.prepassMaterial) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.sceneValue, this.cameraValue);
      return;
    }

    try {
      this.renderPrepass();
      this.composer.render(deltaTime);
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
    const previousAutoClear = this.renderer.autoClear;

    try {
      this.renderer.autoClear = false;
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
    this.composer?.dispose();
    this.edgePass = null;
    this.prepassMaterial = null;
    this.prepassTarget = null;
    this.beautyPass = null;
    this.composer = null;
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
