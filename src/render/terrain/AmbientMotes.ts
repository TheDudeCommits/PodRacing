import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  Points,
  ShaderMaterial,
  Sphere,
  Vector3,
} from 'three';

import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import type { RacingBiomeId } from '../../game/race/racingBiomes';

/**
 * A wrapped volume of drifting motes around the camera: embers over lava,
 * snow on the ice shelf, pollen and fireflies under the canopy, dust motes
 * in the canyon. Positions wrap in the vertex shader, so the field is
 * infinite, allocation-free and costs one draw.
 */
const COUNT = 2600;
const BOX = new Vector3(220, 90, 220);

const VERTEX = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform vec3 uBox;
uniform vec3 uCamera;
uniform vec3 uWind;
uniform float uFall;
uniform float uSize;
uniform float uPixelRatio;
uniform float uSwirl;
varying float vAlpha;
varying float vHeat;
void main() {
  vec3 drift = uWind * uTime + vec3(0.0, -uFall * uTime, 0.0);
  float phase = aSeed.w * 6.2831;
  vec3 wobble = vec3(sin(uTime * (0.6 + aSeed.x) + phase), sin(uTime * 0.9 + phase * 1.3) * 0.5, cos(uTime * (0.5 + aSeed.y) + phase)) * uSwirl;
  vec3 local = position + drift + wobble;
  // Wrap each mote into a box centred on the camera.
  vec3 origin = uCamera - uBox * 0.5;
  vec3 wrapped = origin + mod(local - origin, uBox);
  vec4 view = viewMatrix * vec4(wrapped, 1.0);
  float depth = -view.z;
  float edge = min(min(wrapped.x - origin.x, origin.x + uBox.x - wrapped.x), min(wrapped.z - origin.z, origin.z + uBox.z - wrapped.z));
  vAlpha = smoothstep(1.5, 10.0, depth) * smoothstep(0.0, 25.0, edge) * (1.0 - smoothstep(60.0, 110.0, depth));
  vHeat = aSeed.z;
  gl_PointSize = uSize * (0.5 + aSeed.z) * uPixelRatio * 120.0 / max(depth, 1.0);
  gl_Position = projectionMatrix * view;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHot;
uniform float uIntensity;
uniform float uTime;
varying float vAlpha;
varying float vHeat;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = dot(q, q);
  if (r > 1.0) discard;
  float core = exp(-r * 4.0);
  float flicker = 0.75 + 0.25 * sin(uTime * (3.0 + vHeat * 9.0) + vHeat * 40.0);
  vec3 color = mix(uColor, uHot, vHeat) * uIntensity * flicker;
  gl_FragColor = vec4(color * core, core * vAlpha);
}
`;

interface MoteStyle {
  color: string; hot: string; intensity: number; size: number; fall: number; swirl: number;
  wind: [number, number, number]; additive: boolean; count: number;
}

const STYLES: Readonly<Record<RacingBiomeId, MoteStyle>> = Object.freeze({
  // Sunlit dust motes drifting across the canyon.
  desert: { color: '#ffd9a8', hot: '#fff1cf', intensity: 1.2, size: .55, fall: -.2, swirl: 1.4, wind: [6, 0, 2], additive: true, count: 1100 },
  // Snowfall with a crosswind.
  frozen: { color: '#e9f2ff', hot: '#ffffff', intensity: 1.5, size: .9, fall: 4.5, swirl: 1.1, wind: [5, 0, -3], additive: false, count: 2600 },
  // Embers rising off the lava, glowing hot enough to bloom.
  volcanic: { color: '#ff5a1c', hot: '#ffc46b', intensity: 5.5, size: .5, fall: -3.2, swirl: 2.2, wind: [2.5, 0, 1.5], additive: true, count: 2000 },
  // Pollen and bioluminescent spores under the canopy.
  jungle: { color: '#d8ffb0', hot: '#8dfff0', intensity: 2.6, size: .45, fall: .15, swirl: 2.6, wind: [1, 0, .6], additive: true, count: 1300 },
});

export class AmbientMotes {
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  private biome: RacingBiomeId = 'desert';
  private storm = 0;
  private density = 1;

  constructor() {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 4);
    let s = 0x2468ace1;
    const rand = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = rand() * BOX.x;
      positions[i * 3 + 1] = rand() * BOX.y;
      positions[i * 3 + 2] = rand() * BOX.z;
      seeds[i * 4] = rand(); seeds[i * 4 + 1] = rand(); seeds[i * 4 + 2] = rand() * rand(); seeds[i * 4 + 3] = rand();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4));
    geometry.boundingSphere = new Sphere(new Vector3(), 1e7);
    const material = new ShaderMaterial({
      name: 'AmbientMotes', vertexShader: VERTEX, fragmentShader: FRAGMENT,
      transparent: true, depthWrite: false, toneMapped: false, blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uBox: { value: BOX.clone() }, uCamera: { value: new Vector3() },
        uWind: { value: new Vector3() }, uFall: { value: 0 }, uSize: { value: 1 }, uPixelRatio: { value: 1 },
        uSwirl: { value: 1 }, uColor: { value: new Color() }, uHot: { value: new Color() }, uIntensity: { value: 1 },
      },
    });
    this.points = new Points(geometry, material);
    this.points.name = 'Ambient motes';
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this.points.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    this.setBiome('desert');
  }

  setBiome(biome: RacingBiomeId): void {
    this.biome = biome;
    const style = STYLES[biome], u = this.points.material.uniforms;
    (u.uColor!.value as Color).set(style.color);
    (u.uHot!.value as Color).set(style.hot);
    u.uIntensity!.value = style.intensity;
    u.uSize!.value = style.size;
    u.uFall!.value = style.fall;
    u.uSwirl!.value = style.swirl;
    (u.uWind!.value as Vector3).set(...style.wind);
    this.points.material.blending = style.additive ? AdditiveBlending : NormalBlending;
    this.points.material.needsUpdate = true;
    this.points.geometry.setDrawRange(0, style.count);
    const storm = this.storm; this.storm = -1; this.setWeather(1 - storm * .88);
  }

  /** Density scale for quality and comfort settings, 0..1. */
  setDensity(density: number): void {
    this.density = Math.min(1, Math.max(0, density));
    // A weather squall fills the whole volume, whatever the world's usual count.
    const base = STYLES[this.biome].count + (COUNT - STYLES[this.biome].count) * this.storm;
    const count = Math.round(base * this.density);
    this.points.geometry.setDrawRange(0, count);
    this.points.visible = count > 0;
  }

  /** Race-director visibility (1 clear, 0.12 in a squall): thicker, faster, windier motes. */
  setWeather(visibility: number): void {
    const storm = Math.min(1, Math.max(0, (1 - visibility) / .88));
    if (Math.abs(storm - this.storm) < .01) return;
    this.storm = storm;
    const style = STYLES[this.biome], u = this.points.material.uniforms;
    (u.uWind!.value as Vector3).set(style.wind[0] * (1 + storm * 6) + storm * 14, style.wind[1], style.wind[2] * (1 + storm * 6));
    u.uIntensity!.value = style.intensity * (1 + storm * .5);
    u.uSize!.value = style.size * (1 + storm * .9);
    u.uSwirl!.value = style.swirl * (1 + storm * 1.5);
    this.setDensity(this.density);
  }

  update(time: number, camera: Vector3, pixelRatio: number): void {
    const u = this.points.material.uniforms;
    u.uTime!.value = time;
    (u.uCamera!.value as Vector3).copy(camera);
    u.uPixelRatio!.value = pixelRatio;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
