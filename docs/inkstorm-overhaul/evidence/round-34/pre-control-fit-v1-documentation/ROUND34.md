# Round34 — Foundry corridor, solid effects and Blockrunner cleanup

**Current technical checkpoint PASS; overall visual acceptance FAIL.** The current frozen foundation-material V1 build contains the new Foundry corridor and solid-effects V2. It passes 648 tests/117 files, typecheck/build, two ordinary Polwo races/actual Cup Continue, seven staged sections, context recovery and three resource cycles. Fresh world criticism is 6.5/10. The separate Blockrunner source cleanup passes narrowly at 8.5/10, while its driver/control fit fails 3/10. No fourth runtime family, commit, push or deployment.

Current **index-DAcqiho8.js**, **1,617,115 bytes**, SHA256 **3c07cc90bad7f90167eec60765c0f90e62ce88a990e662de6b8651905994433a**. [Current exact performance](FULL_RACE_PERFORMANCE_FOUNDATION_ROUND34.md) · [Actual current images](CURRENT_VISUALS.md) · [Fresh world/source review](BLIND_FOUNDATION_AND_SOURCE_CLEANUP_ROUND34.md).

## Runtime changes

**Foundry corridor.** Ten landforms—six buttresses, two cliff strata and two mesas—use three existing instanced families and their retained near/far geometry. They add depth around the actual flagship Foundry without changing road geometry, terrain authority or layouts. High-source total 170,656 triangles, far 27,856; actual draws depend on visibility and LOD. They are not free geometry or a claim of a 600k scene budget.

`InkstormFoundryCorridor.ts` tests rotated source bounds against the full main/branch racing corridors, measured maximum craft half-width 10.5 m, interpolation allowances and a 7 m margin. Independent dense main/branch sampling, actual imported body bounds, all-vertex toe grounding and a 1.75 maximum vertical stretch guard supplement the construction checks. Eight tests verify clearance, final instance transforms, distant LOD, shared resources, full static-shadow ownership and disposal. The closest remaining conservative corridor margin is 31.382 m. These are render-only placements; course9/drive4/rules2 and `inkstormLayout.ts` remain identical to round32.

**Solid effects V2.** Pickups now have a thick closed casing, machined lip, actual receiver recess and selective signal bars. The same geometry keeps mines within their old thin world envelope through local Y compression. Opaque banded material replaces flat bright casing; hardware joins the existing opaque prepass. Five overlapping closed rock chunks replace visibly wire-like rubble: flat normals, coherent shared corners and plane-value contrast establish mass. Source rock geometry remains 100 triangles per cluster. The first cluster's actual minimum is seated at the hazard ground; the second retains falling motion. Existing gameplay radii, positions, damage and event authority remain unchanged.

The eight beauty pools remain pooled; hardware can add a visible prepass submission. The existing edge-suppression tag attenuates all Sobel ink—including depth silhouettes—to 8%; it is not selective normal-only suppression. New geometric tests use rays to verify the receiver recess/back, actual mine transforms to check its envelope, and actual rock vertices to check ground/footprint at several scales. Resource/disposal checks retain ownership expectations. This is volume/readability progress, not final effects acceptance.

**Foundation material coordinates.** Foundations use unit boxes enlarged by instance transforms. Their prior `vLocal=position` stretched 0.055 of a wear tile over an entire 94 m face. The optional foundation-only material branch now derives metre coordinates from the instance/model basis lengths, attached to each support's axes and vertically anchored to its top. A 94 m×44m pad spans 5.17 × 2.42 wear repeats. Geometry, physical placement, palette, fragment shader, shadows and texture-read count remain unchanged. Seven separate CPU contract checks verify real physical scale, unchanged geometry/matrices/colors, other material defaults and disposal. Actual shader compilation/capture and context/resource checks then passed. [Candidate, preserved baseline and checks](../../output/gauntlet/round34-foundation-material-v1/README.md).

## Actual visual gauntlet

