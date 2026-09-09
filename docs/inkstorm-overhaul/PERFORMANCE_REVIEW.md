# Independent performance review

Reviewed 2026-09-06. Read-only source/receipt audit; no browser, benchmark rerun, previous review, or visual comparison was used. Only this document was added.

**PASS — bounded M4 section benchmark. CONDITIONAL — the broader sustained 40–60 FPS requirement remains unverified by these receipts.** Both fixed quality and adaptive quality meet the frame-time target in all seven measured windows. A claim of default, continuous, fixed-DPR-2 gameplay would exceed the evidence.

## Measured facts

Sources: `output/gauntlet/fixed-retina-final/section-performance.json`, `output/gauntlet/adaptive-final/section-performance.json`, and `scripts/inkstorm-performance.mjs`.

Both runs use Headless Chrome 152, ANGLE Metal on Apple M4, a 1440×900 CSS viewport, and requested device DPR 2. Each stages seven section starts, resumes live simulation, holds W, excludes 1.5 seconds, and measures approximately six seconds. Each receipt contains 2,527 measured RAF intervals across approximately 42.115 seconds, with pooled cadence of 60.003 FPS. All section averages round to 60.00 FPS; every p99 rounds to 16.8 ms. Both record zero intervals above 25 ms and zero console/page errors. All endpoint snapshots report `mrt-sobel` and no post-processing failure.

| Section start | Fixed p95 ms | Adaptive p95 ms | Adaptive endpoint DPR | Adaptive endpoint buffer |
| --- | ---: | ---: | ---: | --- |
| Grid | 16.7 | 16.8 | 1.875 | 2700×1687 |
| Salt run | 16.7 | 16.7 | 1.625 | 2340×1462 |
| Canyon | 16.7 | 16.7 | 1.625 | 2340×1462 |
| Fork | 16.7 | 16.7 | 1.75 | 2520×1575 |
| Launch | 16.7 | 16.8 | 1.875 | 2700×1687 |
| Foundry | 16.8 | 16.7 | 2 | 2880×1800 |
| Finish | 16.7 | 16.7 | 2 | 2880×1800 |

The fixed receipt requests quality 0; the review API disables adaptation for a numeric quality override. Every fixed endpoint is 2880×1800 at DPR 2. This supports **approximately 60 FPS at fixed DPR 2 in these seven sampled live windows on this M4**. Endpoint renderer counts range from 101–199 draws and 249,144–725,060 triangles; these are endpoint values, not measured run peaks.

## Limits and default behavior

- These are separate starts, not a continuous lap or full race. Straight W input after staging does not cover sustained steering, boosts, combat, dense pack encounters, normal race transitions, or longer thermal behavior. Staging cancels the competitive run; it is live simulation afterward, but not an ordinary scored race.
- The benchmark measures RAF cadence, not GPU duration or independently verified display presentation. It excludes startup/staging warmup and cannot establish performance on other hardware, browsers, mobile devices, or deployed builds. Its success gate is only `p95 <= 25 ms` plus no errors; that gate alone could allow occasional slower frames. These particular receipts are stronger because their recorded `over25ms` counts are zero.
- `GameApp.ts:259` starts at quality 2: DPR 1.75 on this DPR-2 device and prepass scale 0.78. Quality 0 uses DPR 2 and prepass scale 1. All quality levels retain distance-based rival simplification; “fixed highest quality” does not mean every distant racer renders full detail.
- Adaptive snapshots show endpoint resolution only. The script preserves the previous live quality level across section staging, resets governor measurements at each start, and records neither quality transitions nor time spent at each resolution. Its endpoint DPR range is not proof that resolution stayed within that range throughout each window.
- `GameApp.ts:637` feeds elapsed JavaScript simulation/render submission work into the governor, not RAF intervals or GPU timing. Structural pressure also triggers degradation; current application budgets are 210 draws / 800,000 triangles, with recovery requiring pressure at or below 0.82. This can retain lower quality even at 60 FPS. Conversely, GPU-bound slowdown need not appear promptly in the CPU work metric. These are policy/coverage risks, not an observed failure in the supplied runs.
- Capture mode forces quality 0 and DPR 2 and freezes live advancement. The benchmark's `*-live.png` images are instead taken after measurement and W release while simulation continues; they are not exact snapshot-frame captures. Neither source of screenshots, nor FPS statistics, establishes concept-to-game visual fidelity. Compare the concept separately against actual default adaptive gameplay and label capture-mode images accurately.

## Material action

**No game-code fix is required to substantiate the narrow PASS above.** To close the sustained-performance requirement, record an uninterrupted normal full race over several minutes with representative inputs and pack/effect activity. Preserve frame intervals, effective buffer size and quality transitions, and a build identifier; assess prolonged slowdown and worst intervals as well as percentiles. Repeat fixed-quality testing if the final render path changes.

The script serves existing `dist` without building it and does not embed a build hash or source revision in the receipt. Current `dist/index.html` references `index-edr4kL2B.js`; that observation alone cannot bind either historical receipt to this build. Keep the benchmark runner's separate build provenance with the release evidence. Do not merge the fixed and adaptive runs into a single same-quality or same-build claim.

Receipt SHA-256 anchors:

- Fixed: `f6a387e69f6c2e8cfe4bcde9a8f4c6811644d5317ed3eddbc8ba686ca9bafb4e`
- Adaptive: `9fca1fd459e178d316ebf037fc175542a4e188c38872635b038a2af024b0892b`

## Follow-up: uninterrupted ordinary races

Reviewed the later `FULL_RACE_PERFORMANCE.md`, `output/playwright/full-race-performance/receipt.json`, both individual run JSON files, and `scripts/competitive-flow.ts --performance`. This separate audit preserves the staged findings above. No browser or game-code changes were used.

**PASS — uninterrupted ordinary Time Attack and Canyon Cup native RAF cadence on the recorded M4/Chrome configuration, with adaptive quality.** These receipts close the earlier missing full-race coverage for those two controlled runs. They do not establish fixed-resolution performance, physical display FPS, broader effect-heavy play, or performance of subsequent source changes. **A new art pass began after this tested build; its completed build requires a follow-up run.**

| Completed event | Racing intervals | Measured racing duration | Mean cadence | Largest racing interval | Intervals >25 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Stock Time Attack, one lap | 3,800 | 63.3308 s | 60.0024 Hz | 16.8 ms | 0 |
| Canyon Cup, two laps, eight racers | 8,082 | 134.6946 s | 60.0024 Hz | 16.8 ms | 0 |

I recomputed these figures from the raw samples. Every recorded interval equals the difference between consecutive RAF timestamps; each run has exactly one initial null interval, during countdown. RAF timestamps, simulation frames, and race time remain monotonic. Both runs first enter the recorded racing phase at race time zero. The Time Attack result is valid with ten ordered sectors and a 63.3167-second player finish. Cup has twenty ordered sectors, a valid 126.6667-second player finish, and continues through approximately eight seconds of classification grace before results. The individual run JSON files equal their corresponding combined-receipt records. No reported console/page error occurred.

The retained countdown samples include the 50.1 ms solo hitch and 33.4 ms Cup hitch. Thus “every observed frame stayed above 40 FPS” would be false across countdown plus racing. The racing-only claim is supported, and the report correctly discloses that recording attaches during countdown rather than before the launch click.

Resolution evidence also checks out: every sampled renderer width/height equals the actual canvas width/height. Time Attack spans DPR 1.25–2; Cup spans DPR 1–2. The 69/141 resolution records include 11/17 initial-or-changed resolution observations. Integrating transitions over the exact interval union classified as racing gives Time Attack 30.8320 seconds at DPR 2, Cup 64.1307 seconds at DPR 2, and Cup 27.8155 seconds at DPR 1. These support approximately 48.7%, 47.6%, and 20.7%, respectively. The report's Cup DPR-2 duration was corrected from approximately 64.11 to 64.13 seconds to include the leading racing interval consistently; its conclusion is unchanged. Other governor quality settings are not separately logged.

The controller uses the shipped live input adapter, supplying bounded steering/throttle/brake inputs from exact course geometry and read-only game state. It does not invoke capture, seek, stepping, quality overrides, or pose/progress mutation. This establishes ordinary simulation through complete races under a precise canonical-route driver; it does not establish typical human driving or a maximum rendering workload. Player boost, drift, weapons, shield, and reset sample counts are all zero. The 170 recorded Cup redline-surge events are unique and belong to AI racers. Unavailable base collision counts remain correctly marked unavailable. Measured driver overhead reproduces the reported averages of 0.485/0.404 ms, and its cost remains in the observed browser workload.

### Material harness issue for the next run

The original recorded harness did **not** enforce an FPS or frame-time acceptance threshold. Its `outcome: PASS` means the gameplay assertions passed and the recorder met its start-time assertion; a completed but slow race could still exit successfully. Moreover, an empty racing sample set returns `firstRaceTime: null`, and JavaScript evaluates `null <= 0.05` as true. The current raw data has ample complete samples and independently passes the performance target, so neither issue invalidates these measurements. Preserve the original receipt's actual PASS semantics.

After this finding, the root task added `scripts/lib/race-cadence.ts` and wired a separate per-run performance acceptance into the harness. Source inspection confirms finite/nonempty metric checks, start/finish and duration coverage checks with a 50 ms tolerance, mean cadence at least 40 Hz, and p95 at most 25 ms. Each raw run record is saved before a failed performance assertion exits. This addresses the automatic-gate issue for the next run; acceptance of the new art build remains pending that fresh run. The mean/p95 criteria still permit rare slower intervals, which should remain disclosed through the retained raw data and maximum/over-budget statistics.

RAF cadence remains a browser scheduling measurement, not a GPU timer or presentation fence. The controlled input and the reported adaptive quality reductions are material conditions of this PASS. A later visual comparison still needs actual default gameplay images; the completed-result screenshots do not prove visual fidelity during racing.

The receipt binds the fetched application script to `index-edr4kL2B.js`, SHA-256 `84dbadba7876dcf5ac45f81781427aded7966cd4f2d908e941594843b8d629ca`. The harness version inspected before the gate fix matched its recorded launch SHA-256 `42ac48d3d02d31355faebf9cddfb0c24c51963ad23ffc8193fad997acfa60bf8`. Combined receipt SHA-256 at this review: `a5cd97231e0fff454cd3c388efffc44e2cafeafffa302d992e3dfba901431f62`. These are historical tested-build anchors, not acceptance of the ongoing art pass.
