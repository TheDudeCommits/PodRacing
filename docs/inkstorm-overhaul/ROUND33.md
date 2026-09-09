# Round33 — Foundry construction and pipe connections

> Historical round33 record. The current candidate and technical checkpoint are documented in [ROUND34](ROUND34.md). All V5/V6 claims below retain their original build scope.

The frozen verified checkpoint is **V5**, `index-CQCm3676.js`, **1,607,258 bytes**, SHA256 `1071c747951e84a8954c94bff228b6edcebcce0b81d36920fa8770925c88feb8`. Typecheck, build and **637 tests / 115 files PASS**. The thirteen-image capture has no browser errors and its owned Chrome/server/port 5186 are closed. The [V5 performance and recovery report](FULL_RACE_PERFORMANCE_ROUND33.md) now records PASS for two complete Polwo races plus actual Cup Continue, seven staged Polwo section checks, targeted Foundry context recovery and the original Teemto/Cup resource cycles. These results cover the [complete frozen V5 files](../../output/gauntlet/round33-v5-frozen-runtime/inventory.json), not later working-tree edits, and do not repeat the round32 three-appearance/six-race matrix.

The **current V6 candidate** is `index-UMp54_Nl.js`, 1,607,258 bytes, SHA256 `b23b8cc0f020424a658b2a7b82235386f1b09b75dc30bca28716bb0ff4346216`. It selects service gantry V3 with an exposed hoist drum, cable legs, sheave and open J-hook. **637 tests / 115 files, typecheck/build and thirteen-image capture PASS**; no browser errors and owned port5186/browser/server closed. Its new asset has not yet repeated V5's full-race/context/resource checks, and its fresh critic rejects construction7 / scene6.5.


**Visual acceptance remains FAIL.** The fresh V5 critic gave local construction **6.5/10**, original-concept scene quality **5.5/10**, both below the strict 8 gate. Its priorities are a mechanically legible hoist and a continuous, varied industrial canyon extending into depth. The earlier fresh V4 critic scored 7.5/6.5 and also rejected both gates. Different critics' scores are not an objective progress curve; V5 repairs a measured pipe-joint defect, while both reviews identify unresolved scene and construction issues. All seven original world targets remain unchanged. The overall recommendations 1–8/fleet task remains incomplete, with three runtime vehicle families and 23 awaiting runtime preparation. No overhaul commit, push or deployment.

## Retained changes

- **A dedicated industrial gantry:** the grid keeps its original countdown assembly. Industrial crossings use the new service gantry, with a continuous U-shaped pressure main, thick paired flanges, four circular landings, two ladders, rails, foot braces, a trolley assembly and six caged fixtures. Only the reserved glass palette receives self-emission; it does not illuminate neighboring surfaces.
- **Detailed vessels:** all 7,160 original pipe-bank triangles are retained; 12,800 new triangles add tank bands, access/manway hardware, ladders, decks and explicit closures at the three free pipe ends. The three connected source sockets and collector clearance reservation are preserved.
- **Connected pressure mains:** the75 existing tube routes and service bridge remain unchanged. Eighteen grounded collector bodies replace empty feed junctions. Closed black cap-like fittings were replaced by open-bore steel flange pairs, gaskets and eight bolts.
- **Curve-aligned collars:** a technical review found that V4's fixed endpoint-ray offset could place a flange 4.492 m off the actual tube, with an approximately 90-degree axis error. V5 samples the same curve by inward arc distance and uses its tangent. All 96 shifted collars are within 0.0008952 m of their requested centers in emitted Float32 geometry. Original unshifted socket transforms remain byte-exact.

`src/game/race/inkstormLayout.ts`, course construction and simulation source remain byte-identical to frozen round 32. Render-family selection is separate from physical placement. Course/drive/rules identities are unchanged. The first metadata-based attempt caused nine physical digest failures; it was removed and the exact physical source restored. Failed logs remain preserved.

## Blender source and packaged assets

All authoring/export/render work used isolated Blender scenes. Source scenes and the original active Cruise scene/layer/15-object selection were restored. The V2 export preserved all 139 pre-existing scenes and collection memberships. The shared `.blend` was not saved. Original assets, native exports, failed derivatives and exact-retention packaging receipts remain available.

| Installed asset | Bytes | Triangles | SHA256 |
| --- | ---: | ---: | --- |
| `public/assets/inkstorm/foundry-service-gantry-v2.glb` | 1,331,516 | 19,956 | `58fc12d837039eb73111886b1b91c294516c51fc47a4a0d00200717161fd39ba` |
| `public/assets/inkstorm/pipe-bank-detail-v1.glb` | 1,329,140 | 19,960 | `7a28b2e2f3ce25b173ed21033cbe0d28e7341197407b5e86d2400848dba8d946` |

Both are one-primitive, one-material, texture-free packages and pass Khronos validation with zero errors, warnings, infos or hints. Gantry V2 retains 3,940 original triangles plus 16,016 native-exported additions. The pipe bank retains all 7,160 originals plus 12,800 additions. Original retained position/normal/color/winding data and new native-exported data are preserved by the final packaging step. Native Blender exports had measured normal/color round-trip differences; those native files and their receipts are retained, not represented as exact originals.

Source folders: [service gantry](../../assets/source/inkstorm/foundry-service-round33/v2/PLAN.md) and [pipe detail](../../assets/source/inkstorm/foundry-pipe-detail-round33/). Three neutral technical views of each asset are source inspection, not gameplay or concept-parity evidence. [Supplemental concept 11](concepts/11-foundry-construction-round33.png) was generated with imagegen from the original Foundry target and an actual round 32 frame; its provenance JSON remains beside it.

