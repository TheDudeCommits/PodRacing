# Polwo V1 driver fit — independent image critique

**Verdict: failed physical-fit study; retain as source evidence, not a runtime-ready driver package.** This review inspected the three saved V1 cockpit PNGs directly and then compared them with concept 10. It did not use Blender, alter the candidate, inspect a live game, or measure GPU performance. The views are static offline inspection renders with different framing from a race camera. The concept is an art-direction target, not evidence of actual fit or imported asset readiness. V2 work underway elsewhere is outside this verdict.

## Concrete fit failures

1. **The hand pose does not operate the visible main control.** In `assets/source/inkstorm/polwo-driver-round32/polwo-driver-fit-v1-cockpit-side.png`, the near glove sits below and inward from the elevated control grip, leaving the grip visibly empty. The rear image corroborates a gap between the visible glove and the side control. The arms read as resting low in the cockpit, not holding the controls. This is a direct contact failure, independent of textures or lighting. Fit the wrists and closed fingers to the actual grip locations, with an elbow bend that still permits seat/back contact. Confirm both hands from unobstructed side and oblique views; the current front view hides them behind the windshield.
2. **The rear silhouette largely loses the driver.** In `polwo-driver-fit-v1-cockpit-rear.png`, the tall striped central rear structure masks most of the helmet and torso; only a narrow helmet fragment and one arm remain readable. The frontal image makes the driver clear, but that does not resolve the rear obstruction. Concept 10's rear quarter retains an obvious helmet, shoulders and occupied cockpit, making the difference material to the target. Resolve a physically seated pose and rear visibility together; merely lifting the figure without confirming the pelvis, back and feet would exchange one fit failure for another. These images do not establish visibility at the actual chase-camera position.

## What the images do and do not support

The side and front views place the upper body plausibly inside the cockpit envelope: the shoulders fit between the sides, the helmet is above the rim, and the brown seat/headrest is recognizably behind the driver. There is no obvious gross helmet penetration into the visible windshield or outer shell in those views. These are useful starting conditions, not proof of a seated rig.

Pelvis-to-seat support, back-to-seat contact, both hands and the feet are not simultaneously visible. The hull hides the lower body, and the side view cannot distinguish a small seat gap from penetration. Therefore seat, pedal and knee clearance remain **unverified**, rather than passed. A source cutaway or temporarily hidden outer shell, captured without moving the driver, would make those contacts reviewable. This is a request for evidence in a later source revision, not permission to edit the current runtime.

## Comparison with concept 10

`docs/inkstorm-overhaul/concepts/10-polwo-vehicle-round32.png` shows an actively occupied vehicle: fingers wrap the controls, bent arms connect them to the seated torso, and the harness/seat arrangement explains how the driver is supported. V1 preserves a visible helmet, suit and harness, but misses that working relationship at the hands. Use the concept's functional pose as guidance; the exact illustrated steering assembly need not replace the source vehicle's existing controls.

Overall finish is also still an imported-source study. The large mottled gray panels, mostly plain blue suit, broad striped tail and glossy windshield have weaker material separation than the concept's warmer orange/blue painted metal, purposeful seams, visible mechanical fittings and more detailed driver clothing. That is a secondary art pass after fit/contact, not a reason to accept a nonfunctional pose. The three closeups alone do not support an overall engine/vehicle silhouette or delivery-budget verdict.

A later candidate should first show both hands contacting controls, a supported pelvis/back, feet with clearance, and readable driver occupancy from the relevant rear view. Runtime material/UV/budget checks, loading/disposal, licensing records, actual chase visibility and FPS remain outside this source-image review. No runtime file or Blender state was changed.

Reviewed images: V1 `cockpit-side`, `cockpit-rear`, `cockpit-front`; concept `10-polwo-vehicle-round32`. The original V1 images remain the authority for this verdict even if later revisions improve the fit.

Image SHA-256 values at review:

```text
fcc5c7e69de72fe964f2d4ac96030b9bd4b563467fac1dc0ed2497ea6b897416  assets/source/inkstorm/polwo-driver-round32/polwo-driver-fit-v1-cockpit-side.png
96ab7b42100d57e9619e08e97837e1dc3b6882de38fcb6a5bd380e988956c227  assets/source/inkstorm/polwo-driver-round32/polwo-driver-fit-v1-cockpit-rear.png
c0d5c8f5808c3f80e1a5af3afc959b31bc108fec1ab790b8c263fce203c1f96b  assets/source/inkstorm/polwo-driver-round32/polwo-driver-fit-v1-cockpit-front.png
ff6884640507cfe0a336ffcc93495259f89e1d86f23dc5a366bae4b039ade708  docs/inkstorm-overhaul/concepts/10-polwo-vehicle-round32.png
```
