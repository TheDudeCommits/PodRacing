# Blind pilot runtime review — round 27

**Retain B as the material starting point. Neither passes the ≥8/10 target gate.** A scores **6.0/10** overall; B scores **6.3/10**. B removes much of the hard, chipped-metal appearance from the suit, but it trades away useful contrast and still does not communicate the guide's worn blue-gray textile, dark leather gloves, and small metal fittings clearly enough.

This is a fresh image-only assessment of the supplied material guide and six diagnostic detail renders. No previous reviews, source code, or other documentation were consulted. These are close cameras in the actual game world, lighting, and postprocessing. They establish visible appearance from these angles only; they do not establish ordinary gameplay readability, motion quality, or performance.

## Evidence

- Target: `docs/inkstorm-overhaul/concepts/vehicles/pilot-material-guide.png`.
- A: `output/gauntlet/pilot-detail-round27/{side,front-quarter,rear-quarter}.png`.
- B: `output/gauntlet/pilot-detail-round27-cloth/{side,front-quarter,rear-quarter}.png`.

## Scores

Scores describe the delivered images, without attributing defects to any particular implementation. The overall score is the mean of the five criteria, rounded to one decimal.

| Criterion | A | B | Visible basis |
| --- | ---: | ---: | --- |
| Cloth / leather / metal separation | 4.8 | 6.0 | A gives sleeves, gloves, and surrounding hard parts similarly sharp, pale highlight islands. B makes the suit read as softer and more matte, but gloves and suit remain nearly the same dark olive material; buckles lack the guide's distinct bright metal edges. |
| Driver construction | 6.7 | 6.7 | Both show a seated human silhouette, articulated fingers, wrist cuffs, sleeve panels, orange identification patch, harness straps and rectangular fittings. Large sleeve facets, abrupt collar transition, and weakly resolved stitching keep the garment below the guide's tailored construction. |
| Visible fit and usability in cockpit | 7.3 | 7.0 | Both place the pilot convincingly in the seat with hands visibly engaging the controls. A's stronger outlines help separate arms and torso from the seat. B merges more strongly into cockpit shadow. Static images cannot verify joint travel or clearance during animation. |
| Visual detail | 5.8 | 5.7 | A exposes more edges but its broad highlight patches dominate the small details. B is calmer, yet most fabric grain, zipper teeth, seam wear, and glove construction are difficult to read even at this close distance. |
| Match to material guide | 5.4 | 5.9 | The cream helmet, dark visor, orange patches, harness, and seated pose preserve recognizable design cues. Both are far coarser and flatter in surface detail than the guide. B better suggests textile softness, while its olive-black color and uniformly dark hands drift from the guide's blue-gray suit and dark leather differentiation. |
| **Overall** | **6.0** | **6.3** | **Neither meets ≥8.0.** |

## What to retain

Retain B's reduced hard highlights on the shoulders and forearms. In the rear-quarter view, its sleeves read more like flexible clothing than painted or coated hardware. Keep the existing helmet/visor silhouette, visible glove fingers around the controls, restrained orange arm patch, and harness placement. Those elements already communicate a working cockpit pilot.

## Actionable visible defects

1. **Restore a readable textile midtone in B.** The side and front-quarter suit collapses into green-black shadow, especially at the chest, upper arm, cuff, and glove. Give the cloth a discernible blue-gray body value under this same runtime lighting. Preserve enough tonal difference from the seat and gloves that the garment remains readable in the front-quarter image.
2. **Give each material its own visible response.** In B the gloves and sleeves have almost the same matte dark finish. Make leather gloves a darker, smoother material with localized sheen on knuckles, fingers, and creases. Keep cloth broadly matte. Give harness hardware small, controlled metal edge highlights. A's large cream-colored shoulder/forearm patches are too strong and coarse to serve as believable fabric wear.
3. **Make garment construction legible at this diagnostic distance.** Sleeve seams and cuff bands exist, but broad polygonal regions and dark irregular lines dominate. Resolve deliberate seam paths, seam allowance or piping, restrained stitch runs, and a readable central closure. Concentrate modest wear at seams, cuffs, and elbow folds instead of isolated broad patches. The target's fine construction explains how the suit is assembled; neither candidate yet does that consistently.
4. **Soften the visible sleeve articulation.** The near forearm and elbow in the side view, and both arms in the rear-quarter view, read as angular segments with sharp transitions. Show compression folds on the inside of bent elbows and tension along outer sleeves, maintaining a continuous fabric silhouette through the cuff. The exposed images support a stiffness/readability concern, not a claim that joints are missing.
5. **Resolve the helmet-to-collar junction.** Both side views show a conspicuous near-black neck section between the cream shell and raised collar. A clearer layered seal or bellows profile would make the transition intentional and closer to the guide. The helmet itself could also use restrained fine scuffs and subtler surface variation; its large faceted light regions currently overpower such detail.

## Occlusion and confidence limits

The front-quarter view has a suspended double-rod assembly and rectangular blocks directly in front of the visor and central chest. The circular hull opening hides much of the far side. The side view exposes more of the harness and both arms, while the rear-quarter reveals fingers at both control grips. Those are obstructions from visible cockpit components, not evidence of absent face, chest, or hand geometry.

The lap and lower body are heavily covered by cockpit panels, rails, and the seat structure. These images cannot establish whether hidden thigh, shin, or foot geometry is complete. No missing lower-limb finding is made. Similarly, projected overlap between cockpit hardware and the driver does not by itself establish penetration. The review does not recommend removing source cockpit geometry merely to improve a diagnostic camera.

B is a useful material direction, but a further iteration must recover cloth/leather/hardware separation, readable suit midtones, and finer construction under the same game rendering conditions before a score of 8 is defensible. Ordinary gameplay-camera and animation acceptance remain separate, untested questions.
