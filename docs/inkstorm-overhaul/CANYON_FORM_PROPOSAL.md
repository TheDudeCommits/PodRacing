# Canyon form proposal — read-only review of round 23

The largest problem is foreground occlusion. The near paired buttresses hide the arch's outside silhouette, so the scene reads as one giant wall pierced by a narrow keyhole. The target shows a distinct horizontal rock span, separate abutments, and a winding road continuing through several sunlit layers. More fine shader variation cannot expose that missing composition.

Inspected actual `output/gauntlet/round-23/03-canyon.png` and generated target `docs/inkstorm-overhaul/concepts/03-canyon.png`. Actual bundle: `index-Dp0pFqH7.js`, SHA-256 `9c28f1829f638090aae1082006729a6f48701e61a5fbb568e65105ae9ab31f74`. No runtime, assets, tests, Blender scene, or browser was changed or run for this proposal. CPU-only source/geometry/course inspection supports the dimensions below.

## Actual source and placement

- `assets/source/inkstorm/build_world_kit.py:49–66` builds `canyon-arch` as a swept ellipse: 40 longitudinal segments × 10 cross-section sides, centerline radii 68 m horizontal / 82 m vertical, tube radius 13–18 m plus sinusoidal variation. All stone polygons use smooth normals. This is an 800-triangle rounded tube with local waviness, not a sculpted natural bridge with distinct structural blocks.
- `public/assets/inkstorm/canyon-arch.glb`: 63,568 bytes, SHA-256 `36876e340a578993c9c3d01084029d1ca0b757ef140ae482bbd1e0e1ff6b0453`; one primitive/material; POSITION, NORMAL, COLOR_0; glTF bounds `[-83.765396,0,-16.794767]` to `[86.930084,99.791832,16.788940]`. `world-kit-receipt.json` and `mixed-geology-receipt.json` record the original source. It is still the initial arch asset, not the later scanned buttress.
- `src/game/race/inkstormLayout.ts` places two arches at 36% and 82% of sampled narrow-canyon points. The flagship's first arch is `inkstorm-canyon-arch-224`, progress **0.4609375**, world X/Z **19797.466505 / 341.028472**, yaw **−2.502155930**, scale **[1.05,1.08,1.5]**. Its base is ground minus 1.5 m: **Y 7.065979**. The second is `inkstorm-canyon-arch-225`, progress **0.5078125**, X/Z **19723.536488 / 47.077931**, yaw **2.341992715**, scale **[1.15,1.2,1.5]**.
- `src/render/inkstorm/InkstormWorld.ts:45–71` loads and merges each GLB, discards its original materials, and installs one shared stone material. Lines 119–132 compose the placement matrix. Only the `canyon-buttress` family receives full-footprint grounding; arches use center ground minus 1.5 m. The arch is also included in the static scenery shadow clone. There is no separate arch LOD today.
- `src/render/inkstorm/InkstormRockGrounding.ts` extends buttresses downward while preserving their authored crown. This fixes foundations but does not make the large above-road face smaller.

The round 23 canyon camera sits at `[19864.144987,-0.216564,492.220370]`; the canonical route pose is progress **0.44140625**, width **15.6008 m** (half-width). Relative to that route pose, the first arch is **148.14 m forward**. The two immediately preceding buttresses are only **49.08 / 40.90 m forward**, with nearly matching height, width, and depth:

| Placement | Progress | X / Z | Lateral from review route pose | Current scale X/Y/Z | Crown Y |
| --- | ---: | --- | ---: | --- | ---: |
| `inkstorm-canyon-buttress-91` | 0.44729237368968017 | 19931.643757 / 395.789646 | −91.13 m | 1.458541 / 1.300499 / 1.6 | 145.82 m |
| `inkstorm-canyon-buttress-93` | 0.44729237368968017 | 19762.460784 / 469.217131 | +93.12 m | 1.458541 / 1.300499 / 1.6 | 157.60 m |

Each occupies roughly **117 × 160 m** in its rotated horizontal box. Their near faces dominate the frame before the arch becomes visible. The current hole looks much narrower than the arch's own broad opening because these surrounding masses mask it. Exact per-pixel object ownership would require an object-ID render; the placement analysis establishes the occlusion mechanism without claiming such a render was performed.

## First change: open the existing composition

Apply this only to the flagship seed **0x494e4b53**, after the current freeze. Resolve the two placements by family plus their authored progress/side, then give them stable semantic IDs; the numeric suffixes can change if earlier placements are added. Keep their yaw. Move them away from the course by the bounded lateral offsets below and reduce their dimensions asymmetrically:

| Placement | Move along its course right vector | Proposed X / Z | Proposed scale X/Y/Z |
| --- | ---: | --- | --- |
| `…buttress-91` | −12 m | 19942.651696 / 391.012066 | **0.92 / 0.72 / 0.95** |
| `…buttress-93` | +18 m | 19745.948875 / 476.383502 | **1.00 / 0.82 / 1.00** |

This changes the near cliffs into unequal shoulders of about 86 / 98 m authored height and 74×95 / 80×100 m footprint, exposing the distant arch's span. It retains the current central route and the useful foreground frame. Do this placement change first and capture the same camera before spending polygons on the arch.

