# Original fallback craft: hero form revision

This is an authored revision to the existing procedural craft in `src/render/objects/PodracerView.ts`. It is not a Sketchfab import, a downloaded-vehicle conversion, or completion of the requested downloaded driver work. The launch concept and round-13 launch screenshot were inspected before changing the geometry. Root's next in-world capture and blind critique still determine whether the change improves the scene; this document makes no concept-parity claim.

## What changed

- Replaced the tall rectangular engine fins with tapered, swept, closed fairings. A lower side fairing breaks the nozzle profile without increasing the old vehicle envelope.
- Replaced the continuous shell cylinder with a stepped dark pressure vessel and three groups of separated curved jacket plates. Actual gaps reveal the inner vessel and service collars.
- Replaced only the podracer class's rigid triangular chassis bars with two substantial curved tow conduits, including a visible sag, corrugated cuffs, and end sockets. Other classes retain their distinct rigid chassis construction.
- Replaced the spherical main cockpit and block-shaped rear shoulders with shaped lofts and continuous tapered cowl stripes. The seat well, driver anchor, class transforms, effects anchors, and articulated engine nodes remain stable.
- Merged all new static surfaces by existing material. No new texture, shader, external asset, per-frame animation loop, or collision change was added.

## Measured geometry and limits

Counts refer to one visible full-detail `PodracerView` with the default opaque palette. They include its exhaust and coupling geometry, exclude the separately attached pilot, and exclude additional outline/MRT submissions. They are not total scene or GPU timings.

| Class | Previous beauty meshes | Current beauty meshes | Previous triangles | Current triangles |
| --- | ---: | ---: | ---: | ---: |
| Podracer | 22 | 22 | 8,804 | 14,632 |
| Landspeeder | 27 | 27 | 8,112 | 10,724 |
| Speeder bike | 27 | 27 | 8,088 | 10,700 |
| Skim speeder | 27 | 27 | 8,100 | 10,712 |

All four current solid bounds fit inside the pre-revision solid bounds. The original pod spans approximately 20.944 metres across its visible engine-and-cable envelope; this pass retains that width and reduces the tallest solid point from 4.597 to 3.521 metres in unposed vehicle space. This verifies that added visual geometry does not expand the previous apparent footprint; it does not independently certify physics-to-mesh collision matching.

An eight-craft grid with two of each class adds 27,328 triangles before extra rendering passes and LOD reductions. The fixed and adaptive full-race frame-time receipts taken before this revision do not cover these triangles. A new in-world performance run is required on the integrated build.

## Verification

Focused verification passed on 2026-09-07:

- 11 tests across `PodracerHeroGeometry`, `PodracerVehicleClasses`, `PodracerPrepassProxy`, `PodracerLod`, and `inkstormGhost`.
- New tests enforce every original solid envelope, unchanged maximum beauty mesh counts, explicit per-class triangle ceilings, finite position/normal attributes after every class/LOD transition, and stable driver-anchor identity.
- Existing checks cover class switching, reversible wreck poses, full/reduced proxy geometry, LOD hysteresis, and the one-draw ghost presentation.
- Typecheck and `git diff --check` passed.

No browser was opened by this subtask. Visual acceptance and integrated performance remain with the next gauntlet pass.
