# Eroded launch cliffs — round 22 candidate

Status: source integrated; focused CPU validation passes. In-game capture, fresh blind visual review, and combined full-race performance validation are still required. This is a change to the physical mountains, not proof of matching the Inkstorm concept.

The round-21 launch/crest/descent review identified giant smooth tiered hills. Their source used the same three radial terraces on every ridge segment. The new composition replaces those terraces with a connected low talus base and irregular cliff caps. Ten broad, skewed ravines cut the crowns and pinch their exposed faces. Two larger scales of lateral displacement create unequal buttresses; the cap edge and summit heights vary independently. Each ravine is 78–124m across, while the cap transitions span about 52–104m before local warping. These are broad landforms intended to survive the current far terrain grid, not fine noise added to its vertices.

`LaunchBasinPlan.ts` is the only runtime source changed by this candidate. The ridge station table, three industrial bench locations and heights, shared bounds, final bench blending, domain feather, course authoring masks, course/physics versions, renderer, shadows, public assets and texture allocation are unchanged. `CourseGulfField.ts` was retained byte for byte. The final three yard cores still overwrite their underlying ridge contributions continuously, so their foundations do not inherit ravine cuts.

## Expected change in the driver's view

- The far west range should present multiple unequal crowns separated by broad notches, instead of one large tiered summit. The nearer exposed buttresses sit at different forward positions from the rear crowns, providing another layer of relief.
- The industrial east face should contain offset recesses and projecting cliffs around the three established flat yards. Those yards retain their construction heights; the mountains between and behind them change.
- The near west lip loses its repeated middle terrace and breaks into a broad cliff with a cut farther along the rim. The actual approach, crest and descending race surface remain exactly the same.

The terrain is still a heightfield. It cannot produce the concept's overhangs or separate thin spires, and this candidate does not add more distant canyon layers, improve refinery architecture, or solve the close rock material. The existing renderer can soften or facet these forms. Actual approach, crest and descent screenshots must decide whether the shape is an improvement; CPU topography and test results cannot accept the visual result.

## Measured physical contract

Evidence: `output/terrain/round22-erosion/physical-measurement.json`, `coarse-profiles.json`, and retained before/after source plus `erosion.patch`.

- **532,296** historical lane, shoulder, branch, .85m CPU and 1.15m MRT samples: maximum before/after difference **0m**; historical SHA remains `8b719ceac7e26597a4c33989e6a1a036d2dcfb703812313436838b150d221b57`.
- **1,909** off-lane central bowl samples: **0m** change. The previous physical-height SHA remains `f3f00afd1e3cb4d1c5d4726485edb16ee259b28555baee125d3c35820849c727`.
- A separate **14,850** sample sweep across the curved 240m-wide floor and its small normal probes measures a **0.006123m** maximum change at the longitudinal transition fringe. This is outside the protected racing corridor. The central bowl and tested yard interiors are exact; the entire off-road launch grid is intentionally not identical.
- All three sampled yard interiors have **0m** before/after change. Their physical ranges remain approximately 74.50–75.55m, 109.36–110.61m and 144.49–145.48m; the small non-flat residual is the existing base height plus interpolated displacement.
- Existing near/far/east summit probes remain **169.93m / 237.66m / 209.41m**. Launch displacement remains **−170m to +250m**. The finish field remains byte-identical, SHA `bd9da2b5038d659fc1622390f211ba5e42bacac2a90288b9aaf2656af03abffa`.
- Both textures remain **417² and 257² at 6m per cell**, totalling **959,752 bytes**. The new launch grid SHA is `d5299ffd2cf997c6bc366b6e9de56584fc62dee2798bae74cc3a29a1c4783c18`.
- An actual-height transect sampled at 48m with four offsets retains **3, 3, 4 and 3** saddles deeper than 25m. Their measured prominence is approximately **31–86m**. The old surface has **zero** qualifying saddles in all four phases. This is a coarse geometry test, not a GPU LOD/render comparison.
- The unchanged 1mm continuity sweep measures a maximum **0.01633m** height step, under its existing 0.02m limit. The first draft failed at 0.02654m; widening the cap transition resolved the failure without changing the test. Its failure log remains in the evidence directory.

## Validation

The focused terrain/profile/shadow/Vista run passes **45 tests in 10 files**. A second run passes the three launch ownership tests and reruns the three new erosion tests, bringing distinct focused coverage to **48 tests in 11 files**. Typecheck and `git diff --check` pass. The initial typecheck failure was a test-only Web Crypto typed-array mismatch; the helper now copies into an owned ArrayBuffer view. Both failure and retry logs are retained.

`erodedLaunchRidge.test.ts` checks meaningful physical requirements: three large saddles survive each 48m sampling phase, exposed buttress relief is staggered relative to the main ridge, and frozen historical central-floor/finish hashes remain exact. The existing lane SHA, yard-core/continuity, peak, launch/salt/fork, shadow geometry and placement tests retain their original thresholds.

No browser, Blender session, GPU profiling, full build, or screenshot capture was run for this bounded terrain task. Source ownership is released for combined integration and review.
