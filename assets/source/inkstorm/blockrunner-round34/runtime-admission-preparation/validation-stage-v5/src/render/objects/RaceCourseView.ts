import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  DynamicDrawUsage,
  GLSL3,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import { TERRAIN_GLSL } from '../terrain/terrainShaderChunks';
import { sampleTerrainHeight } from '../terrain/terrainMath';
import { createCourseGulfUniforms, type CourseGulfUniforms } from '../terrain/CourseGulfTextures';
import { groundPylonConflictsWithBridge } from '../../game/race/bridgeSurface';
import { InkstormSurfaceMaterial } from '../inkstorm/InkstormSurfaceMaterial';

export interface CourseRenderPoint {
  x: number;
  y: number;
  z: number;
  width: number;
  tag?: string;
}

export interface CourseRenderBranch {
  id: string;
  kind: string;
  elevated?: boolean;
  points: readonly CourseRenderPoint[];
}

export interface CourseRenderData {
  points: readonly CourseRenderPoint[];
  checkpointIndices: readonly number[];
  branches?: readonly CourseRenderBranch[];
}

/** Route paint is a guide; solid branch furniture belongs beyond every lane. */
function outsideCourseLanes(x: number, z: number, course: CourseRenderData): boolean {
  const paths = [course.points, ...(course.branches ?? []).map((branch) => branch.points)];
  for (let pathIndex = 0; pathIndex < paths.length; pathIndex += 1) {
    const path = paths[pathIndex]!;
    const segments = pathIndex === 0 ? path.length : path.length - 1;
    for (let index = 0; index < segments; index += 1) {
      const a = path[index]!, b = path[(index + 1) % path.length]!;
      const dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz)
        / Math.max(0.001, dx * dx + dz * dz)));
      // Includes the pedestal and an extra 3 m shoulder, even at convergence.
      const safeWidth = Math.max(a.width, b.width) + 3.6;
      if (Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < safeWidth) return false;
    }
  }
  return true;
}

function createBranchBeaconGeometry(): BufferGeometry {
  const pieces: BufferGeometry[] = [];
  const add = (geometry: BufferGeometry, color: string): void => {
    const tint = new Color(color);
    const colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let index = 0; index < colors.length; index += 3) tint.toArray(colors, index);
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    pieces.push(geometry);
  };
  add(new CylinderGeometry(0.34, 0.52, 0.4, 6).translate(0, 0.2, 0), '#465363');
  add(new CylinderGeometry(0.16, 0.25, 3.25, 6).translate(0, 1.99, 0), '#242536');
  add(new BoxGeometry(0.54, 0.94, 0.38).translate(0, 3.0, 0), '#344956');
  add(new BoxGeometry(0.36, 0.7, 0.42).translate(0, 3.0, 0), '#ffd45a');
  add(new BoxGeometry(0.66, 0.14, 0.56).translate(0, 3.54, 0), '#3f6170');
  const geometry = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!geometry) throw new Error('Unable to build branch beacon.');
  return geometry;
}

/** Two batches retain the same checkpoint span with painted supports and small signal strips. */
function createCheckpointGeometry(crossbar: boolean): BufferGeometry {
  const pieces: BufferGeometry[] = [];
  const add = (geometry: BufferGeometry, color: string): void => {
    const tint = new Color(color), colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let index = 0; index < colors.length; index += 3) tint.toArray(colors, index);
    geometry.setAttribute('color', new BufferAttribute(colors, 3)); pieces.push(geometry);
  };
  if (crossbar) {
    // X is normalized to the actual lane span; the other dimensions are metres.
    add(new BoxGeometry(1, .36, .42), '#32424b');
    add(new BoxGeometry(1, .09, .46).translate(0, .18, 0), '#c5ae82');
    for (const side of [-1, 1]) {
      add(new BoxGeometry(.11, .34, .47).translate(side * .42, 0, 0), '#a55936');
      add(new BoxGeometry(.08, .12, .49).translate(side * .42, 0, 0), '#edae55');
    }
    // A compact central timing transponder replaces the saturated green wall.
    add(new BoxGeometry(.045, .72, .7).translate(0, -.12, 0), '#28313d');
    add(new BoxGeometry(.026, .16, .74).translate(0, -.08, 0), '#73c8c6');
  } else {
    add(new CylinderGeometry(.86, 1.08, .75, 6).translate(0, .375, 0), '#7b6558');
    add(new BoxGeometry(.78, 13.4, .78).translate(0, 7.05, 0), '#303945');
    add(new BoxGeometry(.94, 3.5, .96).translate(0, 2.7, 0), '#426477');
    for (const y of [1.1, 4.6, 9.2, 12.6]) add(new BoxGeometry(.96, .18, .98).translate(0, y, 0), '#8e654c');
    add(new BoxGeometry(1.22, 1.55, 1.18).translate(0, 12.9, 0), '#354956');
    add(new BoxGeometry(.76, .82, 1.22).translate(0, 12.9, 0), '#eab158');
    add(new BoxGeometry(1.4, .22, 1.36).translate(0, 13.79, 0), '#354956');
    add(new BoxGeometry(.58, .35, .62).translate(0, 14.05, 0), '#73c8c6');
  }
  const geometry = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!geometry) throw new Error('Unable to build checkpoint furniture.');
  return geometry;
}

