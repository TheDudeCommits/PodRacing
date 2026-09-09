# Blockrunner painted shading softness — private V1 candidate

8 September 2026. **Prepared and CPU-validated only. Not applied, rendered or visually accepted.** The seven-file [patch](blockrunner-painted-shading-v1.patch) includes five runtime source candidates and two test files. Original files are retained under `baseline/`. No live source, public asset, dist, harness or browser was changed by this task.

The current shader couples two different effects to `uWear`: pigment noise/chips and softer diffuse/specular shading. Blockrunner deliberately uses `wear: 0` because its atlas already contains authored paint wear. This also selects abrupt ramp boundaries and hard specular blobs. The candidate adds an independent, finite [0,1] `paintedShadingSoftness` option without changing pigment, source maps, roughness, physical geometry or existing palette values.

| Exact Blockrunner material | Trial softness | Existing response retained |
| --- | --- | --- |
| Body atlas | .85 | Full atlas factor, specular .24, rim .025, reflection .045, wear 0 |
| Pilot helmet atlas | .75 | Atlas factor .94, specular .32, rim .035, reflection .1, wear 0 |
| Pilot suit atlas | .45 | Atlas factor .86, specular .035, rim .025, reflection 0, wear 0 |
| Visor and gloves | Omitted | Exact existing hard response |

All other appearances omit the option. Their ramp bytes, shader strings, define sets, uniform keys and values remain exact. Explicit zero takes that same legacy path, including the existing behavior when procedural wear is nonzero.

Positive softness computes smoothstep blends between adjacent palette colors in linear RGB while constructing the existing 256×1 byte ramp. Each threshold’s half-width is `softness × min(.10, .45 × previous interval, .45 × next interval)`. This retains plateaus and endpoints even for closely spaced thresholds. The nearest-filtered lookup, texture size and one shader fetch remain unchanged. `setPalette` regenerates the same owned texture with the same softness.

The positive option selects a separate fragment string. It removes the old two additional wear-driven ramp fetches and replaces the hard specular threshold with a smooth band centered on the existing cutoff. Half-width is `max(.0001, softness × max(.015, cutoff × .65))`; the lower edge is bounded at zero. This handles cutoff zero without equal smoothstep edges. The original `uWear` still independently controls pigment noise/chips, and stays zero for the three selected Blockrunner materials. Roughness damping, rim, matcap, shadow and atlas sampling code stays unchanged. Source RGB/contact details are not repainted or multiplied by a new flat wash.

The exported legacy shader string is retained byte-for-byte. The positive variant is derived using explicit checked string anchors, which fail if future source changes invalidate the intended replacement. This maintenance guard and the shader-source tests should be updated together if the original fragment changes.

Completed evidence:

- [CPU parity receipt](cpu-parity-receipt.json): 36 baseline/candidate cases across existing palettes and wear 0/.5/1 verify exact legacy vertex/fragment strings, uniform keys/values, defines and every ramp byte for omitted/zero softness. Five invalid values rejected. Positive path retains 256×1 storage, one ramp fetch, wear 0, borrowed texture ownership and palette-update texture identity.
- A monotone grayscale control ramp preserves order and endpoints. Its largest adjacent byte jump falls from 107 (hard) to 4 at .85, with 108 distinct sampled gray levels. This establishes the intended CPU ramp behavior, not perceived quality in game lighting.
- [Private check receipt](private-check-receipt.json): isolated TypeScript check PASS and **66 tests / 2 files PASS**. Candidate modules were copied privately and unchanged dependencies linked read-only; the live test suite and runtime were untouched. Tests cover fixed legacy byte oracles, narrow threshold intervals, finite validation before allocation, exact source-material names, independent leases, rejected replacement cleanup, signed transforms and borrowed color/roughness maps.

The first native CPU check used strip-only TypeScript and stopped on an existing parameter-property dependency; retrying with Node’s explicit `--experimental-transform-types` completed. No shader or product fix followed from that runner limitation.

Budget: no added geometry, draw calls, maps, texture bytes or per-frame JS work. Positive materials add one scalar uniform and an alternative shader program for each existing define/geometry combination they use. The three selected Blockrunner materials should share that path when their existing shader configuration matches; actual compiled program count, context recovery and GPU time still require runtime checks. CPU interpolation happens only at material construction or palette updates.

Root should apply the single patch after its current Foundry comparison, verify the full project, and capture the same retained wider V10 camera poses. Judge curved engine and helmet shading, stud contacts and dark suit readability against the immediately preceding bundle. Reject if it merely softens the visual identity, erases useful planes or introduces banding/shimmer. No new camera change, atlas bake or geometry change is included, and no visual gain is claimed before actual images.
