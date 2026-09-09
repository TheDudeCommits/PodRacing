import assert from 'node:assert/strict';
import { createPitPadField, PIT_PAD_MAX_TEXELS, type PitPlacement } from './PitPadField';

const pit = (x: number, z: number): PitPlacement => ({ id: `${x}:${z}`, family: 'pit-complex', x, z, yaw: 0, sx: 1, sz: 1 });
const internalRoute = [{ x: -2, z: -2, width: 1 }, { x: 2, z: -2, width: 1 }, { x: 2, z: 2, width: 1 }, { x: -2, z: 2, width: 1 }];
const internal = createPitPadField([pit(0, 0)], internalRoute, [], () => 0);
assert(internal.pads[0]!.minRoadClearance > 20, 'synthetic fixture must evade a perimeter-only rejection');
assert.equal(internal.pads[0]!.declineReason, 'protected-road-overlap');
assert.equal(internal.grid, null);
assert.equal(internal.sampleOffset(0, 0), 0);

const huge = createPitPadField([pit(0, 0), pit(10000, 10000)], [{ x: -500, z: -500, width: 1 }, { x: -500, z: -400, width: 1 }], [], () => 0);
assert.equal(huge.grid, null);
assert(huge.pads.every(p => !p.accepted && p.declineReason === 'atlas-budget'));

let samples = 0;
const route = [{ x: -150, z: 100, width: 5 }, { x: 150, z: 100, width: 5 }];
const terrain = (x: number, z: number) => { samples++; return x * .05 + z * .1; };
const field = createPitPadField([pit(0, 0)], route, [], terrain), bakedSamples = samples;
assert(field.grid && field.grid.values.length <= PIT_PAD_MAX_TEXELS);
assert.equal(field.anchorHeight('0:0'), 0);
for (let i = 0; i < 100; i++) field.sampleOffset(i / 100, 0);
assert.equal(samples, bakedSamples, 'runtime sampling must not call the ungraded sampler or recursively rebuild anchors');
const duplicate = createPitPadField([pit(0, 0)], route, [], terrain);
assert.deepEqual(duplicate.grid!.values, field.grid.values);
assert.equal(field.sampleOffset(field.grid.minX - .01, 0), 0);
assert.equal(field.sampleOffset(field.grid.minX + field.grid.columns - 1, 0), 0);
assert.equal(field.sampleOffset(0, field.grid.minZ + field.grid.rows - 1), 0);
console.log(JSON.stringify({ guards: ['route-wholly-inside-slab', 'atlas-allocation-cap', 'snapshot-anchor', 'no-runtime-height-callback', 'deterministic-f32-bake', 'zero-outside-and-boundary'], passed: 6 }));
