# Round29 access and retaining construction — CPU stage only

The current clear-floor field leaves real service buildings above steep banks. The solution studied here keeps the saved building/slab elevations and every terrain, road, shoulder and normal unchanged: construct a narrow supported frontage deck, a closed retaining stem with buried footings and inboard counterforts, and stairs running along the frontage to a grounded terminal ramp. This is architecture with thickness, supports and explicit ground connections. It is not a terrain-colored overlay or another field that conceals a buried interior.

No runtime, public asset, test or build files were changed. The parent released district grading for integration while this study was running; this study itself remains unintegrated. CPU searches stopped before the parent's round29 full-race timing. Do not launch the planner during that freeze.

## Source and construction contracts

- `construction.json` contains the six provisional access candidates, every stair tread/landing station, the 3 m terminal ramp's nine ground-contact samples, all 149 retained front-panel dimensions, the one declined panel and per-plot budgets. All Y coordinates are absolute world heights. X/Z are metres in the **pad-centered** frame, transformed by the saved `centerX`, `centerZ`, `yaw`. They are not Blender coordinates or normalized values.
- `access-candidates.json` retains selected and alternative paths, the closest declined cases and the bounded search counts. `front-profiles.json` records the initial central profiles at 2 m spacing out to 24 m. `planner.ts` reproduces the study against the frozen float arrays using Vite SSR; it starts no browser or GPU.
- The candidate field is exactly the district stage with float SHA `a415f1a18f0dbcc386b38fe5878e33dd2429bd9ae401099135f487ac065c3b64`. Both gulf arrays are loaded and hash-checked against their round28 receipt; the study only samples them. It never rebakes or modifies any heightfield, course or placement.
- Pit source slab top is **saved anchor +2.45 m**, including the asset's 1 m slab above its +1.45 m base. District courtyard top is **anchor +1.5 m**; the original facade decks are another 0.45 m higher and need separate threshold steps. The previously used anchor +0.9 target is terrain under the slab, not a walking surface.
- Source-kit inspection by the construction agent found a clear pit landing at GLB X[-6.6,-3.4], Z[24.8,28], and district landing X[-3.6,-0.4], Z[14.8,18]. The pit entrance is pad-local X=-9 because its slab center has the +4 m source offset; districts use asset X=-2 scaled by frontage. Both fronts face GLB +Z. These bands avoid the revision4 source fixtures; they do not establish clearance against every unrelated scenery family.

## Concrete candidates

The stair spans below exclude the level approach bridge and the 3 m terminal ramp. Clear walking width is 2.4 m; 3.2 m total construction width includes rails and stringers. Individual risers are at most 0.18 m, and 1.5 m intermediate landings occur after twelve risers. This is a game construction convention, not a claim of building-code or accessibility compliance.

| Plot suffix | Saved floor Y | Stair local start X/Z | Stair local end X/Z | Drop | Stair run | Risers | Approach bridge | Minimum sampled road-edge separation |
| --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |
| pit 215 | 8.531 | -7.423 / 37.520 | 26 / 43.25 | 13.496 m | 33.911 m | 75 | 8.6 m | 13.116 m |
| pit 216 | -11.164 | -7.407 / 37.395 | 13 / 39.25 | 8.216 m | 20.491 m | 46 | 8.6 m | 13.159 m |
| pit 217 | -4.367 | -10.599 / 39.195 | -38 / 38.25 | 10.389 m | 27.417 m | 58 | 10.6 m | 13.126 m |
| district 218 | -2.206 | -3.013 / 27.291 | -28.44 / 32 | 6.958 m | 25.859 m | 39 | 10.6 m | 13.786 m |
| district 219 | -8.748 | -0.448 / 27.388 | 18 / 32 | 7.278 m | 19.016 m | 41 | 10.6 m | 13.170 m |
| district 220 | -9.441 | -0.526 / 26.123 | 11 / 31 | 4.782 m | 12.516 m | 27 | 9.1 m | 13.756 m |
| district 221 | -5.278 | unresolved | unresolved | — | — | — | — | retaining footprint 22.180 m |

The first pit drops 15.71 m over only 10 m directly toward the road. Its selected route moves along the frontage to higher natural ground and reduces the stair drop to 13.50 m. This is still a large seven-flight stair, not a compact ramp. Pit 3 must descend to the opposite side because the curved road limits its other end. District 1 has a low strip next to the previously graded pit; the selected access follows that lower ground instead of pretending the entire courtyard was uniformly filled.

The four central district profiles have drops of 3.32 / 6.49 / 5.44 / 0.67 m at 10 m outward. District 4 is the exception: ground rises near its facade, so a short low bridge and a gently varying terminal ramp are a better next candidate. The generic 0.12 m ramp camber used for the other plots made the shallow candidate exceed this study's slope/clearance gates. It remains declined rather than relaxing those gates. Earlier straight terminal trials are not the final retained design.

## Intentional retaining construction

The front is divided into panels no longer than 6 m. Retained records define a 0.18 m closed deck attached to the existing slab, a 0.6 m closed stem, a 1.8 m wide footing with its top 0.2 m below the lowest sampled ground and its bottom another 0.8 m lower, and a 0.45 m thick inboard counterfort at the panel pitch. Each footing is buried; its elevation is not inferred from the building center. The deck top meets the actual slab/courtyard top. The stair approach crosses the deck through the verified central entrance.

