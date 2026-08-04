import {
  AdditiveBlending,
  BackSide,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
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

    // Broad, flat anime cloud plates. Alpha-free compositing keeps them graphic.
    // A direction-space projection stays continuous around the sky dome.  An
    // atan-based longitude made its discontinuity visible as a vertical cloud
    // seam whenever the chase camera crossed the -PI/PI boundary.
    vec2 cloudUv = vec2(
      dir.x * 8.5 + dir.z * 3.3,
      dir.z * 8.5 - dir.x * 3.3 + dir.y * 10.8
    );
    float cloudLayer = cloudNoise(cloudUv + vec2(uTime * 0.007, 0.0));
    float cloudMask = step(0.73, cloudLayer) * step(0.54, h) * step(h, 0.81);
    float cloudRim = (step(0.67, cloudLayer) - cloudMask) * step(0.53, h) * step(h, 0.82);
    color = mix(color, mix(uDustTint, uSunTint, 0.42), cloudRim * 0.46);
    color = mix(color, uSunTint, cloudMask * 0.62);

    // Distance sand curtain: two hard-edged, slowly shifting horizon strata.
    float angle = atan(dir.z, dir.x);
    float grit = valueNoise(vec2(angle * 18.0 + uTime * 0.02, dir.y * 70.0));
    float curtainA = step(abs(dir.y + 0.015), 0.047 + grit * 0.018);
    float curtainB = step(abs(dir.y - 0.035), 0.018 + grit * 0.009);
    color = mix(color, uDustTint, curtainA * 0.38);
    color = mix(color, mix(uDustTint, uSunTint, 0.48), curtainB * 0.24);

    gl_FragColor = vec4(color, 1.0);
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
  private readonly skyMaterial: ShaderMaterial;
  private readonly suns: Group[] = [];
  private readonly hazePlanes: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
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
        uSkyTop: { value: new Color() },
        uSkyHorizon: { value: new Color() },
        uHazeColor: { value: new Color() },
        uSunTint: { value: new Color() },
        uDustTint: { value: new Color() },
      },
    });
    const dome = new Mesh(new SphereGeometry(14000, 32, 18), this.skyMaterial);
    dome.frustumCulled = false;
    this.add(dome);

    this.suns.push(this.createSun(new Color('#fff3a6'), 780, 1));
    this.suns.push(this.createSun(new Color('#ff9248'), 480, 0.72));
    this.suns[0]?.position.set(-3900, 4300, -8200);
    this.suns[1]?.position.set(-2750, 3300, -8000);
    for (const sun of this.suns) this.add(sun);

    // Flat translucent haze cards cross the track at extreme distance.
    const hazeGeometry = new PlaneGeometry(3400, 190);
    for (let i = 0; i < 7; i += 1) {
      const material = new MeshBasicMaterial({
        color: i % 2 === 0 ? '#f5a44e' : '#dd6335',
        transparent: true,
        opacity: 0.05 + (i % 3) * 0.025,
        depthWrite: false,
        side: DoubleSide,
      });
      const card = new Mesh(hazeGeometry, material);
      card.position.set((i - 3) * 1600, 110 + (i % 2) * 55, -2800 - i * 520);
      card.rotation.y = (i - 3) * 0.21;
      this.hazePlanes.push(card);
      this.add(card);
    }
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
    for (let index = 0; index < this.hazePlanes.length; index += 1) {
      const card = this.hazePlanes[index];
      card?.material.color.set(index % 2 === 0 ? atmosphere.dustTint : atmosphere.haze);
    }
  }

  update(time: number, camera: Camera): void {
    this.skyMaterial.uniforms.uTime!.value = time;
    this.position.copy(camera.position);
    this.skyForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    this.skyRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this.skyUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    this.suns[0]?.position.copy(this.skyForward).multiplyScalar(10_800)
      .addScaledVector(this.skyRight, -3_450)
      .addScaledVector(this.skyUp, 2_850);
    this.suns[1]?.position.copy(this.skyForward).multiplyScalar(10_650)
      .addScaledVector(this.skyRight, -2_470)
      .addScaledVector(this.skyUp, 2_240);
    // A steep overhead review camera contains no sky. Keeping depth-disabled
    // flare cards alive there pasted both suns onto the desert floor.
    const sunsInSky = this.skyForward.y > -0.28;
    for (const sun of this.suns) {
      sun.visible = sunsInSky;
      sun.quaternion.copy(camera.quaternion);
    }
    for (let i = 0; i < this.hazePlanes.length; i += 1) {
      const card = this.hazePlanes[i];
      if (!card) continue;
      card.position.x += Math.sin(time * 0.03 + i) * 0.035;
    }
  }

  dispose(): void {
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
      depthTest: false,
      blending: AdditiveBlending,
      uniforms: { uColor: { value: color }, uCore: { value: core } },
    });
    const flare = new Mesh(geometry, material);
    flare.frustumCulled = false;
    group.add(flare);

    const disc = new Mesh(
      new CircleGeometry(size * 0.18, 32),
      new MeshBasicMaterial({ color, depthTest: false, depthWrite: false }),
    );
    disc.position.z = 1;
    group.add(disc);
    return group;
  }
}

export const PRIMARY_SUN_DIRECTION = new Vector3(-0.42, 0.76, -0.5).normalize();
