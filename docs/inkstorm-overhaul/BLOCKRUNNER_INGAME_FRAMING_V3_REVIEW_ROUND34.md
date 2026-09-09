# Blockrunner framing V3 visual review — Round 34

V3 materially improves chase readability, but it still does not meet the 8/10 visual admission gate. My scores are **6/10 for selected Blockrunner visual admission**, **6/10 for world target parity**, and **6/10 overall**. Chase framing rises from 4.5 to **7/10**; material detail and the garage pilot view remain unresolved.

Review date: 2026-09-08. Reviewer: independent delegated agent `blockrunner_runtime_review34`.

## Context and evidence

This is **not a fresh blind review**. I previously reviewed narrow exhaust/catalog code and the V1 images, and authored the V1 visual review. I have not read another critic's visual verdict. This follow-up judges the actual V3 PNGs against the same retained concepts, with that prior context disclosed. It does not alter or replace `BLOCKRUNNER_INGAME_V1_REVIEW_ROUND34.md`.

I individually opened all **13 PNGs** in `output/gauntlet/round34-blockrunner-admission-v1/captures-framing-v3/`. The eight targets—concepts 01–07 and `12-blockrunner-round34.png`—were individually viewed in the prior pass and their retained hash pins are reused here, as authorized. The new inventory verifies their hashes again and distinguishes new V3 viewing from reused target viewing.

Image delivery resized the 2160 × 1350 captures to 1996 × 1248 despite requesting original detail. This is full-frame visual review, not exact native-pixel inspection. No browser, MCP, runtime edit, build, test runner, heavy computation, or benchmark was used. No new implementation, receipts, or other reports were read to influence the verdict.

## What improved

- **Twin-engine identity now reads in chase.** In all chapter and foundry views, both red engine bodies, their long beams, and the transverse connection are visible. The body no longer conceals almost all of the engine mass. The fork view provides particularly clear bilateral nozzle and linkage separation.
- **The pale rear body no longer dominates the driving image.** Much of the broad rear wedge is below the crop, leaving a compact craft at the bottom and more visible near-road surface. This resolves the most severe V1 framing defect.
- **The pilot silhouette is easier to separate from the cockpit in chase.** The elevated view exposes more of the seated figure and the studded cockpit floor. The pilot is smaller on screen, so this is a compositional improvement rather than evidence of richer character detail.
- **The garage makes the overall front-engine layout easier to recognize.** Both red pods and the long beams are clear. This gain comes with a pilot-visibility regression, described below.

These are visible improvements in the submitted stills. They do not establish camera behavior through motion, terrain transitions, or collisions.

## Remaining actionable defects

1. **P1 — Material target parity remains low.** The red engine shells read as mostly plain faceted red surfaces; ivory body planes and dark rails have little visible wear or varied surface response. The target's restrained scratches, lit bevels, recess contrast, and warm/cool material separation remain much stronger. Smaller chase scale makes fine detail harder to read, not easier. **Next step:** produce a larger game-rendered material inspection under useful directional light and tune only the response/detail scale needed to make the existing red, ivory, metal, and pilot materials distinct. No conclusion about missing maps, corrupt normals, or failed bindings is supported by these screenshots.

2. **P2 — The garage default now hides almost the entire pilot.** In `garage.png`, the low front-side view puts the near dark side panel directly across the cockpit; only a small helmet top is visible above it. The engines are better exposed, but the seated pilot, visor, hands, and controls cannot be inspected. The model also remains fairly small inside the large preview panel. **Next step:** raise the garage eye enough to see into the cockpit while retaining this engine-forward three-quarter orientation, and increase useful model scale. The success criterion is one default view showing both engine bodies and a recognizable seated pilot/visor; an optional rear inspection can cover the nozzles.

3. **P2 — Chase is usable but still lacks a strong hero read.** The elevated crop reveals the vehicle structure, but places it in a narrow strip at the bottom. Cyan exhaust is small and partly hidden behind the beam/rail alignment in several straight views; the pilot remains a small grey back-and-helmet silhouette. **Next step:** preserve V3's engine separation and road space. If further adjustment is made, test a modestly larger craft framing with the same elevated sightline. Do not revert to V1's oversized rear wedges, widen the authored engine placement, enlarge the actual source openings, or add invented geometry just to match the concept.

4. **P2 — World target gaps persist despite better road visibility.** Salt run remains sparse in near/mid-distance formations. Launch has a readable cliff drop and factory but an empty broad basin. The grid has a substantial gantry without the target's dense staging; the canyon has a strong arch without equivalent stratified light and layered passage. Fork still reads as a raised left bridge plus a signed turning road, rather than the target's two paths wrapping a central rock mass. Finish still shows a hairpin, with no finish payoff visible in this submitted frame. **Next step:** address these specific landmark/depth gaps through authored composition and better chapter approach evidence, rather than more generic roadside repetition. No claim is made that an unseen finish structure does not exist.

