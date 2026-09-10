import { attachPilotToAnchor, type PilotView } from '../render/pilots';
import {
  Box3,
  Mesh,
  NoToneMapping,
  PerspectiveCamera,
  Scene,
  Sphere,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';

import {
  GALACTIC_VEHICLE_ORDER,
  GALACTIC_VEHICLES,
} from '../game/galactic/catalog';
import type { GalacticVehicleClass } from '../game/galactic/types';
import { ART_APPEARANCES, resolveVehicleAppearance, type VehicleAppearanceId } from '../game/vehicleAppearance';
import { RacerPresentation } from '../render/vehicles/RacerPresentation';
import { VehicleArtLibrary } from '../render/vehicles/VehicleArtLibrary';
import {
  createCelMaterial,
  CEL_PALETTES,
  createInvertedHullOutline,
  InvertedHullMaterial,
  type InvertedHullHandle,
} from '../render/materials';
import {
  type PodracerMaterials,
} from '../render/objects/PodracerView';

export const VEHICLE_CARD_PREVIEW_SELECTOR =
  '[data-vehicle-preview][data-vehicle-id]';

const PREVIEW_IMAGE_ATTRIBUTE = 'data-vehicle-preview-image';
const PREVIEW_IMAGE_SELECTOR = `[${PREVIEW_IMAGE_ATTRIBUTE}]`;
const PREVIEW_SILHOUETTE_PARTS = new Set([
  'engine-shell',
  'intake-cowl',
  'nozzle',
  'cockpit-shell',
  'cockpit-nose',
]);

export interface VehiclePreviewRenderLimits {
  readonly maxPixelRatio: number;
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly fallbackWidth: number;
  readonly fallbackHeight: number;
}

export interface VehiclePreviewRenderSize {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  /** Effective uniform render scale after DPR and texture-size caps. */
  readonly pixelRatio: number;
}

export const DEFAULT_VEHICLE_PREVIEW_LIMITS: Readonly<VehiclePreviewRenderLimits> =
  Object.freeze({
    maxPixelRatio: 1.5,
    maxWidth: 720,
    maxHeight: 360,
    fallbackWidth: 360,
    fallbackHeight: 180,
  });

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Calculates one uniformly scaled render target. Width and height are capped
 * together so a very wide card never stretches the vehicle silhouette.
 */
export function calculateVehiclePreviewRenderSize(
  width: number,
  height: number,
  devicePixelRatio: number,
  limits: Readonly<VehiclePreviewRenderLimits> = DEFAULT_VEHICLE_PREVIEW_LIMITS,
): VehiclePreviewRenderSize {
  const cssWidth = finitePositive(width, limits.fallbackWidth);
  const cssHeight = finitePositive(height, limits.fallbackHeight);
  const requestedRatio = Math.min(
    finitePositive(devicePixelRatio, 1),
    finitePositive(limits.maxPixelRatio, 1),
  );
  const uniformScale = Math.min(
    requestedRatio,
    finitePositive(limits.maxWidth, 1) / cssWidth,
    finitePositive(limits.maxHeight, 1) / cssHeight,
  );

  return Object.freeze({
    cssWidth,
    cssHeight,
    pixelWidth: Math.max(1, Math.round(cssWidth * uniformScale)),
    pixelHeight: Math.max(1, Math.round(cssHeight * uniformScale)),
    pixelRatio: uniformScale,
  });
}

/** Strictly validates DOM data rather than silently showing the wrong craft. */
export function resolveVehiclePreviewClass(
  value: string | null | undefined,
): GalacticVehicleClass | null {
  return value !== null
    && value !== undefined
    && (GALACTIC_VEHICLE_ORDER as readonly string[]).includes(value)
    ? value as GalacticVehicleClass
    : null;
}

export interface VehicleCardPreviewRendererOptions {
  /** Update menu feedback independently of the paused race simulation clock. */
  readonly onAppearanceStatusChange?: () => void;
  /** Shared CPU art ownership across the race and menu renderers. */
  readonly library?: VehicleArtLibrary;
  /** Root containing the four card hosts. May be supplied later to show(). */
  readonly root?: ParentNode;
  readonly limits?: Partial<VehiclePreviewRenderLimits>;
  /** Release the menu-only GPU context as soon as racing starts. Default true. */
  readonly releaseOnHide?: boolean;
}

interface PreviewHost {
  readonly appearance: VehicleAppearanceId;
  readonly element: HTMLElement;
  readonly vehicleClass: GalacticVehicleClass;
  readonly size: VehiclePreviewRenderSize;
  readonly angle: number;
  readonly key: string;
}

interface PreviewCacheEntry {
  readonly appearance: VehicleAppearanceId;
  readonly status: 'ready' | 'error';
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly source: string;
}

interface PreviewResources {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly vehicles: ReadonlyMap<GalacticVehicleClass, RacerPresentation>;
  readonly pilots: ReadonlyMap<GalacticVehicleClass, PilotView>;
  readonly outlines: readonly InvertedHullHandle[];
  readonly outlineMaterial: InvertedHullMaterial;
}

const cameraDirection = new Vector3(0.7, 0.38, -1).normalize();
const bounds = new Box3();
const geometryBounds = new Box3();
const boundsSphere = new Sphere();
const previewCenter = new Vector3();
const previewCorner = new Vector3();
const previewOffset = new Vector3();
const previewRight = new Vector3();
const previewUp = new Vector3();
const worldUp = new Vector3(0, 1, 0);

/**
 * Box3.setFromObject includes hidden class modules, which makes menu portraits
 * look tiny even though only one vehicle silhouette is actually rendered.
 * Build the framing bounds from visible geometry only.
 */
function setVisibleGeometryBounds(target: Box3, vehicle: RacerPresentation): Box3 {
  target.makeEmpty();
  vehicle.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.every((material) => !material.visible) || materials.some((material) => material.transparent)) return;
    const localBounds = object.geometry.boundingBox;
    if (localBounds) geometryBounds.copy(localBounds);
    else {
      const position = object.geometry.getAttribute('position');
      if (!position) return;
      geometryBounds.makeEmpty();
      for (let index = 0; index < position.count; index += 1) {
        previewCorner.set(position.getX(index), position.getY(index), position.getZ(index));
        geometryBounds.expandByPoint(previewCorner);
      }
    }
    geometryBounds.applyMatrix4(object.matrixWorld);
    target.union(geometryBounds);
  });
  return target;
}

