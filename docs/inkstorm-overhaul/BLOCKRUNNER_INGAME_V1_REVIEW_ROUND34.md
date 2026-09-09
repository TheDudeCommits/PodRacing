# Blockrunner in-game V1 visual review — Round 34

The selected Blockrunner does not meet the 8/10 visual admission gate. My score is **5.5/10 for the selected craft in game**, **6/10 for world target parity**, and **5.5/10 overall**. The persistent chase framing and flat material read are the main blockers.

Review date: 2026-09-08. Reviewer: independent delegated agent `blockrunner_runtime_review34`.

## Independence and evidence scope

This is **not a fresh blind review**. Before this visual assignment, I reviewed the narrow optional exhaust-aperture runtime change, its focused tests, and the pending Blockrunner catalog patch/README. I had no earlier exposure to the images, art critics, or their scores. The visual judgments below come from my own inspection of the requested images, without reading other implementation, reports, or receipts during this pass.

I individually viewed all **13 PNG captures** in `output/gauntlet/round34-blockrunner-admission-v1/captures-v1/` and all **8 requested targets**: concepts 01–07 and `12-blockrunner-round34.png`. No contact sheet substituted for an individual image. The paired inventory records each file's dimensions, bytes, SHA-256, and actual viewing order. The image tool requested original detail; its delivery resized the 2160 × 1350 captures to 1996 × 1248. This supports full-frame visual judgment, not exact native-pixel inspection.

I used no browser, MCP, build, test runner, or implementation edits. These findings apply only to the V1 image hashes in the inventory. Later root-agent fixes are outside this review.

The concept images are visual direction targets. I judge composition, material hierarchy, environment density, and readability; Blockrunner is not required to become the different vehicle depicted in concepts 01–07. I do not recommend changing its authored silhouette or replacing its seated minifigure pilot.

## Prioritized visible defects

1. **P1 — Chase composition hides the craft's defining twin engines.** In `01-grid`, `02-salt-run`, `03-canyon`, `05-launch`, all foundry straight views, `07-finish`, and `live-drive`, the pale rear wedges and tall side panels dominate the lower foreground. The red engines survive mainly as small slivers beyond the side walls. Both nozzle surrounds, their attachment beams, and the cyan exhaust are not clearly readable together. The angled `04-fork` frame reveals the right engine and demonstrates how much identity is lost in the straight chase view. The target's rear inset separates the pilot, cockpit, engines, and nozzle rings. **Next step:** adjust the Blockrunner chase eye/aim/framing while preserving the model, then recapture straight, turn, launch, and foundry views. Acceptance should show both complete nozzle surrounds and a legible pilot while retaining useful road space; the rear body should no longer be the widest uninterrupted bright shape.

2. **P1 — The runtime material read is substantially flatter than the Blockrunner target.** The ivory wedges are broad, near-uniform color planes, dark side plates merge into solid rails, and red engines read as plain faceted red shells where visible. The concept has directional edge highlights, readable recesses, restrained wear, varied roughness, and warm/cool separation within each material. In `live-drive`, the studs and thin outlines look particularly coarse against the smooth body planes. **Next step:** inspect a larger neutral and directional-light beauty view, then tune material/light response and visible texture scale so the red paint, ivory plates, dark metal, and pilot remain distinct at game distance. These images do not establish that maps are missing or incorrectly bound; they establish that the intended detail is not visible enough.

3. **P2 — Garage presentation does not offer a strong first inspection of the selected craft.** The selected model is small within the large preview panel and defaults to a rear three-quarter view. The pilot's back is visible, but the visor, controls, front intake construction, and surface detail cannot be assessed confidently. The surrounding selection UI is clear. **Next step:** make the initial preview a larger front three-quarter or sufficiently elevated three-quarter composition, retain a second rear view for nozzle inspection, and verify that the pilot face/visor and engine separation are readable without relying on the tiny card thumbnail.

4. **P2 — World composition matches the broad landmarks but lacks the targets' depth and scale hierarchy.** `02-salt-run` has large empty road/sky areas and distant isolated formations rather than nearby angled spires and a layered route corridor. `05-launch` supplies a convincing drop and mesa-side factory, but the broad basin is mostly empty and the distant architecture is sparse compared with its target. The `01-grid` gantry is substantial, but the pits and staging activity are much less dense than the reference. **Next step:** strengthen a few authored near/mid/far landmarks and track-edge material transitions at these specific viewpoints, preserving a readable driving corridor. Generic repeated roadside rocks and cones will not supply the missing hierarchy.

5. **P2 — Fork and finish frames communicate navigation more strongly than their intended landmark payoff.** `04-fork` clearly distinguishes a rising left bridge and a right-side turning route, but does not show the target's central rock mass with two roads wrapping it. `07-finish` reads as a signposted left hairpin; the target's finish gantry/payoff is not visible in this image. This is a statement about the submitted viewpoints, not proof that the missing structures do not exist elsewhere. **Next step:** select or tune the approach framing so each chapter's distinct landmark and route continuation are visible together, and recapture the actual finish approach.

