# Chase framing round 29 — CPU diagnostic proposal

Status: two candidate poses for temporary in-world A/B. No runtime integration, browser, rendering, build, tests, or course scan was performed. This document does not accept either candidate.

## Finding

The original concepts `docs/inkstorm-overhaul/concepts/01-grid.png` and `05-launch.png` place a broad, short engine pair across nearly the entire lower width, with an open central pilot/cockpit cropped by the bottom edge. The round-28 matching section captures, live drive, fork approach, and launch descent instead show the retained long, narrow Teemto family. This is partly camera framing and partly different source proportions. A camera change cannot reproduce the concept's engine width while retaining the current model, whole-craft framing, and useful route field of view.

The native current Teemto GLB spans X −6.545…6.496 m, Y 0.073…5.251 m, and Z −7.333…22.739 m. The pilot occupies X −0.383…0.420, Y 2.062…3.221, and Z −5.661…−4.128. Recorded anchors place the seat at [0,2.2,−5.2], exhaust pair at [−4.075,0.178,5.638]/[4.025,0.178,5.638], and coupling at approximately Z18.94. The engine/pilot depth difference explains why moving forward grows the cockpit faster than the engines.

All 199 deterministically sampled pilot vertices were blocked by the actual body triangles from the baseline and both candidate eyes. These are conservative double-sided sparse ray queries, not visible-pixel counts. They corroborate the rear canopy occlusion seen in the round-28 captures. Preserve the source silhouette: no clipped canopy, moved pilot, geometry distortion, or overlay to pretend this camera exposes the pilot.

## Exact candidates

Apply only to actual active Teemto chase presentation during an isolated later trial. Baseline must remain for Sebulba, procedural, unavailable-art fallback, other vehicle classes, and non-chase modes. Both candidates retain the exact existing speed-dependent FOV and comfort controls.

Let `t = smoothstep(speed, 0, 230)`. Use the current `framingForward`, `travelDirection`, `UP`, and `right` bases and all current lateral/route/junction additions unchanged. `right` in CinematicCamera is `forward × UP`; for native +Z-forward craft this is negative native X, so the existing `right * −0.35` means native X +0.35.

| Pose parameter | Current | A: balanced, first trial | B: closer/lower, boundary trial |
|---|---:|---:|---:|
| Eye distance behind framingForward | 16.5 + 0.8t | 13.8 + 0.8t | 12.4 + 0.8t |
| Eye height before existing landing/descent additions | 7.1 + 0.5t | 5.1 + 0.5t | 3.9 + 0.5t |
| Eye right offset | −0.35 | −0.35 | −0.35 |
| Aim travelDirection distance | 34 + 18t | 34 + 18t | 34 + 18t |
| Aim height before existing route/descent additions | 5.8 | 3.8 | 3.5 |
| Vertical FOV | 62 + 6 × smoothstep(speed,70,220) × comfortKick | unchanged | unchanged |

Retain `comfortKick = reducedMotion ? 0 : fovKickIntensity`; no changed settings keys or normalization. Retain subject-translation transport, camera/look springs, shake gates, landing compression and route preview. Do not change junction yaw bounds to make a trial pass.

At the matching captures' 410 km/h (113.76 m/s), before route additions, use these native coordinates:

- Baseline: eye [0.35, 7.3459566784, −16.8935306855], aim [0, 5.8, 42.854440424], vertical FOV 63.2340028111°.
- A: eye [0.35, 5.3459566784, −14.1935306855], aim [0, 3.8, 42.854440424], same FOV.
- B: eye [0.35, 4.1459566784, −12.7935306855], aim [0, 3.5, 42.854440424], same FOV.

## CPU results and limits

The study reads native POSITION/index buffers with node transforms, projects every vertex, and samples body occlusion. It imports Three math/geometry classes but no game source. Actual PNG captures are 1440×900 CSS / 16:10; original concepts are 16:9. Fractions below use the matching capture aspect.

| Flat 410 km/h result, 1440×900 | Current | A | B |
|---|---:|---:|---:|
| Full engine pair width / frame | 22.58% | 25.35% | 27.18% |
| Relative engine-width gain | — | 12.3% | 20.4% |
| Engine vertical span, screen px | 472–662 | 432–618 | 415–597 |
| Complete craft vertical span, px | 472–863 | 432–826 | 408–789 |
| Mathematical flat horizon Y, px | 432 | 431 | 442 |
| Sampled pilot points body-occluded | 199/199 | 199/199 | 199/199 |

Neither proposal meaningfully increases the flat-horizon reveal by itself. A keeps it almost fixed while increasing craft width; B introduces slightly more sky and a lower eye. Their useful in-world hypothesis is broader craft presence and changed ground perspective. A simultaneous world-reveal improvement is unproven. Lower eyes may conceal a crest's landing corridor or the low fork behind terrain; B is deliberately the more revealing diagnostic of that tradeoff, not a shipping recommendation.

The 12 flat rigid-pose corners per profile cover speeds 0/113.76/230 m/s, FOV kick 0/1, and absent/maximum bounded descent. A and B have no offscreen vertices or near-plane intersections in those corners. Maximum downward aim is 13.48°/13.01°, versus current 12.97°.

Separate nine posture probes at 410 km/h and FOV kick 0 use pitch −0.13/0/+0.13 and roll −0.18/0/+0.18 radians. Tiny rear geometry exceeds the bottom in some probes: current max 0.1471% vertices, A/B 0.0649%. Worst bottom Y is current944, A931, B917 at 900px high. Therefore neither candidate has a no-clipping guarantee, although these synthetic probes reduce the existing tail spill. These cases do not combine every descent, pitch, roll, slide, junction, aspect, or camera spring transient.

A rejected narrow-lens control (54° base, ~13.2m back) grows width to31% but clips at some zero-kick corners and exceeds the present14° descent intent (15.60°). Do not advance that option.

`projection-study.json` contains full parameters, bounds, per-profile screen extents, 12 synthetic corners, and nine posture probes. `study.mjs` reproduces it in under one second locally without browser or GPU work.

## Bounded actual A/B after the performance freeze

1. Save the current runtime camera source/build receipt and make a temporary Teemto-only profile trial. Keep the performance28 artifacts immutable. A first, B only if useful. Render from the real camera with actual meshes; do not crop, paint, or synthesize an acceptance image.
2. Capture the exact round-28 section progress values: 01-grid .003; 05-launch .17968750000000008; launch-descent .218; fork-approach .79616; 04-fork .7987770605129424. Include launch crest/approach and fork after entry from the same receipts, plus a short actual live steer/slide/landing sequence. Match16:10 and add16:9.
3. Inspect full screenshots at native scale: complete nozzles/tail under settled chase, engine pair opening around route, actual main road and elevated branch visibility, landings after crest, major terrain/furniture intersections, HUD overlap, and camera comfort. Increased projected width is not sufficient. Fail a profile if new body/terrain occlusion hides the decision route or if transient source clipping worsens.
4. After a concrete trial source exists, run the existing focused camera/junction guards. Keep `courseJunctionFraming.test.ts` bounds intact: route envelopes at90/150/220m, decision approaches−120/−60/0, laterals−6/0/+6, speeds90/160/210; |x|<.94, −.75<y<.65, bounded yaw. Repeat actual physical fork visibility and descent views for the candidate. Do not run an all-course scan merely to compare these two poses.
5. Confirm the baseline endpoint for active Sebulba/procedural/fallback, plus reduced motion and kick0/1, without writing new preferences. Only ship a profile with actual world visibility and clipping evidence; otherwise retain the baseline and report the native-silhouette limitation.

No acceptance verdict is supplied by this study.
