import { DataTexture, LinearFilter, RedFormat, UnsignedByteType, Vector3, Vector4 } from 'three';

import type { CourseRenderPoint } from '../../game/race/types';

/** Metres represented by one byte step; 255 steps cover 510 m from the line. */
export const COURSE_DISTANCE_STEP = 2;
const MAX_DISTANCE = 255 * COURSE_DISTANCE_STEP;
const RESOLUTION = 512;

export function createCourseDistanceUniforms() {
  return {
    uCourseDistance: { value: null as DataTexture | null },
    /** minX, minZ, world size, ready flag */
    uCourseDistanceBounds: { value: new Vector4(0, 0, 1, 0) },
    /** Start line x, z and a ready flag: the grid stays clear of hazards' art. */
    uCourseStart: { value: new Vector3(0, 0, 0) },
  };
}
export type CourseDistanceUniforms = ReturnType<typeof createCourseDistanceUniforms>;

/** GLSL3 helper: distance in metres from the racing line's centre, 510 when unknown. */
export const COURSE_DISTANCE_GLSL = /* glsl */ `
uniform sampler2D uCourseDistance;
uniform vec4 uCourseDistanceBounds;
uniform vec3 uCourseStart;
float courseStartDistance(vec2 xz) { return uCourseStart.z < .5 ? 1e5 : length(xz - uCourseStart.xy); }
float courseDistance(vec2 xz) {
  if (uCourseDistanceBounds.w < .5) return ${MAX_DISTANCE.toFixed(1)};
  vec2 uv = (xz - uCourseDistanceBounds.xy) / uCourseDistanceBounds.z;
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return ${MAX_DISTANCE.toFixed(1)};
  return texture(uCourseDistance, uv).r * ${MAX_DISTANCE.toFixed(1)};
}`;

/**
 * A coarse distance-to-centreline field for art direction only: lava, ice and
 * wet ground stay a safe distance from the racing surface. Built once per
 * course by stamping each render sample into nearby texels.
 */
export class CourseDistanceField {
  readonly uniforms = createCourseDistanceUniforms();

  setCourse(points: readonly Pick<CourseRenderPoint, 'x' | 'z'>[]): void {
    this.uniforms.uCourseDistance.value?.dispose();
    this.uniforms.uCourseDistance.value = null;
    this.uniforms.uCourseDistanceBounds.value.set(0, 0, 1, 0);
    this.uniforms.uCourseStart.value.set(0, 0, 0);
    if (points.length < 2) return;
    this.uniforms.uCourseStart.value.set(points[0]!.x, points[0]!.z, 1);
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    const margin = MAX_DISTANCE + 20;
    minX -= margin; minZ -= margin; maxX += margin; maxZ += margin;
    const size = Math.max(maxX - minX, maxZ - minZ);
    const texel = size / RESOLUTION;
    const distance = new Float32Array(RESOLUTION * RESOLUTION).fill(MAX_DISTANCE);
    const radius = Math.ceil(MAX_DISTANCE / texel);
    // Densify so consecutive samples are closer than one texel.
    const samples: { x: number; z: number }[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!, b = points[(i + 1) % points.length]!;
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (texel * 0.75)));
      for (let k = 0; k < steps; k++) samples.push({ x: a.x + (b.x - a.x) * k / steps, z: a.z + (b.z - a.z) * k / steps });
    }
    const stride = Math.max(1, Math.floor(samples.length / 6000));
    for (let s = 0; s < samples.length; s += stride) {
      const p = samples[s]!;
      const cx = Math.floor((p.x - minX) / texel), cz = Math.floor((p.z - minZ) / texel);
      for (let dz = -radius; dz <= radius; dz++) {
        const z = cz + dz; if (z < 0 || z >= RESOLUTION) continue;
        const wz = minZ + (z + .5) * texel - p.z;
        for (let dx = -radius; dx <= radius; dx++) {
          const x = cx + dx; if (x < 0 || x >= RESOLUTION) continue;
          const wx = minX + (x + .5) * texel - p.x;
          const d = Math.sqrt(wx * wx + wz * wz);
          const index = z * RESOLUTION + x;
          if (d < distance[index]!) distance[index] = d;
        }
      }
    }
    const bytes = new Uint8Array(RESOLUTION * RESOLUTION);
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.min(255, Math.round(distance[i]! / COURSE_DISTANCE_STEP));
    const texture = new DataTexture(bytes, RESOLUTION, RESOLUTION, RedFormat, UnsignedByteType);
    texture.name = 'Course distance field';
    texture.minFilter = LinearFilter; texture.magFilter = LinearFilter;
    texture.generateMipmaps = false; texture.flipY = false; texture.needsUpdate = true;
    this.uniforms.uCourseDistance.value = texture;
    this.uniforms.uCourseDistanceBounds.value.set(minX, minZ, size, 1);
  }

  dispose(): void {
    this.uniforms.uCourseDistance.value?.dispose();
    this.uniforms.uCourseDistance.value = null;
  }
}
