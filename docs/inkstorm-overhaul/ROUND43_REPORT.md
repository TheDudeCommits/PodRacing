# Round 43 — Reverts, a lance magazine, and a drift you can see (2026-09-18)

Owner request after round 42: revert photo finishes, make the lance unlimited with a five-shot magazine and a five-second reload, remove the thermal spike, remove wreck debris, and make drifting smoother and visible.

## 1. Photo finishes reverted

`PhotoFinishPresentation`, its banner, its styles and its test are gone, and the render loop no longer scales wall time for a finish. The results-screen photo-finish highlight ("BY A POD'S NOSE", `highlights.ts`) predates round 41 and is untouched. The rest of the last-lap tension stays: the final lap still lifts the race score and tightens the chase camera on the final straight. The `sudden-death` voice line was removed from the catalogue, the runtime folder, the hash ledger and the credits, leaving four sourced lines.

## 2. Heat Lance: unlimited ammunition, five-round magazine, five-second reload

- `weapon.charges` is now the magazine; `LANCE_MAGAZINE` is 5 and `LANCE_RELOAD_SECONDS` is 5. Emptying it sets `weapon.reload`, which counts down in the ordinary timer pass and refills the magazine with no pickup involved (`lance-reload` and `lance-reloaded` events).
- The trigger, the overcharge charge-up and the AI's fire and overcharge decisions are all gated on the reload, so nothing fires from an empty rack.
- Everything cell-related is gone: the four `lance-cells` pickups, the trickle regeneration, `LANCE_CELLS_PER_PICKUP`, `LANCE_CELL_CAPACITY` and the collect event. The overcharge still costs three rounds out of the magazine, which usually triggers the reload straight after.
- HUD: `Ready ×5`, `Reloading 3.7S` with the dial filling as the magazine returns, and the overcharge readout unchanged.

## 3. Thermal spike removed

The ordnance kind, its two racks, its projectile kind, its impact path, its HUD label, its cue and its audio are gone. `GalacticOrdnanceKind` is now just `tow-cable`, which keeps the F slot and its behaviour. The nitro cell and the overcharge lance are untouched.

## 4. Wreck debris removed

`world.debris`, the debris constants, the spawn inside `beginGalacticWreck`, the world contact pass, the `debris-hit` and `debris-spawned` events, the AI hazard entry, the render variant and the review-snapshot count are all gone. Wrecks no longer litter the course. The drop-in shadow that telegraphs a respawn stays, since that was a separate round-41 item.

## 5. Drift: smoother, and legible

**Physics.** The drift now runs on one eased authority, `drift.blend`, instead of a boolean:

- It ramps to 1 over `driftEntryBlendTime` (0.26 s) and back to 0 over `driftExitBlendTime` (0.36 s). Grip, target slip and the steering multiplier all follow the eased value, so entering and leaving a slide is a ramp instead of a one-tick switch.
- Hysteresis keeps a slide alive: starting one still needs a real steering input, but holding one only needs the stick off centre (`driftHoldSteer` 0.06) and 80% of the entry speed. Easing off mid-corner now steers the drift instead of dropping it.
- The direction is held until the blend reaches zero, so the slide unwinds instead of snapping straight.
- Straightening up while still holding the button now banks the drift boost, the same as releasing it. Committing to an exit line is rewarded.
- `DRIVE5_COMPATIBILITY_CONFIG` zeroes both blend times, so the archived V9 replays reproduce the old snap exactly.

**Read-out.** The eased authority drives the visuals too:

- The ground wake widens by up to 85% and shifts to the outside of the turn while sliding, so a drift paints a broad curved scar behind the pod.
- The sand fan is emitted four times as often for the local pod, scales with the slide, and past half charge the inside engine throws a second rooster tail.
- The HUD drift meter is visible whenever the pod is actually sliding, turns cyan, glows with the slide and adds a `SLIDE` tag.

## Validation

- `npm run verify`: TypeScript, tests and build (see the log referenced in the handover). New suites: `driftFeel` (entry ramp, exit unwind, mid-corner hold, legacy snap) and `driftWake`; `combatPacing` was rewritten around the magazine.
- Native evidence on the built bundle, real keyboard input through ordinary frames (`scripts/drift-native-frames.mjs`): [straight](evidence/handling-round43/drift-native/01-straight.jpg), [reloading after five taps](evidence/handling-round43/drift-native/02-lance-reloading.jpg), [drift entry](evidence/handling-round43/drift-native/03-drift-entry.jpg), [drift held](evidence/handling-round43/drift-native/04-drift-held.jpg), [exit](evidence/handling-round43/drift-native/05-drift-exit.jpg), [magazine back](evidence/handling-round43/drift-native/06-after-drift.jpg). The receipt beside them walks `Ready ×5` → `Reloading 3.7S` → `Ready ×5` with no pickup, and the slide going 0 → 0.54 → 1.0 → 0.
- Review-API stills of the same states are in `evidence/handling-round43/drift/`. Capture mode batches its frames, so the ground wake cannot build there; the native frames are the ones that show it.
