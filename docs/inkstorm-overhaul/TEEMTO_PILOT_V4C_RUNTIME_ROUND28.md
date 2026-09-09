# Teemto pilot V4C runtime revision — round28

V4C is the current local hero review candidate. It lifts the suit's blue-gray color and gives cloth, webbing and gloves separate persistent runtime responses. The frozen round28 build passes all 14 appearance/lifecycle stages and has 17 actual world captures with zero unexpected browser errors. **The fresh pilot and world art gates still FAIL; all four required full-race cadence gates and both result/Continue flows PASS on the frozen round28 bundle, with both original Sebulba clock-oracle failures retained.** Current round29 pit/foundation source changed after the freeze and is outside that performance result. The V4B round27 receipts remain intact as history.

## Exact asset and source

The hero metadata in `src/game/vehicleAppearance.ts` now uses revision `teemto-pilot-v4c`, URL `/assets/inkstorm/vehicles/teemto-hero-v4c.glb`, the existing pilot prefix and unchanged attachment coordinates. The GLB is **6,774,412 bytes**, SHA256 `f3eb56a54b7dbb8f4a26263fb26f1f88b188db6bcc409910a3561ae939f1eef1`, matching the isolated [source runtime candidate](../../assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4c/teemto-pilot-v4c-runtime.glb).

The licensed Teemto body retains UID `4eff45899ada40bb920c5c744663db90`, Rafael Fernández Calvo (`rafarelo`) attribution, saved official CC BY 4.0 metadata, and the existing public changes notice. The preserved imported-source GLB remains SHA256 `b7e2cc046fd392659886b1af88bdda1117037009351493f69dccdf78c4c53836`. No untouched source archive is claimed. Its empty cockpit inspection and the original static pilot's construction history remain in earlier source receipts.

V4C is a material-only sibling of V4B. The principal suit base changes from linear `(0.017,0.025,0.033)` to `(0.065,0.095,0.130)`, with separately controlled seam and collar colors. Blender bakes only the suit into a copied existing atlas, without repacking UVs or programmatically painting/filtering raster images. Gloves, webbing, orange accents, shell and hardware keep their authored source treatment. The [source handoff](../../assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4c/HANDOFF.md) records the exact bake, three matching source views, successful Cruise context restoration, and the two initial image-buffer failures before the writable copied atlas was loaded correctly.

## Geometry and map contract

- **59,324 total triangles**, including **15,779 pilot triangles**; nine primitives, eight materials, six separate pilot materials and five total textures.
- Every index and every POSITION, NORMAL, TEXCOORD_0 and TANGENT array is exactly equal to V4B. Node names and transforms are identical. All 43,545 original body triangles also compare with zero world-space position/normal/UV error against public V1.
- The original six body/group names, six `teemto-pilot-` mesh prefixes, runtime basis, pilot/exhaust/coupling anchors, seats, controls and licensed hoses are preserved.
- The new color atlas is 2048×2048 lossless WebP; its decoded pixels exactly equal the Blender PNG output. The larger payload reflects lossless color encoding. Existing 1024×1024 tangent-normal and green-channel roughness PNG payloads, and both body texture payloads, are byte-identical to V4B.
- All maps use UV0 without texture transforms. GLB normal scale and roughness factor remain 1. The six pilot materials are named `Pilot atlas v4c runtime {suit,accent,webbing,rubber,shell,hardware}`.
- Khronos validation reports **0 errors, 0 warnings**, with only two historical body-image NPOT informational notices. [Exact validation](../../assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4c/runtime-validation.json) and [validator output](../../assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4c/gltf-validator-runtime.json) remain in the isolated source directory.

## Persistent runtime material responses

The hero definition uses exact DCC material-name lookup. These are authored metadata settings, not temporary diagnostic overrides. The rival remains `teemto-v1` without these hero-only styles. Shell and hardware keep the existing general runtime material treatment.

| Exact material suffix | Normal strength | Specular | Rim | Reflection | Procedural wear |
| --- | ---: | ---: | ---: | ---: | ---: |
| `suit` | 0.25 | 0.025 | 0 | 0 | 0 |
| `accent` | 0.25 | 0.025 | 0 | 0 | 0 |
| `webbing` | 0.35 | 0.035 | 0.01 | 0 | 0 |
| `rubber` | 0.5 | 0.09 | 0.035 | 0.015 | 0 |

Suit, accent and webbing use cloth diffuse bands `#9ba5b7`, `#c0c4c9`, `#e5ddd0`, `#fff2dd`. The four styles distinguish matte cloth from darker, smoother gloves without altering the shared licensed body material settings.

## Diagnostic in-world evidence

`output/gauntlet/pilot-detail-round28-v4c/receipts.json` has SHA256 `4700e338c7f556fc30137b4af8cf1626316f2c0dcbf73223082f400d226f161b`. Its side, front-quarter and rear-quarter views run in actual GameApp world rendering, each records `materialProbe: authored`, each sees six pilot meshes, and the errors array is empty. Chrome is 152.0.7977.77. The before/after hashes for the seven tracked source files and the public V4C GLB are identical.

This receipt explicitly identifies a **Vite source diagnostic**, not a production bundle. Close camera placement is diagnostic. It does not prove ordinary gameplay readability, motion, full appearance lifecycle coverage, performance, or target-quality acceptance. The 61 focused checks preceding the wider verification remain a narrower checkpoint.

