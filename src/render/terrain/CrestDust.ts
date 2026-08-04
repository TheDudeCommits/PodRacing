import {
  BufferAttribute,
  Color,
  DynamicDrawUsage,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  NormalBlending,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
  type ColorRepresentation,
} from 'three';
import {
  createTerrainSample,
  createTerrainSurfaceSample,
  crestDustStrength,
  sampleTerrain,
  sampleTerrainSurface,
} from './terrainMath';

const CREST_DUST_VERTEX = /* glsl */ `
precision highp float;
in vec3 iWorld;
in float iScale;
in float iSeed;
in float iOpacity;
uniform vec2 uRenderOrigin;
uniform vec2 uWindDirection;
uniform float uWindStrength;
uniform float uTime;
out vec2 vUv;
out float vOpacity;
out float vAge;
void main() {
  float age = fract(uTime * (0.034 + iSeed * 0.018) + iSeed);
  vec2 windOffset = uWindDirection * age * (22.0 + iScale * 3.6) * uWindStrength;
  vec3 center = vec3(
    iWorld.x - uRenderOrigin.x + windOffset.x,
    iWorld.y + age * (2.2 + iScale * 0.44),
    iWorld.z - uRenderOrigin.y + windOffset.y
  );
  vec4 centerView = viewMatrix * vec4(center, 1.0);
  float billow = iScale * (0.72 + age * 1.15);
  centerView.xy += position.xy * billow;
  vUv = uv;
  vAge = age;
  vOpacity = iOpacity;
  gl_Position = projectionMatrix * centerView;
}
`;

