# Blind Polwo visual review — round 32, revision 3

Reviewed 2026-09-08. Independent still-image review of the nine PNGs in `output/gauntlet/round-32-polwo-revision3`, the seven original scene targets, and `10-polwo-vehicle-round32.png`.

**Verdict: FAIL at the requested strict 8/10 threshold. Overall visual result: 5.8/10.** The output establishes an identifiable twin-engine racer, a consistent sunset palette, and distinct course locations. It does not yet meet the targets' construction quality, material hierarchy, scene depth, or driver presence. No area merits an 8/10 overall visual acceptance from this evidence. This is not evidence for an AAA claim.

## Review boundaries

- I directly inspected all 17 listed images. I did not read implementation code, prior reviews, prompts, receipts, or other review documents. File discovery was limited to finding the requested PNGs. The garage was also inspected at its original resolution.
- The original seven concepts are the world, composition, and visual-finish benchmarks. The Polwo concept is the vehicle-specific benchmark. I do **not** penalize the Polwo for having a different, slimmer engine design than the vehicle in the original scene concepts.
- The supplied gameplay images have a higher, more distant camera than the scene concepts. Pixel-identical framing is not required, but the resulting loss of mechanical and driver readability still matters.
- These are stills. Displayed speed, race position, warnings, and the filename `live-drive.png` do not prove motion quality, FPS, handling, full input coverage, collisions, physical contacts, or a complete lap. The images do not establish hand-to-control contact or pilot articulation. I did not open a browser, run a build, or inspect Blender.
- Scores are visual judgments on a 10-point scale. A score of 8 requires convincing authored construction, coherent finish, and clear scene intent with only minor remaining weaknesses. Recognition of the intended subject alone does not earn 8.

## Scores

| Area | Construction | Style coherence | Route readability | Driver readability | Target parity | Overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Garage / Polwo presentation | 6.5 | 6.5 | N/A | 5.0 | 6.0 | 6.1 |
| 01 — Grid | 6.0 | 6.0 | 7.0 | 4.5 | 5.0 | 5.8 |
| 02 — Salt run | 5.0 | 6.0 | 7.0 | 4.5 | 4.5 | 5.4 |
| 03 — Canyon | 6.0 | 6.0 | 6.5 | 4.5 | 5.5 | 5.9 |
| 04 — Fork | 5.0 | 5.5 | 5.5 | 4.5 | 4.0 | 4.9 |
| 05 — Launch | 6.0 | 6.0 | 6.5 | 4.5 | 5.5 | 5.9 |
| 06 — Foundry | 5.0 | 5.5 | 5.5 | 4.5 | 4.5 | 5.0 |
| 07 — Finish | 5.0 | 5.5 | 6.5 | 4.5 | 4.5 | 5.2 |
| Live-drive still | 5.5 | 6.0 | 6.0 | 4.5 | 4.5* | 5.3 |

Construction evaluates the displayed vehicle in the garage and primarily world construction in course views. Overall scores and the 5.8 global judgment are holistic judgments rather than arithmetic averages. `*` Live-drive has no dedicated paired target; its comparison is to the original salt-run/world language. Its off-center view alone is not evidence of incorrect steering or a route bug.

Across the set, the vehicle itself is approximately **6.5/10**, world construction **5.5/10**, and driver readability **4.5/10** at the gameplay camera. The garage interface is stronger than the vehicle lighting and the course's environmental finish.

## Vehicle and driver

The defining Polwo structure survives: two long cylindrical engines, orange forward prongs, dark ringed housings, thin trailing cables, and a small blue cockpit with broad pale stripes. The garage view clearly communicates this arrangement. Panel variation and wear are visible, and the cockpit is recognizably open. This is a useful base with an identifiable silhouette.

The concept's construction is substantially more resolved. Its engine rings have clear depth and material separation; the tapered fins, inset mechanisms, cable couplers, cockpit rim, and worn plate edges each have a readable structural role. In the garage, many equivalent areas merge into dark gray. The long orange prongs read as relatively flat bars; cable connections are tiny, and the cockpit's broad facets overpower the smaller construction. Blue and orange appear, but the gameplay view is dominated by near-black engines and gray-blue stripes rather than the concept's well-separated painted metal, exposed metal, and warm pilot materials.

The pilot is visible, but mainly as a pale helmet above dark shoulders and cockpit shapes. The concept's orange helmet stripes, visor separation, brown suit, shoulder harness, sleeve folds, gloves, and control assembly do not read at the gameplay scale. The garage also presents the body at a small scale and from a side angle that hides most of the useful detail. This is a readability shortfall; it is not proof that those parts are absent from the model. Neither the garage nor the gameplay stills establish convincing grip/contact.

The twin engines occupy a narrow central band in gameplay. That leaves plenty of road visible, but weakens the close, embodied machine presence of the targets. The thin cyan connection is identifiable but visually slight. Bringing the camera closer or modestly enlarging the vehicle's screen footprint would help only if the pilot, joints, and material separation remain resolved at that larger size.

