import {
  Box3, Color, Group, InstancedMesh, Matrix4, Mesh, MeshDepthMaterial, NearestFilter,
  OrthographicCamera, RGBADepthPacking, Scene, ShaderMaterial, Vector2, Vector3,
  WebGLRenderTarget, type Texture, type WebGLRenderer,
} from 'three';

export function createInkstormShadowUniforms() {
  return { uWorldShadow: { value: null as Texture | null }, uWorldShadowMatrix: { value: new Matrix4() },
    uWorldShadowReady: { value: 0 }, uWorldShadowTexel: { value: new Vector2(1 / 4096, 1 / 4096) },
    uWorldShadowBias: { value: .0004 } };
}

/** RGBA depth from the actual static scenery, independent of the racing camera. */
export const INKSTORM_SHADOW_GLSL = /* glsl */ `
uniform sampler2D uWorldShadow;
uniform mat4 uWorldShadowMatrix;
uniform float uWorldShadowReady;
uniform vec2 uWorldShadowTexel;
uniform float uWorldShadowBias;
float worldDepth(vec2 uv) {
  return dot(texture2D(uWorldShadow,uv),vec4(255./256.,255./65536.,255./16777216.,1./16777216.));
}
float filteredWorldDepth(vec2 uv,float depth) {
  vec2 pixel=uv/uWorldShadowTexel-.5, f=fract(pixel);
  vec2 corner=(floor(pixel)+.5)*uWorldShadowTexel;
  float a=step(depth,worldDepth(corner));
  float b=step(depth,worldDepth(corner+vec2(uWorldShadowTexel.x,0.)));
  float c=step(depth,worldDepth(corner+vec2(0.,uWorldShadowTexel.y)));
  float d=step(depth,worldDepth(corner+uWorldShadowTexel));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float inkstormSunVisibility(vec3 world) {
  if(uWorldShadowReady<.5)return 1.;
  vec4 h=uWorldShadowMatrix*vec4(world,1.);vec3 p=h.xyz/h.w;
  if(p.x<.001||p.x>.999||p.y<.001||p.y>.999||p.z<0.||p.z>1.)return 1.;
  float depth=p.z-uWorldShadowBias;
  return filteredWorldDepth(p.xy,depth);
}`;

/** One atlas bake per scenery revision, with no extra per-frame geometry pass. */
export class InkstormSunShadow {
  readonly uniforms = createInkstormShadowUniforms();
  private readonly target = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true, stencilBuffer: false,
    generateMipmaps: false,
  });
  private readonly depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  private revision = -1;
  readonly receipt = { revision: -1, size: 0, casters: 0, texelMetres: 0, bakes: 0, failure: null as string|null };

  constructor(private readonly maxResolution=4096) { this.target.texture.name = 'Inkstorm static directional scenery depth'; }

  invalidate(): void { this.revision = -1; this.uniforms.uWorldShadowReady.value = 0; }

  update(renderer: WebGLRenderer, revision: number, createCasters: () => Group, receivingScene: Scene): void {
    if (revision === this.revision) return;
    this.revision=revision;
    this.uniforms.uWorldShadowReady.value=0;
    let casters:Group|null=null;
    const scene=new Scene();
    let restoreRenderer=()=>{};
    try {
    casters = createCasters();
    if (!casters.children.length) return;
    scene.add(casters); scene.overrideMaterial = this.depth;
    casters.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(casters);
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new Vector3());
    const radius = bounds.getSize(new Vector3()).length() * .5 + 40;
    const camera = new OrthographicCamera(-radius, radius, radius, -radius, 1, radius * 4 + 100);
    camera.position.copy(center).addScaledVector(new Vector3(-.42, .76, -.5).normalize(), radius * 2);
    camera.lookAt(center); camera.updateMatrixWorld(true);
    // Fit the actual light-space box, rather than wasting atlas area on its sphere.
    const lightBounds = new Box3();
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      lightBounds.expandByPoint(new Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
    }
    camera.left = lightBounds.min.x - 10; camera.right = lightBounds.max.x + 10;
    camera.bottom = lightBounds.min.y - 10; camera.top = lightBounds.max.y + 10;
    camera.near = Math.max(1, -lightBounds.max.z - 20); camera.far = -lightBounds.min.z + 200;
    camera.updateProjectionMatrix();
    let size = Math.min(this.maxResolution, renderer.capabilities.maxTextureSize);
    const oldTarget = renderer.getRenderTarget(), oldColor = renderer.getClearColor(new Color());
    const oldAlpha = renderer.getClearAlpha(), oldAutoClear = renderer.autoClear;
    restoreRenderer=()=>{renderer.setRenderTarget(oldTarget); renderer.setClearColor(oldColor,oldAlpha); renderer.autoClear=oldAutoClear;};
      const gl=renderer.getContext();
      for(;;){
        if(gl.isContextLost())throw new Error('Context lost during scenery shadow allocation');
        if(this.target.width!==size)this.target.setSize(size,size);
        renderer.setRenderTarget(this.target);
        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE)break;
        if(size<=1024)throw new Error('Scenery shadow framebuffer is incomplete');
        size=Math.max(1024,Math.floor(size/2));
      }
      renderer.setClearColor(0xffffff, 1); renderer.autoClear = true;
      renderer.clear(); renderer.render(scene, camera);
      if(gl.isContextLost())throw new Error('Context lost during scenery shadow rendering');
      this.uniforms.uWorldShadowMatrix.value.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1)
        .multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
      this.uniforms.uWorldShadow.value = this.target.texture;
      this.uniforms.uWorldShadowTexel.value.set(1 / size, 1 / size);
      const texel = Math.max(camera.right - camera.left, camera.top - camera.bottom) / size;
      this.uniforms.uWorldShadowBias.value = Math.max(.65, texel * .65) / (camera.far - camera.near);
      this.uniforms.uWorldShadowReady.value = 1;
      receivingScene.traverse(object => {
        if (!(object instanceof Mesh)) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (material instanceof ShaderMaterial && material.uniforms.uWorldShadowReady) Object.assign(material.uniforms, this.uniforms);
        }
      });
      this.revision = revision;
      Object.assign(this.receipt, { revision, size, casters: casters.children.length, texelMetres: texel, bakes: this.receipt.bakes + 1, failure:null });
    } catch(error) {
      // A failed bake falls back to existing art shadows until scenery changes
      // or the context is restored; do not retry an allocation every frame.
      this.revision=revision;
      this.receipt.failure=String(error);
      throw error;
    } finally {
      restoreRenderer();
      // Clone instance buffers belong to this bake. Geometry and materials remain owned by the world.
      casters?.traverse(object => { if (object instanceof InstancedMesh) object.dispose(); });
      scene.clear(); casters?.clear();
    }
  }

  dispose(): void { this.uniforms.uWorldShadowReady.value = 0; this.target.dispose(); this.depth.dispose(); }
}
