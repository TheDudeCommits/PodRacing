# PodRacing — Round 36

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
