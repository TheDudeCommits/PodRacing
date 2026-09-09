# Shared salt-run visibility revision

The flagship salt road now follows a shallow, physically lowered corridor through the dune hump that previously blocked its continuation. Five deliberately staged off-road forms replace the crowded near-view rock cluster. This is a shared terrain/layout change; camera settings, capture poses and public assets were not edited.

## Surface and scope

`CourseGulfField.ts` applies the correction in the existing 417-square launch field. It begins at distance 570 m, reaches full strength at 650 m, and has a gently descending ceiling from Y=-21 m to -25 m over 650–780 m. The ceiling stays low through 900 m and rises smoothly to -14 m by 1100 m. It fades back to the prior landscape across 1210–1260 m. Terrain already below the ceiling stays lower. Full influence extends 95 m from the centerline, blending out by 210 m, so the road and its visible shoulder belong to one landscape.

The maximum measured centerline cut is **17.07 m**. The maximum actual eight-metre centerline grade in the affected interval is **0.26880**, below the 0.30 bound. This is a centerline grade claim, not a guarantee that all untouched off-road dune faces or every possible crossing has that slope.

The correction reaches zero by 1260 m, leaving a 20 m interpolation/normal guard before 1280 m. The established launch crest at 1313.76 m, its 94 m descent, basin and return remain unchanged. An independent before/after comparison found **zero difference at 343,125 samples** covering the full main lane plus 10 m outside the bounded salt interval, every branch, and ±0.85/±1.15 m normal probes. Both sample streams hash to `ee8104dfce34c17fa6073ea14771ef79aaba58f17a61f63726a8ad70ee844206`.

Horizontal course shape, lane widths, checkpoints and branch plans are unchanged. The two terrain textures remain 417² + 257² at 6 m spacing, **959,752 bytes** total. Combined displacement stays in [-170,0] m; zero borders, shared CPU/GPU sampling, normals, bounds and lifecycle are retained. Other seeds receive no salt correction. Actual competitive lane heights changed, so the parent has been told to use **course version 6** and isolate older records/ghosts; this subtask did not edit mastery identity.

## Filtered visibility and authored framing

The tests sample the actual baked bilinear field, not the earlier analytic hypothesis. From the recorded chase geometry, with the eye following the changed lane height, rays to points two metres above the road at 150/250/350/500/650 m ahead have minimum clearances of **2.04/2.39/1.88/1.59/1.06 m**. Previously the nearby crest blocked corresponding views by roughly 6–10 m. The **650 m margin remains tight**: the numeric check establishes a clear ray at the audited point, not a guarantee of uninterrupted visibility during bouncing, steering or a full-speed approach. Actual moving in-game review is still required.

The shared layout now stages five unequal forms at course distances 680, 810, 970, 1110 and 1260 m: two broad cliffs, two oblique wind-blade fins and one split-spire accent. Their full transformed envelopes clear dense main and branch routes by the existing safety margin. The bounded crowded cluster is removed before adding this sequence; it is not a second randomly scattered avenue. No accepted scan or current GLB was replaced. Existing `InkstormWorld` instancing, height sampling, shadow and collision consumers receive these shared placements without a World edit.

## Input-only driving evidence

Normal and reserved-salt-boost Time Attack runs use the stock event and each of the four classes. The diagnostic emits semantic controls; it never teleports, sets progress, edits clocks or bypasses checkpoint logic. A narrow `--salt-boost` option saves energy until the salt interval, requests boost through the launch while normal heat/energy/grounded gates still apply, and records the real boost inputs and ordered checkpoint events.

| Class | Normal lap | Reserved-boost lap | Actual salt boost input | Peak salt speed under reserved boost |
| --- | ---: | ---: | ---: | ---: |
| Podracer | 60.01 s | 59.38 s | 2.20 s | 211.35 m/s |
| Landspeeder | 66.78 s | 66.25 s | 2.33 s | 183.51 m/s |
| Speeder bike | 57.27 s | 56.52 s | 2.21 s | 218.76 m/s |
| Skim speeder | 62.34 s | 61.77 s | 2.26 s | 200.94 m/s |

All eight laps finished naturally with **zero collisions and zero resets**. Every lap emitted checkpoint order `[1,2,3,4,5,6,7,8,9,0]` exactly. Salt and launch resets/collisions were zero for these solo cases. The separate default-boost runs also finished all four classes cleanly, but did not boost in salt for every class because energy had been spent earlier; they are not substituted for the reserved-boost coverage.

Two stock Canyon Cup conditions are kept distinct:

- **Ordinary race/results flow:** the player finished at 110.91 s. The normal eight-second post-player grace window classified the field with **two natural finishers**, and no resets. This verifies the actual normal finish flow, not eight natural completions.
- **Stock observer input:** using the same event and eight-second grace setting, the driver brakes near the last checkpoint until rivals finish, then crosses normally. All eight racers completed two laps naturally, each with the full 20-checkpoint sequence and **zero resets**. This extends observation using player input only; it does not force rivals to finish. Racer contacts remain: the player had 12 across the complete Cup, including 3 in salt, and several rivals contacted one another in launch. There were no launch resets. Recorded scenery hotspots were the existing hairpin roadside shard and one start-line shard, outside the salt correction.

An earlier exploratory observer receipt requested a longer grace setting and is retained as `salt-run-cup.json`; it is **not** the canonical-settings acceptance receipt. The exact stock observer evidence is `salt-run-cup-stock-observer.json`.

## Verification and evidence

**63 tests passed across ten focused files**, including the real filtered salt sightlines, grade limit, exact after-1280 and branch normal protection, shared field bounds/lifecycle, unchanged launch checks, dense placement clearance, course and bridge contracts, and race simulation. Typecheck and targeted diff checks passed. A separate receipt assertion verified all eight solo runs plus eight stock observer racers for natural finishes, exact checkpoint order and no resets; it allows and reports Cup contacts.

- [Physical/source receipt](../../output/terrain/salt-run-implementation.json)
- [Actual baked-field sightlines](../../output/terrain/salt-run-baked-audit.json)
- [Original obstruction audit](../../output/terrain/salt-run-readonly-audit.json)
- [Ordered driving acceptance](../../output/drive-balance/salt-run-acceptance.json)
- [Normal runs](../../output/drive-balance/salt-run-normal-ordered.json), [reserved boost](../../output/drive-balance/salt-run-reserved-boost.json)
- [Ordinary stock Cup](../../output/drive-balance/salt-run-cup-canonical.json), [stock observer Cup](../../output/drive-balance/salt-run-cup-stock-observer.json)

No browser, full build or Blender session was run for this subtask. No in-game visual fix or concept parity is claimed from the numeric evidence. Remaining acceptance is the parent's combined current-build salt/launch capture, moving approach, blind composition review and live frame-cadence run. The earlier [proposal](SALT_RUN_PROPOSAL.md) is historical; this document records the implemented values and actual limitations.
