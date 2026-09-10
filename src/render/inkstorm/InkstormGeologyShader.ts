/** Shared world-space stone, lighting and atmosphere for terrain and rock meshes. */
export const INKSTORM_GEOLOGY_GLSL = /* glsl */ `
float inkstormStoneHash(vec2 p) {
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
float inkstormStoneNoise(vec2 p) {
  vec2 i=floor(p), f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(inkstormStoneHash(i),inkstormStoneHash(i+vec2(1.,0.)),f.x),
    mix(inkstormStoneHash(i+vec2(0.,1.)),inkstormStoneHash(i+vec2(1.,1.)),f.x),f.y);
}

vec3 inkstormRockAlbedo(vec3 world, vec3 normal, sampler2D paint, sampler2D beds, float ready) {
  // Mineral deposits are irregular two-dimensional patches, not a repeated
  // height band. Their metre scale is identical on stretched scans and terrain.
  float mass=inkstormStoneNoise(world.xz*.012+world.y*vec2(.006,-.004));
  vec2 depositUv=vec2(dot(world.xz,vec2(.61,.79))*.029,
    world.y*.082+mass*1.7);
  float deposit=inkstormStoneNoise(depositUv);
  float fracture=inkstormStoneNoise(vec2(world.x*.057-world.z*.043,
    world.y*.026+world.z*.019)+mass*1.4);
  float resolved=1.-smoothstep(.25,.8,max(fwidth(depositUv.x),fwidth(depositUv.y)));
  float brokenDeposit=smoothstep(.60,.85,deposit)
    *smoothstep(.38,.74,fracture)*resolved;
  float iron=smoothstep(.51,.82,fracture)*(1.-smoothstep(.3,.58,deposit));
  vec3 rust=pow(vec3(.69,.30,.18),vec3(2.2));
  vec3 sandstone=pow(vec3(.80,.40,.24),vec3(2.2));
  vec3 albedo=mix(rust,sandstone,.25+mass*.48);
  // The lightest deposit stays warm rust, at only 22% coverage strength. No
  // cream belt can run around a silhouette or flatten the existing fractures.
  albedo=mix(albedo,pow(vec3(.85,.49,.30),vec3(2.2)),brokenDeposit*.22);
  albedo*=1.-iron*.13;
  if (ready>.5) {
    vec3 weights=pow(abs(normal),vec3(4.));
    weights/=max(.001,weights.x+weights.y+weights.z);
    // Broad fractures vary in phase with the existing mineral field. A larger
    // quiet plate scale and a weaker independent bed layer avoid a repeated
    // grid of cracks or the previous high-contrast combing at 37m per tile.
    vec2 phase=vec2(mass,fracture)*.24;
    vec3 texel=texture2D(paint,world.zy/140.+phase).rgb*weights.x
      +texture2D(paint,world.xz/140.+phase.yx+vec2(.31,.17)).rgb*weights.y
      +texture2D(paint,world.xy/140.+phase+vec2(.63,.27)).rgb*weights.z;
    vec3 bedding=texture2D(beds,world.zy/128.+phase*.28).rgb*weights.x
      +texture2D(beds,world.xz/128.+phase.yx*.28).rgb*weights.y
      +texture2D(beds,world.xy/128.+phase*.28).rgb*weights.z;
    float macroWear=dot(texel,vec3(.30,.59,.11))/.19;
    float bedWear=dot(bedding,vec3(.30,.59,.11))/.19;
    float wear=clamp(mix(macroWear,bedWear,.28),.35,1.6);
    albedo*=mix(.48,1.25,smoothstep(.38,1.4,wear));
    albedo=mix(albedo,albedo*vec3(.68,.71,.88),
      (1.-smoothstep(.40,.65,wear))*.24);
  }
  return albedo;
}

// Screen derivatives recover small surface relief from the already sampled
// paint. No new texture taps, vertex displacement or collision changes.
vec3 inkstormRockNormal(vec3 world,vec3 normal,vec3 albedo) {
  float relief=dot(albedo,vec3(.30,.59,.11))*2.2;
  vec3 dx=dFdx(world),dy=dFdy(world);
  vec3 rx=cross(dy,normal),ry=cross(normal,dx);
  float determinant=dot(dx,rx);
  vec3 gradient=sign(determinant)*(dFdx(relief)*rx+dFdy(relief)*ry);
  vec3 bumped=normalize(max(abs(determinant),.000001)*normal-gradient);
  // Surface paint must not overpower a scanned facet or turn distant marks
  // into corrugated shading. Relief fades with the visible world footprint.
  float footprint=sqrt(max(length(dx)*length(dy),.000001));
  float strength=mix(.30,.08,smoothstep(.35,2.5,footprint));
  return normalize(mix(normal,bumped,strength));
}

vec3 inkstormRockLight(vec3 albedo, vec3 normal, vec3 sun, float visibility) {
  float ndl=dot(normal,sun);
  // Cool sky fill retains readable surface variation on the canyon's shadow
  // wall. It does not depend on object-local height or instance stretching.
  // Preserve paint value and broad face orientation in shadow. A dominant
  // constant violet fill erased the canyon's surface information in round21.
  // Retain the relative values of painted cracks in shade. A minimum value
  // floor on every texel washed both fissures and ledges into the same violet.
  float stoneValue=dot(albedo,vec3(.30,.59,.11));
  vec3 recess=stoneValue*vec3(.20,.14,.31)+albedo*.025
    +pow(vec3(.045,.032,.07),vec3(2.2));
  // Broad directional sky fill distinguishes exposed shelf tops, vertical
  // faces and undersides inside a sun shadow. The previous 16% range flattened
  // an entire scanned arch into nearly one value. This only lowers sheltered
  // face values; it cannot turn the canyon back into a luminous lavender wall.
  float skyFacing=clamp(dot(normal,vec3(.42,.76,.50))*.5+.5,0.,1.);
  float skyPlane=.38+.62*skyFacing*skyFacing;
  recess*=skyPlane;
  vec3 color=mix(recess,albedo*vec3(1.06,1.01,.96),
    smoothstep(-.14,.84,ndl)*visibility);
  // Actual upward, sun-facing ledges catch warm light. This follows geometry
  // rather than drawing a pale contour at an arbitrary world height.
  float ledge=smoothstep(.32,.82,normal.y)*smoothstep(.20,.85,ndl)*visibility;
  return color+vec3(.055,.023,.008)*ledge;
}

vec3 inkstormRockAtmosphere(vec3 color, float distanceToCamera) {
  float haze=(1.-exp(-max(0.,distanceToCamera-280.)*.00036))*.72;
  return mix(color,pow(vec3(.66,.55,.67),vec3(2.2)),haze);
}
`;