function createPreviewMaterials(index: number): PodracerMaterials {
  const shellPalette = [
    CEL_PALETTES.player,
    CEL_PALETTES.rivalTeal,
    CEL_PALETTES.rivalGold,
    CEL_PALETTES.machinery,
  ][index] ?? CEL_PALETTES.player;
  const secondaryPalette = [
    CEL_PALETTES.rivalGold,
    CEL_PALETTES.machinery,
    CEL_PALETTES.player,
    CEL_PALETTES.rivalTeal,
  ][index] ?? CEL_PALETTES.rivalGold;

  return {
    shell: createCelMaterial({
      name: `Vehicle card ${index} shell`,
      palette: shellPalette,
      tint: index === 3 ? '#b78bd7' : '#ffffff',
      specularPower: 28,
      specularCutoff: 0.24,
      specularStrength: 0.32,
      rimStrength: 0.42,
      reflectionStrength: 0.13,
      hazeNear: 1_000,
      hazeFar: 2_000,
    }),
    secondary: createCelMaterial({
      name: `Vehicle card ${index} secondary`,
      palette: secondaryPalette,
      specularPower: 36,
      specularCutoff: 0.3,
      rimStrength: 0.28,
      reflectionStrength: 0.12,
      hazeNear: 1_000,
      hazeFar: 2_000,
    }),
    metal: createCelMaterial({
      name: `Vehicle card ${index} machinery`,
      palette: CEL_PALETTES.machinery,
      specularPower: 46,
      specularCutoff: 0.22,
      specularStrength: 0.48,
      rimStrength: 0.34,
      reflectionStrength: 0.27,
      hazeNear: 1_000,
      hazeFar: 2_000,
    }),
    ink: createCelMaterial({
      name: `Vehicle card ${index} mechanical ink`,
      palette: CEL_PALETTES.machinery,
      tint: '#321a31',
      specularStrength: 0,
      rimStrength: 0.1,
      reflectionStrength: 0.02,
      hazeNear: 1_000,
      hazeFar: 2_000,
    }),
    canopy: createCelMaterial({
      name: `Vehicle card ${index} canopy`,
      palette: shellPalette,
      tint: index === 1 ? '#8cc8bb' : index === 2 ? '#c78368' : '#8078b8',
      specularPower: 54,
      specularCutoff: 0.2,
      specularStrength: 0.55,
      rimStrength: 0.48,
      reflectionStrength: 0.38,
      hazeNear: 1_000,
      hazeFar: 2_000,
    }),
    accent: createCelMaterial({
      name: `Vehicle card ${index} accent`,
      palette: secondaryPalette,
      emissiveStrength: 0.16,
      rimStrength: 0.34,
      hazeNear: 1_000,
      hazeFar: 2_000,
    }),
  };
}

