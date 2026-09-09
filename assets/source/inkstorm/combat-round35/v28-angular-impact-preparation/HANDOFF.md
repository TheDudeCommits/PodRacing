# V28 private front angular impact candidate

Ready for root review and central application. No live source, tests, renderer, camera, FX, public assets, simulation or browser was changed by this preparation.

The front casing now reaches its first contact at age 0.13 s with 110° longitudinal roll and 20° nose-up pitch relative to the sampled grade. It completes the reserved 55° roof turn and pitch catch over ages 0.13–0.65 s; the previous small asymmetric roll response ends at 0.77 s. Left and rear motion are unchanged. Event age, exact birth and recovery remain authoritative.

The large catch rotates around an actual cached source support selected at the first-contact orientation. Its real center arc is retained, including its changed terminal translation. That changes the front displacement limit from 3.8 m to an explicit 4.4 m: measured hero 4.381657 m, rival 4.389205 m; 120 center samples remain monotonic within floating-point tolerance. Left/rear caps remain 3.2/5 m.

The new arc initially exposed a real terminal-grounding defect: old pre-arc slope samples left only 1.0137 m hero / 0.00968 m rival of the front casing within the ground band. Those failures are preserved. A single bounded front support-balance pass fades in over ages 0.65–0.77 s, then resamples the rotated cached supports. This late terrain adapter preserves the center, as the existing left adapter does; it is not described as point-pivot motion. Its longitudinal pitch adapts to the actual resting patch while the final 165° roof bank stays exact. The original >4.5 m front, >8 m left and >6 m rear terminal source-band requirements pass unchanged at actual trajectory frames 1018 and 1110. An intermediate version pivoted this late adapter at the minimum source point; its roughly 0.16 m backward center arc is retained as rejected evidence.

The fixed runtime side-view source projection uses every actual front POSITION vertex, a fixed camera and aligned centers. It is a source-data diagram, not a staged gameplay image or native pixel claim. Roll-only contact has a nearly flat longitudinal axis (−7.38° hero); the coupled catch gives +19.11° at contact, +6.84° at age 0.4, −5.40° at 0.65 and +0.31° after terrain alignment. Rival is within 0.11°. The full 3D orientation changes 57.26° by 0.65; the 3D long axis changes 18.58° before the late adapter and 14.38–14.44° at final rest. The axis returns slightly during the honest terrain alignment. Native review must decide whether the whole wreck now reads as weight and impact; these numbers do not establish an art score.

## Validation

- Focused 12/12: 34 critical ages including contact and 0.65/0.77 transition neighborhoods; full actual geometry, no runtime source reads, matrix/prepass/shadow agreement, exact birth/reset, simulation immutability, deterministic random access, full bounds, capped monotonic center travel.
- Compatibility 16/16: existing strike, authored damage full trajectory, ground footprint, ground edge and WreckVisualPose tests. Only the authored full-trajectory test's query ceiling/comment changes to admit one front pass; all geometry/contact/recovery assertions remain intact.
- Unchanged actual camera 4/4: desktop/portrait, age-zero fallback to metadata, complete source near-plane safety, eye-ground margin, fit and recovery handoff.
- Strict TypeScript PASS; all five live base hashes matched; git apply --check --whitespace=error PASS.
- Focused complete-source positions: 3,044,688 hero / 1,543,916 rival; minimum 0.09521 / 0.10000 m. Full actual trajectory additionally checks 23,442,946 / 11,808,368 positions and 18,708,648 / 9,465,688 camera projections. Lowest front source clearance in that trajectory is 0.061568 m hero / 0.170048 m rival, both positive.
- Fixed maximum authored terrain queries: 459 hero / 402 rival, previously 348 / 300. The extra bounded front pass uses 111 / 102 cached support points; there is no added runtime source scan or unbounded iteration. Root must measure actual runtime cadence after integration; no FPS claim here.

## Patch contents

- src/render/combat/TeemtoStrikeMotion.ts
- src/render/combat/TeemtoAuthoredDamage.ts
- tests/combat/TeemtoSupportSettle.test.ts
- tests/combat/TeemtoAuthoredDamage.test.ts (query ceiling/comment only)
- tests/combat/TeemtoFrontCatch.test.ts (new, imports admitted source and fixture paths)

Patch: v28-angular-impact.patch. Exact before/after hashes and log evidence are in freeze-receipt.json. V27 artifacts remain untouched.

Preserved failures: initial-v27-contracts.log (old front angle/cap), initial-projection-assumptions.log (terrain-grade change), first-trial-without-front-balance/compat.log (terminal band), late-support-pivot-balance/ (secondary real arc reversal), initial-balanced-projection-assumption.log (late slope correction changes net axis angle), initial-compat-query-budget.log (old query ceiling). None is relabeled as a pass.
