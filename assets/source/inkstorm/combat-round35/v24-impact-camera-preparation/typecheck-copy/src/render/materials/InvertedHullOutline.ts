import {
  BackSide,
  Float32BufferAttribute,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  ShaderMaterial,
  SkinnedMesh,
  Vector2,
  type ColorRepresentation,
} from 'three';

import { OUTLINE_FRAGMENT_SHADER, OUTLINE_VERTEX_SHADER } from './outlineShaders';

export const CEL_HULL_OUTLINE_USER_DATA_KEY = 'celHullOutlined';
export const CEL_POST_EXCLUDE_USER_DATA_KEY = 'celPostExclude';
export const CEL_OUTLINE_NORMAL_ATTRIBUTE = 'celOutlineNormal';

// Never uploaded. Retired hulls use this instead of disposing the live source's
// borrowed instance buffer when Three releases their object-specific GPU state.
const retiredInstanceMatrix = new InstancedBufferAttribute(new Float32Array(0), 16);

interface ValueUniform<T> {
  value: T;
}

interface OutlineUniforms {
  [uniform: string]: ValueUniform<unknown>;
  uViewport: ValueUniform<Vector2>;
  uLineWidth: ValueUniform<number>;
  uInkColor: ValueUniform<Color>;
  uOpacity: ValueUniform<number>;
}

export interface OutlineMaterialOptions {
  readonly ink?: ColorRepresentation;
  /** Width in CSS pixels; it is multiplied by the current render DPR. */
  readonly widthPx?: number;
  readonly opacity?: number;
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly pixelRatio?: number;
}

export class InvertedHullMaterial extends ShaderMaterial {
  private readonly outlineUniforms: OutlineUniforms;
  private cssLineWidth: number;
  private devicePixelRatioValue: number;

  constructor(options: OutlineMaterialOptions = {}) {
    const cssLineWidth = Math.max(0.25, options.widthPx ?? 1.65);
    const pixelRatio = Math.max(0.25, options.pixelRatio ?? 1);
    const opacity = Math.min(1, Math.max(0, options.opacity ?? 1));
    const uniforms: OutlineUniforms = {
      uViewport: {
        value: new Vector2(
          Math.max(1, options.viewportWidth ?? 1) * pixelRatio,
          Math.max(1, options.viewportHeight ?? 1) * pixelRatio,
        ),
      },
      uLineWidth: { value: cssLineWidth * pixelRatio },
      uInkColor: { value: new Color(options.ink ?? '#0a0912') },
      uOpacity: { value: opacity },
    };

    super({
      name: 'InvertedHullMaterial',
      uniforms,
      vertexShader: OUTLINE_VERTEX_SHADER,
      fragmentShader: OUTLINE_FRAGMENT_SHADER,
      side: BackSide,
      depthTest: true,
      depthWrite: false,
      transparent: opacity < 1,
      toneMapped: false,
      fog: false,
      lights: false,
    });

    this.outlineUniforms = uniforms;
    this.cssLineWidth = cssLineWidth;
    this.devicePixelRatioValue = pixelRatio;
  }

  setViewport(width: number, height: number, pixelRatio = 1): void {
    this.devicePixelRatioValue = Math.max(0.25, pixelRatio);
    this.outlineUniforms.uViewport.value.set(
      Math.max(1, width) * this.devicePixelRatioValue,
      Math.max(1, height) * this.devicePixelRatioValue,
    );
    this.outlineUniforms.uLineWidth.value = this.cssLineWidth * this.devicePixelRatioValue;
  }

  setLineWidth(widthPx: number): void {
    this.cssLineWidth = Math.max(0.25, widthPx);
    this.outlineUniforms.uLineWidth.value = this.cssLineWidth * this.devicePixelRatioValue;
  }

  setInk(ink: ColorRepresentation): void {
    this.outlineUniforms.uInkColor.value.set(ink);
  }
}

export interface InvertedHullOptions extends OutlineMaterialOptions {
  /** Reuse one material across many hulls to minimize shader/material state churn. */
  readonly material?: InvertedHullMaterial;
  /** Generate smooth normals for procedural geometry that does not provide them. */
  readonly generateMissingNormals?: boolean;
  /** Attach the hull below the source so all object transforms remain shared. */
  readonly attach?: boolean;
}

export interface InvertedHullHandle {
  readonly source: Mesh;
  readonly mesh: Mesh;
  readonly material: InvertedHullMaterial;
  /** Synchronizes mutable instancing, morph and layer state without allocations. */
  sync(): void;
  setViewport(width: number, height: number, pixelRatio?: number): void;
  dispose(): void;
}

function isSkinnedMesh(mesh: Mesh): mesh is SkinnedMesh {
  return (mesh as SkinnedMesh).isSkinnedMesh === true;
}

function isInstancedMesh(mesh: Mesh): mesh is InstancedMesh {
  return (mesh as InstancedMesh).isInstancedMesh === true;
}

