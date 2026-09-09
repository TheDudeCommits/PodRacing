export const SOBEL_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const SOBEL_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uBeauty;
uniform vec4 uContactProjection;
uniform vec2 uContactDepth;
uniform float uContactStrength;
uniform float uContactValid;
uniform sampler2D uNormal;
uniform sampler2D uDepthMask;
uniform vec2 uPrepassTexel;
uniform vec3 uLineColor;
uniform float uNormalWeight;
uniform float uDepthWeight;
uniform float uEdgeThreshold;
uniform float uEdgeSoftness;
uniform float uThickness;
uniform float uOpacity;
uniform float uSilhouetteDepthThreshold;
uniform float uHullSilhouetteSuppression;

varying vec2 vUv;

float unpackDepth24(vec3 packed) {
  return min(1.0, dot(packed, vec3(1.0, 1.0 / 255.0, 1.0 / 65025.0)));
}

vec3 readNormal(vec2 uv) {
  return texture2D(uNormal, uv).xyz * 2.0 - 1.0;
}

float readDepth(vec2 uv) {
  return unpackDepth24(texture2D(uDepthMask, uv).rgb);
}

vec2 readDepthClass(vec2 uv) {
  vec4 depthMask = texture2D(uDepthMask, uv);
  return vec2(unpackDepth24(depthMask.rgb), depthMask.a);
}

vec3 contactPosition(vec2 uv, float packedDepth) {
  float depth = uContactDepth.x + packedDepth * uContactDepth.y;
  return vec3((uv * 2.0 - 1.0 + uContactProjection.zw) * depth * uContactProjection.xy, -depth);
}

float contactShade(vec2 uv) {
  if (uContactStrength <= 0.0 || uContactValid < 0.5) return 1.0;
  float depth = readDepth(uv);
  if (depth >= 0.99999) return 1.0;
  vec3 centre = contactPosition(uv, depth);
  vec3 normal = normalize(readNormal(uv));
  // A world-distance cutoff prevents unrelated foreground/background silhouettes
  // from casting screen-space halos. Fixed sample directions avoid temporal noise.
  float radius = clamp(-centre.z * 0.024, 1.6, 12.0);
  vec2 projectedRadius = radius / max(0.1, -centre.z) / uContactProjection.xy * 0.5;
  projectedRadius = min(projectedRadius, uPrepassTexel * 22.0);
  float sum = 0.0;
  for (int i = 0; i < 12; i++) {
    float angle = float(i) * 2.39996323;
    float fraction = sqrt((float(i) + 0.5) / 12.0);
    vec2 sampleUv = uv + vec2(cos(angle), sin(angle)) * projectedRadius * fraction;
    if (sampleUv.x <= 0.0 || sampleUv.x >= 1.0 || sampleUv.y <= 0.0 || sampleUv.y >= 1.0) continue;
    float neighborDepth = readDepth(sampleUv);
    if (neighborDepth >= 0.99999) continue;
    vec3 delta = contactPosition(sampleUv, neighborDepth) - centre;
    float distance = length(delta);
    float horizon = max(0.0, dot(normal, delta) / max(distance, 0.0001) - 0.085);
    float attenuation = 1.0 - smoothstep(radius * 0.16, radius, distance);
    sum += horizon * attenuation * smoothstep(0.06, 0.25, distance);
  }
  return 1.0 - min(0.38, sum / 12.0 * 2.3) * uContactStrength;
}

void main() {
  vec2 texel = uPrepassTexel * uThickness;
  vec2 x = vec2(texel.x, 0.0);
  vec2 y = vec2(0.0, texel.y);

  vec3 n00 = readNormal(vUv - x - y);
  vec3 n10 = readNormal(vUv - y);
  vec3 n20 = readNormal(vUv + x - y);
  vec3 n01 = readNormal(vUv - x);
  vec3 n21 = readNormal(vUv + x);
  vec3 n02 = readNormal(vUv - x + y);
  vec3 n12 = readNormal(vUv + y);
  vec3 n22 = readNormal(vUv + x + y);

  vec2 depthClass00 = readDepthClass(vUv - x - y);
  vec2 depthClass10 = readDepthClass(vUv - y);
  vec2 depthClass20 = readDepthClass(vUv + x - y);
  vec2 depthClass01 = readDepthClass(vUv - x);
  vec2 depthClass21 = readDepthClass(vUv + x);
  vec2 depthClass02 = readDepthClass(vUv - x + y);
  vec2 depthClass12 = readDepthClass(vUv + y);
  vec2 depthClass22 = readDepthClass(vUv + x + y);
  vec2 depthClass11 = readDepthClass(vUv);

  float d00 = depthClass00.x;
  float d10 = depthClass10.x;
  float d20 = depthClass20.x;
  float d01 = depthClass01.x;
  float d21 = depthClass21.x;
  float d02 = depthClass02.x;
  float d12 = depthClass12.x;
  float d22 = depthClass22.x;

  vec3 normalGx = -n00 - 2.0 * n01 - n02 + n20 + 2.0 * n21 + n22;
  vec3 normalGy = -n00 - 2.0 * n10 - n20 + n02 + 2.0 * n12 + n22;
  float depthGx = -d00 - 2.0 * d01 - d02 + d20 + 2.0 * d21 + d22;
  float depthGy = -d00 - 2.0 * d10 - d20 + d02 + 2.0 * d12 + d22;

  float normalEdge = (length(normalGx) + length(normalGy)) * 0.125;
  float rawDepthEdge = (abs(depthGx) + abs(depthGy)) * 0.125;
  float localDepth = min(depthClass11.x, min(min(d01, d21), min(d10, d12)));
  // Relative depth keeps line sensitivity stable when camera.far changes and
  // catches overlapping machinery near the camera without inking distant haze.
  float depthEdge = rawDepthEdge / max(localDepth, 0.002);
  float combinedEdge = normalEdge * uNormalWeight + depthEdge * uDepthWeight;

  // Classify the same complete stencil that contributes to the Sobel edge.
  // Omitting diagonal classes gives isolated skyline samples full-strength ink
  // while neighboring samples correctly receive terrain/hull suppression.
  float edgeClass = max(depthClass11.y, max(depthClass00.y, depthClass20.y));
  edgeClass = max(edgeClass, max(depthClass02.y, depthClass22.y));
  edgeClass = max(edgeClass, max(depthClass01.y, depthClass21.y));
  edgeClass = max(edgeClass, max(depthClass10.y, depthClass12.y));
  float hullMask = step(0.75, edgeClass);
  float terrainMask = step(0.25, edgeClass) * (1.0 - hullMask);

  float backgroundBoundary = step(0.999, max(max(d00, d20), max(d02, d22)));
  float silhouette = max(backgroundBoundary, step(uSilhouetteDepthThreshold, depthEdge));
  float suppression = mix(1.0, uHullSilhouetteSuppression, hullMask * silhouette);
  float edge = smoothstep(uEdgeThreshold, uEdgeThreshold + uEdgeSoftness, combinedEdge);
  // Terrain carries authored slope/crest bands in its beauty shader. Keeping a
  // trace of Sobel retains contact, while removing clipmap/topographic noise.
  edge *= suppression * mix(1.0, 0.08, terrainMask) * uOpacity;

  vec4 beauty = texture2D(uBeauty, vUv);
  gl_FragColor = vec4(mix(beauty.rgb * contactShade(vUv), uLineColor, edge), beauty.a);
  #include <colorspace_fragment>
}
`;
