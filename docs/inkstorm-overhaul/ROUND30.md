# Round 30 — completed technical checkpoint; world art remains rejected

Completed build **index-DFdPXgCs.js**, SHA256 **4a5cfa6b986bb1813628c15b1e8783e5c07cd98fc919c048d131a0515e7960f3**, **1,595,979 bytes**. It passes **593 tests / 106 files**, TypeScript, production build and whitespace checks. The final freeze pins 136 source files, 32 public-art files, 39 dist files, six race harness files and four configuration files. All four before/after race manifests match this freeze. No commit, push or deployment occurred.

**All four Teemto/Sebulba Time Attack/Canyon Cup runs and both actual Continue flows pass.** Mean racing-phase cadence is 59.668–59.750 Hz, p95 16.7–16.8 ms, with normal adaptive DPR 1–2 for Time Attack and 1.75–2 for Cup. All 24,378 raw rows remain, including 119 racing intervals above 25 ms and five slow countdown intervals. Cup sampling includes the ordinary post-player-finish classification wait. [Exact timing and scope](FULL_RACE_PERFORMANCE_ROUND30.md).

The final pursuit UI receives a bounded image-only **PASS**. The independent world critic still rejects **0/7 section targets accepted, mean 3.9/10**. That critic saw the prefinal-UI `round-30` set; only two UI files changed afterward, with unchanged public art/world geometry. The final build's 21 PNGs are byte-copied to the [current gallery](CURRENT_VISUALS.md). Round 31 launch/course 9 and fork-guidance work is now in active experimental integration and remains unaccepted. Round 30 is the last fully verified checkpoint.

## Retained changes

- **Workshop light:** a paired UV GLB and 2048² direct-light atlas from Blender Cycles 128 samples. Original POSITION/NORMAL/COLOR corners are retained;296 UV seam vertices added, no additional triangles. The 600 W comparison was a blind tie. Current4× linear intensity and darker enclosed fill receive a modest three-view preference, with reduced upper-vault definition still noted. Texture delivery 608,704 bytes, uncompressed mipmapped allocation 21.33 MiB. District is unbaked. Original seven concepts remain authoritative; supplementary workshop target08 is concept art.
- **Route markers:** smaller near posts grow together from their common ground anchor over 90–270 m. Original far cues remain 4.6×14 CSSpx. The uniformly small version was rejected for weakening advance guidance. Fresh hybrid review prefers six near compositions but still favors the old lower-fork advance cue; navigation acceptance remains open.
- **Foundry:** V3 connects all 18 banks/54 mouths with 75 pipe runs and 5 crossings. One merged mesh,46,788 triangles; original gantry retained and every V2 triangle's position/normal/color exact. CPU attachment and adjacent-route checks pass; the first failed new-span clearance audit is preserved. Fresh image critic retains V3 for continuing middle/exit depth, but strict parity fails due to shallow hero view, repetitive equipment and abrupt joins.
- **Fork:** closed stone causeway beneath unchanged raised road, plus a closed sloping buttress into 11measured source-island contacts. Original bridge triangles retained, +2,628 triangles/one material group, no new texture. CPU road/deck and buried-edge probes pass. Fresh critic prefers the grounded foundation; the lower branch still needs earlier visual guidance. Existing route/collision/gulf/height fields are unchanged.
- **Replay pursuit:** labels derive from actual accepted checkpoint spans. Live HUD states `PB TOTAL` for cumulative accepted-split pace. Results show named sector losses and the largest measured slower-sector target, with last/PB times and a same-setting retry objective. `BEST LAP (RUN)` separates current-run results from the stored personal best. Invalid runs, no PB, no meaningful loss and new personal bests create no stale retry target. PB/ghost identity and storage formats are unchanged; pursuit is session-only.

## Completed verification

The final two-race pursuit flow used actual virtual-gamepad input with no pose/time/record writes: **63.341667 s** baseline and **68.783333 s** slower valid run. The largest measured slower-sector target is **S4 Sweeper**,8.20 s versus7.041667 s PB (+1.158333 s). Stored PB/ghost remain byte-exact through the slower run and reload. Both 1440×900 and 1280×720 layouts expose result actions and target cards; the hangar capture waits for actual preview readiness. The final flow is `output/playwright/mastery-pursuit-round30-v3-atomic/`, build 4a5cfa6b…, port 53776 closed. All nine saved live HUD/accepted-pace pairs match displayed millisecond rounding; the final gate goes directly to results.

Final UI v3 adds explicit **TOTAL / PB / GAP**, improves signed pace contrast, and strengthens the actionable named retry target. [Fresh final UI review](BLIND_MASTERY_FINAL_ROUND30.md) passes the bounded screenshot criteria; small comparison type, absent small-viewport keyboard footer and unexplained baseline sector dashes remain nonblocking. This is not human interaction, contrast-ratio or world-art acceptance.

