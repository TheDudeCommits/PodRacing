/**
 * Cinematic post chain shaders. Everything before the grade pass is linear,
 * scene-referred HDR; the grade pass tone maps with Khronos PBR Neutral (which
 * leaves the authored stylized palette untouched below ~0.76) and grades in
 * display space, so emissive engines, lances and lava can bloom without
 * washing out the painted materials.
 */

export const FULLSCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** 13-tap downsample (Jimenez, "Next generation post processing in Call of
 * Duty: Advanced Warfare"). The first level applies a soft-knee threshold and
 * a luminance-weighted average to suppress single-pixel fireflies. */
export const BLOOM_DOWNSAMPLE_FRAGMENT = /* glsl */ `
uniform sampler2D tSource;
uniform vec2 uTexel;
uniform float uPrefilter;
uniform vec4 uThreshold; // threshold, knee, 2*knee, .25/knee
varying vec2 vUv;
vec3 tap(vec2 offset) { return texture2D(tSource, vUv + uTexel * offset).rgb; }
float karis(vec3 c) { return 1.0 / (1.0 + max(c.r, max(c.g, c.b))); }
vec3 prefilter(vec3 c) {
  float brightness = max(c.r, max(c.g, c.b));
  float soft = clamp(brightness - uThreshold.x + uThreshold.y, 0.0, uThreshold.z);
  soft = uThreshold.w * soft * soft;
  float contribution = max(soft, brightness - uThreshold.x) / max(brightness, 1e-4);
  return c * contribution;
}
void main() {
  vec3 a = tap(vec2(-2.0, 2.0)), b = tap(vec2(0.0, 2.0)), c = tap(vec2(2.0, 2.0));
  vec3 d = tap(vec2(-2.0, 0.0)), e = tap(vec2(0.0)), f = tap(vec2(2.0, 0.0));
  vec3 g = tap(vec2(-2.0, -2.0)), h = tap(vec2(0.0, -2.0)), i = tap(vec2(2.0, -2.0));
  vec3 j = tap(vec2(-1.0, 1.0)), k = tap(vec2(1.0, 1.0)), l = tap(vec2(-1.0, -1.0)), m = tap(vec2(1.0, -1.0));
  vec3 color;
  if (uPrefilter > 0.5) {
    vec3 g0 = (a + b + d + e) * .25, g1 = (b + c + e + f) * .25, g2 = (d + e + g + h) * .25;
    vec3 g3 = (e + f + h + i) * .25, g4 = (j + k + l + m) * .25;
    float w0 = karis(g0) * .125, w1 = karis(g1) * .125, w2 = karis(g2) * .125, w3 = karis(g3) * .125, w4 = karis(g4) * .5;
    color = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / max(w0 + w1 + w2 + w3 + w4, 1e-4);
    color = prefilter(min(color, vec3(96.0)));
  } else {
    color = e * .125 + (a + c + g + i) * .03125 + (b + d + f + h) * .0625 + (j + k + l + m) * .125;
  }
  gl_FragColor = vec4(color, 1.0);
}
`;

/** 3x3 tent upsample, additively blended onto the next larger mip. */
export const BLOOM_UPSAMPLE_FRAGMENT = /* glsl */ `
uniform sampler2D tSource;
uniform vec2 uTexel;
uniform float uRadius;
uniform float uWeight;
varying vec2 vUv;
vec3 tap(vec2 offset) { return texture2D(tSource, vUv + uTexel * uRadius * offset).rgb; }
void main() {
  vec3 color = tap(vec2(-1.0, 1.0)) + tap(vec2(0.0, 1.0)) * 2.0 + tap(vec2(1.0, 1.0))
    + tap(vec2(-1.0, 0.0)) * 2.0 + tap(vec2(0.0)) * 4.0 + tap(vec2(1.0, 0.0)) * 2.0
    + tap(vec2(-1.0, -1.0)) + tap(vec2(0.0, -1.0)) * 2.0 + tap(vec2(1.0, -1.0));
  gl_FragColor = vec4(color * (uWeight / 16.0), 1.0);
}
`;

/** Bright sky around the sun, masked by scene depth: only unoccluded sky can
 * cast crepuscular rays, so canyon walls and arches cut them into shafts. */
export const RAYS_SOURCE_FRAGMENT = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uSunUv;
uniform float uAspect;
uniform float uSunSpread;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  float depth = texture2D(tDepth, vUv).x;
  float sky = step(0.99999, depth);
  vec3 color = texture2D(tColor, vUv).rgb;
  float lum = dot(color, vec3(.2126, .7152, .0722));
  vec2 d = (vUv - uSunUv) * vec2(uAspect, 1.0);
  float falloff = exp(-dot(d, d) / max(uSunSpread, 1e-4));
  float bright = smoothstep(uThreshold, uThreshold + .6, lum);
  gl_FragColor = vec4(color * sky * (bright * .75 + .25) * falloff, 1.0);
}
`;

export const RAYS_BLUR_FRAGMENT = /* glsl */ `
uniform sampler2D tSource;
uniform vec2 uSunUv;
uniform float uDensity;
uniform float uDecay;
uniform float uWeight;
uniform float uJitter;
varying vec2 vUv;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  const int SAMPLES = 40;
  vec2 delta = (vUv - uSunUv) * uDensity / float(SAMPLES);
  vec2 uv = vUv - delta * hash12(gl_FragCoord.xy + uJitter);
  float illumination = 1.0;
  vec3 sum = vec3(0.0);
  for (int i = 0; i < SAMPLES; i++) {
    uv -= delta;
    sum += texture2D(tSource, uv).rgb * illumination;
    illumination *= uDecay;
  }
  gl_FragColor = vec4(sum * uWeight, 1.0);
}
`;

/** Scene composite: speed blur and chromatic fringing, depth-based height fog
 * with sun in-scattering, bloom and rays, exposure, PBR Neutral, then a
 * display-space grade (CDL, saturation, contrast, split tone), vignette and
 * grain. Output is sRGB-encoded for the FXAA pass. */
export const GRADE_FRAGMENT = /* glsl */ `
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tBloom;
uniform sampler2D tRays;
uniform sampler2D tDepth;
uniform float uHasBloom;
uniform float uHasRays;
uniform mat4 uProjectionInverse;
uniform mat4 uCameraWorld;
uniform vec3 uCameraPosition;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uFogColor;
uniform vec3 uFogSunColor;
uniform float uFogDensity;
uniform float uFogFalloff;
uniform float uFogBase;
uniform float uFogMax;
uniform float uFogStart;
uniform float uBloomStrength;
uniform float uRaysStrength;
uniform float uExposure;
uniform vec3 uLift;
uniform vec3 uGamma;
uniform vec3 uGain;
uniform float uSaturation;
uniform float uContrast;
uniform vec3 uShadowTint;
uniform vec3 uHighlightTint;
uniform float uSplitTone;
uniform float uVignette;
uniform vec3 uVignetteColor;
uniform float uGrain;
uniform float uTime;
uniform float uSpeedBlur;
uniform float uChromatic;
uniform vec2 uBlurCenter;
uniform float uAspect;
uniform float uFlash;
uniform vec3 uFlashColor;
varying vec2 vUv;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

