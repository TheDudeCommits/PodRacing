import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  NoColorSpace,
  TangentSpaceNormalMap,
  Vector2,
  type Vector3,
  type Material,
  type Object3D,
  type Texture,
} from 'three';

import { CelMaterial, type CelMaterialOptions } from '../materials/CelMaterial';
import { DEFAULT_CEL_PALETTE, type CelPalette } from '../materials/celPalette';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import { VehicleArtLibrary, type VehicleArtLease, type VehicleArtSource } from './VehicleArtLibrary';
import { TeemtoWreckBreakup } from '../combat/TeemtoWreckBreakup';
import type { WreckVisualPose } from '../combat/WreckVisualPose';

export interface VehicleArtAttachment {
  /** Exact authored node name, or the normalized model root when omitted. */
  readonly node?: string;
  readonly position: readonly [number, number, number];
  readonly rotation?: readonly [number, number, number];
}

/** Art-direction controls only; source maps, transforms and ownership remain
 * the imported asset's contract. Names are exact authored material names. */
export interface VehicleArtSurfaceStyle {
  readonly palette?: CelPalette;
  /** Linear-space atlas modulation, in [0, 1]; 1 keeps its full color/contact contrast. */
  readonly baseColorStrength?: number;
  /** Independent diffuse/specular transition softness, finite in [0,1]. */
  readonly paintedShadingSoftness?: number;
  readonly specularStrength?: number;
  readonly rimStrength?: number;
  readonly reflectionStrength?: number;
  readonly wear?: number;
  /** Nonnegative multiplier of the loader's signed normalScale; default 1. */
  readonly normalStrength?: number;
}

export interface VehicleArtDefinition extends VehicleArtSource {
  /** Optional rigid replacement geometry. Failure leaves the intact source playable. */
  readonly damageVariant?: VehicleArtSource;
  /** Source already includes a constructed cowl/throat; do not add a second lip. */
  readonly hasAuthoredExhaustHardware?: boolean;
  /** Optional clear circular radius in normalized root-space metres, shared by
   * both rear (-Z) exhausts. Use the smaller INSCRIBED opening radius, not a
   * polygon's vertex radius. Anchors must be root translations and the loaded
   * root transform must be identity. Omission preserves the legacy .54 scale. */
  readonly exhaustApertureRadius?: number;
  /** DCC-authored anchors only. The adapter never infers a seat or engine location. */
  readonly attachments?: Readonly<Record<string, VehicleArtAttachment>>;
  /** Explicit DCC contract; also marks those rigid meshes as excluded from racer shadows. */
  readonly embeddedPilotNodePrefix?: string;
  readonly surfaceStyles?: Readonly<Record<string, VehicleArtSurfaceStyle>>;
}

export type ImportedVehicleStatus = 'empty' | 'loading' | 'ready' | 'error' | 'disposed';

export interface ImportedVehicleGeometryChange {
  readonly revision: number;
  readonly previousPrepassMeshes: readonly Mesh[];
  readonly prepassMeshes: readonly Mesh[];
  readonly opaqueMeshes: readonly Mesh[];
}

export interface ImportedVehiclePresentationOptions {
  /** Total body + embedded driver submissions. Default: 12. */
  readonly maxOpaqueDraws?: number;
  readonly maxBodyDraws?: number;
  readonly maxPilotDraws?: number;
  readonly maxTriangles?: number;
  readonly materialOptions?: CelMaterialOptions;
  /** Synchronous registration hook, called before old leases/materials are released. */
  readonly onGeometryChanged?: (change: ImportedVehicleGeometryChange) => void;
}

export interface ImportedVehicleStatistics {
  readonly meshes: number;
  readonly opaqueDraws: number;
  readonly bodyDraws: number;
  readonly pilotDraws: number;
  readonly triangles: number;
  readonly prepassDraws: number;
  readonly shadowSourceMeshes: number;
}

interface PreparedArt {
  readonly lease: VehicleArtLease;
  readonly damageLease: VehicleArtLease | null;
  readonly damageError: Error | null;
  readonly exhaustRadialScale: number;
  readonly originalMeshes: readonly Mesh[];
  readonly meshes: readonly Mesh[];
  readonly shadowMeshes: readonly Mesh[];
  readonly proxies: readonly Mesh[];
  readonly materials: readonly CelMaterial[];
  readonly hiddenMaterial: MeshBasicMaterial;
  readonly attachments: ReadonlyMap<string, Group>;
  readonly nodes: ReadonlyMap<string, Object3D>;
  readonly statistics: ImportedVehicleStatistics;
  readonly damageStatistics: ImportedVehicleStatistics | null;
  readonly residentStatistics: ImportedVehicleStatistics;
  readonly wreckBreakup: TeemtoWreckBreakup | null;
}

