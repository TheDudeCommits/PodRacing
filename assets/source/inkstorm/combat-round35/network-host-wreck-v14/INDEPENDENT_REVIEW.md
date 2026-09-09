# Independent functional coverage review — V14 network combat

Read-only review of the executed harness, exact native receipt, four raw observation files, two local-victim screenshots, frozen V14 camera source and the matching shipped JavaScript. No browser, build, source edit or test execution. This is not visual acceptance.

## [P2] Logical cue state can pass while the cue is invisible or incorrectly worded

`executed-harness.mjs:47–51` records a cue when the root has `has-combat-feedback` and the section lacks `hidden`. `:74` accepts any local sample with `kind === wreck`. Neither step checks computed display/visibility/opacity, ancestor visibility, a nonempty in-viewport layout box, or the expected title. A CSS regression such as `display:none` or `opacity:0`, or an empty title with the correct kind, would pass. The screenshots at `:115` follow the 1950ms delay at `:111`, after the transient cue's 1250ms lifetime; the inspected screenshots show the later RECOVERING status, not the accepted cue.

The raw record does contain 37 local logical-cue samples for each wreck, spanning about 1200ms. The host title is **TAKEN DOWN** because the authoritative redline wreck credits `ai-olan`; the guest title is **WRECKED**. Other-local cue samples are correctly absent. These establish routing and lifecycle state, but not rendered cue visibility. Tighten the claim or capture computed visible geometry/opacity and the expected event-derived title while the cue is active, plus an actual in-window screenshot.

## [P2] The camera assertion checks the mode label, not the active physical camera path

`executed-harness.mjs:73` accepts `camera === chase` and no matte. Snapshot `camera` is `GameApp.cameraMode`. The frozen `CinematicCamera.update` has a separate protected-fit branch for `mode === chase && subject.wreckChase`; that branch preserves the chase label. A regression enabling that branch in network races could therefore pass this assertion without revealing its fitted pose/FOV. The trace records neither camera pose nor the framing/controller flags.

**No evidence shows this defect occurring in the exact V14 run.** Frozen `GameApp.ts:963–965,986–994` arms `combatChaseRecovery` only when a cinematic `cameraCut` begins. The controller admits that cinematic only for `role === solo` and cancels it for host/guest. The matching V14 bundle contains these same guards. Both contexts are fresh and their recorded roles remain host/guest throughout, so the source guard prevents the protected path here. The current evidence supports “no matte or mode switch observed, with the frozen source excluding protected network framing”; it does not make the mode-only assertion a complete future regression test. Add read-only actual-camera/framing diagnostics or a physical-pose invariant if the stronger guarantee is required.

## Clock and authority findings

All twelve frame/race-rate windows independently recompute to the receipt values. Host ratios range from 0.999909 to 1.000069; guest ratios range from 0.931099 to 1.055673. Each impact window has 23 samples across about 0.733s, with maximum observation gaps about 33.4ms. Guest steps are monotonic and arrive in 6/12-step batches with repeated snapshots up to 100ms; this is consistent with quantized authority delivery and does not invalidate the measured aggregate rates. No arithmetic false pass was found.

The host raw stream has matching `redline-explosion`, `wreck` and `recovery-start` events at frames 985 (`player`) and 1830 (`ai-vexa`); the guest sees the respective replicated wreck at frames 996 and 1836. Room roles and local cue routing agree with the source. These are actual two-context authority/feedback-state observations, not injected fixtures or two-device evidence.

The harness's `after` window is 0.9–1.8s after first wreck observation, and every victim sample in that window is still `wrecked`. It proves post-impact clock behavior, not completed recovery. Guest recovery back to `running` is neither asserted nor present after the final guest wreck in the saved observations. Do not describe this result as a complete recovery-cycle gate without additional samples/assertions.

Cleanup records both browser closure and owned server exit with no errors. The executed harness is byte-identical to the reviewed script, and the actual local bundle matches both client receipts. Existing PASS records and native evidence were not modified.

## Exact evidence hashes

| Evidence | SHA-256 |
| --- | --- |
| `scripts/inkstorm-network-combat.mjs` | `ffa0db2a3a3315e564ceb33c89287b0948a6ab66120d4dd12b1677d86b3e0bc8` |
| `assets/source/inkstorm/combat-round35/network-host-wreck-v14/executed-harness.mjs` | `ffa0db2a3a3315e564ceb33c89287b0948a6ab66120d4dd12b1677d86b3e0bc8` |
| `output/playwright/round35-network-combat-v14/receipt.json` | `6e432c742de6a2a727597ef5c5cd1aa57148d017575cf1644f5ca36a5911c452` |
| `dist/assets/index-ChC9xw8D.js` | `a0a190f2637399270af5b9d893c77bf02d07f262ad2e59d7e854d707f85ab39e` |
| `output/playwright/round35-network-combat-v14/host-wreck-host-observations.json` | `4470a402df1f272c0a5153a107ef2f1ffc24489c853d8d443dc9431021531d3c` |
| `output/playwright/round35-network-combat-v14/host-wreck-guest-observations.json` | `c6d1fdae327988472d70fa6c0e579bde60fe384a6390293a1a6fee2ae948b8e3` |
| `output/playwright/round35-network-combat-v14/guest-wreck-host-observations.json` | `318da7a302043836e48eb012999e81190b09d7c3c659c98644d11af588dd8aa7` |
| `output/playwright/round35-network-combat-v14/guest-wreck-guest-observations.json` | `4bbac9801f4600eca9e464ccd0a63f28cb649287f5efa32e7f63663dabfcc33c` |
