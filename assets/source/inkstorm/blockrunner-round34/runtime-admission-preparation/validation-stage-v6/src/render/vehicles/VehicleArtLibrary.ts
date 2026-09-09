import {
  Mesh,
  Texture,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Art identity is independent of vehicle physics class. No catalogue entry loads itself. */
export interface VehicleArtSource {
  readonly id: string;
  readonly revision: string;
  readonly url: string;
}

export interface VehicleArtLease {
  readonly source: VehicleArtSource;
  /** Unique node hierarchy; geometry, original materials and textures are borrowed immutable data. */
  readonly root: Object3D;
  readonly released: boolean;
  release(): void;
}

export interface VehicleArtLibraryOptions {
  /** Transfers ownership of a distinct template and its resources to this library. */
  readonly load?: (url: string) => Promise<Object3D>;
  /** Active leases are pinned. Only this many unleased templates remain cached. Default: 2. */
  readonly maxIdleEntries?: number;
}

interface Entry {
  readonly source: VehicleArtSource;
  readonly key: string;
  promise: Promise<Object3D>;
  root: Object3D | null;
  pending: number;
  leases: number;
  touched: number;
}

function abortError(): Error {
  const error = new Error('Vehicle art request was cancelled.');
  error.name = 'AbortError';
  return error;
}

function sourceKey(source: VehicleArtSource): string {
  if (!source.id.trim() || !source.revision.trim() || !source.url.trim()) {
    throw new Error('Vehicle art requires an id, revision and explicit URL.');
  }
  return JSON.stringify([source.id, source.revision, source.url]);
}

/** A template is owned once even when several primitives share its resources. */
function disposeTemplate(root: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
    }
  });
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof Texture) textures.add(value);
    }
    // Also handles explicitly injected shader templates without recursing into scene graphs.
    const uniforms = (material as Material & { uniforms?: Record<string, { value: unknown }> }).uniforms;
    if (uniforms) for (const { value } of Object.values(uniforms)) {
      if (value instanceof Texture) textures.add(value);
      if (Array.isArray(value)) for (const item of value) if (item instanceof Texture) textures.add(item);
    }
  }
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  const closedImages = new Set<object>();
  for (const texture of textures) {
    texture.dispose();
    const images: unknown[] = Array.isArray(texture.image) ? texture.image : [texture.image];
    for (const image of images) {
      // GLTFLoader can own ImageBitmaps. Closing is safe only after all leases drain.
      if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap && !closedImages.has(image)) {
        closedImages.add(image);
        image.close();
      }
    }
  }
  root.removeFromParent();
  root.clear();
}

function validateRigidTemplate(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const mesh = object as Mesh & { isSkinnedMesh?: boolean; isInstancedMesh?: boolean };
    if (mesh.isSkinnedMesh || mesh.isInstancedMesh || Object.values(mesh.geometry.morphAttributes).some((v) => v.length)) {
      throw new Error('Imported vehicle art must contain baked rigid meshes; skinning, instancing and morphs are unsupported.');
    }
  });
}

/** Lazy, deduplicated CPU/GPU resource ownership; never fetches until acquire is called. */
export class VehicleArtLibrary {
  private readonly entries = new Map<string, Entry>();
  private readonly load: (url: string) => Promise<Object3D>;
  private readonly maxIdleEntries: number;
  private readonly lifetime = new AbortController();
  private disposed = false;
  private tick = 0;

  constructor(options: VehicleArtLibraryOptions = {}) {
    this.maxIdleEntries = options.maxIdleEntries ?? 2;
    if (!Number.isInteger(this.maxIdleEntries) || this.maxIdleEntries < 0) {
      throw new RangeError('Vehicle art maxIdleEntries must be a non-negative integer.');
    }
    let loader: GLTFLoader | undefined;
    this.load = options.load ?? (async (url) => {
      loader ??= new GLTFLoader();
      return (await loader.loadAsync(url)).scene;
    });
  }

  acquire(source: VehicleArtSource, options: { readonly signal?: AbortSignal } = {}): Promise<VehicleArtLease> {
    if (this.disposed || options.signal?.aborted) return Promise.reject(abortError());
    let key: string;
    try { key = sourceKey(source); } catch (error) { return Promise.reject(error); }
    let entry = this.entries.get(key);
    if (!entry) {
      entry = {
        key, source: Object.freeze({ ...source }), root: null,
        pending: 0, leases: 0, touched: ++this.tick,
        promise: Promise.resolve(null as unknown as Object3D),
      };
      this.entries.set(key, entry);
      const created = entry;
      created.promise = Promise.resolve().then(() => this.load(created.source.url)).then((root) => {
        try { validateRigidTemplate(root); } catch (error) { disposeTemplate(root); throw error; }
        created.root = root;
        if (this.disposed) this.disposeEntry(created);
        else this.trimIdle();
        return root;
      }).catch((error: unknown) => {
        if (this.entries.get(key) === created) this.entries.delete(key);
        throw error;
      });
    }
    const requested = entry;
    requested.pending += 1;
    requested.touched = ++this.tick;
    return new Promise<VehicleArtLease>((resolve, reject) => {
      let settled = false;
      const finish = (): boolean => {
        if (settled) return false;
        settled = true;
        options.signal?.removeEventListener('abort', cancel);
        this.lifetime.signal.removeEventListener('abort', cancel);
        requested.pending -= 1;
        return true;
      };
      const cancel = (): void => {
        if (!finish()) return;
        this.trimIdle();
        reject(abortError());
      };
      options.signal?.addEventListener('abort', cancel, { once: true });
      this.lifetime.signal.addEventListener('abort', cancel, { once: true });
      requested.promise.then((template) => {
        if (settled) return;
        let instance: Object3D;
        try { instance = template.clone(true); } catch (error) {
          finish();
          this.trimIdle();
          reject(error);
          return;
        }
        finish();
        requested.leases += 1;
        let released = false;
        resolve({
          source: requested.source,
          root: instance,
          get released() { return released; },
          release: () => {
            if (released) return;
            released = true;
            instance.removeFromParent();
            instance.clear();
            requested.leases -= 1;
            requested.touched = ++this.tick;
            if (this.disposed) this.disposeEntry(requested);
            else this.trimIdle();
          },
        });
      }, (error: unknown) => {
        if (!finish()) return;
        reject(error);
      });
    });
  }

  get diagnostics(): { readonly entries: number; readonly pending: number; readonly leases: number; readonly idle: number; readonly disposed: boolean } {
    let pending = 0, leases = 0, idle = 0;
    for (const entry of this.entries.values()) {
      pending += entry.pending;
      leases += entry.leases;
      if (entry.root && entry.pending === 0 && entry.leases === 0) idle += 1;
    }
    return { entries: this.entries.size, pending, leases, idle, disposed: this.disposed };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.lifetime.abort();
    for (const entry of this.entries.values()) this.disposeEntry(entry);
  }

  private trimIdle(): void {
    const idle = Array.from(this.entries.values()).filter((entry) => entry.root && !entry.pending && !entry.leases);
    idle.sort((a, b) => a.touched - b.touched);
    for (let index = 0; index < idle.length - (this.disposed ? 0 : this.maxIdleEntries); index += 1) {
      const entry = idle[index];
      if (!entry) continue;
      this.entries.delete(entry.key);
      this.disposeEntry(entry);
    }
  }

  private disposeEntry(entry: Entry): void {
    if (!entry.root || entry.leases || entry.pending) return;
    const root = entry.root;
    entry.root = null;
    if (this.disposed && this.entries.get(entry.key) === entry) this.entries.delete(entry.key);
    disposeTemplate(root);
  }
}
