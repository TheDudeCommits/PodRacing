> Historical experiment review. The relative-hover implementation evaluated here was subsequently withdrawn after full-race regressions. These isolated results do not describe shipping suspension. See [the retained changes and failure analysis](HANDLING_ROUND36.md).

# Round36 independent handling review

**One actionable P2: a shallow terrain edge can be mistaken for a moving inclined support plane and launch the craft.** No additional P1/P2 was established in collision coordinates or marker placement. This is code/physics review, not visual approval or proof of native driving feel.

## P2 — Reject discontinuous support before matching landing velocity

At `src/game/simulation/podracer.ts:226`, a maximum plane-fit residual of 1 m admits a 3 m step when five probes are above the edge and only cockpit-rear remains below it. With the stock probe layout, the fitted forward slope is approximately 0.373 and residual approximately 0.889 m. The ground on both sides is flat, but this fit supplies approximately 44.78 m/s of “surface vertical speed” at a 120 m/s approach. `podracer.ts:713–720` then treats that value as landing closure and as the support velocity to match during penetration correction.

The isolated reproducer uses unchanged defaults, `heightAt = (_, z) => z >= 0 ? 3 : 0`, initial position `(0, 3.3, -1)`, speed 120 m/s, yaw 0, vertical velocity −4 m/s, airborne time 0.2 s, and throttle 0.65. It steps each implementation normally at 120 Hz. Only this initial diagnostic fixture is assigned; later poses come from simulation.

| Measured result | HEAD physics | Reviewed unstaged physics |
| --- | ---: | ---: |
| Upward velocity after first contact | 0.185694 m/s | 47.423472 m/s |
| Reported landing closing speed | 4 m/s | 48.780858 m/s |
| Immediate hull damage | 0 | 0.0973864 |
| Height after 60 ticks (0.5 s) | 5.165323 m | 24.150556 m |

This creates precisely the kind of implausible launch/damage that the handling work is intended to remove. The discontinuity guard is not sufficient merely because large cliffs are rejected. A separate ordinary drive-on-step fixture did **not** show a large regression; the failure depends on landing while the rear probe still straddles the edge. Flat terrain and a 24 m step control remained identical to HEAD in that compact comparison.

**Recommended correction:** admit slope-relative bounce/damage only for a coherent actual supporting patch; reject mixed discontinuous height levels before computing its velocity. Keep true smooth incline compensation and preserve hard-deck clearance. Do not solve this by weakening the new incline tests or capping all landing feedback. Add this straddled-edge landing case alongside a continuous ramp with comparable grade. If a local gradient or extra samples are required, make the query cost explicit. This review does not prescribe a new general suspension model.

Evidence: `output/round36-handling-review/probe.mjs`, `probe.json`, and `probe.log`. The runner loads the current source and the exact HEAD source through an in-process Vite loader, with no listener/browser; its server is closed in `finally`. The baseline copy changes import paths only. This proves the algorithmic regression for the supported height-sampler contract; it does **not** establish its frequency on the current native course.

## Other reviewed contracts

- **Collision coordinates:** the new inverse-yaw conversion matches `worldProbePosition` and `RaceSimulation.localCollisionPoint`. `r_z F_x − r_x F_z` has the expected yaw sign in this basis. Linear impulse cap and damage scaling remain unchanged. The heading-invariance and shallow-glance tests passed. Full pitch/roll rigid-body collision dynamics are outside this change.
- **Markers:** the authoritative marker array is passed by both current GameApp course setup calls. The shared generator excludes opposite bends/non-elevated branches and low bridge footprints; the constructor additionally rejects obstacle overlap. The radius is 0.62 m. The body is a 4.8 m cone centered 2.2 m above ground (bottom −0.2 m), and the 1.4 m light centered at +4.2 m ends at +4.9 m, matching the new vertical collider extent. Existing tests independently project actual marker coordinates and check render instance positions across five seeds.
- **Cost:** the new all-segment marker clearance search runs during course construction, not each fixed tick or render frame. For 1,024 main samples the stride is 11, so at most 188 candidates enter filtering. The existing per-racer marker scan is retained. Slope compensation reuses the six sampled heights, adding arithmetic passes but no height queries. No frame-rate or startup-latency acceptance is claimed.
- **Limit:** the slope model remains a fitted local approximation. This review did not expand into arbitrary custom probe layouts, native steering feel, network play, or a broad terrain sweep.

## Independent checks and integration failures

Command: `node node_modules/vitest/vitest.mjs run tests/simulation/hoverAndGlance.test.ts tests/race/courseMarkers.test.ts tests/race/bridgeSurface.test.ts --maxWorkers=1`.

**31 tests passed in 3 files, 7.58 s**; log preserved at `output/round36-handling-review/targeted-tests.log`. These passing tests do not cover the P2 reproduction above.

The completed `output/simple-race-setup/integrated-verify.log` records eight failures. The TeemtoSupportSettle entry is a timeout, not a failed measured-clearance assertion. The two relevant remaining assertions pin current vehicle Y to historical V9 physics. Replacing WreckVisualPose's old position pins with exact comparisons between two identically stepped live simulations is appropriate if one receives renderer observations and the control does not. Preserve full-state equality, exact birth pose, all actual source-vertex terrain clearance, ground-correction ceiling, query limits and repeated-snapshot determinism. In GalacticEffectsContact, preserve the frozen historical rupture origin, exact surface-projection checks and simulation immutability; remove only the unrelated current-player-Y assertion. This review made no test edits and makes no claim about subsequent root reruns.

Reviewed file hashes, HEAD identity and evidence hashes are recorded in `output/round36-handling-review/review-evidence.json`. No production source, public geometry, or test files were changed by this review.
