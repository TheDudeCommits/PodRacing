# Independent cadence-policy and fixed-quality evidence review

## 7 September follow-up

The context restart finding below was corrected: `GameApp.start()` resets governor measurements before restarting RAF. A real browser loss/three-second suspension/restore check passed on `index-g--ReJCk.js`. At the restored event boundary both work and cadence EMA were zero and cadence sample count was zero; subsequent samples resumed normally. The first GPU resource uploads after restoration remained measured work. Evidence: `output/playwright/inkstorm-context-recovery/receipt.json`. This predates the new scenery atlas and later art; the combined build needs another context check. The new adaptive full-race result on `index-D2dLaNav.js` is preserved separately in `FULL_RACE_PERFORMANCE.md` and also predates the current art/profile changes.

The original review below remains historical, including its then-open finding and its exact fixed-quality build scope.

Reviewed 6 September 2026 by a separate read-only critic. Scope: the new opt-in cadence mode in `PerformanceGovernor`, its telemetry and focused tests, the app's timing/lifecycle wiring, the fixed-quality full-race report, and its raw records. No browser or performance workload was launched for this review; no runtime source was edited.

**Verdict: the fixed-quality evidence supports its narrowly stated result, and the core cadence policy is sound on inspection. One lifecycle integration defect needs correction before treating the new policy as finished. The new adaptive build still requires its own benchmark receipt.** This review does not judge art quality or establish GPU/display timing.

## Actionable finding

**P2 — Reset cadence measurements when restarting RAF after WebGL context restoration.** At review time, `GameApp.installContextRecovery()` cancels RAF on `webglcontextlost`, then calls `start()` after `webglcontextrestored`. Neither this path nor `start()` reset governor measurements. A context-loss pause therefore enters the cadence window as an active slow frame, even though it is an explicit rendering lifecycle interruption.

This can cause a real unnecessary quality reduction with the default settings: after stable 60 Hz, one interval saturated at 1,000 ms produces an EMA of 27.532 ms. With subsequent 16.667 ms intervals, the EMA remains above the 25 ms threshold for **24 samples** (the last is 25.082 ms), exactly satisfying the default degradation hold. This is separate from ordinary active stalls, which should continue to count. Resetting measurements at `start()` before the first new RAF anchor is sufficient; alternatively reset at the explicit context boundary. The parent accepted this finding and plans to apply the fix after the in-progress benchmark closes. This file records the pre-fix review state rather than claiming the correction has already shipped.

The existing `visibilitychange` listener correctly resets measurements, is registered on construction and removed on disposal. The governor's explicit reset tests establish that the first timestamp after a reset anchors the window without counting the preceding pause. A context restore/browser integration check remains separate from those unit tests.

## Policy inspection

- The app passes measured simulation/render CPU work as the first `sample()` argument and the actual RAF callback timestamp as the second. The two measurements are not conflated.
- Renderer counts remain available as diagnostics. In cadence mode they neither trigger degradation nor block recovery. Legacy mode still uses renderer pressure, as its existing test verifies.
- Sustained CPU overload remains a degradation signal. Sustained low-CPU callback intervals of 33 ms and 300 ms are tested as cadence overload. Long active intervals are bounded at one second for histogram accounting, rather than discarded as presumed background pauses.
- Recovery needs both work and cadence headroom. Tests cover 20 ms recovery despite high counts, cooldown, the 24 ms hysteresis band, invalid/non-increasing timestamps, explicit resets, and manual adaptation boundaries.
- The first cadence timestamp supplies an anchor; warmup requires actual intervals. Invalid timestamps do not manufacture recovery samples. The objects on the hot path remain stable.
- The 25 ms degradation threshold targets the lower end of the requested 40–60 Hz band. The existing CPU threshold remains more conservative than a universal 25 ms frame budget. This is an intentional policy choice, not evidence of GPU headroom.

No other concrete timing-argument or core state-machine defect was found in this bounded inspection. Focused test source was read; this critic did not independently execute the test suite while the parent reserved the machine for measurement.

## Independent raw-evidence checks

The report [FIXED_FULL_RACE_PERFORMANCE.md](FIXED_FULL_RACE_PERFORMANCE.md) points to `output/playwright/full-race-performance-fixed-final/` and served build `index-yCpWuPH-.js`, SHA-256 `9b0b979eb04053dab441c6e72eeb259a0b9e2672d64e6a4540a8cf289835b45e`. **That build predates the new cadence policy.** The rendering-only quality override is explicitly declared, is called once before Start, and disables adaptation without capture mode, stepping or pose/progress writes. The source shows the same page persists into Cup.

This critic independently recomputed the following from the individual raw frame arrays, rather than trusting the saved summaries:

| Racing phase | Intervals | Sum of intervals | Mean native RAF cadence | p95 | Maximum | Intervals >25 ms |
|---|---:|---:|---:|---:|---:|---:|
| Time Attack | 3,800 | 63,330.8 ms | 60.002400 Hz | 16.7 ms | 16.8 ms | 0 |
| Canyon Cup | 8,082 | 134,694.7 ms | 60.002361 Hz | 16.7 ms | 16.8 ms | 0 |

Every adjacent racing timestamp difference matches its recorded interval; no interior timestamp gaps were found. Both raw streams start at race time zero and cover the finish; Cup includes the classification grace. The receipt's duplicate performance records exactly match their individual JSON files. Renderer extrema and all recorded resolution observations are DPR 2; all canvas observations are 2880×1800. The recorder reads renderer extrema each callback and records any resolution change, as well as periodic observations. The fixed-quality gate is therefore supported by these runs.

The 17 asset path/hash pairs agree between the before and after manifests. Their serialized entries digest independently recomputes to `6b21f1ad6270ec7ad747aff489592dee6608df3d2ce020bc5a1930da8ece1798`. All 17 current `dist` asset hashes still match those entries at review time. This verifies content identity, not that every asset was simultaneously visible.

The report also retains the observed countdown hitches (50.0 ms solo and 33.4 ms Cup), controller overhead, lack of boost/drift/combat inputs, unavailable base-collision counts, headless Chrome/Apple M4 context, and browser/server cleanup. Its local conclusion is supported: in these two ordinary runs, fixed highest quality meets the measured native callback-cadence target, whereas the earlier same-build adaptive runs selected lower resolution without a demonstrated cadence need.

## Claim boundaries and remaining checks

The evidence is **not** a GPU timer query, compositor-completion measurement or physical presentation capture. It does not establish other hardware, mobile performance, thermal endurance, every course/class/route, deliberate combat/effect stress, or human handling quality. Current reports state these limits appropriately.

The fixed-quality experiment motivates the policy change but cannot validate the new adaptive policy itself. Preserve its original build/hash. Attach the new default-adaptive full-race receipt separately, and identify any later lifecycle-only correction by its own build. A complete ordinary-race pass and the unit reset test do not substitute for an actual WebGL loss/restore integration check.
