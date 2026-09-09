import { INKSTORM_SHADOW_GLSL } from '../inkstorm/InkstormSunShadow';

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
varying vec3 vSurfacePosition;
#ifdef USE_CEL_BASE_COLOR_MAP
uniform mat3 uBaseColorUvTransform;
varying vec2 vBaseColorUv;
#endif
#ifdef USE_CEL_NORMAL_MAP
uniform mat3 uNormalUvTransform;
varying vec2 vNormalUv;
  #ifdef USE_TANGENT
    varying vec3 vViewTangent;
    varying vec3 vViewBitangent;
  #endif
#endif
#ifdef USE_CEL_ROUGHNESS_MAP
uniform mat3 uRoughnessUvTransform;
varying vec2 vRoughnessUv;
#endif

void main() {
  #ifdef USE_CEL_BASE_COLOR_MAP
    vBaseColorUv = (uBaseColorUvTransform * vec3(CEL_BASE_COLOR_UV, 1.0)).xy;
  #endif
  #ifdef USE_CEL_NORMAL_MAP
    vNormalUv = (uNormalUvTransform * vec3(CEL_NORMAL_UV, 1.0)).xy;
  #endif
  #ifdef USE_CEL_ROUGHNESS_MAP
    vRoughnessUv = (uRoughnessUvTransform * vec3(CEL_ROUGHNESS_UV, 1.0)).xy;
  #endif
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
  #if defined(USE_CEL_NORMAL_MAP) && defined(USE_TANGENT)
    // Match Three's normal_vertex, including authored tangent handedness and
    // separate direction/normal transforms under nonuniform model matrices.
    vViewTangent = normalize(transformedTangent);
    vViewBitangent = normalize(cross(vViewNormal, vViewTangent) * tangent.w);
    #ifdef FLIP_SIDED
      vViewBitangent = -vViewBitangent;
    #endif
  #endif
  vWorldNormal = normalize(inverseTransformDirection(vViewNormal, viewMatrix));
  vWorldPosition = worldPosition.xyz;
  vViewDepth = -viewPosition.z;
  vSurfacePosition = position;
}
`;

export const CEL_FRAGMENT_SHADER = /* glsl */ `
${INKSTORM_SHADOW_GLSL}
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
uniform float uWear;
#ifdef USE_CEL_BASE_COLOR_MAP
uniform sampler2D uBaseColorMap;
uniform float uBaseColorStrength;
uniform float uBaseColorSaturation;
uniform float uBaseColorContrast;
varying vec2 vBaseColorUv;
#endif
#ifdef USE_CEL_NORMAL_MAP
uniform sampler2D uNormalMap;
uniform vec2 uNormalScale;
varying vec2 vNormalUv;
  #ifdef USE_TANGENT
    varying vec3 vViewTangent;
    varying vec3 vViewBitangent;
  #endif
#endif
#ifdef USE_CEL_ROUGHNESS
uniform float uRoughness;
#endif
#ifdef USE_CEL_ROUGHNESS_MAP
uniform sampler2D uRoughnessMap;
varying vec2 vRoughnessUv;
#endif

varying vec3 vWorldNormal;
varying vec3 vViewNormal;
varying vec3 vWorldPosition;
varying float vViewDepth;
varying vec3 vSurfacePosition;

#include <common>
#include <color_pars_fragment>

