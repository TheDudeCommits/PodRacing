import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  NormalBlending,
  ShaderMaterial,
  Vector3,
} from 'three';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';

const streakVertex = /* glsl */ `
  attribute float aTail;
  attribute float aSeed;
  attribute float aSide;
  attribute float aLength;
  attribute float aWidth;
  attribute float aNear;
  attribute float aReach;
  varying float vAlpha;
  varying float vTail;
  varying float vAcross;
  varying float vSeed;
  varying float vTravel;
  varying vec2 vClipPosition;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uIntensity;
  void main() {
    // Build the slashes directly in camera clip space. World-space strips sit
    // on the desert in a chase view and read as translucent rails; these are
    // graphic animation marks moving radially from the frame's vanishing area.
    // Every stroke sits on a ray from the same elevated vanishing point. The
    // CPU only randomizes where those rays meet a safe screen edge; it never
    // offsets individual strokes sideways, which keeps the flow coherent.
    const vec2 vanishingPoint = vec2(0.0, 0.24);
    vec2 direction = normalize(position.xy);
    vec2 lateral = vec2(-direction.y, direction.x);
    float speedGate = smoothstep(42.0, 132.0, uSpeed);
    float cycle = fract(aSeed + uTime * (0.34 + uSpeed * 0.0018));
    float travel = pow(cycle, 0.78);
    float radius = mix(aNear, aReach, travel);
    float speedScale = mix(0.52, 1.0, speedGate);
    // Distant marks start small at the horizon, then grow decisively as they
    // sweep through the ground plane. This creates parallax instead of a
    // uniform screen overlay.
    float perspectiveScale = mix(0.14, 1.72, pow(travel, 1.45));
    float strokeLength = aLength * speedScale * perspectiveScale;
    // Do not let a newly spawned tail poke through the protected central
    // silhouette area. Farther out, the full slash length is available.
    strokeLength = min(strokeLength, max(0.018, radius - aNear * 0.82));
    vec2 center = vanishingPoint + direction * radius;
    center -= direction * aTail * strokeLength;
    float widthPerspective = mix(0.26, 1.56, pow(travel, 1.2));
    center += lateral * aSide * aWidth * speedScale * widthPerspective;
    gl_Position = vec4(center, -0.72, 1.0);
    vClipPosition = center;
    float phaseGate = step(0.045, cycle) * (1.0 - step(0.965, cycle));
    float nearFieldStrength = mix(0.16, 1.0, pow(travel, 0.92));
    vAlpha = speedGate * phaseGate * nearFieldStrength * uIntensity
      * (0.5 + fract(aSeed * 13.7) * 0.34);
    vTail = aTail;
    vAcross = aSide;
    vSeed = aSeed;
    vTravel = travel;
  }
`;

const streakFragment = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying float vTail;
  varying float vAcross;
  varying float vSeed;
  varying float vTravel;
  varying vec2 vClipPosition;
  uniform vec3 uColor;
  void main() {
    if (vAlpha < 0.03) discard;
    // The streak pass is intentionally depth-independent, so reserve a
    // tapered lower-centre silhouette for the cockpit and its wing panels.
    // This keeps ground-parallax marks beside the vehicle instead of drawing
    // cream paint across it in the close airborne camera.
    float cockpitDepth = clamp((-vClipPosition.y - 0.36) / 0.48, 0.0, 1.0);
    float cockpitHalfWidth = mix(0.26, 0.54, cockpitDepth);
    if (vClipPosition.y < -0.36 && abs(vClipPosition.x) < cockpitHalfWidth) discard;
    // Point both ends of the quad into a hand-inked velocity slash.
    float pointProfile = pow(max(0.0, 1.0 - abs(vTail * 2.0 - 1.0)), 0.34);
    float halfWidth = mix(0.16, 1.0, pointProfile);
    if (abs(vAcross) > halfWidth) discard;
    float opacity = vAlpha * .20 * smoothstep(1.,.3,abs(vAcross));
    if (opacity < 0.03) discard;
    float hotBand = smoothstep(0.25,.8,fract(vSeed * 9.7));
    vec3 depthTone = mix(uColor * 0.62, uColor, step(0.58, vTravel));
    gl_FragColor = vec4(mix(depthTone * 0.9, depthTone, hotBand), opacity);
  }
