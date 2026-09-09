# Blockrunner: next isolated pilot/control fit

2026-09-08. **Plan and diagnostic script only; no fit executed.** All four actual cleanup comparisons were independently inspected. The cleanup fixes the conspicuous driver triangle/leg-striping artifacts while retaining openings and the complete craft silhouette; see `CLEANUP_V1_VISUAL_REVIEW.md`. Keep that narrow cleanup and its original normals as the next trial's input. Do not mix further normal repair, styling or root normalization into control fitting.

## Retained pilot anatomy

The complete original driver remains one mesh, `pasted__LegoTri36_lambert1_0`, with 4,128 unique cleaned triangles. The external 0.00001 m positional-weld study gives 32 vertex-connected components. Their analysis ranks below classify source geometry for later inspection; they are not stable Blender component IDs or permission to weld, separate, recolour or move those faces.

| Anatomy evidence | Analysis ranks | Fit policy |
| --- | --- | --- |
| Upper head/helmet and visor | 0, 7; side hinge details 14, 15 | Preserve the full helmet, visor and stud opening. |
| Neck/head connection candidate | 8 | Preserve; not an accepted eye or head pivot. |
| Torso | 6 | Preserve its authored shape and current transform. |
| Positive/negative-X upper arms | 1, 2 | Do not stretch, scale or shear the arms. |
| Negative-X grip/wrist assembly | 5, 23, 27 | Retain its complete hollow C-grip and wrist details. |
| Positive-X grip/wrist assembly | 11, 12, 17, 18, 19, 24 | Multiple components form one visible grip; do not treat individual fragments as independent fingers. |
| Hip joint/bar candidates | 9, 10, 26 | Preserve current position. |
| Legs and foot recess details | 3, 4, 20, 21, 22, 25 | Preserve authored leg recesses and seat height. |
| Lower central/axle details | 13, 16 | Preserve; semantic joint assignment remains unconfirmed. |
| Thin seam/detail pieces | 28–31 | Leave unclassified and unchanged. |

Full component bounds are in `measured-anatomy-analysis-v2.json`. Moving the pilot is not indicated by the three measured floor samples: their positive gaps are approximately 9–10 mm in the source's already scaled coordinate system. These sparse samples are not a complete contact test, but do not justify a global seat-height change.

## Measured hand openings and existing controls

The separate diagnostic `hand-grip-cylinder-analysis-v2.json` fits the actual polygonal hand openings using 41 parallel axial edges per hand. Values below are original Blender source metres, without gameplay normalization. Inner-circle RMS residuals are approximately 0.08–0.09 mm; nominal clearances do not yet establish full mesh contact.

| Measurement | Negative X | Positive X |
| --- | --- | --- |
| Existing control object | `pasted__brick230_phongE2_0` | `pasted__pasted__brick230_phongE2_0` |
| Grip centre | `[-0.312417,-20.593382,2.430911]` | `[0.470342,-20.589617,2.424137]` |
| Upward grip axis | `[-0.254402,-0.216723,0.942502]` | `[0.009309,-0.214011,0.976787]` |
| Approximate inner radius | 0.069902 m | 0.069924 m |
| Control shaft radius | 0.065583 m | 0.065583 m |
| Nominal radial clearance | 4.32 mm | 4.34 mm |
| Existing bar length | 1.138555 m | 1.138555 m |

The original rods are vertical and rooted about 0.42 m forward of the grip centres. **Pivoting a straight rod about its original base to pass through the hand centre is not a proper coaxial fit:** it leaves approximately 46.48° / 45.56° disagreement with the measured hole axes. The actual hands have open slots, so this is a coaxial-fit infeasibility result, not a proof about every possible partial edge contact.

Moving the existing rods rigidly onto the grip axes while retaining their original base height yields the following **unaccepted clearance candidates**:

| Candidate | New base centre | Base displacement magnitude |
| --- | --- | ---: |
| Negative X | `[-0.133472,-20.440941,1.767959]` | 0.593688 m |
| Positive X | `[0.464088,-20.445850,1.767959]` | 0.573701 m |

These shifts bring the bases close to the legs. They have not been checked for whole-craft collision, believable mounting or exact contact. The unchanged arm shapes and bar radii are promising, but a grip-centre match alone is not enough to authorize these transforms as a finished pose.

## Next executable sequence

1. After root releases the current performance window, run the prepared external-only `analyze-control-fit-clearance.py`. It reads the pinned GLB and measured candidate JSON, constructs in-memory axis segments, and finds source triangle surfaces within a conservative capsule around each unchanged bar. It writes `control-fit-clearance-analysis.json` only, retaining source triangle IDs and closest locations. **It has not run.** Capsule endcaps overestimate the actual tapered flat rod ends; distinguish floor/mount contact, intended grip clearance and unintended leg/torso intersections from the actual triangles.
2. Review those contacts against the retained source geometry before preparing exact Blender transforms. If either candidate enters a leg/torso, do not hide the defect by moving the pilot, altering seat height, shrinking hands or deforming arms. Preserve the candidate report and prepare a separate controls-layout revision from the two existing controls. Do not treat a collision failure as permission to author a different pilot.
3. Once a feasible controls layout is measured, prepare a guarded MCP copy trial from the **actual cleanup-v1 receipt** and its persistent scene `PodRacing — Blockrunner exact opposing face cleanup round34 V1`. Prefix existing safe 00/01 and compare actual source, cleanup, mesh/material and corner-normal signatures before mutation. Copy all 59 meshes/materials into one new isolated trial scene and move only the two controls by explicit, reviewed rigid matrices. Keep all pilot/vehicle vertices, source polygon lineage, normals, materials and other 57 world matrices unchanged. Require unchanged triangle count 43,556 and unchanged overall craft bounds/silhouette. Record old/new control matrices, measured grip axes and clearance evidence in the receipt.
4. Keep all 141 preexisting scenes and collections, source/cleanup memberships, active context and selection intact; remove only trial-owned data on failure. Do not save the shared `.blend` or export to `public`. The source GLB/imported scene and the successful cleanup scene remain immutable inputs.
5. Render the fitted copy using the actual neutral driver camera first, then the same front/fullcraft cameras. Inspect hands surrounding the original rods, wrist/arm integrity, believable lower support, leg/torso clearance and the full silhouette. Preserve failed trials. Paint/readability work, driver/seat/throat runtime anchors and gameplay normalization follow only after this source-only fit is reviewed.

There is deliberately no executable MCP pose fragment yet: source-surface clearance is the next unresolved measurement. The prepared external diagnostic makes that decision concrete without inventing a safe controls transform. All files stay under `assets/source/inkstorm/blockrunner-round34/`; no runtime/public edits or Blender calls were made by this reviewer.