const EMPTY_MESHES: readonly Mesh[] = Object.freeze([]);
const EMPTY_MATERIALS: readonly CelMaterial[] = Object.freeze([]);
const EMPTY_STATISTICS: ImportedVehicleStatistics = Object.freeze({
  meshes: 0, opaqueDraws: 0, bodyDraws: 0, pilotDraws: 0, triangles: 0, prepassDraws: 0, shadowSourceMeshes: 0,
});
const TEXTURED_PALETTE = {
  ...DEFAULT_CEL_PALETTE,
  diffuseBands: ['#565656', '#929292', '#c7c7c7', '#ffffff'] as const,
};

const DAMAGE_MATERIAL_SOURCES = Object.freeze({
  'teemto-damage-cockpit-stubs-v16': 'teemto-cockpit-body',
  'teemto-damage-severed-tethers-v16': 'teemto-cockpit-body',
  'teemto-damage-right-front-v16': 'teemto-engine-right-body',
  'teemto-damage-right-rear-v16': 'teemto-engine-right-body',
} as const);

function triangleCount(mesh: Mesh): number {
  const count = mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position')?.count ?? 0;
  const start = Math.max(0, mesh.geometry.drawRange.start);
  return Math.max(0, Math.floor((Math.min(count, start + mesh.geometry.drawRange.count) - start) / 3));
}

function artStatistics(meshes: readonly Mesh[], shadowMeshes: readonly Mesh[]): ImportedVehicleStatistics {
  return Object.freeze({ meshes: meshes.length, opaqueDraws: meshes.length, bodyDraws: shadowMeshes.length,
    pilotDraws: meshes.length - shadowMeshes.length, triangles: meshes.reduce((sum, mesh) => sum + triangleCount(mesh), 0),
    prepassDraws: meshes.length, shadowSourceMeshes: shadowMeshes.length });
}

type ImportedSurfaceMaterial = Material & {
  color?: Color;
  map?: Texture | null;
  normalMap?: Texture | null;
  normalMapType?: number;
  normalScale?: Vector2;
  roughnessMap?: Texture | null;
  roughness?: number;
  vertexColors?: boolean;
};

/** Computed once on installation; the procedural pose still owns all animation.
 * .82m and 1.42 are the existing ConeGeometry radius and maximum clamped redline
 * expansion. A one-ppm inset covers the stored Float32 cone-vertex rounding. */
function prepareExhaustRadialScale(definition: VehicleArtDefinition, root: Object3D): number {
  const radius = definition.exhaustApertureRadius;
  if (radius === undefined) return .54;
  const gpuScale = Math.fround(radius / .82);
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(gpuScale) || gpuScale <= 0) {
    throw new Error('Imported vehicle exhaust aperture radius must be positive, finite and representable as a Float32 radial scale.');
  }
  for (const name of ['exhaustLeft', 'exhaustRight']) {
    const anchor = definition.attachments?.[name];
    if (!anchor || anchor.node !== undefined || anchor.rotation?.some(value => value !== 0)) {
      throw new Error('Imported vehicle exhaust aperture requires two root-space, rear-facing translation anchors.');
    }
  }
  if (root.matrixAutoUpdate) root.updateMatrix();
  const elements = root.matrix.elements;
  for (let index = 0; index < 16; index += 1) {
    if (elements[index] !== (index % 5 === 0 ? 1 : 0)) {
      throw new Error('Imported vehicle exhaust aperture requires a baked identity model root.');
    }
  }
  return radius / (.82 * 1.42) * (1 - 1e-6);
}

