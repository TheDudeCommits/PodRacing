# Inkstorm release checkpoint — 9 September 2026

Development is frozen at **V32r1** at the user's request. This release publishes the current playable overhaul; it does **not** mark the AAA/art-direction target complete. The release page records the actual pushed commit and deployment verification.

## Implemented

1. **Inkstorm art direction and world.** Generated A/B/C direction studies and section/vehicle concepts; implemented B's warm painted desert, cool shadows, selective ink edges, authored geology, trackside pits, industrial structures, fork guidance, launch escarpment and finish reveal. Added terrain/road/shadow alignment, imported-material support and bounded asset/resource ownership.
2. **Vehicle pipeline and four playable appearance families.** Preserved 26 downloaded source families with metadata and attribution records. Integrated Teemto, Sebulba, Polwo and Blockrunner with hero/rival variants, cockpit/engine/nozzle work, material atlases and LODs. Added three project drivers; Blockrunner retains its original minifigure. There are eight logical variants and 14 public GLB paths, including Teemto's damage variants—not 14 different vehicles.
3. **Driving and onboarding.** Refined the existing steering, braking, drift, heat and launch systems; introduced Flight School and clearer launch/landing/drift feedback, authored-route choices and recovery checks. Preserved the deterministic 120 Hz simulation, shared terrain and host authority.
4. **Replayability.** Added stock Time Attack, daily seeded flights, a three-round Cup with standings and replay, Open Expedition, medals, personal bests, sector comparisons, versioned ghosts, saved courses and record/history retention. Incompatible old records are archived without reusing their ghost poses. The preexisting seven rulesets and four vehicle classes remain; they are not newly invented for this release.
5. **Reference-led HUD and menus.** Rebuilt garage, event map, Build interface and results presentation around cream/teal/rust graphics. Added readable equipped-part comparisons and grouped totals, live instrument rings, contextual warnings, menu motion and reduced-motion behavior. Latest changes unify equipment frames, reserve warning space around flight/drift feedback and fix a one-frame pause/resume HUD flash during a wreck.
6. **Combat spectacle and pickups.** Added bounded solo wreck/takedown slow motion, victim camera framing, authored Teemto breakup, flame/smoke/grit and per-piece ground dust. Added EMP and repair pickups. Refined the existing Heat Lance, shield and mines and their feedback. Outgoing takedowns preserve the attacker's driving camera; multiplayer simulation pacing stays authoritative.
7. **Audio and diagnostics.** Extended synthesized engine/event/mix feedback and built repeatable controls, UI, asset, course, combat, replay and frame-cadence checks. Repeated blind reviews and actual captures retain their failures as well as passes.

## Verified on this exact local build

- TypeScript, production build and **938 tests across 158 files** pass.
- Five native crash/control cases pass, including manual camera, reduced motion, pause/resume and a **220.02 m/s** explosion. Independent raw audit covers **1,509 samples** with zero driving-feedback leaks during actual wreck/recovery.
- Fresh ordinary-input Heat Lance kill of **Kodo** is credited correctly, shows TAKEDOWN, slows the action and retains the attacker's chase camera. Shield and mine use/hits are also recorded.
- **17 UI captures**, 60 part equip/restore actions, 30 total rows and seven motion traces pass. Current raw audits: 3,923 native checks, 450 grouped checks and 18 critic-protocol checks.
- Compact post-GO warnings pass. A separate GO-active grouped opportunity remains **UNAVAILABLE**: its retained image/clearance checks do not establish the complete stable grouped scenario.
- Complete Time Attack and Cup round 1 average **59.532 / 59.132 Hz**, p95 **16.8 ms** each, max **33.4 ms**. Apple M4 / Chrome 153 / ANGLE Metal, 1440×900, requested DPR2 with adaptive resolution. All racing RAF intervals are included; this is not a guarantee for other devices. The isolated crash is approximately 60 Hz.
- Owned browsers, servers and measurement process groups closed. The initial V32 pause/resume failure and its correction remain in the evidence.

Build: **index-FTaKHRwm.js**, **1,864,215 bytes**, SHA-256 **5b97c68cb6f232ac48260142f377f7b5eea8dbbf859e3dda3770ba9d36284ee8**. The tested build is deployed as a prebuilt static application so source/evidence archives are not served as game payload.

## Remaining work

1. **Finish visual quality.** Fresh crash critic remains **5/10**. Impacts need stronger dust/contact scale and less neatly arranged wreckage. Fresh HUD style/readability is **7/7.5**, Build **7/8**, map **7.5/8**, garage **7.5/7.5**; all miss the requested 8/10 threshold. Consolidate the speed/shift/resource silhouette, strengthen small-label contrast, simplify map arcs and improve Build/garage hierarchy. Unchanged menu images do not become implementation improvements when critic scores vary.
2. **Integrate the other 22 vehicle families.** Each still needs source-specific cleanup, materials, scale/pivots, driver/cockpit work where necessary, LOD/export, runtime registration and in-game validation. Not every downloaded model is a finished race-ready asset. Preserve noncommercial/NoDerivs restrictions; no restricted adaptation is admitted to runtime.
3. **Finish private asset trials.** Ivory has fitted controls, an original pilot, palette and material-finish copies in Blender with matched views, but no runtime export/admission. Its latest finish scores **5.5/10 overall and 4/10 for materials**. A measured 260-face torso selection and revised wear/visor plan are prepared but unexecuted. Ark and further Foundry refinements remain preparatory or visually unaccepted; rejected trials are preserved.
4. **Polish the complete world.** Improve continuous terrain/architecture composition, canyon/fork/launch transitions, trackside scale, material depth and the final art pass. The last broader world review was below target; it is not freshly accepted by this release's UI and crash tests.
5. **Human handling and progression testing.** Run fresh-player tutorials, complete physical-controller laps, long-session balance and retention tests. Calibrate medals, rivals, builds and weapon/pickup fairness through play. Additional fully authored circuits, richer career/unlocks and stronger results/replay presentation remain expansion work.
6. **Input, accessibility and devices.** HUD E/Q/F captions still do not follow custom remaps. Broader pressured layouts, physical touch-driving/mobile GPU acceptance and other hardware/browser coverage remain open. Narrow desktop captures are not physical-phone acceptance.
7. **Audio finishing.** Perform headphone/speaker listening, distinct engine/pass-by/impact design and final mix/music production. Synthesized audio functionality does not establish a finished perceptual mix.
8. **Online and resource acceptance.** Complete real two-network latency/loss/reconnect/disconnect/rematch tests and long-session resource investigations. Earlier local multiplayer checks are historical, not a fresh internet test. A prior resource-count anomaly was not reproduced under instrumentation; its cause is unresolved. Public competitive services and anti-cheat are not implemented.

## Delivery and evidence

The repository preserves implementation, tests, source builders, asset provenance, authored derivatives and historical project documents. Large source models/images use Git LFS; run `git lfs install` and `git lfs pull` after cloning. Runtime public assets remain ordinary Git files. Local historical `output/` experiments remain preserved; a curated current-QA ZIP with raw current measurements, critics, screenshots and three short videos is attached to the release. It is not the entire historical output directory.

[Release and publication record](https://github.com/TheDudeCommits/PodRacing/releases/tag/inkstorm-v32r1-20260909) · [Game](https://now-this-is-podracing.vercel.app) · [Original overhaul review](../art-direction-2026-09-06/OVERHAUL_REVIEW.md) · [Vehicle catalogue](VEHICLE_CATALOG.md) · [Current gallery](CURRENT_VISUALS.md) · [Exact performance summary](evidence/round-35/full-race-v32r1-summary.json).