## Scene findings

**01 — Grid.** The large gate, suspended lights, side bays, and distant rocks establish a start area. The lane through the gate is easy to find. The target feels like a busy working paddock, with layered canopies, machinery, small structures, and concentrated warm/cool detail at human scale. The output's gate is a clean repetition of large beams and plates, and the long side areas are sparse. A few hangars and awnings do not yet create the target's density or lived-in construction. The large unoccupied sandy foreground accentuates the gap. Add purposeful bay clusters and more varied canopy/support silhouettes, with local lights and equipment detail visible from this camera.

**02 — Salt run.** The track surface is slightly darker than its shoulders and has a clear forward direction; the left wall and distant industrial landmark are useful orientation cues. However, most of the image is open sand and sky. The target has an extended sequence of inclined spires, overlapping rock shelves, a visually carved road, and stronger distant layering. The output instead places a few large masses beyond a broad empty apron, plus repeated small rock stacks and posts. The low rectangular crossbar becomes disproportionately prominent because the surrounding scene is so sparse. Restore roadside geological rhythm, distinct road wear, and several depth layers without filling the driving lane.

**03 — Canyon.** The large rock arch is a convincing landmark in silhouette, and the cooler shadows distinguish this section. This is among the better matches in scene identity. Its near surfaces still look like broad crumpled rock masses and isolated faceted chunks, rather than the target's thin, directional strata, stacked ledges, rubble transitions, and sunlight catching successive shelves. The sandy crest hides much of the route beyond the opening. The target leads the eye through an illuminated arch into a clearly continuing valley road. Make that continuation visible and add intermediate rock structure, especially around the arch feet and roadside transitions.

**04 — Fork.** The current image communicates an elevated ramp on the left and a lower marked area to the right. It does not provide the target's immediately legible split around a central rock pillar, with two distinct roads continuing into depth. The large ramp looks manufactured and thin-edged against the geological setting; identical left-chevron boards on the lower route compete with the upper ramp's invitation. A still cannot establish which branches are actually usable. The visual requirement is that both intended choices and their continuation can be understood before reaching the split. Rebuild the fork composition around a physical divider, show both destinations, and resolve the ramp's support/abutments or turn it into a credible carved rock shelf.

**05 — Launch.** The downhill reveal, tall mesas, and factory high on the right produce a useful sense of scale. The drop is readable as a visual situation, without proving flight behavior. The target's vista contains a dense hierarchy of mesas, bridges, domes, low terraces, and hazy depth; the output has two dominant wall masses surrounding a large mostly empty basin. The factory is a relatively small group of simple industrial shapes at the skyline. The low crossbar also cuts across the middle of the reveal. Add nested terrain shelves and smaller landmarks leading toward a richer industrial complex, while preserving the visible landing corridor. The launch should reveal a destination and a route through the basin, not merely a large open space.

**06 — Foundry.** Pipes, tanks, catwalks, and overhead spans identify the industrial zone. The visible number of objects is higher here, but construction remains schematic: large smooth cylinders, flat dark pipe end shapes, thin rails, simple foundations, and broad minimally articulated surfaces. The start-light gantry is visually repeated here and takes attention from the industrial architecture. The central sand mound and background wall shorten the visible route. The target is a deep industrial canyon with believable tower bands, pipe joints, supported elbows, repeated access levels, attached machinery, warm pools of light, and a road that remains visible through successive spans. More pipes alone will not close this gap. Prioritize the readable structure of a few major towers and pipe assemblies, then stage their overlap to keep the next route segment in view.

**07 — Finish.** The guardrail and left-chevron boards make the immediate turn readable. The target has a carved, banked cliffside road with worn barriers, a strong near wall, and a distant overhead structure that draws the eye around the bend. The output's retaining edge is thin and regular, the road is a broad sandy shelf, and nearby repeated rock stacks look placed rather than accumulated. The blocky cyan-windowed tower becomes the dominant object without conveying a clear finish destination. Rework the road's bank, edge thickness, barrier construction, and destination framing. Add wear and mounting details at the scale of the near signboards; avoid relying on more repeated arrows for visual finish.

**Garage and live-drive.** The garage uses a controlled navy/cream/orange interface and a clear selected state. Its model presentation is too dim and too widely spread for the small pilot/cockpit to sell the concept's craft detail. Use a lit three-quarter presentation that separates rings, painted surfaces, and the pilot while keeping the complete vehicle legible. The live-drive still reinforces the gameplay camera's weak pilot presence and sparse open terrain. The visible route is left of the vehicle; this is a composition observation only, not a finding about steering behavior. No performance or motion acceptance follows from this frame.

## Priority fixes and the evidence needed to close them

