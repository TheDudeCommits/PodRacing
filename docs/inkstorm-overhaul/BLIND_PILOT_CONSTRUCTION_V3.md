# Independent image-only pilot construction review — V3

**Verdict: FAIL — 6.0/10 against a strict 8.0/10 target.**

The candidate communicates a helmeted driver operating controls inside the vehicle. The basic seated placement is credible, and the restrained slate, cream, and orange palette belongs with the craft. It does not yet reach the generated target's premium motorsport character. The largest gap is the visible construction and surface treatment of the suit, collar, and gloves: these read as smooth padded components rather than a garment worn by a person.

## Evidence and scope

Reviewed the actual images directly using the image viewer:

- `assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v3/review/teemto-pilot-side-v3.png`
- `assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v3/review/teemto-pilot-front-quarter-v3.png`
- `assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v3/review/teemto-pilot-full-v3.png`

Generated desired references were located through image filenames, then viewed directly:

- **Primary driver target:** `docs/inkstorm-overhaul/concepts/vehicles/pilot-material-guide.png`. This is the closest comparison: substantially the same cockpit composition, with a developed suit, gloves, collar, harness, and worn helmet.
- **Secondary integrated target:** `docs/inkstorm-overhaul/concepts/vehicles/teemto-inkstorm.png`. Its right-hand cockpit inset establishes the intended pilot/vehicle material cohesion and motorsport character.

No earlier critiques, implementation files, handovers, or source scripts were read. This review covers visible still-image qualities only. It does not establish runtime appearance, animation, performance, or hidden lower-body construction. The full-vehicle view is useful for overall integration, but the driver is too small there to establish detailed construction quality.

## Assessment

| Criterion | Score /10 | Image evidence |
| --- | ---: | --- |
| Premium graphic motorsport character | 5.8 | The palette, helmet, zipper, harness, and sleeve patch provide a clear direction. Uniformly smooth surfaces and simplified body transitions leave a mannequin/toy impression at close range. |
| Believable clothing | 5.0 | The arms have large smooth tube-like masses, blunt joint bands, and sparse seam lines. Shoulder edges and elbow creases do not convincingly describe tailored fabric bending under load. The orange patch is mostly a flat color block. |
| Seated construction | 6.7 | The torso sits within the chair, shoulders are contained by the backrest, and both arms reach their controls. The lower torso/hip transition is weakly articulated, and the cockpit obscures much of the legs. The pose is plausible but not fully proven. |
| Cockpit integration | 6.7 | Hands are placed around the controls and the pilot fits the opening. The bare-looking cylindrical neck, smooth chest, and loose-looking harness at the shoulders weaken the sense of a fully equipped occupant. Overhead cables and the pale chest hose also compete with the helmet/torso silhouette. |
| Readable silhouette | 6.5 | Helmet, shoulders, elbows, and forward hands separate well in the close views. The large rounded helmet and long plain neck dominate; the forearms and gloves resolve into similar dark forms. The full view cannot prove readability at a gameplay camera distance. |
| Material cohesion | 5.3 | Slate, orange, and cream match the vehicle's color family. The craft has abrasion, stains, panel wear, and varied surfaces; the pilot is conspicuously clean and uniform. Suit, harness, gloves, and collar lack sufficient material separation. |

## Highest-value fixes, in priority order

1. **Make the suit read as a constructed garment.** Establish an intentional shoulder panel, chest/side panels, underarm gusset, elbow compression, and cuff closure. Replace blunt ring-like transitions with a few asymmetrical folds that converge around bent elbows and the seated waist. Use the primary guide's panel hierarchy and tension/compression logic as the quality target. Do not merely add many evenly spaced wrinkles.

2. **Develop the suit's material response and restrained wear.** Add fabric-scale breakup and controlled seam/ridge highlights; place abrasion at elbows, cuffs, patch edges, and raised seams. Keep broad slate areas calm so the graphic silhouette survives. The reference's worn textile should guide the result; the current broad flat blue-gray surface is the clearest mismatch with the surrounding vehicle.

3. **Replace the plain neck cylinder with a layered racing collar.** The side view especially exposes a long, uniform connector beneath the helmet. Give it a believable balaclava or flexible neck seal, a shaped suit collar, and visible overlap into the helmet. Integrate the harness at the shoulders so it lies against the clothed body and visibly follows a load path toward the seat/waist.

4. **Construct gloves around the grip.** The current fingers read as repeated rounded segments, while the palms/wrists are smooth and minimally differentiated. Build a clear thumb web, knuckle grouping, finger bends, palm thickness, and cuff overlap. Give the fingers observable contact with the handles. Resolve the small orange wedge at the near wrist so it reads intentionally as garment hardware or material, rather than an unexplained gap.

5. **Bring helmet finish into the same world.** Preserve the strong cream shell and dark visor, but improve the lower rim/chin geometry and add subtle localized scuffs, gasket detail, and varied visor reflections. Its current rounded pristine finish exaggerates the toy impression against the distressed shell. It needs less surface noise than the suit, with wear concentrated at plausible contact edges.

6. **Recheck the seated waist and cockpit overlaps in matching views.** Show how the garment compresses at the hip and how the lap restraint crosses it; verify that the seat, body, and controls remain distinct. Check helmet clearance beneath the overhead cables and route the pale hose so its silhouette does not obscure the important shoulder/collar construction.

## Conditions for an 8/10 reconsideration

Return the same side and front-quarter compositions after the suit, collar, gloves, and material pass. At ordinary image size, the pilot should immediately read as a person wearing a racing suit, with specific textile/leather/webbing/helmet surfaces and convincing bent-joint construction. Close inspection should support that first impression without conspicuous mannequin transitions, arbitrary gaps, or contact ambiguity. The palette and overall placement are viable; surface noise alone will not close the remaining construction gap.
