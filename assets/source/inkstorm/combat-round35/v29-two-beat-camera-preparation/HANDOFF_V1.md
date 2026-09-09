# V29 private camera trial — bounded arc, tighter size beat not established

Prepared against frozen V28 (`index-C6Q9wPWG.js`, SHA256 `77f0ed1228afb3909953ae940451e2b1b3cd76b552688ea7d1a154a68debd87d`). Nothing here was applied to live source, built, or rendered. The V28 fresh critic remains **5/10 FAIL 8**, with its evidence unchanged.

`v29-two-beat-camera-v1.patch` is 19,682 bytes, SHA256 `35237829af9c0c5e6beef5d4b381908fdf1a481aa74539bc632a9f3e3a628f63`. `candidate-v1-manifest.json` pins every preserved before file and candidate. Root owns admission.

The three production files add an optional presentation age to the existing framing object; a reused 26-point composition array with 16 actual torn-section corners, two actual rupture/contact witnesses, and eight left-engine context corners blended from the early centre during age 0.65–0.95 seconds; and one identity-locked, event-relative 14-degree arc over age 0.10–0.65 seconds. There are no GameApp changes because its existing adapter forwards this framing object unchanged. Full 40/32 source bounds, source geometry, engine trajectories, support sampling, FX, contact, physics, network state, normal camera/replay and assets are unchanged. The arc continues through protected detached chase and holds its terminal direction through intact recovery; ordinary chase still uses the existing exact recovery snap. Reduced motion and providers without a finite age retain a locked direction.

The test contract change is explicit: the left engine need not be inside the *early composition* bounds. Every original source corner still protects the lens; all actual full-source near/far tests and eye-ground guards remain. New tests cover absolute age, random-access seeks, absent/non-finite age, reduced motion, recovery/manual restoration, reused point storage, original reset and simulation immutability.

Validation: `focused-all-v2.log` **38 tests / 7 files PASS**, including two private same-source projection comparisons; `typecheck-v3.log` PASS; `apply-check-v1.log` PASS. Existing full-bounds tests cover all four admitted family fallbacks. `typecheck-v2.log` is retained: three private TypeScript overlay errors came from the unchanged fixture's old inferred return type; explicit compatible pose annotations resolved that, without casts or runtime changes. The initial four source-contract tests and four new behavior tests also passed separately. No tests, build or source edits ran against live files.

## Measured limitation

`projected-cadence-v2.json` records exact hero/rival GLTF POSITION projections through a 60 Hz camera, 120 Hz simulation and explicit 0.18x / 820 ms cut policy with render extrapolation. This models the policy cadence; it does not reproduce native PTS, prove pixels, or measure FPS. The earlier sequential-tick diagnostic is retained separately in `projected-v1.json` and `projection-sequential-v1.test.ts.preserved`.

| Hero phase | Event age | V28 torn-pair width | V29 torn-pair width |
| --- | ---: | ---: | ---: |
| Early cut, wall 0.10 s | 0.018 s | 49.0% | 48.7% |
| Held cut, wall 0.50 s | 0.090 s | 69.6% | 69.6% |
| Cut exit, wall 0.817 s | 0.147 s | 70.2% | 70.2% |
| Aftermath, wall 1.967 s | 1.294 s | 62.8% | 63.8% |

The same torn front/rear corners dominate the horizontal fit in both versions. The left engine contributes a vertical constraint that does not set distance. The all-source near-plane guard is substantially below the active horizontal constraint, so it is **not** preventing a closer shot. Minimum measured camera-ground over desktop, portrait and short landscape cadence: hero **3.543 m**, rival **3.435 m**; minimum all-source-box lens depth **7.814 / 7.780 m**. The new direction changes, but swapping 18 effective points for 26 does not create the promised close-to-wide size beat. The remaining foreground below the torn pair is roughly 37% during hold and 41% after settling.

Concept18 was viewed as target-only. Its close panel crops major casing and does not validate the proposed full-pair framing contract or geometry. Achieving a reliable larger early size versus a wider settled shot requires an explicit screen-margin/allowed-crop decision; it cannot be honestly inferred from the current point-count change. This v1 patch is reviewable and source-safe under the checks above, but **is not recommended as a demonstrated structural size improvement**. Native camera composition, scenery crossings, and perceptual acceptance remain untested. No FX or contact patch is included.
