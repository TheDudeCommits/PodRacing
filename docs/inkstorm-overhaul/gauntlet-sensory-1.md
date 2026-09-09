# Blind sensory review 1

Reviewed only the three supplied images: `output/playwright/inkstorm-sensory-chase.png`, `output/playwright/inkstorm-sensory-hazard.png`, and the approved `docs/art-direction-2026-09-06/B-inkstorm.png`. No code, implementation reports, browser session, or other reviewers' conclusions were inspected.

**Verdict: FAIL against the approved premium Inkstorm target.** The screenshots establish a legible central vehicle and a broadly related warm palette, but the current result reads as a sparse, flat-shaded prototype. The target's defining qualities are close vehicle presence, imposing canyon scale, a clearly carved driving surface, atmospheric depth, and strong directional ground motion. Those are substantially absent here.

Scores use 10 for excellent visual execution and 5 for serviceable but materially compromised execution. They concern visible evidence only.

| Criterion | Chase | Hazard | Reason |
| --- | ---: | ---: | --- |
| Camera framing | 4/10 | 4/10 | The craft is recognizable, but sits remotely in the middle of a broad, nearly featureless landscape. Large sky and foreground areas do little to explain driving decisions. |
| Visible sensation-of-speed cues | 3/10 | 3/10 | Edge streaks and exhaust communicate an intended speed effect, but lack strong grounding in the terrain. Near-field scenery, road texture flow, and convincing scale references are weak. |
| Gameplay clarity | 4/10 | 4/10 | The player craft is easy to find. The actual traversable road, upcoming curvature, route width, and meaningful terrain edges are difficult to distinguish from the surrounding desert. |
| Hazard readability | Not established | 3/10 | Three rockfall icons announce a category but do not establish where or when the impacts threaten the road, or which passage is safe. |
| Fidelity to approved premium visual style | 2/10 | 2/10 | The palette and engine arrangement carry some connection; environment composition, surface richness, depth, lighting, and vehicle presence do not approach the reference. |

## Ranked defects and concrete fixes

1. **The driving corridor lacks physical definition.** The peach ground covers almost the entire lower scene. Thin mint route marks provide navigation, but their relationship to road boundaries is ambiguous; in the hazard image a line crosses the near foreground and another runs beneath the craft. Distant black pylons are small and inconsistent as a spatial guide. Build a visually continuous road surface with distinct shoulders, bank changes, darker tire-worn grooves, and substantial bordering rock forms. Keep the next turn and an unobstructed usable corridor readable without depending on the green line.

2. **The environment misses the reference's scale and composition.** Broad flat burgundy/orange sky bands and isolated decorative swirls dominate the upper image. Low, scattered blocks at the horizon cannot provide the reference's towering rock walls, overlapping canyon layers, natural arch, or deep drop. Add authored canyon masses at foreground, midground, and distance; arrange them to frame the next route decision. Establish sharp near silhouettes, cooler or lighter distant layers, and large directional cast shadows. This is a scene-composition gap, not a missing postprocessing filter.

3. **The camera makes the racer feel small and detached.** The current vehicle occupies roughly one-third to two-fifths of the width and floats around the middle-lower frame. The reference anchors the cockpit to the bottom edge and lets the engines dominate the lower sides while the road opens between them. Test a closer, lower chase camera with the cockpit near the bottom edge, wider engine presence, and a stable forward opening above the linkage. Preserve enough distance visibility for steering; do not enlarge the vehicle until it hides the next turn. The existing airborne callout cannot compensate for weak visual height and ground-contact cues.

4. **The rockfall warning does not identify the actionable danger.** Sky-level warning badges can attract attention, but the falling objects and threatened ground zones are not reliably identifiable in this frame. The race-director badge also appears to cover the leading portion of the warning title, producing a visibly cramped alert. Tie each warning to its world location with a clear ground footprint, fall trajectory or dust precursor, and an advancing time cue. Keep the safe corridor visibly open. Move the director badge into its own space and ensure the complete warning heading remains readable at this capture size.

5. **High speed is asserted mainly by the speedometer.** The 410/485 KPH readings exceed what the sparse scene conveys visually. Pale edge slashes decorate the screen but do not establish travel over a surface. Add strongly directional ground texture, close shoulder rocks and posts at readable intervals, dust/exhaust trails, and coherent surface shadows. Tune peripheral streaks around the actual vanishing point. Evaluate camera lag, shake, FOV response, and motion blur in motion before selecting them; screenshots cannot justify arbitrary amounts.

6. **The HUD does not have a consistent readability hierarchy.** Position is repeated inside the circuit panel; the minimap appears mostly empty; lower-right meter labels and the coral airborne copy have poor separation from the terrain. Establish a compact primary hierarchy for position/lap, upcoming threat, and speed. Place secondary meters on a consistent contrasting backing, enlarge their labels, and give the minimap an unmistakable course/player trace. Retain only genuinely useful duplicate information.

## Acceptance boundary

The vehicle silhouette, warm palette, and large speed numerals are useful foundations. They do not currently offset the environment, road-legibility, camera-presence, and hazard-localization gaps. Hold premium visual acceptance until new chase and hazard captures demonstrate those changes in representative gameplay.

These stills cannot establish steering feel, camera damping, real speed response, collision fairness, audio, frame pacing, performance, or whether warnings arrive early enough to react. No pass or failure on those runtime properties is inferred here.