function prepareSurfaceStyles(styles: VehicleArtDefinition['surfaceStyles']) {
  const prepared = new Map<string, { materialOptions: CelMaterialOptions; normalStrength: number }>();
  const scalars = ['specularStrength', 'rimStrength', 'reflectionStrength', 'wear', 'normalStrength'] as const;
  const allowed = new Set<string>(['palette', 'baseColorStrength', 'paintedShadingSoftness', ...scalars]);
  for (const [name, style] of Object.entries(styles ?? {})) {
    if (!name || !style || typeof style !== 'object') throw new Error('Imported vehicle surface styles require an exact material name and style object.');
    for (const key of Object.keys(style)) {
      if (!allowed.has(key)) throw new Error(`Imported vehicle surface style "${name}" has unsupported field "${key}".`);
    }
    for (const key of scalars) {
      const value = style[key];
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        throw new Error(`Imported vehicle surface style "${name}" ${key} must be finite and nonnegative.`);
      }
    }
    if (style.baseColorStrength !== undefined && (!Number.isFinite(style.baseColorStrength)
      || style.baseColorStrength < 0 || style.baseColorStrength > 1)) {
      throw new Error(`Imported vehicle surface style "${name}" baseColorStrength must be finite and between 0 and 1.`);
    }
    if (style.paintedShadingSoftness !== undefined && (!Number.isFinite(style.paintedShadingSoftness)
      || style.paintedShadingSoftness < 0 || style.paintedShadingSoftness > 1)) {
      throw new Error(`Imported vehicle surface style "${name}" paintedShadingSoftness must be finite and between 0 and 1.`);
    }
    // Pick only supported values: never spread a style object into a material
    // where an untyped field could change texture bindings or source ownership.
    prepared.set(name, { normalStrength: style.normalStrength ?? 1, materialOptions: {
      ...(style.palette === undefined ? {} : { palette: style.palette }),
      ...(style.baseColorStrength === undefined ? {} : { baseColorStrength: style.baseColorStrength }),
      ...(style.paintedShadingSoftness === undefined ? {} : { paintedShadingSoftness: style.paintedShadingSoftness }),
      ...(style.specularStrength === undefined ? {} : { specularStrength: style.specularStrength }),
      ...(style.rimStrength === undefined ? {} : { rimStrength: style.rimStrength }),
      ...(style.reflectionStrength === undefined ? {} : { reflectionStrength: style.reflectionStrength }),
      ...(style.wear === undefined ? {} : { wear: style.wear }),
    } });
  }
  return prepared;
}

function validateSurfaceMaps(mesh: Mesh, material: ImportedSurfaceMaterial): void {
  const position = mesh.geometry.getAttribute('position');
  for (const [label, texture] of [
    ['color', material.map], ['normal', material.normalMap], ['roughness', material.roughnessMap],
  ] as const) {
    if (!texture) continue;
    const channel = texture.channel;
    if (!Number.isInteger(channel) || channel < 0 || channel > 3) {
      throw new Error(`Imported vehicle ${label} map requires UV channel 0, 1, 2 or 3.`);
    }
    const uvName = channel === 0 ? 'uv' : `uv${channel}`;
    const uv = mesh.geometry.getAttribute(uvName);
    if (!uv) throw new Error(`Imported vehicle ${label} map is missing ${uvName}.`);
    if (uv.itemSize < 2 || uv.count < (position?.count ?? 0)) {
      throw new Error(`Imported vehicle ${label} map needs complete two-component ${uvName} coordinates.`);
    }
    for (let index = 0; index < uv.count; index += 1) {
      if (!Number.isFinite(uv.getX(index)) || !Number.isFinite(uv.getY(index))) {
        throw new Error(`Imported vehicle ${label} map has non-finite ${uvName} coordinates.`);
      }
    }
    if (label !== 'color' && texture.colorSpace !== NoColorSpace) {
      throw new Error(`Imported vehicle ${label} map must use linear data (NoColorSpace).`);
    }
  }
  if (material.normalMap) {
    if (material.normalMapType !== undefined && material.normalMapType !== TangentSpaceNormalMap) {
      throw new Error('Imported vehicle normal maps require tangent-space encoding.');
    }
    if (material.normalScale && ![material.normalScale.x, material.normalScale.y].every(Number.isFinite)) {
      throw new Error('Imported vehicle normal scale must be finite.');
    }
    const tangent = mesh.geometry.getAttribute('tangent');
    if (tangent) {
      if (tangent.itemSize !== 4 || tangent.count < (position?.count ?? 0)) {
        throw new Error('Imported vehicle normal maps need complete four-component authored tangents.');
      }
      for (let index = 0; index < tangent.count; index += 1) {
        const x = tangent.getX(index), y = tangent.getY(index), z = tangent.getZ(index), w = tangent.getW(index);
        if (![x, y, z, w].every(Number.isFinite) || x * x + y * y + z * z < 1.e-12 || Math.abs(w) !== 1) {
          throw new Error('Imported vehicle authored tangents require finite nonzero directions and handedness of -1 or 1.');
        }
      }
    }
  }
  if (material.roughnessMap && !Number.isFinite(material.roughness ?? 1)) {
    throw new Error('Imported vehicle roughness factor must be finite.');
  }
}