#ifdef USE_CEL_NORMAL_MAP
// Three r185 normalmap_pars_fragment's derivative tangent frame, evaluated
// wholly in world space. Positions include object/instance transforms and N
// uses defaultnormal_vertex's inverse transpose, including nonuniform scale.
vec3 celMappedNormal(vec3 surfaceNormal, float faceDirection) {
  // Sample outside conditional flow. Data remain linear in both frame paths.
  vec3 mapNormal = texture2D(uNormalMap, vNormalUv).xyz * 2.0 - 1.0;
  mapNormal.xy *= uNormalScale;
  #ifdef USE_TANGENT
    // A derivative frame is not equivalent to interpolated authored tangents
    // under nonuniform/sheared transforms. Keep Three's authored view frame.
    vec3 viewNormal = normalize(vViewNormal);
    #ifdef DOUBLE_SIDED
      viewNormal *= faceDirection;
    #endif
    mat3 tbn = mat3(normalize(vViewTangent), normalize(vViewBitangent), viewNormal);
    #ifdef DOUBLE_SIDED
      tbn[0] *= faceDirection;
      tbn[1] *= faceDirection;
    #endif
    vec3 mapped = tbn * mapNormal;
    float lengthSquared = dot(mapped, mapped);
    return lengthSquared > 1.e-20
      ? inverseTransformDirection(mapped * inversesqrt(max(lengthSquared, 1.e-20)), viewMatrix)
      : surfaceNormal;
  #else
  vec3 q0 = dFdx(vWorldPosition);
  vec3 q1 = dFdy(vWorldPosition);
  vec2 st0 = dFdx(vNormalUv);
  vec2 st1 = dFdy(vNormalUv);
  vec3 q1perp = cross(q1, surfaceNormal);
  vec3 q0perp = cross(surfaceNormal, q0);
  vec3 tangent = q1perp * st0.x + q0perp * st1.x;
  vec3 bitangent = q1perp * st0.y + q0perp * st1.y;
  float determinant = max(dot(tangent, tangent), dot(bitangent, bitangent));
  float scale = inversesqrt(max(determinant, 1.e-20));
  mat3 tbn = mat3(tangent * scale, bitangent * scale, surfaceNormal);
  #ifdef DOUBLE_SIDED
    // Match normal_fragment_begin: only the normal column reverses on the
    // back face after deriving the frame from its already reversed normal.
    tbn[0] *= faceDirection;
    tbn[1] *= faceDirection;
  #endif
  vec3 mapped = tbn * mapNormal;
  float lengthSquared = dot(mapped, mapped);
  // A collapsed UV island or zero-length encoded normal must not create NaNs.
  vec3 unitMapped = mapped * inversesqrt(max(lengthSquared, 1.e-20));
  return determinant > 1.e-20 && lengthSquared > 1.e-20 ? unitMapped : surfaceNormal;
  #endif
}
#endif

