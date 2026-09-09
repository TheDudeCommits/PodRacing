# Polwo V3 shoulder and boot topology investigation

**The two shoulder openings are real uncapped mesh boundaries inherited from the driver source. The boots are closed meshes; adding boot caps would be incorrect.** This finding comes from decoded glTF positions/indices and original authoring code, not image darkness alone. The three V3 contact cutaways were also inspected for context.

Scope: source-only CPU reads/analysis and a staged repair script. No Blender calls, browser, GPU, runtime edits, asset mutation, bake or export were performed by this reviewer. The repair script was syntax-parsed but not executed by this reviewer; root owns execution and rendered review. Seat/back/pelvis support is a separate fit issue, not repaired by these caps.

## Evidence and coordinate method

Inputs under `assets/source/inkstorm/polwo-driver-round32/`:

- V1 GLB SHA-256: `613150987120ca89f9bb2c2085441f6fb0af0c56e77111dbe027348be260e49b`.
- V3 GLB SHA-256: `80557ea910b98cf95f69736cc9a955bff968b9bda6b037d4b9b20908746b2a34`, 56,728,108 bytes.
- `topology-v3-audit.py` decodes raw POSITION and index accessors with buffer offsets/strides. Only exactly equal float32 POSITION tuples are welded in the analysis graph. No tolerance welding, normal/UV welding or asset modification occurs.
- `topology-v3-audit.json` records directed edge incidences and boundary components, including their exact coordinates. The suit has many open decorative strips and material-patch boundaries: its total boundary count is not a list of holes to fill.

The authoring mapping is recovered from `author-fit.py` and `author-fit-v3.py`: glTF `(x,y,z)` becomes Blender `(x,-z,y)`; undo V3's 1.55 scale and X straightening about its shifted anchor, then undo the original 2.5 scale and `Rz(pi) Rx(pitch)` about canonical pelvis `(0,-.13,-.205)`. The shoulder and boot regions have zero hand-warp weight, so that inverse is applicable there. The general reported inverse must not be treated as exact for warped hand/forearm points.

## Shoulder result

V3 suit mesh `polwo-pilot-suit.014 fit-v3` has two simple 22-vertex/22-edge boundary cycles, each edge incident to exactly one triangle. Their source canonical centers are `(±.087,-.153,.014)`. The loop bounds are:

| Side | Canonical X range | Y range | Z range | V3 glTF center |
| --- | --- | --- | --- | --- |
| − | −.11704 to −.05696 | −.17914 to −.12686 | .00172 to .02628 | `(.337125, 5.121157, -5.289125)` |
| + | .05696 to .11704 | −.17914 to −.12686 | .00172 to .02628 | `(-.337125, 5.121157, -5.289125)` |

The same 22-edge boundaries are present in V1, at the same canonical coordinates. Neither receives the V3 forearm warp. Thus V3 exposes an inherited missing cap; recalculating normals alone cannot close it.

The source cause is explicit: `scripts/blender/inkstorm-pilot-v4b.py:188` adds the first-ring cap only when `kind != 'arm'`; it always caps the far end at `:189`. The shoulder centers are declared at `:427`, and the sleeves use 48 rings of 22 vertices at `:448`. The two separate 16-edge suit boundaries lower on the upper arms correspond to material patch regions and are not targeted by this repair. Neck and decorative boundaries are also untouched.

## Boot result

Both V1 and V3 rubber meshes contain **1,184 exact-welded vertices, 2,228 triangles, zero boundary edges, zero nonmanifold edges, zero degenerate triangles after exact welding, and zero same-direction double edges**. Each boot is a closed connected component of 48 vertices/92 triangles, including ten existing top-cap triangles at canonical Z ≈ −.193. The source `loft()` explicitly caps both ends (`scripts/blender/inkstorm-pilot-v4b.py:91`).

`boot-topology-v3-components.json` additionally isolates six closed closure-strap components of 12 vertices/20 triangles each. Each strap spans canonical Z ≈ −.204 to −.192, crossing the boot-top plane; 16 triangles per strap straddle that plane. The source strap endpoints/peak at `:543` corroborate this geometry. Such overlap is a plausible contributor to the dark triangular toe marks. This analysis did not establish full triangle intersection or isolate normal-map/lighting contributions, so the precise rendered cause remains open. It does establish that the marks are not missing-face boundary holes. Boots are untouched by the staged repair.

## Staged source repair for root execution

`repair-shoulders-v1.py` and `shoulder-cap-v3-loop-payload.json` target input scene **PodRacing — Polwo Inkstorm paint round32 V1** and a new output scene **PodRacing — Polwo Inkstorm shoulder repair round32 V1**. The payload contains exact glTF loop positions, converted and matched against native Blender coordinates; exported accessor indices are never assumed to be native vertex indices.