## Iteration history

| Candidate | Entry bundle | What was tested / observed |
| --- | --- | --- |
| Gantry V1 | `index-CtA3EzpQ.js` | 623 tests / 112 files; five Foundry viewpoints and the seven-section capture. Fresh critic: source 6.3, local gameplay 5.7, original scene 4.8, all FAIL. |
| Open joints V2 | `index-kHQ6GicE.js` | Replaced cap discs; actual views exposed ring-like ends with no readable destination. Preserved. |
| Collectors V3 | `index-CZnk0rff.js` | Grounded receiving cylinders. Fresh three-variant critic preferred V3; connections 7, industrial construction6.5, world parity5.5, all below 8. |
| Combined V4 | `index-BykCM9Lt.js` | Gantry V2, detailed tanks, warm lamp glass, shifted endpoint collars. 631 tests / 114 files. Fresh construction 7.5 / scene 6.5 FAIL. Subsequent CPU review found displaced collars on short curved leads. |
| Visible hoist V6 | `index-UMp54_Nl.js` | Hoist-only gantry V3. 637 tests / 115 files and thirteen-image capture PASS; fresh critic construction7 / scene6.5 FAIL; current full-race verification not repeated. |
| Curved joints V5 | `index-CQCm3676.js` | Same assets and tube routes; actual-curve collar placement. 637 tests / 115 files. Fresh construction 6.5 / scene 5.5 FAIL; representative two-race/Continue, seven-section, Foundry context and resource checks PASS on the frozen V5 files. |

The initial combined-V4 full test run timed out because it made over 1.3 million separate assertion calls. The finite scan now checks every coordinate and makes one aggregate assertion; the 5 s timeout and geometry coverage were not relaxed. The failed log is retained alongside the passing rerun.

Captures remain under `output/gauntlet/round-33-foundry-{gantry-v1,joints-v2,collectors-v3,combined-v4,curved-joints-v5}/`. Each has seven standard staged views, four supplemental Foundry views, garage, a short live-drive still, state/build receipts and cleanup evidence. Staged HUD speed is not measured motion. The short ten-second capture drive samples the starting area, not a completed Foundry race.

## Cost and acceptance boundaries

The merged pressure network increased from 46,788 to 152,172 triangles, with 16,434,576 bytes of position/normal/color arrays, still one opaque mesh/material. Eighteen detailed banks and the one industrial gantry bring the combined increase to 349,440 authored triangles before culling or render passes. No fixed 40–60fps or 600k-triangle-budget claim follows from these source counts. The [exact V5 receipts](FULL_RACE_PERFORMANCE_ROUND33.md) record full-race means 59.453629 / 59.120663 RAF Hz, p95 16.8 ms for both, 156 racing intervals >25 ms and zero >50 ms. The Cup collector includes result-classification grace after the 130.350 s player finish through raceTime 138.358333 s; that span is not all active player driving. Requested DPR 2 remained adaptive (observed ranges 1–2 / 1.75–2). Seven separately staged section checks pass at about 60.002 RAF Hz with ending DPR 1–1.75. Foundry context recovery passes, including the active warm-emission program after restoration; its first restored cadence sample is 233.286 ms. Three resource cycles plateau at 213 geometries / 115 textures / 51 programs. All 24 saved artifact manifests match and all four owned browsers, preview servers, process groups and ports 51018/51129/51192/51249 are closed. These technical checks do not establish visual acceptance, fixed-DPR2 performance or the 600k geometry target.

[Technical review and repaired regression](TECHNICAL_FOUNDRY_ROUND33.md) · [V5 fresh art review](BLIND_FOUNDRY_V5_ROUND33.md) · [V4 fresh art review](BLIND_FOUNDRY_COMBINED_V4_ROUND33.md) · [Three connection variants](BLIND_FOUNDRY_CONNECTIONS_ROUND33.md) · [V1 gantry review](BLIND_FOUNDRY_GANTRY_ROUND33.md).

The hoist-only V3 derivative is now authored, exported, inspected in three neutral source views and installed. Its final package is 1,327,988 bytes / 19,872 triangles / 33,518 vertices, one primitive/material with no textures, SHA256 `55d694f8406d9a2ff819ba7d262d86e30f0bc8bafd543699a8ceff83da2380b4`. It retains all 18,324 unrelated V2 triangles and replaces exactly1,632 hoist triangles with1,548. Retained attributes and winding are byte-exact; new geometry matches the preserved native export. Warm-glass168 faces and original footprint/clearance remain. Khronos reports zero issues; source receipts verify all140 preexisting scenes and shared context restored. [Hoist source and receipts](../../assets/source/inkstorm/foundry-service-round33/v3-hoist/PLAN.md). V6 actual images now show the drum/cables/hook; root inspection alone does not pass the blind gate. The V4 critic's remaining priorities are hoist readability, long-span supports, plain ivory towers/cross-members, machinery variation, depth, and foundation/terrain integration. Source detail alone does not close the original world-quality gate.

The complete frozen [round 32 technical checkpoint](ROUND32.md), [six-race cadence report](FULL_RACE_PERFORMANCE_ROUND32.md), its source snapshot and fresh 5.8/10 art FAIL remain historical evidence for that exact bundle. They do not cover these new assets or programs.
