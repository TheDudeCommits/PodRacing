import { COURSE_GULF_GLSL } from './CourseGulfTextures';

/**
 * GPU twin of terrainMath.ts. Both implementations use the same integer hash,
 * octave transforms, salts and field constants. CPU/GPU float precision may
 * differ by millimetres; silhouettes and gameplay samples remain coherent.
 */
export const TERRAIN_GLSL = /* glsl */ `
${COURSE_GULF_GLSL}
const uint TERRAIN_SEED_U = 0x504f4452u;

float terrainSaturate(float value) {
  return clamp(value, 0.0, 1.0);
}

float terrainSmoother(float value) {
  return value * value * value * (value * (value * 6.0 - 15.0) + 10.0);
}

uint terrainHashBits(ivec2 cell, int salt) {
  uint value = uint(cell.x) * 0x9e3779b1u
    + uint(cell.y) * 0x85ebca77u
    + (uint(salt) + TERRAIN_SEED_U) * 0xc2b2ae3du;
  value ^= value >> 16u;
  value *= 0x7feb352du;
  value ^= value >> 15u;
  value *= 0x846ca68bu;
  value ^= value >> 16u;
  return value;
}

float terrainHash(ivec2 cell, int salt) {
  return float(terrainHashBits(cell, salt)) * (1.0 / 4294967295.0);
}

float terrainValueNoise(vec2 point, int salt) {
  ivec2 cell = ivec2(floor(point));
  vec2 fraction = fract(point);
  vec2 blend = vec2(terrainSmoother(fraction.x), terrainSmoother(fraction.y));
  float a = terrainHash(cell, salt);
  float b = terrainHash(cell + ivec2(1, 0), salt);
  float c = terrainHash(cell + ivec2(0, 1), salt);
  float d = terrainHash(cell + ivec2(1, 1), salt);
  return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y) * 2.0 - 1.0;
}

float terrainFbm(vec2 point, int octaves, int salt) {
  vec2 p = point;
  float amplitude = 0.545;
  float total = 0.0;
  float normalization = 0.0;
  for (int octave = 0; octave < 5; octave++) {
    if (octave >= octaves) break;
    total += terrainValueNoise(p, salt + octave * 17) * amplitude;
    normalization += amplitude;
    p = vec2(
      p.x * 1.672 - p.y * 1.126 + 11.7,
      p.x * 1.126 + p.y * 1.672 - 7.3
    );
    amplitude *= 0.49;
  }
  return total / normalization;
}

float terrainCycle(float phase) {
  return fract(phase * (1.0 / 6.28318530718) + 0.25);
}

float terrainDuneProfile(float cycle, float crestPosition) {
  if (cycle < crestPosition) {
    return pow(terrainSmoother(terrainSaturate(cycle / crestPosition)), 0.82);
  }
  return 1.0 - terrainSmoother(
    terrainSaturate((cycle - crestPosition) / (1.0 - crestPosition))
  );
}

float terrainCrestPulse(float cycle, float crestPosition, float width) {
  float distanceToCrest = abs(cycle - crestPosition);
  float wrappedDistance = min(distanceToCrest, 1.0 - distanceToCrest);
  return pow(terrainSaturate(1.0 - wrappedDistance / width), 1.35);
}

float terrainRegionValue(
  float index,
  float sunscar,
  float glassFlats,
  float redCanyon,
  float stormBasin,
  float machineGraveyard,
  float geothermal
) {
  if (index < 0.5) return sunscar;
  if (index < 1.5) return glassFlats;
  if (index < 2.5) return redCanyon;
  if (index < 3.5) return stormBasin;
  if (index < 4.5) return machineGraveyard;
  return geothermal;
}

vec3 terrainRegionBlendInfo(float worldX) {
  const float regionCellSize = 9600.0;
  const float transition = 720.0;
  float cell = floor(worldX / regionCellSize + 0.5);
  float local = worldX - cell * regionCellSize;
  float halfCell = regionCellSize * 0.5;
  float blendStart = halfCell - transition;
  float fromIndex = mod(cell, 6.0);
  float toIndex = fromIndex;
  float amount = 0.0;
  if (local > blendStart) {
    toIndex = mod(cell + 1.0, 6.0);
    amount = terrainSmoother(terrainSaturate((local - blendStart) / (transition * 2.0)));
  } else if (local < -blendStart) {
    fromIndex = mod(cell - 1.0, 6.0);
    toIndex = mod(cell, 6.0);
    amount = terrainSmoother(terrainSaturate(
      (local + halfCell + transition) / (transition * 2.0)
    ));
  }
  return vec3(fromIndex, toIndex, amount);
}

float terrainFieldsDetailed(vec2 worldXZ, out vec3 fields, out float authoredOffset) {
  float x = worldXZ.x;
  float z = worldXZ.y;
  float continental = terrainFbm(vec2(x * 0.00152 + 13.8, z * 0.00152 - 9.4), 5, 11);
  float warpA = terrainFbm(vec2(x * 0.00315 - 31.2, z * 0.00315 + 18.6), 4, 83);
  float warpB = terrainFbm(vec2(x * 0.0041 + 7.1, z * 0.0041 + 42.5), 3, 149);
  float warpedX = x + warpA * 54.0 + warpB * 17.0;
  float warpedZ = z + warpA * 23.0 - warpB * 39.0;

  float megaPhase = warpedX * 0.00665 + warpedZ * 0.00248
    + terrainFbm(worldXZ * 0.00191, 4, 211) * 2.7;
  float megaCycle = terrainCycle(megaPhase);
  float megaBody = terrainDuneProfile(megaCycle, 0.76);
  float megaCrest = terrainCrestPulse(megaCycle, 0.76, 0.065);

  float crossPhase = warpedX * -0.0032 + warpedZ * 0.0108
    + terrainFbm(vec2(x * 0.0048 + 90.0, z * 0.0048 - 70.0), 3, 307) * 1.65;
  float crossCycle = terrainCycle(crossPhase);
  float crossBody = terrainDuneProfile(crossCycle, 0.68);
  float crossCrest = terrainCrestPulse(crossCycle, 0.68, 0.072);

  float erosion = terrainFbm(vec2(x * 0.0072 - 3.4, z * 0.0072 + 1.8), 5, 401);
  float shelf = sign(erosion) * pow(abs(erosion), 1.32);

  float ridgePhase = warpedX * 0.024 + warpedZ * 0.011 + erosion * 1.45;
  float ridgeCycle = terrainCycle(ridgePhase);
  float ridgeBody = terrainDuneProfile(ridgeCycle, 0.78);
  float ridgeCrest = terrainCrestPulse(ridgeCycle, 0.78, 0.07);

  float ripplePhase = warpedX * 0.095 + warpedZ * 0.037
    + terrainValueNoise(worldXZ * 0.018, 503) * 2.1;
  float rippleEnvelope = 0.44 + 0.56 * terrainSaturate(continental * 0.5 + 0.5);
  float directionalRipple = sin(ripplePhase) * rippleEnvelope;

  float finePhase = warpedX * 0.238 - warpedZ * 0.071
    + terrainValueNoise(worldXZ * 0.052, 617) * 1.4;
  float fineRipple = sin(finePhase);

  float sunscarHeight = continental * 6.5
    + megaBody * 33.5
    + crossBody * 6.5
    + ridgeBody * 9.5
    + shelf * 1.2
    + megaCrest * (6.3 + terrainSaturate(erosion * 0.5 + 0.5) * 2.3)
    + crossCrest * 1.6
    + ridgeCrest * (2.8 + terrainSaturate(erosion * 0.5 + 0.5) * 1.1)
    + directionalRipple * 0.36
    + fineRipple * 0.08
    - 19.0;

  float glassHeight = continental * 2.4
    + megaBody * 6.2
    + crossBody * 1.8
    + ridgeBody * 1.4
    + shelf * 0.45
    + megaCrest * 1.15
    + directionalRipple * 0.16
    + fineRipple * 0.05
    - 4.8;
  float canyonShelf = erosion * (1.45 - abs(erosion) * 0.45);
  float canyonHeight = continental * 7.5
    + megaBody * 13.0
    + crossBody * 5.5
    + ridgeBody * 3.8
    + canyonShelf * 18.0
    + megaCrest * 3.4
    + ridgeCrest * 1.9
    - 18.0;
  float basinFloor = pow(terrainSaturate(1.0 - abs(erosion)), 2.0);
  float stormHeight = continental * 9.2
    + megaBody * 13.5
    + crossBody * 4.1
    + ridgeBody * 3.6
    + shelf * 1.8
    - basinFloor * 9.5
    + directionalRipple * 0.24
    - 13.5;
  float machineRibX = terrainCrestPulse(
    terrainCycle(x * 0.018 + erosion * 0.34), 0.5, 0.052
  );
  float machineRibZ = terrainCrestPulse(
    terrainCycle(z * 0.014 - erosion * 0.28), 0.5, 0.047
  );
  float machineRibs = max(machineRibX, machineRibZ);
  float graveyardHeight = continental * 3.0
    + megaBody * 6.8
    + crossBody * 2.0
    + shelf * 0.7
    + machineRibs * 4.8
    + directionalRipple * 0.12
    - 7.2;
  float ventNoise = terrainSaturate(
    terrainValueNoise(vec2(x * 0.0067 + 43.0, z * 0.0067 - 17.0), 829) * 0.5 + 0.5
  );
  float ventLift = ventNoise * ventNoise * ventNoise * 12.0;
  float geothermalHeight = continental * 8.2
    + megaBody * 19.5
    + crossBody * 8.4
    + ridgeBody * 10.8
    + shelf * 3.0
    + megaCrest * 5.4
    + ridgeCrest * 3.2
    + ventLift
    + directionalRipple * 0.31
    - 22.0;

  float baseDensity = terrainSaturate(
    0.5
    + terrainValueNoise(vec2(x * 0.011 + 5.3, z * 0.011 - 8.1), 719) * 0.31
    + continental * 0.19
  );
  float baseCrest = terrainSaturate(
    megaCrest * 0.86
    + crossCrest * 0.46
    + ridgeCrest * 0.62
    + terrainSaturate(erosion) * 0.08
  );
  float baseRipple = directionalRipple * 0.82 + fineRipple * 0.18;
  vec3 region = terrainRegionBlendInfo(x);
  float fromHeight = terrainRegionValue(
    region.x,
    sunscarHeight, glassHeight, canyonHeight, stormHeight, graveyardHeight, geothermalHeight
  );
  float toHeight = terrainRegionValue(
    region.y,
    sunscarHeight, glassHeight, canyonHeight, stormHeight, graveyardHeight, geothermalHeight
  );
  float height = mix(fromHeight, toHeight, region.z);
  float fromDensity = terrainRegionValue(
    region.x,
    baseDensity,
    terrainSaturate(baseDensity * 0.72 + 0.28),
    terrainSaturate(baseDensity * 0.88 + abs(erosion) * 0.18),
    terrainSaturate(baseDensity * 0.64 + 0.08),
    terrainSaturate(baseDensity * 0.74 + machineRibs * 0.24),
    terrainSaturate(baseDensity * 0.84 + ventNoise * 0.2)
  );
  float toDensity = terrainRegionValue(
    region.y,
    baseDensity,
    terrainSaturate(baseDensity * 0.72 + 0.28),
    terrainSaturate(baseDensity * 0.88 + abs(erosion) * 0.18),
    terrainSaturate(baseDensity * 0.64 + 0.08),
    terrainSaturate(baseDensity * 0.74 + machineRibs * 0.24),
    terrainSaturate(baseDensity * 0.84 + ventNoise * 0.2)
  );
  float fromCrest = terrainRegionValue(
    region.x,
    baseCrest,
    terrainSaturate(baseCrest * 0.24),
    terrainSaturate(baseCrest * 0.48 + abs(erosion) * 0.42),
    terrainSaturate(baseCrest * 0.42),
    terrainSaturate(baseCrest * 0.2 + machineRibs * 0.84),
    terrainSaturate(baseCrest * 0.72 + ventNoise * 0.35)
  );
  float toCrest = terrainRegionValue(
    region.y,
    baseCrest,
    terrainSaturate(baseCrest * 0.24),
    terrainSaturate(baseCrest * 0.48 + abs(erosion) * 0.42),
    terrainSaturate(baseCrest * 0.42),
    terrainSaturate(baseCrest * 0.2 + machineRibs * 0.84),
    terrainSaturate(baseCrest * 0.72 + ventNoise * 0.35)
  );
  float fromRipple = terrainRegionValue(
    region.x,
    baseRipple,
    baseRipple * 1.35,
    baseRipple * 0.58,
    baseRipple * 0.76,
    baseRipple * 0.42 + machineRibs * 0.3,
    baseRipple * 0.86
  );
  float toRipple = terrainRegionValue(
    region.y,
    baseRipple,
    baseRipple * 1.35,
    baseRipple * 0.58,
    baseRipple * 0.76,
    baseRipple * 0.42 + machineRibs * 0.3,
    baseRipple * 0.86
  );
  fields = vec3(
    mix(fromDensity, toDensity, region.z),
    mix(fromCrest, toCrest, region.z),
    mix(fromRipple, toRipple, region.z)
  );
  authoredOffset = courseGulfOffset(worldXZ);
  return height + authoredOffset;
}

float terrainFields(vec2 worldXZ, out vec3 fields) {
  float authoredOffset;
  return terrainFieldsDetailed(worldXZ, fields, authoredOffset);
}
`;

