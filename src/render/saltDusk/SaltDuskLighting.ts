import { Vector3 } from 'three';

/** One physical light direction for the sky, surface BRDF and both shadow atlases. */
export const SALT_DUSK_SUN = new Vector3(0.5494082908, 0.0460031821, 0.8342866637).normalize();
export const SALT_DUSK_HAZE = '#aaa7ac';

/** Continuous, energy-bounded GGX lighting. The photographic panorama supplies
 * reflections, with mip filtering as a cheap roughness approximation (not a
 * convolved irradiance probe). No ray tracing or extra geometry pass. */
export const SALT_DUSK_LIGHT_GLSL = /* glsl */ `
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
vec3 duskEnvironment(vec3 direction,float roughness) {
  vec3 sky=mix(vec3(.075,.080,.090),vec3(.27,.34,.46),smoothstep(-.15,.8,direction.y));
  if(uDuskEnvironmentReady>.5) {
    sky=texture2D(uDuskEnvironment,duskEnvironmentUv(direction),roughness*7.).rgb*uDuskEnvironmentExposure;
  }
  // A panorama records the horizon; the actual salt basin supplies the lower
  // hemisphere. It cannot reflect vegetation from the capture location.
  return mix(sky,vec3(.19,.17,.145),1.-smoothstep(-.12,.025,direction.y));
}
vec3 duskLight(vec3 base,vec3 n,vec3 world,float roughness,float metalness,float visibility) {
  vec3 v=normalize(cameraPosition-world),l=normalize(uDuskSun),h=normalize(v+l);
  float nv=max(.015,dot(n,v)),nl=max(0.,dot(n,l)),nh=max(0.,dot(n,h)),vh=max(0.,dot(v,h));
  float r=clamp(roughness,.18,1.),a=r*r,a2=a*a;
  float d=a2/(3.14159265*pow(max(.001,nh*nh*(a2-1.)+1.),2.));
  float k=pow(r+1.,2.)*.125;
  float g=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
  vec3 f0=mix(vec3(.04),base,metalness);
  vec3 f=f0+(1.-f0)*pow(1.-vh,5.);
  vec3 spec=d*g*f/max(.06,4.*nl*nv);
  vec3 diffuse=(1.-f)*base*(1.-metalness)/3.14159265;
  vec3 direct=(diffuse+spec)*vec3(8.2,5.0,2.7)*nl*visibility;
  float skyFacing=clamp(n.y*.5+.5,0.,1.);
  vec3 fill=mix(vec3(.09,.081,.080),vec3(.32,.315,.33),skyFacing)*base*(1.-metalness*.7);
  vec3 fresnel=f0+(max(vec3(1.-r),f0)-f0)*pow(1.-nv,5.);
  vec3 reflection=duskEnvironment(reflect(-v,n),r)*fresnel*(1.-r*.55);
  return direct+fill+reflection;
}
vec3 duskAtmosphere(vec3 color,float distanceToCamera) {
  float haze=1.-exp(-max(0.,distanceToCamera-190.)*.00038);
  return mix(color,vec3(.31,.30,.33),haze*.82);
}
`;
