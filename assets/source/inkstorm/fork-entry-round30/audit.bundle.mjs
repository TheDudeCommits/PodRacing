import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { BufferAttribute, BufferGeometry, Color, InstancedBufferAttribute, Vector3 } from "three";
//#region src/game/race/LaunchBasinPlan.ts
/** Same bounded world-space domain for physical authoring and static shadow sampling. */
const LAUNCH_LANDSCAPE_BOUNDS = Object.freeze({
	minForward: -230,
	maxForward: 1740,
	minRight: -840,
	maxRight: 760
});
const LAUNCH_RIDGES = [
	{
		id: "near-west-rim",
		side: -1,
		stations: [
			{
				forward: -50,
				right: -265,
				width: 145,
				height: 185,
				crown: 12
			},
			{
				forward: 90,
				right: -300,
				width: 160,
				height: 172,
				crown: 10
			},
			{
				forward: 210,
				right: -410,
				width: 170,
				height: 138,
				crown: 8
			},
			{
				forward: 290,
				right: -530,
				width: 180,
				height: 95,
				crown: 7
			},
			{
				forward: 365,
				right: -625,
				width: 175,
				height: 46,
				crown: 5
			}
		]
	},
	{
		id: "west-basin-shelves",
		side: -1,
		stations: [
			{
				forward: 850,
				right: -420,
				width: 245,
				height: 152,
				crown: 9
			},
			{
				forward: 1020,
				right: -480,
				width: 265,
				height: 205,
				crown: 8
			},
			{
				forward: 1190,
				right: -480,
				width: 285,
				height: 246,
				crown: 12
			},
			{
				forward: 1360,
				right: -490,
				width: 280,
				height: 218,
				crown: 8
			},
			{
				forward: 1510,
				right: -470,
				width: 255,
				height: 186,
				crown: 9
			}
		]
	},
	{
		id: "industrial-east-ridge",
		side: 1,
		stations: [
			{
				forward: 500,
				right: 430,
				width: 225,
				height: 78,
				crown: 7
			},
			{
				forward: 650,
				right: 455,
				width: 245,
				height: 142,
				crown: 9
			},
			{
				forward: 840,
				right: 445,
				width: 275,
				height: 214,
				crown: 8
			},
			{
				forward: 1010,
				right: 440,
				width: 290,
				height: 238,
				crown: 10
			},
			{
				forward: 1170,
				right: 405,
				width: 265,
				height: 208,
				crown: 9
			},
			{
				forward: 1330,
				right: 335,
				width: 240,
				height: 156,
				crown: 7
			}
		]
	}
];
Object.freeze({
	forward: 825,
	right: 360,
	radius: 300
});
/** Three actual ridge benches; Vista must consume this shared siting contract. */
const LAUNCH_INDUSTRIAL_BENCHES = [
	{
		id: "lower-service-yard",
		forward: 650,
		right: 385,
		halfForward: 55,
		halfRight: 71,
		height: 75
	},
	{
		id: "middle-process-yard",
		forward: 815,
		right: 325,
		halfForward: 71,
		halfRight: 67,
		height: 110
	},
	{
		id: "upper-refinery-yard",
		forward: 1e3,
		right: 405,
		halfForward: 68,
		halfRight: 83,
		height: 145
	}
];
function smoother$3(value) {
	const t = Math.max(0, Math.min(1, value));
	return t * t * t * (t * (t * 6 - 15) + 10);
}
/**
* Broad water-cut saddles divide each range into unequal cliff crowns. These
* are 78–124m wide, so the far clipmap can retain the cuts instead of reducing
* them to sparkling vertex noise. Their skew makes the exposed faces differ
* from the rear silhouette; they are not concentric contour terraces.
*/
const RIDGE_RAVINES = {
	"near-west-rim": [{
		forward: 170,
		halfWidth: 50,
		depth: 64,
		shear: -.32
	}, {
		forward: 306,
		halfWidth: 42,
		depth: 35,
		shear: .26
	}],
	"west-basin-shelves": [
		{
			forward: 952,
			halfWidth: 48,
			depth: 63,
			shear: .38
		},
		{
			forward: 1094,
			halfWidth: 62,
			depth: 96,
			shear: -.29
		},
		{
			forward: 1315,
			halfWidth: 57,
			depth: 83,
			shear: .31
		},
		{
			forward: 1457,
			halfWidth: 39,
			depth: 53,
			shear: -.24
		}
	],
	"industrial-east-ridge": [
		{
			forward: 576,
			halfWidth: 42,
			depth: 32,
			shear: -.31
		},
		{
			forward: 736,
			halfWidth: 44,
			depth: 59,
			shear: .28
		},
		{
			forward: 1095,
			halfWidth: 50,
			depth: 60,
			shear: -.34
		},
		{
			forward: 1264,
			halfWidth: 54,
			depth: 68,
			shear: .26
		}
	]
};
/**
* Unequal, terminating cuts in the two leading escarpments. These polygons
* remove a low shelf or an open slot from the cap; they do not add another
* mountain or repeat a height-contour pattern. Coordinates are launch-local.
* The final bench blend and CourseGulfField's road/bowl guards retain priority.
*/
const LAUNCH_ESCARPMENT_CUTS = {
	"west-basin-shelves": [
		{
			id: "west-leading-talus-terrace",
			height: 20,
			feather: 42,
			floorPlane: [
				740,
				-465,
				.18,
				-.025
			],
			points: [
				[654, -625],
				[714, -649],
				[790, -614],
				[807, -491],
				[786, -390],
				[715, -342],
				[660, -397]
			],
			floorShelves: [{
				id: "west-middle-projecting-ledge",
				height: 68,
				feather: 30,
				points: [
					[730, -528],
					[778, -530],
					[799, -478],
					[767, -441],
					[723, -479]
				]
			}]
		},
		{
			id: "cross-range-amphitheatre",
			height: 64,
			feather: 32,
			floorPlane: [
				945,
				-465,
				.13,
				-.035
			],
			points: [
				[896, -670],
				[931, -638],
				[982, -679],
				[1003, -561],
				[975, -455],
				[1005, -321],
				[941, -256],
				[911, -348],
				[890, -502]
			],
			floorShelves: [{
				id: "amphitheatre-back-ledge",
				height: 100,
				feather: 25,
				points: [
					[963, -537],
					[1001, -508],
					[1005, -459],
					[980, -422],
					[954, -467]
				]
			}]
		},
		{
			id: "west-outer-stratified-shoulder",
			height: 86,
			feather: 34,
			floorPlane: [
				1050,
				-587,
				.22,
				-.025
			],
			points: [
				[982, -650],
				[1058, -672],
				[1121, -626],
				[1110, -572],
				[1036, -551],
				[995, -589]
			]
		},
		{
			id: "west-inner-talus-ledge",
			height: 100,
			feather: 24,
			floorPlane: [
				1035,
				-351,
				.04,
				-.12
			],
			points: [
				[998, -359],
				[1030, -312],
				[1060, -337],
				[1055, -384],
				[1040, -407],
				[1006, -402]
			]
		},
		{
			id: "outer-low-shelf",
			height: 42,
			feather: 16,
			points: [
				[668, -625],
				[750, -510],
				[844, -545],
				[820, -660]
			]
		},
		{
			id: "inner-middle-shelf",
			height: 58,
			feather: 16,
			points: [
				[690, -450],
				[820, -305],
				[955, -315],
				[856, -436]
			]
		},
		{
			id: "outer-upper-shelf",
			height: 100,
			feather: 16,
			points: [
				[790, -607],
				[928, -555],
				[1035, -585],
				[948, -670]
			]
		},
		{
			id: "outer-fracture-bay",
			height: -20,
			feather: 30,
			points: [
				[625, -530],
				[775, -500],
				[935, -522],
				[1040, -518],
				[1040, -623],
				[926, -633],
				[774, -592],
				[625, -627]
			],
			floorShelves: [{
				id: "broken-outer-toe",
				height: 35,
				feather: 16,
				points: [
					[824, -583],
					[885, -556],
					[906, -566],
					[895, -609],
					[835, -620]
				]
			}]
		},
		{
			id: "inner-fracture-bay",
			height: -55,
			feather: 30,
			points: [
				[685, -280],
				[785, -266],
				[940, -278],
				[1042, -304],
				[1042, -414],
				[922, -407],
				[780, -382],
				[685, -404]
			],
			floorShelves: [{
				id: "lower-inset-buttress",
				height: -5,
				feather: 16,
				points: [
					[813, -317],
					[871, -293],
					[919, -304],
					[892, -348],
					[832, -354]
				]
			}, {
				id: "back-bay-shelf",
				height: 38,
				feather: 18,
				points: [
					[956, -354],
					[1018, -336],
					[1030, -373],
					[988, -402],
					[952, -385]
				]
			}]
		}
	],
	"industrial-east-ridge": [
		{
			id: "inner-service-talus-bay",
			height: -32,
			feather: 42,
			floorPlane: [
				665,
				260,
				.11,
				.04
			],
			points: [
				[530, 225],
				[625, 232],
				[730, 220],
				[756, 265],
				[733, 300],
				[638, 281],
				[551, 279]
			]
		},
		{
			id: "process-outer-amphitheatre",
			height: 76,
			feather: 36,
			floorPlane: [
				898,
				548,
				.11,
				.04
			],
			points: [
				[810, 510],
				[857, 469],
				[927, 481],
				[955, 554],
				[924, 646],
				[848, 654],
				[817, 596]
			],
			floorShelves: [{
				id: "process-rear-talus",
				height: 112,
				feather: 24,
				points: [
					[920, 545],
					[951, 554],
					[946, 609],
					[920, 618],
					[900, 585]
				]
			}]
		},
		{
			id: "leading-service-shelf",
			height: 48,
			feather: 16,
			points: [
				[352, 328],
				[500, 314],
				[558, 367],
				[537, 472],
				[447, 501],
				[335, 465]
			]
		},
		{
			id: "outer-middle-shelf",
			height: 88,
			feather: 16,
			points: [
				[418, 521],
				[594, 505],
				[712, 562],
				[718, 630],
				[549, 635],
				[427, 601]
			]
		},
		{
			id: "outer-upper-shelf",
			height: 128,
			feather: 16,
			points: [
				[700, 490],
				[871, 493],
				[903, 560],
				[794, 611],
				[696, 574]
			]
		},
		{
			id: "inner-fracture-bay",
			height: -65,
			feather: 30,
			points: [
				[342, 252],
				[505, 244],
				[579, 277],
				[579, 342],
				[491, 338],
				[342, 340]
			]
		},
		{
			id: "outer-fracture-bay",
			height: -25,
			feather: 30,
			points: [
				[380, 516],
				[534, 496],
				[676, 526],
				[805, 531],
				[819, 602],
				[680, 602],
				[548, 571],
				[389, 596]
			],
			floorShelves: [{
				id: "industrial-rubble-bench",
				height: 31,
				feather: 16,
				points: [
					[621, 552],
					[674, 554],
					[714, 582],
					[688, 598],
					[624, 585]
				]
			}]
		}
	]
};
/** A planar wall through its middle, with short C1 joins at each end. */
function escarpmentRamp(value) {
	const t = Math.max(0, Math.min(1, value)), join = .15;
	if (t < join) return t * t / (2 * join * .85);
	if (t > .85) return 1 - (1 - t) * (1 - t) / (2 * join * .85);
	return (t - join * .5) / .85;
}
function escarpmentWindow(id, forward, right) {
	const bounds = id === "west-basin-shelves" ? [
		640,
		1140,
		-710,
		-180
	] : id === "industrial-east-ridge" ? [
		300,
		1120,
		180,
		700
	] : null;
	if (!bounds) return 0;
	return smoother$3(Math.min(forward - bounds[0], bounds[1] - forward, right - bounds[2], bounds[3] - right) / 56);
}
function escarpmentCutWeight(cut, forward, right) {
	let inside = false, distanceSquared = Infinity;
	for (let i = 0, j = cut.points.length - 1; i < cut.points.length; j = i++) {
		const a = cut.points[j], b = cut.points[i];
		if (a[1] > right !== b[1] > right && forward < (b[0] - a[0]) * (right - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
		const df = b[0] - a[0], dr = b[1] - a[1];
		const t = Math.max(0, Math.min(1, ((forward - a[0]) * df + (right - a[1]) * dr) / (df * df + dr * dr)));
		const x = forward - a[0] - df * t, z = right - a[1] - dr * t;
		distanceSquared = Math.min(distanceSquared, x * x + z * z);
	}
	return inside ? 1 : 1 - escarpmentRamp(Math.sqrt(distanceSquared) / cut.feather);
}
function escarpmentHeight(id, forward, right, top, window) {
	if (!window) return top;
	let result = top;
	for (const cut of LAUNCH_ESCARPMENT_CUTS[id] ?? []) {
		const weight = escarpmentCutWeight(cut, forward, right) * window;
		let floor = cut.height;
		if (cut.floorPlane) {
			const [f, r, gradeF, gradeR] = cut.floorPlane;
			floor += (forward - f) * gradeF + (right - r) * gradeR;
		}
		for (const shelf of cut.floorShelves ?? []) floor = Math.max(floor, cut.height + (shelf.height - cut.height) * escarpmentCutWeight(shelf, forward, right));
		result = Math.min(result, top + (Math.min(top, floor) - top) * weight);
	}
	return result;
}
function ridgeRightAt(ridge, forward) {
	for (let i = 1; i < ridge.stations.length; i++) {
		const a = ridge.stations[i - 1], b = ridge.stations[i];
		if (forward <= b.forward) {
			const t = Math.max(0, Math.min(1, (forward - a.forward) / (b.forward - a.forward)));
			return a.right + (b.right - a.right) * t;
		}
	}
	return ridge.stations[ridge.stations.length - 1].right;
}
/**
* Absolute summit target and fractured cliff cross-section. A connected talus
* base supports offset, ravine-separated caps rather than three radial steps.
* Plan changes span 78–330m; finer surface detail belongs to the rock material.
* The shared function is also a conservative influence mask for shadow baking.
*/
function launchRidgeSurface(forward, right) {
	if (forward < LAUNCH_LANDSCAPE_BOUNDS.minForward || forward > LAUNCH_LANDSCAPE_BOUNDS.maxForward || right < LAUNCH_LANDSCAPE_BOUNDS.minRight || right > LAUNCH_LANDSCAPE_BOUNDS.maxRight) return {
		height: 0,
		weight: 0
	};
	let height = 0, weight = 0, ridgeHeightSum = 0, ridgeWeightSum = 0;
	for (const [ridgeIndex, ridge] of LAUNCH_RIDGES.entries()) {
		const phase = ridgeIndex * 1.93 + .7;
		const escarpment = escarpmentWindow(ridge.id, forward, right);
		const acrossSpine = right - ridgeRightAt(ridge, forward);
		let incision = 0, split = 0;
		for (const ravine of RIDGE_RAVINES[ridge.id] ?? []) {
			const bend = 8 * Math.sin(acrossSpine * .015 + phase);
			const cut = 1 - smoother$3(Math.abs(forward - ravine.forward + acrossSpine * ravine.shear + bend) / ravine.halfWidth);
			incision = Math.max(incision, ravine.depth * cut);
			split = Math.max(split, cut);
		}
		const warpedRight = right + 24 * Math.sin(forward * .019 + phase) + 11 * Math.sin(forward * .041 - right * .006 + phase * .6);
		const warpedForward = forward + 14 * Math.sin(right * .014 + phase) + 7 * Math.sin(right * .028 - forward * .008);
		for (let i = 1; i < ridge.stations.length; i++) {
			const a = ridge.stations[i - 1], b = ridge.stations[i];
			const df = b.forward - a.forward, dr = b.right - a.right;
			const t = Math.max(0, Math.min(1, ((warpedForward - a.forward) * df + (warpedRight - a.right) * dr) / (df * df + dr * dr)));
			const f = a.forward + df * t, r = a.right + dr * t;
			const width = a.width + (b.width - a.width) * t;
			const u = Math.hypot(warpedForward - f, warpedRight - r) / width;
			const foot = 1 - smoother$3((u - .62) / .73);
			const capEdge = .43 + (.075 * Math.sin(forward * .021 + right * .006 + phase) + .045 * Math.sin(forward * .037 - right * .009 + phase * .4)) - split * .1;
			const roundCap = 1 - smoother$3((u - capEdge) / .36);
			const length = Math.hypot(df, dr), ef = warpedForward - f, er = warpedRight - r;
			const alongEnd = Math.abs((ef * df + er * dr) / length);
			const acrossEnd = Math.abs((-ef * dr + er * df) / length);
			const cap = roundCap + (1 - escarpmentRamp((Math.max(alongEnd, acrossEnd, (alongEnd + acrossEnd) * Math.SQRT1_2) - width * (capEdge + .18) + 16) / 32) - roundCap) * escarpment;
			const blend = foot * .17 + cap * .83;
			if (blend <= 0) continue;
			const originalTop = a.height + (b.height - a.height) * smoother$3(t) + 7 * Math.sin(forward * .026 + phase) + 3 * Math.sin(right * .021 - forward * .012) - incision;
			const top = escarpmentHeight(ridge.id, forward, right, originalTop, escarpment);
			const influence = blend ** 8;
			ridgeHeightSum += top * influence;
			ridgeWeightSum += influence;
			weight = Math.max(weight, blend);
		}
	}
	if (ridgeWeightSum > 0) height = ridgeHeightSum / ridgeWeightSum;
	const benchBlends = LAUNCH_INDUSTRIAL_BENCHES.map((bench) => {
		const df = Math.abs(forward - bench.forward) / (bench.halfForward + 12);
		const dr = Math.abs(right - bench.right) / (bench.halfRight + 12);
		return 1 - smoother$3((Math.max(df, dr) - 1) / .42);
	});
	let benchWeightSum = 0, benchHeightSum = 0, benchOutside = 1;
	for (const [index, bench] of LAUNCH_INDUSTRIAL_BENCHES.entries()) {
		const blend = benchBlends[index];
		benchOutside *= 1 - blend;
		let influence = blend;
		for (let other = 0; other < benchBlends.length; other++) if (other !== index) influence *= 1 - benchBlends[other];
		benchWeightSum += influence;
		benchHeightSum += bench.height * influence;
	}
	if (benchWeightSum > 0) {
		const benchWeight = 1 - benchOutside, remainingRidge = weight * (1 - benchWeight);
		const combinedWeight = remainingRidge + benchWeight;
		height = (height * remainingRidge + benchHeightSum / benchWeightSum * benchWeight) / combinedWeight;
		weight = combinedWeight;
	}
	const edge = Math.min(forward - LAUNCH_LANDSCAPE_BOUNDS.minForward, LAUNCH_LANDSCAPE_BOUNDS.maxForward - forward, right - LAUNCH_LANDSCAPE_BOUNDS.minRight, LAUNCH_LANDSCAPE_BOUNDS.maxRight - right);
	return {
		height,
		weight: weight * smoother$3(edge / 72)
	};
}
const COURSE_GULF_FILTER_MARGIN = Math.SQRT2 * 6 + 4;
const SHOULDER_FADE = 64;
const BUCKET_SIZE = 128;
/** The same four R32F texels and bilinear interpolation are used by GLSL. */
function sampleCourseGulfGrid(grid, x, z) {
	const gx = (x - grid.minX) / grid.cellSize;
	const gz = (z - grid.minZ) / grid.cellSize;
	if (!(gx >= 0 && gz >= 0 && gx < grid.size - 1 && gz < grid.size - 1)) return 0;
	const ix = Math.floor(gx), iz = Math.floor(gz);
	const fx = gx - ix, fz = gz - iz, i = iz * grid.size + ix;
	const a = grid.values[i], b = grid.values[i + 1];
	const c = grid.values[i + grid.size], d = grid.values[i + grid.size + 1];
	return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
}
/**
* Preserve the previous minimum of negative cuts; allow a positive landform
* when the other field is zero. Opposed signed fields combine continuously,
* avoiding a discontinuous step at the boundary of an overlapping depression.
* Keep this expression identical to combineCourseGulfOffsets in the GLSL chunk.
*/
function combineCourseGulfOffsets(a, b) {
	return Math.min(a, b, 0) + Math.max(a, b, 0);
}
var CourseGulfField = class {
	grids;
	launchProfile;
	constructor(grids, launchProfile) {
		this.grids = grids;
		this.launchProfile = launchProfile;
	}
	/** Allocation-free signed displacement, bounded even if fields overlap. */
	sampleOffset(x, z) {
		return combineCourseGulfOffsets(sampleCourseGulfGrid(this.grids[0], x, z), sampleCourseGulfGrid(this.grids[1], x, z));
	}
};
function smoothstep(value) {
	const t = Math.max(0, Math.min(1, value));
	return t * t * (3 - 2 * t);
}
/** Target is an actual surface elevation; the transition never raises terrain. */
function launchProfileOffset(profile, distance, baseHeight) {
	if (distance <= profile.startDistance || distance >= profile.endDistance) return 0;
	if (distance < profile.crestDistance) return Math.min(0, profile.crestHeight - baseHeight) * smoother$2((distance - profile.startDistance) / (profile.crestDistance - profile.startDistance));
	if (distance < profile.floorDistance) {
		const descent = smoothstep((distance - profile.crestDistance) / (profile.floorDistance - profile.crestDistance));
		return Math.min(0, profile.crestHeight + (profile.floorHeight - profile.crestHeight) * descent - baseHeight);
	}
	if (distance < profile.basinEndDistance) return Math.min(0, profile.floorHeight - baseHeight);
	const climb = smoothstep((distance - profile.basinEndDistance) / (profile.endDistance - profile.basinEndDistance));
	const target = profile.floorHeight + (profile.endHeight - profile.floorHeight) * climb;
	const exitBlend = smoothstep((distance - (profile.endDistance - 160)) / 160);
	return Math.min(0, target - baseHeight) * (1 - exitBlend);
}
function makeProfileBuckets(points, reach) {
	const buckets = /* @__PURE__ */ new Map();
	for (let i = 0; i < points.length - 1; i += 1) {
		const a = points[i], b = points[i + 1];
		const segment = {
			ax: a.x,
			az: a.z,
			dx: b.x - a.x,
			dz: b.z - a.z,
			lengthSq: (b.x - a.x) ** 2 + (b.z - a.z) ** 2,
			radius: 0,
			distance: a.distance,
			span: b.distance - a.distance
		};
		const minX = Math.floor((Math.min(a.x, b.x) - reach) / BUCKET_SIZE);
		const maxX = Math.floor((Math.max(a.x, b.x) + reach) / BUCKET_SIZE);
		const minZ = Math.floor((Math.min(a.z, b.z) - reach) / BUCKET_SIZE);
		const maxZ = Math.floor((Math.max(a.z, b.z) + reach) / BUCKET_SIZE);
		for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) {
			const key = `${x}:${z}`, entries = buckets.get(key);
			if (entries) entries.push(segment);
			else buckets.set(key, [segment]);
		}
	}
	return buckets;
}
function bakeLaunchProfile(grid, course, points, profile) {
	const buckets = makeProfileBuckets(points, profile.fadeWidth);
	for (let row = 1; row < grid.size - 1; row += 1) {
		const z = grid.minZ + row * grid.cellSize;
		for (let column = 1; column < grid.size - 1; column += 1) {
			const x = grid.minX + column * grid.cellSize;
			const candidates = buckets.get(`${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`);
			if (!candidates) continue;
			let nearestSq = profile.fadeWidth ** 2, distance = -1;
			for (const segment of candidates) {
				const t = Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / Math.max(1e-8, segment.lengthSq)));
				const distanceSq = (x - segment.ax - segment.dx * t) ** 2 + (z - segment.az - segment.dz * t) ** 2;
				if (distanceSq < nearestSq) {
					nearestSq = distanceSq;
					distance = segment.distance + segment.span * t;
				}
			}
			if (distance <= profile.startDistance || distance >= profile.endDistance) continue;
			const blend = 1 - smoother$2((Math.sqrt(nearestSq) - profile.fullWidth) / (profile.fadeWidth - profile.fullWidth));
			const offset = launchProfileOffset(profile, distance, course.heightAt(x, z)) * blend;
			const index = row * grid.size + column;
			grid.values[index] = Math.min(grid.values[index], offset);
		}
	}
}
function smoother$2(value) {
	const t = Math.max(0, Math.min(1, value));
	return t * t * t * (t * (t * 6 - 15) + 10);
}
function makeProtection(points, branches, laneMargin = 10, filterMargin = COURSE_GULF_FILTER_MARGIN) {
	const buckets = /* @__PURE__ */ new Map();
	const addRoute = (route, closed) => {
		for (let i = 0; i < route.length - (closed ? 0 : 1); i += 1) {
			const a = route[i], b = route[(i + 1) % route.length];
			const radius = Math.max(a.width, b.width) + laneMargin + filterMargin;
			const segment = {
				ax: a.x,
				az: a.z,
				dx: b.x - a.x,
				dz: b.z - a.z,
				lengthSq: (b.x - a.x) ** 2 + (b.z - a.z) ** 2,
				radius
			};
			const reach = radius + SHOULDER_FADE;
			const minX = Math.floor((Math.min(a.x, b.x) - reach) / BUCKET_SIZE);
			const maxX = Math.floor((Math.max(a.x, b.x) + reach) / BUCKET_SIZE);
			const minZ = Math.floor((Math.min(a.z, b.z) - reach) / BUCKET_SIZE);
			const maxZ = Math.floor((Math.max(a.z, b.z) + reach) / BUCKET_SIZE);
			for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) {
				const key = `${x}:${z}`;
				const entries = buckets.get(key);
				if (entries) entries.push(segment);
				else buckets.set(key, [segment]);
			}
		}
	};
	addRoute(points, true);
	for (const branch of branches) addRoute(branch.points, false);
	return buckets;
}
function clearanceAt(segments, x, z) {
	let clearance = SHOULDER_FADE;
	if (!segments) return clearance;
	for (const segment of segments) {
		const t = Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / Math.max(1e-8, segment.lengthSq)));
		const distance = Math.hypot(x - segment.ax - segment.dx * t, z - segment.az - segment.dz * t) - segment.radius;
		if (distance <= 0) return 0;
		clearance = Math.min(clearance, distance);
	}
	return clearance;
}
function bakeGrid(name, anchor, side, points, protection, depth, routeCenter) {
	const launch = name === "launch";
	const centerX = anchor.x + anchor.rightX * side * 330 + anchor.tangentX * (launch ? 230 : 50);
	const centerZ = anchor.z + anchor.rightZ * side * 330 + anchor.tangentZ * (launch ? 230 : 50);
	const size = launch ? 417 : 257, cellSize = 6;
	const half = (size - 1) * cellSize * .5;
	const minX = Math.floor(((routeCenter?.x ?? centerX) - half) / cellSize) * cellSize;
	const minZ = Math.floor(((routeCenter?.z ?? centerZ) - half) / cellSize) * cellSize;
	const values = new Float32Array(size * size);
	const forwardRadius = launch ? 720 : 650, lateralRadius = launch ? 640 : 580;
	for (let row = 1; row < size - 1; row += 1) {
		const z = minZ + row * cellSize;
		const intersections = [];
		for (let i = 0; i < points.length; i += 1) {
			const a = points[i], b = points[(i + 1) % points.length];
			if (a.z > z !== b.z > z) intersections.push(a.x + (z - a.z) * (b.x - a.x) / (b.z - a.z));
		}
		intersections.sort((a, b) => a - b);
		let crossing = 0;
		for (let column = 1; column < size - 1; column += 1) {
			const x = minX + column * cellSize;
			while (crossing < intersections.length && intersections[crossing] < x) crossing += 1;
			if (crossing % 2 === 1) continue;
			const dx = x - centerX, dz = z - centerZ;
			const forward = (dx * anchor.tangentX + dz * anchor.tangentZ) / forwardRadius;
			const lateral = (dx * anchor.rightX + dz * anchor.rightZ) / lateralRadius;
			const radius = Math.hypot(forward, lateral);
			if (radius >= 1) continue;
			const clearance = clearanceAt(protection.get(`${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`), x, z);
			if (clearance <= 0) continue;
			const shoulderFade = launch ? SHOULDER_FADE : 22;
			values[row * size + column] = -depth * smoother$2((1 - radius) / .55) * smoother$2(clearance / shoulderFade);
		}
	}
	return {
		name,
		minX,
		minZ,
		cellSize,
		size,
		values,
		centerX,
		centerZ,
		depth
	};
}
/** Landscape coordinates use the actual launch tangent; positive right is camera-screen right. */
function getLaunchBasinAnchor(course) {
	if (course.seed !== 1229867859) return null;
	const launches = course.getRenderData(256).points.filter((point) => point.tag === "launch-crest");
	return launches.length ? course.sampleAtProgress(launches[Math.floor((launches.length - 1) * .4)].progress) : null;
}
/**
* Compose real connected mountains into the physical launch basin. Signed
* off-road rise is bounded to 250m above the original surface.
* Protected lane texels keep their exact previous values, including all launch
* grade, branch and CPU/MRT normal samples. Two grids still own every height.
*/
function extendLaunchBasin(grid, course, profile) {
	const anchor = getLaunchBasinAnchor(course);
	if (!anchor) return;
	const points = Array.from({ length: 2048 }, (_, i) => course.samplePlanAtProgress(i / 2048));
	const protection = makeProtection(points, course.branches);
	const floorRadius = 120 + COURSE_GULF_FILTER_MARGIN;
	const floorBuckets = profile ? makeProfileBuckets(points, floorRadius + SHOULDER_FADE) : null;
	for (let row = 1; row < grid.size - 1; row++) {
		const z = grid.minZ + row * grid.cellSize;
		for (let column = 1; column < grid.size - 1; column++) {
			const x = grid.minX + column * grid.cellSize, dx = x - anchor.x, dz = z - anchor.z;
			const forward = dx * anchor.tangentX + dz * anchor.tangentZ;
			const right = -dx * anchor.rightX - dz * anchor.rightZ;
			if (forward < LAUNCH_LANDSCAPE_BOUNDS.minForward || forward > LAUNCH_LANDSCAPE_BOUNDS.maxForward || right < LAUNCH_LANDSCAPE_BOUNDS.minRight || right > LAUNCH_LANDSCAPE_BOUNDS.maxRight) continue;
			const clearance = clearanceAt(protection.get(`${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`), x, z);
			if (clearance <= 0) continue;
			const along = smoother$2((forward - 300) / 220) * (1 - smoother$2((forward - 1280) / 280));
			const across = 1 - smoother$2((Math.abs(right - 40) - 460) / 220);
			const border = smoother$2(Math.min(row, column, grid.size - 1 - row, grid.size - 1 - column) / 12);
			const mask = smoother$2(clearance / SHOULDER_FADE) * border;
			const index = row * grid.size + column;
			const basin = Math.min(grid.values[index], -160 * along * across * mask);
			const ridge = launchRidgeSurface(forward, right);
			const target = Math.max(-170, Math.min(250, ridge.height - course.heightAt(x, z)));
			const revealAlong = smoother$2((forward - 340) / 80) * (1 - smoother$2((forward - 1380) / 120));
			const reveal = 1 - (1 - smoother$2((Math.abs(right) - 120) / 64)) * revealAlong;
			let floorMask = 0;
			if (profile && floorBuckets) {
				const segments = floorBuckets.get(`${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`);
				let nearest = Infinity, distance = -1;
				for (const segment of segments ?? []) {
					const t = Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / Math.max(1e-8, segment.lengthSq)));
					const radius = Math.hypot(x - segment.ax - segment.dx * t, z - segment.az - segment.dz * t);
					if (radius < nearest) {
						nearest = radius;
						distance = segment.distance + segment.span * t;
					}
				}
				floorMask = smoother$2((distance - profile.floorDistance + 64) / 64) * (1 - smoother$2((distance - profile.basinEndDistance) / 64)) * (1 - smoother$2((nearest - floorRadius) / SHOULDER_FADE));
			}
			grid.values[index] = ridge.weight > 0 ? basin + (Math.max(basin, target) - basin) * ridge.weight * mask * reveal * (1 - floorMask) : basin;
		}
	}
}
const SALT_RUN_PROFILE = Object.freeze({
	startDistance: 570,
	entryEndDistance: 650,
	floorDistance: 780,
	riseDistance: 900,
	riseEndDistance: 1100,
	exitStartDistance: 1210,
	endDistance: 1260,
	fullWidth: 95,
	fadeWidth: 210
});
/** A shallow salt valley that rejoins before the unchanged launch rim. */
function saltRunCeiling(distance) {
	return -21 - 4 * smoother$2((distance - 650) / 130) + 11 * smoother$2((distance - 900) / 200);
}
/**
* Corrects the actual lane/shoulder hump, not a rendering-only road mesh.
* The final 20 m guard before 1280 m contains the interpolation and CPU/MRT normal
* footprints, leaving the previously certified launch rim/descent untouched.
*/
function bakeSaltRunProfile(grid, course) {
	if (course.seed !== 1229867859) return;
	const profile = SALT_RUN_PROFILE;
	const buckets = makeProfileBuckets(Array.from({ length: 2048 }, (_, i) => course.samplePlanAtProgress(i / 2048)), profile.fadeWidth);
	for (let row = 1; row < grid.size - 1; row++) {
		const z = grid.minZ + row * grid.cellSize;
		for (let column = 1; column < grid.size - 1; column++) {
			const x = grid.minX + column * grid.cellSize;
			const segments = buckets.get(`${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`);
			if (!segments) continue;
			let nearestSq = profile.fadeWidth ** 2, distance = -1;
			for (const segment of segments) {
				const t = Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / Math.max(1e-8, segment.lengthSq)));
				const square = (x - segment.ax - segment.dx * t) ** 2 + (z - segment.az - segment.dz * t) ** 2;
				if (square < nearestSq) {
					nearestSq = square;
					distance = segment.distance + segment.span * t;
				}
			}
			if (distance <= profile.startDistance || distance >= profile.endDistance) continue;
			const envelope = smoother$2((distance - profile.startDistance) / (profile.entryEndDistance - profile.startDistance)) * (1 - smoother$2((distance - profile.exitStartDistance) / (profile.endDistance - profile.exitStartDistance))) * (1 - smoother$2((Math.sqrt(nearestSq) - profile.fullWidth) / (profile.fadeWidth - profile.fullWidth)));
			const index = row * grid.size + column;
			const existing = grid.values[index];
			const offset = Math.min(0, saltRunCeiling(distance) - course.heightAt(x, z) - existing) * envelope;
			grid.values[index] = Math.max(-170, existing + offset);
		}
	}
}
const FORK_APPROACH_PROFILE = Object.freeze({
	start: 12,
	entryEnd: 72,
	floorStart: 70,
	floorEnd: 250,
	exitStart: 340,
	end: 440,
	fullWidth: 50,
	fadeWidth: 110
});
/**
* Lower the canonical fork's convex sand crest, including its visible shoulder.
* Raised branches keep their entire floor and CPU/MRT normal footprints: the
* branch mask includes a full bilinear cell diagonal plus 1.5 metres, covering
* the 1.15m MRT and .85m CPU normal probes. Only the
* formerly protected off-road ten-metre shoulder may now join the lower road.
* This writes into the existing shared finish texture; no camera/render override.
*/
function bakeForkApproachProfile(grid, course) {
	if (course.seed !== 1229867859) return;
	const branch = course.branches.find((candidate) => candidate.elevated);
	if (!branch) return;
	const profile = FORK_APPROACH_PROFILE;
	const entryDistance = branch.entryProgress * course.totalLength;
	const entryHeight = course.heightAt(branch.points[0].x, branch.points[0].z);
	const buckets = makeProfileBuckets(Array.from({ length: 2048 }, (_, i) => course.samplePlanAtProgress(i / 2048)), profile.fadeWidth);
	const branchProtection = makeProtection([], course.branches, 0, Math.SQRT2 * 6 + 1.5);
	for (let row = 1; row < grid.size - 1; row++) {
		const z = grid.minZ + row * grid.cellSize;
		for (let column = 1; column < grid.size - 1; column++) {
			const x = grid.minX + column * grid.cellSize;
			const key = `${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`;
			const segments = buckets.get(key);
			if (!segments) continue;
			let nearestSq = profile.fadeWidth ** 2, distance = -1;
			for (const segment of segments) {
				const t = Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / Math.max(1e-8, segment.lengthSq)));
				const square = (x - segment.ax - segment.dx * t) ** 2 + (z - segment.az - segment.dz * t) ** 2;
				if (square < nearestSq) {
					nearestSq = square;
					distance = segment.distance + segment.span * t - entryDistance;
				}
			}
			if (distance <= profile.start || distance >= profile.end) continue;
			const clearance = clearanceAt(branchProtection.get(key), x, z);
			if (clearance <= 0) continue;
			const envelope = smoother$2((distance - profile.start) / (profile.entryEnd - profile.start)) * (1 - smoother$2((distance - profile.exitStart) / (profile.end - profile.exitStart))) * (1 - smoother$2((Math.sqrt(nearestSq) - profile.fullWidth) / (profile.fadeWidth - profile.fullWidth))) * smoother$2(clearance / 6);
			const ceiling = entryHeight + 2 - 2 * smoother$2((distance - profile.floorStart) / (profile.floorEnd - profile.floorStart));
			const index = row * grid.size + column, existing = grid.values[index];
			const offset = Math.min(0, ceiling - course.heightAt(x, z) - existing) * envelope;
			grid.values[index] = Math.max(-170, existing + offset);
		}
	}
}
/** Call only after generating the unchanged base plan; never feeds seed search. */
function createCourseGulfField(course, options = {}) {
	if (course.seed !== 1229867859) return null;
	const points = Array.from({ length: 2048 }, (_, i) => course.samplePlanAtProgress(i / 2048));
	const launches = points.filter((point) => point.tag === "launch-crest");
	const hairpins = points.filter((point) => point.tag === "hairpin");
	const launch = launches[Math.floor(launches.length * .4)];
	const finish = hairpins[Math.floor(hairpins.length * .35)];
	if (!launch || !finish) return null;
	let centroidX = 0, centroidZ = 0;
	for (const point of points) {
		centroidX += point.x;
		centroidZ += point.z;
	}
	centroidX /= points.length;
	centroidZ /= points.length;
	const launchSide = -Math.sign((centroidX - launch.x) * launch.rightX + (centroidZ - launch.z) * launch.rightZ) || 1;
	const finishSide = -Math.sign(finish.curvature) || 1;
	const protection = makeProtection(points, course.branches);
	const crestDistance = launch.distance - 90;
	const crest = course.sampleAtDistance(crestDistance);
	const profile = {
		startDistance: crestDistance - 270,
		crestDistance,
		floorDistance: crestDistance + 600,
		basinEndDistance: crestDistance + 850,
		endDistance: crestDistance + 1550,
		crestHeight: crest.y - 12,
		floorHeight: crest.y - 106,
		endHeight: course.sampleAtDistance(crestDistance + 1550).y,
		fullWidth: 220,
		fadeWidth: 420
	};
	const launchGrid = bakeGrid("launch", launch, launchSide, points, protection, 170, course.samplePlanAtProgress((crestDistance + 600) / course.totalLength));
	bakeLaunchProfile(launchGrid, course, points, profile);
	extendLaunchBasin(launchGrid, course, profile);
	bakeSaltRunProfile(launchGrid, course);
	const finishGrid = bakeGrid("finish", finish, finishSide, points, protection, 150);
	if (options.forkApproach !== false) bakeForkApproachProfile(finishGrid, course);
	return new CourseGulfField([launchGrid, finishGrid], profile);
}
//#endregion
//#region src/game/race/inkstormLayout.ts
const rnd = (n) => {
	const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return v - Math.floor(v);
};
const layoutCache = /* @__PURE__ */ new WeakMap();
/** One authoritative placement list serves rendering and obstacle collision. */
function getInkstormLayout(course) {
	const cached = layoutCache.get(course);
	if (cached) return cached;
	const placements = [];
	const route = course.getRenderData(512);
	const routePoints = [...route.points, ...(route.branches ?? []).flatMap((branch) => branch.points)];
	const place = (family, progress, lateral, sx = 1, sy = sx, sz = sx, yawOffset = 0) => {
		const p = course.sampleAtProgress(progress), x = p.x + p.rightX * lateral, z = p.z + p.rightZ * lateral;
		const projection = course.projectPoint(x, z);
		const radius = family === "mesa-crown" ? 58 * sx : family === "cliff-strata" ? 35 * sx : family === "canyon-buttress" || family === "fractured-spire" ? 40 * sx : family === "sandstone-scree" ? 17.5 * sx : family === "wind-blade" ? 18 * sx : family === "roadside-shard" ? 5 * sx : family === "refinery-stack" ? 12 * sx : 0;
		if (radius && projection.distanceToCenter < projection.width + radius + 5) return;
		const yaw = Math.atan2(p.tangentX, p.tangentZ) + yawOffset;
		const footprints = {
			"cliff-strata": [35, 22],
			"canyon-buttress": [40, 50],
			"fractured-spire": [40, 50],
			"pit-complex": [75, 31],
			"pit-district": [60, 18],
			"pipe-bank": [47, 22],
			"finish-tower": [17, 12]
		};
		const footprint = footprints[family];
		if (footprint && routePoints.some((point) => {
			const dx = point.x - x, dz = point.z - z, cos = Math.cos(yaw), sin = Math.sin(yaw);
			return Math.hypot((dx * cos - dz * sin) / (footprint[0] * sx + point.width + 7), (dx * sin + dz * cos) / (footprint[1] * sz + point.width + 7)) < 1;
		})) return;
		if (family === "pit-district" && footprint) {
			const axes = (angle) => [[Math.cos(angle), -Math.sin(angle)], [Math.sin(angle), Math.cos(angle)]];
			const extent = (axis, angle, halfX, halfZ) => Math.abs(axis[0] * Math.cos(angle) - axis[1] * Math.sin(angle)) * halfX + Math.abs(axis[0] * Math.sin(angle) + axis[1] * Math.cos(angle)) * halfZ;
			if (placements.some((other) => {
				if (other.family !== "pit-complex" && other.family !== "pit-district") return false;
				const otherFootprint = footprints[other.family];
				return ![...axes(yaw), ...axes(other.yaw)].some((axis) => Math.abs((other.x - x) * axis[0] + (other.z - z) * axis[1]) - extent(axis, yaw, footprint[0] * sx, footprint[1] * sz) - extent(axis, other.yaw, otherFootprint[0] * other.sx, otherFootprint[1] * other.sz) >= 2);
			})) return;
		}
		placements.push({
			id: `inkstorm-${family}-${placements.length}`,
			family,
			progress,
			x,
			z,
			yaw,
			sx,
			sy,
			sz
		});
	};
	for (let d = 0, i = 0; d < course.totalLength; d += 38, i++) {
		const progress = d / course.totalLength, p = course.sampleAtProgress(progress), r = rnd(i + course.seed);
		for (const side of [-1, 1]) {
			if (p.tag === "narrow-canyon") {
				if (i % 3 === 0) place("canyon-buttress", progress, side * (p.width + 67 + r * 12), 1.25 + r * .25, .8 + r * .6, 1.6, side * (.03 + r * .12));
				if (i % 6 === 0) place("sandstone-scree", progress, side * (p.width + 30), 1.05, .8 + r * .5, 1.2, side * .11);
			} else if (p.tag === "hairpin" && side === (p.curvature > 0 ? 1 : -1) && i % 4 === 0) place("canyon-buttress", progress, side * (p.width + 77), 1.35, .95 + r * .55, 1.5, side * .18);
			else if (i % 8 === 0) place("canyon-buttress", progress, side * (p.width + 150 + r * 190), .58 + r * .35, .8 + r * 1.15, .8 + r * .7, side * (.3 + r * .6));
			if (i % 13 === 0) place("canyon-buttress", progress, side * (p.width + 540 + r * 260), 2.2 + r * 2.2, .9 + r * 1.5, 2.1 + r * 1.8, side * (.4 + r * .5));
			if (i % 19 === 0) place("canyon-buttress", progress, side * (p.width + 980 + r * 340), 4.5 + r * 3, 1.6 + r * 1.4, 3.1 + r * 2, side * .75);
			if (i % 4 === 0) place("roadside-shard", progress, side * (p.width + 13 + r * 9), .5 + r * .6, .6 + r * .5, .8, side * r);
			if (p.tag === "chicane" && i % 4 === 0) place("refinery-stack", progress, side * (p.width + 42 + r * 12), .9, 1 + r * .45, 1);
		}
	}
	place("foundry-gantry", .012, 0, 1, 1, 1);
	for (const [progress, side] of [
		[.993, -1],
		[.024, -1],
		[.006, 1]
	]) place("pit-complex", progress, side * (course.sampleAtProgress(progress).width + 52), 1, 1, 1, -side * Math.PI / 2);
	for (const [progress, side, frontage] of [
		[
			.0085,
			-1,
			.72
		],
		[
			.026,
			1,
			1
		],
		[
			.044,
			1,
			1
		],
		[
			.048,
			-1,
			1
		]
	]) place("pit-district", progress, side * (course.sampleAtProgress(progress).width + 48), frontage, 1, 1, -side * Math.PI / 2);
	for (const progress of [.979, .008]) place("finish-tower", progress, course.sampleAtProgress(progress).width + 31, 1, 1, 1, Math.PI);
	const canyon = course.getRenderData(256).points.filter((p) => p.tag === "narrow-canyon");
	if (canyon.length) {
		place("canyon-arch", canyon[Math.floor(canyon.length * .36)].progress, 0, 1.05, 1.08, 1.5);
		place("canyon-arch", canyon[Math.floor(canyon.length * .82)].progress, 0, 1.15, 1.2, 1.5);
	}
	const industrial = course.getRenderData(256).points.find((p) => p.tag === "chicane");
	if (industrial) place("foundry-gantry", industrial.progress + .013, 0, .78, 1.05, 1);
	const industrialPoints = route.points.filter((p) => p.tag === "chicane");
	for (let i = 0; i < industrialPoints.length; i += 6) {
		const p = industrialPoints[i];
		for (const side of [-1, 1]) place("pipe-bank", p.progress, side * (p.width + 52), 1, 1.15 + rnd(i) * .7, 1, -side * Math.PI / 2);
	}
	const returnBend = route.points.filter((p) => p.tag === "hairpin");
	if (returnBend.length) {
		const p = returnBend[Math.floor(returnBend.length * .53)];
		place("finish-tower", p.progress, p.width + 35, 1, 1.3, 1, Math.PI);
	}
	mixOpenGeology(course, placements);
	composeSaltRun(course, placements);
	composeLaunchGeology(course, placements);
	composeCanyonEntrance(course, placements);
	placements.push(...getInkstormForkDividers(course));
	layoutCache.set(course, placements);
	return placements;
}
/** Unequal near shoulders expose the flagship arch without moving the racing corridor. */
function composeCanyonEntrance(course, placements) {
	if (course.seed !== 1229867859) return;
	const progress = .44729237368968017;
	const route = course.sampleAtProgress(progress);
	for (const rock of placements) {
		if (rock.family !== "canyon-buttress" || Math.abs(rock.progress - progress) > 1e-12) continue;
		const lateral = (rock.x - route.x) * route.rightX + (rock.z - route.z) * route.rightZ;
		if (lateral === 0) continue;
		const left = lateral < 0, offset = left ? -12 : 18;
		rock.id = `inkstorm-canyon-near-${left ? "left" : "right"}-buttress`;
		rock.x += route.rightX * offset;
		rock.z += route.rightZ * offset;
		rock.sx = left ? .92 : 1;
		rock.sy = left ? .72 : .82;
		rock.sz = left ? .95 : 1;
	}
}
/** A flagship salt-valley sequence with a clear road opening and unequal depth. */
function getInkstormSaltFrames(course) {
	if (course.seed !== 1229867859) return [];
	const corridors = [course.getRenderData(2048).points, ...course.branches.map((branch) => branch.points)];
	const forms = [
		[
			680,
			175,
			"canyon-buttress",
			1.65,
			1.5,
			1.7,
			.48
		],
		[
			810,
			-195,
			"wind-blade",
			2.5,
			1.15,
			2,
			-.65
		],
		[
			970,
			235,
			"canyon-buttress",
			1.35,
			.85,
			1.6,
			.72
		],
		[
			1110,
			-265,
			"wind-blade",
			1.3,
			.95,
			1.6,
			-.44
		],
		[
			1260,
			355,
			"fractured-spire",
			1.4,
			1.15,
			1.1,
			.34
		]
	];
	const frames = [];
	for (const [distance, lateral, family, sx, sy, sz, turn] of forms) {
		const sample = course.sampleAtDistance(distance);
		const x = sample.x + sample.rightX * lateral, z = sample.z + sample.rightZ * lateral;
		const radius = family === "wind-blade" ? Math.hypot(18 * sx, 8 * sz) : Math.hypot(40 * sx, 50 * sz);
		let clear = true;
		for (const corridor of corridors) for (let i = 1; i < corridor.length; i++) {
			const a = corridor[i - 1], b = corridor[i];
			const dx = b.x - a.x, dz = b.z - a.z;
			const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / Math.max(1e-8, dx * dx + dz * dz)));
			if (Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < radius + Math.max(a.width, b.width) + 10) clear = false;
		}
		if (clear) frames.push({
			id: `inkstorm-salt-frame-${frames.length}`,
			family,
			progress: sample.progress,
			x,
			z,
			yaw: Math.atan2(sample.tangentX, sample.tangentZ) + turn,
			sx,
			sy,
			sz
		});
	}
	return frames;
}
function composeSaltRun(course, placements) {
	if (course.seed !== 1229867859) return;
	const anchor = course.sampleAtDistance(course.totalLength * .0859375);
	for (let i = placements.length - 1; i >= 0; i--) {
		const p = placements[i];
		if (p.family !== "canyon-buttress" && p.family !== "fractured-spire") continue;
		const dx = p.x - anchor.x, dz = p.z - anchor.z;
		const forward = dx * anchor.tangentX + dz * anchor.tangentZ;
		const lateral = dx * anchor.rightX + dz * anchor.rightZ;
		if (forward > -100 && forward < 700 && Math.abs(lateral) < 390) placements.splice(i, 1);
	}
	placements.push(...getInkstormSaltFrames(course));
}
/**
* The authored basin owns its geology in world space. Distant rocks generated
* from other parts of the loop used to appear between these same ridge faces.
* Remove only non-colliding broad/spire scenery; road obstacles and the actual
* fork island retain the shared rendering/collision placement contract.
*/
function composeLaunchGeology(course, placements) {
	const anchor = getLaunchBasinAnchor(course);
	if (!anchor) return;
	for (let i = placements.length - 1; i >= 0; i--) {
		const p = placements[i];
		if (p.id.startsWith("inkstorm-salt-frame-")) continue;
		if (p.family !== "canyon-buttress" && p.family !== "fractured-spire") continue;
		const dx = p.x - anchor.x, dz = p.z - anchor.z;
		const forward = dx * anchor.tangentX + dz * anchor.tangentZ;
		const right = -dx * anchor.rightX - dz * anchor.rightZ;
		if (forward > -220 && forward < 1800 && right > -1050 && right < 850) placements.splice(i, 1);
	}
}
/** Keep broad cliffs dominant; fracture accents belong to separated open-ground groups. */
function mixOpenGeology(course, placements) {
	const masses = placements.filter((p) => p.family === "canyon-buttress");
	const openTags = /* @__PURE__ */ new Set([
		"fast-straight",
		"wide-sweeper",
		"launch-crest",
		"recovery-straight"
	]);
	const candidates = masses.filter((p) => {
		if (!openTags.has(course.sampleAtProgress(p.progress).tag)) return false;
		const route = course.projectPoint(p.x, p.z);
		return p.sx < 4 && route.distanceToCenter > route.width + 100;
	}).sort((a, b) => rnd(a.x * .017 + a.z * .029 + (course.seed ?? 0)) - rnd(b.x * .017 + b.z * .029 + (course.seed ?? 0)));
	const count = Math.floor(masses.length * .15);
	if (!count) return;
	const accents = [];
	for (const p of candidates) {
		if (accents.some((other) => Math.hypot(other.x - p.x, other.z - p.z) < 260)) continue;
		p.family = "fractured-spire";
		p.id = p.id.replace("canyon-buttress", "fractured-spire");
		p.sx = Math.min(p.sx, 1.6);
		p.sz = Math.min(p.sz, 1.7);
		p.sy = Math.min(p.sy, 1.55);
		accents.push(p);
		if (accents.length >= count) break;
	}
}
const forkDividerCache = /* @__PURE__ */ new WeakMap();
/** Exact separation of a line segment and an axis-aligned rectangle. */
function segmentRectangleDistance(ax, az, bx, bz, halfX, halfZ) {
	const dx = bx - ax, dz = bz - az, lengthSquared = dx * dx + dz * dz;
	let minimum = Math.min(Math.hypot(Math.max(0, Math.abs(ax) - halfX), Math.max(0, Math.abs(az) - halfZ)), Math.hypot(Math.max(0, Math.abs(bx) - halfX), Math.max(0, Math.abs(bz) - halfZ)));
	if (minimum === 0) return 0;
	for (const side of [-1, 1]) {
		const tx = dx === 0 ? -1 : (halfX * side - ax) / dx;
		const tz = dz === 0 ? -1 : (halfZ * side - az) / dz;
		if (tx >= 0 && tx <= 1 && Math.abs(az + dz * tx) <= halfZ || tz >= 0 && tz <= 1 && Math.abs(ax + dx * tz) <= halfX) return 0;
		for (const other of [-1, 1]) {
			const x = halfX * side, z = halfZ * other;
			const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (lengthSquared || 1)));
			minimum = Math.min(minimum, Math.hypot(x - ax - dx * t, z - az - dz * t));
		}
	}
	return minimum;
}
/** Rock island between the actual shortcut and main road, never across either lane. */
function getInkstormForkDividers(course) {
	const cached = forkDividerCache.get(course);
	if (cached) return cached;
	const lines = [course.getRenderData(2048).points, ...course.branches.map((branch) => branch.points)];
	const segments = [];
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		const count = lineIndex === 0 ? line.length : line.length - 1;
		for (let i = 0; i < count; i++) {
			const a = line[i], b = line[(i + 1) % line.length];
			const dx = b.x - a.x, dz = b.z - a.z;
			segments.push({
				ax: a.x,
				az: a.z,
				dx,
				dz,
				lengthSquared: dx * dx + dz * dz,
				width: Math.max(a.width, b.width)
			});
		}
	}
	const dividers = [];
	for (const branch of course.branches.filter((branch) => branch.elevated)) for (const [fraction, heightScale] of [
		[.375, .42],
		[.5, .8],
		[.625, 1.08]
	]) {
		const index = Math.round((branch.points.length - 1) * fraction);
		const p = branch.points[index], previous = branch.points[index - 1], next = branch.points[index + 1];
		const canonical = course.sampleAtProgress(p.canonicalProgress);
		const previousMain = course.sampleAtProgress(previous.canonicalProgress), nextMain = course.sampleAtProgress(next.canonicalProgress);
		const gapX = p.x - canonical.x, gapZ = p.z - canonical.z, gap = Math.hypot(gapX, gapZ);
		const shift = (canonical.width - p.width) * .5 / Math.max(1, gap);
		const x = (p.x + canonical.x) * .5 + gapX * shift, z = (p.z + canonical.z) * .5 + gapZ * shift;
		const axisYaw = Math.atan2(next.x + nextMain.x - previous.x - previousMain.x, next.z + nextMain.z - previous.z - previousMain.z);
		const nearby = segments.filter((segment) => Math.hypot(segment.ax - x, segment.az - z) < 130 + Math.sqrt(segment.lengthSquared) + segment.width + 12);
		let best = null;
		for (const turn of [
			-.1,
			0,
			.1
		]) {
			const yaw = axisYaw + turn, cos = Math.cos(yaw), sin = Math.sin(yaw);
			const local = nearby.map((segment) => {
				const dx = segment.ax - x, dz = segment.az - z;
				return {
					ax: dx * cos - dz * sin,
					az: dx * sin + dz * cos,
					bx: (dx + segment.dx) * cos - (dz + segment.dz) * sin,
					bz: (dx + segment.dx) * sin + (dz + segment.dz) * cos,
					width: segment.width
				};
			});
			for (const halfZ of [
				25,
				35,
				45,
				55,
				65,
				80,
				95
			]) {
				const fits = (halfX) => local.every((segment) => segmentRectangleDistance(segment.ax, segment.az, segment.bx, segment.bz, halfX, halfZ) >= segment.width + 12);
				if (!fits(12)) continue;
				let low = 12, high = 48;
				for (let iteration = 0; iteration < 12; iteration++) {
					const halfX = (low + high) * .5;
					if (fits(halfX)) low = halfX;
					else high = halfX;
				}
				const score = low * halfZ * (1 + halfZ * .003);
				if (!best || score > best.score) best = {
					yaw,
					halfX: low,
					halfZ,
					score
				};
			}
		}
		if (!best) continue;
		dividers.push({
			id: `inkstorm-fork-divider-${branch.id}-${dividers.length}`,
			family: "canyon-buttress",
			progress: p.canonicalProgress,
			x,
			z,
			yaw: best.yaw,
			sx: best.halfX / 40,
			sz: best.halfZ / 50,
			sy: heightScale
		});
	}
	forkDividerCache.set(course, dividers);
	return dividers;
}
const colliderCache = /* @__PURE__ */ new WeakMap();
function obstacleBuckets(course) {
	const cached = colliderCache.get(course);
	if (cached) return cached;
	const buckets = /* @__PURE__ */ new Map();
	const add = (c) => {
		const radius = (c.box ? Math.hypot(c.rx, c.rz) : Math.max(c.rx, c.rz)) + 20;
		for (let x = Math.floor((c.x - radius) / 128); x <= Math.floor((c.x + radius) / 128); x++) for (let z = Math.floor((c.z - radius) / 128); z <= Math.floor((c.z + radius) / 128); z++) {
			const key = `${x}:${z}`;
			const list = buckets.get(key) ?? [];
			list.push(c);
			buckets.set(key, list);
		}
	};
	for (const p of getInkstormLayout(course)) {
		const size = {
			"roadside-shard": [
				5,
				3.5,
				12
			],
			"sandstone-scree": [
				17.5,
				11,
				12
			],
			"wind-blade": [
				17,
				7.5,
				148
			],
			"mesa-crown": [
				58,
				45,
				76
			],
			"refinery-stack": [
				12,
				12,
				98
			],
			"pit-complex": [
				75,
				31,
				47
			],
			"pit-district": [
				60,
				18,
				35
			],
			"pipe-bank": [
				47,
				22,
				51
			],
			"finish-tower": [
				17,
				12,
				113
			]
		}[p.family];
		if (size) add({
			id: p.id,
			x: p.x,
			z: p.z,
			rx: size[0] * p.sx,
			rz: size[1] * p.sz,
			yaw: p.yaw,
			height: size[2] * p.sy,
			progress: p.progress
		});
		if (p.id.startsWith("inkstorm-fork-divider-")) add({
			id: p.id,
			x: p.x,
			z: p.z,
			rx: 40 * p.sx,
			rz: 50 * p.sz,
			yaw: p.yaw,
			height: 120 * p.sy,
			progress: p.progress,
			box: true
		});
		if (p.family === "foundry-gantry") for (const side of [-1, 1]) add({
			id: `${p.id}-${side}`,
			x: p.x + Math.cos(p.yaw) * 46 * p.sx * side,
			z: p.z - Math.sin(p.yaw) * 46 * p.sx * side,
			rx: 6 * p.sx,
			rz: 7 * p.sz,
			yaw: p.yaw,
			height: 50 * p.sy,
			progress: p.progress
		});
	}
	colliderCache.set(course, buckets);
	return buckets;
}
/** Bounded spatial lookup; low shrubs and distant decoration never affect driveable route. */
function getInkstormObstacleContact(course, x, z, radius, y, heightAt) {
	const bucket = obstacleBuckets(course).get(`${Math.floor(x / 128)}:${Math.floor(z / 128)}`);
	if (!bucket) return null;
	for (const c of bucket) {
		if (y !== void 0 && y > heightAt(c.x, c.z) + c.height + 2) continue;
		const dx = x - c.x, dz = z - c.z, cos = Math.cos(c.yaw), sin = Math.sin(c.yaw);
		const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos, rx = c.rx + radius, rz = c.rz + radius;
		if (c.box) {
			const cx = Math.max(-c.rx, Math.min(c.rx, lx)), cz = Math.max(-c.rz, Math.min(c.rz, lz));
			const ox = lx - cx, oz = lz - cz, distance = Math.hypot(ox, oz);
			if (distance >= radius && distance > 0) continue;
			let nx, nz, penetration;
			if (distance > 0) {
				nx = ox / distance;
				nz = oz / distance;
				penetration = radius - distance;
			} else if (c.rx - Math.abs(lx) < c.rz - Math.abs(lz)) {
				nx = lx < 0 ? -1 : 1;
				nz = 0;
				penetration = radius + c.rx - Math.abs(lx);
			} else {
				nx = 0;
				nz = lz < 0 ? -1 : 1;
				penetration = radius + c.rz - Math.abs(lz);
			}
			return {
				id: c.id,
				kind: "scenery",
				progress: c.progress,
				penetration,
				normalX: nx * cos + nz * sin,
				normalZ: -nx * sin + nz * cos
			};
		}
		const distance = Math.hypot(lx / rx, lz / rz);
		if (distance >= 1) continue;
		let nx = lx / (rx * rx), nz = lz / (rz * rz);
		const length = Math.hypot(nx, nz) || 1;
		nx /= length;
		nz /= length;
		if (Math.abs(nx) + Math.abs(nz) < .001) {
			nx = 1;
			nz = 0;
		}
		return {
			id: c.id,
			kind: "scenery",
			progress: c.progress,
			penetration: (1 - distance) * Math.min(rx, rz),
			normalX: nx * cos + nz * sin,
			normalZ: -nx * sin + nz * cos
		};
	}
	return null;
}
//#endregion
//#region src/game/race/regions.ts
const TERRAIN_REGION_CELL_SIZE = 9600;
const DESERT_REGION_ORDER = Object.freeze([
	"sunscar-dunes",
	"glass-flats",
	"red-canyon",
	"storm-basin",
	"machine-graveyard",
	"geothermal-badlands"
]);
function branchKinds(...kinds) {
	return Object.freeze(kinds);
}
const DESERT_REGIONS = Object.freeze({
	"sunscar-dunes": Object.freeze({
		id: "sunscar-dunes",
		label: "Sunscar Dunes",
		terrainIndex: 0,
		preferredBranches: branchKinds("jump", "shortcut", "technical"),
		palette: Object.freeze({
			shadow: "#672b35",
			dark: "#bd5839",
			mid: "#e37b42",
			sun: "#ffb55f",
			crest: "#ffd786",
			mineral: "#b94338",
			sparkle: "#fff1ae",
			haze: "#e58159"
		}),
		atmosphere: Object.freeze({
			skyTop: "#a28ea4",
			skyHorizon: "#ffd6a7",
			haze: "#c6a0b0",
			sunTint: "#fff4cc",
			dustTint: "#ffd18a",
			windStrength: .96
		}),
		minimumLaunchScore: .07,
		maximumCourseSlope: 1.35
	}),
	"glass-flats": Object.freeze({
		id: "glass-flats",
		label: "Sunglass Flats",
		terrainIndex: 1,
		preferredBranches: branchKinds("salvage", "shortcut", "safe"),
		palette: Object.freeze({
			shadow: "#283149",
			dark: "#596a78",
			mid: "#8fa3a8",
			sun: "#c5d9cc",
			crest: "#eaffdc",
			mineral: "#4ec1ae",
			sparkle: "#ffffff",
			haze: "#9cc8bd"
		}),
		atmosphere: Object.freeze({
			skyTop: "#284c74",
			skyHorizon: "#b2e2d2",
			haze: "#9cc8bd",
			sunTint: "#e9ffe0",
			dustTint: "#c5dfd1",
			windStrength: .62
		}),
		minimumLaunchScore: .015,
		maximumCourseSlope: .5
	}),
	"red-canyon": Object.freeze({
		id: "red-canyon",
		label: "Krayt Red Canyon",
		terrainIndex: 2,
		preferredBranches: branchKinds("shortcut", "technical", "safe"),
		palette: Object.freeze({
			shadow: "#391724",
			dark: "#73272a",
			mid: "#a83f2d",
			sun: "#df7140",
			crest: "#f6ab61",
			mineral: "#5c1c2a",
			sparkle: "#ffd39a",
			haze: "#9b4038"
		}),
		atmosphere: Object.freeze({
			skyTop: "#aa8190",
			skyHorizon: "#ffd0a0",
			haze: "#bc99ae",
			sunTint: "#fff1c7",
			dustTint: "#d56b48",
			windStrength: .74
		}),
		minimumLaunchScore: .045,
		maximumCourseSlope: 1.25
	}),
	"storm-basin": Object.freeze({
		id: "storm-basin",
		label: "Vanta Storm Basin",
		terrainIndex: 3,
		preferredBranches: branchKinds("safe", "technical", "shortcut"),
		palette: Object.freeze({
			shadow: "#241d3b",
			dark: "#4d4158",
			mid: "#756477",
			sun: "#a98a8b",
			crest: "#d4b5a6",
			mineral: "#49335b",
			sparkle: "#d9d2ff",
			haze: "#65556f"
		}),
		atmosphere: Object.freeze({
			skyTop: "#191b38",
			skyHorizon: "#77627b",
			haze: "#65556f",
			sunTint: "#d9c5d7",
			dustTint: "#8a7182",
			windStrength: 1.3
		}),
		minimumLaunchScore: .03,
		maximumCourseSlope: .75
	}),
	"machine-graveyard": Object.freeze({
		id: "machine-graveyard",
		label: "Machine Graveyard",
		terrainIndex: 4,
		preferredBranches: branchKinds("salvage", "technical", "shortcut"),
		palette: Object.freeze({
			shadow: "#1f2530",
			dark: "#4b4b49",
			mid: "#766f5b",
			sun: "#aaa078",
			crest: "#dfcf93",
			mineral: "#4f796e",
			sparkle: "#eaffc6",
			haze: "#807863"
		}),
		atmosphere: Object.freeze({
			skyTop: "#263249",
			skyHorizon: "#9c8f72",
			haze: "#807863",
			sunTint: "#e8d69a",
			dustTint: "#a79a78",
			windStrength: .8
		}),
		minimumLaunchScore: .02,
		maximumCourseSlope: .8
	}),
	"geothermal-badlands": Object.freeze({
		id: "geothermal-badlands",
		label: "Geothermal Badlands",
		terrainIndex: 5,
		preferredBranches: branchKinds("jump", "technical", "salvage"),
		palette: Object.freeze({
			shadow: "#2c1728",
			dark: "#663238",
			mid: "#9a4f37",
			sun: "#cf783e",
			crest: "#f3b85d",
			mineral: "#7c2840",
			sparkle: "#ffe887",
			haze: "#985044"
		}),
		atmosphere: Object.freeze({
			skyTop: "#3d234b",
			skyHorizon: "#c2674d",
			haze: "#985044",
			sunTint: "#ffc95f",
			dustTint: "#bd6e4d",
			windStrength: 1.04
		}),
		minimumLaunchScore: .055,
		maximumCourseSlope: 1.5
	})
});
function positiveModulo(value, divisor) {
	const result = value % divisor;
	return result < 0 ? result + divisor : result;
}
function smoother$1(value) {
	const safe = Math.min(1, Math.max(0, value));
	return safe * safe * safe * (safe * (safe * 6 - 15) + 10);
}
function desertRegionByIndex(index) {
	const id = DESERT_REGION_ORDER[positiveModulo(Math.floor(index), DESERT_REGION_ORDER.length)] ?? "sunscar-dunes";
	return DESERT_REGIONS[id];
}
function desertRegionForSeed(seed) {
	if (seed >>> 0 === 1229867859) return DESERT_REGIONS["red-canyon"];
	if (seed >>> 0 === 1179604302) return DESERT_REGIONS["machine-graveyard"];
	if (seed >>> 0 === 1196179795) return DESERT_REGIONS["glass-flats"];
	let value = seed >>> 0;
	value = Math.imul(value ^ value >>> 16, 569420461);
	value = Math.imul(value ^ value >>> 15, 1935289751);
	value ^= value >>> 15;
	return desertRegionByIndex(value >>> 0);
}
/** Allocation-free region lookup shared by gameplay terrain and diagnostics. */
function terrainRegionBlendAt(worldX, out) {
	const cell = Math.floor(worldX / TERRAIN_REGION_CELL_SIZE + .5);
	const local = worldX - cell * TERRAIN_REGION_CELL_SIZE;
	const half = TERRAIN_REGION_CELL_SIZE * .5;
	const blendStart = 4080;
	if (local > blendStart) {
		out.fromIndex = positiveModulo(cell, 6);
		out.toIndex = positiveModulo(cell + 1, 6);
		out.amount = smoother$1((local - blendStart) / 1440);
	} else if (local < -4080) {
		out.fromIndex = positiveModulo(cell - 1, 6);
		out.toIndex = positiveModulo(cell, 6);
		out.amount = smoother$1((local + half + 720) / 1440);
	} else {
		out.fromIndex = positiveModulo(cell, 6);
		out.toIndex = out.fromIndex;
		out.amount = 0;
	}
	return out;
}
/** Places a generated circuit deep inside its selected region's plateau. */
function desertRegionAnchor(region, seed) {
	const index = DESERT_REGIONS[region].terrainIndex;
	const signedCell = index <= 2 ? index : index - 6;
	const zJitter = ((Math.imul((seed ^ 1911728589) >>> 0, 2654435761) >>> 0) / 4294967296 - .5) * 1600;
	return Object.freeze({
		x: signedCell * TERRAIN_REGION_CELL_SIZE,
		z: zJitter
	});
}
const compiled = /* @__PURE__ */ new WeakMap();
function segmentsFor(branches) {
	const cached = compiled.get(branches);
	if (cached) return cached;
	const segments = [];
	for (const branch of branches) {
		if (!branch.elevated) continue;
		for (let index = 0; index < branch.points.length - 1; index += 1) {
			const point = branch.points[index];
			const next = branch.points[index + 1];
			const dx = next.x - point.x, dz = next.z - point.z;
			const lengthSquared = dx * dx + dz * dz;
			if (lengthSquared < 1e-9) continue;
			const width = Math.max(point.width, next.width);
			segments.push({
				branchId: branch.id,
				point,
				next,
				dx,
				dz,
				length: Math.sqrt(lengthSquared),
				lengthSquared,
				first: index === 0,
				last: index === branch.points.length - 2,
				minX: Math.min(point.x, next.x) - width,
				maxX: Math.max(point.x, next.x) + width,
				minZ: Math.min(point.z, next.z) - width,
				maxZ: Math.max(point.z, next.z) + width
			});
		}
	}
	compiled.set(branches, segments);
	return segments;
}
/** Exact piecewise planar deck height. Null means there is no deck at x/z. */
function sampleBridgeSurface(branches, x, z) {
	if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
	let nearest = null;
	let nearestFraction = 0;
	let nearestSquared = Number.POSITIVE_INFINITY;
	for (const segment of segmentsFor(branches)) {
		if (x < segment.minX || x > segment.maxX || z < segment.minZ || z > segment.maxZ) continue;
		const raw = ((x - segment.point.x) * segment.dx + (z - segment.point.z) * segment.dz) / segment.lengthSquared;
		if (segment.first && raw < 0 || segment.last && raw > 1) continue;
		const fraction = Math.max(0, Math.min(1, raw));
		const offsetX = x - segment.point.x - segment.dx * fraction;
		const offsetZ = z - segment.point.z - segment.dz * fraction;
		const squared = offsetX * offsetX + offsetZ * offsetZ;
		const width = segment.point.width + (segment.next.width - segment.point.width) * fraction;
		if (squared > width * width || squared >= nearestSquared) continue;
		nearest = segment;
		nearestFraction = fraction;
		nearestSquared = squared;
	}
	if (!nearest) return null;
	const { point, next, length, dx, dz } = nearest;
	const fraction = nearestFraction;
	return {
		height: point.y + (next.y - point.y) * fraction,
		branchId: nearest.branchId,
		routeProgress: point.routeProgress + (next.routeProgress - point.routeProgress) * fraction,
		canonicalProgress: point.canonicalProgress + (next.canonicalProgress - point.canonicalProgress) * fraction,
		lateralOffset: ((x - point.x) * dz - (z - point.z) * dx) / length,
		width: point.width + (next.width - point.width) * fraction,
		tangentX: dx / length,
		tangentZ: dz / length,
		grade: (next.y - point.y) / length
	};
}
//#endregion
//#region src/game/race/branches.ts
const BRANCH_SAMPLE_COUNT = 25;
function clamp$1(value, minimum, maximum) {
	return Math.min(maximum, Math.max(minimum, value));
}
function mixSeed(seed) {
	let value = seed >>> 0;
	value = Math.imul(value ^ value >>> 16, 569420461);
	value = Math.imul(value ^ value >>> 15, 1935289751);
	value ^= value >>> 15;
	return value >>> 0 || 1831565813;
}
function nextRandom(state) {
	let value = state.value >>> 0;
	value ^= value << 13;
	value ^= value >>> 17;
	value ^= value << 5;
	state.value = value >>> 0 || 1831565813;
	return state.value / 4294967296;
}
function gapCandidates(course) {
	const candidates = [];
	for (let index = 0; index + 1 < course.checkpoints.length; index += 1) {
		const from = course.checkpoints[index]?.progress;
		const to = course.checkpoints[index + 1]?.progress;
		if (from === void 0 || to === void 0 || to <= from) continue;
		const span = to - from;
		const checkpointGapLength = span * course.totalLength;
		if (checkpointGapLength < 430 || checkpointGapLength > 1260) continue;
		const entry = from + span * .16;
		const exit = to - span * .16;
		const start = course.samplePlanAtProgress(entry);
		const end = course.samplePlanAtProgress(exit);
		const chord = Math.hypot(end.x - start.x, end.z - start.z);
		const tags = /* @__PURE__ */ new Set();
		for (let probe = 0; probe <= 12; probe += 1) tags.add(course.samplePlanAtProgress(from + span * probe / 12).tag);
		const routeLength = (exit - entry) * course.totalLength;
		candidates.push({
			start: entry,
			end: exit,
			span: exit - entry,
			length: routeLength,
			chord,
			curveExcess: routeLength / Math.max(1, chord),
			tags
		});
	}
	return candidates;
}
function gapScore(kind, gap) {
	switch (kind) {
		case "jump": return (gap.tags.has("launch-crest") ? 12 : 0) + (gap.tags.has("fast-straight") ? 2 : 0) + gap.chord / Math.max(1, gap.length);
		case "shortcut": return gap.curveExcess * 7 + (gap.tags.has("wide-sweeper") ? 4 : 0) + (gap.tags.has("hairpin") ? 5 : 0) + (gap.tags.has("chicane") ? 2 : 0);
		case "salvage": return (gap.tags.has("fast-straight") ? 6 : 0) + (gap.tags.has("recovery-straight") ? 5 : 0) + gap.length / 500;
		case "technical": return (gap.tags.has("chicane") ? 8 : 0) - (gap.tags.has("narrow-canyon") ? 12 : 0) + (gap.tags.has("wide-sweeper") ? 3 : 0);
		case "safe": return (gap.tags.has("hairpin") ? 6 : 0) + (gap.tags.has("wide-sweeper") ? 5 : 0) - (gap.tags.has("narrow-canyon") ? 12 : 0) + gap.length / 700;
	}
}
function branchTune(kind) {
	switch (kind) {
		case "shortcut": return {
			label: "Razor Cut",
			width: 11.5,
			offset: 42,
			risk: .82,
			reward: .9
		};
		case "jump": return {
			label: "Skybreak Ramp",
			width: 13.5,
			offset: 48,
			risk: .76,
			reward: .84
		};
		case "salvage": return {
			label: "Salvage Run",
			width: 17,
			offset: 72,
			risk: .48,
			reward: .72
		};
		case "technical": return {
			label: "Needle Thread",
			width: 10.5,
			offset: 38,
			risk: .9,
			reward: .78
		};
		case "safe": return {
			label: "Shelter Line",
			width: 22,
			offset: 86,
			risk: .18,
			reward: .2
		};
	}
}
function hermite(p0, p1, m0, m1, t) {
	const t2 = t * t;
	const t3 = t2 * t;
	return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
}
function makeBranch(course, gap, kind, seed, ordinal, sideOverride) {
	const tune = branchTune(kind);
	const random = { value: mixSeed(seed ^ Math.imul(ordinal + 1, 2246822507)) };
	const randomSide = nextRandom(random) < .5 ? -1 : 1;
	const side = sideOverride ?? randomSide;
	const amplitude = tune.offset * (.86 + nextRandom(random) * .3);
	const start = course.samplePlanAtProgress(gap.start);
	const end = course.samplePlanAtProgress(gap.end);
	const chord = Math.max(1, Math.hypot(end.x - start.x, end.z - start.z));
	const handle = Math.min(gap.length * .38, chord * .68);
	const shortcutBow = kind === "shortcut" ? amplitude * .28 : 0;
	const points = [];
	for (let index = 0; index < BRANCH_SAMPLE_COUNT; index += 1) {
		const t = index / 24;
		const canonicalProgress = gap.start + gap.span * t;
		const canonical = course.samplePlanAtProgress(canonicalProgress);
		const envelope = Math.sin(Math.PI * t);
		let x;
		let z;
		if (kind === "shortcut") {
			x = hermite(start.x, end.x, start.tangentX * handle, end.tangentX * handle, t);
			z = hermite(start.z, end.z, start.tangentZ * handle, end.tangentZ * handle, t);
			const chordRightX = (end.z - start.z) / chord;
			const chordRightZ = -(end.x - start.x) / chord;
			x += chordRightX * side * shortcutBow * envelope;
			z += chordRightZ * side * shortcutBow * envelope;
		} else {
			const secondary = kind === "technical" ? Math.sin(t * Math.PI * 2) * amplitude * .06 : kind === "salvage" ? Math.sin(t * Math.PI * 2) * amplitude * .16 : 0;
			const offset = side * amplitude * envelope + secondary * envelope;
			x = canonical.x + canonical.rightX * offset;
			z = canonical.z + canonical.rightZ * offset;
		}
		points.push(Object.freeze({
			x,
			y: course.heightAt(x, z),
			z,
			width: tune.width * (1 - Math.sin(Math.PI * t) * (kind === "technical" ? .12 : 0)),
			canonicalProgress,
			routeProgress: t
		}));
	}
	const id = `branch-${ordinal + 1}-${kind}`;
	return Object.freeze({
		id,
		kind,
		label: tune.label,
		entryProgress: gap.start,
		exitProgress: gap.end,
		risk: tune.risk,
		reward: tune.reward,
		points: Object.freeze(points)
	});
}
function polylineLength(points) {
	let length = 0;
	for (let index = 1; index < points.length; index += 1) {
		const previous = points[index - 1];
		const point = points[index];
		if (previous && point) length += Math.hypot(point.x - previous.x, point.z - previous.z);
	}
	return length;
}
/** Separate the actual choices before the bridge rises across the ground-road view. */
function openFlagshipForkApproach(course, branch) {
	const points = branch.points.map((point) => {
		const t = point.routeProgress;
		if (t <= 0 || t >= .5) return point;
		const main = course.samplePlanAtProgress(point.canonicalProgress);
		const side = Math.sign((point.x - main.x) * main.rightX + (point.z - main.z) * main.rightZ) || 1;
		const offset = Math.sin(t / .5 * Math.PI) ** 2 * 24 * side;
		const x = point.x + main.rightX * offset, z = point.z + main.rightZ * offset;
		return Object.freeze({
			...point,
			x,
			z,
			y: course.heightAt(x, z)
		});
	});
	return Object.freeze({
		...branch,
		points: Object.freeze(points)
	});
}
function elevateFlagshipShortcut(branch) {
	let smooth = branch.points.map((point) => point.y);
	for (let pass = 0; pass < 3; pass += 1) smooth = smooth.map((height, index, heights) => index === 0 || index === heights.length - 1 ? height : heights[index - 1] * .25 + height * .5 + heights[index + 1] * .25);
	let rise = 24;
	for (let index = 1; index < branch.points.length - 1; index += 1) {
		const point = branch.points[index];
		const envelope = Math.sin(Math.PI * point.routeProgress) ** 2;
		rise = Math.min(rise, (24 - smooth[index] + point.y) / envelope);
	}
	const points = branch.points.map((point, index) => {
		const lift = rise * Math.sin(Math.PI * point.routeProgress) ** 2;
		const y = index === 0 || index === branch.points.length - 1 ? point.y : Math.max(point.y, smooth[index] + lift);
		return Object.freeze({
			...point,
			y
		});
	});
	return Object.freeze({
		...branch,
		elevated: true,
		points: Object.freeze(points)
	});
}
function branchSegmentsCross(a, b, c, d) {
	const abC = branchOrientation(a, b, c);
	const abD = branchOrientation(a, b, d);
	const cdA = branchOrientation(c, d, a);
	const cdB = branchOrientation(c, d, b);
	const epsilon = 1e-5;
	return (abC > epsilon && abD < -1e-5 || abC < -1e-5 && abD > epsilon) && (cdA > epsilon && cdB < -1e-5 || cdA < -1e-5 && cdB > epsilon);
}
function branchOrientation(first, second, third) {
	return (second.x - first.x) * (third.z - first.z) - (second.z - first.z) * (third.x - first.x);
}
function branchSelfIntersects(points) {
	for (let first = 0; first + 1 < points.length; first += 1) {
		const a = points[first];
		const b = points[first + 1];
		if (!a || !b) continue;
		for (let second = first + 2; second + 1 < points.length; second += 1) {
			const c = points[second];
			const d = points[second + 1];
			if (c && d && branchSegmentsCross(a, b, c, d)) return true;
		}
	}
	return false;
}
function maximumBranchTurnRate(points) {
	let maximum = 0;
	for (let index = 1; index + 1 < points.length; index += 1) {
		const previous = points[index - 1];
		const point = points[index];
		const next = points[index + 1];
		const incomingX = point.x - previous.x;
		const incomingZ = point.z - previous.z;
		const outgoingX = next.x - point.x;
		const outgoingZ = next.z - point.z;
		const incomingLength = Math.max(1e-6, Math.hypot(incomingX, incomingZ));
		const outgoingLength = Math.max(1e-6, Math.hypot(outgoingX, outgoingZ));
		const turn = Math.abs(Math.atan2(incomingX * outgoingZ - incomingZ * outgoingX, incomingX * outgoingX + incomingZ * outgoingZ));
		maximum = Math.max(maximum, turn / Math.max(1, (incomingLength + outgoingLength) * .5));
	}
	return maximum;
}
function branchCandidateIsUsable(course, branch) {
	if (branchSelfIntersects(branch.points)) return false;
	if (maximumBranchTurnRate(branch.points) > .12) return false;
	const canonicalLength = (branch.exitProgress - branch.entryProgress) * course.totalLength;
	const routeLength = polylineLength(branch.points);
	if (branch.kind === "shortcut" && routeLength >= canonicalLength * .98) return false;
	if (branch.kind === "safe" && routeLength < canonicalLength * .99) return false;
	for (let probe = 0; probe <= 8; probe += 1) {
		const progress = branch.entryProgress + (branch.exitProgress - branch.entryProgress) * probe / 8;
		if (course.samplePlanAtProgress(progress).tag === "narrow-canyon") return false;
	}
	return branch.points.every((point) => point.width >= 8 && point.width <= 26);
}
function validateCourseBranches(course, branches) {
	const reasons = [];
	if (branches.length < 2 || branches.length > 3) reasons.push("branch-count");
	const usedIntervals = [];
	for (const branch of branches) {
		if (branch.points.length < 16) reasons.push(`${branch.id}:sample-count`);
		if (!(branch.entryProgress < branch.exitProgress)) reasons.push(`${branch.id}:progress-order`);
		for (let index = 1; index < branch.points.length; index += 1) {
			const previous = branch.points[index - 1];
			const point = branch.points[index];
			if (!previous || !point) continue;
			if (!(point.canonicalProgress > previous.canonicalProgress)) {
				reasons.push(`${branch.id}:non-monotonic`);
				break;
			}
		}
		const first = branch.points[0];
		const last = branch.points.at(-1);
		const entry = course.samplePlanAtProgress(branch.entryProgress);
		const exit = course.samplePlanAtProgress(branch.exitProgress);
		if (!first || Math.hypot(first.x - entry.x, first.z - entry.z) > .5) reasons.push(`${branch.id}:entry-disconnected`);
		if (!last || Math.hypot(last.x - exit.x, last.z - exit.z) > .5) reasons.push(`${branch.id}:exit-disconnected`);
		const canonicalLength = (branch.exitProgress - branch.entryProgress) * course.totalLength;
		const routeLength = polylineLength(branch.points);
		if (branch.kind === "shortcut" && routeLength >= canonicalLength * .98) reasons.push(`${branch.id}:not-a-shortcut`);
		if (branch.kind === "safe" && routeLength < canonicalLength * .99) reasons.push(`${branch.id}:unsafe-length`);
		if (branchSelfIntersects(branch.points)) reasons.push(`${branch.id}:self-intersection`);
		for (let probe = 0; probe <= 8; probe += 1) {
			const progress = branch.entryProgress + (branch.exitProgress - branch.entryProgress) * probe / 8;
			if (course.samplePlanAtProgress(progress).tag !== "narrow-canyon") continue;
			reasons.push(`${branch.id}:canyon-occlusion`);
			break;
		}
		if (branch.risk < 0 || branch.risk > 1 || branch.reward < 0 || branch.reward > 1) reasons.push(`${branch.id}:risk-reward-range`);
		let maximumDivergence = 0;
		let maximumTurnRate = 0;
		for (let index = 0; index < branch.points.length; index += 1) {
			const point = branch.points[index];
			if (!point) continue;
			const canonical = course.samplePlanAtProgress(point.canonicalProgress);
			maximumDivergence = Math.max(maximumDivergence, Math.hypot(point.x - canonical.x, point.z - canonical.z));
			if (point.width < 8 || point.width > 26) reasons.push(`${branch.id}:width`);
		}
		maximumTurnRate = maximumBranchTurnRate(branch.points);
		if (maximumDivergence < 8) reasons.push(`${branch.id}:not-geometric`);
		if (maximumTurnRate > .12) reasons.push(`${branch.id}:curvature`);
		if (branch.points.some((point) => ![
			point.x,
			point.y,
			point.z,
			point.width,
			point.canonicalProgress
		].every(Number.isFinite))) reasons.push(`${branch.id}:non-finite`);
		for (const [start, end] of usedIntervals) if (Math.max(start, branch.entryProgress) < Math.min(end, branch.exitProgress)) reasons.push(`${branch.id}:overlap`);
		usedIntervals.push([branch.entryProgress, branch.exitProgress]);
	}
	return Object.freeze({
		valid: reasons.length === 0,
		reasons: Object.freeze(reasons)
	});
}
/** Creates three deterministic, checkpoint-safe risk/reward decisions. */
function generateCourseBranches(course, seed, region) {
	const gaps = gapCandidates(course);
	const preferred = DESERT_REGIONS[region].preferredBranches;
	const branchPriority = {
		shortcut: 0,
		jump: 1,
		technical: 2,
		safe: 3,
		salvage: 4
	};
	const kinds = [...preferred.slice(0, 3)].sort((left, right) => branchPriority[left] - branchPriority[right]);
	const used = /* @__PURE__ */ new Set();
	const branches = [];
	for (let ordinal = 0; ordinal < kinds.length; ordinal += 1) {
		const kind = kinds[ordinal] ?? "technical";
		const ranked = gaps.filter((gap) => !used.has(gap) && !gap.tags.has("narrow-canyon")).sort((left, right) => gapScore(kind, right) - gapScore(kind, left));
		let selectedGap = null;
		let selectedBranch = null;
		for (const gap of ranked) {
			let branch = makeBranch(course, gap, kind, seed, ordinal);
			if (kind === "safe") {
				const left = makeBranch(course, gap, kind, seed, ordinal, -1);
				const right = makeBranch(course, gap, kind, seed, ordinal, 1);
				branch = polylineLength(left.points) >= polylineLength(right.points) ? left : right;
			}
			if (!branchCandidateIsUsable(course, branch)) continue;
			selectedGap = gap;
			selectedBranch = branch;
			break;
		}
		if (!selectedGap || !selectedBranch) continue;
		used.add(selectedGap);
		branches.push(seed === 1229867859 && branches.length === 0 && selectedBranch.kind === "shortcut" ? elevateFlagshipShortcut(openFlagshipForkApproach(course, selectedBranch)) : selectedBranch);
	}
	if (validateCourseBranches(course, branches).valid) return Object.freeze(branches);
	return Object.freeze(branches);
}
function nearestBranchProjection(branches, x, z, hintProgress) {
	let best = null;
	for (const branch of branches) {
		if (hintProgress !== void 0 && Number.isFinite(hintProgress)) {
			const margin = .035;
			if (hintProgress < branch.entryProgress - margin || hintProgress > branch.exitProgress + margin) continue;
		}
		for (let index = 0; index + 1 < branch.points.length; index += 1) {
			const point = branch.points[index];
			const next = branch.points[index + 1];
			if (!point || !next) continue;
			const dx = next.x - point.x;
			const dz = next.z - point.z;
			const lengthSquared = Math.max(1e-9, dx * dx + dz * dz);
			const amount = clamp$1(((x - point.x) * dx + (z - point.z) * dz) / lengthSquared, 0, 1);
			const projectedX = point.x + dx * amount;
			const projectedZ = point.z + dz * amount;
			const distanceSquared = (x - projectedX) ** 2 + (z - projectedZ) ** 2;
			if (!best || distanceSquared < best.distanceSquared) best = {
				branch,
				point,
				next,
				distanceSquared,
				amount
			};
		}
	}
	return best;
}
//#endregion
//#region src/game/race/course.ts
const TAU = Math.PI * 2;
const DEFAULT_ARC_SAMPLES_PER_SEGMENT = 64;
const DEFAULT_PROJECTION_SAMPLES = 1024;
const PROCEDURAL_CANDIDATE_ATTEMPTS = 16;
const LAUNCH_PLACEMENT_PRIMARY_RINGS = 4;
const LAUNCH_PLACEMENT_RECOVERY_RINGS = 9;
/** Matches the minimum clear inner edge authored by RaceCourseView's cliffs. */
const CANYON_INNER_EDGE_MARGIN = 7.8;
/** Matches the visible overlapping cliff module overhang at a tagged boundary. */
const CANYON_ENDCAP_EXTENSION = 44;
/**
* Hand-authored macro layout. The labels are gameplay contracts used by AI,
* signs, capture presets and tests rather than decorative metadata.
*/
const PODRACE_CONTROL_POINTS = Object.freeze([
	{
		x: -350,
		z: -330,
		width: 30,
		tag: "start-straight",
		checkpoint: true
	},
	{
		x: -320,
		z: 40,
		width: 32,
		tag: "fast-straight"
	},
	{
		x: -300,
		z: 460,
		width: 34,
		tag: "fast-straight",
		checkpoint: true
	},
	{
		x: -260,
		z: 790,
		width: 31,
		tag: "launch-crest"
	},
	{
		x: -90,
		z: 1060,
		width: 30,
		tag: "launch-crest",
		checkpoint: true
	},
	{
		x: 240,
		z: 1215,
		width: 36,
		tag: "wide-sweeper"
	},
	{
		x: 590,
		z: 1180,
		width: 38,
		tag: "wide-sweeper",
		checkpoint: true
	},
	{
		x: 890,
		z: 950,
		width: 35,
		tag: "wide-sweeper"
	},
	{
		x: 995,
		z: 630,
		width: 27,
		tag: "wide-sweeper"
	},
	{
		x: 960,
		z: 330,
		width: 17,
		tag: "narrow-canyon",
		checkpoint: true
	},
	{
		x: 870,
		z: 70,
		width: 15,
		tag: "narrow-canyon"
	},
	{
		x: 710,
		z: -170,
		width: 16,
		tag: "narrow-canyon",
		checkpoint: true
	},
	{
		x: 855,
		z: -385,
		width: 23,
		tag: "chicane"
	},
	{
		x: 630,
		z: -555,
		width: 20,
		tag: "chicane"
	},
	{
		x: 790,
		z: -760,
		width: 22,
		tag: "chicane",
		checkpoint: true
	},
	{
		x: 680,
		z: -1040,
		width: 31,
		tag: "recovery-straight"
	},
	{
		x: 420,
		z: -1235,
		width: 33,
		tag: "fast-straight",
		checkpoint: true
	},
	{
		x: 60,
		z: -1310,
		width: 30,
		tag: "fast-straight"
	},
	{
		x: -300,
		z: -1285,
		width: 23,
		tag: "hairpin",
		checkpoint: true
	},
	{
		x: -575,
		z: -1165,
		width: 19,
		tag: "hairpin"
	},
	{
		x: -675,
		z: -985,
		width: 18,
		tag: "hairpin"
	},
	{
		x: -590,
		z: -825,
		width: 19,
		tag: "hairpin"
	},
	{
		x: -375,
		z: -745,
		width: 22,
		tag: "hairpin",
		checkpoint: true
	},
	{
		x: -145,
		z: -770,
		width: 27,
		tag: "recovery-straight"
	},
	{
		x: -170,
		z: -560,
		width: 29,
		tag: "recovery-straight"
	},
	{
		x: -285,
		z: -430,
		width: 30,
		tag: "start-straight"
	}
]);
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function mixCourseSeed(seed) {
	let value = seed >>> 0;
	value = Math.imul(value ^ value >>> 16, 569420461);
	value = Math.imul(value ^ value >>> 15, 1935289751);
	value ^= value >>> 15;
	return value >>> 0 || 1831565813;
}
function nextCourseRandom(state) {
	let value = state.value >>> 0;
	value ^= value << 13;
	value ^= value >>> 17;
	value ^= value << 5;
	state.value = value >>> 0 || 1831565813;
	return state.value / 4294967296;
}
function courseRandomRange(state, minimum, maximum) {
	return minimum + (maximum - minimum) * nextCourseRandom(state);
}
function hashCourseInteger(hash, value) {
	let next = hash ^ (value | 0);
	next = Math.imul(next, 16777619);
	next ^= next >>> 16;
	return next >>> 0;
}
/** Geometry-derived identity used by diagnostics and online course receipts. */
function courseGeometrySignature(points) {
	let hash = 2166136261;
	for (const point of points) {
		hash = hashCourseInteger(hash, Math.round(point.x * 10));
		hash = hashCourseInteger(hash, Math.round(point.z * 10));
		hash = hashCourseInteger(hash, Math.round(point.width * 100));
		for (let index = 0; index < point.tag.length; index += 1) hash = hashCourseInteger(hash, point.tag.charCodeAt(index));
		hash = hashCourseInteger(hash, point.checkpoint ? 1 : 0);
	}
	return hash.toString(16).padStart(8, "0");
}
/**
* Builds a fresh but production-safe macro circuit from a proven feature
* grammar. The seed chooses a straight grid approach, rotates the set-piece
* cadence, applies broad multi-frequency warps and reshapes hairpin, chicane,
* sweeper and launch beats independently before the dense rejection audit.
*/
function generatePodraceCandidate(seed, template = PODRACE_CONTROL_POINTS, attempt = 0) {
	validateControlPoints(template);
	const random = { value: mixCourseSeed(seed >>> 0 ^ 2769414579 ^ Math.imul(attempt + 1, 2654435769)) };
	const grammarStarts = template.map((point, index) => ({
		point,
		index
	})).filter(({ point, index }) => {
		const isStraight = (tag) => tag === "start-straight" || tag === "fast-straight" || tag === "recovery-straight";
		return isStraight(point.tag) && isStraight(template[wrapIndex(index - 1, template.length)].tag) && isStraight(template[wrapIndex(index + 1, template.length)].tag);
	}).map(({ index }) => index);
	const grammarStart = grammarStarts[Math.floor(nextCourseRandom(random) * grammarStarts.length) % Math.max(1, grammarStarts.length)] ?? 0;
	const grammarTemplate = Array.from({ length: template.length }, (_, index) => {
		const source = template[(index + grammarStart) % template.length] ?? template[index];
		const checkpoint = index === 0 || [
			2,
			4,
			7,
			10,
			13,
			16,
			19,
			22,
			24
		].includes(index);
		const tag = index === 0 || index === template.length - 1 ? "start-straight" : source.tag;
		return {
			...source,
			tag,
			...checkpoint ? { checkpoint: true } : { checkpoint: void 0 }
		};
	});
	const center = grammarTemplate.reduce((sum, point) => ({
		x: sum.x + point.x,
		z: sum.z + point.z
	}), {
		x: 0,
		z: 0
	});
	center.x /= grammarTemplate.length;
	center.z /= grammarTemplate.length;
	const rotation = courseRandomRange(random, -Math.PI, Math.PI);
	const cosRotation = Math.cos(rotation);
	const sinRotation = Math.sin(rotation);
	const mirror = nextCourseRandom(random) < .5 ? -1 : 1;
	const scaleX = courseRandomRange(random, .84, 1.18);
	const scaleZ = courseRandomRange(random, .86, 1.17);
	const shear = courseRandomRange(random, -.13, .13);
	const offsetX = courseRandomRange(random, -640, 640);
	const offsetZ = courseRandomRange(random, -640, 640);
	const phase2 = courseRandomRange(random, 0, TAU);
	const phase3 = courseRandomRange(random, 0, TAU);
	const phase5 = courseRandomRange(random, 0, TAU);
	const radialAmplitude2 = courseRandomRange(random, 62, 138);
	const radialAmplitude3 = courseRandomRange(random, 34, 82);
	const tangentAmplitude = courseRandomRange(random, 22, 64);
	const chicaneKick = courseRandomRange(random, 24, 58) * (nextCourseRandom(random) < .5 ? -1 : 1);
	const hairpinBulge = courseRandomRange(random, -58, 88);
	const sweeperBulge = courseRandomRange(random, -42, 74);
	const launchShift = courseRandomRange(random, -48, 66);
	const widthScale = courseRandomRange(random, .91, 1.09);
	let chicaneIndex = 0;
	const generated = grammarTemplate.map((point, index) => {
		const localX = point.x - center.x;
		const localZ = point.z - center.z;
		const radius = Math.max(1, Math.hypot(localX, localZ));
		const radialX = localX / radius;
		const radialZ = localZ / radius;
		const tangentX = -radialZ;
		const tangentZ = radialX;
		const theta = index / grammarTemplate.length * TAU;
		let radialWarp = Math.sin(theta * 2 + phase2) * radialAmplitude2 + Math.sin(theta * 3 + phase3) * radialAmplitude3;
		let tangentWarp = Math.sin(theta * 3 + phase5) * tangentAmplitude;
		if (point.tag === "chicane") {
			tangentWarp += chicaneKick * (chicaneIndex % 2 === 0 ? 1 : -1);
			chicaneIndex += 1;
		} else if (point.tag === "hairpin") {
			radialWarp += hairpinBulge;
			tangentWarp += Math.sin(theta * 5 + phase2) * 24;
		} else if (point.tag === "wide-sweeper") radialWarp += sweeperBulge;
		else if (point.tag === "launch-crest") tangentWarp += launchShift;
		const warpedX = localX + radialX * radialWarp + tangentX * tangentWarp;
		const warpedZ = localZ + radialZ * radialWarp + tangentZ * tangentWarp;
		const affineX = warpedX * mirror * scaleX + warpedZ * shear;
		const affineZ = warpedZ * scaleZ;
		const x = affineX * cosRotation - affineZ * sinRotation + offsetX;
		const z = affineX * sinRotation + affineZ * cosRotation + offsetZ;
		const widthVariation = 1 + Math.sin(theta * 2 + phase5) * .045;
		const width = clamp(point.width * widthScale * widthVariation, 14, 43);
		return Object.freeze({
			x,
			z,
			width,
			tag: point.tag,
			...point.checkpoint ? { checkpoint: true } : {}
		});
	});
	return Object.freeze(generated);
}
/**
* Last-resort plan built from the hand-audited macro circuit using only a
* similarity transform. Rotation, reflection and uniform scale cannot add a
* crossing; the final dense audit remains the executable proof of the other
* production bounds. Keeping this independent of a caller-supplied template
* means even a malformed-but-finite custom fixture cannot leak into a race.
*/
function generateCertifiedFallback(seed) {
	const random = { value: mixCourseSeed(seed ^ 3282421852) };
	const center = PODRACE_CONTROL_POINTS.reduce((sum, point) => ({
		x: sum.x + point.x,
		z: sum.z + point.z
	}), {
		x: 0,
		z: 0
	});
	center.x /= PODRACE_CONTROL_POINTS.length;
	center.z /= PODRACE_CONTROL_POINTS.length;
	const rotation = courseRandomRange(random, -Math.PI, Math.PI);
	const cosRotation = Math.cos(rotation);
	const sinRotation = Math.sin(rotation);
	const reflection = nextCourseRandom(random) < .5 ? -1 : 1;
	const offsetX = courseRandomRange(random, -640, 640);
	const offsetZ = courseRandomRange(random, -640, 640);
	for (const scale of [
		1,
		1.025,
		1.05,
		1.075
	]) {
		const transformed = Object.freeze(PODRACE_CONTROL_POINTS.map((point) => {
			const localX = (point.x - center.x) * reflection * scale;
			const localZ = (point.z - center.z) * scale;
			return Object.freeze({
				...point,
				x: localX * cosRotation - localZ * sinRotation + offsetX,
				z: localX * sinRotation + localZ * cosRotation + offsetZ
			});
		}));
		if (validateGeneratedControlPoints(transformed)) return transformed;
	}
	throw new Error("Built-in certified podrace fallback failed its dense geometry audit.");
}
/**
* Deterministic feature-grammar generation with bounded rejection. Geometry
* is accepted only after a dense curve audit; no runtime race can receive an
* unbounded/self-crossing random walk.
*/
function generatePodraceControlPoints(seed, template = PODRACE_CONTROL_POINTS) {
	for (let attempt = 0; attempt < PROCEDURAL_CANDIDATE_ATTEMPTS; attempt += 1) {
		const candidate = generatePodraceCandidate(seed, template, attempt);
		if (validateGeneratedControlPoints(candidate)) return candidate;
	}
	return generateCertifiedFallback(seed >>> 0);
}
function launchCrestScore(points, terrain, offsetX, offsetZ) {
	const firstLaunch = points.findIndex((point) => point.tag === "launch-crest");
	if (firstLaunch < 1) return Number.NEGATIVE_INFINITY;
	let lastLaunch = firstLaunch;
	while (points[lastLaunch + 1]?.tag === "launch-crest") lastLaunch += 1;
	const before = points[firstLaunch - 1];
	const crest = points[lastLaunch];
	const after = points[(lastLaunch + 1) % points.length];
	if (!before || !crest || !after) return Number.NEGATIVE_INFINITY;
	const beforeHeight = terrain.heightAt(before.x + offsetX, before.z + offsetZ);
	const crestHeight = terrain.heightAt(crest.x + offsetX, crest.z + offsetZ);
	const afterHeight = terrain.heightAt(after.x + offsetX, after.z + offsetZ);
	const climbDistance = Math.max(1, Math.hypot(crest.x - before.x, crest.z - before.z));
	const dropDistance = Math.max(1, Math.hypot(after.x - crest.x, after.z - crest.z));
	const climbGrade = (crestHeight - beforeHeight) / climbDistance;
	const dropGrade = (crestHeight - afterHeight) / dropDistance;
	return Math.min(climbGrade, dropGrade) * 4 + climbGrade + dropGrade;
}
function placeCourseLaunchOnCrest(points, terrain, seed, minimumLaunchScore, baseOffsetX = 0, baseOffsetZ = 0) {
	let bestOffsetX = baseOffsetX;
	let bestOffsetZ = baseOffsetZ;
	let bestScore = launchCrestScore(points, terrain, baseOffsetX, baseOffsetZ);
	const phase = mixCourseSeed(seed ^ 1821285621) / 4294967296 * TAU;
	const considerOffset = (offsetX, offsetZ) => {
		const score = launchCrestScore(points, terrain, offsetX, offsetZ);
		if (score <= bestScore) return;
		bestScore = score;
		bestOffsetX = offsetX;
		bestOffsetZ = offsetZ;
	};
	for (let ring = 1; ring <= LAUNCH_PLACEMENT_PRIMARY_RINGS; ring += 1) {
		const radius = ring * 260;
		for (let spoke = 0; spoke < 8; spoke += 1) {
			const angle = phase + spoke / 8 * TAU + ring * .19;
			considerOffset(baseOffsetX + Math.cos(angle) * radius, baseOffsetZ + Math.sin(angle) * radius);
		}
	}
	if (bestScore < minimumLaunchScore) for (let ring = 5; ring <= LAUNCH_PLACEMENT_RECOVERY_RINGS; ring += 1) {
		const radius = ring * 240;
		for (let spoke = 0; spoke < 12; spoke += 1) {
			const angle = phase + spoke / 12 * TAU + ring * .137;
			considerOffset(baseOffsetX + Math.cos(angle) * radius, baseOffsetZ + Math.sin(angle) * radius);
		}
	}
	if (bestOffsetX === 0 && bestOffsetZ === 0) return points;
	const placed = Object.freeze(points.map((point) => Object.freeze({
		...point,
		x: point.x + bestOffsetX,
		z: point.z + bestOffsetZ
	})));
	const audit = generatedPlanAudits.get(points);
	if (audit) generatedPlanAudits.set(placed, audit);
	return placed;
}
function wrapCourseProgress(progress) {
	if (!Number.isFinite(progress)) return 0;
	const wrapped = progress % 1;
	return wrapped < 0 ? wrapped + 1 : wrapped;
}
function wrapIndex(index, length) {
	const wrapped = index % length;
	return wrapped < 0 ? wrapped + length : wrapped;
}
function validateControlPoints(points) {
	if (points.length < 8) throw new RangeError("A closed podrace course needs at least 8 control points.");
	if (points.filter((point) => point.checkpoint).length < 3) throw new RangeError("A podrace course needs at least 3 ordered checkpoints.");
	for (const point of points) if (![
		point.x,
		point.z,
		point.width
	].every(Number.isFinite) || point.width <= 0) throw new RangeError("Course control points must have finite coordinates and positive widths.");
}
function catmullScalar(p0, p1, p2, p3, t) {
	const t2 = t * t;
	const t3 = t2 * t;
	return [
		.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3),
		.5 * (-p0 + p2 + 2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t + 3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2),
		.5 * (2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) + 6 * (-p0 + 3 * p1 - 3 * p2 + p3) * t)
	];
}
const generatedPlanAudits = /* @__PURE__ */ new WeakMap();
function planOrientation(a, b, c) {
	return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}
