# PodRacing — Inkstorm V32r1 release checkpoint

The user requested that development stop here and the current work be pushed and deployed. **V32r1 is the frozen playable checkpoint; the AAA visual overhaul remains incomplete.**

TypeScript/build and **938 tests / 158 files** pass. Native crash/control cases, the fresh Kodo Heat Lance takedown and 17 UI captures pass. Complete races measured **59.532 / 59.132 Hz** on M4, p95 **16.8 ms** each. Fresh visual critics remain below target: crash **5/10**, HUD style/readability **7/7.5**. Four of 26 preserved vehicle families are registered; 22 remain pending.

[Accomplishments and remaining work](docs/inkstorm-overhaul/RELEASE_REPORT_2026-09-09.md) · [Actual visuals](docs/inkstorm-overhaul/CURRENT_VISUALS.md) · [Release / deployed commit / QA archive](https://github.com/TheDudeCommits/PodRacing/releases/tag/inkstorm-v32r1-20260909) · [Game](https://now-this-is-podracing.vercel.app).

Exact build: `index-FTaKHRwm.js`, 1,864,215 bytes, SHA-256 `5b97c68cb6f232ac48260142f377f7b5eea8dbbf859e3dda3770ba9d36284ee8`. The release page records publication verification; the build is deployed from the frozen static output.

Work in `/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`, remote `TheDudeCommits/PodRacing`. The pre-overhaul baseline is `0f0e8ab209cc5156efaf92b545630bd243b14478`; use the release tag for this checkpoint's commit. `/Users/amir/Codex-ThreeJS` is unrelated. Preserve all source and historical evidence. Large source assets require `git lfs pull`; public runtime assets are regular Git.

Do not resume development without the user's next request. Ivory's scene165 finish and V2 torso/wear plan remain private/unexported. The high-speed V32r1 supplemental visual review stopped at its coarse/adjacent locator when shipping was requested; the primary crash review and native high-speed controls are complete. Close owned browsers after use, never adopt port5211 and never save the shared Blender file.

[Exact preceding handover](docs/inkstorm-overhaul/evidence/round-35/pre-release-v32r1-documentation/HANDOVER.md) · [Older complete history](docs/inkstorm-overhaul/evidence/round-35/pre-v29-documentation/HANDOVER.md).
