/**
 * Per-world ground materials. The desert shading (form, strokes, rock beds,
 * shadows) is kept as a luminance guide and gradient-mapped into each world's
 * palette, then world features are layered on top: glowing lava rivers with
 * crusted plates in Ember Rift, polished ice sheets and glacial cliffs in
 * Frostline, moss, soil and reflective puddles in Verdant Run.
 *
 * Emissive values are scene-referred (above 1) so the cinematic post chain
 * blooms them. Lava and water stay clear of the racing line using the
 * course distance field.
 */
export const WORLD_MATERIAL_GLSL = /* glsl */ `
float wmHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float wmNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(wmHash(i), wmHash(i + vec2(1., 0.)), f.x), mix(wmHash(i + vec2(0., 1.)), wmHash(i + vec2(1., 1.)), f.x), f.y);
}
float wmFbm(vec2 p) {
  float v = 0., a = .5;
  mat2 r = mat2(.8, -.6, .6, .8);
  for (int i = 0; i < 4; i++) { v += a * wmNoise(p); p = r * p * 2.03 + 17.1; a *= .5; }
  return v / .9375;
}
vec3 wmRamp(float l, vec3 a, vec3 b, vec3 c) { return l < .5 ? mix(a, b, l * 2.) : mix(b, c, (l - .5) * 2.); }

vec3 worldMaterial(float id, vec3 guide, vec3 world, vec3 normal, vec3 view, vec3 sun, float sunVis,
    float slope, float cliff, float courseDist, float startDist, float camDist, float time) {
  float luma = dot(guide, vec3(.2126, .7152, .0722));
  float l = clamp((luma - .03) / .52, 0., 1.);
  vec2 xz = world.xz;
  float detail = 1. - smoothstep(250., 1400., camDist);
  vec3 halfV = normalize(sun + view);
  float fres = pow(1. - max(dot(normal, view), 0.), 4.);
  if (id < 1.5) {
    // FROSTLINE: wind-packed snow, polished ice sheets, glacial cliffs.
    vec3 c = wmRamp(l, vec3(.2, .3, .58), vec3(.56, .67, .88), vec3(1.02, 1.03, 1.08));
    float sheet = wmFbm(xz * .0055 + 4.1);
    float flatness = 1. - smoothstep(.07, .2, slope);
    float ice = smoothstep(.5, .58, sheet) * flatness * (1. - cliff) * smoothstep(8., 20., courseDist);
    float crack = pow(1. - abs(wmNoise(xz * .08) * 2. - 1.), 18.) * detail;
    vec3 iceColor = vec3(.04, .14, .28) * mix(.6, 1., sunVis) + vec3(.4, .62, .9) * fres * 1.5
      + vec3(.25, .85, 1.2) * crack * .7
      + vec3(1., .92, .82) * pow(max(dot(normal, halfV), 0.), 160.) * 5. * sunVis;
    c = mix(c, iceColor, ice);
    vec3 glacier = wmRamp(l, vec3(.03, .12, .3), vec3(.18, .46, .74), vec3(.72, .92, 1.08));
    glacier += vec3(.04, .32, .5) * (1. - smoothstep(0., .45, l)) * .7;
    glacier += vec3(.3, .7, 1.) * pow(1. - abs(wmNoise(vec2(xz.x * .04 + world.y * .1, xz.y * .04)) * 2. - 1.), 30.) * .8 * detail;
    c = mix(c, glacier, cliff);
    float glitter = step(.992, wmHash(floor(xz * 1.3) + floor(time * 6.))) * step(.5, l) * detail * (1. - ice);
    c += vec3(1.4, 1.5, 1.8) * glitter;
    return c;
  }
  if (id < 2.5) {
    // EMBER RIFT: black basalt, ash crowns, rivers of lava with crusted plates.
    vec3 c = wmRamp(l, vec3(.012, .008, .014), vec3(.06, .045, .055), vec3(.23, .18, .17));
    float ash = smoothstep(.72, .85, l) * (1. - cliff) * wmFbm(xz * .03);
    c = mix(c, vec3(.34, .32, .33), ash * .45);
    float n = wmFbm(xz * .0034 + vec2(3.7, 1.9));
    float river = 1. - smoothstep(.018, .062, abs(n - .5));
    float pools = smoothstep(.325, .265, n);
    // Lava hugs the track from just past the road shoulder, framing the racing line.
    // The grid and pit apron stay solid ground; lava starts past the launch.
    float safe = smoothstep(24., 38., courseDist) * smoothstep(170., 260., startDist);
    float lavaMask = max(river, pools) * safe * (1. - cliff) * (1. - smoothstep(.3, .55, slope));
    vec2 flowUv = xz * .016;
    float f1 = wmFbm(flowUv + vec2(time * .045, time * .03));
    float f2 = wmFbm(flowUv * 2.4 - vec2(time * .06, -time * .035) + f1 * 1.6);
    // Most of the surface is cooling crust; molten lanes and the thinnest seams burn white.
    float crust = smoothstep(.41, .55, f2);
    vec3 molten = mix(vec3(2.4, .34, .03), vec3(7.2, 2.5, .36), smoothstep(.3, .06, f2));
    vec3 crustColor = vec3(.03, .013, .013) + vec3(1.5, .22, .02) * smoothstep(.53, .43, f2);
    vec3 lava = mix(molten, crustColor, crust) * (.88 + .12 * sin(time * 1.4 + f1 * 11.));
    float nearLava = (1. - smoothstep(.02, .2, abs(n - .5))) * smoothstep(18., 30., courseDist) * smoothstep(150., 240., startDist);
    c += vec3(1.1, .25, .03) * nearLava * .45 * (1. - lavaMask) * (1. - l * .5);
    float seam = pow(1. - abs(wmNoise(vec2(xz.x * .045 + world.y * .11, xz.y * .045)) * 2. - 1.), 26.);
    c += vec3(4., .7, .06) * seam * cliff * .55 * detail;
    return mix(c, lava, lavaMask);
  }
  // VERDANT RUN: moss and loam, mossy stone, rain puddles, bioluminescence.
  vec3 c = wmRamp(l, vec3(.015, .045, .035), vec3(.07, .15, .055), vec3(.3, .44, .14));
  float soil = smoothstep(.55, .72, wmFbm(xz * .018));
  c = mix(c, wmRamp(l, vec3(.025, .018, .012), vec3(.11, .075, .045), vec3(.33, .24, .14)), soil * .65);
  vec3 stone = wmRamp(l, vec3(.02, .035, .032), vec3(.1, .15, .1), vec3(.36, .42, .28));
  float moss = smoothstep(.35, .85, normal.y) * wmFbm(xz * .05 + world.y * .02);
  c = mix(c, mix(stone, stone * vec3(.65, 1.15, .55), moss), cliff);
  float flatness = 1. - smoothstep(.05, .14, slope);
  float puddle = smoothstep(.62, .67, wmFbm(xz * .03 + 11.)) * flatness * (1. - cliff) * smoothstep(9., 18., courseDist);
  vec3 wet = c * .3 + vec3(.5, .66, .56) * fres * .9
    + vec3(1., .95, .8) * pow(max(dot(normal, halfV), 0.), 220.) * 6. * sunVis;
  c = mix(c, wet, puddle);
  vec2 cell = floor(xz * .5);
  float r = wmHash(cell);
  float spot = step(.982, r) * (1. - smoothstep(.05, .4, l)) * (1. - smoothstep(.12, .4, length(fract(xz * .5) - .5))) * detail;
  c += vec3(.15, 1.3, 1.05) * spot * (.6 + .4 * sin(time * 2. + r * 30.));
  return c;
}
`;
