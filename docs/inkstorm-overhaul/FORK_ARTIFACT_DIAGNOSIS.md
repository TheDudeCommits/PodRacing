# Fork artifact diagnosis — round 25 frozen evidence

**Current outcome:** the round26 sky seam correction and connected bridge geometry are implemented and verified below. The later terrain-clearance trim taper was rejected and reverted. A small dark bridge-entry fragment remains where the slab intersects uneven terrain; this is an outstanding visual limitation, not a claimed collider failure.

Read-only inspection of `output/gauntlet/round-25/{fork-approach,fork-after-entry,04-fork}.png` and the corresponding source. No browser, build, render, Blender job or source mutation was performed for this first pass.

## Raised edge wedges: concrete geometry mismatch

`src/render/inkstorm/InkstormBridge.ts:15-25` constructs the deck and both painted edges from separate, independently rotated boxes for every branch segment. Each box uses that segment's tangent and the average of its two widths. The deck is extended by 1 m and the rails by 0.5 m. The corresponding road in `InkstormRoad.ts:14-25` uses continuous cross-section rows with each point's own width and a smoothed previous-to-next tangent. Their boundaries therefore cannot coincide through a bend or width transition. The boxes can overlap as wedges or protrude beyond the visible road footprint. At the first/last segments they also extend beyond the authoritative flat entry/exit planes.

The height construction has another small systematic mismatch: offsetting the rotated slab center downward by a world-space 0.75 m makes its top center `point.y - 0.75 + 0.75*cos(pitch)`, rather than exactly the intended `point.y`. Each rotated edge has a related normal-versus-world-offset discrepancy. This is not enough by itself to explain a large wedge, but it explains why the deck/road comparison needs geometry measurements.

The visible wedges are not proof of a collision failure. `sampleBridgeSurface` (`src/game/race/bridgeSurface.ts:63-102`) selects the closest eligible finite segment, interpolates the same authoritative branch heights and widths, and rejects positions before the first / beyond the last end plane. `createBridgeHeightSampler` retains the higher of actual terrain and bridge support. The render boxes are not the collider definition.

Minimal render correction candidate: make the slab shell and low painted edges share explicit cross-section rows with the road instead of overlapping independently rotated boxes. Reuse a single row-boundary calculation, join neighboring rows, keep the deck below its authored top and terminate on the exact entry/exit planes. Retain supports and the current branch path, heights, collider sampler, road width, camera, pylon exclusion and marker population. A finite entry edge may remain partly buried by terrain; do not move physics or globally suppress supports to hide that fact.

## Thin upper-right sky dashes: attribution is not yet established

All three frozen images contain a column of detached, faint, near-vertical strokes in the upper-right sky. Their projected lengths change appreciably across approach/entry views. The following source facts rule out an immediate speculative fix:

- `RaceCourseView.setInkstormWorldEnabled` (`:832-835`) hides the main/branch near and far ribbons and the depth-disabled `far-route-visibility-overlay` when Inkstorm is active. Changing that inactive overlay's depth policy cannot explain these frames.
- The far pylon material is `Coherent far pylon impostors`, mesh `coherent-far-pylon-marker-lod` (`:1108-1143`). It already uses normal depth testing, with a single plane expanded to **4.6 x 14 CSS pixels**. Both its cap and stem share one depth and one draw. Ordinary billboard expansion does not explain the observed much longer strokes.
- The far pylon shader has no explicit camera-plane rejection (`:451-461`). Adding a guard would be sensible only after proving that this draw is responsible; all four quad vertices currently share its depth and are subject to normal clipping, so absence of a guard is not sufficient evidence.
- The detailed pylon body/light materials fade out from 420 to 670 m. They and the far impostors are transparent and explicitly excluded from the cel prepass. The course hull installer skips transparent materials. A generic claim that these objects accidentally receive Sobel/hull strokes is unsupported by the current source.
- `public/assets/inkstorm/sky-paint.png` was inspected directly and contains no matching dashed column. Speed streaks are constrained below their vanishing point and do not explain upper sky marks. Checkpoint supports have unit scale, not a multiplied pole height.

## Focused discriminating checks after the frozen run is released

1. Reproduce precisely the three recorded fork camera poses. Keep camera, source build, render size, quality and scene time fixed. Capture one baseline and toggle only the far pylon mesh, then detailed pylon body/light, then the entire course furniture group, restoring each before the next test. A delta image should establish which draw owns the marked sky pixels. If none do, isolate the post pass versus authored scenery and sky; do not modify unrelated LOD policies.
2. Once the draw is known, inspect its instance matrix and projected vertices at a known dash coordinate. Record clip `w`, near/far clipping and the expected pixel extent. For pylon impostors, test front-camera, behind-camera, near-plane and terrain/wall-occluded fixtures with a real GPU and assert bounded pixel extent plus proper occlusion, while retaining visible near/far marker coverage.
3. For the bridge, raycast the actual rendered deck/road geometry at cross-section interiors and both edges through the first, middle, curved and last segments. Compare heights with the independent `sampleBridgeSurface` result; measure any unsupported visible overhang and vertical disagreement. Explicitly test a bend, changing width and nonzero grade. Also assert shared segment-edge vertices, finite end planes and no newly introduced diagonal wedges across the road.
4. Retain the existing bridge-support and off-edge-fall simulation tests and the main/branch fork visibility measurements. Re-run them after a rendering correction. They establish physical invariants; screenshots establish the visual outcome. Neither substitutes for the other.