function makeHullMesh(source: Mesh, material: InvertedHullMaterial): Mesh {
  if (isInstancedMesh(source)) {
    const hull = new InstancedMesh(source.geometry, material, source.count);
    hull.instanceMatrix = source.instanceMatrix;
    hull.morphTexture = source.morphTexture;
    return hull;
  }

  if (isSkinnedMesh(source)) {
    const hull = new SkinnedMesh(source.geometry, material);
    hull.bindMode = source.bindMode;
    hull.bind(source.skeleton, source.bindMatrix);
    hull.bindMatrixInverse.copy(source.bindMatrixInverse);
    return hull;
  }

  return new Mesh(source.geometry, material);
}

interface NormalAccumulator {
  x: number;
  y: number;
  z: number;
  readonly indices: number[];
}

function positionKey(x: number, y: number, z: number): string {
  // Five decimals welds code-generated UV/hard-edge duplicates without merging
  // genuinely separate nearby mechanical parts.
  return `${Math.round(x * 100_000)},${Math.round(y * 100_000)},${Math.round(z * 100_000)}`;
}

function ensureSmoothedOutlineNormals(source: Mesh): void {
  const geometry = source.geometry;
  if (geometry.getAttribute(CEL_OUTLINE_NORMAL_ATTRIBUTE)) return;
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  if (!position || !normal || position.count !== normal.count) {
    throw new Error(`Outline source "${source.name || source.uuid}" has invalid position/normal data.`);
  }

  const accumulators = new Map<string, NormalAccumulator>();
  for (let index = 0; index < position.count; index += 1) {
    const key = positionKey(position.getX(index), position.getY(index), position.getZ(index));
    let accumulator = accumulators.get(key);
    if (!accumulator) {
      accumulator = { x: 0, y: 0, z: 0, indices: [] };
      accumulators.set(key, accumulator);
    }
    accumulator.x += normal.getX(index);
    accumulator.y += normal.getY(index);
    accumulator.z += normal.getZ(index);
    accumulator.indices.push(index);
  }

  const smoothed = new Float32Array(position.count * 3);
  for (const accumulator of accumulators.values()) {
    const inverseLength = 1 / Math.max(
      0.000001,
      Math.hypot(accumulator.x, accumulator.y, accumulator.z),
    );
    const x = accumulator.x * inverseLength;
    const y = accumulator.y * inverseLength;
    const z = accumulator.z * inverseLength;
    for (const index of accumulator.indices) {
      const offset = index * 3;
      smoothed[offset] = x;
      smoothed[offset + 1] = y;
      smoothed[offset + 2] = z;
    }
  }
  geometry.setAttribute(CEL_OUTLINE_NORMAL_ATTRIBUTE, new Float32BufferAttribute(smoothed, 3));
}

export function createInvertedHullOutline(
  source: Mesh,
  options: InvertedHullOptions = {},
): InvertedHullHandle {
  if (!source.geometry.getAttribute('normal')) {
    if (options.generateMissingNormals === false) {
      throw new Error(`Outline source "${source.name || source.uuid}" has no normal attribute.`);
    }
    source.geometry.computeVertexNormals();
  }
  ensureSmoothedOutlineNormals(source);

  const ownsMaterial = options.material === undefined;
  const material = options.material ?? new InvertedHullMaterial(options);
  const hull = makeHullMesh(source, material);
  hull.name = `${source.name || 'mesh'}:ink-hull`;
  hull.matrixAutoUpdate = false;
  hull.matrix.identity();
  hull.renderOrder = source.renderOrder - 0.01;
  hull.frustumCulled = source.frustumCulled;
  hull.layers.mask = source.layers.mask;
  hull.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;

  const previousHullMarker = source.userData[CEL_HULL_OUTLINE_USER_DATA_KEY];
  source.userData[CEL_HULL_OUTLINE_USER_DATA_KEY] = true;
  if (options.attach !== false) source.add(hull);

  let disposed = false;
  const sync = (): void => {
    if (disposed) return;
    hull.layers.mask = source.layers.mask;
    hull.renderOrder = source.renderOrder - 0.01;
    hull.frustumCulled = source.frustumCulled;
    hull.morphTargetInfluences = source.morphTargetInfluences;
    hull.morphTargetDictionary = source.morphTargetDictionary;
    if (isInstancedMesh(source) && isInstancedMesh(hull)) {
      hull.count = source.count;
      hull.instanceMatrix = source.instanceMatrix;
      hull.morphTexture = source.morphTexture;
    }
  };
  sync();

  return {
    source,
    mesh: hull,
    material,
    sync,
    setViewport(width, height, pixelRatio = 1) {
      material.setViewport(width, height, pixelRatio);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (hull.parent) hull.removeFromParent();
      if (isInstancedMesh(hull)) {
        hull.instanceMatrix = retiredInstanceMatrix;
        hull.instanceColor = null;
        hull.morphTexture = null;
        hull.dispose();
      }
      if (ownsMaterial) material.dispose();
      if (source.userData[CEL_HULL_OUTLINE_USER_DATA_KEY] === true) {
        if (previousHullMarker === undefined) {
          delete source.userData[CEL_HULL_OUTLINE_USER_DATA_KEY];
        } else {
          source.userData[CEL_HULL_OUTLINE_USER_DATA_KEY] = previousHullMarker;
        }
      }
    },
  };
}
