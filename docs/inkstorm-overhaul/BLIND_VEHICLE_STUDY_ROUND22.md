# Blind vehicle study — Round 22

**Verdict: FAIL for both Blender studies against the supplied premium stylized targets.** The painted vehicle shells have useful visual foundations, but both pilots read as smooth toy figures inserted into substantially more detailed, weathered machinery. That mismatch is the dominant failure. These images do not establish in-game quality, motion quality, parity, or performance.

This assessment uses only the six images listed below. No source code, implementation claims, prior reviews, or additional images were inspected. All six listed images were available. The Sebulba source image is considered only as a silhouette reference, not evidence of the current styled vehicle's finish.

## Images examined

- Target: `docs/inkstorm-overhaul/concepts/vehicles/teemto-inkstorm.png`
- Target: `docs/inkstorm-overhaul/concepts/vehicles/sebulba-inkstorm.png`
- Actual Teemto: `output/vehicles/teemto-review/paint-full.png`
- Actual Teemto: `output/vehicles/teemto-review/driver-cockpit-side-v4.png`
- Actual Sebulba: `output/vehicles/sebulba-review/driver-material-v5.png`
- Sebulba silhouette reference only: `output/vehicles/sebulba-review/source-full.png`

## Visual findings

| Criterion | Teemto study | Sebulba study |
| --- | --- | --- |
| Material hierarchy | **Fail.** Blue, cream, and orange establish the intended family. However, the cockpit rim reads as pale painted/plaster-like material, and the pilot's helmet, pads, gloves, and suit lack convincing differences in construction and surface response. | **Fail.** Orange painted shell, black machinery, and ribbed cables separate reasonably well. The pilot remains largely clean cream/orange/dark blobs, disconnected from the vehicle's worn metal hierarchy. |
| Mechanical credibility | **Fail at target detail.** Circular access opening, seat, rods, and panel cuts are legible. The close view has exposed background through the cabin, broad empty regions, a rudimentary hanging block assembly, and hoses whose attachment/function is unclear. The full view's engine shells are much less articulated than the target. | **Partial visual success for the visible vehicle.** Fasteners, hoses, engine casing, and panel thickness give the cockpit assembly credible density. The pilot/control interface lacks equally credible detail. Final styled main engines are not shown, so their finish cannot be judged. |
| Pilot anatomy and pose | **Fail.** Oversimplified helmet/head mass, circular ear disc, spherical shoulder caps, tube limbs, mitten hands, and an upright torso look like a mannequin. Gloves do not visibly wrap the controls. | **Fail.** The same primitive construction is conspicuous from behind: oversized smooth helmet mass, round shoulder cap, clean tube arms, and near-spherical gloves. There is no visible articulated grasp or convincing cloth compression at the elbows. |
| Cockpit integration | **Fail.** The occupant is seated, but restraint, shoulder support, equipment connections, and hand contact are not sufficiently resolved. A thick overhead hose crosses the helmet silhouette. The very open cabin background weakens the sense of enclosure. | **Fail.** The occupant sits in the opening, but the exposed upper body has no visible harness construction or seat support comparable to the target. Arms approach the controls without a convincing wrist/grip relationship. |
| Worn finish | **Partial on shell; fail on pilot.** Shell weathering is visible, although much of it reads as soft mottling. Crisp exposed-metal chips, fastener grime, rubbed contact edges, and fabric abrasion are missing or too weak. | **Partial on shell; fail on pilot.** The orange body has abundant chipping and wear. Its density and age contrast sharply with the nearly pristine driver. Dark machinery needs finer material separation to avoid a uniformly dark molded appearance. |
| Style consistency / target gap | **Fail.** The target combines readable graphic paint with constructed, worn surfaces and a fully equipped pilot. The actual close view combines a weathered cockpit with a much simpler character rendering language. | **Fail.** The source silhouette supports the intended vehicle identity, but does not prove the styled full assembly. The current cockpit image falls well short of the target's integrated pilot, fabric, helmet, harness, and controls. |

The targets are more resolved in geometry as well as texture. This gap cannot be closed by adding dirt, increasing contrast, or changing lighting alone. Different camera angles prevent reliable exact proportion comparisons; the visible primitive character construction is nevertheless unambiguous.

## Five highest-priority visual fixes

1. **Rebuild both pilot helmets and upper bodies as constructed equipment.** Replace the near-spherical head/helmet masses with a crown, recessed visor opening, thick visor gasket, cheek/chin structure, neck seal, and separately modeled ear hardware. Replace round orange shoulder balls with curved plates that follow the deltoid and have deliberate borders. Remove the visibly irregular pad-to-sleeve junctions. Give the torso a shaped chest, waist taper, collar, and garment seams. Preserve broad readable forms, but bring their construction detail into the same visual language as the machinery.

2. **Correct both control poses and model actual hand contact.** Build palms, thumbs, and bent finger groups around each grip, with a visible wrist/cuff transition. Adjust elbow and shoulder positions so the arms form a relaxed driving reach rather than rigid tube segments. On Teemto, resolve the overlapping forearms and lower-body/seat relationship in the side view. On Sebulba, seat the shoulders lower into supported backrest geometry and make both glove-to-grip contacts readable from the presented angle.

3. **Complete cockpit support and equipment attachment.** Add a five-point or comparably legible harness with straps lying over the torso, buckles, and anchors on the seat/frame. Build dark inner wall/back panels for Teemto so the surrounding environment does not read through a largely empty cabin. Give the hanging control assembly a defined mounting bracket and useful face details. Reroute the overhead hoses clear of the helmet silhouette and terminate them in visible sockets/clamps. Connect the chest hose to a modeled suit fitting instead of letting it read as an arbitrary pale cable in front of the body.

4. **Separate material roles and weather them according to use.** Assign painted helmet shell, rubber visor seal, glossy dark visor, matte woven suit, leather/rubber gloves, metal buckles, and worn painted pads distinct roughness and surface detail. Add seam-scale cloth folds at elbows, shoulders, waist, and seated hips. Carry restrained dust and abrasion onto the pilots. On Teemto, make the cockpit lip a clearly constructed metal trim with narrow bright rubbed edges and darker recesses; retain broad cream paint where intended. Avoid spreading one uniform dirt layer across all materials.

5. **Raise vehicle surface construction to the target's level while preserving the established silhouettes.** On Teemto's large blue engine shells, add coherent panel boundaries, a few recessed service covers, defined intake lips/internal depth, and small fastener/vent groups that explain assembly. Give tow-rod/cable connections articulated collars and anchored brackets. Concentrate chips on leading edges, seams, and access points instead of general cloudy noise. In Sebulba's visible cockpit, distinguish machined metal, dark cast housings, hose rubber, and clamp metal with selective highlights and localized grease. Then provide a current styled full-vehicle Sebulba image before claiming a whole-vehicle material pass.

## Acceptance boundary

The broad paint families and vehicle identity are useful foundations. **Neither pilot is ready for a premium close view, and neither study passes the supplied target bar.** A subsequent review needs updated close views showing helmet construction, articulated grip, garment/harness detail, and believable cockpit support, plus a current styled full-vehicle view for Sebulba. Matching the target's detail hierarchy matters more than reproducing every scratch.
