import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  GLSL3,
  Mesh,
  NormalBlending,
  ShaderMaterial,
  Sphere,
  Vector3,
  type ColorRepresentation,
} from 'three';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import { sampleTerrainHeight } from './terrainMath';

const WAKE_VERTEX_SHADER = /* glsl */ `
precision highp float;
in float aWakeAlpha;
in float aWakeEdge;
in float aWakeAge;
in float aWakeNoise;
in float aWakeAlong;
in float aWakeTrail;
out float vWakeAlpha;
out float vWakeEdge;
out float vWakeAge;
out float vWakeNoise;
out float vWakeAlong;
out float vWakeTrail;
void main() {
  vWakeAlpha = aWakeAlpha;
  vWakeEdge = aWakeEdge;
  vWakeAge = aWakeAge;
  vWakeNoise = aWakeNoise;
  vWakeAlong = aWakeAlong;
  vWakeTrail = aWakeTrail;
  // Lift each suspended bank on a different slow phase. The displacement is
  // deliberately small and quantized-looking from the chase lens, but it
  // stops the wake from reading as flat decals painted onto the terrain.
  vec3 wakePosition = position;
  float bankLift = (sin(aWakeAlong * 0.117 + aWakeNoise * 7.3) * 0.5 + 0.5)
    * (0.08 + aWakeAge * 0.46);
  wakePosition.y += bankLift;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(wakePosition, 1.0);
}
`;