6. **P2 — Foundry density is credible, but route continuity and lighting depth remain weak.** The foundry has recognizable tanks, flanges, valves, catwalks, and overhead spans. In `06-foundry`, `foundry-near-span`, and `foundry-exit`, broad terrain humps interrupt the forward route read; repeated tanks/pipes and large pale cross-members flatten the space. The target gives a stronger layered corridor and more selective warm/cyan focal accents. **Next step:** improve the visible path over each crest, vary the prominent machinery silhouettes, and use selective lighting/contrast to separate near machinery from the far exit. A still does not prove that any pipe or span collides with the craft.

## Scores

Scores are visual judgments of this evidence, not technical test results. The admission gate requires the important craft and world categories to reach at least 8/10; a readable HUD cannot compensate for a weak craft view.

| Category | Score / 10 | Judgment |
| --- | ---: | --- |
| Blockrunner identity in chase view | 5.0 | Recognizable studded cockpit, but the twin-engine identity is largely occluded. |
| Chase camera and road balance | 4.5 | Large pale foreground body; engine/nozzle separation is poor. |
| Pilot visibility and character read | 6.0 | The seated pilot remains visible; front visor/character detail is not established by the submitted views. |
| Blockrunner materials against target 12 | 4.5 | Correct broad ivory/red/dark palette; weak wear, recess, highlight, and roughness read. |
| Exhaust visual readability | 4.0 | A small cyan nozzle is visible in the angled fork/garage view; both engines are obscured in most chase frames. No clipping defect is established. |
| Garage composition | 6.0 | Clear selection flow and complete model, but insufficient hero scale and inspection angle. |
| World target parity | 6.0 | Coherent palette and chapter landmarks; incomplete depth, material richness, and focal staging. |
| Immediate route readability | 6.5 | Edge markers and chevrons help; some foundry crests conceal continuation. |
| HUD and menu text hierarchy | 8.0 | Core numbers, controls, selection state, and start action are readily readable in these desktop captures. |
| Selected Blockrunner visual admission | **5.5** | **Fail: below 8/10.** |
| Overall V1 visual gate | **5.5** | **Fail: below 8/10.** |

## Individual capture observations

Every row below corresponds to an individually opened PNG. World scores compare the relevant concept chapter; they do not score simulation behavior.

| Capture | World/composition score / 10 | Observation |
| --- | ---: | --- |
| `01-grid.png` | 6.0 | Strong readable gantry and warm rock backdrop; sparse pit staging and little engine visibility. |
| `02-salt-run.png` | 5.5 | Clean road direction; empty sky/road balance and few near/mid-distance formations reduce the target's scale and speed composition. |
| `03-canyon.png` | 6.0 | Substantial enclosing arch and distinct purple shadow mass; less stratified light/detail and weaker layered passage than the target. |
| `04-fork.png` | 5.5 | Two different route structures are visible; the giant central rock fork composition is not established. Right engine is more readable here. |
| `05-launch.png` | 6.5 | Strongest open-world reveal: drop, mesas, and factory register; the distant basin lacks the target's successive landmarks and settlement density. |
| `06-foundry.png` | 6.5 | Clear industrial density and overhead hierarchy; terrain hump and broad cross-members compress the exit read. |
| `07-finish.png` | 5.5 | Hairpin signs and cliff setting are clear; submitted frame does not show a finish landmark/payoff. |
| `foundry-approach.png` | 6.5 | Machinery roles, flanges, and tank scale read well; broad open sandy foreground and repeated forms weaken corridor continuity. |
| `foundry-near-span.png` | 6.5 | Useful close view of span/tank arrangement; pale verticals and crest still flatten the forward route. |
| `foundry-middle.png` | 6.5 | Industrial corridor is legible and layered; large foreground pipes and repetitive tank/catwalk forms dominate. |
| `foundry-exit.png` | 6.0 | Gate and machinery remain readable, but the broad crest hides the road beyond and weakens the exit reveal. |
| `garage.png` | 6.0 | Selected Blockrunner and menu state are clear; model is small and oriented away from a useful pilot/intake inspection. |
| `live-drive.png` | 5.5 | Same engine occlusion and pale rear-body dominance persist; visibly coarser edges around studs and terrain silhouettes merit a native-resolution motion check. |

## What these images do and do not establish

- All 13 submitted captures visibly contain the selected studded Blockrunner body. The seated pilot is visible, and the broad ivory/red/dark palette persists through the shown lighting.
- The primary chapter/foundry checkpoints show 410 KPH with a zero race clock. They are **staged stills, not proof of motion, FPS, handling, complete races, or sustained driving quality**.
- `live-drive.png` shows a nonzero clock and 486 KPH, but one still remains insufficient for motion quality, input response, performance, or completion claims.
- No submitted image establishes rival Blockrunner loading in an actual Cup field, failure/retry behavior, LOD transitions, or disposal. Those require their own runtime evidence.
- No source/package receipt was used to award visual credit. Earlier narrow code review found no confirmed optional-aperture regression; that does not change this visual gate.
- There is no reliable basis here to claim absent textures, malformed source normals, incorrect exhaust aperture math, collision errors, or a particular GPU fault. Those are possible investigation paths only where a visible defect motivates them.

The next visual submission should first resolve the craft framing and material read, then include a larger pilot/front-engine garage inspection and the same chapter viewpoints. It must be reviewed again against the same targets; this report does not pre-approve any unseen fix.

