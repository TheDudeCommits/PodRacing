/**
 * Authored launch landscape in metres from the actual launch tangent.
 * Positive right is camera-screen right. The same spines describe physical
 * terrain masses and the scanned faces planted along their inner escarpments.
 * Summit heights are absolute metres; the final field also bounds total rise.
 */
export interface LaunchRidgeStation {
  readonly forward: number;
  readonly right: number;
  readonly width: number;
  readonly height: number;
  readonly crown: number;
}
export interface LaunchRidge {
  readonly id: string;
  readonly side: -1 | 1;
  readonly stations: readonly LaunchRidgeStation[];
}
/** Same bounded world-space domain for physical authoring and static shadow sampling. */
export const LAUNCH_LANDSCAPE_BOUNDS = Object.freeze({
  minForward: -230, maxForward: 1740, minRight: -840, maxRight: 760,
});

export const LAUNCH_RIDGES: readonly LaunchRidge[] = [
  { id: 'near-west-rim', side: -1, stations: [
    { forward: -50, right: -265, width: 145, height: 185, crown: 12 },
    { forward: 90, right: -300, width: 160, height: 172, crown: 10 },
    { forward: 210, right: -410, width: 170, height: 138, crown: 8 },
    { forward: 290, right: -530, width: 180, height: 95, crown: 7 },
    { forward: 365, right: -625, width: 175, height: 46, crown: 5 },
  ] },
  { id: 'west-basin-shelves', side: -1, stations: [
    { forward: 850, right: -420, width: 245, height: 152, crown: 9 },
    { forward: 1020, right: -480, width: 265, height: 205, crown: 8 },
    { forward: 1190, right: -480, width: 285, height: 246, crown: 12 },
    { forward: 1360, right: -490, width: 280, height: 218, crown: 8 },
    { forward: 1510, right: -470, width: 255, height: 186, crown: 9 },
  ] },
  { id: 'industrial-east-ridge', side: 1, stations: [
    { forward: 500, right: 430, width: 225, height: 78, crown: 7 },
    { forward: 650, right: 455, width: 245, height: 142, crown: 9 },
    { forward: 840, right: 445, width: 275, height: 214, crown: 8 },
    { forward: 1010, right: 440, width: 290, height: 238, crown: 10 },
    { forward: 1170, right: 405, width: 265, height: 208, crown: 9 },
    { forward: 1330, right: 335, width: 240, height: 156, crown: 7 },
  ] },
];

export interface LaunchIndustrialBench {
  readonly id: string;
  readonly forward: number;
  readonly right: number;
  readonly halfForward: number;
  readonly halfRight: number;
  readonly height: number;
}
/** Shared reference for the closer, compact industrial district. */
export const LAUNCH_INDUSTRIAL_CENTER = Object.freeze({ forward: 825, right: 360, radius: 300 });
/** Three actual ridge benches; Vista must consume this shared siting contract. */
export const LAUNCH_INDUSTRIAL_BENCHES: readonly LaunchIndustrialBench[] = [
  { id: 'lower-service-yard', forward: 650, right: 385, halfForward: 55, halfRight: 71, height: 75 },
  { id: 'middle-process-yard', forward: 815, right: 325, halfForward: 71, halfRight: 67, height: 110 },
  { id: 'upper-refinery-yard', forward: 1000, right: 405, halfForward: 68, halfRight: 83, height: 145 },
];