The script copies the source meshes, then appends one curved intermediate ring and a fan per shoulder into the copied suit mesh. Target centers are canonical `(side*.072,-.165,.038)`, toward the jacket. Planned addition: **132 triangles, 46 vertices, zero new material slots or mesh objects**, retaining the existing suit material/maps. New outer-edge UVs come from adjacent original UV loops; the inner ring and center use the original ring's UV averages. New faces are smooth; old split normals and existing coordinate/topology/UV prefixes are retained. UV averaging requires rendered inspection and does not itself prove attractive atlas mapping.

When root executes it, assertions must verify: precisely 44 boundary edges disappear; no new nonmanifold edge; the planned face/vertex counts; unchanged existing vertex/topology/UV prefixes; unchanged prior-stage mesh evidence bytes/material references; unchanged pre-existing scene/collection memberships; and restored scene/layer/selection/active-object context. Failed construction removes its partial stage. No export, texture bake, or shared `.blend` save is included. A successful execution writes `shoulder-repair-v1-execution-receipt.json`; it is not a rendered acceptance receipt.

The staged script passed a Python AST syntax check only. No claim is made here that the new stage exists, the script has passed Blender execution, or the repaired shoulders look correct. Root should inspect the resulting shoulder transitions and UV shading, then address the separate seat/contact problem before any source-readiness or runtime claim.

## Follow-up: V1 UV failure and staged V2

After the initial handoff, root reported that an adapted V1 script executed successfully: 132 triangles added, 44 shoulder boundary edges closed and preservation checks passed. Root's subsequent render exposed ivory/brown cap patchwork because the global ring UV mean crossed separate Smart Project atlas islands. V1 remains preserved as a **failed UV study**, despite its geometric closure. This reviewer did not execute that Blender operation.

`repair-shoulders-v2.py` is staged from the **original paint V1 scene**, targeting **PodRacing — Polwo Inkstorm shoulder repair round32 V2**. Geometry and preservation assertions stay the same. For each boundary edge, it locates the adjacent source triangle's UVs `a`, `b`, `c`, sets `center=(a+b+c)/3`, `innerA=.65*a+.35*center`, `innerB=.65*b+.35*center`, and assigns independent per-face UV loops to that sector's three cap triangles. Shared geometric vertices/apex may therefore have different UV loops across sectors. No cross-island aggregate is used, and existing UV prefixes remain protected.

An independent decoded-GLB arithmetic check in `shoulder-cap-v2-uv-plan-check.json` found 44 nondegenerate donor triangles and 132 nondegenerate planned cap UV triangles. Each sector tiles only the `(a,b,center)` subregion of its own donor triangle. This checks the UV plan without running the Blender script or modifying an asset. V2 passed AST syntax parsing only and still requires root execution/export/render review. V1 script SHA remains `3afd78a29db1f7ac632da1265f19bdfbb5f09e1f84814dad58b8ce25fcf14acc`; staged V2 SHA is `696037fc55bda56ec556aaef828a62146c660b3f5aaa97a0696549b9f55e4caf`.

## V2 actual execution and exported source evidence

Root subsequently executed `repair-shoulders-v2-mcp-safe.py`. This adaptation embeds the loop payload and compares immutable numeric signatures inside Blender; it does not use filesystem reads or `hashlib` there. The original V1 attempt's safe-mode rejection of `hashlib` remains preserved in `shoulder-repair-v1-execution-receipt.json`. Neither that rejection nor the failed V1 UV render was removed or relabeled successful.

The inspected `shoulder-repair-v2-safe-execution-receipt.json` records creation of the requested V2 scene from original paint V1, 132 new triangles/46 new vertices, zero additional mesh objects/material slots, and suit boundary edges reduced from 5,419 to 5,375. It records exact original vertex/topology/UV prefixes, retained split normals, eight resulting meshes, unchanged prior mesh numeric signatures/material references, no pre-existing scene/collection membership changes, and restored context. The receipt retains the earlier field name `originalMeshEvidenceBytesExact`; in this safe adaptation the actual comparison is an immutable numeric signature, not a hash of serialized bytes.

`shoulders-v2-export-receipt.json` records a subsequent successful export to `polwo-inkstorm-shoulders-v2-native.glb`, eight meshes, an expected triangle count of 48,975, `runtimeIntegrated: false`, and restored context. Its log also retains repeated warnings that multiple image texture nodes share a texture and the first sampler will be used. This review did not infer sampler correctness from successful export or rerun package validation. `shoulders-v2-render-receipt.json` and `shoulders-v2-full-render-receipt.json` record three cockpit PNGs plus two quarter-view PNGs, restored context, no prior membership changes, and removed temporary review scenes.

Root first reported that the side render showed continuous blue cloth without V1's ivory/brown patchwork. That is a **root observation, not a new blind critic result**. This reviewer then inspected all five final PNGs for the separate implementation-aware `POLWO_SOURCE_REVIEW_ROUND32.md`: the visible cap region is blue and continuous in those images, with no obvious return of the patchwork. That narrow visual result does not certify seat support, all texture sampling, gameplay visibility, or overall target parity. No Blender operation was executed by this reviewer.