const ribbonVertex = /* glsl */ `
  ${TERRAIN_GLSL}

  in float aDistance;
  in vec3 aCenter;
  out vec2 vUv;
  out float vDistance;
  out float vViewDistance;
  void main() {
    vUv = uv;
    vDistance = aDistance;
    vec4 centerWorld = modelMatrix * vec4(aCenter, 1.0);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vViewDistance = distance(centerWorld.xyz, cameraPosition);
    // Maintain the angular width established at ~430 m. The widened position
    // is sampled against the exact same procedural field as the terrain; this
    // prevents the outer guide from sinking into a different dune face as its
    // projected width is normalized.
    float distanceWidth = clamp(vViewDistance / 430.0, 1.0, 8.0);
    worldPosition.xz = centerWorld.xz
      + (worldPosition.xz - centerWorld.xz) * distanceWidth;
    vec3 terrainFieldsAtRail;
    worldPosition.y = terrainFields(worldPosition.xz, terrainFieldsAtRail) + 0.09;
    // A sub-pixel far lift eliminates depth fighting while the close section
    // remains locked 9 cm above the sampled procedural surface.
    worldPosition.y += smoothstep(520.0, 2100.0, vViewDistance) * 0.78;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const ribbonFragment = /* glsl */ `
  precision highp float;
  in vec2 vUv;
  in float vDistance;
  in float vViewDistance;
  uniform float uTime;
  uniform vec3 uColor;
  out vec4 fragColor;
  void main() {
    float across = abs(vUv.x - 0.5) * 2.0;
    float corridor = 1.0 - step(0.97, across);

    // The route has one dominant graphic silhouette at every distance. fwidth
    // expands only the single mint core when projection would otherwise make
    // it thinner than a few screen pixels; it never resolves into parallel
    // edge rails. A deep-green shoulder preserves the cel-ink hierarchy.
    float pixelAcross = clamp(fwidth(across), 0.0015, 0.13);
    float farRailSupport = smoothstep(850.0, 2550.0, vViewDistance);
    float coreHalfWidth = max(
      0.15 + farRailSupport * 0.018,
      pixelAcross * mix(2.18, 2.42, farRailSupport)
    );
    float inkHalfWidth = coreHalfWidth + max(0.052, pixelAcross * 0.62);
    float haloHalfWidth = inkHalfWidth + max(0.078, pixelAcross * 0.72);
    float core = 1.0 - step(coreHalfWidth, across);
    float inkShoulder = 1.0 - step(inkHalfWidth, across);
    float halo = 1.0 - step(haloHalfWidth, across);

    // Raked surges animate inside the solid core. They alter colour, not
    // silhouette, so speed detail cannot split the guide into extra lines.
    float plateCycle = fract(vDistance * 0.052 - uTime * 0.24);
    float rakedPlate = step(
      0.1 + vUv.x * 0.09,
      plateCycle
    ) * (1.0 - step(
      0.72 + vUv.x * 0.09,
      plateCycle
    ));
    float arrowCycle = fract(
      vDistance * 0.094 - uTime * 0.74 - vUv.x * 0.18
    );
    float arrow = step(0.4, arrowCycle) * (1.0 - step(0.6, arrowCycle))
      * core * corridor * rakedPlate;
    float distanceSupport = smoothstep(280.0, 1450.0, vViewDistance);
    float horizonFade = smoothstep(2800.0, 3800.0, vViewDistance);
    float alpha = (
      halo * 0.07
      + inkShoulder * 0.48
      + core * mix(0.72, 0.8, farRailSupport)
    ) * mix(1.0, 1.08, distanceSupport) * mix(1.0, 0.9, horizonFade);
    // Retire the terrain mesh only after the identically styled screen-space
    // LOD is established. Their centre lines and terrain clearance coincide,
    // so the overlap strengthens one ribbon instead of drawing a second wire.
    // Oblique route segments become visually sub-pixel sooner than their raw
    // distance suggests. Begin the handoff after the accepted close envelope,
    // then retire the physical ribbon while its screen-space twin is strong.
    float obliqueDetailRetire = smoothstep(0.09, 0.125, pixelAcross)
      * smoothstep(170.0, 310.0, vViewDistance);
    float distanceDetailRetire = smoothstep(350.0, 535.0, vViewDistance);
    alpha *= 1.0 - max(obliqueDetailRetire, distanceDetailRetire);
    vec3 deepInk = vec3(0.025, 0.12, 0.09);
    vec3 deepGreen = vec3(0.04, 0.24, 0.15);
    vec3 color = mix(deepInk, deepGreen, inkShoulder);
    color = mix(color, uColor * 1.18, core);
    color = mix(color, vec3(0.72, 1.0, 0.72), arrow * 0.48);
    if (alpha < 0.022) discard;
    fragColor = vec4(color, clamp(alpha, 0.0, 0.9));
  }
`;

// A genuinely separate far LOD: terrain-sampled centre segments are expanded
// to a constant angular width in clip space. Each segment owns all of its
// endpoints, so geometry crossing behind the camera can be rejected as one
// unit—unlike the earlier closed ribbon experiment that produced giant strips.
// This path is a solid polyline, not a widened copy of the detailed rail art.
const farRibbonVertex = /* glsl */ `
  in vec3 aStart;
  in vec3 aEnd;
  in float aSide;
  in float aAlong;
  in float aGuideHalfWidth;
  uniform vec2 uViewportSize;
  uniform float uHalfWidthPx;
  out float vViewDistance;
  out float vAcross;
  out float vProjectedGuideWidthPx;
  out float vViewElevation;

  void main() {
    vec4 startWorld = modelMatrix * vec4(aStart, 1.0);
    vec4 endWorld = modelMatrix * vec4(aEnd, 1.0);
    vec4 startClip = projectionMatrix * viewMatrix * startWorld;
    vec4 endClip = projectionMatrix * viewMatrix * endWorld;
    vViewDistance = mix(
      distance(startWorld.xyz, cameraPosition),
      distance(endWorld.xyz, cameraPosition),
      aAlong
    );
    vec3 segmentWorld = mix(startWorld.xyz, endWorld.xyz, aAlong);
    // Ratio of vertical separation to sightline length: near zero is a low,
    // grazing desert view; large values identify steep/aerial canyon views.
    vViewElevation = abs(cameraPosition.y - segmentWorld.y)
      / max(vViewDistance, 1.0);
    vAcross = aSide;

    // Cull the complete segment when either endpoint crosses the camera. This
    // far-only route does not need a near-plane bridge and can never explode
    // into full-screen triangles as a result.
    if (startClip.w <= 0.1 || endClip.w <= 0.1) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    vec2 startNdc = startClip.xy / startClip.w;
    vec2 endNdc = endClip.xy / endClip.w;
    vec2 pixelDirection = (endNdc - startNdc) * uViewportSize;
    float directionLength = length(pixelDirection);
    pixelDirection = directionLength > 0.00001
      ? pixelDirection / directionLength
      : vec2(0.0, 1.0);
    vec2 perpendicular = vec2(-pixelDirection.y, pixelDirection.x);
    vec2 offsetNdc = perpendicular
      * (2.0 / max(uViewportSize, vec2(1.0)))
      * uHalfWidthPx
      * aSide;

    // Estimate how broad the detailed terrain ribbon would appear at this
    // segment. A grazing line can need its solid LOD hundreds of metres before
    // a face-on line at the same distance; this closes that visual seam without
    // globally moving the accepted close-distance boundary.
    vec3 routeTangent = endWorld.xyz - startWorld.xyz;
    routeTangent.y = 0.0;
    routeTangent = length(routeTangent) > 0.0001
      ? normalize(routeTangent)
      : vec3(0.0, 0.0, 1.0);
    vec3 routeRight = vec3(routeTangent.z, 0.0, -routeTangent.x);
    vec3 guideCenter = mix(startWorld.xyz, endWorld.xyz, aAlong);
    vec4 guideLeftClip = projectionMatrix * viewMatrix * vec4(
      guideCenter - routeRight * aGuideHalfWidth,
      1.0
    );
    vec4 guideRightClip = projectionMatrix * viewMatrix * vec4(
      guideCenter + routeRight * aGuideHalfWidth,
      1.0
    );
    vec2 guideLeftNdc = guideLeftClip.xy / max(0.1, guideLeftClip.w);
    vec2 guideRightNdc = guideRightClip.xy / max(0.1, guideRightClip.w);
    vProjectedGuideWidthPx = length(
      (guideRightNdc - guideLeftNdc) * uViewportSize * 0.5
    );

    // A slight endpoint overlap closes sub-pixel cracks at bends while the
    // course sampling density keeps this visually indistinguishable from a
    // joined spline at review distance.
    float extendedAlong = mix(-0.025, 1.025, aAlong);
    vec4 routeClip = mix(startClip, endClip, extendedAlong);
    routeClip.xy += offsetNdc * routeClip.w;
    // Pull the coplanar guide forward by a tiny depth-only bias. This avoids
    // z-fighting without floating the far LOD metres above the near ribbon.
    routeClip.z -= 0.000055 * routeClip.w;
    gl_Position = routeClip;
  }
