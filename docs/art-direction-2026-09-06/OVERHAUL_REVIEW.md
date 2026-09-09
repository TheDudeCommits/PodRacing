# PodRacing — overhaul review and art direction

Reviewed 6 September 2026. Recommended direction: **Inkstorm**, with Sunforge's mechanical detailing and sense of industrial scale.

The game has a substantial systems foundation. Its largest opportunity is to make the driving, places, machines and reasons to return as compelling as its feature list. Build one spectacular, repeatedly enjoyable circuit to final quality, then expand using that production standard. A focused browser game can pursue AAA presentation and polish; these concepts do not establish the staffing, content volume or performance of a full AAA production.

## Source and review scope

- Repository: [TheDudeCommits/PodRacing](https://github.com/TheDudeCommits/PodRacing/tree/codex/now-this-is-podracing).
- Branch: `codex/now-this-is-podracing`; inspected HEAD: `0f0e8ab209cc5156efaf92b545630bd243b14478`.
- Read the exact linked [HANDOVER.md](https://github.com/TheDudeCommits/PodRacing/blob/0f0e8ab209cc5156efaf92b545630bd243b14478/HANDOVER.md), plus ARCHITECTURE.md, simulation, rendering, UI, audio, course, persistence and networking source.
- Correct checkout created at `/Users/amir/Projects/PodRacing`. The task's starting folder, `/Users/amir/Codex-ThreeJS`, is a different dance-game repository.
- Inspected the [live game](https://now-this-is-podracing.vercel.app), exercised real keyboard input, inspected desktop and narrow-viewport UI, and captured gameplay and staged diagnostic scenarios.
- The live main JS, CSS and optional PeerJS bundle are byte-identical to the local production build. SHA-256 receipts are in `output/art-direction/bundle-identity.json`.
- This is a design/technical audit and concept deliverable. Game source, mechanics and deployment were not changed.

## What is worth preserving

The pure 120 Hz simulation, render separation, shared CPU/shader terrain, host authority and semantic input model are valuable foundations. Keep them through the overhaul.

The existing game already has four physically distinct classes; eight racers; seven rulesets; drifting and release boost; redline risk; drafting and slingshots; weapons, shields and mines; hazards and a warned race director; branch routes; six desert region profiles; per-vehicle Workshop saves; race highlights; and keyboard/gamepad and comfort settings. The main need is refinement and authored content around these systems.

Do not pitch any of those existing systems as new work. Four classes already have different stats and silhouettes; the proposal below strengthens their identity and presentation. The Workshop has 20 selectable parts across five slots; these are distinct from six in-race collectible upgrade part types.

## Current-state findings

| Area | Observed state and implication | Concrete overhaul |
|---|---|---|
| World composition | Open areas are dominated by similarly valued sand, sky bands, sparse pylons and distant repeated rock families. Close geometry is limited. This weakens scale, location identity and perceived speed. | Build foreground, middle-distance and skyline layers around named track sections. Place safe trackside structures that create parallax and frame the next turn. |
| Canyon | The current corridor reads as two modular walls sitting on terrain. The diagnostic overhead view makes the repetition clear. | Integrate cliffs into massive continuous terrain forms, with irregular buttresses, overhangs, wider chambers and a memorable silhouette. |
| Region identity | Regions change height functions, palettes, atmosphere and hazard preferences. The landmark renderer still uses a shared set of three procedural formation families. | Give each region distinct geology, architecture, surface response and one unique landmark kit. Start with one region. |
| Machines | Twin engines and exposed pilots are readable and worth keeping. Ringed cylinders, hard outlines and shared parts still dominate the close view. | Author refined silhouettes, material breaks, cables, vents, scars, pilot animation and visible component differences. |
| Speed and handling presentation | The live input path works, but empty surroundings and a distant chase view can reduce urgency. Straight throttle during the start also triggers the existing launch risk, making early mistakes easy. | Tune camera and close parallax together; teach the launch, braking, drift release and heat loop in a short playable introduction. |
| Driving readability | The bright center ribbon does much of the route explanation. A turn label can say “start straight” even when the generated section bends. | Provide geometry-based bend preview, braking references, track shoulders, silhouettes and sparse chevrons. Retain the ribbon as an assist setting. |
| HUD | Lap/time/position, mode panel, heat, minimap, progress ladder, corner cue, combat panel, telemetry and speed all compete. Many labels are tiny condensed capitals. | Establish three stable instrument groups, larger critical numbers, a single contextual message queue and peripheral threat cues. |
| Garage | The Workshop exposes real tradeoffs, but text-heavy cards obscure the machine and truncate long explanations. | Use an inspectable garage scene with highlighted parts, compact comparison values and full descriptions on focus. |
| Replayability | Fresh seeds provide variety, and Workshop choices persist. No persistent record book, ghosts, course favorites, career or unlock structure was found. | Add fixed circuits, saveable seeds, personal records and versioned ghosts before a larger progression layer. |
| Mode focus | Seven modes are offered immediately through a dropdown. Circuit still includes combat; the combat systems are not limited to Combat mode. | Make the initial mode explicitly defined and explain its rules. Introduce advanced formats through a clearer event selection flow. |
| Audio | Runtime audio and score are synthesized; one approximately 96 KB WebM recording is bundled. Audio readiness was verified, but this audit did not perform a critical headphone listening session. | Commission or author distinct engine layers, pass-bys, material impacts, environmental acoustics and an adaptive score, then mix them through playtests. |
| Mobile | At 390×844 the registry becomes a long scroll; race setup is below the vehicle cards. Start guidance requires Space/Enter and no touch driving adapter exists in the inspected source. | Treat desktop/controller as the first acceptance target. Mobile needs a deliberate start button, touch layout and device-specific playtest milestone. |

### A specific source-level visual opportunity

`src/render/objects/DesertLandmarks.ts` excludes landmarks within 235 m of its update center and culls some tall nearby formations. This avoids silhouette collisions but also removes much of the scenery that would communicate speed. Replace the blanket exclusion with course-aware placement, collision-safe shoulders and camera visibility checks. Keep dramatic close structures beside the track while protecting the actual racing envelope.

### What the playtest establishes

The live checks confirmed throttle, A-left/D-right input, drift input, redline heat, one shot fired, shield activation, mine-charge reduction, braking and a genuinely frozen race clock when paused. They establish working input paths, not balanced difficulty, ideal steering feel or long-term enjoyment. Full-lap human playtests on a real controller remain necessary.

The existing capture harness initially failed immediately after pointer selection: simulation choice had changed before the DOM selection marker was read. An audit-only copy adding a wait for the marker passed all 17 Retina capture views. The live marker also settled correctly after 300 ms. This supports a harness synchronization issue; it is not evidence that vehicle selection is unusable. The original harness was preserved.

## Art-direction previews

These are original AI-generated **aspirational concepts**, not engine renders, shipping assets or performance promises. All three use a comparable chase view, twin-engine silhouette and restrained instrument layout. Final prompts are saved in [prompts.md](/Users/amir/Projects/PodRacing/docs/art-direction-2026-09-06/prompts.md). They were generated with the built-in image generation tool.

### A — Sunforge

![Sunforge concept](/Users/amir/Projects/PodRacing/docs/art-direction-2026-09-06/A-sunforge.png)

Cinematic desert machinery: weathered ceramic and metal, monumental excavation equipment, warm raking sunlight and deep cool canyon shadows. The strongest fit for the physical danger and industrial scale of the original inspiration.

Production requirements: authored vehicle meshes and industrial kits, material textures, convincing contact shadows, directional lighting, distant geometry LODs, selective dust and careful tone mapping. Highest asset-detail burden of the daylight options. Realistic materials make missing detail and weak lighting particularly visible.

### B — Inkstorm — recommended

![Inkstorm concept](/Users/amir/Projects/PodRacing/docs/art-direction-2026-09-06/B-inkstorm.png)

Painted animation: sculptural vermilion canyons, indigo shadow planes, broad cloud forms, selective ink edges and designed dust shapes. Preserve the bold color and cel-rendering foundation, then add authored surfaces and composition. The vehicle remains mechanically detailed, while environment shape and value lead the image.

Production requirements: hero rock meshes, painted albedo/trim textures, artist-controlled shadow ramps, selective outline masks, material differentiation and authored sky/cloud layers. Lower relative rendering complexity than realistic wet environments, but still requires real art production. Painterly fidelity is not achieved by reducing polygon counts.

### C — Monsoon Foundry

![Monsoon Foundry concept](/Users/amir/Projects/PodRacing/docs/art-direction-2026-09-06/C-monsoon-foundry.png)

Storm-lit industrial racing: wet dark mineral surfaces, immense cooling structures, cold vapor, amber course markers and lightning. A distinct environmental/material direction with strong trailer potential; use it as a later event or region if Inkstorm becomes the main style.

Production requirements: modular refinery architecture, wetness/material controls, controlled reflections, fog layering, spray and reliable contrast in dark scenes. Highest transparency/lighting/readability risk. Start with environment reflections and restrained planar effects where appropriate; avoid making expensive screen-space effects a universal dependency.

### Direction decision

Choose one material, lighting and outline language for the production slice. My recommendation is **B as the core art style**, using **A's mechanical plausibility and landmark scale**. C can become a later weather/region expression in that same style. The first assets should be one player craft, one canyon kit and one landmark; verify them in motion together before ordering the rest.

## Prioritized implementation backlog

Priorities express recommended implementation order. Acceptance criteria below are proposed gates, not measured results.

| Priority / work package | Actionable deliverables | Definition of done | Main code boundary |
|---|---|---|---|
| P0 — driving benchmark | Pin one seed and stock loadout; record telemetry; tune steering response, yaw damping, braking, drift charge/release, landing recovery and chase-camera look-ahead together. Add a 45–60 second interactive launch/drift/heat lesson. | Five fresh testers understand braking and boost without a verbal explanation; at least four finish the introductory route. An experienced driver can improve clean lap times through repeatable technique. | `game/simulation/`, `camera/CinematicCamera.ts`, `game/race/dynamics.ts` |
| P0 — authored circuit | Build one 60–90 second target lap with seven designed beats: grid, fast open approach, close canyon, fork, launch, industrial reveal and final technical corner. Include two meaningful alternate lines. | Every section has a recognizable visual landmark; both branches are valid for AI, checkpoints and multiplayer; the course is readable with the center ribbon disabled. | `game/race/course.ts`, `branches.ts`, `render/objects/RaceCourseView.ts` |
| P0 — art production path | Introduce an asset manifest, source files, export convention, glTF loading, texture compression, material adapters, LODs and explicit disposal. Preserve source art alongside optimized exports. | One authored craft and one environmental kit render with the chosen lighting, outlines, collision proxies and selection preview; missing assets produce a clear recovery state. | new asset-loading layer; `PodracerView.ts`, `VehicleCardPreview.ts`, materials/post |
| P0 — vehicle hero pass | Model/author engine bodies, cockpit, pilot pose, cables, wear and component variants. Add bounded engine lag, cable tension, cooling vents, heat response and landing compression. | Silhouette reads at race distance; all close cameras hold up; visible equipment matches the selected loadout. Presentation animation never changes collision truth. | `PodracerView.ts`, `pilots/`, Workshop view adapters |
| P0 — environment/lighting | Replace sparse general-purpose scenery with an authored canyon/industrial kit, layered skyline, terrain material breakup and trackside parallax. Add a sun/shadow plan and localized dust atmosphere. | Representative race frames have clear foreground/middle/background and readable rivals against both lit and shaded track. No pop-in on the approach to the hero landmark. | terrain, `DesertLandmarks.ts`, `SkyAtmosphere.ts`, materials/post |
| P0 — race HUD | Consolidate lap/place/time, driving/heat/damage and equipment into three predictable areas. Make mode text temporary, progress ladder optional, next corner prominent. Add a visible Start action and properly sized body text. | HUD stays inside safe margins at 1440×900 and 1280×720; critical status reads in a glance; no message covers the next apex; keyboard and controller focus are obvious. | `ui/RaceHud.ts`, `hudStyles.ts`, `model.ts` |
| P1 — mastery loop | Persist course IDs/favorites, personal bests, sector splits, medals and race history. Add a clean time trial with instant retry and personal-best ghost. | Results and ghosts survive reload; mismatched rules/physics versions cannot silently share a leaderboard; the same event can be retried from results with one action. | settings/storage; new records/ghost module; highlights as a starting presentation pattern |
| P1 — replayable events | Introduce a small championship, named rivals, a shared daily seed and optional constraints such as stock parts or low cooling. Distinguish fixed competitive conditions from chaotic director variants. | Each event defines course, ruleset, vehicle/loadout policy, director schedule and reward; results show the next meaningful objective. | race rules/director; new event catalog and progression save |
| P1 — purposeful opponents | Give existing AI personalities recognizable liveries, defensive lines, overtaking decisions, draft use and readable mistakes. Balance classes across multiple circuit types. | Difficulty changes behavior and capability transparently; class/AI comparisons run on identical seeds and loadouts; no inexplicable speed jumps decide races. | `game/ai/`, `RaceSimulation.ts`, vehicle catalog |
| P1 — spectacle with cause/effect | Build one rockfall/industrial hazard to final quality: warning, visible cause, safe/risky response, collision consequence and aftermath. Define a maximum simultaneous warning/effect budget. | The player can predict the hazard and explain a collision; all peers see the same event; dust and flashes preserve the escape route. | `race/director.ts`, galactic effects, HUD event queue |
| P1 — audio identity | Layer intake whine, turbine body, exhaust, strain, transmission/coupling and damage. Author positional rival pass-bys, canyon acoustics, surface impacts and music stems for race intensity. | Blind listening distinguishes throttle, boost, imminent overheat and a rival approaching; warnings survive the full mix; music ducks without audible pumping. | `audio/PodracerAudio.ts`, model, menuMusic |
| P1 — results/garage | Build an inspectable garage and readable part comparisons; add sector gains/losses, a rival comparison and two strong highlight moments to results. Add lightweight photo mode/export after replay quality is stable. | The player understands why a build helped, why a lap improved and what to try next. Replay events preserve participants and time. | UI, Workshop data, highlights, `RaceCameraDirector.ts` |
| P2 — online robustness | Keep friend rooms; add join diagnostics, measured latency/packet behavior, a relay strategy, reconnect testing and explicit host-disconnect behavior. Design authoritative ranked services only if public competition becomes a requirement. | Real two-network tests with induced latency/loss, rematches and disconnects pass. Local two-tab convergence alone is insufficient. | `network/RoomSession.ts`, snapshot protocol |
| P2 — content expansion | After the slice, build two additional complete circuits using proven kits, then expand remaining regions/modes. Add cosmetic rewards and mastery challenges rather than an endless power ladder. | Each new circuit changes racing decisions and has a distinct landmark, not only a palette. Existing modes retain their contracts. | course/region/event catalogs and asset library |

## Replayability structure

**Within a lap:** racing line → drift timing → boost heat → drafting/slingshot → safe or risky branch → recovery. Make each choice perceptible through vehicle feedback, route layout and audio.

**Within a session:** repeat the same circuit → compare sector deltas → adjust a Workshop build → beat a ghost or named rival → attempt a harder medal. Preserve instant retry and saveable seeds; do not force novelty every time the player wants practice.

**Across sessions:** championship standings, vehicle mastery, cosmetic unlocks, record book, daily event and friend challenges. Use mostly horizontal part tradeoffs so an interesting choice remains interesting after ten hours.

A ghost/record identity should include course seed or authored course ID, generator version, physics version, ruleset version, event/director seed, class and loadout hash. Separate stock and open-build records. Local bests can ship first; competitive global records require server-side verification and abuse controls.

The current highlight recorder stores sparse pose history for up to five minutes at 12 Hz and focuses on selected moments. It is a useful presentation pattern, not a ready-made verified time-trial ghost system or a complete event replay. Extend it deliberately with event timestamps/seed and recorded run metadata.

## Asset and rendering plan

The present “everything generated in code” approach is a project convention. A major visual overhaul should consciously evolve it into a hybrid: authored hero content, procedural terrain variation and scatter, shared deterministic collision proxies, and pooled effects. Do not discard the useful procedural infrastructure.

For the first circuit, scope approximately: one fully finished player craft and pilot; two rival visual variants; 8–12 modular rock/arch/cliff pieces; 6–10 industrial modules; one hero gantry; one signage kit; 3–4 terrain surface treatments; and 6–8 coherent effect families. These are initial scope estimates to validate in the slice, not purchased assets or an exhaustive production inventory.

Use original or appropriately licensed source assets. Deliver mesh source, textures, collision proxies, scale/pivot conventions, attachment names and ownership/license metadata. Convert hero content to glTF, use Meshopt where beneficial, and ship suitable textures through KTX2/Basis. Three.js explicitly supports these loader integrations: [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html).

The current cel depth/normal prepass and outline graph will need a deliberate material adapter for imported content. Verify normals, alpha-tested pieces, skinning, LOD changes and silhouette masks rather than assuming a loaded GLB automatically participates correctly. Separate the visual mesh from simulation collision.

For Inkstorm, prioritize sculpted forms, painted large-scale variation, selected outlines, coherent shadow shapes and well-framed light shafts. Bloom, chromatic aberration and full-screen blur are low priorities. Reserve stronger effects for brief boost/impact moments and retain existing reduced-motion controls.

Measure performance with complete passes, not only the beauty draw. Preserve current provisional gates: 150 steady-state calls, 260 dense-review calls, 600k triangles per complete frame and 13.5 ms soft CPU work. Any revised asset/quality budget must be justified by the actual slice on target hardware. Add texture-memory and transfer budgets once representative source assets exist. Adaptive DPR must not conceal an unacceptable loss of sharpness. [MDN's WebGL guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) supports batching, compressed textures and explicit resource lifetime management.

## Technical sequencing and invariants

Keep Three.js for the initial overhaul slice. No current evidence shows that an engine replacement is required to achieve the recommended style. If the approved target becomes extensive photoreal cinematic environments across many tracks and platforms, evaluate that production pipeline separately before scaling content.

`GameApp.ts` is approximately 3,468 lines, `RaceSimulation.ts` 2,181 and `RaceHud.ts` 1,513. Extract asset lifecycle, race presentation, garage/settings and review hooks incrementally while touching those areas. Avoid combining a broad architecture rewrite with art, physics and networking changes in the same milestone.

Preserve these invariants throughout:

- 120 Hz race authority remains separate from graphics, HUD, audio and replay.
- Host authority, class/loadout locking, normalized input and sequenced snapshots remain intact.
- Course changes replace terrain, branches, checkpoints, collision, minimap, hazards and network seed state transactionally.
- CPU terrain and rendered displacement remain mathematically aligned.
- Keep instancing, pools and deterministic collision; no per-frame mesh/material creation.
- Preserve A-left, D-right, F-mines, input-field isolation, remapping and accessibility controls.

## First playable milestone

**Deliverable:** one complete, repeatable 60–90 second target lap in the selected art style, one polished player craft, a readable race HUD, one final-quality hazard, one fully mixed engine voice, and best-time/ghost retry.

1. Capture a clean control run and approve target camera/handling on a fixed seed.
2. Build the art benchmark scene: craft, ground, cliff, landmark, sunlight/shadow and dust.
3. Connect seven track beats into a full lap; validate both branches and every recovery point.
4. Integrate final HUD, controls lesson, effects and audio; keep combat available in the existing broader game but define the slice's rules explicitly.
5. Add persistent records and one-action replay/retry.
6. Run full-lap human/controller tests, target-hardware profiling, rematch/disposal checks and two-network acceptance where online is in scope.

Only then scale to more tracks or a career. Schedule and staffing should be estimated from this first completed craft/track kit, because bespoke art and audio production are presently the largest unknowns. The visuals here are references for production, not assets that can be inserted as finished 3D worlds.

## Verification evidence and limits

| Check | Current result |
|---|---|
| TypeScript, unit suite and production build | Passed; 47 test files, 258 tests. |
| Live/local bundle identity | Main JS, CSS and optional networking JS have matching SHA-256 hashes. |
| Existing screenshot harness | Original failed the pointer marker timing check once; audit copy with an explicit DOM wait passed 17 Retina views. |
| Real keyboard checks | Throttle, steering, drift input, heat boost, fire, shield, mine, brake and pause confirmed. |
| Multiplayer harness | Passed with two isolated Chrome clients: join/start, selected vehicle, remote movement, heat/mines and no browser errors. Convergence sample approximately 0.208 m; this is a local test, not an internet latency guarantee. |
| Procedural-course harness | Passed rematch variation, same-seed reconstruction and shared room course signature; centerline RMS difference 1,881.26 m, minimap change 91.41%. These measure difference, not course quality. |
| Headless Chrome profile | Apple M4 / ANGLE Metal. Deterministic single-frame CPU work p95 4.3 ms; real-time RAF p95 16.7 ms over 362 samples. No browser errors in the profile. |
| Draw/resolution caveat | Real-time samples reported 152, 98 and 99 calls while DPR moved from 1.75 to 1.625; diagnostic race frame reported 193 calls at DPR 2. The current profile does not establish unlimited graphics headroom or a GPU frame-time result. |
| Mobile | Narrow desktop viewport inspected; no physical phone, touch-driving or mobile GPU acceptance. |
| Audio | Audio graph readiness and source inspected; critical subjective listening remains open. |
| Human experience | No broad usability, complete controller lap, long-session retention or balancing study performed. |
| Browser cleanup | Interactive browser and all completed harness browsers closed after their checks. |

Raw evidence is under `/Users/amir/Projects/PodRacing/output/playwright/` and `/Users/amir/Projects/PodRacing/output/art-direction/`. The first directory follows the existing ignored evidence convention. The durable review, selected current screenshots, generated previews and prompts are in this document's directory.
