# V21 principal strike — private source handoff

Prepared 2026-09-09 against the preserved V20 inputs. The frozen seven-file patch is `v21-principal-strike.patch`, SHA-256 **fe9107e8266d5ce1fda668d6e209a5382c59b5a9c689f42d52085a7317532aa6** (25,945 bytes). Parent reviewed it and is centrally integrating it with a separate UI candidate. This folder records private preparation; it does not establish a V21 build, native result or visual acceptance. V20’s unchanged fresh critic remains **4.5/10, FAIL at 8**.

The change gives the three existing engine masses distinct one-way flight, strike, decelerating scrape and rest paths. Rear contact occurs at 0.075 simulation seconds; rear travel is 3 m before contact plus a 2 m scrape over 0.22 seconds. Its height falls with an accelerating curve toward measured support. The engine transforms use the untouched simulation base frame and cancel the generic renderer parent’s continuing tumble. A fixed simulation base therefore stops the parts after their path ends; a moving authoritative base still transports them. This is a renderer animation, not a new collision or world-anchored physics model.

The existing contact witness supplies the origin. Direction now differentiates the actual intended horizontal world center, including the base linear velocity and angular rates, instead of assuming that a local slide vector equals world travel. The same two contact plates form a narrow-rooted, widening sand fan, alongside the existing ten contact sparks. There are no added particles, draw calls, pools, meshes, maps or source assets. The changed fan shader has a new cache key; actual resident program counts and perceptual readability still need native verification.

## Exact scope

- `TeemtoStrikeMotion.ts`: allocation-free analytic paths with exact birth, terminal rest and random-access sampling.
- `TeemtoAuthoredDamage.ts`: three engine world transforms, terrain support, one-way choreography and world contact direction. Existing pilot, intact/reset behavior, tethers and authored geometry remain preserved.
- `WreckVisualPose.ts`: one reusable, read-only presentation cache of original simulation pose and rates; no simulation mutation.
- `GalacticEffectsView.ts`: contact-only fan shape inside the existing material and plate pool.
- Three meaningful test files cover the path, actual installed hero/rival geometry, contact direction and existing FX contract.

No GameApp, camera, public package, GLB, texture, simulation or native harness changes are in this patch. The V19 recovery boundary and V20 stable tear-side camera remain unchanged. `candidate-inputs.json` pins every input and output. `before/` retains the original files; `candidate/` contains the portable desired files. Root applies the patch; private test imports live only under `test-runtime/`.

## Validation

`focused-final.log`: **118 tests in 13 files passed**, 46.54 seconds. Coverage includes actual installed hero/rival source geometry and loader lifecycle, analytic path, random access/reset, world contact direction, fixed-base arrest, FX/contact ownership and all four camera suites/family fallbacks. `typecheck-final.log` is empty successful output. Patch apply-check passed. No browser, build, Blender or native capture was run for this private candidate.

| Actual geometry fixture | Hero | Rival |
| --- | ---: | ---: |
| Source positions checked against terrain, frames 910–1168 | 23,442,946 | 11,808,368 |
| Source projections checked | 18,708,648 | 9,465,688 |
| Maximum cached terrain queries | 244 | 203 |
| Minimum right rear source clearance | 0.089956 m | 0.100000 m |
| Rear center drop from birth to age 0.08 s | 2.505284 m | 2.476839 m |
| Terminal center drift, fixed base, age 0.4→1.6 s | 3.80e-12 m | 7.82e-12 m |
| World direction agreement with finite actual center derivative | dot 1 | dot 1 |

The existing no-burial tolerance of −1e-6 m, source geometry checks, terrain-query limits and four-aspect projection checks were retained. The direction fixture advances a nonzero linear and angular simulation base and checks that the original simulation JSON is unchanged. These are bounded actual-model fixtures, not proof for every possible course location or camera image.

Two preparation failures remain preserved. `typecheck-initial.log` exposed private test import remapping to the original rather than candidate module; the mapping was corrected. `focused-v2.log` retains two exact terminal-speed failures at approximately 1e-15 caused by floating-point endpoint arithmetic. The sampler received an explicit terminal-time branch; the exact-zero tests were retained. The original four geometry tests passed before the two new world-motion tests were added (`actual-geometry-initial.log`).

## Native review still required

Use the same stationary six-phase sequence and unchanged user reference/critic protocol, plus the separate high-speed scenario. Judge whether the principal strike now visibly arrests a machine and drives a readable directional scrape, rather than presenting an orderly suspended assembly. Confirm terrain contact, flare/tear visibility, caption framing, clean recovery cut, exact intact return and ordinary driving. Check the shader fan at game scale and unchanged owned-resource counts. Moving simulation-base transport and the limited two-plate fan are explicit remaining presentation risks; this handoff makes no art or frame-rate improvement claim.

V20 baseline evidence remains in `output/playwright/round35-combat-v20/temporal-review/REVIEW.md` and `blind-critic/RAW_AUDIT.json`. No baseline evidence was replaced. The private preparation inventory records the patch, input pins, candidate files, checks and retained failures.