export const TERRAIN_VERTEX_GLSL = /* glsl */ `
${TERRAIN_GLSL}

uniform vec2 uRenderOrigin;

out vec3 vTerrainWorldPosition;
out vec3 vTerrainRenderPosition;
out vec3 vTerrainFields;
out vec3 vTerrainRegion;
out float vTerrainHeight;
out float vTerrainAuthoredOffset;
out float vTerrainAuthoredGrade;
out vec3 vTerrainNormal;

void main() {
  vec4 renderPosition = modelMatrix * vec4(position, 1.0);
  vec2 logicalXZ = renderPosition.xz + uRenderOrigin;
  vec3 fields;
  float authoredOffset;
  float terrainHeight = terrainFieldsDetailed(logicalXZ, fields, authoredOffset);
  vec3 unusedFields;
  // Displacement keeps every wind ripple, while the lighting normal widens
  // with view distance. Small ridges therefore remain tangible nearby but no
  // longer choose alternating paint bands across kilometre-wide review shots.
  float viewDistance = length(renderPosition.xyz - cameraPosition);
  float normalEpsilon = mix(
    9.5,
    48.0,
    smoothstep(360.0, 1840.0, viewDistance)
  );
  float offsetX, offsetZ;
  float heightX = terrainFieldsDetailed(logicalXZ + vec2(normalEpsilon, 0.0), unusedFields, offsetX);
  float heightZ = terrainFieldsDetailed(logicalXZ + vec2(0.0, normalEpsilon), unusedFields, offsetZ);
  renderPosition.y += terrainHeight;

  vTerrainWorldPosition = vec3(logicalXZ.x, renderPosition.y, logicalXZ.y);
  vTerrainRenderPosition = renderPosition.xyz;
  vTerrainFields = fields;
  vTerrainRegion = terrainRegionBlendInfo(logicalXZ.x);
  vTerrainHeight = terrainHeight;
  vTerrainAuthoredOffset = authoredOffset;
  // A cut/fill cliff remains geological where its signed offset crosses zero.
  // Reuse the normal probes, with no additional terrain or texture samples.
  vTerrainAuthoredGrade = length(vec2(offsetX-authoredOffset, offsetZ-authoredOffset)) / normalEpsilon;
  vTerrainNormal = normalize(vec3(
    terrainHeight - heightX,
    normalEpsilon,
    terrainHeight - heightZ
  ));
  gl_Position = projectionMatrix * viewMatrix * renderPosition;
}
`;
