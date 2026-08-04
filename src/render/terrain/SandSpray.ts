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

const SPRAY_STREAMS = 8;
// Five connected vertices describe one low, faceted cross-section. Joining
// adjacent cross-sections produces a real 3D dust bank: no camera-facing card
// is ever authored, even when the racer is viewed broadside.
const SPRAY_BANK_EDGES = [-1, -0.46, 0, 0.46, 1] as const;
const SPRAY_VERTICES_PER_POINT = SPRAY_BANK_EDGES.length;

const SPRAY_VERTEX = /* glsl */ `
precision highp float;
in float aBankEdge;
in float aBankHeight;
in float aBankAlpha;
in float aBankAge;
in float aBankNoise;
in float aBankAlong;
out float vBankEdge;
out float vBankAlpha;
out float vBankAge;
out float vBankNoise;
out float vBankAlong;
void main() {
  // A cel-faceted crown replaces the old vertical billboard curtain. The
  // lateral footprint is already authored in world space by the fixed pool.
  float crown = max(0.0, 1.0 - pow(abs(aBankEdge), 1.42));
  vec3 bankPosition = position;
  bankPosition.y += aBankHeight * crown;
  vec4 centerView = modelViewMatrix * vec4(bankPosition, 1.0);
  float viewDistance = max(0.0, -centerView.z);
  float nearFade = smoothstep(5.5, 12.0, viewDistance);
  vBankEdge = aBankEdge;
  vBankAlpha = aBankAlpha * nearFade;
  vBankAge = aBankAge;
  vBankNoise = aBankNoise;
  vBankAlong = aBankAlong;
  gl_Position = projectionMatrix * centerView;
}
`;

