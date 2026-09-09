# Polwo V1/V2 fixed-camera source-fit comparison

**Recommendation: retain V2 as the working candidate and revise before fit approval.** It visibly improves control reach and rear helmet readability. Those gains do not yet establish a fully supported seated pose or clean deformation. Preserve V1 as the failed comparison study and keep its earlier report unchanged.

Scope: direct inspection of six `polwo-fair-fit-v{1,2}-cockpit-{side,rear,front}.png` images, supplied with identical fixed cameras/lighting, plus `concepts/10-polwo-vehicle-round32.png`. Vehicle framing and surrounding geometry visibly align between each pair. Version names were visible and this reviewer previously assessed V1: this is an unmasked paired image critique, **not double-blind**. No authoring code, Blender state, browser, runtime or performance test was used or changed. These static source views are not race-camera evidence.

## Observed comparison

| Criterion | V1 | V2 | Assessment |
| --- | --- | --- | --- |
| Hand/control relationship | Side and rear views show the visible glove below/inward of the empty elevated grip. | Fingers visibly meet the near control in the rear view; the side view puts the raised hand at its grip, and the front view shows fingers against the near bar. | Clear improvement; visible contact is supported. Both complete finger wraps and absence of small intersections remain unverified. |
| Rear helmet visibility | Central striped rear structure hides nearly the whole helmet and most torso. | Helmet silhouette, neck and a substantial part of the near shoulder/arm are visible above/beside that structure. | Clear improvement in this exact view. Lower torso remains obscured, and actual chase readability is not established. |
| Posture/scale within cockpit | Low, smaller-looking occupant with ineffective reach. | Much larger-looking, upright occupant; helmet rises above the rear structure in side/front views. | Better occupancy, but the exposed upper body reads more upright and prominent than concept 10's compact seated racer. Do not equate extra height with solved seating. |
| Garment/arm shapes | Most problem areas are low or hidden. | Rear view exposes a dark flared, hollow-looking lobe above the near shoulder; side view shows abrupt bunched cuff/wrist transitions around the newly raised arms. | Visible shapes need cleanup/inspection before source approval. These raster views cannot determine whether the cause is mesh deformation, separate garment parts or overlap. |
| Pelvis, back, knees and feet | Hidden by shell/seat. | Still hidden by shell/seat. | Unverified in both versions. Visible upper-body placement alone is insufficient. |

## Highest-priority next changes

1. **Inspect and clean the shoulder-to-arm and wrist-to-glove joins while keeping the improved grip positions.** In V2 rear, the dark projecting shape immediately above the near shoulder/left of the neck reads as a lifted or hollow garment flap rather than a continuous sleeve. In V2 side, the near cuff/forearm transition is sharply bunched and angular. Review those local joins with the outer shell hidden and from the opposite shoulder; distinguish intentional armor/padding from an exposed gap, disconnected piece or pinched deformation. This is a specific visible-shape concern, not proof of damaged topology from a PNG.
2. **Make lower-body support reviewable before accepting the raised pose.** Capture a source cutaway without moving the driver or controls, showing pelvis on the seat, back support, knee clearance and feet/pedals. Show both grips at close range in the same pose. Current images support visible hand/control contact, but cannot prove finger clearance, back contact or lower-body fit. If the raised pose floats or intersects the shell, solve the body proportions/joints and seat relationship together; keep a clearly readable rear helmet as a requirement.
3. **Refine uprightness and apparent size only after those contacts are solved.** The V2 front/side silhouette is conspicuously tall and erect, with a large helmet and exposed torso. Concept 10 shows a more compact occupant connected to a supportive seat and bent-arm controls. Prefer a coherent seated posture with that functional relationship over a further height increase. The image evidence does not justify a numerical scale target or moving the camera to hide the issue.

## Concept comparison and readiness boundary

V2 is closer to concept 10 in the two most relevant ways: the cockpit visibly contains an active driver, and the hands now connect to controls. It does not yet match the concept's continuous tailored suit/arm construction, convincing seat/harness support or compact posture. The gray-blue plain suit and heavily mottled source bodywork also remain less materially resolved than the concept's warm orange/blue paint and detailed mechanical finish, but those are secondary to fit and deformation here.

No obvious gross helmet collision with the visible windshield or outer shell appears in these three V2 views. That limited observation does not certify hidden geometry. **Retain V2's progress; revise the local arm/shoulder shapes and establish physical support before calling the driver source-ready.** Runtime import, UV/material budgets, loading/disposal, animated behavior, actual chase visibility and FPS remain outside this review.

Reviewed image SHA-256 values:

```text
d5562d6cfb80389c4bb431e823b7a8320f365d4e34f68ac123acf85d59801064  assets/source/inkstorm/polwo-driver-round32/polwo-fair-fit-v1-cockpit-side.png
7cf585e25d9315ddad10724c0a7016fdbc8ab58c98fa1fa7edf8c65524f83463  assets/source/inkstorm/polwo-driver-round32/polwo-fair-fit-v2-cockpit-side.png
fb964143c772144dac1633b265b0553d3911aeb834379b996f07b1da8672db43  assets/source/inkstorm/polwo-driver-round32/polwo-fair-fit-v1-cockpit-rear.png
9ed15b8e529861f2852a8ed52a3ca18e23724b5adddeab1a6aa2161c9b6f9ef7  assets/source/inkstorm/polwo-driver-round32/polwo-fair-fit-v2-cockpit-rear.png
e35cd8a16377d4cd883b5bd2ac27bc7efc8ac1115af676b72545476429d6bcf1  assets/source/inkstorm/polwo-driver-round32/polwo-fair-fit-v1-cockpit-front.png
5abd75006403512a87f1c3e3ccac50243268a8dbbd19979974d7303f245b86bb  assets/source/inkstorm/polwo-driver-round32/polwo-fair-fit-v2-cockpit-front.png
ff6884640507cfe0a336ffcc93495259f89e1d86f23dc5a366bae4b039ade708  docs/inkstorm-overhaul/concepts/10-polwo-vehicle-round32.png
```
