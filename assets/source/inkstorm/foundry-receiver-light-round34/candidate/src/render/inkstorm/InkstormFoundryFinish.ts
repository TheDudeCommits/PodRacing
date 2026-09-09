/** Source-local coordinates from the installed pipe-bank and service-gantry
 * GLBs. Presentation only: no scene objects, light lists, textures or collision.
 */
export type InkstormFoundryFinish = 'pipe-bank' | 'service-gantry' | null;
export const INKSTORM_FOUNDRY_STRIPS = {
  'pipe-bank': [
    { center: [-27, 17.6, 3.32], halfWidth: 2, range: 7 },
    { center: [17, 24.2, 5.32], halfWidth: 2.6, range: 8 },
    { center: [25, 4.6, 16.23], halfWidth: 1.5, range: 5 },
    { center: [37, 12.1, -4.68], halfWidth: 1.2, range: 5 },
  ],
  'service-gantry': [
    { center: [-46, 29, 3.42], halfWidth: 1.25, range: 7 },
    { center: [46, 29, 3.42], halfWidth: 1.25, range: 7 },
  ],
} as const;

const glsl = (value: number) => Number.isInteger(value) ? `${value}.0` : String(value);
const strips = (family: Exclude<InkstormFoundryFinish, null>) => INKSTORM_FOUNDRY_STRIPS[family].map(lamp =>
  `light += inkstormFoundryStrip(vec3(${lamp.center.map(glsl).join(',')}), ${glsl(lamp.halfWidth)}, ${glsl(lamp.range)});`).join('\n');

export const INKSTORM_FOUNDRY_FINISH_GLSL = `
#ifdef INKSTORM_FOUNDRY_FINISH
varying vec3 vFoundryScale;

float inkstormFoundryStrip(vec3 center, float halfWidth, float range) {
  // Closest point on the actual cyan strip. Scale its extent with the module,
  // but keep the receiver falloff in world metres under nonuniform instancing.
  vec3 source = center + vec3(clamp(vLocal.x-center.x,-halfWidth,halfWidth),0.,0.);
  vec3 d = (source-vLocal)*vFoundryScale;
  float d2 = max(dot(d,d),.04);
  vec3 receiverNormal = normalize(vPaintNormal / max(vFoundryScale,vec3(.001)));
  float facing = max(0.,dot(receiverNormal,d*inversesqrt(d2)));
  float cutoff = max(0.,1.-d2/(range*range));
  // Restrict to the fixture's front service surface. This is an authored wash,
  // not a ray-traced light: nearby opaque detail is not a runtime occluder.
  float depth = abs((vLocal.z-center.z)*vFoundryScale.z);
  float envelope = 1.-smoothstep(1.2,2.5,depth);
  return facing*cutoff*cutoff*envelope/(1.+d2/9.);
}

float inkstormFoundryShellContact(vec2 center, float radius, float height, float deck) {
  vec2 radial = vLocal.xz-center;
  float r = length(radial);
  // These are painted contact accents on the retained vessel shell at the
  // exact split-band heights and supported deck. They are not new mesh seams
  // or a claim of sampled ambient occlusion. Never affect caps or railings.
  float shell = 1.-smoothstep(.12,.55,abs(r-radius));
  float upright = 1.-smoothstep(.18,.55,abs(normalize(vPaintNormal).y));
  float bandDistance = min(abs(vLocal.y-4.),min(abs(vLocal.y-12.),abs(vLocal.y-(height-7.))));
  float band = 1.-smoothstep(.24,1.35,bandDistance);
  float belowDeck = smoothstep(deck-2.,deck-.45,vLocal.y)*(1.-smoothstep(deck-.35,deck+.1,vLocal.y));
  return shell*upright*max(band,belowDeck);
}

vec2 inkstormFoundryFinish() {
  float light=0.; float contact=0.;
  #if INKSTORM_FOUNDRY_FINISH == 1
  ${strips('pipe-bank')}
  contact=max(inkstormFoundryShellContact(vec2(-27.,-7.),10.,32.,24.),
    max(inkstormFoundryShellContact(vec2(17.,-8.),13.,44.,35.),
        inkstormFoundryShellContact(vec2(37.,-11.),6.,22.,13.)));
  #else
  ${strips('service-gantry')}
  #endif
  return vec2(min(light,1.),contact);
}
#endif
`;