float wearHash(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float enamelNoise(vec2 p) {
  vec2 cell=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(wearHash(vec3(cell,0.0)),wearHash(vec3(cell+vec2(1.0,0.0),0.0)),f.x),
    mix(wearHash(vec3(cell+vec2(0.0,1.0),0.0)),wearHash(vec3(cell+vec2(1.0,1.0),0.0)),f.x),f.y);
}
void main() {
  vec3 normal = normalize(vWorldNormal);
  float faceDirection = gl_FrontFacing ? 1.0 : -1.0;
  #ifdef DOUBLE_SIDED
    normal *= faceDirection;
  #endif
  #ifdef USE_CEL_NORMAL_MAP
    normal = celMappedNormal(normal, faceDirection);
  #endif
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  vec3 lightDirection = normalize(uLightDirection);

  // A small wrapped term preserves readable shadow shapes without making the
  // unlit side black. Nearest-filtered ramp lookup keeps every transition hard.
  float diffuseTerm = clamp(dot(normal, lightDirection) * 0.86 + 0.14, 0.0, 1.0);
  vec3 color = texture2D(uRamp, vec2(diffuseTerm, 0.5)).rgb * uTint;
  if (uWear > 0.0) {
    vec3 paintedRamp = (texture2D(uRamp, vec2(clamp(diffuseTerm-.07,0.,1.),.5)).rgb
      + texture2D(uRamp, vec2(clamp(diffuseTerm+.07,0.,1.),.5)).rgb) * .5;
    color = mix(color, paintedRamp*uTint, uWear*.8);
  }
  #ifdef USE_COLOR
    // Three r185 carries vertex color as vec4 so batched/instanced alpha can
    // share the same varying. NPR tinting only consumes the RGB channels.
    color *= vColor.rgb;
  #endif

  #ifdef USE_CEL_BASE_COLOR_MAP
    // GLTFLoader's sRGB color texture is decoded by Three's texture format.
    // Shape the authored paint in linear space, before highlights and haze.
    vec3 paint = texture2D(uBaseColorMap, vBaseColorUv).rgb;
    float paintLuma = dot(paint, vec3(.2126, .7152, .0722));
    paint = mix(vec3(paintLuma), paint, uBaseColorSaturation);
    paint = clamp((paint - .18) * uBaseColorContrast + .18, 0., 1.);
    color *= mix(vec3(1.), paint, uBaseColorStrength);
  #endif

  // Continuous object-space brush fields replace the visible square hash
  // cells. Anisotropic marks follow the machine's fore-aft construction, and
  // sparse exposed-metal islands sit inside broader worn paint areas.
  if (uWear > 0.0) {
    vec2 enamelUv=vec2(vSurfacePosition.z+vSurfacePosition.y*.31,
      vSurfacePosition.x+vSurfacePosition.y*.77);
    float brush=enamelNoise(enamelUv*vec2(1.15,4.2));
    float fracture=enamelNoise(enamelUv*vec2(7.3,12.7)+vec2(brush*1.4,-brush*.8));
    float chip=smoothstep(.72,.86,fracture)*smoothstep(.56,.79,brush);
    float detail=1.-smoothstep(55.,150.,vViewDepth);
    color*=1.+uWear*(brush-.5)*.11*detail;
    color=mix(color,vec3(.23,.19,.19),chip*uWear*.63*detail);
  }

  vec3 halfDirection = normalize(lightDirection + viewDirection);
  float specularLobe = pow(max(dot(normal, halfDirection), 0.0), uSpecularPower);
  float specularBand = mix(step(uSpecularCutoff, specularLobe),smoothstep(uSpecularCutoff*.5,uSpecularCutoff*1.6,specularLobe),uWear);
  float specularResponse = 1.0;
  float reflectionResponse = 1.0;
  #ifdef USE_CEL_ROUGHNESS
    float surfaceRoughness = uRoughness;
    #ifdef USE_CEL_ROUGHNESS_MAP
      // glTF metallic-roughness packing: G is roughness; R/B are not consumed.
      surfaceRoughness *= texture2D(uRoughnessMap, vRoughnessUv).g;
    #endif
    float matte = clamp(surfaceRoughness, 0.0, 1.0);
    matte *= matte;
    specularResponse = 1.0 - .88 * matte;
    reflectionResponse = 1.0 - .92 * matte;
  #endif
  color += uSpecularColor * specularBand * uSpecularStrength * specularResponse;

  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), uRimPower);
  float rimBand = step(uRimCutoff, fresnel);
  color += uRimColor * rimBand * uRimStrength;

  // View-normal lookup is a graphic matcap, not a physical environment probe.
  vec3 matcapNormal = normalize(vViewNormal);
  #ifdef USE_CEL_NORMAL_MAP
    matcapNormal = transformDirection(normal, viewMatrix);
  #elif defined(DOUBLE_SIDED)
    matcapNormal *= faceDirection;
  #endif
  vec2 matcapUv = matcapNormal.xy * 0.5 + 0.5;
  float reflectionBand = texture2D(uMatcap, matcapUv).r;
  color += uReflectionColor * reflectionBand * uReflectionStrength * reflectionResponse;
  // The moving craft receives the same canyon/industrial shade as the ground.
  // Emission is added afterward so powered cores retain their readable glow.
  color *= mix(vec3(.38,.34,.55),vec3(1.),inkstormSunVisibility(vWorldPosition+normal*.35));
  color += uEmissiveColor * uEmissiveStrength;

  float hazeSpan = max(uHazeFar - uHazeNear, 0.001);
  float haze = clamp((vViewDepth - uHazeNear) / hazeSpan, 0.0, 1.0);
  haze = floor(haze * uHazeBands) / max(uHazeBands, 1.0);
  color = mix(color, uHazeColor, haze);

  gl_FragColor = vec4(color, uOpacity);
  #include <colorspace_fragment>
}
`;
