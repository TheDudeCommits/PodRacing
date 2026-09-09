import { BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial } from 'three';
import type { PodraceCourse } from '../../game/race/course';
import { getLaunchBasinAnchor } from '../../game/race/CourseGulfField';
import { LAUNCH_LANDSCAPE_BOUNDS, launchRidgeSurface } from '../../game/race/LaunchBasinPlan';
import { sampleTerrainHeight } from '../terrain/terrainMath';

/** Bounds of the installed physical launch grid, not a second terrain bake. */
export interface InkstormTerrainShadowGrid {
  readonly minX: number;
  readonly minZ: number;
  readonly cellSize: number;
  readonly size: number;
}
export const INKSTORM_TERRAIN_SHADOW_STEP = 18;

/**
 * One revision-owned physical height mesh used only by the static sun atlas.
 * It is deliberately never attached to the beauty world. Bake clones borrow
 * its geometry/material; only rebuild/dispose below releases those resources.
 */
export class InkstormTerrainShadow {
  private source: Mesh<BufferGeometry, MeshBasicMaterial> | null = null;
  readonly receipt = { vertices: 0, triangles: 0, sampleMetres: INKSTORM_TERRAIN_SHADOW_STEP,
    physicalMinHeight: 0, physicalMaxHeight: 0, maxMeasuredOvershoot: 0, maxDownwardPad: 0, interiorProbeMetres: 6 };

