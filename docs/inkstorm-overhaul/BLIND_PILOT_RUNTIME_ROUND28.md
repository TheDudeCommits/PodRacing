# Round 28 pilot runtime image review

**Verdict: RETAIN the round-28-v4c candidate over round-27-cloth; FAIL the strict 8/10 acceptance gate.** The lighter blue cloth materially improves the pilot's separation from the seat and gloves. It does not yet reproduce the guide's garment construction or material finish.

## Evidence and boundary

Image-only review of `concepts/vehicles/pilot-material-guide.png`, all three `output/gauntlet/pilot-detail-round28-v4c/{side,front-quarter,rear-quarter}.png` frames, and the same three predecessor frames in `pilot-detail-round27-cloth`. No previous criticism, source, plans, or implementation claims informed the scores. These are close diagnostic runtime views, not normal gameplay framing, animation, or FPS evidence.

| Criterion | Round 27 | Round 28 | Visible basis |
|---|---:|---:|---|
| Construction | 7.0 | 7.0 | Helmet, harness, sleeves, gloves and seated posture are identifiable. Shoulder and elbow volumes remain angular; long arms read as relatively rigid tubes rather than tailored cloth with compression folds. |
| Material separation | 5.5 | 7.5 | Blue suit now separates clearly from dark seat, black gloves and pale helmet. Harness and buckles remain dull and close in value; fabric, webbing and hardware lack the guide's distinct responses. |
| Detail | 5.5 | 6.0 | Sleeve seams and the orange patch are easier to see. Seams read as thin irregular dark lines; the guide's stitch rows, worn edges, zipper teeth, glove pads and buckle recesses remain much stronger. |
| Fit | 7.5 | 7.5 | Hands meet the controls and the body sits plausibly inside the seat. Cuffs and elbows look stiff, and harness straps do not show convincing tension and conformation across the torso. |
| Target match | 5.5 | 6.5 | Blue cloth, orange accent, cream helmet and dark visor align with the guide. Broad flat shading, weak localized wear and simplified textile construction keep the finish visibly short of it. |
| Mean, informational only | 6.2 | 6.9 | Acceptance requires every criterion to reach 8; the mean cannot override failures. |

## Image-visible corrections

1. Add readable garment construction at shoulders, elbows and cuffs: restrained compression folds, stitched panel borders and cuff thickness. Avoid treating long black surface lines alone as stitching. The side and rear-quarter views expose this most clearly.
2. Give harness webbing a separate, darker woven finish; make the buckle rims and recessed centers visibly metallic and distinct. The front-quarter view currently loses most of this hardware against the torso.
3. Place small, controlled abrasion on sleeve seams, elbow edges and the helmet rim. The guide shows wear attached to contact areas; the candidate mainly shows broad color patches and shading facets.
4. Refine the glove finish around the fingers and wrist, with readable articulated pads and flexible creases. The rear-quarter view shows contact with the grips but limited glove construction.

Retain the blue cloth value and color. Reverting to the predecessor would conceal existing detail and merge the pilot back into the cockpit. No evidence here supports runtime performance, normal-camera detail visibility, or motion acceptance.
