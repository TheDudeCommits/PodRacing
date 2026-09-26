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
  sky+=vec3(.12,.057,.012)*exp(-angle*24.);
  sky=mix(vec3(.16,.19,.245),sky,smoothstep(-.025,.005,dir.y));
  gl_FragColor=vec4(duskTone(sky),1.);
  // The disc and its tight corona stay scene-referred so the cinematic chain can bloom them.
  gl_FragColor.rgb+=(vec3(9.,6.1,2.9)*sunDisc+vec3(1.1,.62,.24)*exp(-angle*70.))*smoothstep(-.02,.01,dir.y);
  #include <colorspace_fragment>
  }`;

/** Per-world skies built on the approved photograph: an aurora over the
 * Frostline ice shelf, a smoke-dark night lit by a distant eruption over
 * Ember Rift, and a humid green veil over Verdant Run. Emissive layers are
 * added after the tone curve so the cinematic post chain can bloom them. */
export const RACING_SKY_FRAGMENT = DUSK_SKY_FRAGMENT
  .replace('varying vec3 vDirection;', `uniform vec3 uBiomeSky; uniform float uBiomeStrength; uniform float uBiomeId; uniform float uTime; varying vec3 vDirection;
  float skyHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
  float skyNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(skyHash(i),skyHash(i+vec2(1,0)),f.x),mix(skyHash(i+vec2(0,1)),skyHash(i+vec2(1,1)),f.x),f.y);}`)
  .replace('gl_FragColor=vec4(duskTone(sky),1.);', `float skyLuma=dot(sky,vec3(.30,.59,.11));
  vec3 emissive=vec3(0.);
  float raw=0.;
  if(uBiomeId>1.5&&uBiomeId<2.5){
    // Scene-referred night: the photographic dusk tone curve would crush it to red.
    raw=1.;
    // Smoke-dark night: violet-black overhead, ash banks, a low ember glow at the horizon.
    float smoke=skyNoise(vec2(atan(dir.z,dir.x)*3.,dir.y*5.+uTime*.01))*.6+skyNoise(vec2(atan(dir.z,dir.x)*9.,dir.y*14.))*.4;
    sky=mix(vec3(.011,.009,.017),vec3(.03,.021,.026),smoke);
    float horizon=exp(-max(dir.y,0.)*9.);
    sky+=vec3(.15,.034,.012)*horizon*(.6+.4*smoke);
    // The Ember Rift volcano: a dark cone on the horizon, a glowing crater,
    // lava threads down its flanks and an ash column lit from below.
    float az=atan(dir.z,dir.x),az0=atan(.78,-.62);
    float d=abs(atan(sin(az-az0),cos(az-az0)));
    float peak=.2,crater=.024;
    float cone=peak-max(d-crater,0.)*.92+skyNoise(vec2(az*38.,1.))*.01;
    float ridge=.02+.018*skyNoise(vec2(az*9.,3.))+.01*skyNoise(vec2(az*31.,7.));
    float ground=max(cone,ridge);
    if(dir.y<ground){
      sky=vec3(.006,.005,.007)+vec3(.05,.011,.004)*exp(-d*9.)*smoothstep(ground-.12,ground,dir.y);
      float flank=smoothstep(.0,peak,dir.y)*step(d,.2);
      float threads=pow(1.-abs(skyNoise(vec2(az*70.+dir.y*20.,dir.y*9.))*2.-1.),14.);
      emissive+=vec3(3.2,.55,.05)*threads*flank*smoothstep(.2,.02,d)*.6;
    }
    float rise=max(dir.y-peak,0.);
    float width=.032+rise*.62;
    float column=exp(-pow(d/width,2.))*smoothstep(peak-.004,peak+.01,dir.y)*exp(-rise*2.2);
    float ash=skyNoise(vec2(az*24.-uTime*.02,dir.y*16.-uTime*.08))*.6+skyNoise(vec2(az*60.,dir.y*40.-uTime*.2))*.4;
    sky=mix(sky,vec3(.025,.019,.02)*(.6+ash*.8),column*.9);
    emissive+=vec3(1.6,.34,.04)*column*exp(-rise*14.)*(.5+ash*.7);
    emissive+=vec3(4.,1.1,.18)*exp(-pow(d/.022,2.))*exp(-pow((dir.y-peak)/.012,2.));
    emissive+=vec3(.45,.1,.02)*exp(-d*6.)*exp(-max(dir.y,0.)*6.)*.6;
  } else {
    sky=mix(sky,uBiomeSky*skyLuma*1.4,uBiomeStrength);
    if(uBiomeId>.5&&uBiomeId<1.5){
      sky*=vec3(.62,.72,.95);
      float az=atan(dir.z,dir.x);
      float band=smoothstep(.1,.28,dir.y)*(1.-smoothstep(.55,.9,dir.y));
      float curtain=0.;
      for(int i=0;i<3;i++){float fi=float(i);
        float wave=sin(az*(2.+fi)+uTime*(.04+fi*.015)+fi*1.7)*.5+.5;
        float fold=pow(abs(sin(az*(11.+fi*3.)+sin(az*3.+uTime*.08+fi)*2.2+fi)),5.);
        curtain+=fold*wave*(.65-fi*.15);}
      float shimmer=.75+.25*skyNoise(vec2(az*40.,dir.y*30.-uTime*.6));
      emissive+=mix(vec3(.15,1.35,.55),vec3(.75,.35,1.4),smoothstep(.25,.7,dir.y))*curtain*band*shimmer*.9;
    } else if(uBiomeId>2.5){
      sky=mix(sky,vec3(.62,.78,.62)*skyLuma*1.3,.25*(1.-smoothstep(0.,.35,dir.y)));
    }
  }
  gl_FragColor=vec4(mix(duskTone(sky),sky,raw),1.);
  gl_FragColor.rgb+=emissive*smoothstep(-.03,.01,dir.y);`);