const CREST_DUST_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uDustColor;
uniform vec3 uRimColor;
in vec2 vUv;
in float vOpacity;
in float vAge;
out vec4 fragColor;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float lobeA = 1.0 - step(0.76, length(p * vec2(0.82, 1.18)));
  float lobeB = 1.0 - step(0.59, length((p - vec2(-0.48, 0.12)) * vec2(0.9, 1.2)));
  float lobeC = 1.0 - step(0.52, length((p - vec2(0.48, 0.18)) * vec2(0.9, 1.1)));
  float body = max(lobeA, max(lobeB, lobeC));
  float inner = 1.0 - step(0.58, length(p * vec2(0.82, 1.18)));
  float rim = max(0.0, body - inner);
  float life = step(0.035, vAge) * (1.0 - step(0.88, vAge));
  life *= floor((1.0 - vAge) * 4.0) * 0.25;
  float torn = step(0.08, fract(p.x * 2.7 + p.y * 1.9 + vAge * 7.0));
  float alpha = body * torn * life * vOpacity * 0.68;
  if (alpha < 0.025) discard;
  fragColor = vec4(mix(uDustColor, uRimColor, rim), alpha);
}
`;

export interface CrestDustOptions {
  capacity?: number;
  color?: ColorRepresentation;
  rimColor?: ColorRepresentation;
  distributionRadius?: number;
  candidateSpacing?: number;
}

function integerHash(x: number, z: number): number {
  let value = (Math.imul(x | 0, 0x45d9f3b) ^ Math.imul(z | 0, 0x119de1f3)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x45d9f3b) >>> 0;
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_295;
}

/** Deterministic, wind-gated dust sheets sampled from actual dune crests. */
export class CrestDust {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly capacity: number;

  private readonly radius: number;
  private readonly spacing: number;
  private readonly worlds: Float32Array;
  private readonly scales: Float32Array;
  private readonly seeds: Float32Array;
  private readonly opacities: Float32Array;
  private readonly worldAttribute: InstancedBufferAttribute;
  private readonly scaleAttribute: InstancedBufferAttribute;
  private readonly opacityAttribute: InstancedBufferAttribute;
  private readonly seedAttribute: InstancedBufferAttribute;
  private readonly renderOriginUniform = { value: new Vector2() };
  private readonly windDirectionUniform = { value: new Vector2(0.94, 0.34).normalize() };
  private readonly windStrengthUniform = { value: 1 };
  private readonly timeUniform = { value: 0 };
  private readonly terrainSample = createTerrainSample();
  private readonly surfaceSample = createTerrainSurfaceSample();
  private anchorX = Number.NaN;
  private anchorZ = Number.NaN;
  private previousWindStrength = Number.NaN;
  private distributionCells = 0;
  private distributionDiameter = 0;
  private distributionCursor = 0;
  private pendingActiveCount = 0;
  private previousActiveCount = 0;
  private distributionPending = false;

  constructor(options: CrestDustOptions = {}) {
    this.capacity = Math.max(16, Math.floor(options.capacity ?? 112));
    this.radius = Math.max(120, options.distributionRadius ?? 880);
    this.spacing = Math.max(24, options.candidateSpacing ?? 58);
    this.worlds = new Float32Array(this.capacity * 3);
    this.scales = new Float32Array(this.capacity);
    this.seeds = new Float32Array(this.capacity);
    this.opacities = new Float32Array(this.capacity);

    const positions = new Float32Array([
      -1, -0.22, 0,
      1, -0.22, 0,
      -1, 1.48, 0,
      1, 1.48, 0,
    ]);
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]);
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);
    this.worldAttribute = new InstancedBufferAttribute(this.worlds, 3);
    this.worldAttribute.setUsage(DynamicDrawUsage);
    this.scaleAttribute = new InstancedBufferAttribute(this.scales, 1);
    this.scaleAttribute.setUsage(DynamicDrawUsage);
    this.opacityAttribute = new InstancedBufferAttribute(this.opacities, 1);
    this.opacityAttribute.setUsage(DynamicDrawUsage);
    geometry.setAttribute('iWorld', this.worldAttribute);
    geometry.setAttribute('iScale', this.scaleAttribute);
    this.seedAttribute = new InstancedBufferAttribute(this.seeds, 1);
    this.seedAttribute.setUsage(DynamicDrawUsage);
    geometry.setAttribute('iSeed', this.seedAttribute);
    geometry.setAttribute('iOpacity', this.opacityAttribute);
    geometry.instanceCount = 0;
    geometry.boundingSphere = new Sphere(new Vector3(), 3_200);

    const material = new ShaderMaterial({
      name: 'PodRacing/CrestDust',
      glslVersion: GLSL3,
      vertexShader: CREST_DUST_VERTEX,
      fragmentShader: CREST_DUST_FRAGMENT,
      uniforms: {
        uRenderOrigin: this.renderOriginUniform,
        uWindDirection: this.windDirectionUniform,
        uWindStrength: this.windStrengthUniform,
        uTime: this.timeUniform,
        uDustColor: { value: new Color(options.color ?? '#f3b86e') },
        uRimColor: { value: new Color(options.rimColor ?? '#ffe3a1') },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: NormalBlending,
    });
    material.toneMapped = false;
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = 'Wind-Lifted Dune Crest Dust';
    this.mesh.renderOrder = 28;
    this.mesh.frustumCulled = true;
  }

  update(
    time: number,
    cameraWorldX: number,
    cameraWorldZ: number,
    renderOriginX: number,
    renderOriginZ: number,
    windX: number,
    windZ: number,
    windStrength: number,
  ): void {
    this.timeUniform.value = time;
    this.renderOriginUniform.value.set(renderOriginX, renderOriginZ);
    const windLength = Math.hypot(windX, windZ);
    if (windLength > 1e-4) {
      this.windDirectionUniform.value.set(windX / windLength, windZ / windLength);
    }
    const clampedWind = Math.max(0, Math.min(1.5, windStrength));
    this.windStrengthUniform.value = clampedWind;

    const distributionCell = this.spacing * 3;
    const nextAnchorX = Math.floor(cameraWorldX / distributionCell) * distributionCell;
    const nextAnchorZ = Math.floor(cameraWorldZ / distributionCell) * distributionCell;
    if (
      nextAnchorX !== this.anchorX
      || nextAnchorZ !== this.anchorZ
      || Math.abs(clampedWind - this.previousWindStrength) > 0.12
    ) {
      this.startDistribution(nextAnchorX, nextAnchorZ, clampedWind);
    }
    this.continueDistribution(clampedWind);
  }

  private startDistribution(anchorX: number, anchorZ: number, windStrength: number): void {
    this.anchorX = anchorX;
    this.anchorZ = anchorZ;
    this.previousWindStrength = windStrength;
    this.distributionCells = Math.ceil(this.radius / this.spacing);
    this.distributionDiameter = this.distributionCells * 2 + 1;
    this.distributionCursor = 0;
    this.pendingActiveCount = 0;
    this.previousActiveCount = this.mesh.geometry.instanceCount;
    this.distributionPending = true;
  }

  /** Spreads deterministic crest searching over frames to avoid recenter hitches. */
  private continueDistribution(windStrength: number): void {
    if (!this.distributionPending) return;
    const candidateBudget = 64;
    const totalCandidates = this.distributionDiameter * this.distributionDiameter;
    let processed = 0;
    while (
      processed < candidateBudget
      && this.distributionCursor < totalCandidates
      && this.pendingActiveCount < this.capacity
    ) {
      const cursor = this.distributionCursor;
      this.distributionCursor += 1;
      processed += 1;
      const gridX = cursor % this.distributionDiameter - this.distributionCells;
      const gridZ = Math.floor(cursor / this.distributionDiameter) - this.distributionCells;
      if (
        gridX * gridX + gridZ * gridZ
        > this.distributionCells * this.distributionCells
      ) continue;

      const cellX = Math.floor(this.anchorX / this.spacing) + gridX;
      const cellZ = Math.floor(this.anchorZ / this.spacing) + gridZ;
      const hashA = integerHash(cellX, cellZ);
      const hashB = integerHash(cellX + 971, cellZ - 431);
      const candidateX = (cellX + 0.18 + hashA * 0.64) * this.spacing;
      const candidateZ = (cellZ + 0.18 + hashB * 0.64) * this.spacing;

      // Search across the prevailing wind for the closest sharp lip. This
      // makes the sparse pool visibly track crests instead of random dunes.
      let bestCrest = 0;
      let bestX = candidateX;
      let bestZ = candidateZ;
      for (let probe = -1; probe <= 1; probe += 1) {
        const probeX = candidateX + probe * 11.25;
        const probeZ = candidateZ + probe * 4.05;
        const sample = sampleTerrainSurface(probeX, probeZ, this.surfaceSample);
        if (sample.crest > bestCrest) {
          bestCrest = sample.crest;
          bestX = probeX;
          bestZ = probeZ;
        }
      }

      if (bestCrest < 0.43) continue;
      const terrainSample = sampleTerrain(bestX, bestZ, this.terrainSample);
      const bestStrength = crestDustStrength(terrainSample, windStrength);
      if (bestStrength < 0.055) continue;
      const active = this.pendingActiveCount;
      const write = active * 3;
      this.worlds[write] = bestX;
      this.worlds[write + 1] = terrainSample.height + 0.28;
      this.worlds[write + 2] = bestZ;
      this.scales[active] = 2.8 + hashB * 5.6;
      this.seeds[active] = hashA;
      this.opacities[active] = Math.min(1, 0.28 + bestStrength * 1.45);
      this.pendingActiveCount += 1;
    }

    const complete = this.distributionCursor >= totalCandidates
      || this.pendingActiveCount >= this.capacity;
    this.mesh.geometry.instanceCount = complete
      ? this.pendingActiveCount
      : Math.max(this.previousActiveCount, this.pendingActiveCount);
    this.worldAttribute.needsUpdate = true;
    this.scaleAttribute.needsUpdate = true;
    this.opacityAttribute.needsUpdate = true;
    this.seedAttribute.needsUpdate = true;
    if (complete) this.distributionPending = false;
  }

  /** Rewinds incremental placement so deterministic presets are order-independent. */
  clear(): void {
    this.anchorX = Number.NaN;
    this.anchorZ = Number.NaN;
    this.previousWindStrength = Number.NaN;
    this.distributionCells = 0;
    this.distributionDiameter = 0;
    this.distributionCursor = 0;
    this.pendingActiveCount = 0;
    this.previousActiveCount = 0;
    this.distributionPending = false;
    this.mesh.geometry.instanceCount = 0;
  }

  /** Finishes the bounded incremental search for an exact review frame. */
  settleDistribution(): void {
    let iterations = 0;
    while (this.distributionPending && iterations < 512) {
      this.continueDistribution(this.windStrengthUniform.value);
      iterations += 1;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