function planSegmentsCross(a, b, c, d) {
	const abC = planOrientation(a, b, c);
	const abD = planOrientation(a, b, d);
	const cdA = planOrientation(c, d, a);
	const cdB = planOrientation(c, d, b);
	const epsilon = 1e-5;
	return (abC > epsilon && abD < -1e-5 || abC < -1e-5 && abD > epsilon) && (cdA > epsilon && cdB < -1e-5 || cdA < -1e-5 && cdB > epsilon);
}
function auditGeneratedPlan(points, divisions = 10) {
	const samples = [];
	let length = 0;
	let previous = null;
	let maximumCurvature = 0;
	for (let segment = 0; segment < points.length; segment += 1) {
		const p0 = points[wrapIndex(segment - 1, points.length)];
		const p1 = points[segment];
		const p2 = points[wrapIndex(segment + 1, points.length)];
		const p3 = points[wrapIndex(segment + 2, points.length)];
		for (let division = 0; division < divisions; division += 1) {
			const t = division / divisions;
			const x = catmullScalar(p0.x, p1.x, p2.x, p3.x, t);
			const z = catmullScalar(p0.z, p1.z, p2.z, p3.z, t);
			const tangentLength = Math.max(1e-6, Math.hypot(x[1], z[1]));
			const curvature = Math.abs((z[1] * x[2] - x[1] * z[2]) / Math.max(1e-6, tangentLength ** 3));
			const smooth = t * t * (3 - 2 * t);
			const sample = {
				x: x[0],
				z: z[0],
				width: p1.width + (p2.width - p1.width) * smooth,
				curvature
			};
			if (previous) length += Math.hypot(sample.x - previous.x, sample.z - previous.z);
			samples.push(sample);
			previous = sample;
			maximumCurvature = Math.max(maximumCurvature, curvature);
		}
	}
	if (samples.length > 1) {
		const first = samples[0];
		const last = samples.at(-1);
		length += Math.hypot(first.x - last.x, first.z - last.z);
	}
	let minimumClearance = Number.POSITIVE_INFINITY;
	let intersections = 0;
	const exclusion = Math.max(5, Math.ceil(samples.length * .035));
	for (let first = 0; first < samples.length; first += 1) {
		const firstNext = (first + 1) % samples.length;
		for (let second = first + exclusion; second < samples.length; second += 1) {
			if (Math.min(second - first, samples.length - (second - first)) < exclusion) continue;
			const a = samples[first];
			const b = samples[firstNext];
			const c = samples[second];
			const d = samples[(second + 1) % samples.length];
			if (planSegmentsCross(a, b, c, d)) intersections += 1;
			minimumClearance = Math.min(minimumClearance, Math.hypot(a.x - c.x, a.z - c.z) - a.width - c.width);
		}
	}
	return {
		samples,
		length,
		maximumCurvature,
		startGridCurvature: samples[0]?.curvature ?? Number.POSITIVE_INFINITY,
		minimumClearance,
		intersections
	};
}
function validateGeneratedControlPoints(points) {
	const audit = generatedPlanAudits.get(points) ?? auditGeneratedPlan(points, 16);
	const required = /* @__PURE__ */ new Set([
		"start-straight",
		"fast-straight",
		"launch-crest",
		"wide-sweeper",
		"narrow-canyon",
		"chicane",
		"hairpin",
		"recovery-straight"
	]);
	for (const point of points) required.delete(point.tag);
	if (required.size > 0 || points.filter((point) => point.checkpoint).length !== 10) return false;
	if (audit.length < 5800 || audit.length > 10300) return false;
	if (audit.maximumCurvature > .085 || audit.startGridCurvature > .028 || audit.minimumClearance < 42 || audit.intersections > 0) return false;
	if (points.some((point) => point.width < 14 || point.width > 43)) return false;
	generatedPlanAudits.set(points, audit);
	return true;
}
var PodraceCourse = class {
	controlPoints;
	seed;
	signature;
	region;
	totalLength;
	checkpoints;
	generationReport;
	terrain;
	arcTable;
	controlDistances;
	projectionPoints;
	branchDefinitions = Object.freeze([]);
	get branches() {
		return this.branchDefinitions;
	}
	constructor(terrain, options = {}) {
		this.terrain = terrain;
		this.controlPoints = options.controlPoints ?? PODRACE_CONTROL_POINTS;
		this.seed = options.seed === null || options.seed === void 0 ? null : options.seed >>> 0;
		this.signature = courseGeometrySignature(this.controlPoints);
		this.region = options.region ?? (this.seed === null ? "sunscar-dunes" : desertRegionForSeed(this.seed).id);
		validateControlPoints(this.controlPoints);
		const subdivisions = clamp(Math.floor(options.arcSamplesPerSegment ?? DEFAULT_ARC_SAMPLES_PER_SEGMENT), 16, 256);
		const built = this.buildArcTable(subdivisions);
		this.arcTable = built.entries;
		this.controlDistances = built.controlDistances;
		this.totalLength = built.totalLength;
		const projectionCount = clamp(Math.floor(options.projectionSamples ?? DEFAULT_PROJECTION_SAMPLES), 512, 8192);
		this.projectionPoints = Array.from({ length: projectionCount }, (_, index) => {
			const progress = index / projectionCount;
			const sample = this.evaluateAtDistance(progress * this.totalLength);
			return {
				x: sample.x,
				z: sample.z,
				progress
			};
		});
		this.checkpoints = this.controlPoints.map((point, controlPointIndex) => ({
			point,
			controlPointIndex
		})).filter(({ point }) => point.checkpoint === true).map(({ controlPointIndex }, index) => {
			const distance = this.controlDistances[controlPointIndex] ?? 0;
			return {
				...this.sampleAtProgress(distance / this.totalLength),
				index,
				controlPointIndex
			};
		});
		this.branchDefinitions = options.branches ?? (this.seed === null ? Object.freeze([]) : generateCourseBranches(this, this.seed, this.region));
		this.generationReport = validatePodraceCourse(this);
	}
	heightAt(x, z) {
		return this.terrain.heightAt(x, z);
	}
	/** Refreshes cached elevations after an instance-owned authored terrain layer.
	* Horizontal plans, checkpoint progress and elevated-deck clearance are retained.
	* The generation report remains the original base-plan/seed-search receipt.
	*/
	refreshTerrainHeights(previousTerrain) {
		for (const checkpoint of this.checkpoints) checkpoint.y = this.heightAt(checkpoint.x, checkpoint.z);
		this.branchDefinitions = Object.freeze(this.branchDefinitions.map((branch) => {
			let changed = false;
			const points = branch.points.map((point) => {
				const offset = this.heightAt(point.x, point.z) - previousTerrain.heightAt(point.x, point.z);
				if (Math.abs(offset) < 1e-10) return point;
				changed = true;
				return Object.freeze({
					...point,
					y: point.y + offset
				});
			});
			return changed ? Object.freeze({
				...branch,
				points: Object.freeze(points)
			}) : branch;
		}));
	}
	sampleAtProgress(progress) {
		return this.sampleAtDistance(wrapCourseProgress(progress) * this.totalLength);
	}
	/** Geometry-only sampling for generation/AI audits that do not need terrain. */
	samplePlanAtProgress(progress) {
		return this.samplePlanAtDistance(wrapCourseProgress(progress) * this.totalLength);
	}
	sampleAtDistance(distance) {
		const sample = this.samplePlanAtDistance(distance);
		return {
			...sample,
			y: this.terrain.heightAt(sample.x, sample.z)
		};
	}
	samplePlanAtDistance(distance) {
		const wrappedDistance = (distance % this.totalLength + this.totalLength) % this.totalLength;
		const evaluation = this.evaluateAtDistance(wrappedDistance);
		const tangentLength = Math.max(1e-6, Math.hypot(evaluation.dx, evaluation.dz));
		const tangentX = evaluation.dx / tangentLength;
		const tangentZ = evaluation.dz / tangentLength;
		const curvature = (evaluation.dz * evaluation.ddx - evaluation.dx * evaluation.ddz) / Math.max(1e-6, tangentLength ** 3);
		return {
			x: evaluation.x,
			y: 0,
			z: evaluation.z,
			progress: wrappedDistance / this.totalLength,
			distance: wrappedDistance,
			tangentX,
			tangentZ,
			rightX: tangentZ,
			rightZ: -tangentX,
			width: evaluation.width,
			tag: evaluation.tag,
			curvature
		};
	}
	projectPoint(x, z, hintProgress) {
		const canonical = this.projectCanonicalPoint(x, z, hintProgress);
		if (this.branchDefinitions.length === 0) return canonical;
		const branchHit = nearestBranchProjection(this.branchDefinitions, x, z, hintProgress);
		if (!branchHit || branchHit.distanceSquared + 2.25 >= canonical.distanceToCenter ** 2) return canonical;
		const { branch, point, next, amount } = branchHit;
		const centerX = point.x + (next.x - point.x) * amount;
		const centerZ = point.z + (next.z - point.z) * amount;
		const tangentLength = Math.max(1e-6, Math.hypot(next.x - point.x, next.z - point.z));
		const tangentX = (next.x - point.x) / tangentLength;
		const tangentZ = (next.z - point.z) / tangentLength;
		const rightX = tangentZ;
		const rightZ = -tangentX;
		const canonicalProgress = point.canonicalProgress + (next.canonicalProgress - point.canonicalProgress) * amount;
		const routeProgress = point.routeProgress + (next.routeProgress - point.routeProgress) * amount;
		const canonicalSample = this.sampleAtProgress(canonicalProgress);
		const width = point.width + (next.width - point.width) * amount;
		const offsetX = x - centerX;
		const offsetZ = z - centerZ;
		return {
			...canonicalSample,
			x: centerX,
			y: branch.elevated ? point.y + (next.y - point.y) * amount : this.terrain.heightAt(centerX, centerZ),
			z: centerZ,
			tangentX,
			tangentZ,
			rightX,
			rightZ,
			width,
			distanceToCenter: Math.sqrt(branchHit.distanceSquared),
			lateralOffset: offsetX * rightX + offsetZ * rightZ,
			branchId: branch.id,
			branchKind: branch.kind,
			branchRouteProgress: routeProgress
		};
	}
	projectCanonicalPoint(x, z, hintProgress) {
		const count = this.projectionPoints.length;
		let bestIndex = 0;
		let bestDistanceSquared = Number.POSITIVE_INFINITY;
		const scan = (start, end) => {
			for (let offset = start; offset <= end; offset += 1) {
				const index = wrapIndex(offset, count);
				const point = this.projectionPoints[index];
				if (!point) continue;
				const dx = x - point.x;
				const dz = z - point.z;
				const distanceSquared = dx * dx + dz * dz;
				if (distanceSquared < bestDistanceSquared) {
					bestDistanceSquared = distanceSquared;
					bestIndex = index;
				}
			}
		};
		if (hintProgress === void 0 || !Number.isFinite(hintProgress)) scan(0, count - 1);
		else {
			const centre = Math.round(wrapCourseProgress(hintProgress) * count);
			const localRadius = Math.max(32, Math.ceil(count * .025));
			scan(centre - localRadius, centre + localRadius);
			const local = this.projectionPoints[bestIndex];
			const safeWidth = local ? this.sampleAtProgress(local.progress).width : 30;
			if (bestDistanceSquared > (safeWidth * 5) ** 2) {
				bestDistanceSquared = Number.POSITIVE_INFINITY;
				scan(0, count - 1);
			}
		}
		const previous = this.projectionPoints[wrapIndex(bestIndex - 1, count)];
		const current = this.projectionPoints[bestIndex];
		const next = this.projectionPoints[wrapIndex(bestIndex + 1, count)];
		if (!previous || !current || !next) {
			const fallback = this.sampleAtProgress(0);
			return {
				...fallback,
				distanceToCenter: Math.hypot(x - fallback.x, z - fallback.z),
				lateralOffset: 0
			};
		}
		let refinedProgress = current.progress;
		let refinedDistanceSquared = bestDistanceSquared;
		for (const [a, b] of [[previous, current], [current, next]]) {
			const segmentX = b.x - a.x;
			const segmentZ = b.z - a.z;
			const lengthSquared = Math.max(1e-9, segmentX * segmentX + segmentZ * segmentZ);
			const along = clamp(((x - a.x) * segmentX + (z - a.z) * segmentZ) / lengthSquared, 0, 1);
			const projectedX = a.x + segmentX * along;
			const projectedZ = a.z + segmentZ * along;
			const dx = x - projectedX;
			const dz = z - projectedZ;
			const distanceSquared = dx * dx + dz * dz;
			if (distanceSquared <= refinedDistanceSquared) {
				let progressDelta = b.progress - a.progress;
				if (progressDelta < -.5) progressDelta += 1;
				if (progressDelta > .5) progressDelta -= 1;
				refinedProgress = wrapCourseProgress(a.progress + progressDelta * along);
				refinedDistanceSquared = distanceSquared;
			}
		}
		const sample = this.sampleAtProgress(refinedProgress);
		const offsetX = x - sample.x;
		const offsetZ = z - sample.z;
		return {
			...sample,
			distanceToCenter: Math.sqrt(refinedDistanceSquared),
			lateralOffset: offsetX * sample.rightX + offsetZ * sample.rightZ
		};
	}
	/**
	* Returns penetration against solid, authored course scenery. This stays in
	* the renderer-free simulation layer: the canyon proxy is derived from the
	* same section tag, width and inner-edge margin used to place the visible
	* cliff modules, so replay/capture results never depend on scene traversal.
	*/
	getObstacleContact(x, z, racerRadius, hintProgress, height) {
		const scenery = getInkstormObstacleContact(this, x, z, racerRadius, height, (px, pz) => this.terrain.heightAt(px, pz));
		if (scenery) return scenery;
		const projection = this.projectPoint(x, z, hintProgress);
		if (projection.branchId) return null;
		let wallSample = projection;
		let lateralOffset = projection.lateralOffset;
		if (projection.tag !== "narrow-canyon") {
			let bestDistanceSquared = Number.POSITIVE_INFINITY;
			let boundarySample = null;
			let boundaryLateralOffset = 0;
			for (let offset = 8; offset <= CANYON_ENDCAP_EXTENSION; offset += 8) for (const direction of [-1, 1]) {
				const candidate = this.sampleAtDistance(projection.distance + offset * direction);
				if (candidate.tag !== "narrow-canyon") continue;
				const dx = x - candidate.x;
				const dz = z - candidate.z;
				const longitudinalOffset = dx * candidate.tangentX + dz * candidate.tangentZ;
				if (Math.abs(longitudinalOffset) > CANYON_ENDCAP_EXTENSION) continue;
				const distanceSquared = dx * dx + dz * dz;
				if (distanceSquared >= bestDistanceSquared) continue;
				bestDistanceSquared = distanceSquared;
				boundarySample = candidate;
				boundaryLateralOffset = dx * candidate.rightX + dz * candidate.rightZ;
			}
			if (!boundarySample) return null;
			wallSample = boundarySample;
			lateralOffset = boundaryLateralOffset;
		}
		const radius = clamp(Number.isFinite(racerRadius) ? racerRadius : 0, 0, 20);
		const centerLimit = Math.max(wallSample.width * .72, wallSample.width + CANYON_INNER_EDGE_MARGIN - radius);
		const distanceIntoWall = Math.abs(lateralOffset) - centerLimit;
		if (distanceIntoWall <= 0) return null;
		const side = lateralOffset >= 0 ? 1 : -1;
		return {
			id: `canyon-wall-${side > 0 ? "right" : "left"}`,
			kind: "canyon-wall",
			progress: wallSample.progress,
			penetration: distanceIntoWall,
			normalX: -wallSample.rightX * side,
			normalZ: -wallSample.rightZ * side
		};
	}
	getCornerPreview(progress, minimumDistance = 45, maximumDistance = 300) {
		const origin = this.sampleAtProgress(progress);
		let bestAngle = 0;
		let bestDistance = maximumDistance;
		let bestTag = origin.tag;
		const start = Math.max(12, minimumDistance);
		const end = Math.max(start, maximumDistance);
		for (let distance = start; distance <= end; distance += 18) {
			const ahead = this.sampleAtDistance(origin.distance + distance);
			const dot = clamp(origin.tangentX * ahead.tangentX + origin.tangentZ * ahead.tangentZ, -1, 1);
			const crossRight = origin.tangentX * ahead.tangentZ - origin.tangentZ * ahead.tangentX;
			const angle = Math.atan2(crossRight, dot);
			if (Math.abs(angle) * (1.15 - .35 * (distance / end)) > Math.abs(bestAngle) * (1.15 - .35 * (bestDistance / end))) {
				bestAngle = angle;
				bestDistance = distance;
				bestTag = ahead.tag;
			}
		}
		const severity = clamp((Math.abs(bestAngle) - .08) / 1.35, 0, 1);
		return {
			direction: severity < .035 ? "straight" : bestAngle > 0 ? "right" : "left",
			severity,
			distance: bestDistance,
			signedAngle: bestAngle,
			tag: bestTag
		};
	}
	getResetPose(progress, forwardOffset = 7) {
		const sample = this.sampleAtDistance(wrapCourseProgress(progress) * this.totalLength + forwardOffset);
		return {
			x: sample.x,
			z: sample.z,
			y: null,
			yaw: Math.atan2(sample.tangentX, sample.tangentZ)
		};
	}
	getRenderData(sampleCount = 1024) {
		const count = clamp(Math.floor(sampleCount), 128, 4096);
		return {
			points: Array.from({ length: count }, (_, index) => {
				const sample = this.sampleAtProgress(index / count);
				return {
					x: sample.x,
					y: sample.y,
					z: sample.z,
					width: sample.width,
					progress: sample.progress,
					tag: sample.tag
				};
			}),
			checkpointIndices: this.checkpoints.map((checkpoint) => Math.round(checkpoint.progress * count) % count),
			branches: this.branchDefinitions,
			region: this.region
		};
	}
	getMinimapSamples(sampleCount = 256) {
		const count = clamp(Math.floor(sampleCount), 64, 1024);
		return Array.from({ length: count }, (_, index) => {
			const sample = this.sampleAtProgress(index / count);
			return {
				x: sample.x,
				z: sample.z,
				width: sample.width,
				progress: sample.progress,
				tag: sample.tag
			};
		});
	}
	getMinimapData(sampleCount = 256) {
		return {
			canonical: this.getMinimapSamples(sampleCount),
			branches: this.branchDefinitions
		};
	}
	evaluateParameter(parameter) {
		const count = this.controlPoints.length;
		const wrapped = (parameter % count + count) % count;
		const segment = Math.floor(wrapped) % count;
		const t = wrapped - Math.floor(wrapped);
		const p0 = this.controlPoints[wrapIndex(segment - 1, count)];
		const p1 = this.controlPoints[segment];
		const p2 = this.controlPoints[wrapIndex(segment + 1, count)];
		const p3 = this.controlPoints[wrapIndex(segment + 2, count)];
		if (!p0 || !p1 || !p2 || !p3) throw new Error("Invalid closed course control point lookup.");
		const x = catmullScalar(p0.x, p1.x, p2.x, p3.x, t);
		const z = catmullScalar(p0.z, p1.z, p2.z, p3.z, t);
		const width = p1.width + (p2.width - p1.width) * (t * t * (3 - 2 * t));
		return {
			x: x[0],
			z: z[0],
			dx: x[1],
			dz: z[1],
			ddx: x[2],
			ddz: z[2],
			width,
			tag: p1.tag
		};
	}
	evaluateAtDistance(distance) {
		let low = 0;
		let high = this.arcTable.length - 1;
		while (low + 1 < high) {
			const middle = low + high >>> 1;
			const entry = this.arcTable[middle];
			if (entry && entry.distance <= distance) low = middle;
			else high = middle;
		}
		const before = this.arcTable[low];
		const after = this.arcTable[Math.min(high, this.arcTable.length - 1)];
		if (!before || !after) return this.evaluateParameter(0);
		const span = Math.max(1e-9, after.distance - before.distance);
		const amount = clamp((distance - before.distance) / span, 0, 1);
		return this.evaluateParameter(before.parameter + (after.parameter - before.parameter) * amount);
	}
	buildArcTable(subdivisions) {
		const entries = [];
		const controlDistances = new Array(this.controlPoints.length).fill(0);
		let distance = 0;
		let previous = this.evaluateParameter(0);
		entries.push({
			parameter: 0,
			distance: 0,
			x: previous.x,
			z: previous.z
		});
		for (let segment = 0; segment < this.controlPoints.length; segment += 1) {
			controlDistances[segment] = distance;
			for (let division = 1; division <= subdivisions; division += 1) {
				const parameter = segment + division / subdivisions;
				const current = this.evaluateParameter(parameter);
				distance += Math.hypot(current.x - previous.x, current.z - previous.z);
				entries.push({
					parameter,
					distance,
					x: current.x,
					z: current.z
				});
				previous = current;
			}
		}
		if (distance <= 1) throw new RangeError("Course arc length is too small.");
		return {
			entries,
			controlDistances,
			totalLength: distance
		};
	}
};
/**
* Dense deterministic audit used by seed-sweep tests and generation receipts.
* The report never mutates a course; invalid data is surfaced explicitly so a
* caller can reject a custom authored fixture without relying on rendering.
*/
function validatePodraceCourse(course) {
	const audit = generatedPlanAudits.get(course.controlPoints) ?? auditGeneratedPlan(course.controlPoints, 16);
	const reasons = [];
	const profile = DESERT_REGIONS[course.region];
	const launchScore = launchCrestScore(course.controlPoints, { heightAt: (x, z) => course.heightAt(x, z) }, 0, 0);
	let maximumTerrainSlope = 0;
	let maximumStartCurvature = 0;
	for (let index = 0; index < 32; index += 1) {
		const sample = course.sampleAtProgress(index / 32);
		const ahead = course.sampleAtDistance(sample.distance + 12);
		maximumTerrainSlope = Math.max(maximumTerrainSlope, Math.abs(ahead.y - sample.y) / 12);
		if (Math.min(sample.progress, 1 - sample.progress) * course.totalLength < 90) maximumStartCurvature = Math.max(maximumStartCurvature, Math.abs(sample.curvature));
	}
	if (audit.length < 5800 || audit.length > 10300) reasons.push("length");
	if (audit.intersections > 0) reasons.push("self-intersection");
	if (audit.minimumClearance < 42) reasons.push("self-clearance");
	if (audit.maximumCurvature > .085) reasons.push("curvature");
	if (maximumStartCurvature > .028) reasons.push(`start-grid-curvature:${maximumStartCurvature.toFixed(3)}`);
	if (maximumTerrainSlope > profile.maximumCourseSlope) reasons.push(`terrain-slope:${maximumTerrainSlope.toFixed(3)}/${profile.maximumCourseSlope.toFixed(3)}`);
	if (course.seed !== null && launchScore < profile.minimumLaunchScore) reasons.push("launch-crest");
	if (course.seed !== null) {
		const branchReport = validateCourseBranches(course, course.branches);
		reasons.push(...branchReport.reasons.map((reason) => `branches:${reason}`));
	}
	return Object.freeze({
		valid: reasons.length === 0,
		reasons: Object.freeze(reasons),
		metrics: Object.freeze({
			length: audit.length,
			maximumCurvature: audit.maximumCurvature,
			minimumSelfClearance: audit.minimumClearance,
			launchScore,
			branchCount: course.branches.length
		})
	});
}
function createProceduralPodraceCourse(terrain, seed, options = {}) {
	const normalizedSeed = seed >>> 0;
	const generated = normalizedSeed === 1229867859 ? PODRACE_CONTROL_POINTS : generatePodraceControlPoints(normalizedSeed);
	const region = desertRegionForSeed(normalizedSeed);
	const centre = generated.reduce((sum, point) => ({
		x: sum.x + point.x,
		z: sum.z + point.z
	}), {
		x: 0,
		z: 0
	});
	centre.x /= generated.length;
	centre.z /= generated.length;
	const anchor = desertRegionAnchor(region.id, normalizedSeed);
	const placed = placeCourseLaunchOnCrest(generated, terrain, normalizedSeed, region.minimumLaunchScore, anchor.x - centre.x, anchor.z - centre.z);
	if (!validateGeneratedControlPoints(placed)) throw new Error(`Procedural course ${normalizedSeed} failed its construction geometry invariant.`);
	return new PodraceCourse(terrain, {
		...options,
		seed: normalizedSeed,
		region: region.id,
		controlPoints: placed
	});
}
//#endregion
//#region src/render/terrain/terrainMath.ts
/**
* Deterministic analytic desert field used by gameplay, dust and course views.
*
* The matching GLSL implementation lives in `terrainShaderChunks.ts`. Keep the
* constants and octave transforms in lockstep when tuning the desert. The CPU
* path deliberately uses scalar math and caller-owned output objects so the
* 120 Hz repulsorlift sampler does not allocate.
*/
const TERRAIN_SEED = 1347372114;
const UINT_RANGE = 4294967295;
const HASH_X = 2654435761;
const HASH_Z = 2246822519;
const HASH_SALT = 3266489917;
function clamp01(value) {
	return value < 0 ? 0 : value > 1 ? 1 : value;
}
function selectRegionValue(index, sunscar, glass, canyon, storm, graveyard, geothermal) {
	switch (index) {
		case 1: return glass;
		case 2: return canyon;
		case 3: return storm;
		case 4: return graveyard;
		case 5: return geothermal;
		default: return sunscar;
	}
}
function smoother(value) {
	return value * value * value * (value * (value * 6 - 15) + 10);
}
function hashLattice(x, z, salt) {
	let value = Math.imul(x | 0, HASH_X) + Math.imul(z | 0, HASH_Z) + Math.imul(salt + TERRAIN_SEED | 0, HASH_SALT) >>> 0;
	value ^= value >>> 16;
	value = Math.imul(value, 2146121005) >>> 0;
	value ^= value >>> 15;
	value = Math.imul(value, 2221713035) >>> 0;
	value ^= value >>> 16;
	return (value >>> 0) / UINT_RANGE;
}
/** Quintic value noise. It is continuous across all integer cell boundaries. */
function valueNoise2D(x, z, salt) {
	const ix = Math.floor(x);
	const iz = Math.floor(z);
	const fx = x - ix;
	const fz = z - iz;
	const ux = smoother(fx);
	const uz = smoother(fz);
	const a = hashLattice(ix, iz, salt);
	const b = hashLattice(ix + 1, iz, salt);
	const c = hashLattice(ix, iz + 1, salt);
	const d = hashLattice(ix + 1, iz + 1, salt);
	const ab = a + (b - a) * ux;
	return (ab + (c + (d - c) * ux - ab) * uz) * 2 - 1;
}
/** Rotated fBm avoids obvious axis-aligned octave repetition. */
function fbm2D(x, z, octaves, salt) {
	let px = x;
	let pz = z;
	let amplitude = .545;
	let total = 0;
	let normalization = 0;
	for (let octave = 0; octave < octaves; octave += 1) {
		total += valueNoise2D(px, pz, salt + octave * 17) * amplitude;
		normalization += amplitude;
		const rotatedX = px * 1.672 - pz * 1.126 + 11.7;
		pz = px * 1.126 + pz * 1.672 - 7.3;
		px = rotatedX;
		amplitude *= .49;
	}
	return total / normalization;
}
function terrainCycle(phase) {
	const normalized = phase / (Math.PI * 2) + .25;
	return normalized - Math.floor(normalized);
}
/** Broad windward ramp followed by a shorter, steeper lee face. */
function duneProfile(cycle, crestPosition) {
	if (cycle < crestPosition) return Math.pow(smoother(clamp01(cycle / crestPosition)), .82);
	return 1 - smoother(clamp01((cycle - crestPosition) / (1 - crestPosition)));
}
/** Continuous cusp placed directly on the dune shoulder. */
function crestPulse(cycle, crestPosition, width) {
	const distance = Math.abs(cycle - crestPosition);
	const wrappedDistance = Math.min(distance, 1 - distance);
	return Math.pow(clamp01(1 - wrappedDistance / width), 1.35);
}
/**
* Seven coupled dune fields:
*  1. domain-warped megadunes,
*  2. oblique cross dunes,
*  3. medium transverse ridges that remain readable from a chase camera,
*  4. eroded low-frequency shelf variation,
*  5. knife-edge crest lift,
*  6. directional wind ripples,
*  7. fine mineral ripples.
*
* Dune cycles provide wind direction, but their phase is warped by aperiodic
* noise and shaped into asymmetric windward/lee profiles. The remaining sine
* terms are sub-metre surface ripples, not the primary terrain silhouette.
*/
function terrainCore(x, z, fields) {
	const continental = fbm2D(x * .00152 + 13.8, z * .00152 - 9.4, 5, 11);
	const warpA = fbm2D(x * .00315 - 31.2, z * .00315 + 18.6, 4, 83);
	const warpB = fbm2D(x * .0041 + 7.1, z * .0041 + 42.5, 3, 149);
	const warpedX = x + warpA * 54 + warpB * 17;
	const warpedZ = z + warpA * 23 - warpB * 39;
	const megaCycle = terrainCycle(warpedX * .00665 + warpedZ * .00248 + fbm2D(x * .00191, z * .00191, 4, 211) * 2.7);
	const megaBody = duneProfile(megaCycle, .76);
	const megaCrest = crestPulse(megaCycle, .76, .065);
	const crossCycle = terrainCycle(warpedX * -.0032 + warpedZ * .0108 + fbm2D(x * .0048 + 90, z * .0048 - 70, 3, 307) * 1.65);
	const crossBody = duneProfile(crossCycle, .68);
	const crossCrest = crestPulse(crossCycle, .68, .072);
	const erosion = fbm2D(x * .0072 - 3.4, z * .0072 + 1.8, 5, 401);
	const shelf = Math.sign(erosion) * Math.pow(Math.abs(erosion), 1.32);
	const ridgeCycle = terrainCycle(warpedX * .024 + warpedZ * .011 + erosion * 1.45);
	const ridgeBody = duneProfile(ridgeCycle, .78);
	const ridgeCrest = crestPulse(ridgeCycle, .78, .07);
	const ripplePhase = warpedX * .095 + warpedZ * .037 + valueNoise2D(x * .018, z * .018, 503) * 2.1;
	const rippleEnvelope = .44 + .56 * clamp01(continental * .5 + .5);
	const directionalRipple = Math.sin(ripplePhase) * rippleEnvelope;
	const finePhase = warpedX * .238 - warpedZ * .071 + valueNoise2D(x * .052, z * .052, 617) * 1.4;
	const fineRipple = Math.sin(finePhase);
	const sunscarHeight = continental * 6.5 + megaBody * 33.5 + crossBody * 6.5 + ridgeBody * 9.5 + shelf * 1.2 + megaCrest * (6.3 + clamp01(erosion * .5 + .5) * 2.3) + crossCrest * 1.6 + ridgeCrest * (2.8 + clamp01(erosion * .5 + .5) * 1.1) + directionalRipple * .36 + fineRipple * .08 - 19;
	const glassHeight = continental * 2.4 + megaBody * 6.2 + crossBody * 1.8 + ridgeBody * 1.4 + shelf * .45 + megaCrest * 1.15 + directionalRipple * .16 + fineRipple * .05 - 4.8;
	const canyonShelf = erosion * (1.45 - Math.abs(erosion) * .45);
	const canyonHeight = continental * 7.5 + megaBody * 13 + crossBody * 5.5 + ridgeBody * 3.8 + canyonShelf * 18 + megaCrest * 3.4 + ridgeCrest * 1.9 - 18;
	const basinFloor = Math.pow(clamp01(1 - Math.abs(erosion)), 2);
	const stormHeight = continental * 9.2 + megaBody * 13.5 + crossBody * 4.1 + ridgeBody * 3.6 + shelf * 1.8 - basinFloor * 9.5 + directionalRipple * .24 - 13.5;
	const machineRibX = crestPulse(terrainCycle(x * .018 + erosion * .34), .5, .052);
	const machineRibZ = crestPulse(terrainCycle(z * .014 - erosion * .28), .5, .047);
	const machineRibs = Math.max(machineRibX, machineRibZ);
	const graveyardHeight = continental * 3 + megaBody * 6.8 + crossBody * 2 + shelf * .7 + machineRibs * 4.8 + directionalRipple * .12 - 7.2;
	const ventNoise = clamp01(valueNoise2D(x * .0067 + 43, z * .0067 - 17, 829) * .5 + .5);
	const ventLift = ventNoise * ventNoise * ventNoise * 12;
	const geothermalHeight = continental * 8.2 + megaBody * 19.5 + crossBody * 8.4 + ridgeBody * 10.8 + shelf * 3 + megaCrest * 5.4 + ridgeCrest * 3.2 + ventLift + directionalRipple * .31 - 22;
	const baseDensity = clamp01(.5 + valueNoise2D(x * .011 + 5.3, z * .011 - 8.1, 719) * .31 + continental * .19);
	const baseCrest = clamp01(megaCrest * .86 + crossCrest * .46 + ridgeCrest * .62 + clamp01(erosion) * .08);
	const baseRipple = directionalRipple * .82 + fineRipple * .18;
	const regionBlend = terrainRegionBlendAt(x, scratchRegionBlend);
	const fromHeight = selectRegionValue(regionBlend.fromIndex, sunscarHeight, glassHeight, canyonHeight, stormHeight, graveyardHeight, geothermalHeight);
	const height = fromHeight + (selectRegionValue(regionBlend.toIndex, sunscarHeight, glassHeight, canyonHeight, stormHeight, graveyardHeight, geothermalHeight) - fromHeight) * regionBlend.amount;
	if (fields) {
		const fromDensity = selectRegionValue(regionBlend.fromIndex, baseDensity, clamp01(baseDensity * .72 + .28), clamp01(baseDensity * .88 + Math.abs(erosion) * .18), clamp01(baseDensity * .64 + .08), clamp01(baseDensity * .74 + machineRibs * .24), clamp01(baseDensity * .84 + ventNoise * .2));
		const toDensity = selectRegionValue(regionBlend.toIndex, baseDensity, clamp01(baseDensity * .72 + .28), clamp01(baseDensity * .88 + Math.abs(erosion) * .18), clamp01(baseDensity * .64 + .08), clamp01(baseDensity * .74 + machineRibs * .24), clamp01(baseDensity * .84 + ventNoise * .2));
		const fromCrest = selectRegionValue(regionBlend.fromIndex, baseCrest, clamp01(baseCrest * .24), clamp01(baseCrest * .48 + Math.abs(erosion) * .42), clamp01(baseCrest * .42), clamp01(baseCrest * .2 + machineRibs * .84), clamp01(baseCrest * .72 + ventNoise * .35));
		const toCrest = selectRegionValue(regionBlend.toIndex, baseCrest, clamp01(baseCrest * .24), clamp01(baseCrest * .48 + Math.abs(erosion) * .42), clamp01(baseCrest * .42), clamp01(baseCrest * .2 + machineRibs * .84), clamp01(baseCrest * .72 + ventNoise * .35));
		const fromRipple = selectRegionValue(regionBlend.fromIndex, baseRipple, baseRipple * 1.35, baseRipple * .58, baseRipple * .76, baseRipple * .42 + machineRibs * .3, baseRipple * .86);
		const toRipple = selectRegionValue(regionBlend.toIndex, baseRipple, baseRipple * 1.35, baseRipple * .58, baseRipple * .76, baseRipple * .42 + machineRibs * .3, baseRipple * .86);
		fields.density = fromDensity + (toDensity - fromDensity) * regionBlend.amount;
		fields.crest = fromCrest + (toCrest - fromCrest) * regionBlend.amount;
		fields.ripple = fromRipple + (toRipple - fromRipple) * regionBlend.amount;
		fields.regionIndex = regionBlend.amount < .5 ? regionBlend.fromIndex : regionBlend.toIndex;
		fields.regionBlend = regionBlend.amount;
	}
	return height;
}
const scratchRegionBlend = {
	fromIndex: 0,
	toIndex: 0,
	amount: 0
};
function sampleTerrainHeight(x, z, offset) {
	return terrainCore(x, z) + (offset?.sampleOffset(x, z) ?? 0);
}
new Vector3(-.42, .76, -.5).normalize();
10 + (Math.SQRT2 * 1 + 4);
`${6 .toFixed(1)}`;
new InstancedBufferAttribute(/* @__PURE__ */ new Float32Array(0), 16);
//#endregion
//#region src/render/inkstorm/InkstormRoad.ts
/** Shared road/structure boundary. Open ends use only their adjacent segment. */
function inkstormRoadCrossSection(points, index, closed) {
	const prev = points[closed ? (index - 1 + points.length) % points.length : Math.max(0, index - 1)];
	const next = points[closed ? (index + 1) % points.length : Math.min(points.length - 1, index + 1)];
	const dx = next.x - prev.x, dz = next.z - prev.z, length = Math.hypot(dx, dz) || 1;
	return {
		rightX: dz / length,
		rightZ: -dx / length
	};
}
//#endregion
//#region assets/source/inkstorm/fork-entry-round30/ForkIslandContacts.ts
/** Actual source triangle contacts; canyon-buttress SHA256 ad9f484c3cd751e9042ecc332e9517c7c21d34919758dfdaa89bde77f153a5e6. */
const FORK_ISLAND_CONTACTS = [
	{
		"row": 5,
		"center": [18486.30655655581, -847.5163962105269],
		"start": [
			18475.26154855846,
			8.342260414309207,
			-849.9034023559987
		],
		"inside": [
			18423.562704927896,
			8.342260414309207,
			-805.696826423318
		]
	},
	{
		"row": 5.5,
		"center": [18483.893699084587, -837.4339889214793],
		"start": [
			18472.935160267974,
			9.763386209996053,
			-840.1908761162733
		],
		"inside": [
			18419.119961739645,
			9.763386209996053,
			-799.3248121321851
		]
	},
	{
		"row": 6,
		"center": [18481.480841613364, -827.3515816324318],
		"start": [
			18470.62115505854,
			11.184512005682901,
			-830.4752346110774
		],
		"inside": [
			18416.81027524882,
			11.184512005682901,
			-795.0756446771037
		]
	},
	{
		"row": 6.5,
		"center": [18478.230460031504, -817.745181803039],
		"start": [
			18467.538283544025,
			12.900839897028938,
			-821.4013221122492
		],
		"inside": [
			18412.261607804234,
			12.900839897028938,
			-790.2093349925217
		]
	},
	{
		"row": 7,
		"center": [18474.980078449647, -808.1387819736464],
		"start": [
			18464.481504187395,
			14.617167788374976,
			-812.3184875206848
		],
		"inside": [
			18407.94177065731,
			14.617167788374976,
			-786.1718775342996
		]
	},
	{
		"row": 7.5,
		"center": [18470.602725776273, -798.5858573888967],
		"start": [
			18460.27191041652,
			16.655871593073567,
			-803.1645312146525
		],
		"inside": [
			18402.706149952377,
			16.655871593073567,
			-782.6412668590301
		]
	},
	{
		"row": 8,
		"center": [18466.225373102898, -789.032932804147],
		"start": [
			18456.07747175006,
			18.694575397772155,
			-794.0038580835187
		],
		"inside": [
			18402.352639679222,
			18.694575397772155,
			-781.3002379488372
		]
	},
	{
		"row": 8.5,
		"center": [18461.029580513445, -779.0427485502514],
		"start": [
			18450.912773108663,
			20.573661323305814,
			-784.0766543831572
		],
		"inside": [
			18401.83519448406,
			20.573661323305814,
			-779.7532452717595
		]
	},
	{
		"row": 9,
		"center": [18455.833787923995, -769.0525642963559],
		"start": [
			18445.748465336506,
			22.452747248839472,
			-774.1492561946674
		],
		"inside": [
			18401.386580111557,
			22.452747248839472,
			-778.0934830626135
		]
	},
	{
		"row": 9.5,
		"center": [18450.485209535513, -758.1775707218967],
		"start": [
			18440.264851423795,
			23.723964175645644,
			-762.997765745781
		],
		"inside": [
			18399.824808672376,
			23.723964175645644,
			-776.3926703057128
		]
	},
	{
		"row": 10,
		"center": [18445.13663114703, -747.3025771474374],
		"start": [
			18434.788816145094,
			24.99518110245182,
			-751.8427010098153
		],
		"inside": [
			18398.935135541098,
			24.99518110245182,
			-774.644843017471
		]
	}
];
//#endregion
//#region assets/source/inkstorm/fork-entry-round30/InkstormForkFoundation.ts
const smooth = (a, b, x) => {
	const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
/** Render-only closed support beneath the unchanged elevated physics deck. */
function createInkstormForkFoundation(branch, heightAt, course) {
	if (course.seed !== 1229867859 || branch.id !== "branch-1-shortcut") return null;
	const positions = [], colors = [], kinds = [];
	const palette = [
		"#8e654b",
		"#aa7953",
		"#795640",
		"#93694d"
	].map((c) => new Color(c));
	const a = new Vector3(), b = new Vector3(), c = new Vector3();
	const triangle = (p, q, r, color, kind) => {
		p = safePoint(p);
		q = safePoint(q);
		r = safePoint(r);
		a.fromArray(p);
		b.fromArray(q).sub(a);
		c.fromArray(r).sub(a);
		if (b.cross(c).lengthSq() < 1e-12) return;
		for (const v of kind === 1 ? [
			p,
			r,
			q
		] : [
			p,
			q,
			r
		]) {
			positions.push(...v);
			colors.push(color.r, color.g, color.b);
			kinds.push(kind);
		}
	};
	const quad = (p, q, r, s, color, kind) => {
		triangle(p, q, r, color, kind);
		triangle(p, r, s, color, kind);
	};
	const roadRows = branch.points.map((p, i) => ({
		...p,
		...inkstormRoadCrossSection(branch.points, i, false)
	}));
	const canonical = course.getRenderData(1536).points;
	const clearance = (x, z) => {
		let value = Infinity;
		for (let i = 0; i < canonical.length; i++) {
			const p = canonical[i], q = canonical[(i + 1) % canonical.length], dx = q.x - p.x, dz = q.z - p.z, t = Math.max(0, Math.min(1, ((x - p.x) * dx + (z - p.z) * dz) / Math.max(1e-8, dx * dx + dz * dz)));
			value = Math.min(value, Math.hypot(x - p.x - dx * t, z - p.z - dz * t) - Math.max(p.width, q.width));
		}
		return value;
	};
	const ceilings = /* @__PURE__ */ new Map();
	const safePoint = (p) => {
		const x = Math.fround(p[0]), z = Math.fround(p[2]), key = x + "," + z;
		let ceiling = ceilings.get(key);
		if (ceiling === void 0) {
			const deck = sampleBridgeSurface(course.branches, x, z);
			ceiling = deck ? deck.height - .45 : Infinity;
			if (clearance(x, z) < 1) ceiling = Math.min(ceiling, heightAt(x, z) - .35);
			ceilings.set(key, ceiling);
		}
		return [
			x,
			Math.fround(Math.min(p[1], ceiling)),
			z
		];
	};
	const rings = [], footPoints = [];
	for (let index = 0; index < roadRows.length - 1; index++) {
		const p = roadRows[index], q = roadRows[index + 1], steps = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.z - p.z) / 4));
		for (let step = 0; step < steps + (index === roadRows.length - 2 ? 1 : 0); step++) {
			const t = step / steps, x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t, z = p.z + (q.z - p.z) * t, width = p.width + (q.width - p.width) * t;
			const edges = [-1, 1].map((side) => ({
				x: p.x + p.rightX * p.width * side + (q.x + q.rightX * q.width * side - p.x - p.rightX * p.width * side) * t,
				z: p.z + p.rightZ * p.width * side + (q.z + q.rightZ * q.width * side - p.z - p.rightZ * p.width * side) * t
			}));
			const rightX = (edges[1].x - edges[0].x) / (2 * width), rightZ = (edges[1].z - edges[0].z) / (2 * width);
			const at = (side, extra, height) => [
				x + rightX * (side * width + extra),
				height,
				z + rightZ * (side * width + extra)
			];
			const ground = edges.map((e) => heightAt(e.x, e.z));
			const cap = y - .22;
			const flares = edges.map((e) => smooth(4, 12, clearance(e.x, e.z)) * 2.2);
			const ring = [at(-1, .1, cap), at(1, -.1, cap)];
			for (const side of [1, -1]) {
				const k = side === 1 ? 1 : 0, edge = edges[k], flare = flares[k], footX = edge.x + rightX * side * flare, footZ = edge.z + rightZ * side * flare;
				let bottom = Math.min(heightAt(footX, footZ), ground[k]) - 1.25;
				bottom = Math.min(bottom, cap - .1);
				const height = cap - bottom;
				const band = (fraction, extra) => at(side, side * extra, Math.min(cap - .04, bottom + height * fraction));
				if (side === 1) ring.push(band(.78, flare * .12), band(.38, flare * .62), at(side, side * flare, bottom));
				else ring.push(at(side, side * flare, bottom), band(.38, flare * .62), band(.78, flare * .12));
			}
			rings.push(ring);
			footPoints.push(safePoint(ring[4]), safePoint(ring[5]));
		}
	}
	for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < rings[i].length; j++) {
		const k = (j + 1) % rings[i].length;
		quad(rings[i][j], rings[i + 1][j], rings[i + 1][k], rings[i][k], palette[j % palette.length], 0);
	}
	for (const [index, reverse] of [[0, false], [rings.length - 1, true]]) {
		const ring = rings[index];
		for (let i = 1; i < ring.length - 1; i++) reverse ? triangle(ring[0], ring[i + 1], ring[i], palette[0], 0) : triangle(ring[0], ring[i], ring[i + 1], palette[0], 0);
	}
	const matches = FORK_ISLAND_CONTACTS.every((contact) => {
		const i = Math.floor(contact.row), t = contact.row - i, p = roadRows[i], q = roadRows[i + 1];
		return Math.hypot(p.x + (q.x - p.x) * t - contact.center[0], p.z + (q.z - p.z) * t - contact.center[1]) < .01 && Math.abs(p.y + (q.y - p.y) * t - .45 - contact.start[1]) < .01;
	});
	if (matches) {
		const top = [], bottom = [];
		const across = 12;
		for (let row = 0; row < FORK_ISLAND_CONTACTS.length; row++) {
			const contact = FORK_ISLAND_CONTACTS[row], blend = smooth(0, 2, row) * (1 - smooth(FORK_ISLAND_CONTACTS.length - 3, FORK_ISLAND_CONTACTS.length - 1, row));
			top[row] = [];
			bottom[row] = [];
			for (let j = 0; j <= across; j++) {
				const t = j / across, x = contact.start[0] + (contact.inside[0] - contact.start[0]) * t, z = contact.start[2] + (contact.inside[2] - contact.start[2]) * t, g = heightAt(x, z);
				const maxTop = contact.start[1], rise = Math.max(0, maxTop - g), saddle = Math.sin(t * Math.PI) * Math.min(4.5, rise * .35);
				const h = Math.min(maxTop, g + (rise - saddle) * blend);
				top[row][j] = [
					x,
					h,
					z
				];
				bottom[row][j] = [
					x,
					Math.min(g - 1.25, h - .1),
					z
				];
			}
		}
		for (let row = 0; row < top.length - 1; row++) for (let j = 0; j < across; j++) {
			quad(top[row][j], top[row + 1][j], top[row + 1][j + 1], top[row][j + 1], palette[0], 1);
			quad(bottom[row][j + 1], bottom[row + 1][j + 1], bottom[row + 1][j], bottom[row][j], palette[2], 1);
		}
		for (let row = 0; row < top.length - 1; row++) for (const j of [0, across]) if (j === 0) quad(bottom[row][j], bottom[row + 1][j], top[row + 1][j], top[row][j], palette[0], 1);
		else quad(top[row][j], top[row + 1][j], bottom[row + 1][j], bottom[row][j], palette[0], 1);
		for (const row of [0, top.length - 1]) for (let j = 0; j < across; j++) if (row === 0) quad(bottom[row][j + 1], bottom[row][j], top[row][j], top[row][j + 1], palette[0], 1);
		else quad(bottom[row][j], bottom[row][j + 1], top[row][j + 1], top[row][j], palette[0], 1);
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
	geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
	geometry.computeVertexNormals();
	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();
	geometry.userData = {
		scope: "view-only flagship fork support",
		triangleKinds: kinds.filter((_, i) => i % 3 === 0),
		footPoints,
		islandConnected: matches,
		sourceContacts: FORK_ISLAND_CONTACTS.length
	};
	return geometry;
}
//#endregion
//#region assets/source/inkstorm/fork-entry-round30/audit.ts
const folder = "assets/source/inkstorm/fork-entry-round30";
let field = null;
const ground = (x, z) => sampleTerrainHeight(x, z, field);
const course = createProceduralPodraceCourse({ heightAt: ground }, 1229867859);
field = createCourseGulfField(course);
course.refreshTerrainHeights({ heightAt: sampleTerrainHeight });
const geometry = createInkstormForkFoundation(course.branches.find((b) => b.elevated), ground, course);
const pos = geometry.getAttribute("position");
const normal = geometry.getAttribute("normal");
const color = geometry.getAttribute("color");
const kinds = geometry.userData.triangleKinds;
const canonical = course.getRenderData(2048).points;
function clearance(x, z) {
	let value = Infinity;
	for (let i = 0; i < canonical.length; i++) {
		const p = canonical[i], q = canonical[(i + 1) % canonical.length], dx = q.x - p.x, dz = q.z - p.z, t = Math.max(0, Math.min(1, ((x - p.x) * dx + (z - p.z) * dz) / Math.max(1e-8, dx * dx + dz * dz)));
		value = Math.min(value, Math.hypot(x - p.x - dx * t, z - p.z - dz * t) - Math.max(p.width, q.width));
	}
	return value;
}
const orientations = /* @__PURE__ */ new Map();
const volumes = [0, 0];
const edgeCounts = /* @__PURE__ */ new Map();
const key = (p) => [
	p.x,
	p.y,
	p.z
].map((v) => v.toFixed(4)).join(",");
const a = new Vector3();
const b = new Vector3();
const c = new Vector3();
const center = new Vector3();
const cross = new Vector3();
let degenerate = 0;
let illegalRoadSamples = 0;
let maxRoadPenetration = -Infinity;
let minWingMainClearance = Infinity;
let maxDeckPenetration = -Infinity;
let topUp = 0;
let topDown = 0;
const bad = [];
for (let t = 0; t < pos.count / 3; t++) {
	a.fromBufferAttribute(pos, t * 3);
	b.fromBufferAttribute(pos, t * 3 + 1);
	c.fromBufferAttribute(pos, t * 3 + 2);
	cross.subVectors(b, a).cross(new Vector3().subVectors(c, a));
	if (cross.lengthSq() < 1e-12) degenerate++;
	for (const [p, q] of [
		[a, b],
		[b, c],
		[c, a]
	]) {
		const x = key(p), y = key(q), edge = x < y ? x + "|" + y : y + "|" + x;
		edgeCounts.set(edge, (edgeCounts.get(edge) ?? 0) + 1);
		orientations.set(edge, (orientations.get(edge) ?? 0) + (x < y ? 1 : -1));
	}
	const origin = new Vector3(18400, 0, -700);
	volumes[kinds[t]] += a.clone().sub(origin).dot(b.clone().sub(origin).cross(c.clone().sub(origin))) / 6;
	center.copy(a).add(b).add(c).multiplyScalar(1 / 3);
	if (cross.y > 0) topUp++;
	else if (cross.y < 0) topDown++;
	const probes = [];
	for (let u = 0; u <= 6; u++) for (let v = 0; v <= 6 - u; v++) probes.push(a.clone().multiplyScalar(u / 6).addScaledVector(b, v / 6).addScaledVector(c, 1 - u / 6 - v / 6));
	for (const p of probes) {
		const deck = sampleBridgeSurface(course.branches, p.x, p.z), terrain = ground(p.x, p.z), clear = clearance(p.x, p.z), physical = deck ? Math.max(terrain, deck.height) : terrain;
		if (deck) maxDeckPenetration = Math.max(maxDeckPenetration, p.y - deck.height);
		if (clear < -.1) {
			maxRoadPenetration = Math.max(maxRoadPenetration, p.y - physical);
			if (p.y > physical + .08) {
				illegalRoadSamples++;
				if (bad.length < 10) bad.push({
					triangle: t,
					point: p.toArray(),
					physical,
					deck,
					clear
				});
			}
		}
		if (kinds[t] === 1) minWingMainClearance = Math.min(minWingMainClearance, clear);
	}
}
const nonmanifold = [...edgeCounts.values()].filter((n) => n !== 2).length;
let maxFootAboveGround = -Infinity;
let footSamples = 0;
const footPoints = geometry.userData.footPoints;
for (let i = 0; i < footPoints.length - 2; i++) for (let k = 0; k <= 16; k++) {
	const a = footPoints[i], b = footPoints[i + 2], t = k / 16, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t;
	maxFootAboveGround = Math.max(maxFootAboveGround, y - ground(x, z));
	footSamples++;
}
const inconsistentEdges = [...orientations.values()].filter((v) => v !== 0).length;
const pads = getInkstormLayout(course).filter((p) => p.family === "pit-complex" || p.family === "pit-district");
let pitPadSupportClearance = Infinity;
for (const p of pads) {
	const district = p.family === "pit-district", c = Math.cos(p.yaw), s = Math.sin(p.yaw), cx = district ? p.x : p.x + 4 * p.sx * c - 2.25 * p.sz * s, cz = district ? p.z : p.z - 4 * p.sx * s - 2.25 * p.sz * c, hx = (district ? 60 : 75) * p.sx, hz = (district ? 18 : 30.25) * p.sz;
	for (let i = 0; i < pos.count; i++) {
		const dx = pos.getX(i) - cx, dz = pos.getZ(i) - cz;
		pitPadSupportClearance = Math.min(pitPadSupportClearance, Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - hx), Math.max(0, Math.abs(dx * s + dz * c) - hz)) - 35);
	}
}
const checks = [
	{
		name: "Pit grading field has no support in the candidate footprint",
		pass: pitPadSupportClearance > 0,
		pitPadSupportClearance
	},
	{
		name: "Every foundation toe embeds in actual terrain",
		pass: maxFootAboveGround < -.6,
		maxFootAboveGround,
		contacts: geometry.userData.footPoints.length,
		samples: footSamples
	},
	{
		name: "Consistent outward solid orientation",
		pass: inconsistentEdges === 0 && volumes.every((v) => v > 0),
		inconsistentEdges,
		signedVolumes: volumes
	},
	{
		name: "Closed solids without boundary edges",
		pass: nonmanifold === 0,
		nonmanifoldEdges: nonmanifold
	},
	{
		name: "Finite nondegenerate triangles",
		pass: degenerate === 0 && Array.from(pos.array).every(Number.isFinite),
		degenerate
	},
	{
		name: "No new solid above a legal canonical road surface",
		pass: illegalRoadSamples === 0,
		illegalRoadSamples,
		maxRoadPenetration,
		bad
	},
	{
		name: "No new solid intrudes through the legal elevated road surface",
		pass: maxDeckPenetration < -.2,
		maxDeckPenetration
	},
	{
		name: "Island connection clears canonical racing width by eight metres",
		pass: minWingMainClearance >= 8,
		minWingMainClearance
	},
	{
		name: "Additional source geometry budget below4500triangles",
		pass: pos.count / 3 < 4500,
		triangles: pos.count / 3
	}
];
const physicsHashes = Object.fromEntries([
	"src/game/race/course.ts",
	"src/game/race/branches.ts",
	"src/game/race/bridgeSurface.ts",
	"src/game/race/CourseGulfField.ts",
	"src/render/inkstorm/InkstormRoad.ts"
].map((f) => [f, createHash("sha256").update(readFileSync(f)).digest("hex")]));
const receipt = {
	samplesPerTriangle: 28,
	status: checks.every((c) => c.pass) ? "PASS" : "FAIL",
	scope: "CPU generated render-only fork foundation, road-space clearance and topology; no browser/GPU/Blender or in-world acceptance",
	checks,
	bounds: geometry.boundingBox,
	vertices: pos.count,
	triangles: pos.count / 3,
	attributeBytes: pos.array.byteLength + normal.array.byteLength + color.array.byteLength,
	materialGroupsAdded: 1,
	newRenderPasses: 0,
	newTextures: 0,
	maxDeckPenetration,
	triangleKinds: {
		causeway: kinds.filter((k) => k === 0).length,
		islandButtress: kinds.filter((k) => k === 1).length
	},
	physicsHashes,
	topUp,
	topDown
};
writeFileSync(`${folder}/clearance-audit.json`, JSON.stringify(receipt, null, 2) + "\n");
writeFileSync(`${folder}/foundation-geometry.json`, JSON.stringify({
	position: Array.from(pos.array),
	normal: Array.from(normal.array),
	color: Array.from(color.array),
	triangleKinds: kinds
}) + "\n");
console.log(JSON.stringify(receipt, null, 2));
geometry.dispose();
//#endregion
export {};
