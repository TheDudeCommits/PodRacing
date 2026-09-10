# PodRacing — Salt Flats at Dusk checkpoint 2 (2026-09-10)

The owner rejected checkpoint 1 as unaesthetic and its SFX as weird. Current revision rebuilds cloud lighting, continuous distant ranges, prominent eroded rock meshes, outer salt runoff, grounded 3D inspection, lighter HUD/exhaust and an eight-file sourced SFX bank. **The photographic target is incomplete.** [Current report, evidence and remaining work](docs/inkstorm-overhaul/SALT_DUSK_CHECKPOINT_2.md).

Worktree `/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`, remote `TheDudeCommits/PodRacing`. `/Users/amir/Codex-ThreeJS` is unrelated. Publish as Preview; obtain the requested owner checkpoint approval before Production promotion. Production remains V36 / a4bb70d104c997667d4e42d29c02831af2cbd788 until approval. No automation was created.

Frozen runtime: **index-DSU6k9pU.js**, 1,878,130 bytes, SHA256 **4e51f10f6b53b5dd13eb77b1240a9165d853f4d1eded5740f53da4dc19da6b2c**. All **983 tests /169 files**, TypeScript, build and diff checks pass. Exact final native eight-pod Battle: **59.919 FPS mean, p95 16.7 ms, p99 16.8 ms, maximum 66.6 ms**, M4/Chrome153/1440×900/adaptive DPR1–2. Slow frames included; do not transfer this measurement to another runtime/device. All9 audio recordings (8SFX+music) load, errors empty, browser/server closed.

Fresh blind critic: **6/10 aesthetics, 4/10 concept match**, progress Preview only. The main racing surface still reads as dunes; simplified mesas, skyline/world material mismatch and cinematic racing atmosphere remain open. The earlier giant-range pass was rejected and withdrawn. Keep diagnostic course-seek imagery distinct from native populated-race imagery and cadence receipts.

Only outer basin terrain changes; published main/shoulder/normal field hashes remain exact. A full-lane fill was withdrawn after regression failures; it is not in this build. The new ranges add58,392 triangles/3meshes. Refined arch/wind-blade originals remain preserved with CC0 provenance and clearance validation. Legacy painted shadow stamps are removed; real mesh/terrain/racer shadows remain. The 4K HDR increases GPU memory materially (~85MiB sky+mips); broad hardware profiling remains open.

Do not generate audio or alter `public/audio/podracing-selection-intro.webm` (SHA25639c4d411570a2591be5cbf7fc27d86a63c36d3befa5de8d57c0d2018e1c89260). V2 uses existing conventional catalogue effects and an unchanged Scott Buckley music excerpt; no listening approval is claimed. [Audio report](docs/inkstorm-overhaul/SALT_DUSK_AUDIO_V2.md). Private creator-page HTML caches are ignored; published sources have a separate inventory. Four of26 vehicle families remain registered; original broader eight-item backlog is not complete.

Preview publication is pending for this frozen source. The publication receipt and hosted verification will be added after deployment. Production is unchanged.

Close owned browsers and servers immediately after use. Never adopt port5211 or save the shared Blender GUI scene. All current agents are finished; no background job is intended to continue.

---

## Historical checkpoint 1 — rejected by owner

# PodRacing — Salt Flats at Dusk checkpoint 1 (2026-09-10)

The owner approved the Salt Flats at Dusk photographic concept, requested only sourced existing audio (no generated audio), preservation of the original podracing voice, and a more futuristic minimal HUD. This checkpoint implements the material/lighting foundation, recorded audio bank and dusk UI. [Current report and next priorities](docs/inkstorm-overhaul/SALT_DUSK_CHECKPOINT_1.md).

