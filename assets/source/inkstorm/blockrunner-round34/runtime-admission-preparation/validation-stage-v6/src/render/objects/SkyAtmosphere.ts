import {
  AdditiveBlending,
  BackSide,
  CircleGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  SRGBColorSpace,
  RepeatWrapping,
  type Texture,
  Vector3,
  type Camera,
} from 'three';
import {
  DESERT_REGIONS,
  type DesertRegionProfile,
} from '../../game/race/regions';
import type { DesertRegionId } from '../../game/race/types';

const skyVertex = /* glsl */ `
  varying vec3 vWorldDirection;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldDirection = normalize(world.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  precision highp float;
  varying vec3 vWorldDirection;
  uniform float uTime;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyHorizon;
  uniform vec3 uHazeColor;
  uniform vec3 uSunTint;
  uniform vec3 uDustTint;
  uniform sampler2D uPaintedSky;
  uniform float uPaintReady;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float cloudNoise(vec2 p) {
    float n = valueNoise(p);
    n += valueNoise(p * 2.07 + 13.2) * 0.5;
    n += valueNoise(p * 4.13 - 7.7) * 0.25;
    return n / 1.75;
  }

  void main() {
    vec3 dir = normalize(vWorldDirection);
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

    vec3 zenith = uSkyTop;
    vec3 upper = mix(uSkyTop, uSkyHorizon, 0.3);
    vec3 horizon = uSkyHorizon;
    vec3 haze = mix(uSkyHorizon, uHazeColor, 0.62);
    vec3 color = h > 0.58
      ? mix(upper, zenith, smoothstep(0.58, 1.0, h))
      : mix(haze, horizon, smoothstep(0.42, 0.58, h));

    // Continuous painted cloud masses; smooth edges remove the old horizon bands.
    vec2 cloudUv = vec2(dir.x * 6.8 + dir.z * 2.1, dir.z * 6.8 - dir.x * 2.1 + dir.y * 9.0);
    float cloudLayer = cloudNoise(cloudUv + vec2(uTime * 0.0015, 0.0));
    float heightMask = smoothstep(0.025,0.13,dir.y) * (1.0-smoothstep(0.72,0.94,dir.y));
    float cloudRim = smoothstep(0.48,0.515,cloudLayer)*heightMask;
    float cloudBody = smoothstep(0.52,0.55,cloudLayer)*heightMask;
    float cloudLight = smoothstep(0.62,0.67,cloudLayer)*heightMask;
    color=mix(color,mix(uSkyHorizon,uSunTint,.4),cloudRim*.8);
    color=mix(color,uSunTint,cloudBody*.84);
    color=mix(color,vec3(1.,.94,.77),cloudLight*.74);
    float dust = exp(-abs(dir.y + .025)*18.);
    color=mix(color,mix(uHazeColor,uSkyHorizon,.65),dust*.6);

    vec2 skyUv=vec2(atan(dir.z,dir.x)/6.2831853+.5,clamp(asin(max(0.,dir.y))/1.5707963,0.01,.99));
    // atan wraps longitude from 1 to 0. Its raw screen derivative selects a
    // near-global mip at that meridian, drawing detached vertical sky marks.
    // Use the shortest wrapped horizontal derivative; retain one paint read.
    vec2 skyDx=dFdx(skyUv),skyDy=dFdy(skyUv);
    skyDx.x-=floor(skyDx.x+.5);
    skyDy.x-=floor(skyDy.x+.5);
    vec3 painted=textureGrad(uPaintedSky,skyUv,skyDx,skyDy).rgb;
    color=mix(color,painted,uPaintReady);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

const flareVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const flareFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uCore;
  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p);
    float disc = 1.0 - step(0.46, d);
    float ring = step(0.30, d) - step(0.38, d);
    float horizontal = (1.0 - step(0.012, abs(p.y))) * (1.0 - smoothstep(0.08, 0.49, abs(p.x)));
    float vertical = (1.0 - step(0.012, abs(p.x))) * (1.0 - smoothstep(0.08, 0.49, abs(p.y)));
    vec2 diamondP = vec2(p.x + p.y, p.x - p.y);
    float diamond = (1.0 - step(0.008, min(abs(diamondP.x), abs(diamondP.y))))
      * (1.0 - smoothstep(0.10, 0.52, max(abs(diamondP.x), abs(diamondP.y))));
    float rays = max(max(horizontal, vertical), diamond * 0.65);
    float alpha = max(disc * uCore, max(ring * 0.42, rays * 0.34));
    gl_FragColor = vec4(uColor * (0.8 + disc * 0.7), alpha);
  }
`;

