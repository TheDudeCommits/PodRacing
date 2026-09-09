# Blind Blockrunner control fit review — round 34

Date: 2026-09-08

## Decision

**Revised control-fit-v1: narrow source-fit PASS — 8/10.** The new grips visibly occupy the pilot's open hands, follow their differing orientations, and have support bars that read as extending to the cockpit sides. They replace conspicuous unattached vertical poles without obscuring the pilot or changing the craft's recognizable outline. The supports are visually plausible at this scale, though their wall junctions are less convincing than the hand fit.

**Cleanup-v1 baseline: source-fit FAIL — 3/10.** Its two tall vertical poles stand ahead of the hands with visible separation. The pilot reads as holding empty air.

This is acceptance of the **visible static source fit only**. It is not final Inkstorm style acceptance, runtime acceptance, mechanical validation, gameplay acceptance, or AAA quality acceptance. These are neutral Blender renders, not gameplay captures. Motion, control travel, collision clearance, hidden contact, actual attachment topology, materials in the target renderer, and performance cannot be inferred from them.

## Blind review method

Individually opened all six supplied PNGs with `view_image`, in baseline driver/front/fullcraft order followed by revised driver/front/fullcraft order. No implementation, previous review, browser, Blender session, source model data, or runtime was inspected. Ratings below concern the evidence each image supplies for static control fit, not the overall quality of the vehicle.

All images are in `assets/source/inkstorm/blockrunner-round34/`.

| Image | Fit rating | Narrow verdict | Visible evidence |
| --- | --- | --- | --- |
| `cleanup-v1-driver-20260908-round34-compare-v1.png` | 2/10 | FAIL | Both open C-shaped hands are visibly behind and separate from the tall poles. The poles have floor-like terminations, but there is no convincing hand-to-control contact. Their height competes with the pilot's torso. |
| `cleanup-v1-front-20260908-round34-compare-v1.png` | 3/10 | FAIL | Two black uprights frame the torso while the hands sit farther out. The image supports the disconnected-control reading seen in the close view. The rest of the craft remains legible. |
| `cleanup-v1-fullcraft-20260908-round34-compare-v1.png` | 4/10 | FAIL | At whole-vehicle scale the tall poles remain visually conspicuous and the hands still read as empty. Engines, long forward rails, side shields, and open center are clear. |
| `control-fit-v1-driver-20260908-round34-fit-v1.png` | 8/10 | PASS | Black handles visibly pass into both hand openings, with exposed caps and short lower ends. The image-left handle follows the tilted hand and the image-right handle follows its more upright hand. Bars emerge at the lower grip region and head toward the sides. The image-right wall junction is occluded. |
| `control-fit-v1-front-20260908-round34-fit-v1.png` | 8/10 | PASS | Both grips read as held; lateral bars appear to reach the inner side boundaries. Removing the floor poles exposes more torso and leg space. The black bar segments can read together as one thin horizontal line, so the mounting details are weak at this scale. |
| `control-fit-v1-fullcraft-20260908-round34-fit-v1.png` | 8/10 | PASS | Controls become a subordinate cockpit detail. The visible far-side bar approaches the side panel while the nearer connection is largely hidden by the near shield. Pilot visibility, engine openings, forward rails, side shields, and the large central opening appear preserved. |

## Findings by acceptance criterion

- **Pilot fit: PASS.** Grip position and orientation now agree with the visible hands. The arms do not look stretched or newly contorted. Head, visor, torso, and seated pose appear consistent between paired views.
- **Convincing grip: PASS.** Each hand visibly surrounds a dark handle, which is a decisive improvement over the empty-hand baseline. The close view provides the useful evidence; the smaller views corroborate it. This does not prove exact surface contact or absence of internal intersections.
- **Support connection: PASS for visual plausibility, with limited confidence.** The front view shows uninterrupted-looking paths from the lower control regions to the cockpit sides. No conspicuous floating end is visible. However, black bars against black panels and occlusion hide the final joints; their construction and hidden contacts are not verified.
- **Pilot silhouette and craft silhouette: PASS.** The new bars remain below the helmet and outside most of the torso. The craft's major proportions and outline look unchanged in the paired front and fullcraft renders. This is a visual comparison, not a geometric identity claim.
- **Openings: PASS.** The large gap between forward rails, both circular engine mouths, and the open cockpit remain readable. The lateral bars introduce thin lines across the cockpit's side spaces, but do not fill the central opening or close the cockpit.

## Top remaining issues

1. **The side-wall attachment is visually underdescribed.** The bars appear to meet the black panels without a clearly readable socket, pivot boss, or bracket. A small restrained junction could improve construction credibility; the current stills do not establish whether one already exists behind the occlusion.
2. **The long, thin lateral bars are less convincing than the grips.** In the front view they read partly like a straight crossbar behind the pilot's hands. Their role is understandable, but articulation and independent movement are not visible. Do not infer either from this review.
3. **The available views leave clearance and hidden fit unresolved.** The near-side mount and the underside/rear of the hands are not exposed. A closer opposing angle would resolve visual contact and wall entry; a motion check would be required for travel and clearance. Neither uncertainty reverses the narrow visible-fit pass.
4. **Neutral rendering leaves the final presentation open.** Dark supports merge with dark side panels at fullcraft scale. Their readability under final Inkstorm materials, lighting, camera distance, and motion still needs separate evaluation. No style or AAA score is assigned here.

## Image identity

SHA-256 values were computed directly from the six reviewed PNG files.

| Image | SHA-256 |
| --- | --- |
| `cleanup-v1-driver-20260908-round34-compare-v1.png` | `82fe63b918af1693874690c8f76ce37490d608c40124d6ada92f37819522c492` |
| `cleanup-v1-front-20260908-round34-compare-v1.png` | `f4b4d0d40cdb931fa69d2c872c3653df99520c639fffbf36d534a7fb65745292` |
| `cleanup-v1-fullcraft-20260908-round34-compare-v1.png` | `534050a815f335f0cfafee134d0d8a0ad1b55111ece2dcb6c2f0703c0e05c9f0` |
| `control-fit-v1-driver-20260908-round34-fit-v1.png` | `897a15f95867818ff5a95106e6a7dd461ca4b8b3494ccf73b2da0e459f180281` |
| `control-fit-v1-front-20260908-round34-fit-v1.png` | `1b5c8ad07becef292a7ccb8785cac8fc659da098a53b07c10ee164a769dab7ef` |
| `control-fit-v1-fullcraft-20260908-round34-fit-v1.png` | `fd7f24e604a520fc54cb5b0d7b7338be968632abd444667ec61cd81b2fbd4367` |
