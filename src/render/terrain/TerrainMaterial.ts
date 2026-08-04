import {
  Color,
  DoubleSide,
  GLSL3,
  NoBlending,
  ShaderMaterial,
  Vector2,
  Vector3,
  type ColorRepresentation,
} from 'three';
import { TERRAIN_VERTEX_GLSL } from './terrainShaderChunks';

export interface TerrainPalette {
  shadow: ColorRepresentation;
  darkSand: ColorRepresentation;
  midSand: ColorRepresentation;
  sunSand: ColorRepresentation;
  crest: ColorRepresentation;
  mineral: ColorRepresentation;
  sparkle: ColorRepresentation;
  haze: ColorRepresentation;
}

export const DEFAULT_TERRAIN_PALETTE: Readonly<TerrainPalette> = Object.freeze({
  shadow: '#672b35',
  darkSand: '#bd5839',
  midSand: '#e37b42',
  sunSand: '#ffb55f',
  crest: '#ffd786',
  mineral: '#b94338',
  sparkle: '#fff1ae',
  haze: '#e58159',
});

export interface TerrainMaterialOptions {
  palette?: Partial<TerrainPalette>;
  sunDirection?: { x: number; y: number; z: number };
  hazeNear?: number;
  hazeFar?: number;
}

export interface TerrainUniformSet {
  time: { value: number };
  renderOrigin: { value: Vector2 };
  sunDirection: { value: Vector3 };
  shadow: { value: Color };
  darkSand: { value: Color };
  midSand: { value: Color };
  sunSand: { value: Color };
  crest: { value: Color };
  mineral: { value: Color };
  sparkle: { value: Color };
  haze: { value: Color };
  hazeNear: { value: number };
  hazeFar: { value: number };
}

export interface TerrainMaterialBundle {
  material: ShaderMaterial;
  depthMaterial: ShaderMaterial;
  normalMaterial: ShaderMaterial;
  uniforms: TerrainUniformSet;
  dispose(): void;
}

