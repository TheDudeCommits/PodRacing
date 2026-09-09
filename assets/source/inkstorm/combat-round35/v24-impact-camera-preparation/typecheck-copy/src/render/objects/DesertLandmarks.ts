import {
  BoxGeometry,
  BufferAttribute,
  type BufferGeometry,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import { PRIMARY_SUN_DIRECTION } from './SkyAtmosphere';

export type GroundHeightSampler = (x: number, z: number) => number;

const landmarkVertex = /* glsl */ `
  attribute float aPiece;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying float vVariation;
  uniform float uFamily;

  void main() {
    // Non-linear world hashing prevents neighboring members of a cluster from
    // inheriting the same silhouette mode through correlated cell positions.
    float variation = fract(sin(
      instanceMatrix[3][0] * 0.02137
      + instanceMatrix[3][2] * 0.01711
    ) * 43758.5453);
    vec3 shapedPosition = position;
    if (uFamily < 0.5) {
      // One four-piece kit yields three silhouettes: paired wind needles, a
      // broad hoodoo, and a forked blade. Pieces collapse or splay per cell,
      // avoiding a desert filled with the same capped obelisk.
      float rise = max(0.0, shapedPosition.y);
      float profile = floor(variation * 3.0);
      float isMain = 1.0 - step(0.5, aPiece);
      float isMainCap = step(0.5, aPiece) * (1.0 - step(1.5, aPiece));
      float isBranchColumn = step(1.5, aPiece) * (1.0 - step(2.5, aPiece));
      float isBranchCap = step(2.5, aPiece);
      float isBranch = isBranchColumn + isBranchCap;
      float isCap = isMainCap + isBranchCap;
      if (profile < 1.0) {
        // Paired bare needles: caps collapse beneath the ground plane.
        shapedPosition.xz *= mix(0.56, 0.05, isCap);
        shapedPosition.y = mix(
          shapedPosition.y * mix(1.48, 1.86, isBranchColumn),
          -0.04 + shapedPosition.y * 0.012,
          isCap
        );
        shapedPosition.x += isBranch * 0.18 + rise * (variation - 0.18) * 0.17;
      } else if (profile < 2.0) {
        // A single broad hoodoo: the side branch fully retires.
        shapedPosition.xz *= mix(1.0, 1.52, isMainCap);
        shapedPosition.xz *= mix(1.0, 0.04, isBranch);
        shapedPosition.y = mix(shapedPosition.y, -0.04 + shapedPosition.y * 0.01, isBranch);
        shapedPosition.x += rise * (variation - 0.5) * 0.12;
      } else {
        // Forked blades retain only the small branch crown.
        shapedPosition.xz *= mix(0.66, 0.05, isMainCap);
        shapedPosition.xz *= mix(1.0, 0.82 + isBranchCap * 0.26, isBranch);
        shapedPosition.y = mix(shapedPosition.y * mix(1.28, 1.72, isBranch), -0.04, isMainCap);
        shapedPosition.x += isBranch * 0.24 + rise * (variation - 0.82) * 0.22;
      }
      shapedPosition.x += isMain * rise * (variation - 0.5) * 0.06;
      shapedPosition.z += sin(variation * 19.0 + rise * 8.0) * rise * 0.055;
      float azimuth = atan(shapedPosition.z, shapedPosition.x);
      float profileWarp = 0.9
        + sin(azimuth * (3.0 + floor(variation * 3.0)) + variation * 15.0) * 0.11;
      shapedPosition.xz *= profileWarp;
    } else if (uFamily < 1.5) {
      // Tier pieces alternate between a thin wind fin, an offset table butte,
      // and a low sprawling outcrop instead of repeating trapezoid mesas.
      float profile = floor(variation * 3.0);
      float isBase = 1.0 - step(0.5, aPiece);
      float isCrown = step(0.5, aPiece) * (1.0 - step(1.5, aPiece));
      float isBlade = step(1.5, aPiece);
      if (profile < 1.0) {
        // A freestanding wind fin; conventional mesa tiers disappear.
        shapedPosition.y = mix(shapedPosition.y, -0.04 + shapedPosition.y * 0.01, isBase + isCrown);
        shapedPosition.x *= mix(1.0, 0.7, isBlade);
        shapedPosition.z *= mix(1.0, 0.48, isBlade);
        shapedPosition.y *= mix(1.0, 1.72 + variation * 0.36, isBlade);
        shapedPosition.x += shapedPosition.y * (variation - 0.17) * 0.16;
      } else if (profile < 2.0) {
        // Offset table butte; the blade is buried.
        shapedPosition.y = mix(shapedPosition.y, -0.04 + shapedPosition.y * 0.01, isBlade);
        shapedPosition.x *= mix(0.86, 1.3, isCrown);
        shapedPosition.z *= mix(1.06, 0.78, isCrown);
        shapedPosition.x += isCrown * (variation - 0.5) * 0.38;
      } else {
        // Low fault field: broad base plus an offset half-height blade.
        shapedPosition.y = mix(shapedPosition.y, -0.04 + shapedPosition.y * 0.01, isCrown);
        shapedPosition.xz *= mix(vec2(1.34, 1.1), vec2(0.68, 1.28), isBlade);
        shapedPosition.y *= mix(0.52, 0.76, isBlade);
        shapedPosition.x += isBlade * 0.34;
        shapedPosition.x += sin(shapedPosition.z * 7.0 + variation * 11.0)
          * max(0.0, shapedPosition.y) * 0.08;
      }
      float azimuth = atan(shapedPosition.z, shapedPosition.x);
      float profileWarp = 0.88
        + sin(azimuth * (2.0 + floor(variation * 4.0)) + variation * 17.0) * 0.13;
      shapedPosition.xz *= profileWarp;
    } else {
      // Arch instances range from low bridges through tall hooks and skewed
      // split gates, so the rare family reads as punctuation rather than kit.
      float profile = floor(variation * 3.0);
      if (profile < 1.0) {
        shapedPosition.x *= 1.28 + variation * 0.46;
        shapedPosition.y *= 0.66 + variation * 0.22;
      } else if (profile < 2.0) {
        shapedPosition.x *= 0.72 + variation * 0.18;
        shapedPosition.y *= 1.28 + fract(variation * 7.13) * 0.26;
        shapedPosition.x += shapedPosition.y * 0.22;
      } else {
        shapedPosition.x *= 1.08 + variation * 0.28;
        shapedPosition.y *= 0.9 + fract(variation * 7.13) * 0.24;
        shapedPosition.x += sign(shapedPosition.x) * shapedPosition.y * (variation - 0.76) * 0.22;
      }
      shapedPosition.z += sin(shapedPosition.x * 4.0 + variation * 17.0) * 0.055;
    }
    vec4 instancePosition = instanceMatrix * vec4(shapedPosition, 1.0);
    vec4 worldPosition = modelMatrix * instancePosition;
    mat3 instanceRotation = mat3(
      normalize(instanceMatrix[0].xyz),
      normalize(instanceMatrix[1].xyz),
      normalize(instanceMatrix[2].xyz)
    );
    vWorldNormal = normalize(mat3(modelMatrix) * instanceRotation * normal);
    vWorldPosition = worldPosition.xyz;
    vVariation = variation;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const landmarkFragment = /* glsl */ `
  precision highp float;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying float vVariation;
  uniform vec3 uSunDirection;
  uniform vec3 uFogColor;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    float lightValue = dot(normal, normalize(uSunDirection));
    vec3 ink = vec3(0.115, 0.045, 0.075);
    vec3 shadow = mix(vec3(0.31, 0.095, 0.105), vec3(0.40, 0.13, 0.12), vVariation);
    vec3 mid = mix(vec3(0.56, 0.18, 0.13), vec3(0.66, 0.25, 0.14), vVariation);
    vec3 light = mix(vec3(0.84, 0.34, 0.18), vec3(0.96, 0.48, 0.22), vVariation);
    vec3 color = lightValue < -0.12 ? ink : lightValue < 0.22 ? shadow : lightValue < 0.61 ? mid : light;
    float distanceToCamera = length(vWorldPosition - cameraPosition);
    float fogBand = floor(clamp((distanceToCamera - 500.0) / 500.0, 0.0, 4.0)) / 4.0;
    color = mix(color, uFogColor, fogBand * 0.88);
    // A distance-adaptive interior rim replaces unstable one-pixel Sobel dots
    // on the horizon. Far silhouettes become a single graphic ink mass.
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = 1.0 - abs(dot(normal, viewDirection));
    float farAmount = clamp((distanceToCamera - 360.0) / 1250.0, 0.0, 1.0);
    float silhouette = step(mix(0.78, 0.54, farAmount), fresnel);
    color = mix(color, ink, silhouette * mix(0.88, 0.48, farAmount));
    gl_FragColor = vec4(color, 1.0);
  }
