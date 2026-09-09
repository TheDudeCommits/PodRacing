export const SOBEL_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const SOBEL_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uBeauty;
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

  float d00 = readDepth(vUv - x - y);
  float d10 = readDepth(vUv - y);
  float d20 = readDepth(vUv + x - y);
  float d01 = readDepth(vUv - x);
  float d21 = readDepth(vUv + x);
  float d02 = readDepth(vUv - x + y);
  float d12 = readDepth(vUv + y);
  float d22 = readDepth(vUv + x + y);

  vec3 normalGx = -n00 - 2.0 * n01 - n02 + n20 + 2.0 * n21 + n22;
  vec3 normalGy = -n00 - 2.0 * n10 - n20 + n02 + 2.0 * n12 + n22;
  float depthGx = -d00 - 2.0 * d01 - d02 + d20 + 2.0 * d21 + d22;
  float depthGy = -d00 - 2.0 * d10 - d20 + d02 + 2.0 * d12 + d22;

  float normalEdge = (length(normalGx) + length(normalGy)) * 0.125;
  float rawDepthEdge = (abs(depthGx) + abs(depthGy)) * 0.125;
  float localDepth = min(readDepth(vUv), min(min(d01, d21), min(d10, d12)));
  // Relative depth keeps line sensitivity stable when camera.far changes and
  // catches overlapping machinery near the camera without inking distant haze.
  float depthEdge = rawDepthEdge / max(localDepth, 0.002);
  float combinedEdge = normalEdge * uNormalWeight + depthEdge * uDepthWeight;

  float edgeClass = texture2D(uDepthMask, vUv).a;
  edgeClass = max(edgeClass, texture2D(uDepthMask, vUv - x).a);
  edgeClass = max(edgeClass, texture2D(uDepthMask, vUv + x).a);
  edgeClass = max(edgeClass, texture2D(uDepthMask, vUv - y).a);
  edgeClass = max(edgeClass, texture2D(uDepthMask, vUv + y).a);
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
  gl_FragColor = vec4(mix(beauty.rgb, uLineColor, edge), beauty.a);
  #include <colorspace_fragment>
}
`;
