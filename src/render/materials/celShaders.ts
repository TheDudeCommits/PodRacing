export const CEL_VERTEX_SHADER = /* glsl */ `
#include <common>
#include <batching_pars_vertex>
#include <color_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>

varying vec3 vWorldNormal;
varying vec3 vViewNormal;
varying vec3 vWorldPosition;
varying float vViewDepth;

void main() {
  #include <color_vertex>
  #include <morphinstance_vertex>
  #include <batching_vertex>

  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>

  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>

  vec4 localPosition = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    localPosition = batchingMatrix * localPosition;
  #endif
  #ifdef USE_INSTANCING
    localPosition = instanceMatrix * localPosition;
  #endif

  vec4 worldPosition = modelMatrix * localPosition;
  vec4 viewPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * viewPosition;

  vViewNormal = normalize(transformedNormal);
  vWorldNormal = normalize(inverseTransformDirection(vViewNormal, viewMatrix));
  vWorldPosition = worldPosition.xyz;
  vViewDepth = -viewPosition.z;
}
`;

export const CEL_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uRamp;
uniform sampler2D uMatcap;
uniform vec3 uLightDirection;
uniform vec3 uTint;
uniform vec3 uSpecularColor;
uniform vec3 uRimColor;
uniform vec3 uReflectionColor;
uniform vec3 uEmissiveColor;
uniform vec3 uHazeColor;
uniform float uSpecularPower;
uniform float uSpecularCutoff;
uniform float uSpecularStrength;
uniform float uRimPower;
uniform float uRimCutoff;
uniform float uRimStrength;
uniform float uReflectionStrength;
uniform float uEmissiveStrength;
uniform float uHazeNear;
uniform float uHazeFar;
uniform float uHazeBands;
uniform float uOpacity;

varying vec3 vWorldNormal;
varying vec3 vViewNormal;
varying vec3 vWorldPosition;
varying float vViewDepth;

#include <common>
#include <color_pars_fragment>

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  vec3 lightDirection = normalize(uLightDirection);

  // A small wrapped term preserves readable shadow shapes without making the
  // unlit side black. Nearest-filtered ramp lookup keeps every transition hard.
  float diffuseTerm = clamp(dot(normal, lightDirection) * 0.86 + 0.14, 0.0, 1.0);
  vec3 color = texture2D(uRamp, vec2(diffuseTerm, 0.5)).rgb * uTint;
  #ifdef USE_COLOR
    // Three r185 carries vertex color as vec4 so batched/instanced alpha can
    // share the same varying. NPR tinting only consumes the RGB channels.
    color *= vColor.rgb;
  #endif

  vec3 halfDirection = normalize(lightDirection + viewDirection);
  float specularLobe = pow(max(dot(normal, halfDirection), 0.0), uSpecularPower);
  float specularBand = step(uSpecularCutoff, specularLobe);
  color += uSpecularColor * specularBand * uSpecularStrength;

  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), uRimPower);
  float rimBand = step(uRimCutoff, fresnel);
  color += uRimColor * rimBand * uRimStrength;

  // View-normal lookup is a graphic matcap, not a physical environment probe.
  vec2 matcapUv = normalize(vViewNormal).xy * 0.5 + 0.5;
  float reflectionBand = texture2D(uMatcap, matcapUv).r;
  color += uReflectionColor * reflectionBand * uReflectionStrength;
  color += uEmissiveColor * uEmissiveStrength;

  float hazeSpan = max(uHazeFar - uHazeNear, 0.001);
  float haze = clamp((vViewDepth - uHazeNear) / hazeSpan, 0.0, 1.0);
  haze = floor(haze * uHazeBands) / max(uHazeBands, 1.0);
  color = mix(color, uHazeColor, haze);

  gl_FragColor = vec4(color, uOpacity);
  #include <colorspace_fragment>
}
`;
