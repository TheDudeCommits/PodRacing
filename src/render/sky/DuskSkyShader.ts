import { Vector3 } from 'three';

/** The approved photographic sky has its own sun direction. It must not change
 * the Production renderer's surface lighting or shadow direction. */
export const DUSK_SKY_SUN = new Vector3(0.548207989867, 0.080446966053, 0.832463984506).normalize();
export const DUSK_SKY_ROTATION = -0.045377173425;
export const DUSK_SKY_EXPOSURE = .34;

/** Frozen sky-only subset of the approved checkpoint's photographic grade.
 * The original ground, BRDF and reflection functions are deliberately absent. */
export const DUSK_SKY_GLSL = /* glsl */ `
uniform vec3 uDuskSun;
uniform sampler2D uDuskEnvironment;
uniform float uDuskEnvironmentReady;
uniform float uDuskEnvironmentRotation;
uniform float uDuskEnvironmentExposure;
vec2 duskEnvironmentUv(vec3 direction) {
  return vec2(fract(atan(direction.z,direction.x)/6.28318530718+.5+uDuskEnvironmentRotation),
    asin(clamp(direction.y,-1.,1.))/3.14159265359+.5);
}
vec3 duskTone(vec3 x) {
  x=max(x,vec3(0.));
  return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);
}
vec3 duskSkyGrade(vec3 radiance,vec3 direction) {
  float sunset=pow(max(0.,dot(direction,normalize(uDuskSun))),3.)
    *(1.-smoothstep(.42,.95,direction.y));
  return radiance*mix(vec3(.74,.87,1.12),vec3(1.72,.87,.36),sunset);
}
`;

export const DUSK_SKY_VERTEX = /* glsl */ `varying vec3 vDirection;
  void main(){vDirection=normalize((modelMatrix*vec4(position,1.)).xyz-cameraPosition);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const DUSK_SKY_FRAGMENT = /* glsl */ `varying vec3 vDirection;
  ${DUSK_SKY_GLSL}
  void main(){vec3 dir=normalize(vDirection);
  vec3 sky=mix(vec3(.42,.30,.22),vec3(.14,.23,.35),smoothstep(0.,.65,dir.y));
  if(uDuskEnvironmentReady>.5){
    vec2 uv=duskEnvironmentUv(dir),dx=dFdx(uv),dy=dFdy(uv);
    dx.x-=floor(dx.x+.5);dy.x-=floor(dy.x+.5);
    sky=textureGrad(uDuskEnvironment,uv,dx,dy).rgb*uDuskEnvironmentExposure;
  }
  sky=duskSkyGrade(sky,dir);
  float angle=acos(clamp(dot(dir,normalize(uDuskSun)),-1.,1.));
  float sunDisc=1.-smoothstep(.0064,.0078,angle);
  sky+=vec3(7.5,4.1,1.15)*sunDisc;
  sky+=vec3(.12,.057,.012)*exp(-angle*24.);
  sky=mix(vec3(.16,.19,.245),sky,smoothstep(-.025,.005,dir.y));
  gl_FragColor=vec4(duskTone(sky),1.);
  #include <colorspace_fragment>
  }`;