export class SkyAtmosphere extends Group {
  readonly ready:Promise<void>;
  private paintedTexture:Texture|null=null;
  private destroyed=false;
  private readonly skyMaterial: ShaderMaterial;
  private readonly suns: Group[] = [];
  private readonly skyForward = new Vector3();
  private readonly skyRight = new Vector3();
  private readonly skyUp = new Vector3();

  constructor(region: DesertRegionId = 'sunscar-dunes') {
    super();
    this.name = 'SkyAtmosphere';
    this.renderOrder = -100;

    this.skyMaterial = new ShaderMaterial({
      name: 'GraphicSkyDome',
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uPaintedSky: {value:null},
        uPaintReady: {value:0},
        uSkyTop: { value: new Color() },
        uSkyHorizon: { value: new Color() },
        uHazeColor: { value: new Color() },
        uSunTint: { value: new Color() },
        uDustTint: { value: new Color() },
      },
    });
    this.ready=typeof document==='undefined'?Promise.resolve():new TextureLoader().loadAsync('/assets/inkstorm/sky-paint.png').then(texture=>{
      if(this.destroyed){texture.dispose();return;}
      texture.colorSpace=SRGBColorSpace;texture.wrapS=RepeatWrapping;this.paintedTexture=texture;
      this.skyMaterial.uniforms.uPaintedSky!.value=texture;this.skyMaterial.uniforms.uPaintReady!.value=1;
    }).catch(error=>{console.error('Inkstorm painted sky failed',error);});
    const dome = new Mesh(new SphereGeometry(14000, 32, 18), this.skyMaterial);
    dome.frustumCulled = false;
    this.add(dome);

    this.suns.push(this.createSun(new Color('#fff3a6'), 780, 1));
    this.suns.push(this.createSun(new Color('#ff9248'), 480, 0.72));
    this.suns[0]?.position.set(-3900, 4300, -8200);
    this.suns[1]?.position.set(-2750, 3300, -8000);
    for (const sun of this.suns) this.add(sun);

    this.setRegion(region);
  }

  /** Applies the course region without rebuilding any sky or haze geometry. */
  setRegion(region: DesertRegionId | DesertRegionProfile): void {
    const profile = typeof region === 'string' ? DESERT_REGIONS[region] : region;
    const atmosphere = profile.atmosphere;
    this.skyMaterial.uniforms.uSkyTop!.value.set(atmosphere.skyTop);
    this.skyMaterial.uniforms.uSkyHorizon!.value.set(atmosphere.skyHorizon);
    this.skyMaterial.uniforms.uHazeColor!.value.set(atmosphere.haze);
    this.skyMaterial.uniforms.uSunTint!.value.set(atmosphere.sunTint);
    this.skyMaterial.uniforms.uDustTint!.value.set(atmosphere.dustTint);
    for (let index = 0; index < this.suns.length; index += 1) {
      const sun = this.suns[index];
      if (!sun) continue;
      const tint = new Color(index === 0 ? atmosphere.sunTint : atmosphere.dustTint);
      for (const child of sun.children) {
        if (!(child instanceof Mesh)) continue;
        const material = child.material;
        if (material instanceof ShaderMaterial) material.uniforms.uColor!.value.copy(tint);
        else if (material instanceof MeshBasicMaterial) material.color.copy(tint);
      }
    }
  }

  update(time: number, camera: Camera): void {
    this.skyMaterial.uniforms.uTime!.value = time;
    this.position.copy(camera.position);
    this.skyForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    this.skyRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this.skyUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    // The visible suns share a stable world direction with surface lighting.
    this.suns[0]?.position.set(-4_620, 8_360, -5_500);
    this.suns[1]?.position.set(-3_650, 7_200, -6_850);
    // A steep overhead review camera contains no sky. Keeping depth-disabled
    // flare cards alive there pasted both suns onto the desert floor.
    const sunsInSky = this.skyForward.y > -0.28;
    for (const sun of this.suns) {
      sun.visible = sunsInSky;
      sun.quaternion.copy(camera.quaternion);
    }
  }

  dispose(): void {
    this.destroyed=true;this.paintedTexture?.dispose();
    this.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      }
    });
  }

  private createSun(color: Color, size: number, core: number): Group {
    const group = new Group();
    const geometry = new PlaneGeometry(size, size);
    const material = new ShaderMaterial({
      vertexShader: flareVertex,
      fragmentShader: flareFragment,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
      uniforms: { uColor: { value: color }, uCore: { value: core } },
    });
    const flare = new Mesh(geometry, material);
    flare.frustumCulled = false;
    group.add(flare);

    const disc = new Mesh(
      new CircleGeometry(size * 0.18, 32),
      new MeshBasicMaterial({ color, depthTest: true, depthWrite: false }),
    );
    disc.position.z = 1;
    group.add(disc);
    return group;
  }
}

export const PRIMARY_SUN_DIRECTION = new Vector3(-0.42, 0.76, -0.5).normalize();
