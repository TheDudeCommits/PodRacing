import {
  BufferGeometry,
  Group,
  Mesh,
  ShaderMaterial,
} from 'three';
import {
  createTerrainMaterial,
  type TerrainMaterialBundle,
  type TerrainMaterialOptions,
} from './TerrainMaterial';
import { createTerrainRingGeometry } from './createTerrainRingGeometry';
import {
  sampleTerrain,
  sampleTerrainHeight,
  sampleTerrainNormal,
  sampleTerrainRegion,
  type TerrainNormalTarget,
  type TerrainSample,
} from './terrainMath';
import {
  DESERT_REGIONS,
  type DesertRegionProfile,
} from '../../game/race/regions';

export interface TerrainSystemOptions extends TerrainMaterialOptions {
  /** Number of concentric levels. Six reaches roughly three kilometres. */
  levels?: number;
  /** Spacing of vertices in the player-facing centre patch, in metres. */
  baseCellSize?: number;
  /** Must be divisible by four so adjacent ring boundaries align. */
  segmentsPerSide?: number;
  skirtDepth?: number;
}

export interface TerrainFrame {
  cameraWorldX: number;
  cameraWorldZ: number;
  /** Logical coordinate represented by render-space (0, 0). */
  renderOriginX: number;
  renderOriginZ: number;
  time: number;
}

export type TerrainMesh = Mesh<BufferGeometry, ShaderMaterial>;

/**
 * Camera-centred square clipmap with a shared analytic displacement field.
 *
 * All rings translate continuously together, so there is no discrete tile swap
 * or LOD pop. Their inner/outer transition skirts cover coarse-to-fine
 * T-junctions. World-space procedural coordinates are reconstructed with the
 * render origin, keeping the meshes numerically close to the camera forever.
 */
export class TerrainSystem {
  readonly group = new Group();
  readonly meshes: readonly TerrainMesh[];
  readonly materials: TerrainMaterialBundle;
  readonly outerRadius: number;

  private readonly mutableMeshes: TerrainMesh[] = [];
  private logicalCenterX = Number.NaN;
  private logicalCenterZ = Number.NaN;
  private renderOriginX = Number.NaN;
  private renderOriginZ = Number.NaN;
  private activeLevels: number;

  constructor(options: TerrainSystemOptions = {}) {
    const levels = Math.floor(options.levels ?? 6);
    const baseCellSize = options.baseCellSize ?? 3;
    const segments = Math.floor(options.segmentsPerSide ?? 64);
    if (levels < 1 || levels > 8) {
      throw new RangeError('TerrainSystem levels must be in [1, 8]');
    }
    if (segments < 16 || segments % 4 !== 0) {
      throw new RangeError('segmentsPerSide must be >= 16 and divisible by four');
    }
    if (!(baseCellSize > 0)) {
      throw new RangeError('baseCellSize must be positive');
    }

    this.group.name = 'Infinite Cel Desert';
    this.group.matrixAutoUpdate = true;
    this.materials = createTerrainMaterial(options);
    this.activeLevels = levels;

    const baseHalfExtent = baseCellSize * segments * 0.5;
    for (let level = 0; level < levels; level += 1) {
      const scale = 2 ** level;
      // Retina chase views put the first few metres of ground across hundreds
      // of pixels. A half-step centre patch prevents visible giant triangles;
      // farther rings retain the constant-budget 64-cell topology.
      const cellSize = level === 0 ? baseCellSize * 0.5 : baseCellSize * scale;
      const outerHalfExtent = baseHalfExtent * scale;
      const innerHalfExtent = level === 0 ? 0 : outerHalfExtent * 0.5;
      const geometry = createTerrainRingGeometry({
        outerHalfExtent,
        innerHalfExtent,
        cellSize,
        skirtDepth: options.skirtDepth,
        outerSkirt: level === levels - 1,
        innerBoundaryStep: level === 1 ? baseCellSize * 0.5 : cellSize * 0.5,
      });
      const mesh = new Mesh(geometry, this.materials.material);
      mesh.name = level === 0 ? 'Desert LOD 0 (centre)' : `Desert LOD ${level}`;
      mesh.customDepthMaterial = this.materials.depthMaterial;
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = true;
      mesh.renderOrder = level;
      mesh.userData.terrainLod = level;
      mesh.userData.cellSize = cellSize;
      this.mutableMeshes.push(mesh);
      this.group.add(mesh);
    }

    this.meshes = this.mutableMeshes;
    this.outerRadius = baseHalfExtent * (2 ** (levels - 1));
  }

  /** Update from the interpolated render frame; this does not own simulation. */
  update(frame: TerrainFrame): void {
    const centerChanged = frame.cameraWorldX !== this.logicalCenterX
      || frame.cameraWorldZ !== this.logicalCenterZ
      || frame.renderOriginX !== this.renderOriginX
      || frame.renderOriginZ !== this.renderOriginZ;

    if (centerChanged) {
      const renderX = frame.cameraWorldX - frame.renderOriginX;
      const renderZ = frame.cameraWorldZ - frame.renderOriginZ;
      for (let index = 0; index < this.mutableMeshes.length; index += 1) {
        const mesh = this.mutableMeshes[index];
        if (!mesh) continue;
        mesh.position.x = renderX;
        mesh.position.z = renderZ;
        mesh.updateMatrix();
      }
      this.logicalCenterX = frame.cameraWorldX;
      this.logicalCenterZ = frame.cameraWorldZ;
      this.renderOriginX = frame.renderOriginX;
      this.renderOriginZ = frame.renderOriginZ;
      this.materials.uniforms.renderOrigin.value.set(
        frame.renderOriginX,
        frame.renderOriginZ,
      );
    }

    this.materials.uniforms.time.value = frame.time;
  }

  /** Reduces far rings without rebuilding geometry (for the adaptive governor). */
  setLevelCount(levelCount: number): void {
    const requested = Math.max(1, Math.min(this.mutableMeshes.length, Math.floor(levelCount)));
    if (requested === this.activeLevels) return;
    this.activeLevels = requested;
    for (let index = 0; index < this.mutableMeshes.length; index += 1) {
      const mesh = this.mutableMeshes[index];
      if (mesh) mesh.visible = index < requested;
    }
  }

  setHazeRange(near: number, far: number): void {
    this.materials.uniforms.hazeNear.value = Math.max(0, near);
    this.materials.uniforms.hazeFar.value = Math.max(near + 1, far);
  }

  get levelCount(): number {
    return this.activeLevels;
  }

  get maximumDrawCalls(): number {
    return this.mutableMeshes.length;
  }

  sampleHeight(worldX: number, worldZ: number): number {
    return sampleTerrainHeight(worldX, worldZ);
  }

  /** Region identity used by sky, landmarks, audio and seeded course receipts. */
  regionAt(worldX: number): DesertRegionProfile {
    return DESERT_REGIONS[sampleTerrainRegion(worldX)];
  }

  atmosphereAt(worldX: number): DesertRegionProfile['atmosphere'] {
    return this.regionAt(worldX).atmosphere;
  }

  sample(worldX: number, worldZ: number, out: TerrainSample): TerrainSample {
    return sampleTerrain(worldX, worldZ, out);
  }

  sampleNormal(
    worldX: number,
    worldZ: number,
    out: TerrainNormalTarget,
  ): TerrainNormalTarget {
    return sampleTerrainNormal(worldX, worldZ, out);
  }

  dispose(): void {
    for (let index = 0; index < this.mutableMeshes.length; index += 1) {
      this.mutableMeshes[index]?.geometry.dispose();
    }
    this.materials.dispose();
    this.group.clear();
  }
}
