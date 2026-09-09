# Blind foundry gantry review — round 33

**Verdict: FAIL at the strict 8/10 visual gate.** The isolated gantry scores **6.3/10** against the construction concept; its visible gameplay presentation scores **5.7/10**. The full gameplay scene scores **4.8/10** against the original foundry concept. These are independent visual judgments, not an average that permits a stronger isolated asset to pass the scene.

## Scope and evidence boundary

Reviewed only the ten images listed and hashed below: two concept references, five gameplay stills, and three neutral construction views. No code, implementation plans, previous reviews, receipts, browser, Blender, or build output was inspected. Neutral views establish visible source construction only; they do not establish gameplay quality. No FPS, motion, collision, physical clearance, or engineering-certification claims follow from these stills. Visible HUD values are not measurements of those properties.

The original `06-foundry.png` concept establishes a dense, weathered industrial canyon with substantial connected pipes, layered service structures, warm directional light, cool emissive accents, and a strong road perspective. The construction concept establishes the local gantry's assembly language: a deep trussed span, large flanged pipe joints and risers, substantial bearing assemblies, anchored feet, maintenance access, and readable hoisting equipment. Stylization itself is not the reason for failure; the deficit is visible construction, material hierarchy, and scene composition relative to those references.

## Scores

| Criterion | Score | Visible reason |
| --- | ---: | --- |
| Isolated industrial assembly against construction concept | 6.3/10 | Recognizable pipe bridge with separate chords, diagonals, plates, saddles, utilities, and hanging fixtures; major service and mechanical components remain minimal. |
| Credible joints, bearings, and support attachment | 5.9/10 | Some plate bolts and bearing surfaces read clearly, but most pipe joints are narrow bands, column bases look stacked, and the main pipe's downward elbows do not visibly continue into substantial risers. |
| Isolated three-dimensional construction | 6.8/10 | The rear and end views establish real width, separate faces, and pipe/support depth. The narrow section and slender details do not deliver the reference's heavy service structure. |
| Gantry presentation in gameplay | 5.7/10 | The silhouette and truss are readable in near-span and main foundry views; dark shading and overlapping background pipework flatten its finer construction. |
| Static route readability | 6.5/10 | Sand and roadside markers identify a broad corridor, but crests, inconsistent edge definition, and the exit crossbar leave the upcoming route less immediately legible than the reference road. This is a visual observation only. |
| Full-scene depth and composition | 5.1/10 | Perspective and foreground overlap exist, but modular repetition and broad open terrain replace the reference's layered industrial canyon. |
| Full-scene palette and material response | 5.2/10 | Warm sand, rust, blue structural color, and cyan details are present. Muted red/purple machinery, pale rectangular chimneys, flat large surfaces, and weak edge response reduce the reference's metal/rock/light separation. |
| Full-scene parity with original foundry concept | 4.8/10 | Density, mechanical specificity, ground integration, atmospheric layering, and the cockpit/engine foreground remain materially below the target. |

## What the images demonstrate

The neutral approach and rear views show an actual spatial assembly, not a flat truss silhouette. There are two longitudinal structural faces, diagonal members, bolted plates, support ledges, pipe saddles, narrow rails, small underside fixtures, and attached utility runs. The end view confirms depth in the column, pipe, and beam assembly. Those features make the object identifiable as a constructed gantry.

The same views also expose the missing level of construction. The orange pipe bends down at each end and visually finishes at beam/support height; the construction concept continues through large flanged cylindrical risers into a wider plant. Most actual pipe seams are slim straps or fine lines, with one more articulated central collar. The feet are rectangular pedestal blocks topped by stacked plates, with little readable anchor hardware or splayed bracing. The truss-to-column transition is a simple bearing/ledge arrangement instead of a strong, visibly fastened knee assembly. There is a small hanging element, but it does not read as the concept's trolley, drum, cable, and hook mechanism. Narrow rails exist; a complete maintenance route with ladders, landings, and a legible walking surface is not established in these views.

The source material palette is tidy and legible, but its broad smooth faces and sparse wear look like a simplified prop. The construction reference uses broken paint edges, exposed metal, accumulated dirt around joints, deep seam contrast, and differently responding steel, pipe paint, concrete, and utility parts. Matching those relationships does not require matching every rivet or reproducing the reference literally.

## Gameplay findings by view

| View | Finding |
| --- | --- |
| `06-foundry.png` | The bridge is large enough to read the truss and posts. The overhead pipe is partly cropped at the top, which is compatible with being close to/passing under it and is not a failure by itself. White and blue background pipes crowd the underside and support region. The left base is visibly layered but weakly anchored; the right support enters a sand bank, so a hidden right footing cannot be declared absent. The flat platform edges and large plain vessels dominate the setting. |
| `foundry-approach.png` | This supplied approach view is dominated by a vessel cluster and a close cliff; it does not give a frontal view of the gantry. The open sand and repeated tank/pipe kit have limited small and medium industrial detail. This image alone would be insufficient to reject gantry framing. |
| `foundry-near-span.png` | This is sufficient evidence to judge gantry presentation before the closest crop: the pipe, truss span, and supports are substantially visible. The gantry reads as a discrete industrial object, but the support base is visually light, the upper pipe is minimally jointed, and background cross-pipes compete with the structural silhouette. Its visible construction remains simplified even with fair framing. |
| `foundry-middle.png` | Receding industrial rows create basic depth, but closely repeated tank/chimney/pipe combinations remain obvious. Large dark-blue cross-pipes and pale towers dominate the upper composition. Sand banks and exposed rectangular platforms produce a collection of placed modules rather than the concept's embedded factory canyon. The glowing flat foreground object and outlined rock forms also look less materially resolved than the environment. |
| `foundry-exit.png` | The gantry is no longer the local subject. A thin crossbar and posts cut across the road directly before a sand crest, and the road continuation is difficult to read from this still. The large open sky/horizon and repeated right-side plant units lack the original concept's receding bridges, machinery, cliff enclosure, and atmospheric scale. No collision or unsafe-clearance inference is made. |