1. **P1 — Raise structural world quality at the actual chase camera.** Resolve the foundry's major pipe terminations, elbows, bands, tower platforms, support brackets, and foundations; resolve the fork's branching landform and ramp support. Retake those two paired views first. Acceptance requires the shapes to read as a built facility and a deliberate two-route junction without relying on labels.
2. **P1 — Give the driver a readable visual identity.** Establish helmet stripe/visor separation, contrasting suit and shoulders, an open cockpit rim, and a distinguishable control assembly. Increase their useful screen size through camera/presentation adjustment where needed. Supply a gameplay still and a closer garage three-quarter still. A separate motion/contact inspection is still required to verify grip and articulation.
3. **P1 — Replace empty or repeated world staging with large-to-small authored structure.** Salt run needs a sequence of rock silhouettes and road wear; launch needs layered terraces and a destination complex; grid needs purposeful service-bay clusters. Use different heights, orientations, and scales that explain geology or use. Do not treat indiscriminate prop scatter as completion.
4. **P1 — Keep route continuation visible.** In the canyon and foundry, stage crests and overhead architecture so the next segment is visible. At the fork, show both intentional branches clearly. At finish, use banking and barrier placement to lead toward a visible destination. Verification must include approach views, since a single favorable frame cannot establish adequate warning distance.
5. **P2 — Unify material and lighting hierarchy.** Preserve warm orange rock and cool shadows, but introduce directional strata and chipped painted surfaces at a consistent scale. Give metal a readable relationship between paint, exposed edges, recessed machinery, and fasteners. Avoid the current split between highly textured rock, broad simple industrial surfaces, and very dark detailed engines. Garage illumination should make construction legible without flattening it.
6. **P2 — Improve machine presence without sacrificing the road.** Test a closer/lower chase framing or a modest vehicle size increase. Keep the road horizon and both route edges usable, while letting the cockpit and engines occupy enough space to show authored detail. The cyan link should read as an intentional energy connection, with a clear hierarchy relative to the engines, rather than an almost single-width line.

The next review should use the same named scenes at comparable resolution and include the improved garage angle. Passing builds, asset counts, implementation effort, or a separate close-up cannot substitute for visible quality in the paired gameplay views. Motion, performance, and full interaction need separate evidence after the still-image gaps are addressed.

## Image identity — SHA-256

Hashes below were computed from the actual inspected files, not copied from a receipt.

### Reviewed output

All paths in this table are relative to `output/gauntlet/round-32-polwo-revision3/`.

| File | SHA-256 |
| --- | --- |
| `garage.png` | `58a28604ff9c3bcff067b617499e97a506f4d2fccde09ac84c5a3ce05780bf36` |
| `01-grid.png` | `f6b3f2776ec8af82da1026ac8b55d04b2fdb83ba3607b7891314b0f5ec3e7a9e` |
| `02-salt-run.png` | `9ecb539b760a9df5a9dda95c33530dabbfbe55b83075f56fbbcf87514f2b7b27` |
| `03-canyon.png` | `d8e8b9a5a715bba5f815e0cdbebce501b4c1e6e39f62e740f3de31b731e93493` |
| `04-fork.png` | `cb45c6d0bcf5f9f5a8ef26abe78b699f9c8f342c3ef7860c8feff2ff0b884c18` |
| `05-launch.png` | `c7a424dc986c06a8f59ccae7791106882ff13b35eec79c91bb0a7bd828382836` |
| `06-foundry.png` | `6ca2fbc3109f4ca43af7352c7a26b52c69f50c0a2e4831be365da6a2efaf3132` |
| `07-finish.png` | `3264189dc0d48e9e96f4c3289a71f5f9f252e1486722404080ca163a1b053243` |
| `live-drive.png` | `d1d96ab80eae14d49abf0756139dea4384aea6d94e72089b8f6cb31fcdd40d09` |

### Reviewed targets

All paths in this table are relative to `docs/inkstorm-overhaul/concepts/`.

| File | SHA-256 |
| --- | --- |
| `01-grid.png` | `9b0cb5d949dbd077abc593b39d9f23805fcf9c7d45e7c1737987d671c2d11445` |
| `02-salt-run.png` | `5827c03ff9e029f9c8ac5a24dfc4dcc4dbc2942e25b4925f3d14b0d8fe2e4182` |
| `03-canyon.png` | `962f31af50b5e89d8f109443f914f33d5ca4aafb9ff010aaec0123fc75e63cea` |
| `04-fork.png` | `cab90a3aa51d6e80bb4cfe0d95af97d7e1803b4eff5420f48df2aff65501106f` |
| `05-launch.png` | `a791c4726db5997b8395d0d50e8ee3b858db80e0ecb01eb817ad30e7b2dc212a` |
| `06-foundry.png` | `e56c72e8a4c96be345a5cfa088186ad65763fbc94c5f8b85233bb9a04b1aeb50` |
| `07-finish.png` | `49150b64ed3dab444fde9aab7fb5091443e685a93d5c42270df257b7b8b640a2` |
| `10-polwo-vehicle-round32.png` | `ff6884640507cfe0a336ffcc93495259f89e1d86f23dc5a366bae4b039ade708` |
