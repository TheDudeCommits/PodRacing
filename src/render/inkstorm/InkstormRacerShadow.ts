import { SALT_DUSK_SUN } from '../saltDusk/SaltDuskLighting';
import {
  Box3, Color, InstancedMesh, Matrix4, Mesh, MeshDepthMaterial, NearestFilter,
  Object3D, OrthographicCamera, RGBADepthPacking, Scene, ShaderMaterial, SkinnedMesh,
  Vector2, Vector3, Vector4, WebGLRenderTarget,
  type BufferGeometry, type Material, type Texture, type WebGLRenderer,
} from 'three';

export function createInkstormRacerShadowUniforms() {
  return {
    uRacerShadow: { value: null as Texture | null },
    uRacerShadowMatrix: { value: new Matrix4() },
    uRacerShadowReady: { value: 0 },
    uRacerShadowTexel: { value: new Vector2(1 / 512, 1 / 512) },
    uRacerShadowBias: { value: .001 },
    uRacerShadowNormalBias: { value: .08 },
    uRacerShadowBoundsMin: { value: new Vector3() },
    uRacerShadowBoundsMax: { value: new Vector3() },
  };
}

/** Separate names let receivers combine static scenery and the moving player. */
export const INKSTORM_RACER_SHADOW_GLSL = /* glsl */ `
uniform sampler2D uRacerShadow;
uniform mat4 uRacerShadowMatrix;
uniform float uRacerShadowReady;
uniform vec2 uRacerShadowTexel;
uniform float uRacerShadowBias;
uniform float uRacerShadowNormalBias;
uniform vec3 uRacerShadowBoundsMin;
uniform vec3 uRacerShadowBoundsMax;
float racerShadowDepth(vec2 uv) {
  // Three 0.185 RGBADepthPacking: ShaderChunk.packing / UnpackFactors4.
  return dot(texture2D(uRacerShadow, uv), vec4(255./256.,255./65536.,255./16777216.,1./16777216.));
}
float inkstormRacerSunVisibility(vec3 world, vec3 worldNormal) {
  if(uRacerShadowReady < .5) return 1.;
  if(any(lessThan(world,uRacerShadowBoundsMin)) || any(greaterThan(world,uRacerShadowBoundsMax))) return 1.;
  vec4 h = uRacerShadowMatrix * vec4(world + worldNormal * uRacerShadowNormalBias, 1.);
  vec3 p = h.xyz / h.w;
  // Keep all four PCF taps inside the atlas; cleared depth is exactly one.
  vec2 guard = uRacerShadowTexel * 1.5;
  if(any(lessThan(p.xy,guard)) || any(greaterThan(p.xy,1.-guard)) || p.z<0. || p.z>1.) return 1.;
  float depth = p.z - uRacerShadowBias;
  vec2 pixel = p.xy / uRacerShadowTexel - .5, f = fract(pixel);
  vec2 corner = (floor(pixel) + .5) * uRacerShadowTexel;
  float a = step(depth,racerShadowDepth(corner));
  float b = step(depth,racerShadowDepth(corner+vec2(uRacerShadowTexel.x,0.)));
  float c = step(depth,racerShadowDepth(corner+vec2(0.,uRacerShadowTexel.y)));
  float d = step(depth,racerShadowDepth(corner+uRacerShadowTexel));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float inkstormRacerSunVisibility(vec3 world) {
  return inkstormRacerSunVisibility(world,vec3(0.,1.,0.));
}`;

type Caster = {
  source: Mesh;
  proxy: Mesh;
  geometry: BufferGeometry;
  localBounds: Box3;
  worldBounds: Box3;
  priority: number;
};

export interface InkstormRacerShadowOptions {
  resolution?: 512 | 1024;
  /** Hard upper bound is 22. Lower values select the largest visible masses. */
  maxCasters?: number;
}

