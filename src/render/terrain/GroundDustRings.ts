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
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import { sampleTerrainHeight } from './terrainMath';

const GROUND_RING_VERTEX = /* glsl */ `
precision highp float;
in float aRingBand;
in float aRingAngle;
in vec3 iCenter;
in float iRadius;
in float iIntensity;
in float iSeed;
uniform vec2 uRenderOrigin;
uniform float uTime;
out float vRingBand;
out float vRingAngle;
out float vIntensity;
out float vPulse;
out float vSeed;
out float vHeading;
void main() {
  float pulse = fract(uTime * 0.84 + iSeed);
  float expansion = 0.78 + pulse * 0.4;
  // Every probe throws into the same broad desert-wind direction, with enough
  // per-instance jitter that six contacts do not stack into one perfect ring.
  float heading = 0.42 + (iSeed - 0.5) * 0.1;
  vec2 throwDirection = vec2(cos(heading), sin(heading));
  vec3 local = position;
  float ruffle = 1.0
    + sin(aRingAngle * 3.0 + iSeed * 17.0 + floor(pulse * 5.0)) * 0.075;
  local.xz *= iRadius * expansion * ruffle;
  // Stretch the shell downwind and squeeze it across the throw. The six
  // repulsor probes therefore overlap into a low lateral fan instead of six
  // circular stamps around their mechanically symmetric contact points.
  vec2 throwLateral = vec2(-throwDirection.y, throwDirection.x);
  float downwind = dot(local.xz, throwDirection);
  float crosswind = dot(local.xz, throwLateral);
  float lengthVariation = mix(0.82, 1.2, fract(iSeed * 7.31));
  float widthVariation = mix(0.58, 0.74, fract(iSeed * 13.73));
  local.xz = throwDirection * downwind * (1.16 + pulse * 0.34) * lengthVariation
    + throwLateral * crosswind * widthVariation;
  local.xz += throwDirection * iRadius * (0.28 + pulse * 0.4) * iIntensity;
  // A three-band cross section barely lifts the surviving crescent. A tall
  // crown becomes a vertical cardstock spear in a low chase camera.
  float crownProfile = pow(sin(aRingBand * 3.14159265), 0.62);
  float directionalLift = 0.78 + max(0.0, cos(aRingAngle - heading)) * 0.22;
  float crown = crownProfile * directionalLift * (0.036 + iIntensity * 0.052) * iRadius
    * (0.72 + sin(pulse * 3.14159265) * 0.28);
  local.y += crown
    + crownProfile
      * sin(aRingAngle * 3.0 + uTime * 4.0 + iSeed * 11.0)
      * 0.01 * iRadius;
  vec3 center = vec3(iCenter.x - uRenderOrigin.x, iCenter.y, iCenter.z - uRenderOrigin.y);
  vec3 renderPosition = center + local;
  vRingBand = aRingBand;
  vRingAngle = aRingAngle;
  vIntensity = iIntensity;
  vPulse = pulse;
  vSeed = iSeed;
  vHeading = heading;
  gl_Position = projectionMatrix * viewMatrix * vec4(renderPosition, 1.0);
}
`;