CPU safety check of these exact proposed transforms used the actual canonical 80×120×100 m buttress bounds, all 16,384 main-route samples, and every branch segment sampled at no more than 0.4 m spacing. Minimum distance from the full rotated box to the lane edge was **46.853 / 47.402 m**. Subtracting a conservative **1.959 m** interval/width-change allowance gives lower clearances **44.895 / 45.443 m**. These exceed the current 7 m scenery guard and the new wide vehicle's half-width with substantial room. This result applies to this flagship course, not arbitrary seeds.

These ordinary buttresses are absent from `obstacleBuckets`; only specially named fork buttresses receive box collisions. Moving the two ordinary scenery instances leaves terrain, road samples, branches, obstacle definitions, driving, PB identity, and fork collision islands unchanged. Do not generalize this transform to other seeds without repeating the corridor check. Preserve the existing placements in the receipt and rerun the same physical/visual guards during implementation; this review did not modify tests.

## Second change: sculpt a real rock bridge, within 30k triangles

Create a new isolated Blender scene and a new source script, for example `scripts/blender/build-canyon-arch-v2.py`. Preserve the 800-triangle original and its exact hash. Author one merged, vertex-colored mesh with broad fractured forms; avoid adding disconnected pebbles to compensate for a smooth tube.

Use the existing glTF frame: **X across the opening, Y up, Z along the road**. Keep the external canonical envelope inside approximately **X [−83.76,86.93], Y [0,99.79], Z [−16.79,16.78]** for an initial compatible revision. The existing first placement then stays within roughly 179×108×50 m. Depth variation can use most of that 50 m runtime extent instead of looking like a thin front outline.

- Replace the smooth ellipse with two unequal abutments and a thick, slightly diagonal bridge. Put the broad left shoulder higher and the right shoulder lower; use 5–7 large planes, deep offset ledges, and one broken cap instead of regular ring segments.
- Reserve a continuous rectangular lower opening **X [−44,44], Y [0,24] across the entire Z depth**. No loose blocks, talus, internal faces, or displaced geometry may enter it. Keep abutment toes outside approximately `abs(X) >= 49`.
- Above that guaranteed clear box, shape the underside through approximate X/Y control points `[-49,24],[-42,38],[-28,51],[-8,60],[15,57],[34,45],[49,27]`. These are a proposed silhouette, not permission to shrink the protected lower opening. Make the outer cap range from about Y 77 to 99, producing a legible horizontal span with real thickness.
- Carve three broad fractures into the cap and shoulders: roughly 4–8 m wide and 3–6 m deep, with asymmetric ledge offsets of 2–5 m. Give the front/back faces different Z positions over large areas; retain a clean continuous load-bearing silhouette rather than a noisy chain of similar chunks.
- Allocate about **14k triangles** to the continuous arch/abutment surfaces, **7k** to broken strata and cap planes, **4k** to connected basal ledges/talus outside the protected opening, and **2k** to silhouette refinement: **27k target, 30k hard ceiling**, one primitive/material. At most two instances add about 52.4k triangles over the old pair when both are visible; shadow and actual whole-frame cost still need measurement.
- Store explicit hard edges only at major fractures and smooth the broad weathered surfaces selectively. Export normals and COLOR_0, no animated displacement, no extra material draws, no lights/cameras/extras. `InkstormWorld` replaces Blender materials, so geometry and normals must carry the result.

The 88 m canonical lower opening becomes **92.4 / 101.2 m wide** at the existing two scales. The canonical 24 m clear height becomes **25.92 / 28.8 m above the arch base**. The route half-width is about 15.08 / 18.73 m at the two arches, but final acceptance must use the full curved route sweep and actual terrain elevation over the entire 50 m depth. Check a swept envelope covering lane half-width + **9.6 m vehicle half-width + 7 m clearance**, and road height + **12 m**. Ray/triangle checks must prove no intersection with the new mesh; do not infer safety solely from its center opening. The second arch and expedition seeds require their own check. If they fail, omit that scenery instance or widen its opening without changing the road.

## Depth behind the arch and acceptance

After the near-cliff and arch changes, inspect buttresses `…99` / `…100` at progress **0.4622021194793362**, then the farther `…103` / `…106` pair at **0.4771118652689922**. Their repeated tall crowns can still turn the view through the arch into a second wall. Keep only one tall shoulder per depth band and lower or shift the opposing shoulder using the same all-corridor box guards. Preserve at least 180–250 m of visible road ahead through the opening. This is a follow-up composition decision after the first controlled capture, not a blanket deletion of canyon scenery.

Acceptance should compare the same round 23 camera, then views 80 m before, under, and 100 m beyond each arch. The span needs a visible outer silhouette, separate near/middle/far formations, and a road that remains readable through the turn. Use a fresh critic with the target and actual screenshots. Only then tune material contrast, measure the combined race at the requested 40–60 fps, and consider an arch LOD if the measured cost warrants it. No concept-parity or performance claim follows from this proposal.