  setCourse(course: PodraceCourse, heightAt: (x: number, z: number) => number, grid: InkstormTerrainShadowGrid | null): void {
    this.dispose();
    const anchor = getLaunchBasinAnchor(course);
    if (!anchor || !grid || grid.size < 2 || grid.cellSize <= 0) return;
    const step = INKSTORM_TERRAIN_SHADOW_STEP, bounds = LAUNCH_LANDSCAPE_BOUNDS;
    // Intersect the rotated authored footprint with the actual installed grid.
    // Its exterior is never sampled or allowed to enlarge the scene-wide atlas.
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const f of [bounds.minForward - step, bounds.maxForward + step]) {
      for (const r of [bounds.minRight - step, bounds.maxRight + step]) {
        const x = anchor.x + anchor.tangentX * f - anchor.rightX * r;
        const z = anchor.z + anchor.tangentZ * f - anchor.rightZ * r;
        minX = Math.min(minX, x); minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x); maxZ = Math.max(maxZ, z);
      }
    }
    const endX = grid.minX + (grid.size - 1) * grid.cellSize;
    const endZ = grid.minZ + (grid.size - 1) * grid.cellSize;
    minX = Math.max(grid.minX, grid.minX + Math.floor((minX - grid.minX) / step) * step);
    minZ = Math.max(grid.minZ, grid.minZ + Math.floor((minZ - grid.minZ) / step) * step);
    maxX = Math.min(endX, maxX); maxZ = Math.min(endZ, maxZ);
    if (maxX <= minX || maxZ <= minZ) return;
    const columns = Math.ceil((maxX - minX) / step), rows = Math.ceil((maxZ - minZ) / step);
    const stride = columns + 1, nodeCount = stride * (rows + 1);
    const mask = new Uint8Array(nodeCount), heights = new Float64Array(nodeCount);
    const vertexIds = new Int32Array(nodeCount).fill(-1);
    const xAt = (col: number) => Math.fround(Math.min(maxX, minX + col * step));
    const zAt = (row: number) => Math.fround(Math.min(maxZ, minZ + row * step));
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
      const dx = xAt(col) - anchor.x, dz = zAt(row) - anchor.z;
      const forward = dx * anchor.tangentX + dz * anchor.tangentZ;
      const right = -dx * anchor.rightX - dz * anchor.rightZ;
      if (launchRidgeSurface(forward, right).weight <= 0) continue;
      const x = xAt(col), z = zAt(row), y = heightAt(x, z), node = row * stride + col;
      if (!Number.isFinite(y)) throw new Error('Non-finite physical launch terrain shadow height');
      heights[node] = y;
      // Protected lanes and negative gulf floors cannot become coarse casters.
      mask[node] = y > sampleTerrainHeight(x, z) + .25 ? 1 : 0;
    }
    const vertices: number[] = [], indices: number[] = [], pads: number[] = [];
    let physicalMinHeight = Infinity, physicalMaxHeight = -Infinity, maxMeasuredOvershoot = 0;
    const vertex = (row: number, col: number): number => {
      const node = row * stride + col;
      if (vertexIds[node]! >= 0) return vertexIds[node]!;
      const x = xAt(col), z = zAt(row), y = heights[node]!;
      const id = vertices.length / 3;
      // Sampling after Float32 XZ conversion keeps the actual mesh vertices
      // aligned with the sampler at the coordinates the GPU receives.
      vertices.push(x, y, z); pads.push(.8); vertexIds[node] = id;
      physicalMinHeight = Math.min(physicalMinHeight, y); physicalMaxHeight = Math.max(physicalMaxHeight, y);
      return id;
    };
    const triangle = (a: number, b: number, c: number): void => {
      let overestimate = 0;
      // A 6m barycentric lattice probes the physical 6m field inside this
      // 18m triangle. This is a measured lower approximation, not proof of a
      // continuous bound between probes. Keep the error visible in telemetry.
      for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3 - i; j++) {
        if ((i === 0 && j === 0) || i === 3 || j === 3) continue;
        const u = i / 3, v = j / 3, w = 1 - u - v;
        const x = vertices[a * 3]! * w + vertices[b * 3]! * u + vertices[c * 3]! * v;
        const z = vertices[a * 3 + 2]! * w + vertices[b * 3 + 2]! * u + vertices[c * 3 + 2]! * v;
        const planeY = vertices[a * 3 + 1]! * w + vertices[b * 3 + 1]! * u + vertices[c * 3 + 1]! * v;
        const actualY = heightAt(x, z);
        if (!Number.isFinite(actualY)) throw new Error('Non-finite physical terrain shadow probe');
        overestimate = Math.max(overestimate, planeY - actualY);
      }
      maxMeasuredOvershoot = Math.max(maxMeasuredOvershoot, overestimate);
      const pad = overestimate + .8;
      pads[a] = Math.max(pads[a]!, pad); pads[b] = Math.max(pads[b]!, pad); pads[c] = Math.max(pads[c]!, pad);
      indices.push(a, b, c);
    };
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = row * stride + col, b = a + 1, c = a + stride, d = c + 1;
      // Restrict the mesh to positive mountain cells. Omitting partial cells
      // costs at most one 18m strip at the rim and avoids giant flat casters.
      if (mask[a] && mask[c] && mask[b]) triangle(vertex(row, col), vertex(row + 1, col), vertex(row, col + 1));
      if (mask[b] && mask[c] && mask[d]) triangle(vertex(row, col + 1), vertex(row + 1, col), vertex(row + 1, col + 1));
    }
    if (!indices.length) return;
    let maxDownwardPad = 0;
    for (let id = 0; id < pads.length; id++) {
      vertices[id * 3 + 1] = vertices[id * 3 + 1]! - pads[id]!;
      maxDownwardPad = Math.max(maxDownwardPad, pads[id]!);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    this.source = new Mesh(geometry, new MeshBasicMaterial());
    this.source.name = 'Inkstorm physical launch terrain — static shadow only';
    this.source.userData.inkstormTerrainShadow = true;
    Object.assign(this.receipt, { vertices: vertices.length / 3, triangles: indices.length / 3,
      physicalMinHeight, physicalMaxHeight, maxMeasuredOvershoot, maxDownwardPad });
  }

  /** Borrowed buffers live until the world changes course or is disposed. */
  createCaster(): Mesh<BufferGeometry, MeshBasicMaterial> | null {
    return this.source?.clone() ?? null;
  }

  dispose(): void {
    this.source?.geometry.dispose(); this.source?.material.dispose(); this.source = null;
    Object.assign(this.receipt, { vertices: 0, triangles: 0, physicalMinHeight: 0, physicalMaxHeight: 0, maxMeasuredOvershoot: 0, maxDownwardPad: 0 });
  }
}
