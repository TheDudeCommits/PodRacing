# Round 36 — simple setup, populated Battle, and terrain handling

The previous default dropped a new player into solo Time Trial, where opponents and weapons are deliberately disabled. A new session now opens **Battle: eight pods, weapons on**. Race offers the same field with weapons off; Time Trial and Cup remain separate choices. The setup, route-marker and collision-response fixes are implemented. A broader suspension retune was tested and withdrawn after full-race regressions. The broader fleet/world/audio/online overhaul is still unfinished.

## What changed

- **Setup:** Battle / Race / Time Trial / Cup across the top; one large, inspectable 3D pod in the middle; difficulty and laps only where adjustable; Race below. The old vehicle-class cards, setup statistics and descriptive panels are removed from the default view. Optional courses, Build where applicable, online and settings live under More. Stock events do not expose a nonfunctional Build choice.
- **Actual pod selection:** Teemto, Sebulba, Polwo and Blockrunner load their existing authored models. Drag, rotation buttons and keyboard inspection rotate the real model. Portrait uses a real elevated camera view. Selecting an appearance selects the actual racer presentation. All eight local quick-race entries use pod physics; their AI personalities remain distinct. The four appearances currently share the same pod handling model.
- **Input:** Focused menu buttons retain normal Enter/Space behavior; Escape cannot accidentally launch a race. Starting Race releases menu focus so driving works immediately. Settings can be used over the preview. E/Q/F captions, accessible labels and titles follow keyboard remaps.
- **Repeat inspection:** Returning from a race or revisiting a cached pod now reacquires and awaits the correct live mesh. The original native failure showed a ready image with no rotation; the same input now produces an actual visible 15° inspection. Starting Race still releases the preview GPU context.
- **Less racing text:** Only the highest-priority directional threat carries a caption; secondary bearings and grouped counts remain. Default landing feedback is one line. Extra clearance/route labels stay behind Route detail; a routine hit no longer adds an opponent-name line. Main lap/time/position, speed/resources, weapon readiness and important takedown/wreck warnings remain.
- **Route furniture:** Renderer and simulation share the exact same cleared light placements. Lights now sit beyond a 12 m shoulder, are excluded from narrow canyon walls, nearby lanes/forks, ramp conflicts and obstructing scenery. Their collider matches the smaller visible light. In the three authored-course benchmarks, markers within a full craft's reach of the road went from 185/187/186 to **zero**. Off-course posts remain physical objects.
- **Physics:** Shallow-contact torque now uses the craft-local impulse basis, so identical wall glances behave consistently at different world headings. This preserves tangential motion. Suspension, gravity, repulsor range and landing damage retain the previously released implementation. The deterministic 120 Hz simulation remains authoritative.
- **Rejected experiment:** A slope-following suspension change passed isolated incline tests but caused longer flights and cumulative landing damage in complete races. Fixing a separate 3 m ledge-launch defect did not fix that broader regression. Both full-speed and slower native trials failed the valid-PB gate; a same-course comparison with released physics finished clean. The experiment was withdrawn without weakening damage or PB rules. Its source, measurements and failures remain archived.

## Gauntlet and verification

**TypeScript, production build and all 961 tests across 164 files pass.** Early failed checks remain archived. Two original contact/render tests were restored unchanged when the experimental suspension was withdrawn. Test timeouts were not raised; worker concurrency is bounded to four.

Native browser checks cover 1440×900, 390×844, 844×390 and 667×375, actual pod switching/rotation, touch selection, native keyboard controls, remapping, reduced motion and high contrast. Final menu targets are visibly at least 44×44 px, inside the viewport and nonoverlapping. All seven rivals move; E/Q/F produce actual fire, shield and mine state. Owned browsers and servers close after each run. These checks do not constitute physical-phone or physical-controller acceptance.

Two fresh screenshot-only critics were used. The first scored the setup hierarchy/restraint 9/9 but requested larger controls and less battle clutter. After those changes, a new blind critic **approved at 8.9/10 overall**, with setup hierarchy 9.2, simplicity 9.1 and the supplied desktop battle HUD 8.6. This accepts the reviewed UI images, not animation, the whole world or the Galactic Racer benchmark.

The final exact build passes **three repeated resource cycles**: all four actual pod inspections, cached Teemto revisit, race start, seven staged world sections, and garage return. Every corresponding second-to-third cycle stage has **zero geometry/texture/program count growth**. Inspection owns two live WebGL contexts (main plus preview); racing owns one. Peak counts stabilize at 218 geometries/152 textures/56 programs and garage at 217/152/55. This is a bounded count/ownership check, not GPU-byte measurement or a long-session leak proof. Two earlier resource attempts failed on observer assumptions (context alpha and visible-host readiness), were corrected in the harness, and remain preserved.

