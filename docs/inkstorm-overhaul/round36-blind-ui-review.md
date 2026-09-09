# Round 36 — blind screenshot UI review

## Scope

Reviewed only these five supplied screenshots: `desktop-default.png`, `portrait-default.png`, `landscape-default.png`, `compact-default.png`, and `desktop-battle-inputs.png` in `output/simple-race-setup/native-final/`.

Brief: an incredibly simple setup with race types on the top row, an inspectable 3D pod in the middle, essential options below, and a Race button; minimal text.

This is a still-image assessment. Rotation, navigation, input behavior, animation, hidden hit areas, and accessibility behavior are unverified.

## Verdict

**Revision needed — small, targeted refinements.** The setup composition substantially satisfies the brief and should retain its current structure. The remaining concerns are compact touch affordances and the more crowded gameplay HUD.

| Criterion | Score / 10 | Assessment |
| --- | ---: | --- |
| Setup hierarchy and clarity | 9 | Race types, pod, essential options, and Race read in the intended order. |
| Setup restraint | 9 | Very little prose; no distracting panels or redundant pod statistics. |
| Touch readability and visible affordances | 7.5 | Portrait labels remain readable, but some selectors and compact controls appear undersized. |
| Setup visual polish | 8.5 | Cream, dark teal, and rust form a coherent identity; the model has strong prominence. |
| Gameplay HUD clarity | 7 | Main race status is clear, while secondary indicators compete across the frame. |
| Overall | 8.2 | Strong minimal setup with a few usability and presentation details to resolve. |

## What works

- All four setup sizes preserve the requested hierarchy, with the full primary action visible in every supplied frame.
- The pod is the dominant visual subject. Its portrait presentation fits within the stage without obvious clipping; landscape compositions leave room for its long silhouette.
- Selected tabs and options are immediately distinguishable. The rust Race button is the strongest action without needing supporting copy.
- The responsive placement of the pod name avoids crowding the model. The consistent colors and typography make the setup feel authored and cohesive.

## Actionable issues — priority order

1. **Enlarge the compact option targets and pod selector affordances.** In the two short landscape frames, difficulty and lap controls appear small and tightly packed; the pod arrows also look narrow, including in portrait. Preserve the labels and arrangement, but provide visibly comfortable touch targets and spacing. Invisible hit areas cannot be judged from these screenshots.

2. **Reduce competing secondary information during battle.** The gameplay frame simultaneously displays a hit banner, impact marker, several mine markers, a route-distance panel, an airborne/landing panel, a vertical progress indicator, and the speed/resource cluster. Consolidate related contextual information and suppress lower-priority labels when several events overlap. Keep the main lap, time, position, and driving information easy to find.

3. **Make the compact rotation hint less fussy.** In both short landscape frames, “DRAG TO ROTATE” wraps into a tiny two-line label between thin decorative arrows. Keep it on one legible line with a simpler gesture cue, or show the instruction only when first needed. The current treatment is more intricate than the rest of the setup.

4. **Give “MORE +” a clearer secondary-control treatment.** It sits at the far lower-left, visually detached from the centered setup controls, especially on desktop and portrait. A small, consistent outlined or icon-backed control would make its tappable nature clearer without adding explanatory text.

These changes do not require another setup panel, more descriptive copy, or a different page structure.