This document is a first diagnosis, not a verified artifact fix. Source changes and GPU attribution await release of the frozen full-race performance run.

## Round26 controlled attribution and implemented correction

The hold was released after round25 timing finished. `scripts/inkstorm-fork-attribution.mjs` served the unchanged round25 source with an isolated Vite transform exposing the app to diagnostics; it did not modify the production entry. The probe reproduced the dash column at exactly progress **0.7987770605129424**, chase camera **[18528.028229985826, 5.59871704260674, -930.7343303874973]**, viewport **1440 x 900 CSS pixels**. All owned browser sessions and servers were closed after each probe.

Evidence is under `output/playwright/fork-attribution/`:

| Image | Controlled change | Sky dash outcome |
| --- | --- | --- |
| `baseline.png` | None | Present |
| `without-far.png` | Hide only far pylon impostors | Present |
| `without-detail.png` | Hide detailed pylon body/light | Present |
| `without-course.png` | Hide complete course furniture group | Present |
| `without-world.png` | Hide authored Inkstorm scenery | Present |
| `without-terrain.png` | Hide terrain group | Present |
| `post-disabled.png` | Call `post.setEnabled(false)` | Present |
| `without-sky-suns.png` | Hide sun materials | Present |
| `without-sky-paint.png` | Set only painted sky weight to zero | Absent |
| `sky-wrapped-gradient.png` | Replace only the painted sky read with a wrapped-gradient read | Absent, original painted sky retained |

The responsible draw is `GraphicSkyDome`. Longitude comes from `atan(dir.z, dir.x)`, which jumps between 1 and 0 at its meridian. The implicit derivative chooses a near-global mip across that discontinuity and leaves faint detached vertical strokes. `SkyAtmosphere.ts` now calculates `dFdx`/`dFdy`, wraps only their horizontal components to the shortest [-0.5, 0.5) difference, and uses `textureGrad`. It retains one paint sample. No pylon shader, marker population, route visibility, world depth or physics policy changed.

Two early diagnostic attempts are retained but are **not evidence**: `without-post.png` tried assigning to the getter instead of calling `setEnabled`; `without-raw.png` allowed the normal render loop to replace the direct frame. The valid `post-disabled.png` explicitly uses the setter. Hiding VFX also runs through normal update methods and is not used for attribution.

## Connected bridge geometry and tests

`InkstormRoad.ts` exports its unchanged row tangent calculation. `InkstormBridge.ts` consumes those same row boundaries, widths and elevations. Its deck top uses the road's exact sixteen-column triangulation, 11 cm below the final shader-displaced paint. Continuous bottom and side faces plus two finite end caps replace the overlapping segment boxes. Painted 32 cm edge strips use connected rows. The existing pier spacing, centres, yaw, dimensions and founded heights remain intact. The combined vertex-colored structure still uses one instanced draw and the existing disposal/shadow interfaces.

`tests/render/inkstormBridge.test.ts` adds independent triangle-ray checks for graded physical support, every road triangle through turns/width changes, both finite end planes, continuous edge trim, real opaque depth and the original founded pier footprint. The test permits at most 4 cm of narrow-trim diagonal variation on the deliberately sharp synthetic bend; interior deck/paint separation must match to 0.1 mm. Existing road, bridge physics, pylon, fork terrain and framing suites remain unchanged.

Accepted bounded candidate captures are `round26-approach.png`, `round26-entry.png`, `round26-after-entry.png`. The sky dashes and repeated slab cross-seams are absent; both paths and route markers remain visible. The left edge is continuous through entry. These views also contain the root's concurrent broad-fracture material study and retain the old public arch, so they are not an isolated material comparison or a full round26 release acceptance.

Accepted production bundle: **`index-CQ14UpKC.js`**, SHA-256 **`6717d7fbb01e2b2b0723cfabb96e94e6d6ea1da3610dcc5da4ff3fa134cbcfef`**. Rebuilding after reverting the experiment below reproduced this exact bundle. Build/typecheck, `git diff --check`, and **29 tests across 6 focused suites** pass. This is geometry/visual evidence, not a new FPS measurement or complete race acceptance.

## Rejected terrain-clearance trim experiment

A subsequent experiment sampled five points across each row, revealed no painted rail below 0.25 m full-width ground clearance, and smoothly restored its 32 cm height by 2 m clearance. Its synthetic test passed: one exposed shoulder alone no longer produced a painted tip while centreline support stayed unchanged. All 30 tests then passed.

Actual captures `final-approach.png`, `final-entry.png`, `final-after-entry.png` from experimental bundle `index-_hta9yZu.js` rejected that result: the bright rail tip disappeared, but the underlying dark slab triangle remained and the left painted edge ended abruptly. The taper and its implementation-specific test were reverted. The misleading `final-` filenames are retained as historical evidence of the rejected attempt; they are not the accepted final state.

**Remaining limitation:** the small pointed dark fragment at the ramp entry is the continuous slab exposed by uneven terrain across its finite entry plane. The image is not proof of a collision failure. A complete visual resolution needs a separately measured road/terrain approach treatment; hiding pylons or changing depth would conceal the wrong object. This bounded change does not claim that remaining fragment is fixed.