function smoother(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

interface LaunchRavine {
  /** Where the ravine crosses its parent ridge, in launch-local metres. */
  readonly forward: number;
  readonly halfWidth: number;
  readonly depth: number;
  readonly shear: number;
}

/**
 * Broad water-cut saddles divide each range into unequal cliff crowns. These
 * are 78–124m wide, so the far clipmap can retain the cuts instead of reducing
 * them to sparkling vertex noise. Their skew makes the exposed faces differ
 * from the rear silhouette; they are not concentric contour terraces.
 */
const RIDGE_RAVINES: Readonly<Record<string, readonly LaunchRavine[]>> = {
  'near-west-rim': [
    { forward: 170, halfWidth: 50, depth: 64, shear: -.32 },
    { forward: 306, halfWidth: 42, depth: 35, shear: .26 },
  ],
  'west-basin-shelves': [
    { forward: 952, halfWidth: 48, depth: 63, shear: .38 },
    { forward: 1094, halfWidth: 62, depth: 96, shear: -.29 },
    { forward: 1315, halfWidth: 57, depth: 83, shear: .31 },
    { forward: 1457, halfWidth: 39, depth: 53, shear: -.24 },
  ],
  'industrial-east-ridge': [
    { forward: 576, halfWidth: 42, depth: 32, shear: -.31 },
    { forward: 736, halfWidth: 44, depth: 59, shear: .28 },
    { forward: 1095, halfWidth: 50, depth: 60, shear: -.34 },
    { forward: 1264, halfWidth: 54, depth: 68, shear: .26 },
  ],
};

interface LaunchEscarpmentCut {
  readonly id: string;
  readonly height: number;
  readonly feather: number;
  readonly points: readonly (readonly [number, number])[];
  readonly floorShelves?: readonly LaunchEscarpmentCut[];
}

/**
 * Unequal, terminating cuts in the two leading escarpments. These polygons
 * remove a low shelf or an open slot from the cap; they do not add another
 * mountain or repeat a height-contour pattern. Coordinates are launch-local.
 * The final bench blend and CourseGulfField's road/bowl guards retain priority.
 */
const LAUNCH_ESCARPMENT_CUTS: Readonly<Record<string, readonly LaunchEscarpmentCut[]>> = {
  'west-basin-shelves': [
    { id: 'outer-low-shelf', height: 42, feather: 16,
      points: [[668, -625], [750, -510], [844, -545], [820, -660]] },
    { id: 'inner-middle-shelf', height: 58, feather: 16,
      points: [[690, -450], [820, -305], [955, -315], [856, -436]] },
    { id: 'outer-upper-shelf', height: 100, feather: 16,
      points: [[790, -607], [928, -555], [1035, -585], [948, -670]] },
    { id: 'outer-fracture-bay', height: -20, feather: 30,
      points: [[625, -530], [775, -500], [935, -522], [1040, -518],
        [1040, -623], [926, -633], [774, -592], [625, -627]],
      floorShelves: [{ id: 'broken-outer-toe', height: 35, feather: 16,
        points: [[824, -583], [885, -556], [906, -566], [895, -609], [835, -620]] }] },
    { id: 'inner-fracture-bay', height: -55, feather: 30,
      points: [[685, -280], [785, -266], [940, -278], [1042, -304],
        [1042, -414], [922, -407], [780, -382], [685, -404]],
      floorShelves: [
        { id: 'lower-inset-buttress', height: -5, feather: 16,
          points: [[813, -317], [871, -293], [919, -304], [892, -348], [832, -354]] },
        { id: 'back-bay-shelf', height: 38, feather: 18,
          points: [[956, -354], [1018, -336], [1030, -373], [988, -402], [952, -385]] },
      ] },
  ],
  'industrial-east-ridge': [
    { id: 'leading-service-shelf', height: 48, feather: 16,
      points: [[352, 328], [500, 314], [558, 367], [537, 472], [447, 501], [335, 465]] },
    { id: 'outer-middle-shelf', height: 88, feather: 16,
      points: [[418, 521], [594, 505], [712, 562], [718, 630], [549, 635], [427, 601]] },
    { id: 'outer-upper-shelf', height: 128, feather: 16,
      points: [[700, 490], [871, 493], [903, 560], [794, 611], [696, 574]] },
    { id: 'inner-fracture-bay', height: -65, feather: 30,
      points: [[342, 252], [505, 244], [579, 277], [579, 342], [491, 338], [342, 340]] },
    { id: 'outer-fracture-bay', height: -25, feather: 30,
      points: [[380, 516], [534, 496], [676, 526], [805, 531],
        [819, 602], [680, 602], [548, 571], [389, 596]],
      floorShelves: [{ id: 'industrial-rubble-bench', height: 31, feather: 16,
        points: [[621, 552], [674, 554], [714, 582], [688, 598], [624, 585]] }] },
  ],
};

/** A planar wall through its middle, with short C1 joins at each end. */
function escarpmentRamp(value: number): number {
  const t = Math.max(0, Math.min(1, value)), join = .15;
  if (t < join) return t * t / (2 * join * (1 - join));
  if (t > 1 - join) return 1 - (1 - t) * (1 - t) / (2 * join * (1 - join));
  return (t - join * .5) / (1 - join);
}

function escarpmentWindow(id: string, forward: number, right: number): number {
  const bounds = id === 'west-basin-shelves' ? [640, 1140, -710, -180]
    : id === 'industrial-east-ridge' ? [300, 1120, 180, 700] : null;
  if (!bounds) return 0;
  const edge = Math.min(forward - bounds[0]!, bounds[1]! - forward,
    right - bounds[2]!, bounds[3]! - right);
  return smoother(edge / 56);
}

function escarpmentCutWeight(cut: LaunchEscarpmentCut, forward: number, right: number): number {
  let inside = false, distanceSquared = Infinity;
  for (let i = 0, j = cut.points.length - 1; i < cut.points.length; j = i++) {
    const a = cut.points[j]!, b = cut.points[i]!;
    if ((a[1] > right) !== (b[1] > right)
      && forward < (b[0] - a[0]) * (right - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const df = b[0] - a[0], dr = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((forward - a[0]) * df + (right - a[1]) * dr) / (df * df + dr * dr)));
    const x = forward - a[0] - df * t, z = right - a[1] - dr * t;
    distanceSquared = Math.min(distanceSquared, x * x + z * z);
  }
  return inside ? 1 : 1 - escarpmentRamp(Math.sqrt(distanceSquared) / cut.feather);
}

function escarpmentHeight(id: string, forward: number, right: number, top: number, window: number): number {
  if (!window) return top;
  let result = top;
  for (const cut of LAUNCH_ESCARPMENT_CUTS[id] ?? []) {
    const weight = escarpmentCutWeight(cut, forward, right) * window;
    let floor = cut.height;
    for (const shelf of cut.floorShelves ?? []) {
      floor = Math.max(floor, cut.height + (shelf.height - cut.height) * escarpmentCutWeight(shelf, forward, right));
    }
    result = Math.min(result, top + (Math.min(top, floor) - top) * weight);
  }
  return result;
}

function ridgeRightAt(ridge: LaunchRidge, forward: number): number {
  for (let i = 1; i < ridge.stations.length; i++) {
    const a = ridge.stations[i - 1]!, b = ridge.stations[i]!;
    if (forward <= b.forward) {
      const t = Math.max(0, Math.min(1, (forward - a.forward) / (b.forward - a.forward)));
      return a.right + (b.right - a.right) * t;
    }
  }
  return ridge.stations[ridge.stations.length - 1]!.right;
}

/**
 * Absolute summit target and fractured cliff cross-section. A connected talus
 * base supports offset, ravine-separated caps rather than three radial steps.
 * Plan changes span 78–330m; finer surface detail belongs to the rock material.
 * The shared function is also a conservative influence mask for shadow baking.
 */
export function launchRidgeSurface(forward: number, right: number): { height: number; weight: number } {
  if (forward < LAUNCH_LANDSCAPE_BOUNDS.minForward || forward > LAUNCH_LANDSCAPE_BOUNDS.maxForward
    || right < LAUNCH_LANDSCAPE_BOUNDS.minRight || right > LAUNCH_LANDSCAPE_BOUNDS.maxRight) return { height: 0, weight: 0 };
  let height = 0, weight = 0, ridgeHeightSum = 0, ridgeWeightSum = 0;
  for (const [ridgeIndex, ridge] of LAUNCH_RIDGES.entries()) {
    const phase = ridgeIndex * 1.93 + .7;
    const escarpment = escarpmentWindow(ridge.id, forward, right);
    const acrossSpine = right - ridgeRightAt(ridge, forward);
    let incision = 0, split = 0;
    for (const ravine of RIDGE_RAVINES[ridge.id] ?? []) {
      const bend = 8 * Math.sin(acrossSpine * .015 + phase);
      const distance = Math.abs(forward - ravine.forward + acrossSpine * ravine.shear + bend);
      const cut = 1 - smoother(distance / ravine.halfWidth);
      incision = Math.max(incision, ravine.depth * cut);
      split = Math.max(split, cut);
    }
    // Low-frequency lateral displacement makes broad projecting buttresses.
    // The second scale breaks their spacing without adding grid-sized noise.
    const warpedRight = right + 24 * Math.sin(forward * .019 + phase)
      + 11 * Math.sin(forward * .041 - right * .006 + phase * .6);
    const warpedForward = forward + 14 * Math.sin(right * .014 + phase)
      + 7 * Math.sin(right * .028 - forward * .008);
    for (let i = 1; i < ridge.stations.length; i++) {
      const a = ridge.stations[i - 1]!, b = ridge.stations[i]!;
      const df = b.forward - a.forward, dr = b.right - a.right;
      const t = Math.max(0, Math.min(1, ((warpedForward - a.forward) * df + (warpedRight - a.right) * dr) / (df * df + dr * dr)));
      const f = a.forward + df * t, r = a.right + dr * t;
      const width = a.width + (b.width - a.width) * t;
      const distance = Math.hypot(warpedForward - f, warpedRight - r);
      const u = distance / width;
      const foot = 1 - smoother((u - .62) / .73);
      const buttress = .075 * Math.sin(forward * .021 + right * .006 + phase)
        + .045 * Math.sin(forward * .037 - right * .009 + phase * .4);
      // Ravines pinch the cap as well as cutting its crown. This exposes a
      // talus fan between projecting faces, instead of an unbroken flat belt.
      const capEdge = .43 + buttress - split * .10;
      const roundCap = 1 - smoother((u - capEdge) / .36);
      // The leading ends use broad chamfered planes instead of round capsule
      // noses. Inner segment flanks keep the same perpendicular distance.
      const length = Math.hypot(df, dr), ef = warpedForward - f, er = warpedRight - r;
      const alongEnd = Math.abs((ef * df + er * dr) / length);
      const acrossEnd = Math.abs((-ef * dr + er * df) / length);
      const cliffDistance = Math.max(alongEnd, acrossEnd, (alongEnd + acrossEnd) * Math.SQRT1_2);
      // A mostly planar 32m wall has no steeper maximum derivative than the
      // former 48m quintic wall; short eased joins avoid new height seams.
      const cliffCap = 1 - escarpmentRamp((cliffDistance - width * (capEdge + .18) + 16) / 32);
      const cap = roundCap + (cliffCap - roundCap) * escarpment;
      const blend = foot * .17 + cap * .83;
      if (blend <= 0) continue;
      const originalTop = a.height + (b.height - a.height) * smoother(t)
        + 7 * Math.sin(forward * .026 + phase) + 3 * Math.sin(right * .021 - forward * .012)
        - incision;
      const top = escarpmentHeight(ridge.id, forward, right, originalTop, escarpment);
      // Blend the overlapping segment targets continuously. Selecting the top
      // of the currently dominant segment jumps where two unequal tops tie.
      // A strong falloff keeps remote end caps from flattening a local summit.
      const influence = blend ** 8;
      ridgeHeightSum += top * influence; ridgeWeightSum += influence;
      weight = Math.max(weight, blend);
    }
  }
  if (ridgeWeightSum > 0) height = ridgeHeightSum / ridgeWeightSum;
  const benchBlends = LAUNCH_INDUSTRIAL_BENCHES.map(bench => {
    const df = Math.abs(forward - bench.forward) / (bench.halfForward + 12);
    const dr = Math.abs(right - bench.right) / (bench.halfRight + 12);
    return 1 - smoother((Math.max(df, dr) - 1) / .42);
  });
  let benchWeightSum = 0, benchHeightSum = 0, benchOutside = 1;
  for (const [index, bench] of LAUNCH_INDUSTRIAL_BENCHES.entries()) {
    const blend = benchBlends[index]!;
    benchOutside *= 1 - blend;
    // Disjoint flat cores stay exactly level, even where adjacent transition
    // aprons overlap. Each neighbor fades to zero as another core reaches one.
    let influence = blend;
    for (let other = 0; other < benchBlends.length; other++) {
      if (other !== index) influence *= 1 - benchBlends[other]!;
    }
    benchWeightSum += influence; benchHeightSum += bench.height * influence;
  }
  if (benchWeightSum > 0) {
    const benchWeight = 1 - benchOutside, remainingRidge = weight * (1 - benchWeight);
    const combinedWeight = remainingRidge + benchWeight;
    height = (height * remainingRidge + benchHeightSum / benchWeightSum * benchWeight) / combinedWeight;
    weight = combinedWeight;
  }
  // The shared local domain is also a physical boundary. Fade its last 72m
  // rather than clipping a partly raised mountain at the rectangular edge.
  const edge = Math.min(forward - LAUNCH_LANDSCAPE_BOUNDS.minForward,
    LAUNCH_LANDSCAPE_BOUNDS.maxForward - forward, right - LAUNCH_LANDSCAPE_BOUNDS.minRight,
    LAUNCH_LANDSCAPE_BOUNDS.maxRight - right);
  return { height, weight: weight * smoother(edge / 72) };
}
