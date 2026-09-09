import { DataTexture, FloatType, NearestFilter, RedFormat, Vector4 } from 'three';
import type { CourseGulfField, CourseGulfGrid } from '../../game/race/CourseGulfField';
import { PIT_PAD_GLSL, type PitPadField } from '../../game/race/PitPadField';

export function createCourseGulfUniforms() {
  return {
    uCourseGulf0: { value: null as DataTexture | null },
    uCourseGulf1: { value: null as DataTexture | null },
    uCourseGulfBounds0: { value: new Vector4() },
    uCourseGulfBounds1: { value: new Vector4() },
    uPitPad: { value: null as DataTexture | null },
    uPitPadBounds: { value: new Vector4() },
  };
}
export type CourseGulfUniforms = ReturnType<typeof createCourseGulfUniforms>;

function textureFor(grid: CourseGulfGrid): DataTexture {
  const texture = new DataTexture(grid.values, grid.size, grid.size, RedFormat, FloatType);
  texture.name = `Inkstorm ${grid.name} physical terrain`;
  texture.internalFormat = 'R32F';
  // Explicit four-texel bilinear filtering works without OES_texture_float_linear.
  texture.minFilter = NearestFilter; texture.magFilter = NearestFilter;
  texture.generateMipmaps = false; texture.flipY = false; texture.needsUpdate = true;
  return texture;
}

/** Stable uniform objects remain shared across beauty, depth, normals and roads. */
export class CourseGulfTextures {
  readonly uniforms = createCourseGulfUniforms();
  private current: CourseGulfField | null = null;
  private currentPit: PitPadField | null = null;

  setField(field: CourseGulfField | null): void {
    if (this.current === field) return;
    this.clearGulfs();
    this.current = field;
    if (!field) return;
    const u = this.uniforms, [a, b] = field.grids;
    u.uCourseGulf0.value = textureFor(a); u.uCourseGulf1.value = textureFor(b);
    u.uCourseGulfBounds0.value.set(a.minX, a.minZ, a.cellSize, a.size);
    u.uCourseGulfBounds1.value.set(b.minX, b.minZ, b.cellSize, b.size);
  }

  setPitPadField(field: PitPadField | null): void {
    if (this.currentPit === field) return;
    const u = this.uniforms;
    u.uPitPad.value?.dispose();
    u.uPitPad.value = null;
    u.uPitPadBounds.value.set(0, 0, 0, 0);
    this.currentPit = field;
    const grid = field?.grid;
    if (!grid) return;
    const texture = new DataTexture(grid.values, grid.columns, grid.rows, RedFormat, FloatType);
    texture.name = 'Inkstorm physical workshop grading';
    texture.internalFormat = 'R32F';
    texture.minFilter = NearestFilter; texture.magFilter = NearestFilter;
    texture.generateMipmaps = false; texture.flipY = false; texture.needsUpdate = true;
    u.uPitPad.value = texture;
    u.uPitPadBounds.value.set(grid.minX, grid.minZ, grid.columns, grid.rows);
  }

  private clearGulfs(): void {
    this.uniforms.uCourseGulf0.value?.dispose(); this.uniforms.uCourseGulf1.value?.dispose();
    this.uniforms.uCourseGulf0.value = null; this.uniforms.uCourseGulf1.value = null;
    this.uniforms.uCourseGulfBounds0.value.set(0, 0, 0, 0);
    this.uniforms.uCourseGulfBounds1.value.set(0, 0, 0, 0);
    this.current = null;
  }

  dispose(): void {
    this.clearGulfs();
    this.setPitPadField(null);
  }
}

export const COURSE_GULF_GLSL = /* glsl */ `
${PIT_PAD_GLSL}
uniform sampler2D uCourseGulf0;
uniform sampler2D uCourseGulf1;
uniform vec4 uCourseGulfBounds0;
uniform vec4 uCourseGulfBounds1;
float sampleCourseGulf(sampler2D field, vec4 bounds, vec2 worldXZ) {
  if (bounds.w < 2.0) return 0.0;
  vec2 grid = (worldXZ - bounds.xy) / bounds.z;
  if (any(lessThan(grid, vec2(0.0))) || any(greaterThanEqual(grid, vec2(bounds.w - 1.0)))) return 0.0;
  ivec2 cell = ivec2(floor(grid)); vec2 f = fract(grid);
  float a = texelFetch(field, cell, 0).r;
  float b = texelFetch(field, cell + ivec2(1, 0), 0).r;
  float c = texelFetch(field, cell + ivec2(0, 1), 0).r;
  float d = texelFetch(field, cell + ivec2(1, 1), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// Identical signed composition to CourseGulfField's CPU sampler.
float combineCourseGulfOffsets(float a, float b) {
  return min(min(a,b),0.0) + max(max(a,b),0.0);
}
float courseGulfOffset(vec2 worldXZ) {
  return combineCourseGulfOffsets(sampleCourseGulf(uCourseGulf0, uCourseGulfBounds0, worldXZ),
    sampleCourseGulf(uCourseGulf1, uCourseGulfBounds1, worldXZ)) + pitPadOffset(worldXZ);
}
`;