function visibleThroughParents(object: Object3D): boolean {
  let current: Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function releasePrepared(art: PreparedArt): void {
  art.wreckBreakup?.reset();
  for (const proxy of art.proxies) proxy.removeFromParent();
  for (const material of art.materials) material.dispose();
  art.hiddenMaterial.dispose();
  // Proxies and beauty meshes borrow template geometry; only the lease may release it.
  art.damageLease?.release();
  art.lease.release();
}

/**
 * Imported art only: a stable outer racer wrapper owns physics, pilot and VFX.
 * No default source is activated and no asset is requested by construction.
 */
export class ImportedVehiclePresentation extends Group {
  private readonly maxOpaqueDraws: number;
  private readonly maxBodyDraws: number;
  private readonly maxPilotDraws: number;
  private readonly maxTriangles: number;
  private active: PreparedArt | null = null;
  private pending: AbortController | null = null;
  private generation = 0;
  private revision = 0;
  private statusValue: ImportedVehicleStatus = 'empty';
  private requestedValue: VehicleArtSource | null = null;
  private errorValue: Error | null = null;

  constructor(
    private readonly library: VehicleArtLibrary,
    private readonly options: ImportedVehiclePresentationOptions = {},
  ) {
    super();
    this.name = 'ImportedVehiclePresentation';
    this.maxOpaqueDraws = options.maxOpaqueDraws ?? 12;
    this.maxBodyDraws = options.maxBodyDraws ?? 6;
    this.maxPilotDraws = options.maxPilotDraws ?? 6;
    this.maxTriangles = options.maxTriangles ?? 60_000;
    if (!Number.isInteger(this.maxOpaqueDraws) || this.maxOpaqueDraws < 1
      || !Number.isInteger(this.maxBodyDraws) || this.maxBodyDraws < 1
      || !Number.isInteger(this.maxPilotDraws) || this.maxPilotDraws < 0
      || !Number.isInteger(this.maxTriangles) || this.maxTriangles < 1) {
      throw new RangeError('Imported vehicle draw and triangle budgets must be positive integers.');
    }
  }

  get status(): ImportedVehicleStatus { return this.statusValue; }
  get error(): Error | null { return this.errorValue; }
  get requestedSource(): VehicleArtSource | null { return this.requestedValue; }
  get activeSource(): VehicleArtSource | null { return this.active?.lease.source ?? null; }
  get geometryRevision(): number { return this.revision; }
  get exhaustRadialScale(): number { return this.active?.exhaustRadialScale ?? .54; }
  /** Intact geometry only: the rigid pose cache deliberately ignores visibility. */
  get geometryMeshes(): readonly Mesh[] { return this.active?.originalMeshes ?? EMPTY_MESHES; }
  get prepassMeshes(): readonly Mesh[] { return this.active?.proxies ?? EMPTY_MESHES; }
  get materials(): readonly CelMaterial[] { return this.active?.materials ?? EMPTY_MATERIALS; }
  get statistics(): ImportedVehicleStatistics {
    const active = this.active;
    return (active?.wreckBreakup?.damageVariantActive ? active.damageStatistics : null) ?? active?.statistics ?? EMPTY_STATISTICS;
  }
  get residentStatistics(): ImportedVehicleStatistics { return this.active?.residentStatistics ?? EMPTY_STATISTICS; }
  get damageVariantAvailable(): boolean { return this.active?.wreckBreakup?.damageVariantAvailable ?? false; }
  get damageVariantActive(): boolean { return this.active?.wreckBreakup?.damageVariantActive ?? false; }
  get damageVariantError(): Error | null { return this.active?.damageError ?? null; }
  get hasEmbeddedPilot(): boolean { return (this.active?.statistics.pilotDraws ?? 0) > 0; }
  get wreckBreakupActive(): boolean { return this.active?.wreckBreakup?.active ?? false; }
  get wreckBreakupAvailable(): boolean { return this.active?.wreckBreakup !== null && this.active?.wreckBreakup !== undefined; }

  updateWreckBreakup(pose: WreckVisualPose, remaining: number, terrain: { heightAt(x: number, z: number): number }, extrapolation = 0): void {
    this.active?.wreckBreakup?.update(pose, remaining, terrain, extrapolation);
    this.syncPrepassVisibility();
  }

  resetWreckBreakup(): void { this.active?.wreckBreakup?.reset(); this.syncPrepassVisibility(); }

  /** Root-space copy only; authored anchor groups and source definitions stay exact. */
  transformWreckAttachment(name: string, point: Vector3): void { this.active?.wreckBreakup?.transformAttachment(name, point); }

  /** The caller explicitly binds static atlas uniforms to materials after each geometry change. */
  getOpaqueMeshes(): readonly Mesh[] { return this.active?.meshes ?? EMPTY_MESHES; }
  getShadowMeshes(): readonly Mesh[] { return this.active?.shadowMeshes ?? EMPTY_MESHES; }
  getShadowRoot(): Object3D | null { return this.active ? this : null; }
  getAttachment(name: string): Group | undefined { return this.active?.attachments.get(name); }
  getNode(name: string): Object3D | undefined { return this.active?.nodes.get(name); }

  async setSource(definition: VehicleArtDefinition | null): Promise<ImportedVehicleStatus> {
    if (this.statusValue === 'disposed') return 'disposed';
    if (!definition) {
      this.clearArt();
      return this.statusValue;
    }
    const generation = ++this.generation;
    this.pending?.abort();
    const pending = new AbortController();
    this.pending = pending;
    this.requestedValue = Object.freeze({ id: definition.id, revision: definition.revision, url: definition.url });
    this.statusValue = 'loading';
    this.errorValue = null;
    let prepared: PreparedArt;
    let lease: VehicleArtLease | null = null;
    let damageLease: VehicleArtLease | null = null;
    let damageError: Error | null = null;
    // Both requests share the generation's cancellation. Optional failure is
    // consumed immediately, including while the intact request is pending.
    const damageRequest = definition.damageVariant
      ? this.library.acquire(definition.damageVariant, { signal: pending.signal }).catch((error: unknown) => {
        damageError = error instanceof Error ? error : new Error(String(error));
        return null;
      }) : null;
    try {
      lease = await this.library.acquire(definition, { signal: pending.signal });
      damageLease = await damageRequest;
      if (generation !== this.generation || pending.signal.aborted) {
        damageLease?.release();
        lease.release();
        return this.statusValue;
      }
      prepared = this.prepare(lease, definition, damageLease, damageError);
    } catch (error) {
      // Abort a still-pending optional acquisition, then drain any lease that
      // already resolved before the intact load/validation failed.
      const cancelled = pending.signal.aborted;
      pending.abort();
      damageLease ??= await damageRequest;
      damageLease?.release();
      lease?.release();
      if (generation !== this.generation || cancelled) return this.statusValue;
      this.pending = null;
      this.statusValue = 'error';
      this.errorValue = error instanceof Error ? error : new Error(String(error));
      return this.statusValue;
    }
    this.pending = null;
    this.statusValue = 'ready';
    this.commit(prepared);
    return this.statusValue;
  }

  /** Call after wrapper pose/LOD changes, including when the wrapper is hidden. No allocation. */
  syncPrepassVisibility(): void {
    const active = this.active;
    if (!active) return;
    for (let index = 0; index < active.meshes.length; index += 1) {
      const source = active.meshes[index];
      const proxy = active.proxies[index];
      if (source && proxy) {
        const material = source.material as CelMaterial;
        proxy.visible = visibleThroughParents(source) && material.visible && !material.transparent && material.depthWrite;
      }
    }
  }

  clearArt(): void {
    if (this.statusValue === 'disposed') return;
    this.generation += 1;
    this.pending?.abort();
    this.pending = null;
    this.requestedValue = null;
    this.errorValue = null;
    this.statusValue = 'empty';
    this.commit(null);
  }

  dispose(): void {
    if (this.statusValue === 'disposed') return;
    try { this.clearArt(); } finally {
      this.statusValue = 'disposed';
      this.removeFromParent();
    }
  }

  private commit(next: PreparedArt | null): void {
    const previous = this.active;
    this.active = next;
    if (previous) previous.lease.root.removeFromParent();
    if (next) this.add(next.lease.root);
    this.syncPrepassVisibility();
    if (!previous && !next) return;
    this.revision += 1;
    try {
      this.options.onGeometryChanged?.({
        revision: this.revision,
        previousPrepassMeshes: previous?.proxies ?? EMPTY_MESHES,
        prepassMeshes: this.prepassMeshes,
        opaqueMeshes: this.getOpaqueMeshes(),
      });
    } finally {
      if (previous) releasePrepared(previous);
    }
  }

  private prepare(lease: VehicleArtLease, definition: VehicleArtDefinition,
    damageLease: VehicleArtLease | null, damageError: Error | null): PreparedArt {
    const exhaustRadialScale = prepareExhaustRadialScale(definition, lease.root);
    const surfaceStyles = prepareSurfaceStyles(definition.surfaceStyles);
    const meshes: Mesh[] = [];
    const shadowMeshes: Mesh[] = [];
    const nodes = new Map<string, Object3D>();
    const ambiguousNames = new Set<string>();
    let triangles = 0;
    lease.root.traverse((object) => {
      if (object.name) {
        if (nodes.has(object.name)) ambiguousNames.add(object.name);
        else nodes.set(object.name, object);
      }
      if (!(object instanceof Mesh)) return;
      // GLTFLoader supplies one material per rigid primitive. Array/group subsets
      // cannot use the exact same draw range in our one-material custom MRT pass.
      if (Array.isArray(object.material)) throw new Error('Imported vehicle primitives require one material per mesh.');
      const material = object.material as ImportedSurfaceMaterial;
      if (material.transparent || material.opacity < 1 || material.alphaTest > 0 || !material.depthWrite) {
        throw new Error('Imported vehicle primitives must be opaque; transparent and alpha-cutout art needs a separate adapter.');
      }
      const geometry = object.geometry;
      const position = geometry.getAttribute('position');
      if (!position || !geometry.getAttribute('normal')) throw new Error('Imported vehicle meshes require authored positions and normals.');
      validateSurfaceMaps(object, material);
      const count = geometry.index?.count ?? position.count;
      const start = Math.max(0, geometry.drawRange.start);
      triangles += Math.max(0, Math.floor((Math.min(count, start + geometry.drawRange.count) - start) / 3));
      meshes.push(object);
      let pilot = false;
      if (definition.embeddedPilotNodePrefix) {
        for (let node: Object3D | null = object; node && node !== lease.root; node = node.parent) {
          if (node.name.startsWith(definition.embeddedPilotNodePrefix)) { pilot = true; break; }
        }
      }
      if (pilot) object.userData.inkstormRacerShadowExclude = true;
      else shadowMeshes.push(object);
    });
    for (const name of ambiguousNames) nodes.delete(name);
    if (!meshes.length || !triangles) throw new Error('Imported vehicle art contains no opaque triangle geometry.');
    const bodyDraws = shadowMeshes.length;
    const pilotDraws = meshes.length - bodyDraws;
    if (meshes.length > this.maxOpaqueDraws || bodyDraws > this.maxBodyDraws
      || pilotDraws > this.maxPilotDraws || triangles > this.maxTriangles) {
      throw new Error(`Imported vehicle exceeds its budget: ${meshes.length}/${this.maxOpaqueDraws} total draws, ${bodyDraws}/${this.maxBodyDraws} body, ${pilotDraws}/${this.maxPilotDraws} pilot, ${triangles}/${this.maxTriangles} triangles.`);
    }

    const attachments = new Map<string, Group>();
    for (const [name, anchor] of Object.entries(definition.attachments ?? {})) {
      const parent = anchor.node ? nodes.get(anchor.node) : lease.root;
      if (!name || !parent) throw new Error(`Imported vehicle attachment "${name}" needs an unambiguous authored parent.`);
      if (![...anchor.position, ...(anchor.rotation ?? [])].every(Number.isFinite)) {
        throw new Error(`Imported vehicle attachment "${name}" has an invalid transform.`);
      }
      const group = new Group();
      group.name = `vehicle-attachment-${name}`;
      group.position.fromArray(anchor.position);
      if (anchor.rotation) group.rotation.set(...anchor.rotation);
      parent.add(group);
      attachments.set(name, group);
    }

    const converted = new Map<string, CelMaterial>();
    const sourceMaterials = new Map<Mesh, ImportedSurfaceMaterial>();
    const proxies: Mesh[] = [];
    const hiddenMaterial = new MeshBasicMaterial({ name: 'ImportedVehiclePrepassOnly', visible: false });
    try {
      for (const source of meshes) {
        const original = source.material as ImportedSurfaceMaterial;
        sourceMaterials.set(source, original);
        // Match GLTFLoader's frame selection and retain its signed normalScale
        // exactly. Authored tangents and derivatives differ under shear.
        const normalMapTangents = !!original.normalMap && !!source.geometry.getAttribute('tangent');
        const key = `${original.uuid}:${normalMapTangents ? 'authored-tangents' : 'derivative-tangents'}`;
        let material = converted.get(key);
        if (!material) {
          const style = surfaceStyles.get(original.name);
          const tint = new Color(this.options.materialOptions?.tint ?? 0xffffff);
          if (original.color) tint.multiply(original.color);
          const normalScale = original.normalScale?.clone() ?? new Vector2(1, 1);
          normalScale.multiplyScalar(style?.normalStrength ?? 1);
          material = new CelMaterial({
            palette: TEXTURED_PALETTE,
            ...this.options.materialOptions,
            ...style?.materialOptions,
            name: `ImportedVehicleCel:${original.name || original.type}`,
            baseColorMap: original.map ?? null,
            normalMap: original.normalMap ?? null,
            normalScale,
            normalMapTangents,
            roughnessMap: original.roughnessMap ?? null,
            // Preserve legacy map-only craft shading. A supplied roughness map
            // opts into its authored factor; an explicit caller override still
            // works for materials without one.
            ...(original.roughnessMap ? { roughness: original.roughness ?? 1 } : {}),
            tint, side: original.side, opacity: 1, vertexColors: original.vertexColors ?? false,
          });
          material.visible = original.visible;
          converted.set(key, material);
        }
        source.material = material;
        source.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
        const proxy = new Mesh(source.geometry, hiddenMaterial);
        proxy.name = `ImportedVehiclePrepass:${source.name || source.id}`;
        proxy.userData.inkstormRacerShadowExclude = true;
        // Identity child transform follows engine articulation and nonuniform scale.
        source.add(proxy);
        proxies.push(proxy);
      }
    } catch (error) {
      for (const proxy of proxies) proxy.removeFromParent();
      for (const material of converted.values()) material.dispose();
      hiddenMaterial.dispose();
      throw error;
    }
    const originalMeshes = Object.freeze([...meshes]);
    const statistics = artStatistics(meshes, shadowMeshes);
    const wreckBreakup = definition.id === 'teemto' ? TeemtoWreckBreakup.create(lease.root, nodes, originalMeshes) : null;
    let damageStatistics: ImportedVehicleStatistics | null = null;
    let installedDamageLease: VehicleArtLease | null = null;
    if (damageLease) {
      const damageProxies: Mesh[] = [];
      try {
        if (!wreckBreakup) throw new Error('Damage variant requires the supported intact Teemto hierarchy.');
        const damage = this.prepareDamage(damageLease, originalMeshes, shadowMeshes, sourceMaterials);
        // The helper measures authored pivots in this same intact root space.
        lease.root.add(damageLease.root);
        for (const source of damage.meshes) {
          source.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
          const proxy = new Mesh(source.geometry, hiddenMaterial);
          proxy.name = `ImportedVehiclePrepass:${source.name}`;
          proxy.userData.inkstormRacerShadowExclude = true;
          source.add(proxy);
          damageProxies.push(proxy);
        }
        if (!wreckBreakup.installDamageVariant(damage.meshes)) throw new Error('Damage variant helper rejected its authored hierarchy.');
        for (const source of damage.meshes) nodes.set(source.name, source);
        meshes.push(...damage.meshes); shadowMeshes.push(...damage.meshes); proxies.push(...damageProxies);
        installedDamageLease = damageLease;
        damageStatistics = damage.statistics;
      } catch (error) {
        wreckBreakup?.reset();
        for (const proxy of damageProxies) proxy.removeFromParent();
        damageLease.release();
        damageError = error instanceof Error ? error : new Error(String(error));
      }
    }
    return {
      lease, damageLease: installedDamageLease, damageError, exhaustRadialScale, originalMeshes,
      meshes: Object.freeze(meshes), shadowMeshes: Object.freeze(shadowMeshes), proxies: Object.freeze(proxies),
      materials: Object.freeze(Array.from(converted.values())), hiddenMaterial, attachments, nodes,
      statistics, damageStatistics, residentStatistics: artStatistics(meshes, shadowMeshes), wreckBreakup,
    };
  }

  private prepareDamage(lease: VehicleArtLease, originalMeshes: readonly Mesh[], originalShadows: readonly Mesh[],
    sourceMaterials: ReadonlyMap<Mesh, ImportedSurfaceMaterial>): { meshes: Mesh[]; statistics: ImportedVehicleStatistics } {
    const meshes: Mesh[] = [], names = new Set<string>();
    lease.root.traverse(object => {
      if (object.matrixAutoUpdate) object.updateMatrix();
      if (!object.matrix.elements.every(Number.isFinite)) throw new Error('Damage variant has a non-finite authored transform.');
      if (!(object instanceof Mesh)) return;
      const name = object.name as keyof typeof DAMAGE_MATERIAL_SOURCES;
      if (!Object.hasOwn(DAMAGE_MATERIAL_SOURCES, name) || names.has(name)) throw new Error('Damage variant requires exact unique authored mesh names.');
      names.add(name);
      const source = originalMeshes.find(mesh => mesh.name === DAMAGE_MATERIAL_SOURCES[name]);
      const material = source && sourceMaterials.get(source);
      if (!source || !material) throw new Error('Damage variant cannot resolve its original surface material.');
      const position = object.geometry.getAttribute('position'), normal = object.geometry.getAttribute('normal');
      const uv = object.geometry.getAttribute('uv');
      if (!position || position.itemSize !== 3 || !position.count || !normal || normal.itemSize !== 3
        || normal.count !== position.count || !uv || uv.itemSize !== 2 || uv.count !== position.count) {
        throw new Error('Damage variant requires complete authored positions, normals and UVs.');
      }
      for (let index = 0; index < position.count; index++) {
        if (![position.getX(index), position.getY(index), position.getZ(index),
          normal.getX(index), normal.getY(index), normal.getZ(index), uv.getX(index), uv.getY(index)].every(Number.isFinite)) {
          throw new Error('Damage variant contains non-finite positions, normals or UVs.');
        }
      }
      const indices = object.geometry.index;
      if (indices) for (let index = 0; index < indices.count; index++) {
        const value = indices.getX(index);
        if (!Number.isInteger(value) || value < 0 || value >= position.count) throw new Error('Damage variant has an invalid triangle index.');
      }
      if (!triangleCount(object)) throw new Error('Damage variant has no triangle geometry.');
      validateSurfaceMaps(object, material);
      if (material.normalMap && source.geometry.hasAttribute('tangent') && !object.geometry.hasAttribute('tangent')) {
        throw new Error('Damage variant must preserve the borrowed material tangent frame.');
      }
      object.material = source.material;
      meshes.push(object);
    });
    const cockpit = names.has('teemto-damage-cockpit-stubs-v16'), tethers = names.has('teemto-damage-severed-tethers-v16');
    if (!names.has('teemto-damage-right-front-v16') || !names.has('teemto-damage-right-rear-v16')
      || cockpit !== tethers || meshes.length !== (cockpit ? 4 : 2)) {
      throw new Error('Damage variant requires two engine fragments with an optional complete cockpit/tether pair.');
    }
    const replaced = new Set<string>(meshes.map(mesh => DAMAGE_MATERIAL_SOURCES[mesh.name as keyof typeof DAMAGE_MATERIAL_SOURCES]));
    const statistics = artStatistics([...originalMeshes.filter(mesh => !replaced.has(mesh.name)), ...meshes],
      [...originalShadows.filter(mesh => !replaced.has(mesh.name)), ...meshes]);
    if (statistics.opaqueDraws > this.maxOpaqueDraws || statistics.bodyDraws > this.maxBodyDraws
      || statistics.pilotDraws > this.maxPilotDraws || statistics.triangles > this.maxTriangles) {
      throw new Error(`Damage replacement exceeds its budget: ${statistics.opaqueDraws}/${this.maxOpaqueDraws} total draws, ${statistics.bodyDraws}/${this.maxBodyDraws} body, ${statistics.pilotDraws}/${this.maxPilotDraws} pilot, ${statistics.triangles}/${this.maxTriangles} triangles.`);
    }
    return { meshes, statistics };
  }
}
