import { SALT_DUSK_LIGHT_GLSL } from '../saltDusk/SaltDuskLighting';

/** Shared photographed stone and physical lighting for analytic cliffs and
 * admitted scanned meshes. UV scale is in world metres, not stretched GLB UVs. */
export const INKSTORM_GEOLOGY_GLSL = /* glsl */ `
${SALT_DUSK_LIGHT_GLSL}
uniform sampler2D uDuskRock;
uniform sampler2D uDuskRockNormal;
uniform sampler2D uDuskRockRoughness;
uniform float uDuskRockReady;
uniform sampler2D uDuskGround;
uniform sampler2D uDuskGroundNormal;
uniform sampler2D uDuskGroundRoughness;
uniform float uDuskGroundReady;
vec3 duskWeights(vec3 n){vec3 w=pow(abs(n),vec3(4.));return w/max(.001,w.x+w.y+w.z);}
vec3 duskTriplanar(sampler2D map,vec3 p,vec3 n,float scale){
  vec3 w=duskWeights(n);p*=scale;
  return texture2D(map,p.zy).rgb*w.x+texture2D(map,p.xz).rgb*w.y+texture2D(map,p.xy).rgb*w.z;
}
vec3 duskRelief(sampler2D map,vec3 p,vec3 n,float scale,float strength){
  vec3 w=duskWeights(n);p*=scale;
  vec2 x=texture2D(map,p.zy).xy*2.-1.,y=texture2D(map,p.xz).xy*2.-1.,z=texture2D(map,p.xy).xy*2.-1.;
  vec3 perturb=vec3(0.,x.y,x.x)*w.x+vec3(y.x,0.,y.y)*w.y+vec3(z.x,z.y,0.)*w.z;
  return normalize(n+perturb*strength);
}
float duskHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float duskNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(duskHash(i),duskHash(i+vec2(1.,0.)),f.x),mix(duskHash(i+vec2(0.,1.)),duskHash(i+1.),f.x),f.y);}
vec3 inkstormRockAlbedo(vec3 world,vec3 normal,sampler2D paint,sampler2D beds,float ready){
  // One geological mass has a coherent value. Photo grain is subordinate to
  // long eroded bedding and the light, rather than camouflage at every scale.
  float bed=world.y*.038+sin(world.x*.003+world.z*.002)*.34;
  float mineral=.5+.5*sin(bed+sin(bed*.37)*1.3);
  float erosion=duskNoise(world.xz*.0028+vec2(world.y*.006));
  vec3 base=mix(vec3(.098,.096,.091),vec3(.185,.164,.135),mineral*.45+erosion*.22);
  if(uDuskRockReady>.5){
    vec3 detail=duskTriplanar(uDuskRock,world,normal,1./16.);
    float grain=dot(detail,vec3(.2126,.7152,.0722));
    base*=clamp(.57+grain*2.65,.58,1.48);
  }
  return base;
}
vec3 inkstormRockNormal(vec3 world,vec3 normal,vec3 albedo){
  if(uDuskRockReady<.5)return normal;
  return duskRelief(uDuskRockNormal,world,normal,1./16.,.34);
}
vec3 inkstormRockAtmosphere(vec3 color,float distanceToCamera){return duskAtmosphere(color,distanceToCamera);}
`;