function findPreviewHosts(root: ParentNode): HTMLElement[] {
  const result = Array.from(
    root.querySelectorAll<HTMLElement>(VEHICLE_CARD_PREVIEW_SELECTOR),
  );
  if (
    root instanceof HTMLElement
    && root.matches(VEHICLE_CARD_PREVIEW_SELECTOR)
  ) {
    result.unshift(root);
  }
  return result;
}

function ensurePreviewImage(host: HTMLElement): HTMLImageElement {
  const existing = host.querySelector<HTMLImageElement>(PREVIEW_IMAGE_SELECTOR);
  if (existing) return existing;

  const image = document.createElement('img');
  image.setAttribute(PREVIEW_IMAGE_ATTRIBUTE, '');
  image.decoding = 'async';
  image.draggable = false;
  image.style.display = 'block';
  image.style.width = '100%';
  image.style.height = '100%';
  image.style.objectFit = 'contain';
  image.style.pointerEvents = 'none';
  image.style.userSelect = 'none';
  image.style.opacity = '0';
  host.append(image);
  return image;
}

async function decodeSource(source: string): Promise<void> {
  if (typeof Image === 'undefined') return;
  const decoder = new Image();
  decoder.decoding = 'async';
  decoder.src = source;
  if (typeof decoder.decode !== 'function') return;
  try {
    await decoder.decode();
  } catch {
    // A decoded data URL is an optimization, not a correctness boundary. The
    // DOM image can still decode it through the browser's normal image path.
  }
}

/**
 * Produces stable card art from the exact procedural gameplay meshes.
 *
 * All four craft are rendered sequentially by one short-lived WebGL context.
 * The resulting transparent images are decoded before an atomic DOM swap, so
 * a selector frame never alternates between blank canvases. There is no menu
 * animation loop; hide() releases every GPU resource before the race begins.
 */
export class VehicleCardPreviewRenderer {
  private readonly library: VehicleArtLibrary;
  private readonly ownsLibrary: boolean;
  private appearance: VehicleAppearanceId = 'procedural';
  private appearanceStatusValue: 'ready' | 'loading' | 'error' = 'ready';
  private readonly onAppearanceStatusChange: (() => void) | undefined;
  private root: ParentNode | null;
  private readonly limits: Readonly<VehiclePreviewRenderLimits>;
  private readonly heroLimits: Readonly<VehiclePreviewRenderLimits>;
  private readonly releaseOnHide: boolean;
  private readonly cache = new Map<string, PreviewCacheEntry>();
  private readonly managedImages = new Set<HTMLImageElement>();
  private resources: PreviewResources | null = null;
  private observer: ResizeObserver | null = null;
  private resizeFrame = 0;
  private inspectionFrame = 0;
  private refreshInFlight: Promise<void> | null = null;
  private refreshAgain = false;
  private lifecycleVersion = 0;
  private visibleValue = false;
  private disposed = false;
  private selected: GalacticVehicleClass | null = null;

  constructor(options: VehicleCardPreviewRendererOptions = {}) {
    this.onAppearanceStatusChange = options.onAppearanceStatusChange;
    this.library = options.library ?? new VehicleArtLibrary({ maxIdleEntries: 1 });
    this.ownsLibrary = options.library === undefined;
    this.root = options.root ?? null;
    this.releaseOnHide = options.releaseOnHide ?? true;
    this.limits = Object.freeze({
      ...DEFAULT_VEHICLE_PREVIEW_LIMITS,
      ...options.limits,
    });
    // The wide inspection bay needs more pixels than a small selection card.
    // Both are still one-shot renders, and caller-provided caps remain final.
    this.heroLimits = Object.freeze({
      ...DEFAULT_VEHICLE_PREVIEW_LIMITS,
      maxWidth: 1_440,
      maxHeight: 720,
      ...options.limits,
    });
  }

