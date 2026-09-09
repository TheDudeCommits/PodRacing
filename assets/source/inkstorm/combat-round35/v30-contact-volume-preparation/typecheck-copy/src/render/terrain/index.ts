export {
  TERRAIN_NORMAL_EPSILON,
  BASE_TERRAIN_SAMPLER,
  TERRAIN_SEED,
  createTerrainSample,
  createTerrainSurfaceSample,
  crestDustStrength,
  sampleTerrain,
  sampleTerrainHeight,
  sampleTerrainNormal,
  sampleTerrainRegion,
  sampleTerrainSurface,
  type TerrainNormalTarget,
  type TerrainSample,
  type TerrainSurfaceSample,
  type TerrainSampler,
  type TerrainHeightOffset,
} from './terrainMath';
export {
  DEFAULT_TERRAIN_PALETTE,
  createTerrainMaterial,
  type TerrainMaterialBundle,
  type TerrainMaterialOptions,
  type TerrainPalette,
} from './TerrainMaterial';
export {
  createTerrainRingGeometry,
  getTerrainRingMetadata,
  type TerrainRingGeometryOptions,
  type TerrainRingMetadata,
} from './createTerrainRingGeometry';
export {
  TerrainSystem,
  type TerrainFrame,
  type TerrainMesh,
  type TerrainSystemOptions,
} from './TerrainSystem';
export {
  DustSystem,
  type DustFrame,
  type DustSystemOptions,
} from './DustSystem';
export { WakeRibbons, type WakeRibbonOptions } from './WakeRibbons';
export { GroundDustRings, type GroundDustRingOptions } from './GroundDustRings';
export { CrestDust, type CrestDustOptions } from './CrestDust';
export { SandSpray, type SandSprayOptions } from './SandSpray';
