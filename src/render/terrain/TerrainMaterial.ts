import { createInkstormRacerShadowUniforms, INKSTORM_RACER_SHADOW_GLSL } from '../inkstorm/InkstormRacerShadow';
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
import { INKSTORM_GEOLOGY_GLSL } from '../inkstorm/InkstormGeologyShader';
import { TERRAIN_VERTEX_GLSL } from './terrainShaderChunks';
import { createCourseGulfUniforms, type CourseGulfUniforms } from './CourseGulfTextures';
import { createInkstormShadowUniforms, INKSTORM_SHADOW_GLSL } from '../inkstorm/InkstormSunShadow';
import { inkstormSandPaintUniforms } from '../inkstorm/InkstormSurfaceMaterial';

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
  shadow: '#514061',
  darkSand: '#bd5839',
  midSand: '#e9a272',
  sunSand: '#ffc38d',
  crest: '#ffd786',
  mineral: '#b94338',
  sparkle: '#fff1ae',
  haze: '#e58159',
});

export interface TerrainMaterialOptions {
  gulfUniforms?: CourseGulfUniforms;
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
${INKSTORM_SHADOW_GLSL}
${INKSTORM_RACER_SHADOW_GLSL}
${INKSTORM_GEOLOGY_GLSL}
uniform sampler2D uRockPaint;
uniform sampler2D uRockBeds;
uniform float uRockPaintReady;
in vec3 vTerrainWorldPosition;
in vec3 vTerrainRenderPosition;
in vec3 vTerrainNormal;
in float vTerrainAuthoredOffset;
in float vTerrainAuthoredGrade;
out vec4 fragColor;
void main(){
  vec3 world=vTerrainWorldPosition;
  vec3 n=normalize(vTerrainNormal);if(n.y<0.)n=-n;
  float distanceToCamera=length(vTerrainRenderPosition-cameraPosition);
  vec3 base=vec3(.63,.59,.51);
  vec3 groundNormal=n;float roughness=.83;
  if(uDuskGroundReady>.5){
    vec3 detail=duskTriplanar(uDuskGround,world,n,1./13.);
    // Mineral bloom lifts the photographic earth to a pale saline crust while
    // retaining actual fissures, plates and grain rather than painted strokes.
    float mineral=dot(detail,vec3(.2126,.7152,.0722));
    base=vec3(.69,.645,.545)*(.64+mineral*.74);
    groundNormal=duskRelief(uDuskGroundNormal,world,n,1./13.,.26);
    roughness=clamp(duskTriplanar(uDuskGroundRoughness,world,n,1./13.).r,.60,1.);
  }
  float slope=length(n.xz)/max(.1,n.y);
  float cliff=smoothstep(.24,.58,slope)*max(smoothstep(8.,42.,abs(vTerrainAuthoredOffset)),smoothstep(.15,.45,vTerrainAuthoredGrade));
  if(cliff>.001){
    vec3 rock=inkstormRockAlbedo(world,n,uRockPaint,uRockBeds,uRockPaintReady);
    base=mix(base,rock,cliff);
    groundNormal=normalize(mix(groundNormal,inkstormRockNormal(world,n,rock),cliff));
    roughness=mix(roughness,.9,cliff);
  }
  float visibility=min(inkstormSunVisibility(world+vec3(0.,.5,0.)),inkstormRacerSunVisibility(world,n));
  vec3 color=duskLight(base,groundNormal,vTerrainRenderPosition,roughness,0.,visibility);
  fragColor=linearToOutputTexel(vec4(duskTone(duskAtmosphere(color,distanceToCamera)),1.));
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
  const sun = options.sunDirection ?? { x: -0.42, y: 0.76, z: -0.5 };
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
    ...(options.gulfUniforms ?? createCourseGulfUniforms()),
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
      ...createInkstormShadowUniforms(), ...createInkstormRacerShadowUniforms(),
      ...inkstormSandPaintUniforms(),
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