const TERRAIN_FRAGMENT_GLSL = /* glsl */ `
precision highp float;
precision highp int;

uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uShadowColor;
uniform vec3 uDarkSandColor;
uniform vec3 uMidSandColor;
uniform vec3 uSunSandColor;
uniform vec3 uCrestColor;
uniform vec3 uMineralColor;
uniform vec3 uSparkleColor;
uniform vec3 uHazeColor;
uniform float uHazeNear;
uniform float uHazeFar;

in vec3 vTerrainWorldPosition;
in vec3 vTerrainRenderPosition;
in vec3 vTerrainFields;
in vec3 vTerrainRegion;
in float vTerrainHeight;
in vec3 vTerrainNormal;
out vec4 fragColor;

struct TerrainRegionPalette {
  vec3 shadow;
  vec3 darkSand;
  vec3 midSand;
  vec3 sunSand;
  vec3 crest;
  vec3 mineral;
  vec3 sparkle;
  vec3 haze;
};

TerrainRegionPalette terrainRegionPalette(float index) {
  TerrainRegionPalette palette;
  if (index < 0.5) {
    palette.shadow = uShadowColor;
    palette.darkSand = uDarkSandColor;
    palette.midSand = uMidSandColor;
    palette.sunSand = uSunSandColor;
    palette.crest = uCrestColor;
    palette.mineral = uMineralColor;
    palette.sparkle = uSparkleColor;
    palette.haze = uHazeColor;
  } else if (index < 1.5) {
    palette.shadow = vec3(40.0, 49.0, 73.0) / 255.0;
    palette.darkSand = vec3(89.0, 106.0, 120.0) / 255.0;
    palette.midSand = vec3(143.0, 163.0, 168.0) / 255.0;
    palette.sunSand = vec3(197.0, 217.0, 204.0) / 255.0;
    palette.crest = vec3(234.0, 255.0, 220.0) / 255.0;
    palette.mineral = vec3(78.0, 193.0, 174.0) / 255.0;
    palette.sparkle = vec3(1.0);
    palette.haze = vec3(156.0, 200.0, 189.0) / 255.0;
  } else if (index < 2.5) {
    palette.shadow = vec3(57.0, 23.0, 36.0) / 255.0;
    palette.darkSand = vec3(115.0, 39.0, 42.0) / 255.0;
    palette.midSand = vec3(168.0, 63.0, 45.0) / 255.0;
    palette.sunSand = vec3(223.0, 113.0, 64.0) / 255.0;
    palette.crest = vec3(246.0, 171.0, 97.0) / 255.0;
    palette.mineral = vec3(92.0, 28.0, 42.0) / 255.0;
    palette.sparkle = vec3(255.0, 211.0, 154.0) / 255.0;
    palette.haze = vec3(155.0, 64.0, 56.0) / 255.0;
  } else if (index < 3.5) {
    palette.shadow = vec3(36.0, 29.0, 59.0) / 255.0;
    palette.darkSand = vec3(77.0, 65.0, 88.0) / 255.0;
    palette.midSand = vec3(117.0, 100.0, 119.0) / 255.0;
    palette.sunSand = vec3(169.0, 138.0, 139.0) / 255.0;
    palette.crest = vec3(212.0, 181.0, 166.0) / 255.0;
    palette.mineral = vec3(73.0, 51.0, 91.0) / 255.0;
    palette.sparkle = vec3(217.0, 210.0, 255.0) / 255.0;
    palette.haze = vec3(101.0, 85.0, 111.0) / 255.0;
  } else if (index < 4.5) {
    palette.shadow = vec3(31.0, 37.0, 48.0) / 255.0;
    palette.darkSand = vec3(75.0, 75.0, 73.0) / 255.0;
    palette.midSand = vec3(118.0, 111.0, 91.0) / 255.0;
    palette.sunSand = vec3(170.0, 160.0, 120.0) / 255.0;
    palette.crest = vec3(223.0, 207.0, 147.0) / 255.0;
    palette.mineral = vec3(79.0, 121.0, 110.0) / 255.0;
    palette.sparkle = vec3(234.0, 255.0, 198.0) / 255.0;
    palette.haze = vec3(128.0, 120.0, 99.0) / 255.0;
  } else {
    palette.shadow = vec3(44.0, 23.0, 40.0) / 255.0;
    palette.darkSand = vec3(102.0, 50.0, 56.0) / 255.0;
    palette.midSand = vec3(154.0, 79.0, 55.0) / 255.0;
    palette.sunSand = vec3(207.0, 120.0, 62.0) / 255.0;
    palette.crest = vec3(243.0, 184.0, 93.0) / 255.0;
    palette.mineral = vec3(124.0, 40.0, 64.0) / 255.0;
    palette.sparkle = vec3(255.0, 232.0, 135.0) / 255.0;
    palette.haze = vec3(152.0, 80.0, 68.0) / 255.0;
  }
  return palette;
}

float hash12(vec2 value) {
  vec3 p3 = fract(vec3(value.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  // Analytic normals are evaluated at vertices and interpolated across LOD
  // triangles. This prevents the Sobel pass from inking the terrain tessellation.
  vec3 normal = normalize(vTerrainNormal);
  if (normal.y < 0.0) normal = -normal;

  vec3 sunDirection = normalize(uSunDirection);
  vec3 viewDirection = normalize(cameraPosition - vTerrainRenderPosition);
  // Shade the *body* of each dune, not every tiny displacement wrinkle. The
  // earlier exaggerated normal turned the field into a camouflage map from a
  // wide camera. A restrained graphic normal preserves the long windward and
  // lee faces while the physical geometry still carries the small ripples.
  vec3 graphicNormal = normalize(vec3(normal.x * 1.2, normal.y, normal.z * 1.2));
  float nDotL = clamp(dot(graphicNormal, sunDirection) * 0.86 + 0.14, 0.0, 1.0);
  float slope = length(normal.xz);
  float density = vTerrainFields.x;
  float crestLikelihood = vTerrainFields.y;
  float distanceToCamera = length(vTerrainRenderPosition - cameraPosition);
  TerrainRegionPalette fromPalette = terrainRegionPalette(vTerrainRegion.x);
  TerrainRegionPalette toPalette = terrainRegionPalette(vTerrainRegion.y);
  vec3 shadowColor = mix(fromPalette.shadow, toPalette.shadow, vTerrainRegion.z);
  vec3 darkSandColor = mix(fromPalette.darkSand, toPalette.darkSand, vTerrainRegion.z);
  vec3 midSandColor = mix(fromPalette.midSand, toPalette.midSand, vTerrainRegion.z);
  vec3 sunSandColor = mix(fromPalette.sunSand, toPalette.sunSand, vTerrainRegion.z);
  vec3 crestColor = mix(fromPalette.crest, toPalette.crest, vTerrainRegion.z);
  vec3 mineralColor = mix(fromPalette.mineral, toPalette.mineral, vTerrainRegion.z);
  vec3 sparkleColor = mix(fromPalette.sparkle, toPalette.sparkle, vTerrainRegion.z);
  vec3 hazeColor = mix(fromPalette.haze, toPalette.haze, vTerrainRegion.z);

  // Each successive distance band removes one class of secondary face. At a
  // chase-camera distance the complete dune still reads; at the horizon only
  // the strongest crest and lee masses survive. This avoids turning the
  // kilometre-scale desert into a contour map of equally weighted patches.
  float middleQuiet = step(560.0, distanceToCamera);
  float farQuiet = step(1120.0, distanceToCamera);
  float horizonQuiet = step(1880.0, distanceToCamera);

  // Dune material regions are selected by physical form. Mineral density only
  // adds a rare accent on steep lee faces; it never paints arbitrary islands.
  float sunFacingSlope = dot(normal.xz, normalize(sunDirection.xz));
  float crestThreshold = 0.41
    + middleQuiet * 0.09
    + farQuiet * 0.08
    + horizonQuiet * 0.06;
  float duneFaceThreshold = 0.21
    + middleQuiet * 0.055
    + farQuiet * 0.065;
  float steepFaceThreshold = 0.36
    + middleQuiet * 0.075
    + farQuiet * 0.085;
  float majorCrest = step(crestThreshold, crestLikelihood);
  float duneFace = step(duneFaceThreshold, slope);
  float steepFace = step(steepFaceThreshold, slope);
  float secondarySlopeWeight = 1.0
    - middleQuiet * 0.24
    - farQuiet * 0.4
    - horizonQuiet * 0.36;
  float majorFace = duneFace * max(majorCrest, steepFace * secondarySlopeWeight);
  float windwardFace = majorFace * step(0.075, sunFacingSlope);
  float leeFace = majorFace * step(sunFacingSlope, -0.055);
  float deepLeeFace = steepFace
    * step(sunFacingSlope, -0.16)
    * max(majorCrest, secondarySlopeWeight);
  // Preserve a small number of large lee masses after the distance quieting
  // retires secondary bands. The high slope and opposed-sun gates are sampled
  // from the wide graphic normal, so this can only select monumental faces,
  // never the fine ripple/contour network removed in Round 8.
  float monumentalSlopeThreshold = 0.46
    + middleQuiet * 0.035
    + farQuiet * 0.025;
  float monumentalLee = step(monumentalSlopeThreshold, slope)
    * step(sunFacingSlope, -0.18);
  float monumentalLeeWeight = 0.22
    + middleQuiet * 0.1
    + farQuiet * 0.08;
  // A second, lower-frequency lee value returns volume to open aerial plains.
  // It activates only after the widened far normal has retired nested ridges.
  float broadPlainLee = middleQuiet
    * step(0.22 + farQuiet * 0.035, slope)
    * step(sunFacingSlope, -0.105)
    * (1.0 - monumentalLee);
  float flatCrown = step(slope, 0.065);
  float faceContrast = 1.0
    - middleQuiet * 0.12
    - farQuiet * 0.18
    - horizonQuiet * 0.12;
  vec3 materialTone = midSandColor;
  materialTone = mix(materialTone, sunSandColor, flatCrown * 0.08);
  materialTone = mix(materialTone, sunSandColor, windwardFace * 0.2 * faceContrast);
  materialTone = mix(materialTone, darkSandColor, leeFace * 0.3 * faceContrast);
  materialTone = mix(materialTone, shadowColor, deepLeeFace * 0.52 * faceContrast);
  materialTone = mix(materialTone, shadowColor, monumentalLee * monumentalLeeWeight);
  materialTone = mix(materialTone, darkSandColor, broadPlainLee * 0.17);
  float mineralFace = steepFace * leeFace * step(0.91, density);
  materialTone = mix(materialTone, mineralColor, mineralFace * 0.15);

  // The global ramp is deliberately low-contrast. Strong hue changes come
  // from directional windward/lee faces above, so wide views read as volumes
  // instead of height-contour islands.
  float rampContrast = 1.0
    - middleQuiet * 0.34
    - farQuiet * 0.34
    - horizonQuiet * 0.22;
  vec3 color = materialTone;
  color = mix(color, darkSandColor, (1.0 - step(0.67, nDotL)) * 0.1 * rampContrast);
  color = mix(color, sunSandColor, step(0.9, nDotL) * 0.18 * rampContrast);

  // A paired pale/dark lip makes the wind ridge read as a raised form: the
  // sunward edge flashes, while the immediately opposed edge is inked.
  float lipThreshold = 0.875
    + middleQuiet * 0.035
    + farQuiet * 0.025;
  float crestBand = step(lipThreshold, crestLikelihood)
    * step(0.145, slope)
    * (1.0 - step(0.64, slope));
  float sunLip = crestBand * step(0.075, sunFacingSlope);
  float leeLip = crestBand * step(sunFacingSlope, -0.055);
  // Keep the ridge hard, but do not let a near-camera lip become an opaque
  // cream rail under perspective. Its geometry and paired lee ink still carry
  // the form at speed; the color accent is deliberately restrained.
  color = mix(color, crestColor, sunLip * 0.38);
  color = mix(color, shadowColor, leeLip * 0.56);

  // Hard-edged fake specular rather than a physically based lobe.
  vec3 halfDirection = normalize(sunDirection + viewDirection);
  float bandedSpecular = step(0.932, dot(normal, halfDirection))
    * step(0.54, nDotL)
    * flatCrown
    * step(0.86, crestLikelihood)
    * step(0.76, density);
  color = mix(color, crestColor, bandedSpecular * 0.22);

  // Sparse diamond flashes, quantized in both world space and time. This reads
  // as drawn mineral glitter, not continuously interpolated specular noise.
  vec2 sparkleGrid = vTerrainWorldPosition.xz * 0.47;
  vec2 sparkleCell = floor(sparkleGrid);
  vec2 sparkleLocal = abs(fract(sparkleGrid) - 0.5);
  float diamond = 1.0 - step(0.13, sparkleLocal.x + sparkleLocal.y);
  float sparkleFrame = floor(uTime * 7.0);
  float sparkleHash = hash12(sparkleCell + sparkleFrame * vec2(17.0, 7.0));
  float sparkle = diamond * step(0.988, sparkleHash)
    * step(0.61, nDotL)
    * step(0.42, density)
    * step(0.885, dot(normal, halfDirection));
  color = mix(color, sparkleColor, sparkle);

  // Atmospheric perspective is itself stepped, preserving graphic color flats.
  float haze = clamp(
    (distanceToCamera - uHazeNear) / max(1.0, uHazeFar - uHazeNear),
    0.0,
    1.0
  );
  haze = floor(haze * 4.0) * 0.25;
  color = mix(color, hazeColor, haze * 0.82);
  fragColor = vec4(color, 1.0);
}
`;