vec3 pbrNeutral(vec3 color) {
  const float startCompression = 0.8 - 0.04;
  const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) return color;
  const float d = 1.0 - startCompression;
  float newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}

vec3 linearToSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

vec3 sceneColor(vec2 uv) {
  vec2 toCentre = uv - uBlurCenter;
  float radial = length(toCentre * vec2(uAspect, 1.0));
  vec2 fringe = toCentre * uChromatic * radial;
  vec3 color = vec3(
    texture2D(tColor, uv - fringe).r,
    texture2D(tColor, uv).g,
    texture2D(tColor, uv + fringe).b);
  if (uSpeedBlur > 0.001) {
    float edge = smoothstep(0.12, 0.75, radial);
    vec2 stepUv = toCentre * uSpeedBlur * edge * 0.011;
    float jitter = hash12(gl_FragCoord.xy + uTime);
    vec3 sum = color;
    for (int i = 1; i <= 6; i++) {
      float t = (float(i) + jitter) / 6.0;
      sum += texture2D(tColor, uv - stepUv * t * 6.0).rgb;
    }
    color = sum / 7.0;
  }
  return color;
}

void main() {
  vec3 color = sceneColor(vUv);
  float depth = texture2D(tDepth, vUv).x;
  if (depth < 0.99999 && uFogDensity > 0.0) {
    vec4 view = uProjectionInverse * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    view /= view.w;
    vec3 world = (uCameraWorld * vec4(view.xyz, 1.0)).xyz;
    vec3 ray = world - uCameraPosition;
    float dist = length(ray);
    vec3 rd = ray / max(dist, 1e-4);
    float travelled = max(dist - uFogStart, 0.0);
    float heightTerm = uFogDensity * exp(-(uCameraPosition.y - uFogBase) * uFogFalloff);
    float k = rd.y * uFogFalloff;
    float optical = abs(k) > 1e-4 ? heightTerm * (1.0 - exp(-travelled * k)) / k : heightTerm * travelled;
    float fog = min(1.0 - exp(-max(optical, 0.0)), uFogMax);
    float sunAmount = pow(max(dot(rd, uSunDirection), 0.0), 6.0);
    vec3 fogColor = mix(uFogColor, uFogSunColor, sunAmount);
    color = mix(color, fogColor, fog);
  }
  if (uHasBloom > 0.5) color += texture2D(tBloom, vUv).rgb * uBloomStrength;
  if (uHasRays > 0.5) color += texture2D(tRays, vUv).rgb * uRaysStrength * uSunColor;
  color += uFlashColor * uFlash;
  color *= uExposure;
  color = pbrNeutral(max(color, vec3(0.0)));
  vec3 display = linearToSrgb(color);
  // ASC CDL style grade in display space.
  display = pow(max(display * uGain + uLift, vec3(0.0)), 1.0 / max(uGamma, vec3(0.01)));
  float luma = dot(display, vec3(.2126, .7152, .0722));
  display = mix(vec3(luma), display, uSaturation);
  display = (display - 0.5) * uContrast + 0.5;
  float shadowWeight = 1.0 - smoothstep(0.0, 0.55, luma);
  float highlightWeight = smoothstep(0.45, 1.0, luma);
  display += (uShadowTint - 0.5) * shadowWeight * uSplitTone + (uHighlightTint - 0.5) * highlightWeight * uSplitTone;
  vec2 vig = (vUv - 0.5) * vec2(uAspect, 1.0);
  float vignette = smoothstep(0.35, 1.15, length(vig) * 1.12);
  display = mix(display, display * uVignetteColor, vignette * uVignette);
  display += (hash12(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(display, 0.0, 1.0), 1.0);
}
`;