  get visible(): boolean {
    return this.visibleValue;
  }

  /** True only while the selector owns its single temporary WebGL context. */
  get hasGpuResources(): boolean {
    return this.resources !== null;
  }

  get appearanceStatus(): 'ready' | 'loading' | 'error' { return this.appearanceStatusValue; }

  private setAppearanceStatus(status: 'ready' | 'loading' | 'error'): void {
    if (this.disposed || this.appearanceStatusValue === status) return;
    this.appearanceStatusValue = status;
    this.onAppearanceStatusChange?.();
  }

  setAppearance(appearance: VehicleAppearanceId): void {
    if (this.disposed || appearance === this.appearance) return;
    this.appearance = appearance;
    this.setAppearanceStatus(appearance !== 'procedural' ? 'loading' : 'ready');
    this.lifecycleVersion += 1;
    // Cancel a superseded preview consumer immediately. Waiting for the old
    // network response would otherwise block the newer image refresh loop.
    void this.resources?.vehicles.get('podracer')?.setAppearance(appearance);
    if (this.refreshInFlight) this.refreshAgain = true;
  }

  retryAppearance(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.lifecycleVersion += 1;
    this.cache.clear();
    this.releaseGpuResources();
    this.setAppearanceStatus(this.appearance !== 'procedural' ? 'loading' : 'ready');
    return this.refresh().catch(() => { if (this.visibleValue) this.setAppearanceStatus('error'); });
  }

  /** Mount is an alias for show(), useful at app construction sites. */
  mount(root?: ParentNode): Promise<void> {
    return this.show(root);
  }

  async show(root?: ParentNode): Promise<void> {
    if (this.disposed) throw new Error('Cannot show a disposed vehicle preview renderer.');
    if (root) this.root = root;
    if (!this.root) {
      if (typeof document === 'undefined') {
        throw new Error('Vehicle card previews require a DOM root.');
      }
      this.root = document;
    }
    this.lifecycleVersion += 1;
    this.visibleValue = true;
    this.observeHosts();
    this.applySelectionState();
    await this.refresh();
  }

  hide(): void {
    if (this.disposed || !this.visibleValue) return;
    this.lifecycleVersion += 1;
    this.visibleValue = false;
    this.stopObserving();
    if (this.releaseOnHide) this.releaseGpuResources();
  }

  setSelected(vehicleClass: GalacticVehicleClass): void {
    if (this.disposed || this.selected === vehicleClass) return;
    this.selected = vehicleClass;
    this.lifecycleVersion += 1;
    if (this.refreshInFlight) this.refreshAgain = true;
    this.applySelectionState();
  }

  /** Inspect the actual loaded mesh without image encoding or a perpetual render loop. */
  setInspectionAngle(angle: number): void {
    if (!Number.isFinite(angle) || !this.visibleValue || this.disposed) return;
    const host = this.root?.querySelector<HTMLElement>('[data-vehicle-preview="hero"]');
    if (!host) return;
    host.dataset.previewAngle = String(((angle % 360) + 360) % 360);
    this.scheduleInspection();
  }