const TERRAIN_DEPTH_FRAGMENT_GLSL = /* glsl */ `
precision highp float;
#include <packing>
out vec4 fragColor;
void main() {
  fragColor = packDepthToRGBA(gl_FragCoord.z);
}
`;

const TERRAIN_NORMAL_FRAGMENT_GLSL = /* glsl */ `
precision highp float;
in vec3 vTerrainRenderPosition;
in vec3 vTerrainNormal;
out vec4 fragColor;
void main() {
  vec3 normal = normalize(vTerrainNormal);
  if (normal.y < 0.0) normal = -normal;
  fragColor = vec4(normal * 0.5 + 0.5, 1.0);
}
`;

function resolvePalette(overrides: Partial<TerrainPalette> | undefined): TerrainPalette {
  return {
    shadow: overrides?.shadow ?? DEFAULT_TERRAIN_PALETTE.shadow,
    darkSand: overrides?.darkSand ?? DEFAULT_TERRAIN_PALETTE.darkSand,
    midSand: overrides?.midSand ?? DEFAULT_TERRAIN_PALETTE.midSand,
    sunSand: overrides?.sunSand ?? DEFAULT_TERRAIN_PALETTE.sunSand,
    crest: overrides?.crest ?? DEFAULT_TERRAIN_PALETTE.crest,
    mineral: overrides?.mineral ?? DEFAULT_TERRAIN_PALETTE.mineral,
    sparkle: overrides?.sparkle ?? DEFAULT_TERRAIN_PALETTE.sparkle,
    haze: overrides?.haze ?? DEFAULT_TERRAIN_PALETTE.haze,
  };
}

