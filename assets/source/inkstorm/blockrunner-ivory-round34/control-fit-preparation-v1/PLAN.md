# Ivory isolated control fit — prepared, not executed

The actual opposing-face cleanup is the authority for this next derivative: scene `PodRacing — Blockrunner Ivory exact opposing cleanup V1 e42fb924b344481ea013c58cb0f52ad7`, 55 objects, 51 meshes, 51 materials and 43,556 triangles. Its successful executed receipt SHA-256 is `72f9efa252dcb233d7b95b484a8c9d766d42269bd7b250f59a8ec9040301c4e3`.

Keep the original, unchanged source copy and cleaned scene. Create one further isolated scene. Preserve all 55 existing object transforms, parents, parent inverse matrices and hierarchy, including both source beam offsets. Reshape the two existing control meshes in their own original local frames, then add two mounts made from their respective own control profiles. The resulting design has 57 objects, 53 meshes, 51 materials and 44,028 triangles. The other 49 mesh geometries and raw corner-normal signatures, including the entire combined pilot/body container, remain exact to the actual cleanup.

The two source rods are approximately 1.138556 m long with 0.065582 m shaft radius. Their complete four-ring beveled profiles supply the grip and mount topology. Proposed grips are 0.35 m long at the original radius; mount radius is 0.035 m. Lower and upper bevel lengths scale with radius, while only the shaft's axial span changes. Every transformed source vertex must remain within its conservative capsule. No replacement primitive, pilot pose change, seat move or beam transform correction is proposed.

## Measured own geometry

`measure-own-fit.py` read the pinned 2.8 MB Ivory GLB, used its verified direct ordered triangle bridge and the original audited world matrices, and considered all 43,556 retained triangles. Detailed segment/triangle distances are bounded to each expanded capsule AABB; no nearest-surface search or new correspondence was created. The endpoints began as preparation candidates and are now checked against Ivory's own triangles. Each mount end was recomputed from its own sidewall intersection, rather than accepting the candidate's old wall endpoint.

| Clearance or dimension | Negative X | Positive X |
| --- | ---: | ---: |
| Grip capsule to intended glove | 2.886 mm | 1.196 mm |
| Grip capsule to unintended surface | 48.581 mm | 51.802 mm |
| Mount capsule to unintended surface, excluding its intended wall | 15.758 mm | 43.932 mm |
| Wall thickness at mount axis | 32.753 mm | 32.753 mm |
| Intentional wall embed | 2 mm | 2 mm |

These are geometric proximity and nonintersection measurements. A positive capsule gap does not prove physical hand contact or an accepted visual fit. The shortened grips require a neutral driver inspection after actual construction. Original tall rods are reshaped in the isolated clone; redundant old rods are not retained beside the new fit.

The measurement file is `own-clearance-measurements-v1.json`, SHA-256 `579394d46c8843de79a2bb7f20b66a5b0ff4d2d3c509669d50190a85b4f86b67`. Exported float32 source positions are an approximation of live positions. The payload must reproduce live clearances, profile dimensions and wall contacts within 10 micrometres; this numerical bridge allowance is separate from the millimetre fit distances. Live intended capsule gap must be positive and below 5 mm, and unintended clearances must remain positive.

## Exact payload and invocation

`01-ivory-isolated-control-fit-prepared-v1.py` is 177,910 UTF-8 bytes, SHA-256 `4580bf1b005be525a52e836e4d5b52776ac0aefeb3bcb2af7f0efaa080b10996`. External AST parsing, static compilation, direct-call resolution and strict safe-import/attribute checks passed. This is preparation evidence only; no Blender invocation occurred here.

1. Root releases the Blender/GPU window and executes the exact payload once. The payload also requires idle Blender rendering and Object mode.
2. Before any retained mutation, it verifies the three exact Ivory scenes, all 43,556 live triangle positions used by bounded clearance checks and four disposable profile reconstructions. Source topology, UV, polygon material indices, smooth flags and edge flags remain unchanged in the resized profiles.
3. It deep-copies the actual cleanup, verifies unchanged-copy parity, reshapes the two copied controls, and adds the two copied-profile mounts. All four retained reconstructions must reproduce their own same-invocation disposable proofs with exact JSON-value equality.
4. Save the actual printed receipt and executed payload. Require `fitConstructedAndAudited`, the exact expected counts, `preservedThreeScenes`, restored context and every fresh scene/collection/12-datablock-set guard. Failure keeps acceptance false and attempts removal of only owned additions; the final report is printed without a terminal exception that would suppress JSON.
5. Review actual reported normal encoding differences and perform matched neutral fullcraft/driver renders before paint. `normalEncodingAndVisualReviewPending` remains true in this preparation's construction receipt, and `artAccepted`/`runtimeReady` remain false.

The normal setter acts only on newly owned meshes. Requested normals come from each own live source control's corner normals, transformed through its actual world normal matrix, rotated with the profile, then transformed back into the unchanged object frame. Encoded direction, chord and angle differences are measured and reported. Same-hemisphere validity is only a basic reversal guard, not a small-angle quality acceptance. No Colour normals, Colour tolerance, cleanup normal tolerance, normal byte-equality claim or recalculation call is imported.

There is no role-mask assignment, palette change, painting, rendering, import, export, blend save or runtime admission in this payload. Fleet/license counts remain unchanged.