The vehicle is a separate whole-scene parity deficit: the concept has large, close engines, a strongly articulated cockpit, broad mechanical surfaces, and forceful cyan electrical light. The gameplay craft occupies a much smaller portion of the frame and reads darker and simpler. This does not lower the isolated gantry score, but it cannot be excluded from full-scene visual parity.

## Prioritized fixes

1. **P1 — Complete the gantry's major connected systems.** Continue the top pipe into substantial flanged riser/plant connections, or provide an equally clear visible connection to the surrounding process network. Replace narrow strap-only joints at important seams with a few large collars showing separation, bolt rhythm, and clamps. Give the truss ends a readable seat, knee/gusset connection, and attached fasteners; show anchored or braced feet wherever the ground exposes them. Success is a legible path from overhead load through the bridge and supports into the ground, visible in both a three-quarter source view and the near-span gameplay view.

2. **P1 — Make service function readable at gameplay distance.** Build one clearly proportioned trolley/hoist assembly with rail attachment, drum or pulley housing, hanging cable/chain, and hook. Connect an access ladder, landing, guardrails, and deck into a coherent maintenance route. Concentrate on a few readable assemblies instead of many tiny decorative additions. The next gameplay image should communicate pipe service and lifting function without depending on the neutral render.

3. **P1 — Improve plant construction beyond this one asset.** Break the repeated tank/chimney pattern with larger connected process groups, secondary vessels, pipe racks, valves, support frames, service decks, and varied elevations. Integrate exposed slab edges into retaining structures, rubble, and terrain. Add industrial layers down the visible route, not just beside the camera. This is essential for the full-scene gate; a finished gantry alone cannot raise the current scene to 8/10.

4. **P1 — Restore material and lighting hierarchy in the actual game render.** Give structural steel, painted pipe, concrete, and rock different roughness/value behavior; bring back readable contact shade and edge response at plates, collars, and braces. Localize wear around joints, feet, access surfaces, and lower dirt zones. The target needs orange machinery and cool structure to separate under the existing warm light without becoming the current broad red/purple masses. Avoid treating a globally stronger orange grade as a substitute for these distinctions.

5. **P2 — Clarify the road and its depth.** Establish persistent road-edge cues around crests, reduce visually arbitrary repeated marker placement, and make the exit crossbar's role and road continuation easier to read. Use offset overhead layers, varied silhouettes, and restrained distance haze to lead the eye through the route. Validate this from the supplied approach, near-span, middle, and exit positions; a single hero view is insufficient.

6. **P2 — Address the full-frame foreground separately.** Bring cockpit, engine scale/readability, surface articulation, and electrical lighting closer to the original concept's foreground presence. Assess this as a scene/camera/vehicle problem, not as part of the gantry asset's construction score.

## Acceptance judgment

**Local construction: FAIL. Local gameplay gantry: FAIL. Full-scene original-concept parity: FAIL.** No reviewed score meets 8/10. The current images support a recognizable, spatially constructed gantry in a legible foundry-themed route, but they do not support visual acceptance against either reference. A later review must judge new actual gameplay images as well as the source construction; neutral renders cannot replace the gameplay gate.

## SHA-256 evidence manifest

Paths below are relative to `/Users/amir/Projects/PodRacing`. Hashes were computed from the ten actual image files reviewed.

| Image | SHA-256 |
| --- | --- |
| `docs/inkstorm-overhaul/concepts/06-foundry.png` | `e56c72e8a4c96be345a5cfa088186ad65763fbc94c5f8b85233bb9a04b1aeb50` |
| `docs/inkstorm-overhaul/concepts/11-foundry-construction-round33.png` | `ef201350569c53d6a36a9e1c0f1db7c6c8d444c58a1dd39db5b3ab22e2c6a2d8` |
| `output/gauntlet/round-33-foundry-gantry-v1/06-foundry.png` | `1885389d7cb164f98c538a0a0cabe112d24cf77b5e65ee1d3b4704c163fccef5` |
| `output/gauntlet/round-33-foundry-gantry-v1/foundry-approach.png` | `c9f889d8a015a1bf52c7f29a339766c9287ffb73450875b7ff22c2587e498263` |
| `output/gauntlet/round-33-foundry-gantry-v1/foundry-near-span.png` | `b2ba2969fa321b809ed38b1fc7570c1f716a7d4a1a7c2aed01757826e9ca2de0` |
| `output/gauntlet/round-33-foundry-gantry-v1/foundry-middle.png` | `c189e1469076906c276015b2ddccbe75e7492bcfae7eeadfb8a75fc401f007d2` |
| `output/gauntlet/round-33-foundry-gantry-v1/foundry-exit.png` | `a96314ee74cbe8875bdbc64563fdd1d4bf88287f1c01458a6ad5a2b0c23f6c06` |
| `assets/source/inkstorm/foundry-service-round33/v1/foundry-service-gantry-v1-approach-three-quarter.png` | `f00e18b6376cf2eb7d2d073c8666488b887e28b3a20d271427dc6a068b3d076c` |
| `assets/source/inkstorm/foundry-service-round33/v1/foundry-service-gantry-v1-rear-three-quarter.png` | `d6bf13d89ab78279e1f8399f578833e40b745c6f1e12424633a951e8589572e8` |
| `assets/source/inkstorm/foundry-service-round33/v1/foundry-service-gantry-v1-side-depth.png` | `0221fae2897a8dd7ff0b85a41b12cb609856e44c661e8540d5dbfbb94d74f11d` |