const SPRAY_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uSandColor;
uniform vec3 uHotColor;
in float vBankEdge;
in float vBankAlpha;
in float vBankAge;
in float vBankNoise;
in float vBankAlong;
out vec4 fragColor;
void main() {
  // Hard two-tone facets describe one broad dust mass. There is deliberately
  // no ink strip on either edge: a thin dark boundary reads as a rail once the
  // bank stretches through perspective.
  float crownBand = step(0.53, 1.0 - abs(vBankEdge));
  vec3 body = mix(uSandColor, uHotColor, 0.22 + crownBand * 0.24);

  // Continuous lifetime coverage keeps the dust graphic and substantial;
  // only the oldest tail dissolves. Longitudinal taper is authored in the
  // connected upper silhouette, not stamped onto every source sample.
  float alpha = clamp(vBankAlpha * (0.96 - vBankAge * 0.12), 0.0, 0.94);
  if (alpha < 0.025) discard;
  fragColor = vec4(body, alpha);
}
`;

export interface SandSprayOptions {
  capacity?: number;
  color?: ColorRepresentation;
  highlightColor?: ColorRepresentation;
}

/**
 * Fixed-capacity powerslide/landing banks. Emission points are assigned to a
 * small set of spatially coherent streams and connected into paired-edge
 * BufferGeometry strips. Every live bank is submitted in one draw call.
 */
export class SandSpray {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;
  readonly capacity: number;

  private readonly pointsPerStream: number;
  private readonly worldX: Float64Array;
  private readonly worldY: Float32Array;
  private readonly worldZ: Float64Array;
  private readonly velocityX: Float32Array;
  private readonly velocityZ: Float32Array;
  private readonly birthTimes: Float32Array;
  private readonly lifetimes: Float32Array;
  private readonly strengths: Float32Array;
  private readonly sizes: Float32Array;
  private readonly seeds: Float32Array;
  private readonly sourceAlong: Float32Array;
  private readonly heads = new Int16Array(SPRAY_STREAMS);
  private readonly counts = new Uint16Array(SPRAY_STREAMS);
  private readonly lastEmission = new Float32Array(SPRAY_STREAMS);
  private readonly streamDirectionX = new Float32Array(SPRAY_STREAMS);
  private readonly streamDirectionZ = new Float32Array(SPRAY_STREAMS);

  private readonly positions: Float32Array;
  private readonly bankHeights: Float32Array;
  private readonly bankAlphas: Float32Array;
  private readonly bankAges: Float32Array;
  private readonly bankNoise: Float32Array;
  private readonly bankAlong: Float32Array;
  private readonly indices: Uint32Array;
  private readonly positionAttribute: BufferAttribute;
  private readonly heightAttribute: BufferAttribute;
  private readonly alphaAttribute: BufferAttribute;
  private readonly ageAttribute: BufferAttribute;
  private readonly noiseAttribute: BufferAttribute;
  private readonly alongAttribute: BufferAttribute;
  private readonly indexAttribute: BufferAttribute;

  private clock = 0;
  private randomState = 0x504f4452;

  constructor(options: SandSprayOptions = {}) {
    const requestedCapacity = Math.max(32, Math.floor(options.capacity ?? 224));
    this.pointsPerStream = Math.max(4, Math.floor(requestedCapacity / SPRAY_STREAMS));
    this.capacity = this.pointsPerStream * SPRAY_STREAMS;
    this.heads.fill(-1);
    this.lastEmission.fill(Number.NEGATIVE_INFINITY);

    this.worldX = new Float64Array(this.capacity);
    this.worldY = new Float32Array(this.capacity);
    this.worldZ = new Float64Array(this.capacity);
    this.velocityX = new Float32Array(this.capacity);
    this.velocityZ = new Float32Array(this.capacity);
    this.birthTimes = new Float32Array(this.capacity);
    this.lifetimes = new Float32Array(this.capacity);
    this.strengths = new Float32Array(this.capacity);
    this.sizes = new Float32Array(this.capacity);
    this.seeds = new Float32Array(this.capacity);
    this.sourceAlong = new Float32Array(this.capacity);

    const vertexCount = this.capacity * SPRAY_VERTICES_PER_POINT;
    this.positions = new Float32Array(vertexCount * 3);
    this.bankHeights = new Float32Array(vertexCount);
    this.bankAlphas = new Float32Array(vertexCount);
    this.bankAges = new Float32Array(vertexCount);
    this.bankNoise = new Float32Array(vertexCount);
    this.bankAlong = new Float32Array(vertexCount);
    const bankEdges = new Float32Array(vertexCount);
    this.indices = new Uint32Array(
      SPRAY_STREAMS
      * (this.pointsPerStream - 1)
      * (SPRAY_VERTICES_PER_POINT - 1)
      * 6,
    );
    for (let source = 0; source < this.capacity; source += 1) {
      for (let edgeIndex = 0; edgeIndex < SPRAY_VERTICES_PER_POINT; edgeIndex += 1) {
        bankEdges[source * SPRAY_VERTICES_PER_POINT + edgeIndex]
          = SPRAY_BANK_EDGES[edgeIndex] ?? 0;
      }
    }

    const geometry = new BufferGeometry();
    this.positionAttribute = new BufferAttribute(this.positions, 3);
    this.positionAttribute.setUsage(DynamicDrawUsage);
    this.heightAttribute = new BufferAttribute(this.bankHeights, 1);
    this.heightAttribute.setUsage(DynamicDrawUsage);
    this.alphaAttribute = new BufferAttribute(this.bankAlphas, 1);
    this.alphaAttribute.setUsage(DynamicDrawUsage);
    this.ageAttribute = new BufferAttribute(this.bankAges, 1);
    this.ageAttribute.setUsage(DynamicDrawUsage);
    this.noiseAttribute = new BufferAttribute(this.bankNoise, 1);
    this.noiseAttribute.setUsage(DynamicDrawUsage);
    this.alongAttribute = new BufferAttribute(this.bankAlong, 1);
    this.alongAttribute.setUsage(DynamicDrawUsage);
    geometry.setAttribute('position', this.positionAttribute);
    geometry.setAttribute('aBankEdge', new BufferAttribute(bankEdges, 1));
    geometry.setAttribute('aBankHeight', this.heightAttribute);
    geometry.setAttribute('aBankAlpha', this.alphaAttribute);
    geometry.setAttribute('aBankAge', this.ageAttribute);
    geometry.setAttribute('aBankNoise', this.noiseAttribute);
    geometry.setAttribute('aBankAlong', this.alongAttribute);
    this.indexAttribute = new BufferAttribute(this.indices, 1);
    this.indexAttribute.setUsage(DynamicDrawUsage);
    geometry.setIndex(this.indexAttribute);
    geometry.setDrawRange(0, 0);
    geometry.boundingSphere = new Sphere(new Vector3(), 3_200);

    const material = new ShaderMaterial({
      name: 'PodRacing/ConnectedSandSprayBanks',
      glslVersion: GLSL3,
      vertexShader: SPRAY_VERTEX,
      fragmentShader: SPRAY_FRAGMENT,
      uniforms: {
        uSandColor: { value: new Color(options.color ?? '#e6a45d') },
        uHotColor: { value: new Color(options.highlightColor ?? '#ffd28a') },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      blending: NormalBlending,
    });
    material.toneMapped = false;
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = 'Connected Landing and Drift Sand Banks';
    this.mesh.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    this.mesh.frustumCulled = true;
    this.mesh.renderOrder = 33;
  }

  private random(): number {
    let value = this.randomState >>> 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.randomState = value >>> 0;
    return this.randomState / 4_294_967_295;
  }

  emit(
    worldX: number,
    worldY: number,
    worldZ: number,
    directionX: number,
    directionZ: number,
    intensity: number,
    requestedCount: number,
  ): void {
    if (requestedCount <= 0) return;
    const clampedIntensity = Math.max(0, Math.min(1.5, intensity));
    const directionLength = Math.hypot(directionX, directionZ);
    const forwardX = directionLength > 1e-5 ? directionX / directionLength : 0;
    const forwardZ = directionLength > 1e-5 ? directionZ / directionLength : 1;

    let stream = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let candidate = 0; candidate < SPRAY_STREAMS; candidate += 1) {
      const count = this.counts[candidate] ?? 0;
      const head = this.heads[candidate] ?? -1;
      if (count === 0 || head < 0 || this.clock - (this.lastEmission[candidate] ?? 0) > 0.2) {
        continue;
      }
      const sourceIndex = candidate * this.pointsPerStream + head;
      const dx = worldX - (this.worldX[sourceIndex] ?? worldX);
      const dz = worldZ - (this.worldZ[sourceIndex] ?? worldZ);
      const distance = Math.hypot(dx, dz);
      const alignment = forwardX * (this.streamDirectionX[candidate] ?? forwardX)
        + forwardZ * (this.streamDirectionZ[candidate] ?? forwardZ);
      if (distance > 24 || alignment < 0.42) continue;
      const score = distance + (1 - alignment) * 7;
      if (score < bestScore) {
        bestScore = score;
        stream = candidate;
      }
    }

    if (stream < 0) {
      for (let candidate = 0; candidate < SPRAY_STREAMS; candidate += 1) {
        if ((this.counts[candidate] ?? 0) === 0) {
          stream = candidate;
          break;
        }
      }
    }
    if (stream < 0) {
      let oldestTime = Number.POSITIVE_INFINITY;
      for (let candidate = 0; candidate < SPRAY_STREAMS; candidate += 1) {
        const emissionTime = this.lastEmission[candidate] ?? 0;
        if (emissionTime < oldestTime) {
          oldestTime = emissionTime;
          stream = candidate;
        }
      }
    }
    if (stream < 0) return;

    const newStream = (this.counts[stream] ?? 0) === 0
      || this.clock - (this.lastEmission[stream] ?? 0) > 0.2;
    if (newStream) {
      this.heads[stream] = -1;
      this.counts[stream] = 0;
      // A single landing event still produces one coherent bank. Powerslide
      // events append to this history rather than instancing another shape.
      const warmSampleCount = Math.min(15, this.pointsPerStream - 1);
      for (let sample = warmSampleCount; sample >= 1; sample -= 1) {
        const distance = sample * (0.38 + clampedIntensity * 0.04);
        this.pushPoint(
          stream,
          worldX - forwardX * distance,
          worldY,
          worldZ - forwardZ * distance,
          forwardX,
          forwardZ,
          clampedIntensity * (
            0.7 + (warmSampleCount - sample) / Math.max(1, warmSampleCount) * 0.24
          ),
          requestedCount,
          this.clock - sample * 0.006,
        );
      }
      this.pushPoint(
        stream,
        worldX,
        worldY,
        worldZ,
        forwardX,
        forwardZ,
        clampedIntensity,
        requestedCount,
        this.clock,
      );
    } else {
      // Simulation emits drift events at 10 Hz while a racer can cover more
      // than thirteen metres between events. Subdivide that span into one
      // connected history instead of allocating a fresh mini-bank per event.
      const previousHead = this.heads[stream] ?? -1;
      const previousIndex = stream * this.pointsPerStream + previousHead;
      const previousX = this.worldX[previousIndex] ?? worldX;
      const previousY = this.worldY[previousIndex] ?? worldY;
      const previousZ = this.worldZ[previousIndex] ?? worldZ;
      const span = Math.hypot(worldX - previousX, worldZ - previousZ);
      const subdivisions = Math.max(1, Math.min(7, Math.ceil(span / 3.2)));
      const previousTime = this.lastEmission[stream] ?? this.clock;
      for (let subdivision = 1; subdivision <= subdivisions; subdivision += 1) {
        const t = subdivision / subdivisions;
        this.pushPoint(
          stream,
          previousX + (worldX - previousX) * t,
          previousY + (worldY - previousY) * t,
          previousZ + (worldZ - previousZ) * t,
          forwardX,
          forwardZ,
          clampedIntensity,
          requestedCount,
          previousTime + (this.clock - previousTime) * t,
        );
      }
    }
    this.lastEmission[stream] = this.clock;
    this.streamDirectionX[stream] = forwardX;
    this.streamDirectionZ[stream] = forwardZ;
  }

  private pushPoint(
    stream: number,
    worldX: number,
    worldY: number,
    worldZ: number,
    forwardX: number,
    forwardZ: number,
    intensity: number,
    requestedCount: number,
    birthTime: number,
  ): void {
    const previousHead = this.heads[stream] ?? -1;
    const head = (previousHead + 1) % this.pointsPerStream;
    const sourceOffset = stream * this.pointsPerStream;
    const sourceIndex = sourceOffset + head;
    let distanceFromPrevious = 0;
    if (previousHead >= 0) {
      distanceFromPrevious = Math.hypot(
        worldX - (this.worldX[sourceOffset + previousHead] ?? worldX),
        worldZ - (this.worldZ[sourceOffset + previousHead] ?? worldZ),
      );
    }
    const sideX = -forwardZ;
    const sideZ = forwardX;
    const sideDrift = (this.random() * 2 - 1) * (0.18 + intensity * 0.22);
    const rearFlow = 3.1 + this.random() * 1.7 + intensity * 1.4;
    this.worldX[sourceIndex] = worldX;
    this.worldY[sourceIndex] = worldY;
    this.worldZ[sourceIndex] = worldZ;
    this.velocityX[sourceIndex] = -forwardX * rearFlow + sideX * sideDrift;
    this.velocityZ[sourceIndex] = -forwardZ * rearFlow + sideZ * sideDrift;
    this.birthTimes[sourceIndex] = birthTime;
    this.lifetimes[sourceIndex] = 0.34 + this.random() * 0.08;
    this.strengths[sourceIndex] = Math.max(0, Math.min(1.5, intensity));
    const density = 0.9 + Math.sqrt(Math.max(1, requestedCount) / 12) * 0.15;
    this.sizes[sourceIndex] = (2.35 + intensity * 1.85 + this.random() * 0.6) * density;
    this.seeds[sourceIndex] = this.random();
    this.sourceAlong[sourceIndex] = previousHead >= 0
      ? (this.sourceAlong[sourceOffset + previousHead] ?? 0) + distanceFromPrevious
      : 0;
    this.heads[stream] = head;
    this.counts[stream] = Math.min(
      this.pointsPerStream,
      (this.counts[stream] ?? 0) + 1,
    );
  }

  update(deltaSeconds: number, renderOriginX: number, renderOriginZ: number): void {
    const delta = Math.max(0, Math.min(0.05, deltaSeconds));
    this.clock += delta;
    let indexCursor = 0;

    for (let stream = 0; stream < SPRAY_STREAMS; stream += 1) {
      let count = this.counts[stream] ?? 0;
      const head = this.heads[stream] ?? -1;
      const sourceOffset = stream * this.pointsPerStream;
      const vertexOffset = sourceOffset * SPRAY_VERTICES_PER_POINT;

      while (count > 0 && head >= 0) {
        const oldestRing = (head - (count - 1) + this.pointsPerStream) % this.pointsPerStream;
        const oldestIndex = sourceOffset + oldestRing;
        const age = this.clock - (this.birthTimes[oldestIndex] ?? this.clock);
        if (age < (this.lifetimes[oldestIndex] ?? 0.8)) break;
        count -= 1;
      }
      this.counts[stream] = count;
      if (count === 0) {
        this.heads[stream] = -1;
        continue;
      }

      for (let ordered = 0; ordered < count; ordered += 1) {
        const ringIndex = (head - (count - 1 - ordered) + this.pointsPerStream)
          % this.pointsPerStream;
        const sourceIndex = sourceOffset + ringIndex;
        const age = Math.max(0, this.clock - (this.birthTimes[sourceIndex] ?? this.clock));
        const lifetime = this.lifetimes[sourceIndex] ?? 0.8;
        const normalizedAge = Math.max(0, Math.min(1, age / lifetime));
        const drag = Math.max(0, 1 - delta * 2.4);
        this.velocityX[sourceIndex] = (this.velocityX[sourceIndex] ?? 0) * drag;
        this.velocityZ[sourceIndex] = (this.velocityZ[sourceIndex] ?? 0) * drag;
        this.worldX[sourceIndex] = (this.worldX[sourceIndex] ?? 0)
          + (this.velocityX[sourceIndex] ?? 0) * delta;
        this.worldZ[sourceIndex] = (this.worldZ[sourceIndex] ?? 0)
          + (this.velocityZ[sourceIndex] ?? 0) * delta;
        const ground = sampleTerrainHeight(
          this.worldX[sourceIndex] ?? 0,
          this.worldZ[sourceIndex] ?? 0,
        );
        this.worldY[sourceIndex] = ground + 0.16;

        const longitudinalT = count > 1 ? ordered / (count - 1) : 0.5;
        const tailRamp = Math.max(0, Math.min(1, longitudinalT / 0.18));
        const headRamp = Math.max(0, Math.min(1, (1 - longitudinalT) / 0.14));
        const smoothTail = tailRamp * tailRamp * (3 - 2 * tailRamp);
        const smoothHead = headRamp * headRamp * (3 - 2 * headRamp);
        // The oldest end dissolves into the terrain, while the newest end
        // remains substantial beneath the racer. Pinching both ends to zero
        // made every bank a conspicuous triangular shard in side views.
        const endpointEnvelope = count > 2
          ? smoothTail * (0.7 + smoothHead * 0.3)
          : 0;
        const seed = this.seeds[sourceIndex] ?? 0.5;
        const along = this.sourceAlong[sourceIndex] ?? 0;
        const silhouetteNoise = Math.max(0, Math.min(1,
          0.5
          + Math.sin(along * 0.19 + stream * 2.7) * 0.31
          + Math.sin(along * 0.071 + seed * 4.9) * 0.19,
        ));
        const rollingCell = Math.pow(
          Math.abs(Math.sin(along * 0.34 + stream * 0.83 + seed * 1.7)),
          0.38,
        );
        const sourceSize = this.sizes[sourceIndex] ?? 2;
        const height = sourceSize
          * 0.46
          * (0.76 + normalizedAge * 0.24)
          * (0.7 + silhouetteNoise * 0.16 + rollingCell * 0.18)
          * endpointEnvelope;
        const halfWidth = sourceSize
          * (0.78 + normalizedAge * 0.3)
          * (0.82 + silhouetteNoise * 0.2)
          * (0.78 + endpointEnvelope * 0.22);
        const life = 1 - normalizedAge;
        const alpha = (this.strengths[sourceIndex] ?? 0)
          * Math.pow(life, 0.64)
          * endpointEnvelope;

        // Derive one continuous lateral frame from neighboring bank samples.
        // This gives the spray a real ground footprint instead of rotating a
        // vertical quad toward the camera.
        const previousOrdered = Math.max(0, ordered - 1);
        const nextOrdered = Math.min(count - 1, ordered + 1);
        const previousRing = (
          head - (count - 1 - previousOrdered) + this.pointsPerStream
        ) % this.pointsPerStream;
        const nextRing = (
          head - (count - 1 - nextOrdered) + this.pointsPerStream
        ) % this.pointsPerStream;
        const previousIndex = sourceOffset + previousRing;
        const nextIndex = sourceOffset + nextRing;
        let tangentX = (this.worldX[nextIndex] ?? 0) - (this.worldX[previousIndex] ?? 0);
        let tangentZ = (this.worldZ[nextIndex] ?? 0) - (this.worldZ[previousIndex] ?? 0);
        const tangentLength = Math.hypot(tangentX, tangentZ);
        if (tangentLength > 1e-4) {
          tangentX /= tangentLength;
          tangentZ /= tangentLength;
        } else {
          tangentX = this.streamDirectionX[stream] ?? 0;
          tangentZ = this.streamDirectionZ[stream] ?? 1;
        }
        const lateralX = -tangentZ;
        const lateralZ = tangentX;
        const vertex = vertexOffset + ordered * SPRAY_VERTICES_PER_POINT;
        for (let edgeIndex = 0; edgeIndex < SPRAY_VERTICES_PER_POINT; edgeIndex += 1) {
          const outputVertex = vertex + edgeIndex;
          const edge = SPRAY_BANK_EDGES[edgeIndex] ?? 0;
          const tornShoulder = 1 + Math.sin(
            along * 0.29 + stream * 1.7 + edge * 3.1,
          ) * (0.035 + Math.abs(edge) * 0.07);
          const lateralDistance = edge * halfWidth * tornShoulder;
          const position = outputVertex * 3;
          this.positions[position] = (this.worldX[sourceIndex] ?? 0)
            + lateralX * lateralDistance
            - renderOriginX;
          this.positions[position + 1] = this.worldY[sourceIndex] ?? 0;
          this.positions[position + 2] = (this.worldZ[sourceIndex] ?? 0)
            + lateralZ * lateralDistance
            - renderOriginZ;
          // A drift bank is not a symmetrical tent. Stable, incommensurate
          // crest waves raise alternating parts of the five-vertex section so
          // the plume looks laterally ripped by the pod's slip angle. This is
          // still the same connected bank and adds no vertices or draw calls.
          const crestWave = Math.sin(
            along * 0.57 + stream * 1.13 + edge * 2.7,
          );
          const crestCrossWave = Math.sin(
            along * 0.19 + seed * 5.3 - edge * 4.1,
          );
          const crownWeight = 1 - Math.abs(edge);
          const lateralRake = edge * (silhouetteNoise - 0.5) * 0.16;
          const crestVariation = Math.max(0.78, Math.min(1.2,
            0.97
            + crestWave * (0.035 + crownWeight * 0.075)
            + crestCrossWave * crownWeight * 0.045
            + lateralRake,
          ));
          this.bankHeights[outputVertex] = height * crestVariation;
          this.bankAlphas[outputVertex] = alpha;
          this.bankAges[outputVertex] = normalizedAge;
          this.bankNoise[outputVertex] = silhouetteNoise;
          this.bankAlong[outputVertex] = longitudinalT;
        }
      }

      for (let ordered = 0; ordered < count - 1; ordered += 1) {
        const crossSection = vertexOffset + ordered * SPRAY_VERTICES_PER_POINT;
        const nextCrossSection = crossSection + SPRAY_VERTICES_PER_POINT;
        if (
          (this.bankAlphas[crossSection] ?? 0) < 0.015
          && (this.bankAlphas[nextCrossSection] ?? 0) < 0.015
        ) {
          continue;
        }
        for (let edgeIndex = 0; edgeIndex < SPRAY_VERTICES_PER_POINT - 1; edgeIndex += 1) {
          const a = crossSection + edgeIndex;
          const b = a + 1;
          const c = nextCrossSection + edgeIndex;
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
    }

    this.mesh.geometry.setDrawRange(0, indexCursor);
    this.positionAttribute.needsUpdate = true;
    this.heightAttribute.needsUpdate = true;
    this.alphaAttribute.needsUpdate = true;
    this.ageAttribute.needsUpdate = true;
    this.noiseAttribute.needsUpdate = true;
    this.alongAttribute.needsUpdate = true;
    if (indexCursor > 0) this.indexAttribute.needsUpdate = true;
  }

  clear(): void {
    this.heads.fill(-1);
    this.counts.fill(0);
    this.lastEmission.fill(Number.NEGATIVE_INFINITY);
    this.bankAlphas.fill(0);
    this.mesh.geometry.setDrawRange(0, 0);
    this.alphaAttribute.needsUpdate = true;
    this.clock = 0;
    this.randomState = 0x504f4452;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