const WAKE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
uniform vec3 uWakeColor;
uniform vec3 uWakeHotColor;
uniform vec3 uWakeInkColor;
uniform float uElevatedView;
in float vWakeAlpha;
in float vWakeEdge;
in float vWakeAge;
in float vWakeNoise;
in float vWakeAlong;
in float vWakeTrail;
out vec4 fragColor;
void main() {
  float across = abs(vWakeEdge);
  // The geometry is one continuous paired-edge strip. These incommensurate
  // fields erode each outside shoulder independently. The two sides use
  // deliberately unrelated phases, preventing the wake from reading as a
  // mirrored translucent road while retaining one uninterrupted mesh.
  float side = step(0.0, vWakeEdge);
  float sidePhase = mix(1.17, 4.91, side);
  float slowTear = sin(
    vWakeAlong * 0.137
    + sin(vWakeAlong * 0.047 + sidePhase) * 1.65
    + sidePhase
  );
  float fastBite = sin(
    vWakeAlong * 0.41
    + sin(vWakeAlong * 0.173 + sidePhase * 0.73) * 0.86
    + sidePhase * 2.3
  );
  float tooth = pow(max(0.0, fastBite * 0.5 + 0.5), 5.0);
  float tearField = clamp(
    0.5 + slowTear * 0.31 + fastBite * 0.19,
    0.0,
    1.0
  );
  float tornLimit = 0.965
    - tearField * (0.085 + vWakeAge * 0.135)
    - tooth * (0.045 + vWakeAge * 0.065);
  float silhouette = 1.0 - step(tornLimit, across);

  float coverage = silhouette;

  // Old trail sections break into broad, hard-edged dust islands instead of
  // remaining two continuous painted rails. Two unrelated fields keep the
  // paired engine plumes from opening and closing in lockstep.
  float chunkField = clamp(
    0.5
    + sin(vWakeAlong * 0.47 + sidePhase * 1.37 + vWakeNoise * 5.9) * 0.27
    + sin(vWakeAlong * 1.13 - sidePhase * 2.11 + vWakeNoise * 9.1) * 0.15
    + sin(vWakeAlong * 0.173 + sidePhase * 3.73) * 0.12,
    0.0,
    1.0
  );
  float chunkMask = step(0.5 + vWakeAge * 0.1, chunkField);
  coverage *= mix(
    1.0,
    chunkMask,
    smoothstep(0.08, 0.52, vWakeTrail) * 0.68
  );
  // Guarantee breathing space between dust banks. Relying on a thresholded
  // sum alone can occasionally leave an entire warm-start ribbon above the
  // threshold, which reads as an opaque pair of rails from a chase camera.
  // The warped phase creates short, uneven cloud islands without exposing the
  // underlying triangle segmentation.
  float islandPhase = fract(
    vWakeAlong * (0.108 + vWakeNoise * 0.022)
    + sin(vWakeAlong * 0.037 + sidePhase) * 0.16
    + sidePhase * 0.13
  );
  float breathingGap = step(
    0.24 + sin(vWakeAlong * 0.071 + sidePhase * 2.7) * 0.055,
    islandPhase
  );
  coverage *= mix(
    1.0,
    breathingGap,
    smoothstep(0.08, 0.34, vWakeTrail) * 0.58
  );
  // Occasionally punch all the way through both density fields. Fully clear,
  // irregular notches keep the strengthened plume from becoming a painted
  // lane, while the independently phased left/right fields preserve two
  // distinct engine wakes rather than one symmetrical road marking.
  float hardGap = (1.0 - chunkMask)
    * (1.0 - breathingGap)
    * step(0.24, vWakeTrail);
  coverage *= 1.0 - hardGap;
  // Beyond the dense engine-adjacent head, resolve the ribbon into broad
  // tapered lobes. A binary longitudinal mask produced rectangular road
  // tiles; the sine envelope below narrows every bank toward independently
  // warped caps while retaining complete negative space between banks.
  float bankPhase = fract(
    vWakeAlong * (0.082 + vWakeNoise * 0.009)
    + sin(vWakeAlong * 0.047 + vWakeNoise * 5.7) * 0.15
    + sin(vWakeAlong * 0.119 - vWakeNoise * 2.9) * 0.045
    + vWakeNoise * 0.61
  );
  float bankFloor = 0.12;
  float bankCeiling = 0.74;
  float bankSpan = bankCeiling - bankFloor;
  float bankT = clamp((bankPhase - bankFloor) / bankSpan, 0.0, 1.0);
  float capEnvelope = pow(max(0.0, sin(bankT * 3.14159265)), 0.48);

  // The centre and shoulders advance by slightly different amounts, making
  // curved anime dust caps instead of straight cross-track cuts. The maximum
  // warp is far smaller than the empty half-cycle, so opposite shoulders can
  // never bridge a real gap back into a rail.
  float capCurl = vWakeEdge * (
    0.052
    + sin(vWakeAlong * 0.173 + vWakeNoise * 8.1) * 0.024
  ) + (1.0 - across)
    * sin(vWakeAlong * 0.287 + vWakeNoise * 4.3) * 0.038;
  float warpedPhase = fract(bankPhase + capCurl);
  float shapedBank = step(bankFloor, warpedPhase)
    * (1.0 - step(bankCeiling, warpedPhase));
  float fullBank = step(bankFloor - 0.08, bankPhase)
    * (1.0 - step(bankCeiling + 0.08, bankPhase));

  // Bank width swells quickly through the body, then collapses into torn
  // wisps at each end. A second unequal field prevents both lanes from
  // sharing the same repeated silhouette even when their centres run parallel.
  float lobeWidth = (0.12 + capEnvelope * 0.88)
    * (0.84 + sin(vWakeAlong * 0.193 + vWakeNoise * 9.7) * 0.12);
  float taperedSilhouette = 1.0 - step(lobeWidth, across);
  float innerBite = step(
    0.86,
    sin(vWakeAlong * 0.371 + vWakeNoise * 11.3 + vWakeEdge * 2.1) * 0.5 + 0.5
  ) * step(0.58, across);
  float dustIsland = fullBank
    * shapedBank
    * taperedSilhouette
    * (1.0 - innerBite);
  coverage *= mix(
    1.0,
    dustIsland,
    smoothstep(0.003, 0.014, vWakeTrail)
  );

  // Broad, warped density cells break up the interior without cutting the
  // connected strip into modules. Quantizing the result preserves the anime
  // ink-and-paint character and avoids soft alpha-noise fog.
  float fillDomain = vWakeAlong * 0.073
    + sin(vWakeAlong * 0.027 + vWakeEdge * 3.1) * 1.55;
  float fillField = clamp(
    0.5
    + sin(fillDomain + vWakeEdge * 4.8 + sidePhase * 0.41) * 0.29
    + sin(
      vWakeAlong * 0.167
      - vWakeEdge * 7.3
      + sin(fillDomain * 0.63) * 1.2
    ) * 0.21,
    0.0,
    1.0
  );
  float fillBand = 0.61
    + step(0.28, fillField) * 0.13
    + step(0.55, fillField) * 0.13
    + step(0.78, fillField) * 0.11;
  // Keep the engine-adjacent head dense; breakup grows as suspended dust ages.
  fillBand = mix(fillBand, 0.92, (1.0 - smoothstep(0.05, 0.3, vWakeAge)) * 0.62);

  // Independently torn head/tail thresholds remove both rectangular camera
  // terminals and pointed capacity ends. Fade happens inside the continuous
  // strip, so no geometry edge is ever exposed as an art-directed cap.
  float capWarp = sin(vWakeNoise * 8.7 + vWakeEdge * 2.6) * 0.5 + 0.5;
  float headStart = capWarp * 0.004;
  float tailStart = 0.58 + capWarp * 0.09;
  float headFade = mix(
    1.0,
    smoothstep(headStart, headStart + 0.012, vWakeTrail),
    uElevatedView
  );
  float endFade = headFade
    * (1.0 - smoothstep(tailStart, tailStart + 0.11, vWakeTrail));

  // Opacity decays continuously so the tail dissolves as a plume instead of
  // exposing one repeated alpha rectangle per submitted segment.
  float opacity = coverage
    * clamp(0.18 + vWakeAlpha * 0.8, 0.0, 0.9)
    * fillBand
    * endFade;
  float billow = sin(
    vWakeAlong * 0.057
    + sin(vWakeAlong * 0.021 + vWakeNoise * 5.7) * 1.7
    + vWakeEdge * 1.35
  ) * 0.5 + 0.5;
  opacity *= mix(0.62 + billow * 0.38, 1.0, 1.0 - smoothstep(0.2, 0.82, vWakeAge));
  // From the elevated course camera, translucent dust exposed the terrain's
  // ink contours through each narrow engine ribbon. Those contours resembled
  // broken vehicle wireframes. Treat the same trail as a denser flat-painted
  // dust bank from above while retaining age/strength dissipation and torn
  // shoulders; low chase cameras keep the lighter parallax treatment.
  float elevatedOpacity = coverage
    * endFade
    * clamp(vWakeAlpha * 1.65, 0.0, 1.0)
    * mix(0.72, 0.94, 1.0 - vWakeAge);
  opacity = mix(opacity, elevatedOpacity, uElevatedView);
  if (opacity < 0.028) discard;

  // Anime dust reads as a few deliberate paint values rather than a smooth
  // transparent veil. Quantizing the surviving density makes the twin plumes
  // hold up against similarly coloured sand at high speed and Retina scale.
  float opacityBand = step(0.028, opacity) * 0.28
    + step(0.16, opacity) * 0.18
    + step(0.34, opacity) * 0.17
    + step(0.56, opacity) * 0.13;
  // The engine-adjacent cross-sections previously received the same hard
  // opacity quantization as suspended banks. Against the contact shadows that
  // made the nearest dust read as opaque comma/footprint stamps. Let the first
  // few metres stay soft, then restore cel density once the plume has lifted.
  float liftedFromEngine = smoothstep(0.035, 0.13, vWakeTrail);
  float quantizeWeight = mix(
    mix(0.12, 0.44, liftedFromEngine),
    mix(0.2, 0.36, liftedFromEngine),
    uElevatedView
  );
  opacity = mix(opacity, opacityBand, quantizeWeight);
  float suspendedEnvelope = smoothstep(0.045, 0.16, vWakeTrail)
    * (1.0 - smoothstep(0.46, 0.72, vWakeTrail));
  opacity *= mix(0.34, 1.0, smoothstep(0.012, 0.09, vWakeTrail));
  opacity *= 1.0 + suspendedEnvelope * 0.12;
  if (opacity < 0.015) discard;

  // The base hue shifts with age; cell variation below remains two-dimensional
  // so it cannot resolve into a centerline or parallel rails.
  vec3 lowBody = mix(uWakeColor, uWakeHotColor, 0.14 - vWakeAge * 0.04);
  vec3 highBody = mix(
    uWakeHotColor,
    vec3(1.0, 0.94, 0.72),
    0.55 + vWakeAge * 0.2
  );
  vec3 body = mix(lowBody, highBody, uElevatedView);
  float engineHeadBlend = 1.0 - smoothstep(0.025, 0.12, vWakeTrail);
  body = mix(body, uWakeHotColor, engineHeadBlend * 0.12);
  float hotCore = 1.0 - step(
    0.46 + sin(vWakeAlong * 0.17 + sidePhase) * 0.06,
    across
  );
  body = mix(body, uWakeHotColor, hotCore * (0.26 + vWakeAge * 0.08));
  // Sparse hot mineral cells create nonuniform interior fill without a ruled
  // centerline or repeating cross-strip band.
  float hotCell = step(0.69, fillField) * (1.0 - step(0.86, across));
  body = mix(body, uWakeHotColor, hotCell * (0.2 + vWakeAge * 0.08));
  // A broken deep-toned shoulder supplies the ink edge that a translucent
  // ground effect cannot get from the global outline pass. It follows the
  // torn silhouette and therefore reads as dust lobes, never parallel rails.
  float inkShoulder = step(0.72 + sin(vWakeAlong * 0.19 + sidePhase) * 0.055, across);
  float liftedInk = smoothstep(0.055, 0.18, vWakeTrail);
  body = mix(
    body,
    uWakeInkColor,
    inkShoulder * (0.055 + vWakeAge * 0.035) * liftedInk
  );
  // The hard torn silhouette supplies the cel edge without drawing rail lines
  // or exposing the triangles that make up the strip.
  fragColor = vec4(body, opacity);
}
`;

// One paired edge per sample forms an actual continuous triangle strip for
// each engine lane. All cel breakup happens in the shader, never as modules.
const WAKE_EDGES = [-1, 1] as const;
const WAKE_VERTICES_PER_SAMPLE = WAKE_EDGES.length;

export interface WakeRibbonOptions {
  maxRacers?: number;
  samplesPerTrail?: number;
  lifetime?: number;
  minimumSpacing?: number;
  /** Horizontal gap around the camera that prevents near-plane ribbon slivers. */
  cameraExclusionRadius?: number;
  color?: ColorRepresentation;
}

/** Fixed-capacity, single-draw-call twin wake ribbons for every racer. */
export class WakeRibbons {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;

  private readonly maxRacers: number;
  private readonly capacity: number;
  private readonly lifetime: number;
  private readonly minimumSpacingSquared: number;
  private readonly cameraExclusionRadius: number;
  private readonly stripCount: number;
  private readonly sourceX: Float64Array;
  private readonly sourceZ: Float64Array;
  private readonly sourceTime: Float32Array;
  private readonly sourceStrength: Float32Array;
  private readonly sourceAlong: Float32Array;
  private readonly heads: Int16Array;
  private readonly counts: Uint16Array;
  private readonly positions: Float32Array;
  private readonly alphas: Float32Array;
  private readonly edges: Float32Array;
  private readonly ages: Float32Array;
  private readonly noise: Float32Array;
  private readonly along: Float32Array;
  private readonly trail: Float32Array;
  private readonly positionAttribute: BufferAttribute;
  private readonly alphaAttribute: BufferAttribute;
  private readonly ageAttribute: BufferAttribute;
  private readonly noiseAttribute: BufferAttribute;
  private readonly alongAttribute: BufferAttribute;
  private readonly trailAttribute: BufferAttribute;
  private readonly indices: Uint32Array;
  private readonly indexAttribute: BufferAttribute;

  constructor(options: WakeRibbonOptions = {}) {
    this.maxRacers = Math.max(1, Math.floor(options.maxRacers ?? 4));
    this.capacity = Math.max(8, Math.floor(options.samplesPerTrail ?? 56));
    this.lifetime = Math.max(0.5, options.lifetime ?? 4.6);
    const spacing = Math.max(0.1, options.minimumSpacing ?? 0.75);
    this.minimumSpacingSquared = spacing * spacing;
    // The chase camera lives inside the player's wake. Keep the closest shell
    // cells out of its frustum so perspective cannot stretch them into giant
    // foreground wedges; the visible trail begins as a clean dust bank beyond
    // the camera and remains persistent for the full lifetime.
    const cameraExclusionRadius = Math.max(2, options.cameraExclusionRadius ?? 46);
    this.cameraExclusionRadius = cameraExclusionRadius;
    this.stripCount = this.maxRacers * 2;
    const sourceCount = this.stripCount * this.capacity;
    const vertexCount = sourceCount * WAKE_VERTICES_PER_SAMPLE;

    this.sourceX = new Float64Array(sourceCount);
    this.sourceZ = new Float64Array(sourceCount);
    this.sourceTime = new Float32Array(sourceCount);
    this.sourceStrength = new Float32Array(sourceCount);
    this.sourceAlong = new Float32Array(sourceCount);
    this.heads = new Int16Array(this.stripCount);
    this.heads.fill(-1);
    this.counts = new Uint16Array(this.stripCount);
    this.positions = new Float32Array(vertexCount * 3);
    this.alphas = new Float32Array(vertexCount);
    this.edges = new Float32Array(vertexCount);
    this.ages = new Float32Array(vertexCount);
    this.noise = new Float32Array(vertexCount);
    this.trail = new Float32Array(vertexCount);

    this.indices = new Uint32Array(
      this.stripCount
      * (this.capacity - 1)
      * 6,
    );

    for (let source = 0; source < sourceCount; source += 1) {
      for (let edgeIndex = 0; edgeIndex < WAKE_VERTICES_PER_SAMPLE; edgeIndex += 1) {
        this.edges[source * WAKE_VERTICES_PER_SAMPLE + edgeIndex]
          = WAKE_EDGES[edgeIndex] ?? 0;
      }
    }

    const geometry = new BufferGeometry();
    this.positionAttribute = new BufferAttribute(this.positions, 3);
    this.positionAttribute.setUsage(DynamicDrawUsage);
    this.alphaAttribute = new BufferAttribute(this.alphas, 1);
    this.alphaAttribute.setUsage(DynamicDrawUsage);
    const edgeAttribute = new BufferAttribute(this.edges, 1);
    this.ageAttribute = new BufferAttribute(this.ages, 1);
    this.ageAttribute.setUsage(DynamicDrawUsage);
    this.noiseAttribute = new BufferAttribute(this.noise, 1);
    this.noiseAttribute.setUsage(DynamicDrawUsage);
    this.along = new Float32Array(vertexCount);
    this.alongAttribute = new BufferAttribute(this.along, 1);
    this.alongAttribute.setUsage(DynamicDrawUsage);
    this.trailAttribute = new BufferAttribute(this.trail, 1);
    this.trailAttribute.setUsage(DynamicDrawUsage);
    geometry.setAttribute('position', this.positionAttribute);
    geometry.setAttribute('aWakeAlpha', this.alphaAttribute);
    geometry.setAttribute('aWakeEdge', edgeAttribute);
    geometry.setAttribute('aWakeAge', this.ageAttribute);
    geometry.setAttribute('aWakeNoise', this.noiseAttribute);
    geometry.setAttribute('aWakeAlong', this.alongAttribute);
    geometry.setAttribute('aWakeTrail', this.trailAttribute);
    this.indexAttribute = new BufferAttribute(this.indices, 1);
    this.indexAttribute.setUsage(DynamicDrawUsage);
    geometry.setIndex(this.indexAttribute);
    geometry.setDrawRange(0, 0);
    geometry.boundingSphere = new Sphere(new Vector3(), 3_200);

    const material = new ShaderMaterial({
      name: 'PodRacing/TwinWakeRibbons',
      glslVersion: GLSL3,
      vertexShader: WAKE_VERTEX_SHADER,
      fragmentShader: WAKE_FRAGMENT_SHADER,
      uniforms: {
        uWakeColor: { value: new Color(options.color ?? '#c9573f') },
        uWakeHotColor: { value: new Color('#ffd08b') },
        uWakeInkColor: { value: new Color('#713949') },
        uElevatedView: { value: 0 },
      },
      transparent: true,
      side: DoubleSide,
      depthWrite: false,
      depthTest: true,
      blending: NormalBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
    material.toneMapped = false;
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = 'Persistent Twin Sand Wakes';
    this.mesh.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    this.mesh.frustumCulled = true;
    this.mesh.renderOrder = 31;
  }

  pushPair(
    racerIndex: number,
    leftWorldX: number,
    leftWorldZ: number,
    rightWorldX: number,
    rightWorldZ: number,
    strength: number,
    time: number,
  ): void {
    if (racerIndex < 0 || racerIndex >= this.maxRacers) return;
    const clampedStrength = Math.max(0, Math.min(1, strength));
    const leftStrip = racerIndex * 2;
    const rightStrip = leftStrip + 1;

    // A capture reset or high-speed respawn can begin with a racer already at
    // 400+ KPH. Warm-start a short direction-correct history so the persistent
    // effect does not pop in one sample at a time. The vector between engine
    // origins is the racer lateral axis; its perpendicular is forward.
    if (
      clampedStrength > 0.35
      && (this.counts[leftStrip] ?? 0) === 0
      && (this.counts[rightStrip] ?? 0) === 0
    ) {
      const lateralX = rightWorldX - leftWorldX;
      const lateralZ = rightWorldZ - leftWorldZ;
      const lateralLength = Math.hypot(lateralX, lateralZ);
      if (lateralLength > 1e-4) {
        const forwardX = -lateralZ / lateralLength;
        const forwardZ = lateralX / lateralLength;
        const backfillCount = Math.min(this.capacity - 1, 52);
        // The deterministic first frame may already be travelling at race
        // speed. Seed enough spatial history to continue beyond a chase lens
        // instead of ending underneath it as three or four isolated curls.
        const spacing = Math.max(
          1.25,
          Math.sqrt(this.minimumSpacingSquared) * 1.16,
        );
        const lateralUnitX = lateralX / lateralLength;
        const lateralUnitZ = lateralZ / lateralLength;
        for (let sample = backfillCount; sample >= 1; sample -= 1) {
          const distance = sample * spacing;
          // Seed an already-moving craft with an irregular suspended path,
          // not two mathematically straight paint strips. Both lanes share a
          // broad turbulent drift and carry a smaller independent curl.
          const broadWander = (
            Math.sin(sample * 0.47 + racerIndex * 1.73) * 2.7
            + Math.sin(sample * 0.19 + racerIndex * 3.11) * 1.35
          ) * Math.min(1, distance / 26);
          const leftCurl = Math.sin(sample * 0.83 + 0.71) * Math.min(1.1, distance * 0.028);
          const rightCurl = Math.sin(sample * 0.91 + 3.17) * Math.min(1.1, distance * 0.028);
          const historyStrength = clampedStrength * (
            0.62 + (1 - sample / Math.max(1, backfillCount)) * 0.36
          );
          const historyTime = time - sample * 0.018;
          this.pushPoint(
            leftStrip,
            leftWorldX - forwardX * distance + lateralUnitX * (broadWander + leftCurl),
            leftWorldZ - forwardZ * distance + lateralUnitZ * (broadWander + leftCurl),
            historyStrength,
            historyTime,
          );
          this.pushPoint(
            rightStrip,
            rightWorldX - forwardX * distance + lateralUnitX * (broadWander + rightCurl),
            rightWorldZ - forwardZ * distance + lateralUnitZ * (broadWander + rightCurl),
            historyStrength,
            historyTime,
          );
        }
      }
    }

    this.pushPoint(leftStrip, leftWorldX, leftWorldZ, clampedStrength, time);
    this.pushPoint(rightStrip, rightWorldX, rightWorldZ, clampedStrength, time);
  }

  private pushPoint(
    strip: number,
    x: number,
    z: number,
    strength: number,
    time: number,
  ): void {
    const previousHead = this.heads[strip] ?? -1;
    const stripOffset = strip * this.capacity;
    let distanceFromPrevious = 0;
    if (previousHead >= 0) {
      const previousIndex = stripOffset + previousHead;
      const dx = x - (this.sourceX[previousIndex] ?? 0);
      const dz = z - (this.sourceZ[previousIndex] ?? 0);
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared < this.minimumSpacingSquared) {
        // Keep the accepted anchor fixed so sub-spacing fixed steps accumulate
        // into a new sample. Moving the anchor every tick would make a fast,
        // high-frequency producer perpetually replace sample zero.
        this.sourceStrength[previousIndex] = Math.max(
          this.sourceStrength[previousIndex] ?? 0,
          strength,
        );
        return;
      }
      distanceFromPrevious = Math.sqrt(distanceSquared);
    }

    const head = (previousHead + 1) % this.capacity;
    const sourceIndex = stripOffset + head;
    this.sourceX[sourceIndex] = x;
    this.sourceZ[sourceIndex] = z;
    this.sourceTime[sourceIndex] = time;
    this.sourceStrength[sourceIndex] = strength;
    this.sourceAlong[sourceIndex] = previousHead >= 0
      ? (this.sourceAlong[stripOffset + previousHead] ?? 0) + distanceFromPrevious
      : 0;
    this.heads[strip] = head;
    this.counts[strip] = Math.min(this.capacity, (this.counts[strip] ?? 0) + 1);
  }

  update(
    time: number,
    renderOriginX: number,
    renderOriginZ: number,
    cameraWorldX = Number.POSITIVE_INFINITY,
    cameraWorldZ = Number.POSITIVE_INFINITY,
    cameraWorldY = Number.POSITIVE_INFINITY,
    lowCameraView?: boolean,
  ): void {
    let indexCursor = 0;
    const hasCameraExclusion = Number.isFinite(cameraWorldX) && Number.isFinite(cameraWorldZ);
    const hasCameraHeight = Number.isFinite(cameraWorldY);
    const cameraElevation = hasCameraExclusion && hasCameraHeight
      ? cameraWorldY - sampleTerrainHeight(cameraWorldX, cameraWorldZ)
      : 0;
    this.mesh.material.uniforms.uElevatedView!.value = lowCameraView === true
      ? 0
      : cameraElevation >= 22 ? 1 : 0;
    for (let strip = 0; strip < this.stripCount; strip += 1) {
      // The chase camera sits inside the player's trail corridor, while rival
      // wakes are viewed ahead of it. Give only the player pair a wider safety
      // pocket; rival plumes can remain visibly attached to their engines.
      const stripExclusionRadius = this.cameraExclusionRadius
        * (strip < 2 ? 1.4 : 1.0);
      const count = this.counts[strip] ?? 0;
      const head = this.heads[strip] ?? -1;
      const sourceOffset = strip * this.capacity;
      const vertexOffset = strip * this.capacity * WAKE_VERTICES_PER_SAMPLE;
      let fallbackX = 0;
      let fallbackZ = 0;
      let newestX = 0;
      let newestZ = 0;
      let trailDirectionX = 0;
      let trailDirectionZ = 0;
      let cameraProgressFromNewest = Number.POSITIVE_INFINITY;
      if (hasCameraExclusion && count > 1 && head >= 0) {
        const newestIndex = sourceOffset + head;
        const previousRing = (head - 1 + this.capacity) % this.capacity;
        const previousIndex = sourceOffset + previousRing;
        newestX = this.sourceX[newestIndex] ?? 0;
        newestZ = this.sourceZ[newestIndex] ?? 0;
        const previousX = this.sourceX[previousIndex] ?? newestX;
        const previousZ = this.sourceZ[previousIndex] ?? newestZ;
        const directionLength = Math.hypot(newestX - previousX, newestZ - previousZ);
        if (directionLength > 1e-4) {
          trailDirectionX = (newestX - previousX) / directionLength;
          trailDirectionZ = (newestZ - previousZ) / directionLength;
          cameraProgressFromNewest = (
            (cameraWorldX - newestX) * trailDirectionX
            + (cameraWorldZ - newestZ) * trailDirectionZ
          );
        }
      }

      for (let ordered = 0; ordered < this.capacity; ordered += 1) {
        let worldX = fallbackX;
        let worldZ = fallbackZ;
        let alpha = 0;
        let normalizedAge = 1;
        let perpendicularX = 1;
        let perpendicularZ = 0;
        let width = 0.1;
        let cameraFade = 1;
        let wakeNoise = 0;
        let wakeAlong = 0;
        let wakeTrail = 1;
        let groundY = 0;

        if (ordered < count && head >= 0) {
          const ringIndex = (head - (count - 1 - ordered) + this.capacity) % this.capacity;
          const sourceIndex = sourceOffset + ringIndex;
          worldX = this.sourceX[sourceIndex] ?? 0;
          worldZ = this.sourceZ[sourceIndex] ?? 0;
          fallbackX = worldX;
          fallbackZ = worldZ;
          const age = Math.max(0, time - (this.sourceTime[sourceIndex] ?? time));
          normalizedAge = Math.min(1, age / this.lifetime);
          const life = 1 - normalizedAge;
          // Fixed-capacity trails at racing speed cover substantial distance
          // before clock age alone becomes visually useful. Blend chronological
          // age with distance down the live trail so even warm-start and finish
          // tableaux show progressive spread and dissipation.
          const trailAge = count > 1
            ? 1 - ordered / Math.max(1, count - 1)
            : 0;
          wakeTrail = trailAge;
          const visualAge = Math.max(normalizedAge, trailAge * 0.82);
          const ageLoss = Math.pow(Math.max(0, 1 - trailAge), 0.72);
          // Continuous, incommensurate waves replace per-sample hashing. The
          // latter made every triangle join change width and opacity abruptly,
          // exposing the strip as a row of translucent polygon modules.
          wakeAlong = this.sourceAlong[sourceIndex] ?? 0;
          const cellNoise = Math.max(0, Math.min(1,
            0.5
            + Math.sin(wakeAlong * 0.083 + strip * 1.91) * 0.29
            + Math.sin(wakeAlong * 0.031 + strip * 4.37) * 0.21,
          ));
          wakeNoise = cellNoise;
          alpha = (this.sourceStrength[sourceIndex] ?? 0)
            * Math.pow(life, 1.72)
            * ageLoss
            * (0.94 + cellNoise * 0.06);

          let neighborOrdered = ordered > 0 ? ordered - 1 : ordered + 1;
          if (neighborOrdered >= count) neighborOrdered = ordered;
          const neighborRing = (
            head - (count - 1 - neighborOrdered) + this.capacity
          ) % this.capacity;
          const neighborIndex = sourceOffset + neighborRing;
          let directionX = worldX - (this.sourceX[neighborIndex] ?? worldX);
          let directionZ = worldZ - (this.sourceZ[neighborIndex] ?? worldZ);
          const directionLength = Math.hypot(directionX, directionZ);
          if (directionLength > 1e-4) {
            directionX /= directionLength;
            directionZ /= directionLength;
            perpendicularX = -directionZ;
            perpendicularZ = directionX;
          }
          // Repulsorlift dust is thrown outward by each pod. Preserve a shared
          // turbulent meander, then give the two lanes opposite divergence and
          // unrelated curls. The pair remains recognisably attached at the
          // engine heads but opens around a chase lens instead of converging
          // into a centre rail or disappearing directly beneath the camera.
          const racerPair = Math.floor(strip * 0.5);
          const laneOutward = strip % 2 === 0 ? 1 : -1;
          const spreadAge = Math.pow(visualAge, 0.62);
          const outwardThrow = laneOutward * spreadAge * 7.65;
          const sharedMeander = (
            Math.sin(wakeAlong * 0.061 + racerPair * 2.37) * 2.3
            + Math.sin(wakeAlong * 0.027 + racerPair * 4.11) * 1.05
          ) * spreadAge;
          const laneCurl = (
            Math.sin(wakeAlong * 0.223 + strip * 2.13) * 3.15
            + Math.sin(wakeAlong * 0.417 + strip * 0.71) * 1.25
          ) * Math.pow(visualAge, 0.58);
          const twist = outwardThrow + sharedMeander + laneCurl;
          worldX += perpendicularX * twist;
          worldZ += perpendicularZ * twist;
          groundY = sampleTerrainHeight(worldX, worldZ);
          const scallop = Math.pow(
            Math.abs(Math.sin(visualAge * Math.PI * 8.7 + strip * 0.41)),
            0.42,
          );
          // Each engine lane starts compact, then spreads into a broad dusty
          // ribbon with independently torn shoulders. Sparse gaps and opacity
          // loss keep the expanded tails from combining into a ground sheet.
          width = (
            1.22 + Math.pow(visualAge, 0.58) * 3.15
          ) * (
            0.65 + scallop * 0.55
          ) * (
            0.76 + cellNoise * 0.42
          );
          // A broad middle and narrowed head/tail read as a suspended plume;
          // a monotonic width increase made the same strip look painted onto
          // the course like a uniform lane.
          const plumeEnvelope = 0.48 + Math.pow(
            Math.max(0, Math.sin(trailAge * Math.PI)),
            0.5,
          ) * 0.7;
          width *= plumeEnvelope;
          normalizedAge = visualAge;

          if (hasCameraExclusion) {
            const cameraHorizontalDistance = Math.hypot(
              worldX - cameraWorldX,
              worldZ - cameraWorldZ,
            );
            const cameraDistance = hasCameraHeight
              ? Math.hypot(cameraHorizontalDistance, cameraWorldY - groundY)
              : cameraHorizontalDistance;
            const cameraVerticalSeparation = hasCameraHeight
              ? Math.abs(cameraWorldY - groundY)
              : 0;
            const lowCamera = lowCameraView
              ?? (!hasCameraHeight || cameraVerticalSeparation < 22);
            if (lowCamera) {
              // The player pair lies between the chassis and a low chase
              // lens. Fade only the final few metres before the lens; hiding
              // the complete pair removed the most important speed cue. The
              // surviving craft-to-camera section is width-clamped so it
              // cannot stretch into a near-plane trapezoid.
              if (strip < 2) {
                const sampleProgressFromNewest = (
                  (worldX - newestX) * trailDirectionX
                  + (worldZ - newestZ) * trailDirectionZ
                );
                const lensClearance = sampleProgressFromNewest - cameraProgressFromNewest;
                // Dissolve across most of the craft-to-lens corridor. Waiting
                // until the final few metres produces a pair of perspective
                // rails that terminate at the bottom bezel even when the
                // shader has torn the distant trail into clouds.
                cameraFade = Math.max(0, Math.min(1, (lensClearance - 14) / 6));
                alpha *= Math.pow(cameraFade, 0.82);
                width = Math.min(
                  width,
                  Math.max(1.15, cameraDistance * 0.085),
                );
              } else {
                cameraFade = Math.max(0, Math.min(
                  1,
                  (cameraDistance - stripExclusionRadius) / 22,
                ));
                alpha *= cameraFade;
                width = Math.min(
                  width,
                  Math.max(0.9, cameraDistance * 0.045),
                );
              }
            } else if (cameraVerticalSeparation < 60) {
              // Elevated hero cameras may show the complete pair, but the
              // ribbon still dissolves before crossing the lens and is kept
              // narrow enough to remain dust instead of becoming a road.
              const sampleProgressFromNewest = (
                (worldX - newestX) * trailDirectionX
                + (worldZ - newestZ) * trailDirectionZ
              );
              const lensFade = cameraProgressFromNewest < 0
                ? Math.max(0, Math.min(
                  1,
                  (sampleProgressFromNewest - cameraProgressFromNewest) / 18,
                ))
                : 1;
              cameraFade = lensFade;
              alpha *= cameraFade;
              width = Math.min(width, Math.max(1.1, cameraDistance * 0.045));
            }
          }
        } else {
          groundY = sampleTerrainHeight(worldX, worldZ);
        }

        const rollingCell = Math.pow(
          Math.abs(Math.sin(normalizedAge * Math.PI * 8.4 + strip * 0.31)),
          0.42,
        );
        const cloudHeight = (
          0.1
          + normalizedAge * 0.42
          + rollingCell * (0.12 + normalizedAge * 0.2)
        ) * (0.42 + cameraFade * 0.58);
        // The wake is only a few metres wide relative to the megadunes. One
        // analytic height query per longitudinal sample preserves its ground
        // contact while avoiding duplicate multi-octave terrain solves for the
        // paired edges on every presented frame.
        const vertex = vertexOffset + ordered * WAKE_VERTICES_PER_SAMPLE;
        for (let edgeIndex = 0; edgeIndex < WAKE_VERTICES_PER_SAMPLE; edgeIndex += 1) {
          const edge = WAKE_EDGES[edgeIndex] ?? 0;
          const sidePhase = edge < 0 ? 1.37 : 4.83;
          const tornWave = Math.sin(
            wakeAlong * 0.37
            + Math.sin(wakeAlong * 0.113 + sidePhase) * 1.25
            + strip * 2.11
            + sidePhase,
          );
          const tornNotch = Math.pow(Math.max(0, Math.sin(
            wakeAlong * 0.191 + sidePhase * 1.71 + strip * 0.63,
          )), 4);
          const tornScale = 1
            + tornWave * (0.11 + normalizedAge * 0.16)
            - tornNotch * (0.055 + normalizedAge * 0.12);
          const lateral = edge * width * tornScale;
          const vertexX = worldX + perpendicularX * lateral;
          const vertexZ = worldZ + perpendicularZ * lateral;
          const edgeLift = 0.72
            + Math.sin(normalizedAge * 18.1 + sidePhase + wakeNoise * 3.7) * 0.12;
          const position = (vertex + edgeIndex) * 3;
          this.positions[position] = vertexX - renderOriginX;
          this.positions[position + 1] = groundY + 1.28 + cloudHeight * edgeLift;
          this.positions[position + 2] = vertexZ - renderOriginZ;
          this.alphas[vertex + edgeIndex] = alpha;
          this.ages[vertex + edgeIndex] = normalizedAge;
          this.noise[vertex + edgeIndex] = wakeNoise;
          this.along[vertex + edgeIndex] = wakeAlong;
          this.trail[vertex + edgeIndex] = wakeTrail;
        }
      }

      // Build only live quads. A fixed full-capacity list would connect the
      // final live point to stale slots and form near-plane wedges. This tiny
      // bounded rewrite (at most 2,640 indices at shipping capacity) also omits
      // only the segments that cross the chase camera exclusion—not art gaps.
      for (let ordered = 0; ordered < count - 1; ordered += 1) {
        const a = vertexOffset + ordered * WAKE_VERTICES_PER_SAMPLE;
        const c = a + WAKE_VERTICES_PER_SAMPLE;
        if ((this.alphas[a] ?? 0) < 0.015 && (this.alphas[c] ?? 0) < 0.015) continue;
        // Never submit the final player quad into a low chase lens. A gradual
        // alpha fade alone still rasterizes a huge perspective trapezoid whose
        // last pixels touch the bezel and read as a road rail.
        if (
          lowCameraView === true
          && strip < 2
          && ((this.alphas[a] ?? 0) < 0.055 || (this.alphas[c] ?? 0) < 0.055)
        ) continue;

        if (hasCameraExclusion) {
          const aLeft = a * 3;
          const aRight = (a + 1) * 3;
          const cLeft = c * 3;
          const cRight = (c + 1) * 3;
          const ax = (
            (this.positions[aLeft] ?? 0) + (this.positions[aRight] ?? 0)
          ) * 0.5 + renderOriginX;
          const az = (
            (this.positions[aLeft + 2] ?? 0) + (this.positions[aRight + 2] ?? 0)
          ) * 0.5 + renderOriginZ;
          const cx = (
            (this.positions[cLeft] ?? 0) + (this.positions[cRight] ?? 0)
          ) * 0.5 + renderOriginX;
          const cz = (
            (this.positions[cLeft + 2] ?? 0) + (this.positions[cRight + 2] ?? 0)
          ) * 0.5 + renderOriginZ;
          const ay = (
            (this.positions[aLeft + 1] ?? 0) + (this.positions[aRight + 1] ?? 0)
          ) * 0.5;
          const cy = (
            (this.positions[cLeft + 1] ?? 0) + (this.positions[cRight + 1] ?? 0)
          ) * 0.5;
          const segmentX = cx - ax;
          const segmentY = hasCameraHeight ? cy - ay : 0;
          const segmentZ = cz - az;
          const segmentLengthSquared = segmentX * segmentX
            + segmentY * segmentY
            + segmentZ * segmentZ;
          const projection = segmentLengthSquared > 1e-6
            ? Math.max(0, Math.min(1, (
              (cameraWorldX - ax) * segmentX
              + (hasCameraHeight ? cameraWorldY - ay : 0) * segmentY
              + (cameraWorldZ - az) * segmentZ
            ) / segmentLengthSquared))
            : 0;
          const closestX = ax + segmentX * projection;
          const closestY = ay + segmentY * projection;
          const closestZ = az + segmentZ * projection;
          const cameraDeltaX = cameraWorldX - closestX;
          const cameraDeltaY = hasCameraHeight ? cameraWorldY - closestY : 0;
          const cameraDeltaZ = cameraWorldZ - closestZ;
          const midpointY = (ay + cy) * 0.5;
          const verticalSeparation = hasCameraHeight
            ? Math.abs(cameraWorldY - midpointY)
            : 0;
          const lowChaseView = lowCameraView
            ?? (hasCameraHeight && verticalSeparation < 22);
          const effectiveExclusionRadius = lowChaseView
            ? strip < 2
              ? Math.min(6, stripExclusionRadius * 0.15)
              : stripExclusionRadius
            : 0;
          if (
            cameraDeltaX * cameraDeltaX
              + cameraDeltaY * cameraDeltaY
              + cameraDeltaZ * cameraDeltaZ
            < effectiveExclusionRadius * effectiveExclusionRadius
          ) continue;
        }

        const b = a + 1;
        const d = c + 1;
        this.indices[indexCursor] = a;
        this.indices[indexCursor + 1] = c;
        this.indices[indexCursor + 2] = b;
        this.indices[indexCursor + 3] = b;
        this.indices[indexCursor + 4] = c;
        this.indices[indexCursor + 5] = d;
        indexCursor += 6;
      }
    }

    this.mesh.geometry.setDrawRange(0, indexCursor);
    this.positionAttribute.needsUpdate = true;
    this.alphaAttribute.needsUpdate = true;
    this.ageAttribute.needsUpdate = true;
    this.noiseAttribute.needsUpdate = true;
    this.alongAttribute.needsUpdate = true;
    this.trailAttribute.needsUpdate = true;
    if (indexCursor > 0) this.indexAttribute.needsUpdate = true;
  }

  clearRacer(racerIndex: number): void {
    if (racerIndex < 0 || racerIndex >= this.maxRacers) return;
    const firstStrip = racerIndex * 2;
    this.heads[firstStrip] = -1;
    this.heads[firstStrip + 1] = -1;
    this.counts[firstStrip] = 0;
    this.counts[firstStrip + 1] = 0;
  }

  clear(): void {
    this.heads.fill(-1);
    this.counts.fill(0);
    this.alphas.fill(0);
    this.mesh.geometry.setDrawRange(0, 0);
    this.alphaAttribute.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