Front deck width is at most 6.2 m and narrows where the road or access structure requires it. Width ranges for pits 1–3 are 4.9–6.2 / 4.6–6.2 / 1.8–6.2 m; districts 1–4 are 6.2 / 6.2 / 2.4–6.2 / 3.8–6.2 m. Widths below 3.2 m are retaining returns, **not** a through promenade. Close these ends with a parapet instead of inviting crew movement through a gap.

Maximum exposed retaining heights are 13.79 / 10.77 / 11.87 m for the pits and 9.81 / 3.86 / 3.82 / 2.03 m for the districts. These are substantial structures. They need an authored buttress rhythm, a convincing coping line and a material scale appropriate to those heights. Large flat concrete faces without those decisions would merely replace one visual problem with another. The source data does not prove a finished art direction.

District 218's first panel, local X[-43.2,-37.44], is explicitly declined. The bounded candidate could not satisfy its terrain/footprint constraints. Keep the current foundation there until an individually fitted return wall is designed; do not copy a neighboring panel or widen toward the adjacent pit. All other front panels have accepted sampled deck/footing clearances. No side/back reconstruction was designed, so district 1's wider foundation exposure may remain visible from other cameras.

Stair terminals use a closed, 3 m ramp with a 0.12 m convex crown. The outer contact edge follows the actual physical field at nine across-width positions, 4 cm above ground; a 0.3 m structural shoe should continue below that edge into the soil. The top surface is divided into twelve longitudinal sections. Rails end at the terrain contact, not several metres above it. Selected terminal longitudinal grades are 0.273 / 0.292 / 0.367 / 0.193 / 0.390 / 0.277 m/m, with cross-edge grades 0.278 / 0.142 / 0.236 / 0.106 / 0.298 / 0.265. These support a crew-stair reading; they are not cart ramps or accessible routes.

## Bounds, cost and remaining gates

The search is limited to seven canonical plots and 16,896 route candidates per plot. All legal-footprint checks use the main 4096-point plan plus every branch segment, including the closing main segment. Full stairs, rails, landings, terminal ramps and buried footing extents must have at least 13 m sampled separation beyond the road edge, retaining room beyond the existing 10 m shoulder and ±1.15 m normal probes. Ribbons use 0.25 m longitudinal samples and at most 0.8 m across-width spacing; retaining panels sample 0.25 m along their full footing extent. Their finite sampling reserve is part of the design and must not be removed. Every candidate also checks other pit/district source rectangles; the smallest retained other-plot clearance is 4.857 m. No terrain or normal guard is weakened.

Physical top-surface samples remain above terrain by at least 0.033 m for pit 1 and 0.040 m for the other retained stairs, including the terminal edge. This small contact clearance is deliberate but **not rendered-mesh acceptance**. Coarse terrain triangles can differ from the physical sampler. Before integration, clip the actual indexed rendered terrain against these stair/ramp surfaces at the diagnostic and racing camera phases, and either move construction upward locally with a real contact shoe or decline the candidate. Never change the road or raise a whole building to repair a failed stair check.

The current estimate is 21,088 high-detail triangles and 5,016 distant-LOD triangles for the 149 panels and six accesses. It includes stair rails, intermediate landings, bridge-support allowance, terminal meshes and closed wall/deck/footing/counterfort solids. Add a capped reserve of **2,000 high / 1,000 LOD triangles** for continuous front parapets and stair-opening end returns; these are required before the deck is presented as crew access and are not yet instantiated in the data. Aim for at most two merged opaque material batches, no new texture samplers, no extra shadow casters at distant LOD, and distance culling as one group per plot. Preserve stair silhouettes in the lower LOD; do not retain 75 tiny risers at race-view distance. This geometry budget is not measured FPS.

The current runtime collision uses solid **elliptical** pit/district envelopes, including their interiors, and arbitrary scenery meshes are not racer support surfaces. Thus even a rendered staircase would provide visible crew access only. A playable service pit requires a separate bounded change: shell-aware interior collision, an explicit constructed-surface sampler and an actual pod-clear opening/maneuvering envelope. A 2.4 m crew stair does not admit a large podracer. Clear floors, coherent crew access and playable racer access are three separate acceptance checks.

For nonflagship courses, do not reuse these world coordinates, anchors or stair counts. Retain existing field acceptance/declines, including seed 42's protected-road conflict. Until a bounded per-placement generator repeats all footprint, terminal, source-fixture and terrain-mesh checks, omit this construction on other seeds and report it as unvalidated. Missing or declined plots stay missing or declined. No added atlas memory, rebake or procedural coverage claim follows from this study.

## Review and integration order after the round29 freeze

1. Choose one pit plus one district as the first visual construction trial. Use the JSON dimensions to build closed architecture in an independently owned module or asset-source revision; preserve the current source and grading receipt.
2. Fit front parapets with central bridge openings. Avoid coplanar duplicate foundation faces. Supply source geometry/mesh bounds and high/LOD counts before a runtime switch.
3. Check precise field and actual rendered-terrain mesh clearance, all other scenery families, the original rigid matrices, camera arrays and protected shoulder/normal contracts. The current study did not inspect every scenery family or perform indexed stair mesh clipping.
4. Use the exact paired diagnostic cameras and a fresh blind critic to judge access, retaining scale, material stretch and the source concept. Then remeasure full-race performance on the frozen combined candidate.

Reproduction after the freeze: load `planner.ts` with the same Vite SSR middleware pattern used by the district probe. Do not run it concurrently with captures or full-race timing. No tests, browser, GPU, Blender, full build or full suite were run for this access study.