[READY Preview](https://now-this-is-podracing-dsj7cmxa7-amirs-projects-d9680079.vercel.app), deployment `dpl_AsuF4P6Bz4iRzpp1hpRBFWK4fx5z`, runtime commit `ce60ca14b4b9f748dc0c4dc8b4aeab08bf8a8151`. Hosted exact-bundle verification and seven native interaction checks pass; browser closed. [Publication and unchanged Production receipt](docs/inkstorm-overhaul/evidence/salt-dusk-checkpoint1/publication.json). Approval to promote is pending; no automation was created.

Worktree `/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`, remote `TheDudeCommits/PodRacing`. Baseline a4bb70d104c997667d4e42d29c02831af2cbd788. The unrelated `/Users/amir/Codex-ThreeJS` is not this game. Publish this checkpoint as **Preview** and obtain the requested owner checkpoint approval before promoting Production. Vercel’s Git production branch is `main`; our working branch is `codex/now-this-is-podracing`.

Frozen runtime: index-DHCXwEh-.js, 1,872,109 bytes, SHA256 21e5342d01a6da615856cfabccd6c7e23e41aa3f4bbc982d6e5564a001cbfb28. The frozen final source passes all 971 tests /166 files, TypeScript and build. Exact final native eight-pod Battle: mean 59.910 FPS, p95 16.8 ms, p99 16.8 ms, maximum race frame 33.4 ms, M4/Chrome153/1440×900/adaptive DPR1–2. Recovery prevents PB as intended. All27 audio files load; no browser errors; owned browser/server closed. Do not transfer this measurement to any changed runtime or other device.

Fresh blind visual critic: overall5.5/10, concept match3.5/10. **Early progress Preview only**. Existing hilly geometry/white banks, repetitive cliffs, sky composition and geometric exhaust remain visibly below the concept. Current diagnostic gallery uses staged scene positions; separate native Battle proves actual populated play. Audio provenance/decoding is verified; perceptual listening acceptance is still the owner’s review.

New ownership: `src/render/saltDusk/` shares photographic assets across world/inspector with generation-safe leases; source glTF metallic/roughness/normal maps remain authoritative. Cel post/outline installation is disabled. Road shading normals changed but physical heights did not. Recorded audio replaces active synthesis; zero vehicle loops in garage and zero master gain when hidden. Do not generate audio or change `public/audio/podracing-selection-intro.webm`. Credits are linked in Audio settings.

No simulation/handling changes or new vehicle families this checkpoint. Preserve the V36 warning against the withdrawn terrain-relative suspension experiment. Close owned browsers after use; never adopt port5211 or save the shared Blender scene.

---

## Prior Production: PodRacing — Round 36

The user resumed development after V32r1 and prioritized a radically simpler setup, visible rivals/weapons, clear runoff and satisfying map/pod physics. Crashes are acceptable for now; do not divert the next round into another crash art loop. The broader eight-item backlog remains authorized and incomplete. [Current report](docs/inkstorm-overhaul/ROUND36_REPORT.md) records accomplishments and all remaining items.

Current implementation is on `codex/now-this-is-podracing` in `/Users/amir/Projects/PodRacing`, based on `5925d437f97b57939ffbf02306979d238627491e`. `/Users/amir/Codex-ThreeJS` is unrelated. Remote: `TheDudeCommits/PodRacing`. Runtime source is frozen; final complete-race and resource checks pass. Publication and canonical-site verification are recorded on the V36 release page. Do not transfer earlier exact-build measurements to a changed bundle.

Implemented: four race tabs; one actual inspectable 3D pod; only difficulty/laps where adjustable; Race; optional More. New sessions open eight-pod weapon-enabled Battle, with clean Race / Time Trial / Cup separate. Shared route-light/collider positions have clear runoff. Heading-correct collision torque is retained. Experimental terrain-relative suspension and landings were withdrawn after full-race failures; released suspension/gravity/damage settings are preserved. Menu focus/remapped weapon captions are fixed. A cached-return inspection bug was reproduced and corrected while preserving GPU release at race start.

Validation: **961 tests / 164 files, TypeScript and build PASS**. Final native Time Trial (clean 63.742 s PB), Cup round one (clean two-lap 126.958 s PB, points saved, Continue → Foundry) and armed Battle (101.183 s finish, recovery correctly prevents PB) pass. Mean racing cadence is **59.594 / 59.158 / 59.417 FPS**, p95 16.8 ms each, on M4 / Chrome 153 / 1440×900 / requested DPR 2 with adaptive resolution. Three diagnostic resource cycles plateau at identical second-to-third stage counts, with two contexts during actual inspection and one during racing. All owned browsers and servers closed.

Fresh blind UI critic **APPROVE 8.9/10** covers supplied stills only; native four-viewport controls, real inspection and weapons pass. World visuals, physical devices and full benchmark acceptance remain open. Final bundle: `index-DH3wvA-l.js`, 1,882,556 bytes, SHA256 `e507c666fbe809c2275fa90a1d7434afce9a96be1e9d0a68ab0ee46616639a53`. Use the [V36 release record](https://github.com/TheDudeCommits/PodRacing/releases/tag/inkstorm-v36-20260909) for exact publication commit, deployment and QA archive. The failed relative-hover experiments are archived and unreleased.

Evidence: `output/simple-race-setup/`, `output/handling-round36/`, `output/round36-handling-review/`, `output/round36-handling-rereview/`, `output/gauntlet/round36-*/`, `output/playwright/round36-*/`, and `output/release/round36/`. Essential actual screenshots are in `docs/inkstorm-overhaul/evidence/round36/`. The release attachment will carry raw current measurements and preserved failures. No source changes have admitted additional vehicle families: four of26 remain registered.

Reference https://www.youtube.com/watch?v=1FwcQlBZFP0:21 timeline positions,34 contiguous paused positions and26 playback samples inspected. Whole-video every-frame and audio coverage is NOT complete. Study: `docs/inkstorm-overhaul/round36-reference-study/REPORT.md`; navigation caption export remains local-only under output. Close owned browsers/servers after use, never adopt port5211, and preserve the shared Blender scene without saving.

## Published V32r1 checkpoint (historical)

The user requested that development stop here and the current work be pushed and deployed. **V32r1 is the frozen playable checkpoint; the AAA visual overhaul remains incomplete.**

TypeScript/build and **938 tests / 158 files** pass. Native crash/control cases, the fresh Kodo Heat Lance takedown and 17 UI captures pass. Complete races measured **59.532 / 59.132 Hz** on M4, p95 **16.8 ms** each. Fresh visual critics remain below target: crash **5/10**, HUD style/readability **7/7.5**. Four of 26 preserved vehicle families are registered; 22 remain pending.

[Accomplishments and remaining work](docs/inkstorm-overhaul/RELEASE_REPORT_2026-09-09.md) · [Actual visuals](docs/inkstorm-overhaul/CURRENT_VISUALS.md) · [Release / deployed commit / QA archive](https://github.com/TheDudeCommits/PodRacing/releases/tag/inkstorm-v32r1-20260909) · [Game](https://now-this-is-podracing.vercel.app).

Exact build: `index-FTaKHRwm.js`, 1,864,215 bytes, SHA-256 `5b97c68cb6f232ac48260142f377f7b5eea8dbbf859e3dda3770ba9d36284ee8`. The release page records publication verification; the build is deployed from the frozen static output.

Work in `/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`, remote `TheDudeCommits/PodRacing`. The pre-overhaul baseline is `0f0e8ab209cc5156efaf92b545630bd243b14478`; use the release tag for this checkpoint's commit. `/Users/amir/Codex-ThreeJS` is unrelated. Preserve all source and historical evidence. Large source assets require `git lfs pull`; public runtime assets are regular Git.

The user has now requested further development. Ivory's scene165 finish and V2 torso/wear plan remain private/unexported. The high-speed V32r1 supplemental visual review stopped at its coarse/adjacent locator when shipping was requested; the primary crash review and native high-speed controls are complete. Close owned browsers after use, never adopt port5211 and never save the shared Blender file.

[Exact preceding handover](docs/inkstorm-overhaul/evidence/round-35/pre-release-v32r1-documentation/HANDOVER.md) · [Older complete history](docs/inkstorm-overhaul/evidence/round-35/pre-v29-documentation/HANDOVER.md).
