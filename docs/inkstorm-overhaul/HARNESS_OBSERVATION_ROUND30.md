# Round 30 harness observation review

Date: 2026-09-08. Independent static review of the finish-observation change in `scripts/competitive-flow.ts` and `scripts/mastery-pursuit-flow.ts`. No runtime source or harness code was edited by this reviewer. No tests, browser, GPU work, or Blender were run. This review makes no performance or visual-acceptance claim; the new live retry and subsequent blind UI review are separate evidence.

## Verdict

**The patch fixes the specific finish-boundary race demonstrated by the preserved failed run.** Both complete before/after comparisons contain one change hunk: capture the read-only snapshot and rendered `data-phase === 'finished'` together in one synchronous `page.evaluate`, then use that captured boolean. There is no `await` inside the callback. The former interval between two browser protocol calls can no longer combine a pre-finish snapshot with a post-finish HUD observation.

No remaining instance of that finish-boundary mechanism was found in the reviewed completion path. A separate sector/HUD observation mismatch remains in the pursuit evidence collection, described below. This static verdict does not replace execution of the updated harness.

## Preserved failure evidence

Reviewed `output/playwright/mastery-pursuit-round30-v3-retry/baseline.json` and `receipt.json`; `receipt.baseline` exactly matches the standalone baseline object.

| Observation | Preserved value |
| --- | --- |
| Baseline snapshot race time | `63.28333333333038` |
| Baseline snapshot simulation frame | `7955` |
| Baseline mastery result / latest sector | `null` / `9` |
| Later profile record time | `63.291666666663716` |
| Results text | `NEW PERSONAL BEST`, total `1:03.29`, finish row `1:03.291` |
| Later failure snapshot race/result time | `63.291666666663716` |
| Later failure snapshot simulation frame / latest sector | `7999` / `10` |
| Harness failure | `Error: baseline: no actual completed result` |
| Browser error list | Empty |

The authoritative race-time difference is one `1/120`-second simulation tick. The later simulation-frame count should not be confused with elapsed race time: completion freezes the race clock while frames continue. The old harness only entered this record-writing branch after its separate DOM phase read returned `finished`; the receipt does not independently store that boolean.

The failed receipt's script hash is `27a077e325a62e3c2f53381f861427ed2c8d4c4af3708a687b478d01ba7c8bbe`, exactly matching `assets/source/inkstorm/harness-round30/mastery-pursuit-flow.before-atomic-observation.ts`. This connects the preserved failure to the reviewed pre-patch implementation.

## Why the combined observation is sufficient here

`GameApp.stepSimulation` calls `race.step` and then synchronously calls `mastery.step` (`src/render/app/GameApp.ts:782-792`). `RaceMastery.step` constructs the result and persists eligible records before returning; completion then stops mastery processing (`src/game/mastery/RaceMastery.ts:112-157`). HUD derivation subsequently reads that model and calls `hud.update` (`src/render/app/GameApp.ts:1059-1106`). `RaceHud.update` writes the phase from that model (`src/ui/RaceHud.ts:658-659`). The diagnostic snapshot reads the current mastery model synchronously (`src/render/app/GameApp.ts:3589-3590`).

The HUD can lag the latest simulation state because it updates every four simulation frames. A synchronous observation can therefore see a completed result while the DOM still says `racing`; the harness safely waits for another poll. It cannot encounter the old cross-call situation in which simulation advances from a null result to completion between the snapshot and the captured phase read. The existing positive-result assertion remains in place, so an actual missing-result defect still fails.

Subsequent profile, result text, screenshot, and trace reads remain separate browser calls. In this path the completed result is stable, the driver only neutralizes input, and no retry/navigation action occurs until collection returns. Those later reads do not recreate the recorded pre-finish snapshot failure. They are not a claim that every field in the receipt was captured at one simulation frame.

## Invariants preserved by this patch

- The virtual standard gamepad installation and the complete `startDriver` body are unchanged: ordinary input path, steering/braking calculations, speed scaling, and input update rate remain intact.
- The one-second polling delay, `220_000`-millisecond timeout, simulation clocks, finish/result requirements, independent clock checks, pursuit delta tolerances, and record-preservation assertions are unchanged.
- The per-RAF cadence recorder, racing-phase classification, countdown handling, interval retention, coverage checks, and cadence thresholds are unchanged. Completion remains gated by the rendered finished phase, rather than stopping at the earlier player result in races with classification grace. This is preservation of measurement logic, not an observed cadence pass.
- No simulation stepping, capture mode, pose/progress writes, record fabrication, or acceptance-threshold relaxation was added.

## Remaining concrete observation limitation

**Pursuit gate data and its attached HUD string are still read at different times** (`scripts/mastery-pursuit-flow.ts:153-155`). The harness copies `model.latestSector` from the combined observation, then awaits a separate locator `innerText()` call for `[data-hud="split"]`. A gate transition between those operations can attach a later gate's text to the earlier sector. Conversely, the four-frame HUD update interval can leave the string showing an earlier gate even when the snapshot already contains the new sector (`src/ui/RaceHud.ts:1204-1208`).

The final checks independently validate each sampled numerical `paceDelta`, but the UI check only requires the text to start with `PB ` (`scripts/mastery-pursuit-flow.ts:212-216`). Consequently, those receipts establish sampled model pace arithmetic and the presence of PB text, but do not prove that the displayed numeric pace matched the same sampled gate. This does not invalidate the finish-observation fix and is not evidence that the actual HUD was wrong in the preserved run.

This limitation belongs only to the pursuit sampler; `competitive-flow.ts` has no corresponding mastery pace sampler. An independent comparison of every recorded HUD numeric value against its sampled model delta can establish correspondence for a particular completed retry receipt. Such a result would be additional execution evidence, not proof that the sampler can never cross a gate boundary. The current retry and that numeric comparison were not inspected by this reviewer.

If exact per-gate HUD correspondence becomes an acceptance requirement, collect the text/title with the state in the same observation, allow the normal HUD refresh, and validate rendered identity/value against the sampled sector. Merely moving the text read into the callback removes protocol interleaving but does not remove normal HUD lag. No follow-up implementation was made during this review.

## Reviewed patch identities

| File | SHA-256 |
| --- | --- |
| Competitive before | `667941482387f3634aeb0abbb2d7db0d355eb07ce267332d9d96ad842145ac37` |
| Competitive after | `93fb91bdcf0168727ddd7681e81421e49a459b0f43d9c81ef6c70d7b20afb3c6` |
| Pursuit before | `27a077e325a62e3c2f53381f861427ed2c8d4c4af3708a687b478d01ba7c8bbe` |
| Pursuit after | `8bbbe7cc527aa325d67d674294fae8364620fd5b45e941b8adb7310a69f7908f` |

Scope is these preserved/current harness comparisons, not unrelated working-tree changes. Checkout identity was verified as `/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`, remote `https://github.com/TheDudeCommits/PodRacing.git`.
