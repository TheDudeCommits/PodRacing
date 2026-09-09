# Blockrunner control fit V1: measured candidate

2026-09-08. **External candidate preparation complete; Blender execution belongs to root.** This supersedes the unresolved measurement step in `NEXT_PILOT_CONTROL_FIT_PLAN.md`. The successful cleanup scene and all original pilot geometry remain immutable inputs. Root's cleanup report and actual inventory were not edited.

## Failed candidates retained

The unchanged, full-length coaxial rods at floor height intersect both legs. `control-fit-clearance-analysis.json` records 53 left-pilot triangle contacts, including exact axis/surface intersections through the leg, and 8 right-pilot contacts with up to about 17 mm shaft overlap. Both also meet floor/stud surfaces. The initial cranked layout grazed the hand surfaces and is preserved separately in `cranked-control-clearance-analysis.json`.

Root authorized a bounded redesign of the two controls and their mounts while preserving the pilot and seat. No arm deformation, replacement pilot, seat shift or broader normal recalculation is part of this candidate.

## Feasible measured layout

Each original straight control supplies its existing 20-sided shaft and beveled end profile. The grip is shortened to **0.35 m** along the measured hand-opening axis. Its original radius, caps and profile topology remain. Two new supports reuse those same source profiles at radius **0.035 m**, extending from the lower grip joint to the actual cockpit side panels. Their endpoints penetrate the measured inner wall by **2 mm**, leaving about 30.75 mm of wall thickness beyond each endpoint.

These supports span the cockpit: approximately **1.125 m left and 1.083 m right including wall embed**. They are long support arms, not short mounting stubs. No additional collar, flare or geometry outside the measured envelopes is included before the first render.

| Conservative capsule evidence | Negative X | Positive X |
| --- | ---: | ---: |
| Unexpected contacts | 0 | 0 |
| Grip minimum clearance | 2.881 mm | 1.196 mm |
| Support-to-pilot minimum clearance | 15.760 mm | 43.934 mm |
| Intended wall embed | 2 mm | 2 mm |
| Measured wall thickness | 32.752 mm | 32.752 mm |

Exact endpoints, support joints, wall object names and source triangle 1810 contacts are in `sidewall-control-clearance-analysis-v3.json`. V1/V2 studies remain preserved. The checks use the full-radius capsule at both ends; only the intended sidewall contacts are excluded from the unexpected-contact result.

## Complete profile verification

`control-fit-profile-envelope-validation.json` checks **all 304 vertices and 236 triangles for each of the four actual source-profile copies**, including both ends, after remapping their existing axial rings and storing coordinates as float32. Every vertex lies inside the tested capsule plus a 5 µm encoding allowance. Since a capsule is convex, each triangle's complete surface also lies inside that envelope. Actual maximum radial excess is below 0.742 µm; subtracting the full 5 µm allowance still leaves at least **1.191 mm grip clearance and 15.755 mm support clearance**.

The Blender author fragment repeats the full vertex-envelope test on its actual copied meshes. It reuses the original source polygon ordering and records all profile lineage. Source beveled end lengths scale only with radial scale; shortening is absorbed in the straight middle shaft. Authored corner-normal directions are rotated with each profile rather than broadly recalculated.

## Root execution

For authoring, concatenate these safe fragments in one MCP call:

1. `mcp-safe/00-source-reference.py`
2. `mcp-safe/01-source-guard.py`
3. `mcp-safe/06-control-fit-reference.py`
4. Inject actual successful `BLOCKRUNNER_AUDIT` and `BLOCKRUNNER_CLEANUP` receipts as Python literals.
5. `mcp-safe/06-copy-fitted-controls.py`

The stage pins actual cleanup object FNV-1a-64 `6c256a2de2a989c9`, validates source and cleanup signatures/corner normals, and creates only `PodRacing — Blockrunner shortened controls side mounts round34 V1`. It copies all 59 cleanup meshes/materials, alters only the two grips and adds two source-profile support meshes. Expected result: **61 meshes, 44,028 triangles, one new scene**, with the 141 earlier scenes/context preserved. The pilot and other 56 unedited meshes retain their geometry, normals, materials and transforms; overall craft bounds must remain unchanged within 10 µm. No `.blend` save or export occurs. Failure rolls back only owned trial data.

For each matched comparison, prefix safe 00/01, inject the actual audit plus:

- `BLOCKRUNNER_CONTROL_FIT_RECEIPT`: successful stage-06 receipt.
- `BLOCKRUNNER_SOURCE_RENDER`: actual corresponding `cleanup-v1-driver-render-receipt.json`, `cleanup-v1-front-render-receipt.json` or `cleanup-v1-fullcraft-render-receipt.json`.
- `BLOCKRUNNER_VIEW`: matching `driver`, `front` or `fullcraft`.
- `BLOCKRUNNER_RENDER_TOKEN`: fresh alphanumeric/hyphen token; verify the target PNG is absent externally.

Append `mcp-safe/07-render-control-fit-comparison.py`. It writes `control-fit-v1-<view>-<token>.png`, reuses the actual previous camera and neutral source-bound lighting, renders only deep temporary copies, then removes its temporary scene/data and restores every preexisting context/membership. Store each actual receipt separately.

Static policy/parse checks passed for all three new MCP fragments and their concatenation; external hashes are in `mcp-safe/control-fit-static-validation.json`. This does not claim Blender execution or visual acceptance.

## Actual review still required

Inspect the driver first, then front/fullcraft, for visible hand wrap around the original profile, readable shortened grips, convincing support-to-grip joints and panel attachments, retained limb/helmet shapes, and unchanged overall silhouette. The numerical model deliberately has small clearance rather than mesh penetration inside the hands. A visible loose fit, poor attachment construction or awkward support span may still require a separate copied revision. No palette, source-to-game normalization, anchor export, runtime/public registration or gameplay readiness is claimed here.
