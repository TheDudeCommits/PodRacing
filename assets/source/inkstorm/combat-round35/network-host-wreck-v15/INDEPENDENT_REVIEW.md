# Independent functional coverage review — V15 network combat

**Both V14 P2 findings are closed for this exact V15 fixture. No material false acceptance was found in the two strengthened gates.** This is a CPU read-only review of the executed harness, exact native receipt, four raw streams, four early cue screenshots, final guest-driving screenshot, and the matching source/bundle. It does not confer visual, performance, or two-physical-device acceptance. Existing native PASS evidence is unchanged.

## Cue visibility and wording — closed for this fixture

`inkstorm-network-combat.mjs:47–52,74–77,113–118` now observes computed display, visibility and opacity, checks a positive fully in-viewport cue box, captures screenshots while the cue is active, and requires at least three visible local `wreck` samples with the event-derived title. The controller source at `CombatPresentationController.ts:171–175` confirms that `takedownBy` selects TAKEN DOWN, otherwise WRECKED. Both actual V15 events have no takedownBy, so WRECKED is correct.

Independent calculation finds **33 host-local / 34 guest-local visible cue samples**, spanning **1066.7ms / 1100ms**, with minimum opacity **0.93128 / 0.83832**. Their boxes are x=500, y=667.015625, width=280, height=64.984375 within the 1280×800 viewport. There are 38 logical cue samples per local victim, including fade samples that appropriately fail the opacity threshold. Other-local wreck cues are absent in both phases. Both local early screenshots visibly show WRECKED / RECOVERY INBOUND; both remote early screenshots lack a local wreck cue. This closes the old late-screenshot and logical-only gaps.

The automatic check reads the cue element itself; it does not generally prove ancestor opacity, clipping, occlusion, or rendered glyph contrast. Actual screenshots cover the specific V15 run. Do not describe the element-only predicate as a universal rendered-visibility oracle. The TAKEN DOWN branch is now encoded correctly in the gate but is not exercised by these two uncredited redline wrecks.

## Protected camera framing — closed for this fixture

`inkstorm-network-combat.mjs:50,74–75` checks four explicit fields, not only the `chase` label: cut, recoveryArmed, wreckChase and wreckRecovery. `GameApp.ts:3827–3831` exposes the actual controller and subject fields used by the renderer. The matching shipped V15 bundle contains the same direct field mapping. The protected fitting branches in `CinematicCamera.ts:298–309,447–455` depend on those actual cut/framing or subject flags.

All four fields are **false in every sample of all four saved streams**, not just the harness's accepted 0–1800ms windows. No matte is recorded; both clients retain chase during each impact window. `CombatPresentationController.ts:114,127,156–158` still restricts cinematic activation and time scaling to solo; `GameApp.ts:964–998` arms post-cut recovery only when a cut starts and clears subject flags before selecting the actual camera path. This closes the prior mismatch where chase could conceal protected fitting. The diagnostics and source guard establish path exclusion here; they do not grade camera composition or promise continuous coverage beyond the saved sampling interval.

## Clock, authority, and recovery limits

All **12 rate windows independently recompute exactly** to the receipt. Host frame/race ratios are approximately **1.000045–1.000172**; guest ratios are **0.931002–1.090959**. Each impact window has 23 samples across 0.7333s, with maximum gaps about 33.4ms. Guest delivery is monotonic and quantized in repeated snapshots and 6/12-step batches (one startup 18-step batch); the ±15% aggregate gate is appropriately a near-1× snapshot-clock check, not exact instantaneous network cadence or frame-rate evidence. Roles remain host and guest throughout. Authoritative wreck frames are **983** for player and **1854** for ai-vexa. No event/heat/state injection appears in the reviewed harness.

The new final stage at `inkstorm-network-combat.mjs:122–129` waits for guest `running`, applies ordinary W for one second, then asserts host-observed travel and replicated agreement. The receipt records **17.905661m travel**, **1.437367m replica error**, **5 steps final gap**, `running`, and four false camera fields. The final screenshot shows normal HUD with the intact guest racer driving again. This provides a native recovery-and-drive assertion absent in V14.

One evidence limit remains: phase observation JSON files are saved before this final drive, and the guest raw stream ends in `recovering`. The start/end drive snapshots or positions are not serialized. The distance and final gap therefore cannot be independently recomputed from retained raw traces; they are results from the hashed native harness and receipt. Do not label them independently raw-recomputed. Likewise the four camera flags are asserted over each 0–1800ms impact window; the recorded final guest flags are false, but the harness does not assert every flag continuously through the entire later recovery interval.

Cleanup records browser closure and owned server exit with no errors. The reviewed harness hash matches the hash embedded in the native receipt, and both client bundle hashes match the exact local V15 bundle.

## Evidence

`INDEPENDENT_AUDIT.json` preserves every recomputed window, cue count/geometry/opacity, phase summary, and exact evidence hashes. `independently-reviewed-sources/` preserves the inspected harness and source bytes without changing live files.

| Evidence | SHA-256 |
| --- | --- |
| `scripts/inkstorm-network-combat.mjs` | `d0f3fcfed39108d1ad8595391fe2004504d1dedc9a9646719985074361e010e2` |
| `output/playwright/round35-network-combat-v15/receipt.json` | `00dcfa4103a16998d07b4be0ed45d64bdf682d512e1fb514699be635eea1ee56` |
| `dist/assets/index-U_bStFYH.js` | `fb724c688802d97917a2632826be07f8d7567b6b3d70cf7ebd3810ca534bbf2d` |