`;

function hash(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

/** Camera-local graphic sand streak ribbons. One draw call, no particle churn. */
export class SpeedStreaks {
  readonly lines: Mesh<BufferGeometry, ShaderMaterial>;
  private readonly material: ShaderMaterial;

  constructor(count = 88) {
    const vertexCount = count * 4;
    const positions = new Float32Array(vertexCount * 3);
    const tails = new Float32Array(vertexCount);
    const lengths = new Float32Array(vertexCount);
    const seeds = new Float32Array(vertexCount);
    const sides = new Float32Array(vertexCount);
    const widths = new Float32Array(vertexCount);
    const nearDistances = new Float32Array(vertexCount);
    const reaches = new Float32Array(vertexCount);
    const indices = new Uint16Array(count * 6);

    for (let index = 0; index < count; index += 1) {
      // Stratified screen-edge targets leave all four HUD corners and the
      // player's central silhouette clear. Twelve slots make the distribution
      // stable for any pool size while hashes keep the marks hand-scattered.
      const slot = index % 12;
      const verticalScatter = -0.82 + hash(index, 2) * 0.72;
      let targetX: number;
      let targetY: number;
      let nearDistance: number;
      if (slot <= 4) {
        // Left ground flank, below the lap panel and horizon.
        targetX = -1.12 - hash(index, 3) * 0.12;
        targetY = verticalScatter;
        nearDistance = 0.36 + hash(index, 4) * 0.08;
      } else if (slot <= 9) {
        // Right ground flank, below the minimap/corner panels and horizon.
        targetX = 1.12 + hash(index, 3) * 0.12;
        targetY = verticalScatter;
        nearDistance = 0.36 + hash(index, 4) * 0.08;
      } else {
        // Lower skirts frame the vehicle and sell ground parallax.
        const side = slot % 2 === 0 ? -1 : 1;
        targetX = side * (0.66 + hash(index, 3) * 0.2);
        targetY = -1.1 - hash(index, 2) * 0.08;
        nearDistance = 0.84 + hash(index, 4) * 0.08;
      }
      const fromVanishingX = targetX;
      const fromVanishingY = targetY - 0.24;
      const reach = Math.hypot(fromVanishingX, fromVanishingY);
      const x = fromVanishingX / reach;
      const y = fromVanishingY / reach;
      // Tight variation reads as one designed velocity field instead of a
      // collection of unrelated marks.
      // These are punctuation marks, not perspective rails. The two lower
      // skirt slots get the shortest strokes because they grow most on screen.
      const lowerSkirt = slot > 9;
      const length = lowerSkirt
        ? 0.034 + hash(index, 5) * 0.03
        : 0.046 + hash(index, 5) * 0.044;
      const width = 0.0018 + hash(index, 7) * 0.0018;
      for (let corner = 0; corner < 4; corner += 1) {
        const vertex = index * 4 + corner;
        const tail = corner >= 2 ? 1 : 0;
        const side = corner % 2 === 0 ? -1 : 1;
        positions[vertex * 3] = x;
        positions[vertex * 3 + 1] = y;
        positions[vertex * 3 + 2] = 0;
        tails[vertex] = tail;
        lengths[vertex] = length;
        seeds[vertex] = hash(index, 6);
        sides[vertex] = side;
        widths[vertex] = width;
        nearDistances[vertex] = nearDistance;
        reaches[vertex] = reach;
      }
      const vertex = index * 4;
      const write = index * 6;
      indices[write] = vertex;
      indices[write + 1] = vertex + 2;
      indices[write + 2] = vertex + 1;
      indices[write + 3] = vertex + 1;
      indices[write + 4] = vertex + 2;
      indices[write + 5] = vertex + 3;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aTail', new BufferAttribute(tails, 1));
    geometry.setAttribute('aLength', new BufferAttribute(lengths, 1));
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    geometry.setAttribute('aSide', new BufferAttribute(sides, 1));
    geometry.setAttribute('aWidth', new BufferAttribute(widths, 1));
    geometry.setAttribute('aNear', new BufferAttribute(nearDistances, 1));
    geometry.setAttribute('aReach', new BufferAttribute(reaches, 1));
    geometry.setIndex(new BufferAttribute(indices, 1));
    geometry.computeBoundingSphere();

    this.material = new ShaderMaterial({
      name: 'GraphicSpeedStreaks',
      vertexShader: streakVertex,
      fragmentShader: streakFragment,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: DoubleSide,
      blending: NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0 },
        uIntensity: { value: 1 },
        uColor: { value: new Color('#fff0c5') },
      },
    });
    this.lines = new Mesh(geometry, this.material);
    this.lines.name = 'Anime speed grit';
    this.lines.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 36;
  }

  update(time: number, speed: number, _position: Vector3, _yaw: number): void {
    this.material.uniforms.uTime!.value = time;
    this.material.uniforms.uSpeed!.value = speed;
    this.lines.visible = speed > 35 && this.material.uniforms.uIntensity!.value > 0.001;
  }

  setIntensity(intensity: number): void {
    this.material.uniforms.uIntensity!.value = Math.min(
      1,
      Math.max(0, Number.isFinite(intensity) ? intensity : 1),
    );
  }

  dispose(): void {
    this.lines.geometry.dispose();
    this.material.dispose();
  }
}
