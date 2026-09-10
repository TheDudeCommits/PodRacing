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
vec3 inkstormRockAlbedo(vec3 world,vec3 normal,sampler2D paint,sampler2D beds,float ready){
  vec3 base=vec3(.30,.27,.23);
  if(uDuskRockReady>.5){
    vec3 detail=duskTriplanar(uDuskRock,world,normal,1./36.);
    vec3 macro=duskTriplanar(uDuskRock,world+vec3(83.,61.,27.),normal,1./153.);
    base=detail*.58+macro*.42;
    // Keep the quarry stone pale enough to show warm light and cold sky fill.
    base=mix(base,vec3(.30,.285,.25),.32)*1.08;
  }
  return base;
}
vec3 inkstormRockNormal(vec3 world,vec3 normal,vec3 albedo){
  if(uDuskRockReady<.5)return normal;
  return duskRelief(uDuskRockNormal,world,normal,1./36.,.23);
}
vec3 inkstormRockAtmosphere(vec3 color,float distanceToCamera){return duskAtmosphere(color,distanceToCamera);}
`;
