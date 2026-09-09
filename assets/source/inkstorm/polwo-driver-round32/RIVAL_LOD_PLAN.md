# Polwo rival LOD — source-only preparation

Root requested a genuine rival derivative at **≤30,000 referenced triangles, ≤6 body draws, ≤6 pilot draws, ≤12 total draws, and approximately 6 MiB decoded textures**. Count textures conservatively as RGBA8 with all mip levels. This is separate from the 60k/24 MiB hero contract. The current paint-v1 package has unaccepted shoulder holes; do not use it as the final rival source.

Wait for the final shoulder-repaired, tangent-validated hero input. Record its hash and retain the 2048² source RGB bake and original maps unchanged. Only new derivative names under this directory are allowed. The hero is read-only throughout the rival process; its positions, normals, UVs, tangents, materials, node transforms, and texture payloads must remain byte-exact on disk.

The existing isolated glTF Transform CLI was inspected locally: **4.4.2**, at `/Users/amir/.npm/_npx/6e1a7b84fabb98f4/node_modules/@gltf-transform/cli/bin/cli.js`. Its `simplify` supports `--ratio`, `--error`, and `--lock-border`; `reorder` supports `--target performance`. The separate `/tmp/inkstorm-rock-lod-tools` SDK has glTF Transform 4.5.0 and meshoptimizer 1.2.0 for attribute-aware work. These are tooling dependencies, not additions to the game bundle.

## Bounded first candidate

1. Create a new `rival-final-input/` working directory after the final hero filename is provided. Capture source geometry/image/node/attachment statistics and hashes.
2. Try an ordinary topology-preserving simplification first, retaining UV/normal/tangent discontinuities. Target ratio .58 (approximately 28.4k triangles for the current 48.8k fit), positional error .001, and locked borders. These are trial parameters, not a guarantee of reaching the budget. Avoid a global weld that merges vertices across different normals, UVs, tangents, colors, or material boundaries.
3. Verify the result actually falls below 30k referenced triangles with the six-part driver still present. If seam/border locks prevent this, save its failed receipt. Do not raise the error arbitrarily or change the admission budget. Use per-primitive attribute-aware simplification or a DCC-authored LOD with protected cockpit mouth, shoulder caps, control grips, helmet silhouette, hands, cables, fins, front spars, and connector roots. Consider normal/UV error weights and explicit vertex locks; record them. Recheck closed caps and thin source surfaces.
4. Reorder only the rival derivative for vertex-cache performance. This is an index/vertex permutation, not additional geometric simplification. Compare position/normal/UV/tangent tuples and remapped triangle topology before/after reorder; node/anchor transforms and materials must be unchanged. Do not use Draco/meshopt compression unless the actual loader path and decoder dependency are separately validated.
5. Package the rival with `package-polwo-runtime.py --profile rival` only after geometry admission passes. Four 512² maps (three body, pilot color) plus two 256² pilot data maps estimate **6,291,448 bytes**, below 6 MiB including mips. Default encoded file cap remains 12 MiB in the generic tool; set `--max-file-mib 4` for this rival. Native PNG resizing preserves channel meanings; this is a substantial resolution tradeoff requiring actual rival-distance inspection.
6. Run `diagnose-polwo-runtime.py` with `--triangle-budget 30000 --decoded-mib 6`. Its `--baseline` must be the exact simplified/reordered tangent-valid input to the texture packager, since simplifying intentionally changes geometry from the hero. Separately compare canonical node/material names, attachment transforms, six pilot parts, and unchanged hero file hashes across the entire process.

Illustrative commands — placeholders are deliberately not executed:

```sh
node /Users/amir/.npm/_npx/6e1a7b84fabb98f4/node_modules/@gltf-transform/cli/bin/cli.js simplify FINAL_ACCEPTED_HERO.glb rival-final-input/01-simplified.glb --ratio 0.58 --error 0.001 --lock-border true
node /Users/amir/.npm/_npx/6e1a7b84fabb98f4/node_modules/@gltf-transform/cli/bin/cli.js reorder rival-final-input/01-simplified.glb rival-final-input/02-reordered.glb --target performance
```

The commands must run with this source directory as cwd. Never substitute a public/runtime path as an output. Preserve existing study anchors if the hero already includes them; do not append the same anchors again through `--attachments`. If the final accepted hero uses corrected nozzle anchors, those supersede the earlier study coordinates.

## Required evidence

- Before/after referenced triangles, mesh/draw/material/image counts; no unused meshes inflating header-only audits.
- Opaque single-material primitives, finite complete UV/normal attributes, valid tangents, unchanged data-map channel conventions and material factors, all six canonical pilot parts.
- UV seam, cockpit shoulder/cap, cable/fin silhouette, helmet/hands, and topology checks. Keep failed candidates and parameters in history.
- Identical framing and lighting for hero/rival source views; then actual neighboring-racer appearance and LOD switching in the game. No added holes, missing pilot, random material flashes, silhouette pops, or detached effects.
- Browser loading, real texture allocations/sharing, cleanup/context recovery, and quiet full-race performance. Geometric compliance does not establish visual or performance acceptance.

## Executed V2-source result

`build-polwo-rival.mjs` now implements this source-only workflow. On the corrected V2 shoulder hero, its initial locked-border trial stopped at 36,079 triangles and was retained as a failed candidate. The second attribute-aware trial used normal weights `.1/.1/.1`, UV weights `1/1`, `Permissive`, and error limit `.006`; it reached **28,830 triangles**. The output was reordered for vertex-cache performance and packaged under `packaged-shoulders-v2/polwo-rival-v1.glb`.

Final rival: 4,188,076 bytes, 2 body + 6 pilot draws, 6 unique images and texture definitions, 6,291,448 RGBA8 full-mip bytes (<6 MiB). SHA-256 `b9a2f310ffd43477091575a52f1cb6804ec9fafca6fcf31093072b7f43e6d502`. Independent source and Khronos validation pass (0 errors, 0 warnings). The vertex-subset and reorder audit proves exact retained attributes, and all 132 cap triangles retain exact attributes and winding. The source hero remains byte-exact. Root visual/runtime acceptance is pending.