  private scheduleInspection(): void {
    if (this.inspectionFrame || !this.visibleValue || this.disposed || typeof window === 'undefined') return;
    this.inspectionFrame = window.requestAnimationFrame(() => {
      this.inspectionFrame = 0;
      if (this.refreshInFlight) {
        void this.refreshInFlight.then(() => this.scheduleInspection(), () => undefined);
        return;
      }
      const root = this.root, resources = this.resources;
      if (!root || !resources || !this.visibleValue || this.disposed) return;
      const host = this.collectHosts(root).find(host => host.element.dataset.vehiclePreview === 'hero');
      if (!host || host.element.dataset.previewReady !== 'true') return;
      const vehicle = resources.vehicles.get(host.vehicleClass);
      if (!vehicle || vehicle.activeAppearanceId !== host.element.dataset.previewAppearance) return;
      this.renderVehicle(resources, host.vehicleClass, host.size.pixelWidth, host.size.pixelHeight, host.angle, false);
      let canvas = host.element.querySelector<HTMLCanvasElement>('[data-vehicle-inspection-canvas]');
      if (!canvas) {
        canvas = host.element.ownerDocument.createElement('canvas');
        canvas.dataset.vehicleInspectionCanvas = '';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none';
        host.element.append(canvas);
      }
      if (canvas.width !== host.size.pixelWidth) canvas.width = host.size.pixelWidth;
      if (canvas.height !== host.size.pixelHeight) canvas.height = host.size.pixelHeight;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(resources.renderer.domElement, 0, 0);
      const image = host.element.querySelector<HTMLImageElement>(PREVIEW_IMAGE_SELECTOR);
      if (image) image.style.display = 'none';
      canvas.hidden = false;
      canvas.style.display = 'block';
      host.element.dataset.previewMode = 'interactive';
      host.element.dataset.renderedAngle = String(host.angle);
    });
  }

  /**
   * Requeries hosts and refreshes only sizes that are not already cached.
   * Concurrent ResizeObserver notifications are coalesced into one extra pass.
   */
  refresh(): Promise<void> {
    if (this.disposed || !this.visibleValue) return Promise.resolve();
    if (this.refreshInFlight) {
      this.refreshAgain = true;
      return this.refreshInFlight;
    }

    const run = this.runRefreshLoop();
    this.refreshInFlight = run;
    void run.then(
      () => {
        if (this.refreshInFlight === run) this.refreshInFlight = null;
      },
      () => {
        if (this.refreshInFlight === run) this.refreshInFlight = null;
        if (this.visibleValue) this.setAppearanceStatus('error');
      },
    );
    return run;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.visibleValue = false;
    this.lifecycleVersion += 1;
    this.stopObserving();
    this.releaseGpuResources();
    if (this.ownsLibrary) this.library.dispose();
    this.cache.clear();
    for (const image of this.managedImages) image.remove();
    this.managedImages.clear();
    this.root = null;
  }

  private async runRefreshLoop(): Promise<void> {
    do {
      this.refreshAgain = false;
      await this.performRefresh();
    } while (this.refreshAgain && this.visibleValue && !this.disposed);
  }

