# Actual browser competitive flow

## Post-fix live acceptance — passed

Rechecked on **`index-Nxq1YP2g.js`**, 6 September 2026 at 21:48 local, with another fresh disposable context and another complete input-only solo lap. No prior PB was imported. The lap finished in **63.3667 seconds**, with a valid gold personal best, ten ordered sectors and a newly saved ghost. Retry uses the same course; slower real gamepad inputs make the recorded ghost move ahead of the player.

The rendered cyan ghost is now visibly present in `output/playwright/competitive-flow-ghost-fix/ghost-retry.png` at about five seconds. The nearer three-second frame shows partial overlap with the player; the later frame clearly separates it on the road ahead. This closes the zero-visible-mesh failure found below. It verifies the default podracer ghost visually; the other classes are covered by root's geometry tests, not this live lap.

The finish row and replay highlight both display **`1:03.366`**. Race Again and Back to Hangar are initially visible in the top action bar, with measured bounds `x=341, y=266.45, width=758, height=68` inside the 1440×900 viewport. PB and sectors appear before highlights. The actual result HTML is saved in the new `time-attack.json`; `time-attack-results.png` shows the live completed result. A full page reload again restores the PB and Ghost ON in both HUD and the corrected review snapshot.

The targeted recheck has zero browser page/console errors. Its browser and preview server closed immediately; port 50106 no longer listens. Root's multiplayer check could run concurrently, so no FPS conclusion is drawn. The earlier real Cup finish/Continue/completed-practice evidence below remains the Cup progression proof; those two-lap races were not needlessly repeated for the ghost and presentation fixes.

```sh
npx --yes tsx scripts/competitive-flow.ts --solo-only --output=output/playwright/competitive-flow-ghost-fix
```

New evidence: `output/playwright/competitive-flow-ghost-fix/receipt.json`, including full live snapshots, actual result HTML, saved profile, route/input trace, action bounds and exact highlight text. The complete competitive data/UI flow and the targeted visible ghost recheck now pass on their explicitly recorded builds.

## Original full-flow run and defects found

6 September 2026, completed 21:40 local. Local preview build `index-bzkJ3KyQ.js`, Chrome headless, 1440×900 at DPR 1. Browser and owned preview server closed immediately after the run; test port 49450 no longer listens.

**Original build result: competitive data/UI flow passed; visible ghost replay failed.** The ghost data was recorded, persisted, loaded and enabled, but its view hid every mesh. This defect is resolved and verified in the post-fix run above; the original receipt is preserved honestly as a partial pass.

## Actual results

| Flow | Result | Evidence |
|---|---|---|
| Full solo Time Attack | 63.3167 s, gold, valid new PB; ten ordered sector times | `time-attack.json`, `time-attack-results.png` |
| Saved ghost | 635 frames spanning the full 63.3167 s; identity matches stock hero Time Attack | Saved profile inside `time-attack.json` |
| Results → Retry | Same course; PB loaded; ghost available and enabled at live race time 5.2 s | Main receipt `ghostRetry`, `ghost-retry.png` |
| Page reload | Visible hangar PB `1:03.31`, Ghost ON; exact persisted time/frame count retained | Main receipt `persistedReloadUI` and durable profile checks |
| Full Canyon Cup | Two laps, twenty sectors, 126.6667 s, valid gold PB; third place and ten championship points | `cup-round-1.json`, `cup-round-1-results.png` |
| Results → Next Event | Foundry selected, Cup round 2 of 3, Continue championship action | `cup-continue-foundry.png`, main receipt `cupContinue` |
| Re-select completed Canyon | Single-round practice context and launch copy | `cup-practice-preparation.png` |
| Finish Canyon practice | Another legal two laps in 126.6667 s; twenty comparisons each delta zero; no new PB; saved championship rounds/points byte-for-byte unchanged | `cup-practice.json`, `cup-practice-results.png` |

The normal eight-second classification grace is active. Canyon results show actual completed times for four entrants and DNF for four others. The replayed practice round still points to Foundry, the next unplayed championship event. Practice may retain/improve its course record by design; it cannot add duplicate Cup points.

## Method and reproducibility

Run `npx --yes tsx scripts/competitive-flow.ts` against an existing production build. The harness starts an isolated preview server and a disposable browser context with empty competitive storage. A virtual standard gamepad feeds the **existing live `GamepadInput` adapter** through `navigator.getGamepads`. Analog steering and triggers update during real browser animation frames. The controller reconstructs the same deterministic canonical course and checks its signature before driving. It reads snapshots and produces inputs only.

There is no capture mode, `seekCourse`, `step`, review `setInput`, pose mutation, progress mutation, timer mutation, artificial finish, imported record or recovery exemption. All records in this context originate from full actual input-driven laps. No real user's records are touched. The driver uses no reset, weapon, drift or boost inputs. Its exact route knowledge means this is automated acceptance, not human driving feel. Frame rate was deliberately not profiled while another rendering task could run concurrently.

Artifacts are in `output/playwright/competitive-flow/`. Every finish JSON contains its full snapshot, saved profile, actual trajectory/input trace and results text. The main `receipt.json` records `competitiveDataFlow: PASS`, `outcome: PARTIAL_PASS`, `visibleGhostAcceptance: FAIL`, the build URL and zero browser page/console errors. The harness now also captures results HTML for future runs; it was added after this browser had already closed, so these original receipts do not contain an invented HTML capture.

Two archived harness-only failures (`attempt-1-receipt.json`, `attempt-2-receipt.json`) precede the final run: a zero-duration pause keypress could fall between input polls, and the review snapshot omitted the hangar preview identity despite the correct actual HUD/storage. The harness now holds P for 120 ms and verifies the real hangar UI and persisted data. Neither failure was a lost-record or race-completion defect.

## Findings and source-fix boundary

1. **Visible ghost replay fails.** `InkstormGhostView` creates a `PodracerView` and calls `setLodMode('silhouette')`. The silhouette proxy is only constructed by `createCelPrepassProxy`, which GameApp calls for normal racers, not the ghost. This mode hides its engines, cockpit, pilot and connectivity while no proxy replaces them. A standalone actual `InkstormGhostView.setPose(...)`, followed by checking mesh and ancestor visibility, reports **zero visible meshes**. Simply calling the existing opaque prepass bake with a transparent ghost palette is also unsafe because that baker deliberately excludes transparent/depth-write-disabled surfaces. Use a supported simplified view or a dedicated ghost silhouette, then recheck visible replay. Root was notified after screenshots raised the discrepancy.
2. **Highlight clock differs from race clock.** The tested Time Attack finish is `1:03.316`, but its finish-highlight tile reads `1:06.325`, approximately the countdown added. Root subsequently corrected the source clock/format contract and regression; this frozen browser build still contains the earlier display. Actual PB, race finish and sector times are correct.
3. **Cup primary actions start below the visible scroll area.** At 1440×900, five highlight tiles push the sectors, points and Next Event action down. It is reachable by normal scrolling, and the harness clicks it successfully. Root subsequently moved primary actions into a sticky bar and placed mastery information above highlights in source. The original screenshots remain evidence of the tested layout.
4. **Review snapshot preview mismatch.** While in the hangar after reload, `snapshot().game.mastery` reports null best time/no ghost because it omits the current build identity, while the real HUD correctly shows the saved PB and Ghost ON. Root corrected this diagnostic source path separately. The final durability assertion uses actual UI and saved data.

No application code was changed by this acceptance harness. Source fixes made after `index-bzkJ3KyQ.js` require their own current-build check; the input-only finishes above remain genuine evidence for the tested build.