5. **P2 — Foundry crests still obscure route continuation.** More ground is visible now, and tanks, flanges, valves, catwalks, and pipes remain readable. Nevertheless, `06-foundry`, `foundry-near-span`, and especially `foundry-exit` show broad sandy humps that hide the following road. Large repeated columns/pipes and pale cross-members compress the depth compared with target 06. **Next step:** make the path over and beyond the crests legible, then improve selective near/far contrast and prominent machinery variation. No collision fault can be determined from these stills.

6. **P3 — Live capture still warrants native-resolution motion inspection.** `live-drive.png` shows coarse/dotted contours on distant rock silhouettes and dense dark edges around cockpit studs. This was also visible in V1. **Next step:** inspect the running game at native size to determine whether this is stable stylization, aliasing, or a temporal artifact. The image alone cannot identify a GPU cause or prove flicker.

## Scores and gate

| Category | V1 / 10 | V3 / 10 | Assessment |
| --- | ---: | ---: | --- |
| Blockrunner identity in chase | 5.0 | **7.0** | Both engines and their connecting structure now read. |
| Chase camera and road balance | 4.5 | **7.0** | Major improvement; compact lower framing retains useful road space. |
| Pilot visibility/character across submitted views | 6.0 | **6.0** | Better chase separation, worse garage cockpit visibility. Chase silhouette alone merits 7/10. |
| Materials against target 12 | 4.5 | **4.5** | Flat material read persists. |
| Exhaust visual readability | 4.0 | **5.5** | Both cyan accents are easier to find, especially in fork; still weak in straight views. |
| Garage composition | 6.0 | **6.0** | Better engine identity balanced by severe pilot occlusion. |
| World target parity | 6.0 | **6.0** | The same broad environmental gaps remain. |
| Immediate route readability | 6.5 | **7.0** | More near-road visibility; crests still interrupt continuation. |
| HUD/menu text hierarchy | 8.0 | **8.0** | Core labels, numbers, controls, and selection remain clear. |
| Selected Blockrunner visual admission | 5.5 | **6.0** | **Fail: below 8/10.** |
| Overall visual gate | 5.5 | **6.0** | **Fail: below 8/10.** |

The overall score reflects the important visual blockers; it is not an arithmetic average padded by HUD quality. The V3 framing improvement is worth retaining. It does not supply the missing material or environment quality.

## Individual V3 image review

All thirteen rows represent individually viewed V3 images; none were inferred from filenames or a contact sheet.

| Capture | Observation |
| --- | --- |
| `garage.png` | Clear front engine pair and beams; low side wall conceals the pilot except for a helmet top. |
| `01-grid.png` | Much smaller rear-body obstruction; both engine masses and cockpit are separated beneath a readable gantry. Pit density remains sparse. |
| `02-salt-run.png` | More road visible and engines readable; broad empty road/sky composition and isolated formations persist. |
| `03-canyon.png` | Craft no longer competes with the arch; pilot and both red pods are visible. Purple wall mass remains comparatively flat. |
| `04-fork.png` | Best engine/nozzle separation in this set; raised bridge and lower turning route are clear. Central-rock target composition is still absent from this viewpoint. |
| `05-launch.png` | Drop and descending road are easier to see around the compact craft. The factory/mesa reveal remains stronger than the sparse basin. |
| `06-foundry.png` | Improved foreground clearance and engine identity; forward hump still hides continuation below the industrial spans. |
| `07-finish.png` | Better immediate turn visibility; finish landmark/payoff still not shown. |
| `foundry-approach.png` | Machinery roles and road edge remain readable; the elevated crop exposes the engine connection well. |
| `foundry-near-span.png` | More sandy corridor visible; crest and repeated tank/column forms still weaken the far route. |
| `foundry-middle.png` | Useful industrial depth and an unobstructed compact craft silhouette; large foreground pipes remain dominant. |
| `foundry-exit.png` | Broad crest is still the main forward obstruction despite higher framing; rockfall marker overlaps the lower craft region. |
| `live-drive.png` | Improved engine visibility persists at the shown nonzero clock; coarse contours and low material detail remain visible. |

## Evidence limits and next acceptance

The repeated **410 KPH / 0:00.00** captures are staged stills. They prove neither motion nor FPS. `live-drive.png` shows **484 KPH / 0:07.16**, but a single frame is still insufficient to prove camera stability, driving quality, performance, or completion. The independent full-race benchmark mentioned by the parent was not consulted and cannot change this static visual assessment.

These images do not establish rival Blockrunner loading in a Cup field, LOD transitions, failed-load/retry behavior, disposal, or final source/export fidelity. No technical fault in those systems is claimed.

For the next visual submission, retain the V3 chase improvement, fix the garage pilot view, make the material treatment perceptible, and demonstrate the intended fork/finish landmarks and foundry route continuation. Reassess the actual resulting images against the same targets. No unseen fix is pre-approved by this report.

