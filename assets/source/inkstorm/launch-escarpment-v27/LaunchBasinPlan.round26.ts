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
      const cap = 1 - smoother((u - capEdge) / .36);
      const blend = foot * .17 + cap * .83;
      if (blend <= 0) continue;
      const top = a.height + (b.height - a.height) * smoother(t)
        + 7 * Math.sin(forward * .026 + phase) + 3 * Math.sin(right * .021 - forward * .012)
        - incision;
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