  private async performRefresh(): Promise<void> {
    const root = this.root;
    if (!root || !this.visibleValue || this.disposed) return;
    const version = this.lifecycleVersion;
    const hosts = this.collectHosts(root);
    if (hosts.length === 0) return;

    const missing = hosts.filter((host) => {
      const cached = this.cache.get(host.key);
      return !cached
        || cached.pixelWidth !== host.size.pixelWidth
        || cached.pixelHeight !== host.size.pixelHeight;
    });
    // A cached snapshot survives hide(), but its interactive mesh/context does
    // not. Prepare the hero even on cache hits before inspection can resume.
    const prepare = hosts.filter(host => missing.includes(host) || host.element.dataset.vehiclePreview === 'hero');
    if (prepare.length > 0) {
      const resources = this.ensureResources();
      for (const host of prepare) {
        const vehicle = resources.vehicles.get(host.vehicleClass);
        if (!vehicle) continue;
        if (host.appearance !== 'procedural' && vehicle.activeAppearanceId !== host.appearance && vehicle.appearanceStatus !== 'error') this.setAppearanceStatus('loading');
        await vehicle.setAppearance(host.appearance);
        if (version !== this.lifecycleVersion || !this.visibleValue || this.disposed || this.resources !== resources) return;
        const status = vehicle.appearanceStatus === 'error' ? 'error' : 'ready';
        const cached = this.cache.get(host.key);
        if (!missing.includes(host) && cached?.appearance === vehicle.activeAppearanceId && cached.status === status) continue;
        const source = this.renderVehicle(
          resources,
          host.vehicleClass,
          host.size.pixelWidth,
          host.size.pixelHeight,
          host.angle,
        );
        this.cache.set(host.key, {
          appearance: vehicle.activeAppearanceId,
          status,
          pixelWidth: host.size.pixelWidth,
          pixelHeight: host.size.pixelHeight,
          source,
        });
      }
    }

    const commits = hosts.flatMap((host) => {
      const cached = this.cache.get(host.key);
      return cached ? [{ host, source: cached.source, appearance: cached.appearance, status: cached.status }] : [];
    });
    await Promise.all(commits.map(({ source }) => decodeSource(source)));
    if (
      version !== this.lifecycleVersion
      || !this.visibleValue
      || this.disposed
    ) return;

    // Sources are assigned in the same task only after every image has decoded;
    // the browser can therefore paint all four cards as one stable frame.
    let committedStatus: 'ready' | 'error' | undefined;
    for (const { host, source, appearance, status } of commits) {
      const image = ensurePreviewImage(host.element);
      this.managedImages.add(image);
      image.alt = appearance !== 'procedural' ? `${ART_APPEARANCES[appearance].label} 3D model with seated pilot and twin engines`
        : `${GALACTIC_VEHICLES[host.vehicleClass].label} classic 3D model`;
      if (image.src !== source) image.src = source;
      image.style.opacity = '1';
      image.style.display = 'block';
      const inspectionCanvas = host.element.querySelector<HTMLCanvasElement>('[data-vehicle-inspection-canvas]');
      if (inspectionCanvas) { inspectionCanvas.hidden = true; inspectionCanvas.style.display = 'none'; }
      host.element.dataset.previewMode = 'snapshot';
      host.element.dataset.renderedAngle = String(host.angle);
      host.element.dataset.previewReady = 'true';
      host.element.dataset.previewAppearance = appearance;
      host.element.dataset.previewState = status === 'error' ? 'fallback' : 'ready';
      if (host.vehicleClass === 'podracer') committedStatus = status;
    }
    // Notify only after the decoded images and their state are committed. The
    // garage has no simulation ticks to trigger another ordinary HUD update.
    if (committedStatus) this.setAppearanceStatus(committedStatus);
    // Keep inspection snapshots bounded across viewport and angle changes.
    while (this.cache.size > 40) this.cache.delete(this.cache.keys().next().value!);
    this.applySelectionState();
  }

  private collectHosts(root: ParentNode): PreviewHost[] {
    const pixelRatio = typeof window === 'undefined'
      ? 1
      : window.devicePixelRatio || 1;
    const hosts: PreviewHost[] = [];

    for (const element of findPreviewHosts(root)) {
      const vehicleClass = resolveVehiclePreviewClass(element.dataset.vehicleId);
      if (!vehicleClass) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const limits = element.dataset.vehiclePreview === 'hero' ? this.heroLimits : this.limits;
      const size = calculateVehiclePreviewRenderSize(rect.width, rect.height, pixelRatio, limits);
      const rawAngle = Number(element.dataset.previewAngle ?? 0);
      const angle = Number.isFinite(rawAngle) ? Math.round(rawAngle) : 0;
      const appearance = resolveVehicleAppearance(vehicleClass, this.appearance);
      hosts.push({ element, vehicleClass, size, angle, appearance,
        key: `${vehicleClass}:${appearance}:${size.pixelWidth}:${size.pixelHeight}:${angle}`,
      });
    }

    return hosts;
  }