export function createTerrainMaterial(
  options: TerrainMaterialOptions = {},
): TerrainMaterialBundle {
  const palette = resolvePalette(options.palette);
  const sun = options.sunDirection ?? { x: -0.42, y: 0.82, z: 0.38 };
  const uniforms: TerrainUniformSet = {
    time: { value: 0 },
    renderOrigin: { value: new Vector2() },
    sunDirection: { value: new Vector3(sun.x, sun.y, sun.z).normalize() },
    shadow: { value: new Color(palette.shadow) },
    darkSand: { value: new Color(palette.darkSand) },
    midSand: { value: new Color(palette.midSand) },
    sunSand: { value: new Color(palette.sunSand) },
    crest: { value: new Color(palette.crest) },
    mineral: { value: new Color(palette.mineral) },
    sparkle: { value: new Color(palette.sparkle) },
    haze: { value: new Color(palette.haze) },
    hazeNear: { value: options.hazeNear ?? 520 },
    hazeFar: { value: options.hazeFar ?? 2_650 },
  };

  const sharedTerrainUniforms = {
    uRenderOrigin: uniforms.renderOrigin,
  };
  const material = new ShaderMaterial({
    name: 'PodRacing/CelDesert',
    glslVersion: GLSL3,
    vertexShader: TERRAIN_VERTEX_GLSL,
    fragmentShader: TERRAIN_FRAGMENT_GLSL,
    side: DoubleSide,
    depthWrite: true,
    depthTest: true,
    transparent: false,
    uniforms: {
      ...sharedTerrainUniforms,
      uTime: uniforms.time,
      uSunDirection: uniforms.sunDirection,
      uShadowColor: uniforms.shadow,
      uDarkSandColor: uniforms.darkSand,
      uMidSandColor: uniforms.midSand,
      uSunSandColor: uniforms.sunSand,
      uCrestColor: uniforms.crest,
      uMineralColor: uniforms.mineral,
      uSparkleColor: uniforms.sparkle,
      uHazeColor: uniforms.haze,
      uHazeNear: uniforms.hazeNear,
      uHazeFar: uniforms.hazeFar,
    },
  });
  material.toneMapped = false;

  const depthMaterial = new ShaderMaterial({
    name: 'PodRacing/DesertDepth',
    glslVersion: GLSL3,
    vertexShader: TERRAIN_VERTEX_GLSL,
    fragmentShader: TERRAIN_DEPTH_FRAGMENT_GLSL,
    side: DoubleSide,
    blending: NoBlending,
    uniforms: sharedTerrainUniforms,
  });

  const normalMaterial = new ShaderMaterial({
    name: 'PodRacing/DesertNormal',
    glslVersion: GLSL3,
    vertexShader: TERRAIN_VERTEX_GLSL,
    fragmentShader: TERRAIN_NORMAL_FRAGMENT_GLSL,
    side: DoubleSide,
    blending: NoBlending,
    uniforms: sharedTerrainUniforms,
  });

  return {
    material,
    depthMaterial,
    normalMaterial,
    uniforms,
    dispose(): void {
      material.dispose();
      depthMaterial.dispose();
      normalMaterial.dispose();
    },
  };
}