The initial v3 flow preserved two real valid finishes but its display oracle rejected CSS-uppercase `S` because its regex expected lowercase `s`. Only that parser's unit case was corrected. The next attempt exposed separate snapshot/DOM calls straddling one 1/120 s finish tick: the saved 63.283333 s snapshot lacked a result while the later DOM/profile showed 63.291667 s. Both native harnesses now observe snapshot and DOM finished state atomically. Driver code, clocks, polling/timeout, raw frame collection, independent numerical tolerances and cadence gates are unchanged. Both failed directories and harness originals remain. [Independent observation review](HARNESS_OBSERVATION_ROUND30.md) records the remaining general HUD/sector cross-call sampling limit; the final numeric audit establishes correspondence for this completed receipt only.

Independent source review also found and fixed a new-overall-PB case where a slower sector could retain an obsolete previous-PB pursuit. A faster-total/slower-sector regression verifies clearing and comparison against the new PB. Lightmap tests cover UV cloning/merging, missing UV/texture and disposal while loading. [Integration review](ROUND30_INTEGRATION_REVIEW.md).

Final diagnostics on the exact build:

- Seven sections, twelve supplemental views, garage and short live drive: **21 PNGs**, errors[].
- **14-stage appearance lifecycle PASS**: both imports' selection/persistence, real drive, delayed-load cancellation, preview readiness and actual HTTP fallback/Retry; context restoration is exercised on Teemto. Two expected 503 console errors are retained; this is not an error-free failure-injection run.
- **WebGL context/framebuffer recovery PASS**: three-second suspension, atlas/governor recovery and bounded injected player-framebuffer fallback, with page/console errors[].
- **Three-cycle resource check PASS**: 25 samples, repeated section/garage counts plateau; errors[]. Counters are not GPU bytes, JS heap or a universal leak proof.
- Four complete races and both Continue flows: **PASS**, all frozen artifacts match and browsers/owned ports close. The 412 sampled renderer/shadow records have null failures. [Full evidence](FULL_RACE_PERFORMANCE_ROUND30.md).

## Retained failures and source studies

Foundry V1 was rejected and rolled back because plain replacement posts hid richer construction; V2/V3 retain the original gantry. The first V3 adjacent-route clearance failure remains in source evidence; only the new crossings were corrected. All versions and image reviews remain. A combined V3 capture used supplemental `name` instead of `id`, causing extras to overwrite `undefined.png`; that malformed set is preserved and excluded from acceptance. The harness now rejects non-string IDs; the corrected21-frame set and final gallery have valid IDs and errors[].

Road-level pit V3 remains declined: its shared floor removes13.69 m mismatch but steepens frontage to 6.551 m/m; a wider blend intrudes0.473 m into a neighboring pit. Modular bay/access work remains source-only. Static pilots still fail race-camera visibility/art acceptance.

Round 31's launch study proposes a physical concave escarpment, deeper bowl and explicit course 9 archive migration. Its CPU evidence and source candidate are in `assets/source/inkstorm/launch-reveal-round31/`; it is **not included in round 30's 94 m descent, course 8 records, images or timing**. The active experimental round 31 integration requires its own actual A/B, landing/recovery, record compatibility, GPU and full-race checks.

Sketchfab's eighth official rate-limit response was recorded at 22:29:05 UTC after 96m14 s backoff: fourth request for the current Podracer UID, zero imported objects. All 96 pre-existing scene memberships and the original scene/selection were restored; the sole new empty intake brings the total to 97. Temporary configuration was cleared. Counts remain **2 source imports / 24 pending**, with zero raw archives. The manifest retains every model/source/license/driver/history record and the eighth 429 receipt. Browser fallback remains blocked by the last recorded locked-Mac state; this checkpoint did not reopen a browser.

## Review evidence

- [Pit direct light](BLIND_PIT_LIGHTMAP_ROUND30.md) and [contrast revision](BLIND_PIT_CONTRAST_ROUND30.md).
- [Uniform small markers](BLIND_ROUTE_MARKERS_ROUND30.md) and [retained hybrid](BLIND_ROUTE_HYBRID_ROUND30.md).
- [Rejected foundry V1](BLIND_FOUNDRY_NETWORK_ROUND30.md), [V2](BLIND_FOUNDRY_V2_ROUND30.md), [fork/foundry V3](BLIND_FORK_FOUNDRY_V3_ROUND30.md).
- [Initial UI criticism](BLIND_MASTERY_PURSUIT_ROUND30.md), [v2 criticism](BLIND_MASTERY_V2_ROUND30.md), [final bounded UI PASS](BLIND_MASTERY_FINAL_ROUND30.md).
- [Fresh world FAIL](BLIND_WORLD_ROUND30.md), [full-race report](FULL_RACE_PERFORMANCE_ROUND30.md), [preserved round 29 gallery](CURRENT_VISUALS_ROUND29.md).

These establish bounded implementation preferences and technical results. The original art-direction B and recommendations 1–8 request remains incomplete.