const SUN = SALT_DUSK_SUN.clone();
const MAX_VOLUME_METRES = 384;
const PILOT_NAME = /^pilot(?:-|$)/;
const byLargestMass = (a: Caster, b: Caster): number => b.priority - a.priority;

function opaque(material: Material): boolean {
  return material.visible && !material.transparent && material.opacity >= 1
    && material.depthWrite && material.alphaTest === 0;
}

/**
 * One bounded player depth pass. Proxies borrow source geometry, mirror live
 * world transforms, and never reparent or mutate beauty meshes/materials.
 */
export class InkstormRacerShadow {
  readonly uniforms = createInkstormRacerShadowUniforms();
  readonly receipt = {
    size: 0, casters: 0, candidates: 0, omitted: 0, triangles: 0,
    drawCalls: 0, drawnTriangles: 0, frames: 0, refreshes: 0,
    texelMetres: 0, depthMetres: 0, cpuMs: 0, maxCpuMs: 0,
    failure: null as string | null, skipped: null as string | null,
  };
  private readonly target = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true,
    stencilBuffer: false, generateMipmaps: false,
  });
  private readonly depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-24, 24, 24, -24, .1, 100);
  private readonly bindings: Caster[] = [];
  private readonly candidates: Caster[] = [];
  private readonly bounds = new Box3();
  private readonly casterBounds = new Box3();
  private readonly lightBounds = new Box3();
  private readonly point = new Vector3();
  private readonly center = new Vector3();
  private readonly size = new Vector3();
  private readonly clearColor = new Color();
  private readonly viewport = new Vector4();
  private readonly scissor = new Vector4();
  private readonly resolution: 512 | 1024;
  private readonly maxCasters: number;
  private player: Object3D | null = null;
  private pilotAnchor: Object3D | null = null;
  private receivingScene: Scene | null = null;
  private allocated = false;
  private failed = false;
  private disposed = false;

  constructor(options: InkstormRacerShadowOptions = {}) {
    this.resolution = options.resolution === 1024 ? 1024 : 512;
    const requested = options.maxCasters ?? 22;
    this.maxCasters = Math.min(22, Math.max(1, Number.isFinite(requested) ? Math.floor(requested) : 22));
    this.target.texture.name = 'Inkstorm moving player directional depth';
    this.depth.name = 'Inkstorm player shadow depth';
    this.depth.toneMapped = false;
    this.scene.name = 'Inkstorm isolated player shadow pass';
    this.scene.matrixAutoUpdate = false;
  }

  /** Call once after adding/replacing receiving materials; no frame traversal. */
  bindReceivers(scene: Scene): void {
    this.receivingScene = scene;
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material instanceof ShaderMaterial && material.uniforms.uRacerShadowReady) {
          Object.assign(material.uniforms, this.uniforms);
        }
      }
    });
  }

  /** Rebuild borrowed mesh bindings only when the player's hierarchy changes. */
  refreshCasters(player: Object3D): void {
    if (this.disposed) return;
    this.clear();
    this.scene.clear();
    this.bindings.length = 0;
    this.candidates.length = 0;
    this.player = player;
    const anchor = (player as Object3D & { pilotAnchor?: Object3D }).pilotAnchor;
    this.pilotAnchor = anchor instanceof Object3D ? anchor : null;
    player.traverse(object => {
      if (!(object instanceof Mesh) || object instanceof SkinnedMesh || object instanceof InstancedMesh) return;
      if (this.excluded(object) || object.geometry.morphAttributes.position?.length) return;
      const proxy = new Mesh(object.geometry, this.depth);
      proxy.name = `${object.name || object.uuid}:racer-shadow`;
      proxy.matrixAutoUpdate = false;
      proxy.frustumCulled = false;
      proxy.visible = false;
      this.scene.add(proxy);
      const localBounds = new Box3();
      this.readLocalBounds(object.geometry, localBounds);
      this.bindings.push({ source: object, proxy, geometry: object.geometry, localBounds, worldBounds: new Box3(), priority: 0 });
    });
    this.receipt.refreshes++;
  }

  /** Context restoration explicitly unlocks a failed target; failures never retry per frame. */
  invalidate(): void {
    if (this.disposed) return;
    this.clear();
    this.failed = false;
    this.allocated = false;
    this.receipt.failure = null;
    this.target.dispose();
  }

  /** Clear the published shadow when the hero is absent or this view is inactive. */
  clear(): void {
    this.uniforms.uRacerShadowReady.value = 0;
    this.uniforms.uRacerShadow.value = null;
  }

  /**
   * Run after player animation and before the beauty pass. Pass the CPU terrain
   * or bridge surface under the player as groundY; omission assumes rootY - 2.
   * Returns whether a usable shadow was published for this frame.
   */
  update(renderer: WebGLRenderer, player: Object3D, receivingScene?: Scene, groundY?: number): boolean {
    this.clear();
    if (this.disposed || this.failed) return false;
    const start = performance.now();
    this.receipt.skipped = null;
    this.receipt.drawCalls = 0;
    this.receipt.drawnTriangles = 0;
    try {
      const gl = renderer.getContext();
      if (gl.isContextLost()) throw new Error('Context lost during player shadow update');
      // The shader uses ordinary OpenGL depth; do not publish another encoding.
      if (renderer.capabilities.reversedDepthBuffer) throw new Error('Player shadow requires conventional depth');
      if (receivingScene && this.receivingScene !== receivingScene) this.bindReceivers(receivingScene);
      if (this.player !== player) this.refreshCasters(player);
      player.updateWorldMatrix(true, true);
      this.selectCasters();
      if (!this.candidates.length) {
        this.receipt.skipped = 'no-visible-opaque-casters';
        return false;
      }
      const floor = groundY ?? player.matrixWorld.elements[13]! - 2;
      if (!this.fitCamera(floor)) {
        this.receipt.skipped = 'outside-local-volume';
        return false;
      }
      this.renderDepth(renderer);
      if (gl.isContextLost()) throw new Error('Context lost during player shadow rendering');
      this.uniforms.uRacerShadowMatrix.value.set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1)
        .multiply(this.camera.projectionMatrix).multiply(this.camera.matrixWorldInverse);
      const texel = Math.max(this.camera.right - this.camera.left, this.camera.top - this.camera.bottom) / this.target.width;
      const depthMetres = this.camera.far - this.camera.near;
      this.uniforms.uRacerShadowTexel.value.set(1 / this.target.width, 1 / this.target.height);
      this.uniforms.uRacerShadowBias.value = Math.max(.025, texel * .5) / depthMetres;
      this.uniforms.uRacerShadowNormalBias.value = Math.max(.06, texel * 1.5);
      this.uniforms.uRacerShadow.value = this.target.texture;
      this.uniforms.uRacerShadowReady.value = 1;
      this.receipt.size = this.target.width;
      this.receipt.texelMetres = texel;
      this.receipt.depthMetres = depthMetres;
      this.receipt.failure = null;
      this.receipt.frames++;
      return true;
    } catch (error) {
      this.failed = true;
      this.clear();
      this.receipt.failure = String(error);
      return false;
    } finally {
      this.receipt.cpuMs = performance.now() - start;
      this.receipt.maxCpuMs = Math.max(this.receipt.maxCpuMs, this.receipt.cpuMs);
    }
  }

  private excluded(object: Object3D): boolean {
    for (let current: Object3D | null = object; current && current !== this.player; current = current.parent) {
      if (current === this.pilotAnchor || current.userData.inkstormRacerShadowExclude === true
        || current.name.endsWith(':ink-hull') || PILOT_NAME.test(current.name)) return true;
    }
    return false;
  }

  private visible(source: Mesh): boolean {
    let belongsToPlayer = false;
    for (let current: Object3D | null = source; current; current = current.parent) {
      if (!current.visible) return false;
      if (current === this.player) belongsToPlayer = true;
    }
    if (!belongsToPlayer || this.excluded(source) || source.geometry.drawRange.count === 0
      || source.geometry.morphAttributes.position?.length) return false;
    // A single depth material means one submission. Mixed/transparent groups
    // cannot silently become opaque, including the hidden cel prepass proxy.
    return Array.isArray(source.material)
      ? source.material.length > 0 && source.material.every(opaque)
      : opaque(source.material);
  }

  private readLocalBounds(geometry: BufferGeometry, bounds: Box3): void {
    const position = geometry.getAttribute('position');
    if (!position) { bounds.makeEmpty(); return; }
    if (geometry.boundingBox) bounds.copy(geometry.boundingBox);
    else {
      bounds.makeEmpty();
      for (let index = 0; index < position.count; index++) {
        bounds.expandByPoint(this.point.fromBufferAttribute(position, index));
      }
    }
  }

  private selectCasters(): void {
    this.bounds.makeEmpty();
    this.candidates.length = 0;
    for (const caster of this.bindings) {
      caster.proxy.visible = false;
      if (!this.visible(caster.source)) continue;
      if (caster.geometry !== caster.source.geometry) {
        caster.geometry = caster.source.geometry;
        caster.proxy.geometry = caster.geometry;
        this.readLocalBounds(caster.geometry, caster.localBounds);
      }
      if (caster.localBounds.isEmpty()) continue;
      caster.worldBounds.copy(caster.localBounds).applyMatrix4(caster.source.matrixWorld);
      caster.worldBounds.getSize(this.size);
      caster.priority = this.size.x * this.size.z + this.size.y * (this.size.x + this.size.z);
      if (!Number.isFinite(caster.priority)) continue;
      this.candidates.push(caster);
    }
    this.receipt.candidates = this.candidates.length;
    if (this.candidates.length > this.maxCasters) {
      this.candidates.sort(byLargestMass);
      this.candidates.length = this.maxCasters;
    }
    this.receipt.casters = this.candidates.length;
    this.receipt.omitted = this.receipt.candidates - this.receipt.casters;
    this.receipt.triangles = 0;
    for (const caster of this.candidates) {
      caster.proxy.visible = true;
      caster.proxy.matrix.copy(caster.source.matrixWorld);
      caster.proxy.matrixWorldNeedsUpdate = true;
      this.bounds.union(caster.worldBounds);
      const count = caster.geometry.index?.count ?? caster.geometry.getAttribute('position').count;
      this.receipt.triangles += Math.max(0, Math.min(count - caster.geometry.drawRange.start, caster.geometry.drawRange.count)) / 3;
    }
  }

  private fitCamera(groundY: number): boolean {
    if (!Number.isFinite(groundY)) return false;
    // Extend the caster box down its sun rays to the actual receiving floor.
    // A 384m maximum accommodates the photographed 2.6° sun while still
    // rejecting high jumps and invalid poses. Texture/draw budgets are unchanged.
    this.casterBounds.copy(this.bounds);
    const floor = groundY - 3;
    const distance = Math.max(0, this.bounds.max.y - floor) / SUN.y;
    const rayX=-SUN.x*distance,rayZ=-SUN.z*distance;
    this.bounds.min.x+=Math.min(0,rayX);this.bounds.max.x+=Math.max(0,rayX);
    this.bounds.min.z+=Math.min(0,rayZ);this.bounds.max.z+=Math.max(0,rayZ);
    this.bounds.min.y = Math.min(floor, this.bounds.min.y);
    this.bounds.expandByScalar(1.5);
    this.bounds.getSize(this.size);
    if (Math.max(this.size.x, this.size.y, this.size.z) > MAX_VOLUME_METRES) return false;
    this.uniforms.uRacerShadowBoundsMin.value.copy(this.bounds.min);
    this.uniforms.uRacerShadowBoundsMax.value.copy(this.bounds.max);
    this.bounds.getCenter(this.center);
    this.camera.position.copy(this.center).addScaledVector(SUN, Math.max(128,this.size.length()*.5+20));
    this.camera.lookAt(this.center);
    this.camera.updateMatrixWorld(true);
    this.lightBounds.makeEmpty();
    // Fit actual caster corners and their floor projections in light space.
    // Fitting the extended world AABB wastes nearly all texels at a grazing sun.
    for (let corner = 0; corner < 8; corner++) {
      const x=corner&1?this.casterBounds.max.x:this.casterBounds.min.x;
      const y=corner&2?this.casterBounds.max.y:this.casterBounds.min.y;
      const z=corner&4?this.casterBounds.max.z:this.casterBounds.min.z;
      this.point.set(x,y,z);
      this.lightBounds.expandByPoint(this.point.applyMatrix4(this.camera.matrixWorldInverse));
      this.point.set(x,y,z).addScaledVector(SUN,-Math.max(0,y-floor)/SUN.y);
      this.lightBounds.expandByPoint(this.point.applyMatrix4(this.camera.matrixWorldInverse));
    }
    this.lightBounds.expandByScalar(1.5);
    this.camera.left = this.lightBounds.min.x;
    this.camera.right = this.lightBounds.max.x;
    this.camera.bottom = this.lightBounds.min.y;
    this.camera.top = this.lightBounds.max.y;
    this.camera.near = Math.max(.1, -this.lightBounds.max.z - 1);
    this.camera.far = -this.lightBounds.min.z + 1;
    this.camera.updateProjectionMatrix();
    return true;
  }

  private renderDepth(renderer: WebGLRenderer): void {
    const previousTarget = renderer.getRenderTarget();
    const previousFace = renderer.getActiveCubeFace(), previousMip = renderer.getActiveMipmapLevel();
    renderer.getClearColor(this.clearColor);
    renderer.getViewport(this.viewport);
    renderer.getScissor(this.scissor);
    const previousAlpha = renderer.getClearAlpha(), previousAutoClear = renderer.autoClear;
    const previousScissorTest = renderer.getScissorTest();
    const previousXr = renderer.xr.enabled, previousInfoReset = renderer.info.autoReset;
    try {
      renderer.xr.enabled = false;
      renderer.info.autoReset = false;
      if (!this.allocated) {
        const gl = renderer.getContext();
        if (renderer.capabilities.maxTextureSize < 512) throw new Error('Player shadow needs a 512px framebuffer');
        let resolution = renderer.capabilities.maxTextureSize >= this.resolution ? this.resolution : 512;
        for (;;) {
          this.target.setSize(resolution, resolution);
          renderer.setRenderTarget(this.target);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) break;
          if (resolution <= 512) throw new Error('Player shadow framebuffer is incomplete');
          resolution = 512;
        }
        this.allocated = true;
      } else renderer.setRenderTarget(this.target);
      renderer.setScissorTest(false);
      renderer.setClearColor(0xffffff, 1);
      renderer.autoClear = false;
      renderer.clear(true, true, false);
      const calls = renderer.info.render.calls, triangles = renderer.info.render.triangles;
      renderer.render(this.scene, this.camera);
      this.receipt.drawCalls = renderer.info.render.calls - calls;
      this.receipt.drawnTriangles = renderer.info.render.triangles - triangles;
    } finally {
      renderer.xr.enabled = previousXr;
      renderer.info.autoReset = previousInfoReset;
      renderer.autoClear = previousAutoClear;
      renderer.setClearColor(this.clearColor, previousAlpha);
      renderer.setViewport(this.viewport);
      renderer.setScissor(this.scissor);
      renderer.setScissorTest(previousScissorTest);
      renderer.setRenderTarget(previousTarget, previousFace, previousMip);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.scene.clear();
    this.bindings.length = 0;
    this.candidates.length = 0;
    this.player = null;
    this.pilotAnchor = null;
    this.receivingScene = null;
    this.target.dispose();
    this.depth.dispose();
  }
}