The current thirteen-image capture is unedited runtime output at 1440×900 CSS/DPR 1.5; root individually inspected all 13. It includes the seven original section framings, garage, four extra Foundry viewpoints and a short ordinary Start/W drive. [Raw capture/cleanup](../../output/gauntlet/round-34-foundation-material-v1/receipts.json) · [Copied image inventory](evidence/round-34/foundation-material-v1/gallery-inventory.json). Capture port5186 closed. Staged410KPH/zero-clock stills are not live-race performance evidence.

The prior V2 detail sequence records 15 actual PNGs and a WebM through existing capture-only mine/hazard scenarios and cameras. Each scenario advances 120 fixed 1/120 s ticks, one tick per animation callback; this is **one simulated second staged over callbacks, not a normal-speed or FPS test**. Snapshots record actual scrap-mine-triggered/weapon-hit and rockfall-hit events. Root inspected representative state samples, not the complete continuous video. The source/target framing sometimes hides objects; the requested cockpit camera filename still shows a behind-racer view. No claimed close first-person acceptance follows. [Sequence/receipts](../../output/gauntlet/round34-solid-effects-v2-detail/receipts.json), owned port5187 closed.

Fresh critic results remain separate judgments:

| Completed trial | Fresh result | Scope |
| --- | --- | --- |
| Corridor + effects V1 | Construction 7 / scene 6, FAIL | Five Foundry views against original06 and supplemental11. |
| Solid effects V2 | Overall 6, FAIL | Pickup and hazard rock volume pass narrowly; uniform rubble, flat pale particles and weak mine reaction fail integration. |
| Foundation/current world | Overall6.5, construction 7.5, original parity 5.5, FAIL | Ground contacts, material scale and depth remain below strict 8. |
| Blockrunner source cleanup | Narrow cleanup 8.5 PASS; driver/controlfit 3 FAIL | Neutral source comparison only; no styled/runtime acceptance. |

[Corridor critic](BLIND_FOUNDRY_CORRIDOR_V1_ROUND34.md) · [Effects critic](BLIND_SOLID_EFFECTS_V2_ROUND34.md) · [Current world/source critic](BLIND_FOUNDATION_AND_SOURCE_CLEANUP_ROUND34.md). All 27 image references in the latter two reports were independently rehashed exactly; [validation](evidence/round-34/blind-image-validation.json). Different critic scores are not an objective improvement curve. All seven original world targets remain unaccepted.

The next world pass needs authored ground-contact banks/debris and believable sections on the large exposed walls, medium-sized wear and edge hierarchy across materials, varied process assemblies and stronger layered depth. More tiny speckles or repeated vessel copies alone will not close the gap. Effects need irregular size classes, clearer mine source/impact and restrained non-square dust while retaining player visibility.

## Current measured technical checkpoint

Local Chrome152/ANGLE Metal/Apple M4,1440×900 CSS, requested DPR 2, native adaptive governor. Ordinary Time Attack finishes 63.758333 s, mean 59.453722 Hz; Cup round1 finishes 131.008333 s, mean 58.945046 Hz; both p95 16.8 ms. Both have valid gold results and actual Continue opens Foundry. No capture seeking or stepping is used in these full races. The second Cup round is not driven.

The preserved 12,356 raw rows contain 11,987 racing intervals,181>25ms and zero>50ms. Cup sampling extends to 139.016667 s through normal classification: 481 intervals ending after player finish,8,016.3ms total, remain included. Actual observed DPR is 1–2 for Time Attack and 1.75–2 for Cup. Sampled native maxima are 108/265 calls and4,926,661/5,027,537 rendered triangles. Those are renderer counters, not unique mesh counts or a 600k budget pass. No universal40–60fps or fixed-DPR 2 claim.

Seven staged sections, Foundry context/readiness/fallback/recovery and original default-Teemto/Cup resource cycles pass. Resource plateau is 213 geometries / 115 textures / 52 programs across all three cycles, with eight final-cycle deltas exactly zero. First post-restoration cadence 233.22 ms passes its original<250ms recovery guard; this does not establish hitch-free restoration or racing cadence. All four current attempts pass first time; ports 53481/53648/53723/53775, owned browsers, previews and process groups are closed.