## Frozen round28 and functional lifecycle evidence

The completed verify log, `output/gauntlet/round28-verify.log`, reports **563 passing tests in 99 files**, typecheck and build. The parent task also confirmed `git diff --check` passed. The captured bundle is `dist/assets/index-CED-RrRq.js`, **1,567,417 bytes**, SHA256 `ca752f0a0f3da8e7585dd6c999d7ed5615d56c766c04e4dd767ef07256f1175d`.

`output/gauntlet/round-28/receipts.json` has SHA256 `315ae9c8a65ddb8747f763df371625b127328fee11c323058fe63fd59779bfc1`. It records the seven numbered course sections and eight supplemental views; garage and ordinary live-drive images bring the directory to **17 actual captures**. Its errors array is empty.

`output/playwright/vehicle-appearance-round28-v4c/receipt.json` has SHA256 `d79960de5d5923b146cadfdc6fc34d4797af7526638237db4b434a8ce015bb98` and outcome **PASS**, covering 2026-09-07 19:26:46.525–19:27:22.006 UTC. Both receipts identify the exact bundle above, Chrome 152.0.7977.77, macOS arm64, and a 1440×900 CSS viewport. World capture requested DPR 1.5; the lifecycle harness requested DPR 2.

All 14 stages pass: `garage-teemto`, `garage-classic`, `garage-teemto-return`, `live-teemto`, `restored-teemto`, `http-fallback`, `http-retry-teemto`, `sebulba-late-load-cancelled`, `garage-sebulba`, `garage-sebulba-angle-90`, `garage-sebulba-angle-180`, `live-sebulba`, `sebulba-http-fallback`, and `sebulba-http-retry`. The only two console errors are the intentionally injected HTTP503 responses, one per model.

Ready Teemto reports the actual embedded pilot, nine visible/registered MRT prepasses, three body draws, six pilot draws and 59,324 triangles. Its 512px body shadow still has three casters/draws and 43,545 triangles, with no omitted geometry or shadow failure. The held Sebulba preview moves from Preparing to ready at simulation frame **0→0**. Teemto context restoration, appearance persistence, late-load cancellation and explicit failure/Retry pass. This is not Sebulba-specific WebGL restoration evidence. The parent confirmed the lifecycle process exited successfully and its owned browser closed.

The separate [full round28 race report](FULL_RACE_PERFORMANCE_ROUND28.md) now records Teemto and UI-selected Sebulba completing Time Attack, two-lap Canyon Cup and actual Continue. On the exact bundle above, the four required races average **59.797–59.838 Hz**, with **16.7–16.8 ms p95**, **33.4 ms maximum**, 72 racing intervals above 25 ms and none above 50 ms. Time Attacks use adaptive DPR 1–2; Cups briefly use 1.875 before recovering 2.

Both original Sebulba attempts remain failed result-flow receipts: stored `63.32499999999705` displays correctly as `1:03.325`, but the original expected-clock calculation truncated floating-point noise to `1:03.324`. The separately preserved correction changes only the clock import/expected string; driving controls, course, quality and native cadence collection are unchanged. Its separately hashed attempt 3 then passes Sebulba TA/Cup/Continue. It finishes at `63.34166666666371`, so the earlier `.325` boundary is covered by retained diagnostics and regression, not falsely claimed as re-hit live.

The eight manifests prove unchanged runtime/assets/build across all attempts and preserve both harness versions. All six actual races retain **32,455 raw rows** and **31,218 racing intervals**, including countdown/finished frames and both failed-flow TAs. All owned browsers/servers are closed; port 5211 was untouched. These are local Apple M4 / Chrome 152 adaptive native-RAF results, not GPU time, physical display presentation, fixed-DPR-2, other-device or art acceptance. **They apply only to round28 `index-CED-RrRq.js`; current round29 pit/foundation source was edited after that freeze and has no inherited performance result.** The round26 result remains historical.

## Acceptance and preservation boundary

The preceding [runtime pilot critic](BLIND_PILOT_RUNTIME_ROUND27.md) retained matte B at **6.3/10** over A at **6.0/10**, while finding B too dark/olive and insufficiently differentiated. The fresh [round28 pilot critic](BLIND_PILOT_RUNTIME_ROUND28.md) retains V4C but **fails the strict gate**: construction 7.0, material separation 7.5, detail 6.0, fit 7.5, and target match 6.5. The 6.9 mean is informational; every criterion must reach 8. The blue suit separates more clearly from the seat and gloves, while rigid sleeve construction, weak stitches/wear, and insufficiently distinct webbing/hardware remain. The fresh [world review](BLIND_WORLD_ROUND28.md) also rejects all seven sections. Neither technical correctness nor a relative preference establishes art acceptance.

Teemto has two logical hero/rival variants and four preserved public files: historical V1 hero, V4B hero, V4C hero and unchanged rival. Both vehicle families still have four logical variants and now six physical GLBs. The V4B current export/runtime record is retained intact in history. The round26 full-race performance record remains historical and does not validate V4C. The latest sixth HTTP429 acquisition attempt at **2026-09-07 19:21:05 UTC**, all earlier acquisition history, and every other model entry remain outside this revision's scope. No deployment is claimed.
