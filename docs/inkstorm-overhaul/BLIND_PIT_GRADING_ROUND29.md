# Blind pit grading — round 29

## Verdict

**Retain B (`grid-grounding-round29-graded`) as the better intermediate result. Strict concept parity: FAIL for both sets.** B visibly clears the working floors and exposes equipment buried by terrain in A. It does not solve the abrupt relationship between the pit apron and surrounding land. This is a visual judgment from diagnostic close-camera stills; ordinary race framing, motion, gameplay, and FPS were not assessed.

## Exact images inspected

Target:
- `/Users/amir/Projects/PodRacing/docs/inkstorm-overhaul/concepts/01-grid.png`

Set A:
- `/Users/amir/Projects/PodRacing/output/gauntlet/grid-grounding-round29-after/pit-1.png`
- `/Users/amir/Projects/PodRacing/output/gauntlet/grid-grounding-round29-after/pit-2.png`
- `/Users/amir/Projects/PodRacing/output/gauntlet/grid-grounding-round29-after/pit-3.png`

Set B:
- `/Users/amir/Projects/PodRacing/output/gauntlet/grid-grounding-round29-graded/pit-1.png`
- `/Users/amir/Projects/PodRacing/output/gauntlet/grid-grounding-round29-graded/pit-2.png`
- `/Users/amir/Projects/PodRacing/output/gauntlet/grid-grounding-round29-graded/pit-3.png`

Only these images were inspected. No implementation, history, prior criticism, tests, or metrics were consulted.

## Scores

Scale: 1 = severely deficient, 10 = convincing target-level execution. Scores judge the visible pit environment across all three views, without penalizing the diagnostic cameras for lacking the target's cockpit composition.

| Criterion | A | B | Visible basis |
|---|---:|---:|---|
| Floor/ground continuity | 2 | 4 | A1 has a large dune through the left bay, burying much of its equipment; A2 still has sand crossing the working floor. B clears both, but all B views reveal a steep, abruptly cut terrain face below the perfectly straight apron. |
| Construction plausibility | 3 | 4 | B restores usable floor space. Both retain thin, minimally connected poles, broad shells with little visible supporting structure, and no convincing access transition at the apron edge. |
| Legibility | 5 | 6 | Cyan engine faces and colored stations are readable; B uncovers the left station. Large near-black interiors still flatten depth and merge structural surfaces. |
| Materials | 3 | 3 | Rock is much more detailed than the pit objects. Shells, fabric, machines, and floor remain broad, flat surfaces with limited material distinction. B's foreground terrain has conspicuous vertical streaking/stretching. |
| Density | 3 | 3 | Repeated paired engines, two box stations, sparse block figures, and a short crate row leave large empty interiors. The target has dense, varied working clutter and overlapping structural layers. |
| Concept parity | 3 | 3 | Warm desert, blue/orange fabric, and arched pits establish the theme, but the visible result remains far simpler and less materially resolved than the target. |

## Concrete remaining defects

1. **Apron access and terrain edge:** B trades interior burial for an exposed steep face directly beneath the frontage. B2 and B3 look like pits perched above a cut bank, with no ramp, graded shoulder, retaining construction, or continuous service surface explaining the transition. A's large dark foreground regions are also unresolved, so returning to A is not preferable.
2. **Shell and canopy construction:** Large smooth arch panels lack the target's repeated ribs, seams, reinforcement, attachment hardware, and layered thickness. Fabric corners and poles have weak visible connection logic. Matching silhouettes alone does not make the workshops feel assembled.
3. **Interior staging:** The bays repeat almost identical isolated props. Equipment is simple, oversized geometry beside tiny figures; the empty dark volumes lack benches, parts, cables, storage, practical lighting, and readable work zones.
4. **Material hierarchy:** The canyon has strong texture while the workshop surfaces read as plain colored geometry. Wear is sparse and does little to establish metal thickness, painted panels, cloth tension, dust accumulation, or mechanical function.

**Priority next correction:** Make the ground visibly continuous from the area in front of the pits onto the clear working floors, with a shallow terrain transition or an explicitly built access apron. Remove the exposed near-vertical foreground bank and stretched surface appearance while keeping B's equipment unburied. Verify the same three diagnostic angles before adding decorative density. After that, address structural ribs/attachments and layered workshop staging.
