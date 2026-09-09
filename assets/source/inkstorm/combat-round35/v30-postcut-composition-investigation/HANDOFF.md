# V30 authored camera lens and placement — private handoff

Approved bounded camera candidate, not yet applied or visually accepted. V29’s unchanged standard critic remains **5/10, FAIL8**. The patch changes only `CinematicCamera.ts` and adds `AuthoredWreckLens.test.ts`; it leaves the V29 14° arc, .88→.74 horizontal beat, source geometry, authored rig, terrain, FX, UI, GameApp and simulation untouched.

The actual V29 hold, debris-return and settled PNGs were viewed individually. The settled machinery reads high in the image, with substantial empty sand below. Concept 18’s second panel is a composition target only. These CPU measurements are complete source-position projections, not native pixel segmentation or a claim that the proposed composition already renders well.

The causal split is clear. During protected post-cut chase, V29 damps the lens toward at least 62° while solving the bounds with a 60° lens. Holding 60° recovers about 4.1% relative size at stationary wreck speed; it does not undo the deliberate wider second beat. Independently, the current aim interval places the actual settled source center around 43% of screen height. A constrained upward aim translation moves the source lower by translating eye and aim together within each bounds solve, without requiring a new distance or extra terrain query. Existing springs and the terrain pass still govern the final angle; the source pose is unchanged.

The candidate retains 60° only for an established authored camera lease in chase, including protected intact recovery. Reduced motion excludes this new lease behavior. The exact existing ordinary chase snap restores its ordinary FOV when running resumes. Generic or unavailable-damage fallback never acquires this lens merely from `wreckChase`. Manual and replay policies are unchanged.

For active authored framing, a requested six screen-percentage-point lower placement phases with event age .13→.65. It is clamped to the **existing legal vertical aim interval** (composition NDC y −.58 to +.70). Tall or narrow geometry can receive less shift rather than weaken the bounds. The requested shift is expressed in lens-relative units; actual projected source movement varies slightly with depth. The additional shift stops on intact recovery, which retains the full assembly framing and lens protection until normal chase returns.

| Source / modeled wall time | V29 width / center Y | Lens only width / center Y | Final width / center Y |
|---|---:|---:|---:|
| Hero .400s held cut | 79.58% / 43.29% | 79.58% / 43.29% | 79.58% / 43.29% |
| Hero .817s cut exit | 82.60% / 43.39% | 82.60% / 43.39% | 82.60% / 43.41% |
| Hero 1.033s catch | 73.29% / 42.03% | 75.21% / 41.82% | 75.23% / 44.19% |
| Hero 1.300s | 63.35% / 43.02% | 65.67% / 42.76% | 65.68% / 49.25% |
| Hero 1.800s settled | 63.80% / 43.21% | 66.37% / 42.94% | 66.38% / 49.37% |
| Rival 1.800s settled | 63.88% / 42.98% | 66.46% / 42.69% | 66.46% / 49.23% |
| Hero 2.900s intact recovery | 61.20% / 48.15% | 63.69% / 48.07% | 63.68% / 48.07% |
| Rival 2.900s intact recovery | 61.40% / 48.16% | 63.90% / 48.08% | 63.89% / 48.08% |

Center Y is measured downward from the image top. Desktop settled empty space below the actual machinery drops from 41.10% to 32.74% for hero, and 41.59% to 33.03% for rival. On 390×844 portrait, settled final width is 66.76/66.82% and center Y is 50.52/50.48%; this is slightly below the requested 45–50% band but within the retained safe interval. On 844×390 landscape, width is 64.61/64.69% and center Y is 48.87/48.76%. No aspect-specific source or camera override was added.

The probe uses the actual installed-loader hero/rival meshes, real course terrain and simulation poses, 120 Hz fixed state plus bounded extrapolation, and a modeled 60 Hz camera with .18 pacing for the actual policy’s 820ms cut. Telemetry speed is used, rather than forced zero. This reproduces the phase relationship, not exact recorded PTS or native trajectory. It checks entry, springs, cut exit, post-cut catch, settlement, intact recovery and final running snap. The normal snap occurs at modeled wall time 4.4s. Lens-only eye positions and quaternions are bit-for-bit equal to V29 throughout this probe. The final candidate equals the unchanged ordinary camera state at that recovery snap.

Validation: **41 focused tests / 7 files PASS**; a final strengthened full-context recovery check **4 / 1 PASS**; separate before/lens/aim projection checks **3 / 1 PASS**; candidate and probe TypeScript PASS; `git apply --check` PASS. The source-camera integration test changes no existing gate or timeout. Every full 40/32-point box remains beyond near+0.49m through protected frames; the smallest measured depth is 6.24246m. Minimum candidate eye-to-real-terrain clearance is 2.90695m (requirement 1.2m). Both source variants and all three aspects retain at most two terrain calls per complete camera update/snap, matching the source-camera probe. Intact recovery also retains the existing ±.78 horizontal and −.58/+.70 vertical bounds at 60°.

Native gates still required: actual first cut and widened contact composition, manual/reduced/pause behavior, high-speed scenery clearance, full recovery/cutback, and unchanged fresh critic. This candidate does not establish impact force, fix contact volume, remove background structures, or imply an improved art score. No browser, build, render, video decode or live-file mutation was performed for this handoff.

Exact patch, before/candidate hashes and validation paths are in `candidate-manifest.json`; raw measurements are `projection-results-v2.json`, with `selected-projection-results.json` for the requested phases. Earlier probe output remains preserved. The source patch is frozen; only parent central admission should change live files.