`;

const matrix = new Matrix4();
const position = new Vector3();
const scale = new Vector3();
const rotation = new Quaternion();
const yAxis = new Vector3(0, 1, 0);

function hash(x: number, z: number, salt = 0): number {
  let value = Math.imul(x ^ (salt * 374761393), 668265263) ^ Math.imul(z, 2246822519);
  value = (value ^ (value >>> 13)) * 1274126177;
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

function markPiece(geometry: BufferGeometry, piece: number): void {
  const count = geometry.getAttribute('position').count;
  const pieces = new Float32Array(count);
  pieces.fill(piece);
  geometry.setAttribute('aPiece', new BufferAttribute(pieces, 1));
}

/**
 * Infinite, cell-recycled rock needles. World-cell hashes make each recenter
 * deterministic without exposing a small repeated tile to the player.
 */
export class DesertLandmarks extends Group {
  private readonly formations: readonly InstancedMesh[];
  private readonly cellSize = 270;
  private readonly radius = 7;
  private readonly countPerCell = 1;
  private centerCellX = Number.NaN;
  private centerCellZ = Number.NaN;
  private heightAt: GroundHeightSampler = () => 0;

  constructor() {
    super();
    this.name = 'DesertLandmarks';
    const cellsAcross = this.radius * 2 + 1;
    const count = cellsAcross * cellsAcross * this.countPerCell;
    // Chunky hoodoos replace the repeated needle/cone silhouette. The merged
    // cap rocks and secondary column still render as one instanced family.
    const spireParts = [
      new CylinderGeometry(0.3, 0.5, 0.82, 6, 2, false).toNonIndexed(),
      new CylinderGeometry(0.44, 0.31, 0.18, 6, 1, false).toNonIndexed(),
      new CylinderGeometry(0.14, 0.24, 0.54, 5, 1, false).toNonIndexed(),
      new CylinderGeometry(0.24, 0.15, 0.12, 5, 1, false).toNonIndexed(),
    ];
    spireParts[0]?.translate(-0.08, 0.41, 0);
    spireParts[1]?.translate(-0.03, 0.86, 0.02);
    spireParts[2]?.translate(0.5, 0.27, 0.1);
    spireParts[3]?.translate(0.5, 0.58, 0.1);
    spireParts.forEach(markPiece);
    const spire = mergeGeometries(spireParts, false);
    for (const part of spireParts) part.dispose();
    if (!spire) throw new Error('Could not build clustered desert spire geometry.');

    const mesaBase = new CylinderGeometry(0.86, 1, 0.72, 7, 1, false).toNonIndexed();
    mesaBase.translate(0, 0.36, 0);
    const mesaCap = new CylinderGeometry(0.58, 0.72, 0.28, 7, 1, false).toNonIndexed();
    mesaCap.translate(-0.12, 0.86, 0.05);
    const mesaBlade = new BoxGeometry(0.19, 0.94, 1.12, 1, 2, 1).toNonIndexed();
    mesaBlade.translate(0.38, 0.47, -0.04);
    markPiece(mesaBase, 0);
    markPiece(mesaCap, 1);
    markPiece(mesaBlade, 2);
    const mesa = mergeGeometries([mesaBase, mesaCap, mesaBlade], false);
    mesaBase.dispose();
    mesaCap.dispose();
    mesaBlade.dispose();
    if (!mesa) throw new Error('Could not build tiered mesa geometry.');
    const arch = new TorusGeometry(1, 0.28, 5, 14, Math.PI).toNonIndexed();
    markPiece(arch, 0);
    for (const geometry of [spire, mesa, arch]) geometry.computeVertexNormals();
    this.formations = [spire, mesa, arch].map((geometry, family) => {
      const material = new ShaderMaterial({
        name: 'CelDesertLandmark',
        vertexShader: landmarkVertex,
        fragmentShader: landmarkFragment,
        uniforms: {
          uFamily: { value: family },
          uSunDirection: { value: PRIMARY_SUN_DIRECTION.clone() },
          uFogColor: { value: new Color('#e47a45') },
        },
      });
      const mesh = new InstancedMesh(geometry, material, count);
      mesh.name = ['Rock spire clusters', 'Mesa outcrops', 'Eroded stone arches'][family] ?? 'Rock formations';
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
      mesh.count = 0;
      this.add(mesh);
      return mesh;
    });
  }

  setHeightSampler(sample: GroundHeightSampler): void {
    this.heightAt = sample;
    this.centerCellX = Number.NaN;
  }

  update(centerX: number, centerZ: number): void {
    const cellX = Math.floor(centerX / this.cellSize);
    const cellZ = Math.floor(centerZ / this.cellSize);
    if (cellX === this.centerCellX && cellZ === this.centerCellZ) return;
    this.centerCellX = cellX;
    this.centerCellZ = cellZ;

    const familyCounts = [0, 0, 0];
    for (let dz = -this.radius; dz <= this.radius; dz += 1) {
      for (let dx = -this.radius; dx <= this.radius; dx += 1) {
        const worldCellX = cellX + dx;
        const worldCellZ = cellZ + dz;
        for (let local = 0; local < this.countPerCell; local += 1) {
          const visibility = hash(worldCellX, worldCellZ, 91 + local);
          const macroCellX = Math.floor(worldCellX / 5);
          const macroCellZ = Math.floor(worldCellZ / 5);
          const cluster = hash(macroCellX, macroCellZ, 761);
          const x = (worldCellX + hash(worldCellX, worldCellZ, 11 + local) * 0.86 + 0.07) * this.cellSize;
          const z = (worldCellZ + hash(worldCellX, worldCellZ, 37 + local) * 0.86 + 0.07) * this.cellSize;
          const distanceFromCenter = Math.hypot(x - centerX, z - centerZ);
          const nearExclusion = distanceFromCenter < 235;
          // Macro cells deliberately alternate barren expanses, sparse lone
          // monuments and dense families. Local hashes still prevent a grid.
          const visibilityThreshold = cluster > 0.76
            ? 0.43
            : cluster > 0.42
              ? 0.79
              : 1.1;
          const enabled = visibility > visibilityThreshold
            && !nearExclusion;
          if (!enabled) continue;
          const macroFamily = hash(macroCellX, macroCellZ, 173);
          const localFamily = hash(worldCellX, worldCellZ, 173 + local);
          const familyRoll = macroFamily * 0.24 + localFamily * 0.76;
          const family = familyRoll < 0.34 ? 0 : familyRoll < 0.74 ? 1 : 2;
          const widthNoise = hash(worldCellX, worldCellZ, 53 + local);
          const heightNoise = hash(worldCellX, worldCellZ, 71 + local);
          const macroScale = 0.58 + hash(macroCellX, macroCellZ, 419) * 1.02;
          const localScale = 0.5 + hash(worldCellX, worldCellZ, 947 + local) * 1.05;
          const formationScale = macroScale * localScale;
          let width: number;
          let height: number;
          let depth: number;
          if (family === 0) {
            width = (9 + widthNoise * 27) * formationScale;
            height = (20 + Math.pow(heightNoise, 1.65) * 78) * formationScale;
            depth = width * (0.62 + visibility * 0.48);
          } else if (family === 1) {
            width = (27 + widthNoise * 79) * formationScale;
            height = (10 + heightNoise * 37) * (0.84 + formationScale * 0.16);
            depth = width * (0.62 + visibility * 0.34);
          } else {
            width = (16 + widthNoise * 43) * formationScale;
            height = (16 + heightNoise * 44) * (0.78 + formationScale * 0.22);
            depth = (9 + visibility * 17) * formationScale;
          }
          // Very tall formations just outside the basic exclusion radius can
          // still fill the chase/side-camera tangent and visually sprout from
          // a hero engine. Cull only landmarks whose estimated angular height
          // would exceed ~11 degrees inside 700 m; smaller set dressing and all
          // distant monuments remain deterministic and untouched.
          const profileHeightGain = family === 0 ? 1.55 : family === 1 ? 1.28 : 1.15;
          const projectedHeight = height * profileHeightGain / Math.max(1, distanceFromCenter);
          const heroSilhouetteConflict = distanceFromCenter < 700 && projectedHeight > 0.19;
          if (heroSilhouetteConflict) continue;
          position.set(x, this.heightAt(x, z) - (family === 0 ? 1.5 : 0.4), z);
          scale.set(width, height, depth);
          rotation.setFromAxisAngle(yAxis, hash(worldCellX, worldCellZ, 113 + local) * Math.PI * 2);
          matrix.compose(position, rotation, scale);
          const target = this.formations[family];
          const instance = familyCounts[family] ?? 0;
          target?.setMatrixAt(instance, matrix);
          familyCounts[family] = instance + 1;
        }
      }
    }
    for (let family = 0; family < this.formations.length; family += 1) {
      const formation = this.formations[family];
      if (!formation) continue;
      formation.count = familyCounts[family] ?? 0;
      formation.instanceMatrix.needsUpdate = true;
      formation.computeBoundingSphere();
    }
  }

  dispose(): void {
    const materials = new Set<ShaderMaterial>();
    for (const formation of this.formations) {
      formation.geometry.dispose();
      const formationMaterials = Array.isArray(formation.material)
        ? formation.material
        : [formation.material];
      for (const material of formationMaterials) materials.add(material as ShaderMaterial);
    }
    for (const material of materials) material.dispose();
  }
}
