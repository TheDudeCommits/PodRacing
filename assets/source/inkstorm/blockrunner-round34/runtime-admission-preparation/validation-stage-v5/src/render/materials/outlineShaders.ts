export const OUTLINE_VERTEX_SHADER = /* glsl */ `
#include <common>
#include <batching_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>

attribute vec3 celOutlineNormal;
uniform vec2 uViewport;
uniform float uLineWidth;

void main() {
  #include <morphinstance_vertex>
  #include <batching_vertex>

  #include <beginnormal_vertex>
  objectNormal = celOutlineNormal;
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  // defaultnormal_vertex flips BackSide normals for lighting. Hull extrusion
  // needs the original outward direction even though only back faces render.
  #ifdef FLIP_SIDED
    transformedNormal = -transformedNormal;
  #endif

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

  vec4 viewPosition = viewMatrix * modelMatrix * localPosition;
  vec4 clipPosition = projectionMatrix * viewPosition;

  // Project a one-unit view-space normal endpoint. The resulting NDC direction
  // automatically incorporates perspective, camera distance and FOV.
  vec4 normalEndpoint = projectionMatrix * vec4(viewPosition.xyz + normalize(transformedNormal), 1.0);
  vec2 projectedDirection = normalEndpoint.xy / max(abs(normalEndpoint.w), 0.00001)
    - clipPosition.xy / max(abs(clipPosition.w), 0.00001);
  float directionLength = length(projectedDirection);
  vec2 fallbackDirection = normalize(transformedNormal.xy + vec2(0.00001, 0.0));
  vec2 direction = directionLength > 0.00001
    ? projectedDirection / directionLength
    : fallbackDirection;

  vec2 ndcPerPixel = 2.0 / max(uViewport, vec2(1.0));
  clipPosition.xy += direction * ndcPerPixel * uLineWidth * clipPosition.w;
  gl_Position = clipPosition;
}
`;

export const OUTLINE_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uInkColor;
uniform float uOpacity;

void main() {
  gl_FragColor = vec4(uInkColor, uOpacity);
  #include <colorspace_fragment>
}
`;
