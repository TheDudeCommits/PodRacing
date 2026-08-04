import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Sphere,
  StaticDrawUsage,
  Vector3,
} from 'three';

export interface TerrainRingGeometryOptions {
  /** Half-width in metres. Must be an integer multiple of cellSize. */
  outerHalfExtent: number;
  /** Zero creates the solid centre patch. */
  innerHalfExtent: number;
  cellSize: number;
  /** Downward overlap that hides T-junction cracks between LODs. */
  skirtDepth?: number;
  /** Only the final far ring needs a horizon skirt. Defaults to false. */
  outerSkirt?: boolean;
  /** Vertex spacing on the previous, finer ring's shared boundary. */
  innerBoundaryStep?: number;
}

export interface TerrainRingMetadata {
  outerHalfExtent: number;
  innerHalfExtent: number;
  cellSize: number;
  gridSegments: number;
  surfaceTriangleCount: number;
  skirtTriangleCount: number;
}

function isNearlyInteger(value: number): boolean {
  return Math.abs(value - Math.round(value)) < 1e-6;
}

/**
 * Creates one square clipmap ring. Surface vertices are shared; only transition
 * skirts duplicate vertices. Rings therefore stay cheap enough to render all
 * six levels while their procedural world coordinates change under the camera.
 */
export function createTerrainRingGeometry(
  options: TerrainRingGeometryOptions,
): BufferGeometry {
  const outer = options.outerHalfExtent;
  const inner = options.innerHalfExtent;
  const cell = options.cellSize;
  const skirtDepth = options.skirtDepth ?? Math.max(5, cell * 0.72);

  if (!(outer > 0) || !(cell > 0) || inner < 0 || inner >= outer) {
    throw new RangeError('Terrain ring extents and cell size are invalid');
  }
  if (!isNearlyInteger((outer * 2) / cell) || !isNearlyInteger(inner / cell)) {
    throw new RangeError('Terrain ring extents must align to the cell size');
  }
  const innerBoundaryStep = options.innerBoundaryStep ?? cell * 0.5;
  if (
    inner > 0
    && (!(innerBoundaryStep > 0)
      || !isNearlyInteger(cell / innerBoundaryStep)
      || !isNearlyInteger((inner * 2) / innerBoundaryStep))
  ) {
    throw new RangeError('innerBoundaryStep must evenly subdivide the coarse cell');
  }

  const segments = Math.round((outer * 2) / cell);
  const row = segments + 1;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let zIndex = 0; zIndex <= segments; zIndex += 1) {
    const z = -outer + zIndex * cell;
    for (let xIndex = 0; xIndex <= segments; xIndex += 1) {
      positions.push(-outer + xIndex * cell, 0, z);
    }
  }

  let surfaceTriangleCount = 0;
  for (let zIndex = 0; zIndex < segments; zIndex += 1) {
    const zCenter = -outer + (zIndex + 0.5) * cell;
    for (let xIndex = 0; xIndex < segments; xIndex += 1) {
      const xCenter = -outer + (xIndex + 0.5) * cell;
      if (inner > 0) {
        const absX = Math.abs(xCenter);
        const absZ = Math.abs(zCenter);
        const insideHole = absX < inner && absZ < inner;
        const horizontalTransition = absX < inner
          && absZ > inner
          && absZ < inner + cell;
        const verticalTransition = absZ < inner
          && absX > inner
          && absX < inner + cell;
        if (insideHole || horizontalTransition || verticalTransition) continue;
      }

      const a = zIndex * row + xIndex;
      const b = a + 1;
      const d = a + row;
      const c = d + 1;
      // Counter-clockwise when viewed from +Y.
      indices.push(a, c, b, a, d, c);
      surfaceTriangleCount += 2;
    }
  }

  let skirtTriangleCount = 0;
  const appendSkirtSegment = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
  ): void => {
    const base = positions.length / 3;
    positions.push(
      x0, 0, z0,
      x1, 0, z1,
      x0, -skirtDepth, z0,
      x1, -skirtDepth, z1,
    );
    indices.push(base, base + 1, base + 3, base, base + 3, base + 2);
    skirtTriangleCount += 2;
  };

  const appendSquareSkirt = (extent: number): void => {
    const edgeSegments = Math.round((extent * 2) / cell);
    for (let index = 0; index < edgeSegments; index += 1) {
      const a = -extent + index * cell;
      const b = a + cell;
      appendSkirtSegment(a, -extent, b, -extent);
      appendSkirtSegment(b, extent, a, extent);
      appendSkirtSegment(-extent, b, -extent, a);
      appendSkirtSegment(extent, a, extent, b);
    }
  };

  // Stitch a coarse edge to the two-times-finer previous level with three
  // triangles per coarse span. Unlike a vertical inner skirt, these transition
  // fans are coplanar with the desert and cannot appear as black horizon lines.
  if (inner > 0) {
    const appendTransitionFan = (
      innerX0: number,
      innerZ0: number,
      innerX1: number,
      innerZ1: number,
      outerX0: number,
      outerZ0: number,
      outerX1: number,
      outerZ1: number,
    ): void => {
      const base = positions.length / 3;
      const subdivisions = Math.round(cell / innerBoundaryStep);
      for (let subdivision = 0; subdivision <= subdivisions; subdivision += 1) {
        const blend = subdivision / subdivisions;
        positions.push(
          innerX0 + (innerX1 - innerX0) * blend,
          0,
          innerZ0 + (innerZ1 - innerZ0) * blend,
        );
      }
      const outer0 = base + subdivisions + 1;
      const outer1 = outer0 + 1;
      positions.push(outerX0, 0, outerZ0, outerX1, 0, outerZ1);
      // DoubleSide rendering makes winding irrelevant, but a consistent fan
      // still keeps tooling and future one-sided prepasses predictable.
      for (let subdivision = 0; subdivision < subdivisions; subdivision += 1) {
        indices.push(outer0, base + subdivision, base + subdivision + 1);
        surfaceTriangleCount += 1;
      }
      indices.push(outer0, base + subdivisions, outer1);
      surfaceTriangleCount += 1;
    };

    const transitionSegments = Math.round((inner * 2) / cell);
    for (let segment = 0; segment < transitionSegments; segment += 1) {
      const a = -inner + segment * cell;
      const b = a + cell;
      appendTransitionFan(a, inner, b, inner, a, inner + cell, b, inner + cell);
      appendTransitionFan(b, -inner, a, -inner, b, -inner - cell, a, -inner - cell);
      appendTransitionFan(-inner, a, -inner, b, -inner - cell, a, -inner - cell, b);
      appendTransitionFan(inner, b, inner, a, inner + cell, b, inner + cell, a);
    }
  }

  // Only the final horizon edge is skirted. Internal skirts showed up as dark
  // horizontal lines in the normal/edge pass even when their cracks were hidden.
  if (options.outerSkirt) appendSquareSkirt(outer);

  const geometry = new BufferGeometry();
  const positionAttribute = new BufferAttribute(new Float32Array(positions), 3);
  positionAttribute.setUsage(StaticDrawUsage);
  geometry.setAttribute('position', positionAttribute);
  const IndexArray = positions.length / 3 > 65_535 ? Uint32Array : Uint16Array;
  geometry.setIndex(new BufferAttribute(new IndexArray(indices), 1));

  // Vertex displacement peaks are comfortably inside this conservative bound.
  const radius = Math.hypot(outer, outer, 72);
  geometry.boundingSphere = new Sphere(new Vector3(0, 5, 0), radius);
  geometry.boundingBox = new Box3(
    new Vector3(-outer, -72, -outer),
    new Vector3(outer, 72, outer),
  );
  const metadata: TerrainRingMetadata = {
    outerHalfExtent: outer,
    innerHalfExtent: inner,
    cellSize: cell,
    gridSegments: segments,
    surfaceTriangleCount,
    skirtTriangleCount,
  };
  geometry.userData.terrainRing = metadata;
  return geometry;
}

export function getTerrainRingMetadata(geometry: BufferGeometry): TerrainRingMetadata {
  const metadata = geometry.userData.terrainRing as TerrainRingMetadata | undefined;
  if (!metadata) throw new TypeError('Geometry was not created as a terrain ring');
  return metadata;
}