  private ensureResources(): PreviewResources {
    if (this.resources) return this.resources;
    const renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NoToneMapping;
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);

    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 2, 0.1, 500);
    const vehicles = new Map<GalacticVehicleClass, RacerPresentation>();
    const pilots = new Map<GalacticVehicleClass, PilotView>();
    const outlines: InvertedHullHandle[] = [];
    const outlineMaterial = new InvertedHullMaterial({
      ink: '#0c0914',
      widthPx: 1.8,
      opacity: 0.98,
    });

    GALACTIC_VEHICLE_ORDER.forEach((vehicleClass, index) => {
      // Preview imported art at hero detail independently of a card's physics-class index.
      const view = new RacerPresentation(this.library, createPreviewMaterials(index), vehicleClass === 'podracer' ? 0 : index);
      view.setVehicleClass(vehicleClass);
      view.name = `vehicle-card-${vehicleClass}`;
      const pilot = attachPilotToAnchor(view.pilotAnchor, { racerIndex: 0, detail: 'hero', outlineWidthPx: 1.1 });
      pilot.update({ time: 1.75, deltaTime: 1 / 60, steering: 0.08, throttle: 0, grounded: true, racePhase: 'countdown' });
      pilots.set(vehicleClass, pilot);
      view.update({
        x: 0,
        y: 0,
        z: 0,
        yaw: -0.18,
        pitch: 0.025,
        roll: 0,
        steer: 0.12,
        throttle: 0.7,
        speed: 126,
        boost: 0.12,
        damage: 0,
      }, 1.75 + index * 0.31);
      const silhouetteSources: Mesh[] = [];
      view.traverse((object) => {
        if (object instanceof Mesh && PREVIEW_SILHOUETTE_PARTS.has(object.name)) {
          silhouetteSources.push(object);
        }
      });
      for (const source of silhouetteSources) {
        outlines.push(createInvertedHullOutline(source, {
          material: outlineMaterial,
          generateMissingNormals: true,
        }));
      }
      view.visible = false;
      vehicles.set(vehicleClass, view);
      scene.add(view);
    });

    this.resources = {
      renderer,
      scene,
      camera,
      vehicles,
      pilots,
      outlines,
      outlineMaterial,
    };
    return this.resources;
  }

  private renderVehicle(
    resources: PreviewResources,
    vehicleClass: GalacticVehicleClass,
    width: number,
    height: number,
    angle = 0,
    encode = true,
  ): string {
    for (const vehicle of resources.vehicles.values()) vehicle.visible = false;
    const vehicle = resources.vehicles.get(vehicleClass);
    if (!vehicle) throw new Error(`Missing procedural preview for ${vehicleClass}.`);
    // Polwo's long, low engines foreshorten severely at the shared rear angle.
    // Its opposite rear quarter spreads both engines and cockpit across the
    // wide host, facing the existing key light without changing any materials.
    if (vehicle.activeAppearanceId === 'polwo') cameraDirection.set(-1.5, 0.5, -0.5);
    // The raised broadside view clears the tall cockpit walls and spreads the
    // long craft across the inspection bay; orbit controls expose the intakes.
    else if (vehicle.activeAppearanceId === 'blockrunner') cameraDirection.set(-1.6838457268119895, 1.05, -0.6834936490538903);
    // Spread Teemto's long silhouette across the wide inspection bay.
    else if (vehicle.activeAppearanceId === 'teemto') cameraDirection.set(1.5, 0.42, -0.45);
    else cameraDirection.set(0.7, 0.38, -1);
    // On a tall inspection stage, look along the hull from above: the full
    // long craft occupies real vertical space instead of a tiny broadside strip.
    if (width / Math.max(1, height) < .85) {
      cameraDirection.set(vehicle.activeAppearanceId === 'polwo' || vehicle.activeAppearanceId === 'blockrunner' ? -.38 : .38, .9, -1);
    }
    cameraDirection.normalize().applyAxisAngle(worldUp, angle * Math.PI / 180);
    vehicle.visible = true;
    const parked = vehicle.activeAppearanceId === 'polwo' || vehicle.activeAppearanceId === 'blockrunner';
    vehicle.update({ x: 0, y: 0, z: 0, yaw: -.18, pitch: .025, roll: 0,
      steer: .12, throttle: parked ? 0 : .7, speed: parked ? 0 : 126,
      boost: parked ? 0 : .12, damage: 0 }, 1.75 + vehicle.racerIndex * .31);
    vehicle.syncVisibility();
    vehicle.updateMatrixWorld(true);

    resources.renderer.setSize(width, height, false);
    resources.outlineMaterial.setViewport(width, height, 1);
    resources.pilots.get(vehicleClass)?.setViewport(width, height, 1);
    resources.pilots.get(vehicleClass)?.syncOutlines();
    resources.camera.aspect = width / Math.max(1, height);

    setVisibleGeometryBounds(bounds, vehicle);
    bounds.getBoundingSphere(boundsSphere);
    bounds.getCenter(previewCenter);
    const verticalFov = resources.camera.fov * Math.PI / 180;
    const horizontalFov = 2 * Math.atan(
      Math.tan(verticalFov * 0.5) * resources.camera.aspect,
    );
    const tanHalfHorizontal = Math.max(0.01, Math.tan(horizontalFov * 0.5));
    const tanHalfVertical = Math.max(0.01, Math.tan(verticalFov * 0.5));
    // Target a large, legible catalogue portrait while leaving enough space
    // for inverted hull ink and the asymmetric three-quarter silhouette.
    const horizontalFill = 0.94;
    const verticalFill = 0.82;
    previewRight.crossVectors(worldUp, cameraDirection).normalize();
    previewUp.crossVectors(cameraDirection, previewRight).normalize();
    let distance = 0.1;
    // Frame the actual visible vertices instead of the corners of one large
    // world AABB. The latter contains a lot of empty space around these long,
    // swept silhouettes and was the reason the first card pass read as tiny.
    vehicle.traverseVisible((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.every((material) => !material.visible) || materials.some((material) => material.transparent)) return;
      const position = object.geometry.getAttribute('position');
      if (!position) return;
      for (let index = 0; index < position.count; index += 1) {
        previewCorner
          .set(position.getX(index), position.getY(index), position.getZ(index))
          .applyMatrix4(object.matrixWorld);
        previewOffset.copy(previewCorner).sub(previewCenter);
        const towardCamera = previewOffset.dot(cameraDirection);
        const horizontal = Math.abs(previewOffset.dot(previewRight));
        const vertical = Math.abs(previewOffset.dot(previewUp));
        distance = Math.max(
          distance,
          towardCamera + horizontal / (tanHalfHorizontal * horizontalFill),
          towardCamera + vertical / (tanHalfVertical * verticalFill),
        );
      }
    });
    distance *= 1.025;
    resources.camera.position.copy(previewCenter).addScaledVector(cameraDirection, distance);
    resources.camera.near = Math.max(0.05, distance - boundsSphere.radius * 1.8);
    resources.camera.far = distance + boundsSphere.radius * 2.4;
    resources.camera.lookAt(previewCenter);
    resources.camera.updateProjectionMatrix();

    resources.renderer.clear(true, true, true);
    resources.renderer.render(resources.scene, resources.camera);
    return encode ? resources.renderer.domElement.toDataURL('image/webp', 0.92) : '';
  }

  private observeHosts(): void {
    this.stopObserving();
    if (!this.root || typeof ResizeObserver === 'undefined') return;
    this.observer = new ResizeObserver(() => this.scheduleRefresh());
    for (const host of findPreviewHosts(this.root)) this.observer.observe(host);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.scheduleRefresh, { passive: true });
    }
  }

  private stopObserving(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.scheduleRefresh);
      if (this.resizeFrame !== 0) window.cancelAnimationFrame(this.resizeFrame);
      if (this.inspectionFrame !== 0) window.cancelAnimationFrame(this.inspectionFrame);
    }
    this.resizeFrame = 0;
    this.inspectionFrame = 0;
  }

  private readonly scheduleRefresh = (): void => {
    if (!this.visibleValue || this.disposed || typeof window === 'undefined') return;
    if (this.resizeFrame !== 0) return;
    this.resizeFrame = window.requestAnimationFrame(() => {
      this.resizeFrame = 0;
      void this.refresh();
    });
  };

  private applySelectionState(): void {
    const root = this.root;
    if (!root) return;
    for (const host of findPreviewHosts(root)) {
      const vehicleClass = resolveVehiclePreviewClass(host.dataset.vehicleId);
      if (vehicleClass === this.selected) {
        host.dataset.previewSelected = 'true';
      } else {
        delete host.dataset.previewSelected;
      }
    }
  }

  private releaseGpuResources(): void {
    const resources = this.resources;
    if (!resources) return;
    for (const outline of resources.outlines) outline.dispose();
    for (const pilot of resources.pilots.values()) pilot.dispose();
    for (const vehicle of resources.vehicles.values()) {
      vehicle.removeFromParent();
      vehicle.dispose();
    }
    resources.outlineMaterial.dispose();
    resources.scene.clear();
    resources.renderer.renderLists.dispose();
    resources.renderer.dispose();
    resources.renderer.forceContextLoss();
    resources.renderer.domElement.width = 1;
    resources.renderer.domElement.height = 1;
    this.resources = null;
  }
}

export { VehicleCardPreviewRenderer as VehicleCardPreview };