const GROUND_RING_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uDustColor;
uniform vec3 uDustInkColor;
in float vRingBand;
in float vRingAngle;
in float vIntensity;
in float vPulse;
in float vSeed;
in float vHeading;
out vec4 fragColor;
void main() {
  float radialShape = step(0.012, vRingBand) * step(vRingBand, 0.988);
  // Ink only the outside silhouette. Inner rims and outlined holes multiply
  // into dark mechanical-looking loops underneath a six-probe vehicle.
  float radialEdge = radialShape * step(0.8, vRingBand);
  float relativeAngle = vRingAngle - vHeading;
  float arcCut = mix(0.04, 0.25, fract(vSeed * 23.7));
  float crescent = step(arcCut, cos(relativeAngle));
  // One continuous low fan per probe survives the dark contact shadow. Shape
  // variation comes from its ruffled geometry and stepped expansion, not from
  // chopping the arc into debris-sized triangles.
  float torn = 1.0;
  float life = floor((1.0 - vPulse) * 4.0) * 0.25;
  float coverage = radialShape * crescent * torn;
  float opacity = coverage * step(0.01, life * vIntensity)
    * (0.62 + step(0.34, life * vIntensity) * 0.18);
  if (opacity < 0.025) discard;
  float hotBand = step(0.34, vRingBand) * (1.0 - step(0.78, vRingBand));
  vec3 body = mix(uDustColor * 0.93, uDustColor, hotBand);
  fragColor = vec4(mix(body, uDustInkColor, radialEdge * 0.92), opacity);
}
`;

export interface GroundDustRingOptions {
  capacity?: number;
  segments?: number;
  color?: ColorRepresentation;
  /** Hover clearance in metres at which contact dust has fully faded. */
  fadeClearance?: number;
}

/**
 * One instanced ring per chassis/engine ground probe. Contact intensity is a
 * depth-difference mask: emitter Y minus the actual analytic terrain height.
 */
export class GroundDustRings {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly capacity: number;

  private readonly fadeClearance: number;
  private readonly centers: Float32Array;
  private readonly radii: Float32Array;
  private readonly intensities: Float32Array;
  private readonly seeds: Float32Array;
  private readonly centerAttribute: InstancedBufferAttribute;
  private readonly radiusAttribute: InstancedBufferAttribute;
  private readonly intensityAttribute: InstancedBufferAttribute;
  private readonly renderOriginUniform = { value: new Vector2() };
  private readonly timeUniform = { value: 0 };
  private activeCount = 0;

  constructor(options: GroundDustRingOptions = {}) {
    this.capacity = Math.max(1, Math.floor(options.capacity ?? 24));
    this.fadeClearance = Math.max(0.25, options.fadeClearance ?? 7.2);
    const segments = Math.max(8, Math.floor(options.segments ?? 32));
    const verticesPerSegment = 6;
    const vertexCount = segments * verticesPerSegment;
    const positions = new Float32Array(vertexCount * 3);
    const bands = new Float32Array(vertexCount);
    const angles = new Float32Array(vertexCount);
    const indices = new Uint16Array(segments * 12);

    for (let segment = 0; segment < segments; segment += 1) {
      const angle0 = segment / segments * Math.PI * 2;
      const angle1 = (segment + 1) / segments * Math.PI * 2;
      const vertex = segment * verticesPerSegment;
      const write = vertex * 3;
      const cos0 = Math.cos(angle0);
      const sin0 = Math.sin(angle0);
      const cos1 = Math.cos(angle1);
      const sin1 = Math.sin(angle1);
      positions[write] = cos0 * 0.66;
      positions[write + 2] = sin0 * 0.66;
      positions[write + 3] = cos0 * 0.8;
      positions[write + 5] = sin0 * 0.8;
      positions[write + 6] = cos0;
      positions[write + 8] = sin0;
      positions[write + 9] = cos1 * 0.66;
      positions[write + 11] = sin1 * 0.66;
      positions[write + 12] = cos1 * 0.8;
      positions[write + 14] = sin1 * 0.8;
      positions[write + 15] = cos1;
      positions[write + 17] = sin1;
      bands[vertex] = 0;
      bands[vertex + 1] = 0.56;
      bands[vertex + 2] = 1;
      bands[vertex + 3] = 0;
      bands[vertex + 4] = 0.56;
      bands[vertex + 5] = 1;
      angles[vertex] = angle0;
      angles[vertex + 1] = angle0;
      angles[vertex + 2] = angle0;
      angles[vertex + 3] = angle1;
      angles[vertex + 4] = angle1;
      angles[vertex + 5] = angle1;
      const index = segment * 12;
      indices[index] = vertex;
      indices[index + 1] = vertex + 3;
      indices[index + 2] = vertex + 1;
      indices[index + 3] = vertex + 1;
      indices[index + 4] = vertex + 3;
      indices[index + 5] = vertex + 4;
      indices[index + 6] = vertex + 1;
      indices[index + 7] = vertex + 4;
      indices[index + 8] = vertex + 2;
      indices[index + 9] = vertex + 2;
      indices[index + 10] = vertex + 4;
      indices[index + 11] = vertex + 5;
    }

    this.centers = new Float32Array(this.capacity * 3);
    this.radii = new Float32Array(this.capacity);
    this.intensities = new Float32Array(this.capacity);
    this.seeds = new Float32Array(this.capacity);
    for (let index = 0; index < this.capacity; index += 1) {
      this.seeds[index] = ((index * 0.61803398875) % 1 + 1) % 1;
    }

    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aRingBand', new BufferAttribute(bands, 1));
    geometry.setAttribute('aRingAngle', new BufferAttribute(angles, 1));
    this.centerAttribute = new InstancedBufferAttribute(this.centers, 3);
    this.centerAttribute.setUsage(DynamicDrawUsage);
    this.radiusAttribute = new InstancedBufferAttribute(this.radii, 1);
    this.radiusAttribute.setUsage(DynamicDrawUsage);
    this.intensityAttribute = new InstancedBufferAttribute(this.intensities, 1);
    this.intensityAttribute.setUsage(DynamicDrawUsage);
    geometry.setAttribute('iCenter', this.centerAttribute);
    geometry.setAttribute('iRadius', this.radiusAttribute);
    geometry.setAttribute('iIntensity', this.intensityAttribute);
    geometry.setAttribute('iSeed', new InstancedBufferAttribute(this.seeds, 1));
    geometry.setIndex(new BufferAttribute(indices, 1));
    geometry.instanceCount = 0;
    geometry.boundingSphere = new Sphere(new Vector3(), 3_200);

    const material = new ShaderMaterial({
      name: 'PodRacing/GroundContactDust',
      glslVersion: GLSL3,
      vertexShader: GROUND_RING_VERTEX,
      fragmentShader: GROUND_RING_FRAGMENT,
      uniforms: {
        uRenderOrigin: this.renderOriginUniform,
        uTime: this.timeUniform,
        uDustColor: { value: new Color(options.color ?? '#f0ad68') },
        uDustInkColor: { value: new Color('#55283a') },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: NormalBlending,
    });
    material.toneMapped = false;
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = 'Repulsorlift Ground Dust Rings';
    this.mesh.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    this.mesh.frustumCulled = true;
    this.mesh.renderOrder = 30;
  }

  beginFrame(): void {
    this.activeCount = 0;
  }

  emitContact(
    worldX: number,
    emitterY: number,
    worldZ: number,
    radius: number,
    thrust: number,
  ): void {
    if (this.activeCount >= this.capacity || thrust <= 0 || radius <= 0) return;
    const ground = sampleTerrainHeight(worldX, worldZ);
    const clearance = Math.max(0, emitterY - ground);
    const proximity = Math.max(0, Math.min(1, 1 - clearance / this.fadeClearance));
    const intensity = Math.max(0, Math.min(1, thrust)) * proximity;
    if (intensity < 0.015) return;

    const index = this.activeCount;
    const center = index * 3;
    this.centers[center] = worldX;
    this.centers[center + 1] = ground + 0.13;
    this.centers[center + 2] = worldZ;
    this.radii[index] = radius * (0.58 + intensity * 0.25);
    this.intensities[index] = intensity;
    this.activeCount += 1;
  }

  commit(time: number, renderOriginX: number, renderOriginZ: number): void {
    this.timeUniform.value = time;
    this.renderOriginUniform.value.set(renderOriginX, renderOriginZ);
    this.mesh.geometry.instanceCount = this.activeCount;
    if (this.activeCount > 0) {
      this.centerAttribute.needsUpdate = true;
      this.radiusAttribute.needsUpdate = true;
      this.intensityAttribute.needsUpdate = true;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