`;

const farRibbonFragment = /* glsl */ `
  precision highp float;
  in float vViewDistance;
  in float vAcross;
  in float vProjectedGuideWidthPx;
  uniform vec3 uColor;
  out vec4 fragColor;

  void main() {
    float distanceFade = smoothstep(285.0, 455.0, vViewDistance);
    float obliqueFade = (1.0 - smoothstep(
      6.0,
      11.0,
      vProjectedGuideWidthPx
    )) * smoothstep(135.0, 245.0, vViewDistance);
    float nearFade = max(distanceFade, obliqueFade);
    float horizonFade = 1.0 - smoothstep(3450.0, 4150.0, vViewDistance);
    float lodFade = nearFade * horizonFade;

    float across = abs(vAcross);
    float shoulder = 1.0 - step(0.96, across);
    float core = 1.0 - step(0.66, across);
    float highlight = 1.0 - step(0.2, across);
    float alpha = mix(0.68, 0.92, core) * shoulder * lodFade;
    if (alpha < 0.018) discard;

    vec3 ink = vec3(0.025, 0.12, 0.09);
    vec3 color = mix(ink, uColor * 1.16, core);
    color = mix(color, vec3(0.72, 1.0, 0.72), highlight * 0.24);
    fragColor = vec4(color, clamp(alpha, 0.0, 0.92));
  }
`;

// A restrained second pass exists solely for the screen-space continuity
// problem that depth-tested terrain creates at grazing angles. It carries no
// close-course art and is deliberately much quieter than the physical far
// line: oblique/sub-pixel spans receive enough ink to remain legible while
// distant face-on spans get only a faint safety contour through occluders.
const farRibbonVisibilityFragment = /* glsl */ `
  precision highp float;
  in float vViewDistance;
  in float vAcross;
  in float vProjectedGuideWidthPx;
  in float vViewElevation;
  uniform vec3 uColor;
  out vec4 fragColor;

  void main() {
    float distanceSupport = smoothstep(135.0, 245.0, vViewDistance);
    float obliqueSupport = (1.0 - smoothstep(
      6.0,
      11.0,
      vProjectedGuideWidthPx
    )) * smoothstep(145.0, 245.0, vViewDistance);
    // Depth bypass is valid only when a low/grazing sightline makes successive
    // dune crests erase a sub-pixel navigation contour. A steep camera must
    // continue to read canyon walls as solid occluders, never as transparent
    // scenery with a route loop drawn across them.
    float grazingView = 1.0 - smoothstep(0.14, 0.27, vViewElevation);
    float visibilitySupport = max(distanceSupport, obliqueSupport) * grazingView;
    float horizonFade = 1.0 - smoothstep(3450.0, 4150.0, vViewDistance);

    float across = abs(vAcross);
    float core = 1.0 - step(0.63, across);
    float alpha = mix(0.17, 0.42, core)
      * visibilitySupport
      * horizonFade;
    if (alpha < 0.018) discard;

    vec3 ink = vec3(0.035, 0.16, 0.115);
    vec3 color = mix(ink, uColor * 1.12, core);
    fragColor = vec4(color, clamp(alpha, 0.0, 0.44));
  }
