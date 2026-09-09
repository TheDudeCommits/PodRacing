# V24 private impact-camera trial

Ready for central review/application and native capture. **No live apply, build, browser, GPU work or visual acceptance is claimed.** The preserved V23 sequence remains **4.5/10 FAIL8**. This trial changes composition, not the actual strike, source geometry or effects.

## Deliberate framing change

While authored Teemto damage is active, the victim side cut **and the following protected detached-wreck chase** fit the three actual engine boxes plus the rupture/contact witnesses. Trailing disconnected rods, cockpit and pilot may lie outside that screen-fit rectangle. This replaces the implementation's previous requirement to keep every assembly corner onscreen; it is not a user-required safety condition being silently removed.

The complete original assembly bounds remain available and enforce near-plane clearance for **every visible mass**, including cropped rods and pilot. Intact recovery, missing/invalid metadata and other families retain full-assembly screen fitting. The protected recovery keeps the identity's selected azimuth, then the existing completed-recovery cut returns to exact ordinary camera behavior. No GameApp camera-mode, controller/cooldown, network, reduced-motion, cancellation or recovery-boundary logic changes.

- `TeemtoAuthoredDamage` publishes an optional reused 26-point frame: 24 source-box corners for the three engines and two copied rupture/contact witness slots. The actual contact is included only when owned by that pose; otherwise the final slot repeats the rupture. Full bounds and every original transform remain unchanged. Metadata clears at birth/reset and during intact recovery.
- `WreckVisualPose` carries that optional frame; the private GameApp adapter only clears/copies the optional field alongside existing camera data.
- `CinematicCamera` chooses a stable, bounded ±20° alternative away from the existing shadow-cast direction, on the same tear side. It then solves horizontal/vertical aim offsets and distance from the projected cluster envelope. Safety remains **x ±.74, y [−.58,+.70]**, eye ≥1.2 m above sampled terrain, and all full-assembly corners beyond near +.5 m. The original fallback uses its exact ±.78/fixed-aim calculation.

The initial fixed-aim variant and its metrics are preserved in `first-trial-fixed-aim/`. Its settled source width was only ~54%; the lower caption constraint dominated while space above the casing went unused. The final interval solve uses that empty space without changing caption/matte limits. The source boxes, rather than terrain/near-plane constraints, now limit the result.

## Measured projection, not a rendered-quality claim

Same actual hero/rival geometry, same deterministic brake-held fixture, same birth-to-side-to-wreck-chase history, 1440×900 aspect. Widths include every principal-engine source POSITION. These are CPU projections, not measurements of new native pixels or exact V23 video-frame synchronization.

| Variant / fixture tick | V23 behavior width | Final candidate width | Candidate eye above terrain |
| --- | ---: | ---: | ---: |
| Hero / 932 | 38.48% | **62.86%** | 6.32 m |
| Hero / 1067 | 39.98% | **61.33%** | 6.36 m |
| Rival / 932 | 37.35% | **62.93%** | 6.31 m |
| Rival / 1067 | 40.12% | **61.39%** | 6.32 m |

The nominal **65–75% target is not met**. Conservative source-box horizontal containment limits the real mesh to ~61–63%; further percentage tuning is deferred to actual visual review. Complete values and active constraints are in `same-snapshot-metrics.json`. No opacity, shadow bias, ground clearance, source scale, pool, shader, particle or draw-resource change accompanies this camera trial. View-dependent culling/counters may still differ; native performance remains to be measured.

## Validation and preserved failures

- Four new actual hero/rival tests pass, including frame 910 metadata-absent birth → first active update, 157 active ticks per variant, side→wreck-chase spring behavior, desktop/portrait containment, all visible source vertices before near/far planes, eye/terrain safety, pilot ownership, immutable simulation snapshots, reset, stale/invalid metadata and exact ordinary-camera return.
- **25 unchanged camera compatibility tests / three files pass**, including existing four-family source-bound tests. No existing tests are edited or weakened. Total focused validation: **29 tests / four files**. Private TypeScript check passes.
- Initial fixture failures (hero 40 full corners versus rival 32; differing exact source counts) and compiler failures are retained. The real source compiler error was TypeScript narrowing a side-effect-populated `pose.groundContact` to `never`; the final accessor reads the existing contact ownership/witness explicitly. Test-only Node typing/source-box API issues were corrected without changing safety predicates.
- The actual GLTFLoader fixture preserves the original geometry/BIN and source transforms; only image/material references are removed from an in-memory CPU copy. This does not validate texture decoding. No new vertex scans or terrain queries are added at crash time: impact metadata reuses cached corners and witnesses; camera fitting adds only bounded point arithmetic.

## Central integration and remaining visual risks

Apply `v24-impact-camera.patch` (three runtime files and two new test files), then the separate two-assignment `v24-gameapp-impact-adapter.patch`. `compose-final-patch.py` checks all three owned live source files against preserved inputs and performs **only `git apply --check`** against current GameApp. Hashes are in `final-inventory.json`.

After root builds/captures: use the same native four cases, actual visually pinned first-cut PTS and unchanged six phase offsets/reference/critic. Check visible lower-casing contact, rupture scale and silhouette, any new scenery occlusion, and the exact recovery cut. The closer view may expose coarse source materials or make the existing weak flare more obvious. Cropped disconnected rods are intentional; clipped principal engines, pilot-through-lens, terrain penetration or a recovery regression are not. If the impact still lacks force, the next decision should address the actual bounded burst/smoke silhouette rather than more small camera adjustments.
