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
  sampleTerrainSurface,
  type TerrainNormalTarget,
  type TerrainSample,
  type TerrainSurfaceSample,
} from './terrainMath';
import { CourseGulfTextures } from './CourseGulfTextures';
import { COURSE_GULF_MAX_DEPTH, COURSE_GULF_MAX_RISE, type CourseGulfField } from '../../game/race/CourseGulfField';
import type { PitPadField } from '../../game/race/PitPadField';
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
  readonly gulfTextures = new CourseGulfTextures();

  private readonly mutableMeshes: TerrainMesh[] = [];
  private readonly baseGeometries: BufferGeometry[] = [];
  private authoredGeometries: BufferGeometry[] | null = null;
  private readonly geometryOptions: { baseCellSize: number; segments: number; skirtDepth?: number };
  private logicalCenterX = Number.NaN;
  private logicalCenterZ = Number.NaN;
  private renderOriginX = Number.NaN;
  private renderOriginZ = Number.NaN;
  private activeLevels: number;
  private requestedLevels: number;
  private gulfField: CourseGulfField | null = null;
  private pitPadField: PitPadField | null = null;
  private pitMinOffset = 0;
  private pitMaxOffset = 0;
  private readonly terrainOffset = {
    sampleOffset: (x: number, z: number): number => (this.gulfField?.sampleOffset(x, z) ?? 0)
      + (this.pitPadField?.sampleOffset(x, z) ?? 0),
  };

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
    this.geometryOptions = { baseCellSize, segments, skirtDepth: options.skirtDepth };

    this.group.name = 'Infinite Cel Desert';
    this.group.matrixAutoUpdate = true;
    this.materials = createTerrainMaterial({ ...options, gulfUniforms: this.gulfTextures.uniforms });
    this.activeLevels = levels;
    this.requestedLevels = levels;

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
      this.baseGeometries.push(geometry);
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

  /**
   * Stores the governor's request without rebuilding geometry. Authored course
   * landmarks depend on the full ground domain, so their field pins coverage
   * to all configured rings. Leaving that course restores the latest request.
   */
  setLevelCount(levelCount: number): void {
    if (Number.isFinite(levelCount)) {
      this.requestedLevels = Math.max(1, Math.min(this.mutableMeshes.length, Math.floor(levelCount)));
    }
    const effective = this.gulfField ? this.mutableMeshes.length : this.requestedLevels;
    if (effective === this.activeLevels) return;
    this.activeLevels = effective;
    for (let index = 0; index < this.mutableMeshes.length; index += 1) {
      const mesh = this.mutableMeshes[index];
      if (mesh) mesh.visible = index < effective;
    }
  }

  setHazeRange(near: number, far: number): void {
    this.materials.uniforms.hazeNear.value = Math.max(0, near);
    this.materials.uniforms.hazeFar.value = Math.max(near + 1, far);
  }

  get levelCount(): number {
    return this.activeLevels;
  }

  get requestedLevelCount(): number {
    return this.requestedLevels;
  }

  /** Half-width of the actually enabled terrain domain around the camera. */
  get coverageRadius(): number {
    return this.outerRadius / (2 ** (this.mutableMeshes.length - this.activeLevels));
  }

  get maximumDrawCalls(): number {
    return this.mutableMeshes.length;
  }

  sampleHeight(worldX: number, worldZ: number): number {
    return sampleTerrainHeight(worldX, worldZ, this.terrainOffset);
  }

  /** Physics owns the field; this installs the identical R32F samples for rendering. */
  setCourseGulfField(field: CourseGulfField | null): void {
    if (field === this.gulfField) return;
    this.gulfField = field;
    if (field && !this.authoredGeometries) {
      const { baseCellSize, segments, skirtDepth } = this.geometryOptions;
      const cells = this.baseGeometries.map((geometry, level) => {
        const existing = Number(geometry.userData.terrainRing.cellSize);
        // A 48m cell can bridge a whole cliff ravine and miss its physical
        // surface by over 100m. Retain 12m samples through the visible valley,
        // then 24m at the horizon. The nearby racing mesh stays unchanged.
        const cap = baseCellSize * (level < 5 ? 4 : 8);
        return Math.min(existing, cap);
      });
      this.authoredGeometries = this.baseGeometries.map((geometry, level) => {
        const cellSize = cells[level]!;
        if (cellSize === geometry.userData.terrainRing.cellSize
          && (level === 0 || cells[level - 1] === this.baseGeometries[level - 1]!.userData.terrainRing.cellSize)) return geometry;
        const outerHalfExtent = baseCellSize * segments * .5 * 2 ** level;
        return createTerrainRingGeometry({ outerHalfExtent, innerHalfExtent: level ? outerHalfExtent * .5 : 0,
          cellSize, innerBoundaryStep: level ? cells[level - 1]! : cellSize,
          cellCenters: level === 3 || level === 4,
          outerSkirt: level === this.baseGeometries.length - 1, skirtDepth });
      });
    }
    const geometries = field ? this.authoredGeometries! : this.baseGeometries;
    for (const [index, mesh] of this.mutableMeshes.entries()) {
      mesh.geometry = geometries[index]!;
      mesh.userData.cellSize = mesh.geometry.userData.terrainRing.cellSize;
    }
    this.setLevelCount(this.requestedLevels);
    this.gulfTextures.setField(field);
    this.updateDisplacementBounds();
  }

  setPitPadField(field: PitPadField | null): void {
    if (field === this.pitPadField) return;
    this.pitPadField = field;
    this.pitMinOffset = 0; this.pitMaxOffset = 0;
    for (const value of field?.grid?.values ?? []) {
      this.pitMinOffset = Math.min(this.pitMinOffset, value);
      this.pitMaxOffset = Math.max(this.pitMaxOffset, value);
    }
    this.gulfTextures.setPitPadField(field);
    this.updateDisplacementBounds();
  }

  private updateDisplacementBounds(): void {
    for (const mesh of this.mutableMeshes) {
      const bounds = mesh.geometry.boundingBox, sphere = mesh.geometry.boundingSphere;
      if (!bounds || !sphere) continue;
      // Capture the original upper limit once. Both limits must return to
      // their base values when changing away from a signed authored course.
      const baseMaxY = Number(mesh.geometry.userData.terrainBaseMaxY ?? bounds.max.y);
      mesh.geometry.userData.terrainBaseMaxY = baseMaxY;
      bounds.min.y = Number(mesh.geometry.userData.terrainBaseMinY ?? -72)
        - (this.gulfField ? COURSE_GULF_MAX_DEPTH : 0) + this.pitMinOffset;
      bounds.max.y = baseMaxY + (this.gulfField ? COURSE_GULF_MAX_RISE : 0) + this.pitMaxOffset;
      const middle = (bounds.min.y + bounds.max.y) * .5;
      const halfHeight = (bounds.max.y - bounds.min.y) * .5;
      sphere.center.set(0, middle, 0);
      sphere.radius = Math.hypot(bounds.max.x, bounds.max.z, halfHeight);
    }
  }

  sampleSurface(worldX: number, worldZ: number, out: TerrainSurfaceSample): TerrainSurfaceSample {
    return sampleTerrainSurface(worldX, worldZ, out, this.terrainOffset);
  }

  /** Region identity used by sky, landmarks, audio and seeded course receipts. */
  regionAt(worldX: number): DesertRegionProfile {
    return DESERT_REGIONS[sampleTerrainRegion(worldX)];
  }

  atmosphereAt(worldX: number): DesertRegionProfile['atmosphere'] {
    return this.regionAt(worldX).atmosphere;
  }

  sample(worldX: number, worldZ: number, out: TerrainSample): TerrainSample {
    return sampleTerrain(worldX, worldZ, out, this.terrainOffset);
  }

  sampleNormal(
    worldX: number,
    worldZ: number,
    out: TerrainNormalTarget,
  ): TerrainNormalTarget {
    return sampleTerrainNormal(worldX, worldZ, out, this.terrainOffset);
  }

  dispose(): void {
    this.gulfTextures.dispose();
    this.gulfField = null;
    this.pitPadField = null;
    const ownedGeometries = new Set([...this.baseGeometries, ...(this.authoredGeometries ?? [])]);
    for (const geometry of ownedGeometries) geometry.dispose();
    this.baseGeometries.length = 0;
    this.authoredGeometries = null;
    this.materials.dispose();
    this.group.clear();
  }
}