`;

const pylonVertex = /* glsl */ `
  uniform float uFarWidthGain;
  uniform float uBaseOffset;
  uniform float uFarHeightGain;
  varying float vDistanceToCamera;

  void main() {
    vec4 centerWorld = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec3 markerBase = centerWorld.xyz - vec3(0.0, uBaseOffset, 0.0);
    vDistanceToCamera = distance(markerBase, cameraPosition);
    float angularWidth = clamp(vDistanceToCamera / 450.0, 1.0, 8.0);
    float normalizedWidth = max(1.0, angularWidth * uFarWidthGain);
    float farWidth = mix(
      1.0,
      normalizedWidth,
      smoothstep(280.0, 500.0, vDistanceToCamera)
    );
    vec3 shapedPosition = position;
    shapedPosition.xz *= farWidth;
    // Nearby posts stay modest; medium-distance posts recover the full cue
    // height before the far impostor takes over. Body and cap grow from the
    // same terrain anchor and use exactly the same distance, avoiding a gap.
    float heightScale = 1.0
      + smoothstep(90.0, 270.0, vDistanceToCamera) * uFarHeightGain;
    shapedPosition.y = (shapedPosition.y + uBaseOffset) * heightScale - uBaseOffset;
    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(shapedPosition, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const pylonFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uDetailFadeStart;
  uniform float uDetailFadeEnd;
  varying float vDistanceToCamera;

  void main() {
    float detailAlpha = 1.0 - smoothstep(
      uDetailFadeStart,
      uDetailFadeEnd,
      vDistanceToCamera
    );
    if (detailAlpha < 0.018) discard;
    gl_FragColor = vec4(uColor, detailAlpha);
    #include <colorspace_fragment>
  }
`;

// One camera-facing quad replaces each detailed pylon beyond the close race
// envelope. The silhouette and illuminated cap live in the same hard-masked
// draw, so the marker cannot separate into unrelated black/cyan pixel specks.
const farPylonVertex = /* glsl */ `
  uniform vec2 uViewportSize;
  uniform vec2 uMarkerSizePx;
  varying vec2 vMarkerUv;
  varying float vDistanceToCamera;

  void main() {
    vec4 centerWorld = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vDistanceToCamera = distance(centerWorld.xyz, cameraPosition);
    vec4 markerClip = projectionMatrix * viewMatrix * centerWorld;
    vec2 markerOffsetNdc = vec2(
      position.x * uMarkerSizePx.x,
      (position.y + 0.5) * uMarkerSizePx.y
    ) * (2.0 / max(uViewportSize, vec2(1.0)));
    markerClip.xy += markerOffsetNdc * markerClip.w;
    vMarkerUv = uv;
    gl_Position = markerClip;
  }
`;

const farPylonFragment = /* glsl */ `
  precision highp float;
  varying vec2 vMarkerUv;
  varying float vDistanceToCamera;
  uniform vec3 uInkColor;
  uniform vec3 uLightColor;

  void main() {
    float nearFade = smoothstep(360.0, 620.0, vDistanceToCamera);
    float farFade = 1.0 - smoothstep(3500.0, 4200.0, vDistanceToCamera);
    float x = abs(vMarkerUv.x - 0.5);
    float stemHalfWidth = mix(0.24, 0.16, vMarkerUv.y);
    float stem = 1.0 - step(stemHalfWidth, x);
    float cap = step(0.69, vMarkerUv.y) * (1.0 - step(0.27, x));
    float silhouette = max(stem, cap);
    float alpha = silhouette * nearFade * farFade;
    if (alpha < 0.018) discard;
    vec3 color = mix(uInkColor, uLightColor, cap);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const matrix = new Matrix4();
const position = new Vector3();
const scale = new Vector3();
const rotation = new Quaternion();
const forward = new Vector3();
const right = new Vector3();
const up = new Vector3(0, 1, 0);

const canyonTint = new Color();
const canyonTints = ['#fff4e5', '#f4dbd5', '#ffe0bc', '#edc3bf'] as const;

const canyonVertex = /* glsl */ `
  attribute vec3 color;
  varying vec3 vRockColor;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying float vRockVariation;

  void main() {
    float variation = fract(abs(
      instanceMatrix[3][0] * 0.0137
      + instanceMatrix[3][2] * 0.0191
    ));
    float secondary = fract(variation * 7.173 + 0.317);
    vec3 shapedPosition = position;
    float localHeight = clamp(shapedPosition.y, 0.0, 1.0);
    float upperMass = smoothstep(0.48, 0.94, localHeight);
    float crown = smoothstep(0.76, 0.98, localHeight);

    // Three module profiles share one instanced draw: a wind-cut slab, an
    // undercut crown, and a leaning fault tower. Their different shoulders
    // break the repeated trapezoid cadence while overlap preserves the wall.
    float profile = floor(variation * 3.0);
    if (profile < 1.0) {
      shapedPosition.x *= 1.0 - upperMass * (0.12 + secondary * 0.13);
      shapedPosition.y += crown * (shapedPosition.z * 0.12 + variation * 0.035);
    } else if (profile < 2.0) {
      shapedPosition.x *= 1.0 - upperMass * 0.31 + crown * 0.44;
      shapedPosition.x += upperMass * (variation - 0.5) * 0.16;
      shapedPosition.y *= 0.9 + secondary * 0.17;
    } else {
      shapedPosition.x *= 0.9 + upperMass * 0.18;
      shapedPosition.x += localHeight * (variation - 0.5) * 0.22;
      shapedPosition.y += crown * sin(shapedPosition.z * 8.0 + variation * 17.0) * 0.075;
    }
    shapedPosition.z += sin(
      shapedPosition.y * 8.0 + variation * 19.0
    ) * (0.018 + upperMass * 0.022);

    vec4 instancePosition = instanceMatrix * vec4(shapedPosition, 1.0);
    vec4 worldPosition = modelMatrix * instancePosition;
    // Remove non-uniform instance scale before rotating the procedural facet
    // normal. This keeps the lighting bands stable across tall and thin rocks.
    mat3 instanceRotation = mat3(
      normalize(instanceMatrix[0].xyz),
      normalize(instanceMatrix[1].xyz),
      normalize(instanceMatrix[2].xyz)
    );
    vWorldNormal = normalize(mat3(modelMatrix) * instanceRotation * normal);
    vRockColor = color * instanceColor;
    vWorldPosition = worldPosition.xyz;
    vRockVariation = variation;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const canyonFragment = /* glsl */ `
  precision highp float;
  varying vec3 vRockColor;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying float vRockVariation;
  uniform vec3 uSunDirection;
  uniform vec3 uHazeColor;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float diffuse = dot(normal, normalize(uSunDirection)) * 0.86 + 0.14;
    float lightBand = diffuse < 0.1 ? 0.35
      : diffuse < 0.39 ? 0.58
      : diffuse < 0.7 ? 0.82
      : 1.08;
    vec3 color = vRockColor * lightBand;
    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 1.45);
    color += vec3(1.0, 0.48, 0.24) * step(0.63, rim) * 0.12;
    float distanceToCamera = length(vWorldPosition - cameraPosition);
    float hazeBand = floor(clamp((distanceToCamera - 560.0) / 500.0, 0.0, 4.0)) / 4.0;
    color = mix(color, uHazeColor, hazeBand * 0.86);
    // Stable facet-rim ink replaces the screen-space outline on this large
    // instanced corridor. Its threshold widens with distance instead of
    // collapsing to disconnected one-pixel stipple.
    float farAmount = clamp((distanceToCamera - 420.0) / 1350.0, 0.0, 1.0);
    float edgeMetric = 1.0 - abs(dot(normal, viewDirection));
    float edgeThreshold = mix(0.84, 0.69, farAmount);
    float edgeFeather = max(0.012, fwidth(edgeMetric) * mix(0.62, 1.45, farAmount));
    float silhouette = smoothstep(
      edgeThreshold - edgeFeather,
      edgeThreshold + edgeFeather,
      edgeMetric
    );
    vec3 canyonInk = mix(vec3(0.075, 0.035, 0.07), vec3(0.19, 0.075, 0.08), vRockVariation * 0.24);
    color = mix(color, canyonInk, silhouette * mix(0.52, 0.58, farAmount));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

function deterministicVariation(index: number, salt: number): number {
  const wave = Math.sin(index * 12.9898 + salt * 78.233) * 43_758.5453;
  return wave - Math.floor(wave);
}

/**
 * One low-poly module supplies the entire canyon draw. The long wall body is
 * deliberately eroded instead of rectangular, while the merged toe and ledges
 * make hard horizontal sediment bands without separate meshes or materials.
 */
function buildCanyonModuleGeometry(): BufferGeometry {
  const wall = new CylinderGeometry(0.4, 0.5, 1, 9, 5, false).toNonIndexed();
  const wallPositions = wall.getAttribute('position');
  for (let index = 0; index < wallPositions.count; index += 1) {
    const sourceX = wallPositions.getX(index);
    const normalizedY = wallPositions.getY(index) + 0.5;
    const sourceZ = wallPositions.getZ(index);
    const along = sourceZ + 0.5;
    const ridge = 0.79
      + Math.sin(along * 5.72 + 0.45) * 0.105
      + Math.sin(along * 13.6 + 1.7) * 0.047
      + Math.sin(along * 23.1 + 0.2) * 0.022;
    const taper = 1 - normalizedY * 0.2;
    const faceErosion = Math.sign(sourceX)
      * Math.sin(along * 9.3 + normalizedY * 7.1) * (0.018 + normalizedY * 0.018);
    const windLean = Math.sin(along * 7.7 + 2.1) * normalizedY * 0.035;
    wallPositions.setXYZ(
      index,
      sourceX * taper + faceErosion,
      normalizedY * ridge,
      sourceZ + windLean,
    );
  }

  // Two irregular protrusions are enough to imply sandstone strata. A former
  // four-shelf version made each module read as an identical wedding cake.
  const toe = new CylinderGeometry(0.56, 0.575, 0.065, 9, 1, false).toNonIndexed();
  toe.translate(0, 0.0325, 0);
  const faultShelf = new CylinderGeometry(0.48, 0.505, 0.032, 8, 1, false).toNonIndexed();
  faultShelf.translate(0.032, 0.53, -0.018);

  const merged = mergeGeometries([wall, toe, faultShelf], false);
  wall.dispose();
  toe.dispose();
  faultShelf.dispose();
  if (!merged) throw new Error('Could not build canyon cliff module geometry.');

  merged.computeVertexNormals();
  const positions = merged.getAttribute('position');
  const normals = merged.getAttribute('normal');
  const colors = new Float32Array(positions.count * 3);
  const facetColor = new Color();
  for (let triangle = 0; triangle < positions.count; triangle += 3) {
    const height = (
      positions.getY(triangle)
      + positions.getY(triangle + 1)
      + positions.getY(triangle + 2)
    ) / 3;
    const upward = (
      normals.getY(triangle)
      + normals.getY(triangle + 1)
      + normals.getY(triangle + 2)
    ) / 3;
    const diagonalFacet = Math.floor(triangle / 3) % 5;
    const tint = upward > 0.42
      ? '#ffe0a8'
      : height < 0.11
        ? '#9c6571'
        : height < 0.3
          ? (diagonalFacet === 0 ? '#d39a87' : '#bc7d7a')
          : height < 0.58
            ? (diagonalFacet === 1 ? '#f2b482' : '#d78b72')
            : height < 0.77
              ? (diagonalFacet === 2 ? '#b96d72' : '#e29a76')
              : '#efb177';
    facetColor.set(tint);
    for (let corner = 0; corner < 3; corner += 1) {
      facetColor.toArray(colors, (triangle + corner) * 3);
    }
  }
  merged.setAttribute('color', new BufferAttribute(colors, 3));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  merged.name = 'overlapping-faceted-canyon-module';
  return merged;
}

function pointVector(point: CourseRenderPoint, target: Vector3): Vector3 {
  return target.set(point.x, point.y, point.z);
}

export class RaceCourseView extends Group {
  /** Shared CSS-pixel viewport used by the route and pylon graphic LODs. */
  private heightAt = sampleTerrainHeight;
  private readonly viewportSize = new Vector2(1440, 900);
  private ribbon: Mesh<BufferGeometry, ShaderMaterial> | null = null;
  private farRibbon: Mesh<BufferGeometry, ShaderMaterial> | null = null;
  private farRibbonVisibilityOverlay: Mesh<BufferGeometry, ShaderMaterial> | null = null;
  private branchRibbon: Mesh<BufferGeometry, ShaderMaterial> | null = null;
  private branchFarRibbon: Mesh<BufferGeometry, ShaderMaterial> | null = null;
  private branchBeacons: InstancedMesh | null = null;
  private pylonBodies: InstancedMesh | null = null;
  private pylonLights: InstancedMesh | null = null;
  private farPylonMarkers: InstancedMesh | null = null;
  private gatePosts: InstancedMesh | null = null;
  private gateBars: InstancedMesh | null = null;
  private canyonWalls: InstancedMesh | null = null;
  private authoredWorldEnabled = false;
  private readonly ribbonMaterial = new ShaderMaterial({
    name: 'GraphicRacingLine',
    glslVersion: GLSL3,
    vertexShader: ribbonVertex,
    fragmentShader: ribbonFragment,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    uniforms: {
      ...createCourseGulfUniforms(),
      uTime: { value: 0 },
      uColor: { value: new Color('#55f39a') },
    },
  });
  private readonly farRibbonMaterial = new ShaderMaterial({
    name: 'Solid far racing-line LOD',
    glslVersion: GLSL3,
    vertexShader: farRibbonVertex,
    fragmentShader: farRibbonFragment,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    toneMapped: false,
    uniforms: {
      uColor: { value: new Color('#55f39a') },
      uViewportSize: { value: this.viewportSize },
      // A 4.8 CSS-pixel inked ribbon survives Retina downsampling without
      // competing with the much broader near-camera world-space guide.
      uHalfWidthPx: { value: 2.4 },
    },
  });
  private readonly farRibbonVisibilityMaterial = new ShaderMaterial({
    name: 'Sub-pixel route visibility overlay',
    glslVersion: GLSL3,
    vertexShader: farRibbonVertex,
    fragmentShader: farRibbonVisibilityFragment,
    transparent: true,
    depthWrite: false,
    // Long grazing spans can be hidden by a dune even after the geometry has
    // entered its solid-line LOD. This quiet ink pass is the explicit HUD-like
    // visibility policy for those far/sub-pixel spans; nearby course geometry
    // and the bright primary line still obey world depth.
    depthTest: false,
    side: DoubleSide,
    toneMapped: false,
    uniforms: {
      uColor: { value: new Color('#55f39a') },
      uViewportSize: { value: this.viewportSize },
      uHalfWidthPx: { value: 2.4 },
    },
  });
  private readonly branchRibbonMaterial = new ShaderMaterial({
    name: 'Graphic alternate-route line',
    glslVersion: GLSL3,
    vertexShader: ribbonVertex,
    fragmentShader: ribbonFragment,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    uniforms: {
      ...createCourseGulfUniforms(),
      uTime: { value: 0 },
      uColor: { value: new Color('#ffd45a') },
    },
  });
  private readonly branchFarRibbonMaterial = new ShaderMaterial({
    name: 'Solid alternate-route far LOD',
    glslVersion: GLSL3,
    vertexShader: farRibbonVertex,
    fragmentShader: farRibbonFragment,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    toneMapped: false,
    uniforms: {
      uColor: { value: new Color('#ffd45a') },
      uViewportSize: { value: this.viewportSize },
      uHalfWidthPx: { value: 2.25 },
    },
  });

  constructor() {
    super();
    this.name = 'RaceCourse';
  }

  setTerrainSampler(heightAt: (x: number, z: number) => number, uniforms: CourseGulfUniforms): void {
    this.heightAt = heightAt;
    Object.assign(this.ribbonMaterial.uniforms, uniforms);
    Object.assign(this.branchRibbonMaterial.uniforms, uniforms);
  }

  setCourse(course: CourseRenderData): void {
    this.clearCourse();
    if (course.points.length < 3) return;
    this.ribbon = new Mesh(this.buildRibbon(course.points), this.ribbonMaterial);
    this.ribbon.name = 'conforming-racing-line';
    this.ribbon.renderOrder = 4;
    this.ribbon.frustumCulled = true;
    this.farRibbon = new Mesh(
      this.buildFarRouteGeometry(course.points),
      this.farRibbonMaterial,
    );
    this.farRibbon.name = 'solid-far-racing-line-lod';
    this.farRibbon.renderOrder = 3;
    // The procedural position attribute is intentionally a dummy; real bounds
    // live in aStart/aEnd, so CPU frustum culling cannot represent them.
    this.farRibbon.frustumCulled = false;
    this.farRibbonVisibilityOverlay = new Mesh(
      this.buildFarRouteGeometry(course.points),
      this.farRibbonVisibilityMaterial,
    );
    this.farRibbonVisibilityOverlay.name = 'far-route-visibility-overlay';
    this.farRibbonVisibilityOverlay.renderOrder = 3.5;
    this.farRibbonVisibilityOverlay.frustumCulled = false;
    this.add(this.farRibbon, this.farRibbonVisibilityOverlay, this.ribbon);
    this.buildBranches(course);
    this.buildPylons(course.points, course.branches ?? []);
    this.buildGates(course);
    this.buildCanyon(course.points);
    this.setInkstormWorldEnabled(this.authoredWorldEnabled);
  }

  setInkstormWorldEnabled(enabled: boolean): void {
    this.authoredWorldEnabled = enabled;
    for(const object of [this.canyonWalls,this.ribbon,this.farRibbon,this.farRibbonVisibilityOverlay,this.branchRibbon,this.branchFarRibbon]) {
      if(object)object.visible=!enabled;
    }
  }

  update(time: number): void {
    this.ribbonMaterial.uniforms.uTime!.value = time;
    this.branchRibbonMaterial.uniforms.uTime!.value = time;
    if (typeof window !== 'undefined') {
      this.viewportSize.set(
        Math.max(1, window.innerWidth),
        Math.max(1, window.innerHeight),
      );
    }
  }

  dispose(): void {
    this.clearCourse();
    this.ribbonMaterial.dispose();
    this.farRibbonMaterial.dispose();
    this.farRibbonVisibilityMaterial.dispose();
    this.branchRibbonMaterial.dispose();
    this.branchFarRibbonMaterial.dispose();
  }

  private buildRibbon(
    points: readonly CourseRenderPoint[],
    closed = true,
  ): BufferGeometry {
    const count = points.length;
    const positions = new Float32Array(count * 2 * 3);
    const uvs = new Float32Array(count * 2 * 2);
    const distances = new Float32Array(count * 2);
    const centers = new Float32Array(count * 2 * 3);
    const indices: number[] = [];
    let distance = 0;
    const current = new Vector3();
    const next = new Vector3();
    const previous = new Vector3();

    for (let index = 0; index < count; index += 1) {
      const point = points[index];
      const nextPoint = closed
        ? points[(index + 1) % count]
        : points[Math.min(count - 1, index + 1)];
      const previousPoint = closed
        ? points[(index - 1 + count) % count]
        : points[Math.max(0, index - 1)];
      if (!point || !nextPoint || !previousPoint) continue;
      pointVector(point, current);
      pointVector(nextPoint, next);
      pointVector(previousPoint, previous);
      forward.copy(next).sub(previous).setY(0).normalize();
      right.set(forward.z, 0, -forward.x);
      if (index > 0) distance += current.distanceTo(previous);

      const ribbonWidth = Math.max(1.2, point.width * 0.082);
      const centerHeight = this.heightAt(point.x, point.z) + 0.09;
      for (let side = 0; side < 2; side += 1) {
        const vertex = index * 2 + side;
        const sideSign = side === 0 ? -1 : 1;
        const lateralX = point.x + right.x * ribbonWidth * sideSign;
        const lateralZ = point.z + right.z * ribbonWidth * sideSign;
        positions[vertex * 3] = lateralX;
        positions[vertex * 3 + 1] = this.heightAt(lateralX, lateralZ) + 0.09;
        positions[vertex * 3 + 2] = lateralZ;
        uvs[vertex * 2] = side;
        uvs[vertex * 2 + 1] = distance * 0.02;
        distances[vertex] = distance;
        centers[vertex * 3] = point.x;
        centers[vertex * 3 + 1] = centerHeight;
        centers[vertex * 3 + 2] = point.z;
      }

      if (closed || index + 1 < count) {
        const nextIndex = (index + 1) % count;
        indices.push(index * 2, index * 2 + 1, nextIndex * 2 + 1);
        indices.push(index * 2, nextIndex * 2 + 1, nextIndex * 2);
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setAttribute('aDistance', new BufferAttribute(distances, 1));
    geometry.setAttribute('aCenter', new BufferAttribute(centers, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  /**
   * Non-indexed quads provide a robust constant-width far line. Route samples
   * remain tied to the procedural terrain at both ends; a depth-only shader
   * bias prevents z-fighting while retaining dune occlusion.
   */
  private buildFarRouteGeometry(
    points: readonly CourseRenderPoint[],
    closed = true,
  ): BufferGeometry {
    const verticesPerSegment = 6;
    const segmentCount = closed ? points.length : Math.max(0, points.length - 1);
    const vertexCount = segmentCount * verticesPerSegment;
    const positions = new Float32Array(vertexCount * 3);
    const starts = new Float32Array(vertexCount * 3);
    const ends = new Float32Array(vertexCount * 3);
    const sides = new Float32Array(vertexCount);
    const alongs = new Float32Array(vertexCount);
    const guideHalfWidths = new Float32Array(vertexCount);
    const cornerSides = [-1, 1, 1, -1, 1, -1] as const;
    const cornerAlongs = [0, 0, 1, 0, 1, 1] as const;

    for (let index = 0; index < segmentCount; index += 1) {
      const start = points[index];
      const end = closed ? points[(index + 1) % points.length] : points[index + 1];
      if (!start || !end) continue;
      // Match the physical guide closely so the near/far crossfade cannot
      // project as parallel lines in aerial views. The vertex shader supplies
      // a tiny depth-only bias for coplanar stability.
      const startY = this.heightAt(start.x, start.z) + 0.16;
      const endY = this.heightAt(end.x, end.z) + 0.16;
      const guideHalfWidth = (
        Math.max(1.2, start.width * 0.082)
        + Math.max(1.2, end.width * 0.082)
      ) * 0.5;
      for (let corner = 0; corner < verticesPerSegment; corner += 1) {
        const vertex = index * verticesPerSegment + corner;
        const attribute = vertex * 3;
        starts[attribute] = start.x;
        starts[attribute + 1] = startY;
        starts[attribute + 2] = start.z;
        ends[attribute] = end.x;
        ends[attribute + 1] = endY;
        ends[attribute + 2] = end.z;
        sides[vertex] = cornerSides[corner] ?? 0;
        alongs[vertex] = cornerAlongs[corner] ?? 0;
        guideHalfWidths[vertex] = guideHalfWidth;
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aStart', new BufferAttribute(starts, 3));
    geometry.setAttribute('aEnd', new BufferAttribute(ends, 3));
    geometry.setAttribute('aSide', new BufferAttribute(sides, 1));
    geometry.setAttribute('aAlong', new BufferAttribute(alongs, 1));
    geometry.setAttribute('aGuideHalfWidth', new BufferAttribute(guideHalfWidths, 1));
    return geometry;
  }

  /**
   * All alternate paths share two merged route draws plus one instanced beacon
   * draw, regardless of whether a seed produced two or three decisions.
   */
  private buildBranches(course: CourseRenderData): void {
    const branches = course.branches ?? [];
    const visible = branches.filter((branch) => branch.points.length >= 2).slice(0, 3);
    if (visible.length === 0) return;
    const nearSources = visible.map((branch) => this.buildRibbon(branch.points, false));
    const farSources = visible.map((branch) => this.buildFarRouteGeometry(branch.points, false));
    const nearGeometry = mergeGeometries(nearSources, false);
    const farGeometry = mergeGeometries(farSources, false);
    for (const geometry of nearSources) geometry.dispose();
    for (const geometry of farSources) geometry.dispose();
    if (!nearGeometry || !farGeometry) {
      nearGeometry?.dispose();
      farGeometry?.dispose();
      return;
    }

    this.branchRibbon = new Mesh(nearGeometry, this.branchRibbonMaterial);
    this.branchRibbon.name = 'merged-conforming-alternate-routes';
    this.branchRibbon.renderOrder = 4.1;
    this.branchFarRibbon = new Mesh(farGeometry, this.branchFarRibbonMaterial);
    this.branchFarRibbon.name = 'merged-alternate-route-far-lod';
    this.branchFarRibbon.renderOrder = 3.1;
    this.branchFarRibbon.frustumCulled = false;

    const beaconMaterial = new MeshBasicMaterial({
      color: '#ffffff',
      vertexColors: true,
      depthWrite: true,
      toneMapped: false,
    });
    this.branchBeacons = new InstancedMesh(
      createBranchBeaconGeometry(),
      beaconMaterial,
      visible.length * 2,
    );
    this.branchBeacons.name = 'alternate-route-entry-exit-beacons';
    this.branchBeacons.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = false;
    let instance = 0;
    for (const branch of visible) {
      for (const atEnd of [false, true]) {
        const endpoint = atEnd ? branch.points.at(-1) : branch.points[0];
        const neighbor = atEnd ? branch.points.at(-2) : branch.points[1];
        if (!endpoint || !neighbor) continue;
        forward.set(neighbor.x - endpoint.x, 0, neighbor.z - endpoint.z).normalize();
        right.set(forward.z, 0, -forward.x);
        let placed = false;
        const entranceHeight = this.heightAt(endpoint.x, endpoint.z);
        for (const extra of [4, 10, 18, 30, 46, 64]) {
          for (const side of [-1, 1]) {
            for (const along of [0, 12, -12, 24, 40]) {
              const x = endpoint.x + right.x * (endpoint.width + extra) * side + forward.x * along;
              const z = endpoint.z + right.z * (endpoint.width + extra) * side + forward.z * along;
              if (!outsideCourseLanes(x, z, course)) continue;
              const y = this.heightAt(x, z);
              // A route sign on the gulf floor would be safe but useless.
              if (Math.abs(y - entranceHeight) > 12) continue;
              const slope = Math.max(Math.abs(this.heightAt(x + 0.6, z) - y),
                Math.abs(this.heightAt(x, z + 0.6) - y));
              if (slope > 0.72) continue;
              position.set(x, y, z);
              placed = true;
              break;
            }
            if (placed) break;
          }
          if (placed) break;
        }
        // Do not introduce an uncollidable obstacle if a junction has no safe shoulder.
        if (!placed) continue;
        rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(forward.x, forward.z));
        scale.set(1, 1, 1);
        matrix.compose(position, rotation, scale);
        this.branchBeacons.setMatrixAt(instance, matrix);
        instance += 1;
      }
    }
    this.branchBeacons.count = instance;
    this.branchBeacons.computeBoundingSphere();
    this.add(this.branchFarRibbon, this.branchRibbon, this.branchBeacons);
  }

  private buildPylons(points: readonly CourseRenderPoint[], branches: readonly CourseRenderBranch[]): void {
    const stride = Math.max(6, Math.floor(points.length / 88));
    const count = Math.ceil(points.length / stride) * 2;
    const bodyMaterial = new ShaderMaterial({
      name: 'Distance-normalized pylon ink',
      vertexShader: pylonVertex,
      fragmentShader: pylonFragment,
      uniforms: {
        uColor: { value: new Color('#251627') },
        uFarWidthGain: { value: 0.93 },
        uBaseOffset: { value: 2.2 },
        uFarHeightGain: { value: 1.0 },
        uDetailFadeStart: { value: 420 },
        uDetailFadeEnd: { value: 670 },
      },
      // Alpha remains one. Transparent ordering intentionally keeps the global
      // hull installer off this shader-driven, distance-normalized silhouette.
      transparent: true,
      depthWrite: true,
      toneMapped: false,
    });
    const lightMaterial = new ShaderMaterial({
      name: 'Distance-normalized pylon light',
      vertexShader: pylonVertex,
      fragmentShader: pylonFragment,
      uniforms: {
        uColor: { value: new Color('#ffd391') },
        uFarWidthGain: { value: 1.18 },
        uBaseOffset: { value: 4.2 },
        uFarHeightGain: { value: 1.0 },
        uDetailFadeStart: { value: 420 },
        uDetailFadeEnd: { value: 670 },
      },
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.pylonBodies = new InstancedMesh(new ConeGeometry(.62, 4.8, 5), bodyMaterial, count);
    this.pylonLights = new InstancedMesh(new CylinderGeometry(.24, .24, 1.4, 5), lightMaterial, count);
    const farMarkerMaterial = new ShaderMaterial({
      name: 'Coherent far pylon impostors',
      vertexShader: farPylonVertex,
      fragmentShader: farPylonFragment,
      uniforms: {
        uInkColor: { value: new Color('#251627') },
        uLightColor: { value: new Color('#ffd391') },
        uViewportSize: { value: this.viewportSize },
        // One coherent 4.6 x 14 CSS-pixel sign replaces the separate body/cap
        // geometry before either component can collapse to a one-pixel mark.
        uMarkerSizePx: { value: new Vector2(4.6, 14) },
      },
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: DoubleSide,
    });
    this.farPylonMarkers = new InstancedMesh(
      new PlaneGeometry(1, 1),
      farMarkerMaterial,
      count,
    );
    this.farPylonMarkers.name = 'coherent-far-pylon-marker-lod';
    // Course furniture already owns an inverted hull. Excluding its tiny,
    // faceted silhouettes from Sobel prevents a second line system from
    // turning nearby five-sided pylons into wire-like scribbles.
    this.pylonBodies.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    this.pylonLights.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    this.farPylonMarkers.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    this.pylonBodies.instanceMatrix.setUsage(DynamicDrawUsage);
    this.pylonLights.instanceMatrix.setUsage(DynamicDrawUsage);
    this.farPylonMarkers.instanceMatrix.setUsage(DynamicDrawUsage);
    // The unit-plane CPU bound does not include shader-expanded marker height.
    // One low-cost draw is safer than incorrectly culling an entire route arc.
    this.farPylonMarkers.frustumCulled = false;
    this.farPylonMarkers.renderOrder = 5;

    let instance = 0;
    for (let index = 0; index < points.length; index += stride) {
      const point = points[index];
      const next = points[(index + 1) % points.length];
      if (!point || !next) continue;
      forward.set(next.x - point.x, 0, next.z - point.z).normalize();
      right.set(forward.z, 0, -forward.x);
      for (const side of [-1, 1]) {
        const pylonX = point.x + right.x * point.width * side;
        const pylonZ = point.z + right.z * point.width * side;
        if(groundPylonConflictsWithBridge(branches,pylonX,pylonZ,this.heightAt(pylonX,pylonZ)))continue;
        position.set(
          pylonX,
          this.heightAt(pylonX, pylonZ) + 2.2,
          pylonZ,
        );
        scale.set(1, 1, 1);
        rotation.identity();
        matrix.compose(position, rotation, scale);
        this.pylonBodies.setMatrixAt(instance, matrix);
        position.y += 2.0;
        matrix.compose(position, rotation, scale);
        this.pylonLights.setMatrixAt(instance, matrix);
        position.y = this.heightAt(pylonX, pylonZ) + 0.16;
        matrix.compose(position, rotation, scale);
        this.farPylonMarkers.setMatrixAt(instance, matrix);
        instance += 1;
      }
    }
    this.pylonBodies.count = instance;
    this.pylonLights.count = instance;
    this.farPylonMarkers.count = instance;
    this.pylonBodies.computeBoundingSphere();
    this.pylonLights.computeBoundingSphere();
    this.add(this.pylonBodies, this.pylonLights, this.farPylonMarkers);
  }

  private buildGates(course: CourseRenderData): void {
    const gateCount = course.checkpointIndices.length;
    this.gatePosts = new InstancedMesh(createCheckpointGeometry(false), new InkstormSurfaceMaterial(false), gateCount * 2);
    this.gateBars = new InstancedMesh(createCheckpointGeometry(true), new InkstormSurfaceMaterial(false), gateCount);
    this.gatePosts.name = 'painted-checkpoint-supports';
    this.gateBars.name = 'checkpoint-timing-crossbeams';

    let postInstance = 0;
    for (let gate = 0; gate < gateCount; gate += 1) {
      const index = course.checkpointIndices[gate];
      if (index === undefined) continue;
      const point = course.points[index % course.points.length];
      const next = course.points[(index + 1) % course.points.length];
      if (!point || !next) continue;
      forward.set(next.x - point.x, 0, next.z - point.z).normalize();
      right.set(forward.z, 0, -forward.x);
      // The course width is already a half-width. A small safety margin clears
      // all four pods without turning a checkpoint crossbar into an 80 m wall.
      const gateWidth = point.width * 1.18;
      const yaw = Math.atan2(forward.x, forward.z);
      rotation.setFromAxisAngle(up, yaw);
      for (const side of [-1, 1]) {
        position.set(point.x + right.x * gateWidth * side, point.y - .1, point.z + right.z * gateWidth * side);
        scale.set(1, 1, 1);
        matrix.compose(position, rotation, scale);
        this.gatePosts.setMatrixAt(postInstance, matrix);
        postInstance += 1;
      }
      position.set(point.x, point.y + 13.8, point.z);
      scale.set(gateWidth * 2, 1, 1);
      matrix.compose(position, rotation, scale);
      this.gateBars.setMatrixAt(gate, matrix);
    }
    this.gatePosts.count = postInstance;
    this.gatePosts.computeBoundingSphere();
    this.gateBars.computeBoundingSphere();
    this.add(this.gatePosts, this.gateBars);
  }

  /**
   * The narrow-canyon tag is an authored set piece rather than a coincidence
   * of desert landmarks. Densely overlapping modules form two continuous,
   * enclosing cliff faces while keeping a generous inner racing clearance.
   * Faceted geometry, hard baked strata and distance-adaptive shader ink all
   * remain a single instanced draw call.
   */
  private buildCanyon(points: readonly CourseRenderPoint[]): void {
    const stride = 7;
    const canyonIndices: number[] = [];
    let lastAdded = -stride;
    let lastCanyonIndex = -1;
    for (let index = 0; index < points.length; index += 1) {
      if (points[index]?.tag !== 'narrow-canyon') continue;
      lastCanyonIndex = index;
      if (index - lastAdded >= stride) {
        canyonIndices.push(index);
        lastAdded = index;
      }
    }
    // End the corridor at the authored section boundary rather than leaving a
    // final visible gap when its sample count is not divisible by the stride.
    if (lastCanyonIndex >= 0 && canyonIndices.at(-1) !== lastCanyonIndex) {
      canyonIndices.push(lastCanyonIndex);
    }
    if (canyonIndices.length === 0) return;

    const geometry = buildCanyonModuleGeometry();
    const material = new ShaderMaterial({
      name: 'Cel canyon strata',
      vertexShader: canyonVertex,
      fragmentShader: canyonFragment,
      uniforms: {
        uSunDirection: { value: new Vector3(-0.34, 0.82, 0.45).normalize() },
        uHazeColor: { value: new Color('#dc7147') },
      },
      transparent: true,
      depthWrite: true,
      toneMapped: false,
    });
    this.canyonWalls = new InstancedMesh(geometry, material, canyonIndices.length * 2);
    this.canyonWalls.name = 'Continuous authored narrow canyon walls';
    this.canyonWalls.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    this.canyonWalls.instanceMatrix.setUsage(DynamicDrawUsage);
    let instance = 0;
    for (let sampleIndex = 0; sampleIndex < canyonIndices.length; sampleIndex += 1) {
      const index = canyonIndices[sampleIndex];
      if (index === undefined) continue;
      const point = points[index];
      const previousIndex = canyonIndices[Math.max(0, sampleIndex - 1)] ?? index;
      const nextIndex = canyonIndices[Math.min(canyonIndices.length - 1, sampleIndex + 1)] ?? index;
      const previous = points[previousIndex];
      const next = points[nextIndex];
      if (!point || !previous || !next) continue;
      forward.set(next.x - previous.x, 0, next.z - previous.z).normalize();
      right.set(forward.z, 0, -forward.x);
      const span = sampleIndex < canyonIndices.length - 1
        ? Math.hypot(next.x - point.x, next.z - point.z)
        : Math.hypot(point.x - previous.x, point.z - previous.z);
      for (const side of [-1, 1]) {
        const variation = deterministicVariation(index, side < 0 ? 11 : 29);
        const secondary = deterministicVariation(index, side < 0 ? 47 : 71);
        // Heights move in broad three-module masses, not a picket-fence rhythm.
        const macroIndex = Math.floor(sampleIndex / 3);
        const macro = deterministicVariation(macroIndex, side < 0 ? 113 : 151);
        const tower = deterministicVariation(macroIndex, side < 0 ? 181 : 197) > 0.72 ? 10 : 0;
        const localWave = Math.sin((sampleIndex % 3) * 0.82 + side * 0.7) * 2.8;
        const height = 28 + macro * 31 + tower + localWave + variation * 7.5;
        const thickness = 17 + macro * 8 + secondary * 5;
        // Large overlapping slabs remain continuous around the curved entry.
        const length = Math.max(76, Math.min(126, span * (1.82 + variation * 0.22)));
        const clearInnerEdge = point.width + 7.8 + macro * 1.6;
        const offset = clearInnerEdge + thickness * 0.5;
        const profileLean = variation < 0.33
          ? -0.085
          : variation < 0.66
            ? 0.035
            : 0.11;
        const yaw = Math.atan2(forward.x, forward.z)
          + (variation - 0.5) * 0.13
          + profileLean * (secondary - 0.5);
        rotation.setFromAxisAngle(up, yaw);
        position.set(
          point.x + right.x * (offset + (macro - 0.5) * 3.2) * side
            + forward.x * (secondary - 0.5) * 4.5,
          point.y - 3.5,
          point.z + right.z * (offset + (macro - 0.5) * 3.2) * side
            + forward.z * (secondary - 0.5) * 4.5,
        );
        scale.set(thickness, height, length);
        matrix.compose(position, rotation, scale);
        this.canyonWalls.setMatrixAt(instance, matrix);
        canyonTint.set(canyonTints[Math.min(canyonTints.length - 1, Math.floor(variation * canyonTints.length))]!);
        this.canyonWalls.setColorAt(instance, canyonTint);
        instance += 1;
      }
    }
    this.canyonWalls.count = instance;
    if (this.canyonWalls.instanceColor) this.canyonWalls.instanceColor.needsUpdate = true;
    this.canyonWalls.computeBoundingSphere();
    this.add(this.canyonWalls);
  }

  private clearCourse(): void {
    const objects = [
      this.ribbon,
      this.farRibbon,
      this.farRibbonVisibilityOverlay,
      this.branchRibbon,
      this.branchFarRibbon,
      this.branchBeacons,
      this.pylonBodies,
      this.pylonLights,
      this.farPylonMarkers,
      this.gatePosts,
      this.gateBars,
      this.canyonWalls,
    ];
    for (const object of objects) {
      if (!object) continue;
      this.remove(object);
      if (object instanceof InstancedMesh) object.dispose();
      object.geometry.dispose();
      if (
        object.material !== this.ribbonMaterial
        && object.material !== this.farRibbonMaterial
        && object.material !== this.farRibbonVisibilityMaterial
        && object.material !== this.branchRibbonMaterial
        && object.material !== this.branchFarRibbonMaterial
      ) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      }
    }
    this.ribbon = null;
    this.farRibbon = null;
    this.farRibbonVisibilityOverlay = null;
    this.branchRibbon = null;
    this.branchFarRibbon = null;
    this.branchBeacons = null;
    this.pylonBodies = null;
    this.pylonLights = null;
    this.farPylonMarkers = null;
    this.gatePosts = null;
    this.gateBars = null;
    this.canyonWalls = null;
  }
}