[Frozen current inventory](../../output/gauntlet/round34-foundation-material-v1-frozen-runtime/inventory.json): **474 files/164,288,407 bytes**,142 source/41 public/47 dist/107 harness/6 config/131 physical test files, SHA256 **24afaafb774da7a98e6f456762cfeee2823ae8fb3e15e6091172f94b35c27f31**. The physical-test inventory includes support files; 117 test files executed. All 24 core manifests match. Nineteen ordinary harness manifests have 102 entries; five readiness manifests have 107, differing only by five additive adapter files. The frozen union retains all 107. A101-file evidence inventory preserves actual receipts. [Exact audit/report](FULL_RACE_PERFORMANCE_FOUNDATION_ROUND34.md).

## Blockrunner and concept work

[Actual source cleanup](BLOCKRUNNER_CLEANUP_ROUND34.md) records the completed Blender audit, four original neutral views, successful copy-only 4,828 opposing-face removal and four matched cleanup views. Pilot/craft shapes, retained normals, material inputs and source GLB remain intact. The persistent cleanup scene brings Blender to141 scenes; all earlier memberships and original Cruise scene/layer/selection remain preserved. The shared `.blend` was not saved. Colour Blockrunner remains source preparation, not a new runtime family.

The whole-craft analysis found no cross-object exact duplicate groups, no same-winding groups and no degenerate faces. Open component structure prevents a blanket hole-fill/outward-normal assumption. Existing hands still sit behind controls. Full-length coaxial control relocation from the original floor height intersects actual legs; that failure is preserved, and the next trial revises controls/mounts without deforming the pilot. No final fit or anchor acceptance yet.

Concept12 is the generated Blockrunner palette proposal. **Concept13** was generated with Codex imagegen from original06 and the actual V2 hazard view: [effects target](concepts/13-solid-effects-round34.png),2,584,264 bytes,SHA256`3f2223264e2c7ee7f39f4144668305392ec6f9474253ef493e463959f0ef13d6`. [Exact prompt/references](concepts/13-solid-effects-round34.json). It guides a worn receiver pickup, compact mine burst and varied layered sandstone fragments. Generated details/scale are art direction, not source geometry or runtime evidence. Original seven targets remain unchanged.

## Preserved revisions and continuation

| Revision | Entry bundle | Bytes | SHA256 |
| --- | --- | ---: | --- |
| Round34 corridor/effects V1, earlier frozen technical PASS | index-CV-CIBxc.js | 1,614,359 | 080280e5f7ea965d9d2343c13292dcf81abc89a63da8b40cb7c5e91143be887d |
| Solid effects V2,648-test build/capture/critic | index-D9QXQ96S.js | 1,616,328 | 1e447d7515240229a441eaf92a3b57767dd7e7d766cde746463dca0bf2803cd6 |
| Current foundation material V1 | index-DAcqiho8.js | 1,617,115 | 3c07cc90bad7f90167eec60765c0f90e62ce88a990e662de6b8651905994433a |

The [earlier V1 performance report](FULL_RACE_PERFORMANCE_ROUND34.md) preserves its initial pre-context failure at exactly10 cadence samples and a separate readiness retry with all original gates retained; the condition was already satisfied on retry. Frozen V1 is not edited or substituted by current results. Round33V5,33V6 and32 histories remain. [Prior main docs](evidence/round-34/pre-foundation-documentation/receipt.json) and `output/gauntlet/round34-before-foundation-material-v1/` preserve pre-edit files.

Continue with source controls/paint/runtime preparation, world ground/material/assembly critique and effects target13. Main counters remain **3 runtime families/23 pending**. Retain licensed source history, the NoDerivs publication boundary and deterministic simulation authority. Human/controller/audio, complete championship balance, other-device/multiplayer and final visual acceptance remain open. Close owned browsers immediately, never touch unrelated port5211, and never save the shared Blender workspace.
