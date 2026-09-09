// Original source-only round 29 candidate. Included only by the two existing
// industrial family materials; this is not a scene-wide light list.
#ifdef INKSTORM_WORKSHOP_FAMILY
varying vec3 vWorkshopScale;

float inkstormWorkshopReceiver(vec3 p, vec2 centerXZ, vec2 halfXZ, float roof) {
  // A soft guard on the authored room/apron envelope. This is NOT an occlusion
  // solution; the light still cannot see opaque equipment between receivers.
  vec2 edge = halfXZ - abs(p.xz - centerXZ);
  return smoothstep(0., .7, min(edge.x, edge.y))
    * smoothstep(-.05, .10, p.y)
    * (1. - smoothstep(roof - .15, roof, p.y));
}

float inkstormWorkshopLamp(vec3 center, float range, vec3 aim) {
  // Closest point on a 2.1 m strip. A scaled instance moves/scales the physical
  // fixture; distance remains measured in world metres rather than UV units.
  vec3 source = center + vec3(clamp(vLocal.x - center.x, -1.05, 1.05), 0., 0.);
  vec3 toLight = (source - vLocal) * vWorkshopScale;
  float d2 = max(dot(toLight, toLight), .04);
  vec3 l = toLight * inversesqrt(d2);
  // Inverse-scale normal is essential when district frontage is compressed.
  vec3 localNormal = normalize(vPaintNormal / max(vWorkshopScale, vec3(.001)));
  float diffuse = max(0., dot(localNormal, l));
  float cone = smoothstep(.08, .48, dot(-l, normalize(aim * vWorkshopScale)));
  float cutoff = max(0., 1. - d2 / (range * range));
  // Soft source core; finite support, no singular hotspot and no atmosphere
  // injection. All constants are artistic radiant strengths, not lumen units.
  return diffuse * cone * cutoff * cutoff / (1. + d2 / 64.);
}

float inkstormWorkshopLens(vec3 center) {
  // Only the explicitly authored warm inset, not nearby cream paint, is emissive.
  vec3 q = abs(vLocal - center);
  float warmPaint = 0.;
  #if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
    warmPaint = step(.44, vColor.r) * step(.22, vColor.g)
      * (1. - step(.28, vColor.b));
  #endif
  return step(q.x, 1.055) * step(q.z, .345) * step(q.y, .009)
    * step(.9, -normalize(vPaintNormal).y) * warmPaint;
}

vec2 inkstormWorkshopLight() {
  float task = 0.;
  vec3 center;
  vec2 receiverCenter;
  vec2 receiverHalf;
  float range;
  float roof;
  vec3 aim;
  #if INKSTORM_WORKSHOP_FAMILY == 1
    // Blender originals: hangar(x,y,w,d,h), existing hoist at (x,y-1,10).
    // GLB coordinates are (Blender X, Blender Z, -Blender Y).
    aim = vec3(0., -1., .18);
    roof = 9.45;
    // Receiver X envelopes do not overlap: evaluate only the owning bay.
    if (vLocal.x < -25.) {
      center = vec3(-50., 9.44, -3.); range = 22.;
      receiverCenter = vec2(-47., -.2); receiverHalf = vec2(18.8, 19.2);
    } else if (vLocal.x < 14.) {
      center = vec3(-8., 9.44, -3.); range = 20.;
      receiverCenter = vec2(-5., -.2); receiverHalf = vec2(15.98, 18.2);
    } else {
      center = vec3(36., 9.44, -6.); range = 23.;
      receiverCenter = vec2(39., -3.2); receiverHalf = vec2(21.62, 22.2);
    }
  #elif INKSTORM_WORKSHOP_FAMILY == 2
    // Each fixture is under the lower service rail, behind the cloth attachment.
    // Former front-beam positions were above the opaque awning and are rejected.
    aim = vec3(0., -1., -.24);
    if (vLocal.x < -21.) {
      center = vec3(-36., 8.08, -4.); range = 21.; roof = 8.09;
      receiverCenter = vec2(-39., -2.); receiverHalf = vec2(15.9, 10.4);
    } else if (vLocal.x < 18.) {
      center = vec3(1., 13.08, -8.); range = 25.; roof = 13.09;
      receiverCenter = vec2(-2., -4.5); receiverHalf = vec2(16.9, 11.9);
    } else {
      center = vec3(41., 9.88, -1.); range = 22.; roof = 9.89;
      receiverCenter = vec2(38., 1.); receiverHalf = vec2(15.9, 10.4);
    }
  #endif
  float receiver = inkstormWorkshopReceiver(vLocal, receiverCenter, receiverHalf, roof);
  if (receiver > 0.) task = receiver * inkstormWorkshopLamp(center, range, aim);
  return vec2(min(task * 1.10, .66), inkstormWorkshopLens(center));
}
#endif