All three final native full-race checks use `index-DH3wvA-l.js`, SHA256 `e507c666fbe809c2275fa90a1d7434afce9a96be1e9d0a68ab0ee46616639a53` (1,882,556 bytes):

| Run | Result | Mean FPS | p95 frame time |
| --- | --- | ---: | ---: |
| Time Trial | Clean 63.742 s PB; ten sectors and ghost saved | 59.594 | 16.8 ms |
| Cup Canyon, round one | Clean two-lap 126.958 s PB; points saved and Continue opens Foundry | 59.158 | 16.8 ms |
| Battle | 101.183 s finish; weapons/mines/shields active; recovery correctly prevents a PB | 59.417 | 16.8 ms |

Measured on this Mac M4 in Chrome 153, 1440×900 with requested DPR 2 and adaptive resolution. Every racing RAF interval is included, including classification time; none exceeded 50 ms. The automated driver uses the ordinary gamepad adapter without pose, progress, health or clock injection. This is local browser cadence, not a guarantee on other hardware or physical-controller feel. Battle observed 18 field takedowns and 20 wrecks; combat balance and encounter pacing still need human playtesting. Earlier failed suspension races and previous-build Battle measurements remain separately identified. The Cup check covers round one and its continuation, not all three championship rounds.

## Reference coverage

The supplied [Galactic Racer video](https://www.youtube.com/watch?v=1FwcQlBZFP0) informed three priorities: useful forward travel through shallow contact, one bounded landing response, and readable road/exits/runoff. Reviewed 21 timeline positions, 34 consecutive paused positions within short contact/landing windows, and 26 sampled playback observations. **Whole-video every-frame coverage and audio listening are incomplete.** The caption export is local navigation material, excluded from the published repository. No reference footage or artwork was imported into the game. [Exact study and limitations](round36-reference-study/REPORT.md).

## Remaining items 1–8

1. **Visual finish:** This setup passes its fresh still review. Continuous world composition, environmental animation and richer material/lighting finish remain below the intended benchmark. Crash art is deprioritized per the latest request.
2. **Fleet:** Four of 26 preserved source families remain in the runtime. The other 22 need individual cleanup, materials, driver fitting where needed, LOD/export, attribution checks and in-game admission. No new family was registered in this revision.
3. **Private asset trials:** Ivory, Ark and further Foundry trials remain private/unaccepted; existing Blender source work is preserved. This UI/physics release does not admit those unfinished assets.
4. **Maps:** Lane/runoff furniture is corrected. Full sightline/composition passes, better connected canyon/fork/launch transitions and additional fully authored circuits remain.
5. **Handling and replayability:** Heading-consistent glances are fixed; broader suspension and landing tuning remains open after the unsuccessful experiment; populated Battle is accessible immediately. Physical-controller laps, first-time player testing, weapon/AI fairness, medals, sustained progression and retention tuning remain.
6. **Inputs and devices:** Remapped HUD captions and menu focus are fixed; desktop and responsive browser checks pass. Physical touch-driving, mobile GPU and broader hardware/browser testing remain.
7. **Audio:** Existing synthesized sound remains. Distinct engine/pass-by/impact design, music production and headphone/speaker listening/final mix are unfinished.
8. **Online and resources:** The current resource-cycle check is bounded local evidence. Real two-network latency/loss/reconnect/disconnect/rematch and long sessions remain unverified; competitive backend and anti-cheat are not implemented.

[Handling measurements](HANDLING_ROUND36.md) · [Superseded experimental physics review](round36-handling-rereview.md) · [Fresh UI critic](round36-blind-ui-final.md) · [Previous released scope](RELEASE_REPORT_2026-09-09.md).

## Release identity

This checkpoint is based on `5925d437f97b57939ffbf02306979d238627491e`, branch `codex/now-this-is-podracing`. The [V36 publication record](https://github.com/TheDudeCommits/PodRacing/releases/tag/inkstorm-v36-20260909) records the final commit, Vercel deployment, canonical-site verification and downloadable QA archive. [Compact exact-build evidence](evidence/round36/final-validation-summary.json) and the raw archive distinguish clean competitive runs, Battle recovery, diagnostic resource staging and rejected experiments.
