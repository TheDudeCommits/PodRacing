import {
  DoubleSide,
  GLSL3,
  ShaderMaterial,
  type Camera,
  type IUniform,
  type Object3D,
} from 'three';

import {
  CEL_HULL_OUTLINE_USER_DATA_KEY,
  CEL_POST_EXCLUDE_USER_DATA_KEY,
} from '../materials/InvertedHullOutline';

export const CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY = 'celTerrainEdgeSuppress';

const RESERVED_UNIFORMS = new Set([
  'uCameraNear',
  'uCameraFar',
  'uHullOutlined',
  'uTerrainSuppressed',
  'uExcluded',
]);

export interface CelPrepassMaterialOptions {
  /** GLSL helper functions/constants inserted before `main` (for analytic terrain fields). */
  readonly vertexPreamble?: string;
  /** GLSL inserted after morphing/skinning; mutate the local `transformed` position. */
  readonly vertexTransform?: string;
  /** GLSL inserted before normal-matrix projection; mutate local `objectNormal`. */
  readonly normalTransform?: string;
  readonly uniforms?: Readonly<Record<string, IUniform>>;
  readonly name?: string;
}

interface PrepassUniforms {
  [uniform: string]: IUniform<unknown>;
  uCameraNear: IUniform<number>;
  uCameraFar: IUniform<number>;
  uHullOutlined: IUniform<number>;
  uTerrainSuppressed: IUniform<number>;
  uExcluded: IUniform<number>;
}

function createVertexShader(
  vertexPreamble: string,
  vertexTransform: string,
  normalTransform: string,
): string {
  return /* glsl */ `
#include <common>
#include <batching_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>

${vertexPreamble}

varying vec3 vViewNormal;
varying float vViewDepth;

void main() {
  #include <morphinstance_vertex>
  #include <batching_vertex>

  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  ${normalTransform}
  #include <defaultnormal_vertex>

  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  ${vertexTransform}

  vec4 localPosition = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    localPosition = batchingMatrix * localPosition;
  #endif
  #ifdef USE_INSTANCING
    localPosition = instanceMatrix * localPosition;
  #endif
  vec4 viewPosition = viewMatrix * modelMatrix * localPosition;
  gl_Position = projectionMatrix * viewPosition;
  vViewNormal = normalize(transformedNormal);
  vViewDepth = -viewPosition.z;
}
`;
}

const PREPASS_FRAGMENT_SHADER = /* glsl */ `
uniform float uCameraNear;
uniform float uCameraFar;
uniform float uHullOutlined;
uniform float uTerrainSuppressed;
uniform float uExcluded;

varying vec3 vViewNormal;
varying float vViewDepth;

layout(location = 0) out vec4 outNormal;
layout(location = 1) out vec4 outDepthMask;

vec3 packDepth24(float depth) {
  vec3 packed = fract(vec3(1.0, 255.0, 65025.0) * depth);
  packed -= packed.yzz * vec3(1.0 / 255.0, 1.0 / 255.0, 0.0);
  return packed;
}

void main() {
  if (uExcluded > 0.5) discard;
  vec3 normal = normalize(vViewNormal);
  if (!gl_FrontFacing) normal = -normal;
  float depthRange = max(uCameraFar - uCameraNear, 0.0001);
  float linearDepth = clamp((vViewDepth - uCameraNear) / depthRange, 0.0, 0.999999);
  outNormal = vec4(normal * 0.5 + 0.5, 1.0);
  // Alpha is a small class buffer: 0 generic, 0.5 terrain, 1 hull source.
  outDepthMask = vec4(
    packDepth24(linearDepth),
    max(uHullOutlined, uTerrainSuppressed * 0.5)
  );
}
`;

function cameraRange(camera: Camera): readonly [number, number] {
  const candidate = camera as Camera & { near?: number; far?: number };
  return [candidate.near ?? 0.1, candidate.far ?? 2500];
}

/** MRT material contract: attachment 0 is view normal, attachment 1 is depth+mask. */
export class CelPrepassMaterial extends ShaderMaterial {
  private readonly prepassUniforms: PrepassUniforms;
  private exclusionPredicate: ((object: Object3D) => boolean) | undefined;

  constructor(options: CelPrepassMaterialOptions = {}) {
    const customUniforms = options.uniforms ?? {};
    for (const name of Object.keys(customUniforms)) {
      if (RESERVED_UNIFORMS.has(name)) {
        throw new Error(`Custom prepass uniform "${name}" is reserved.`);
      }
    }
    const uniforms: PrepassUniforms = {
      ...customUniforms,
      uCameraNear: { value: 0.1 },
      uCameraFar: { value: 2500 },
      uHullOutlined: { value: 0 },
      uTerrainSuppressed: { value: 0 },
      uExcluded: { value: 0 },
    };

    super({
      name: options.name ?? 'CelNormalDepthMrtPrepass',
      glslVersion: GLSL3,
      vertexShader: createVertexShader(
        options.vertexPreamble ?? '',
        options.vertexTransform ?? '',
        options.normalTransform ?? '',
      ),
      fragmentShader: PREPASS_FRAGMENT_SHADER,
      uniforms,
      side: DoubleSide,
      depthTest: true,
      depthWrite: true,
      colorWrite: true,
      toneMapped: false,
      lights: false,
      fog: false,
    });

    this.prepassUniforms = uniforms;
    this.onBeforeRender = (_renderer, _scene, camera, _geometry, object): void => {
      this.setCamera(camera);
      this.setObjectFlags(object);
    };
  }

  setExclusionPredicate(predicate?: (object: Object3D) => boolean): void {
    this.exclusionPredicate = predicate;
  }

  setCamera(camera: Camera): void {
    const [near, far] = cameraRange(camera);
    this.prepassUniforms.uCameraNear.value = Math.max(0, near);
    this.prepassUniforms.uCameraFar.value = Math.max(near + 0.0001, far);
  }

  setObjectFlags(object: Object3D): void {
    const meshCandidate = object as Object3D & { isMesh?: boolean };
    const materialCandidate = object as Object3D & {
      material?: { transparent?: boolean; depthWrite?: boolean } | readonly {
        transparent?: boolean;
        depthWrite?: boolean;
      }[];
    };
    const materials = Array.isArray(materialCandidate.material)
      ? materialCandidate.material
      : materialCandidate.material
        ? [materialCandidate.material]
        : [];
    const isGraphicTransparent = materials.some(
      (material) => material.transparent === true || material.depthWrite === false,
    );
    const excluded = meshCandidate.isMesh !== true
      || isGraphicTransparent
      || object.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] === true
      || this.exclusionPredicate?.(object) === true;
    this.prepassUniforms.uExcluded.value = excluded ? 1 : 0;
    this.prepassUniforms.uHullOutlined.value =
      object.userData[CEL_HULL_OUTLINE_USER_DATA_KEY] === true ? 1 : 0;
    this.prepassUniforms.uTerrainSuppressed.value =
      object.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY] === true ? 1 : 0;
  }
}

export function createCelPrepassMaterial(
  options: CelPrepassMaterialOptions = {},
): CelPrepassMaterial {
  return new CelPrepassMaterial(options);
}
