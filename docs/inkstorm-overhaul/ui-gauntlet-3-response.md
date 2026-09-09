# UI gauntlet 3 evidence

Date: 2026-09-06

The two blockers from the second blind UI review are addressed in the actual HUD.

- Threat cues now rank by urgency, combine intersecting screen regions into the highest-priority direction, display the additional threat count, and show at most three regions. Their 168×44px dark labels replace overlapping circles and tiny external text. The pulse changes the border glow without expanding the hit region. The right instrument and airborne-message areas are reserved. The source model has no distance field, so priority uses actual urgency and a stable ID tie-break.
- The airborne panel has an opaque `#20283d` backing, a 20px clearance readout and a 13px cream landing instruction. It overrides the old inherited translation and two-column grid, keeping its right anchor and labels predictable.

## Actual runtime captures

Both images are 1280×720 captures of the production build through the real game review API. They use the diagnostic course-seek feature, then advance the simulation 240 fixed steps. They are evidence of runtime HUD presentation, not organically completed races or performance acceptance. No HUD fixture or injected hazard model was used.

| Image | Runtime state | Observed layout |
| --- | --- | --- |
| `output/playwright/inkstorm-ui3-actual-canyon-720.png` | Course progress 0.46, chase camera, 2 seconds of simulation | Four nearby dangers combine into `INCOMING LANCE +3`, x=846, y=473.6, width=168, height=44. The leader is the actual 91% urgency lance. |
| `output/playwright/inkstorm-ui3-actual-bright-720.png` | Course progress 0.08, chase camera, 2 seconds of simulation | Two separate threat regions, with a 48px horizontal gap between label rectangles. Airborne 16.9m clearance and descending instruction are visible in an opaque panel at x=1032, y=349.1, width=216, height=90.9. |

The UI test suite passes all 24 tests across four files, including crowded-region merging, separated bearings, rear bearing wrap and clearance from the airborne panel. Typecheck, production build and `git diff --check` pass. Vite still reports its existing large-bundle advisory. Browser console showed zero errors and the existing pre-gesture audio warnings. The named browser session was closed immediately after capture; its preview server on 5192 was stopped.

These results require a fresh blind visual review. They do not establish world-art parity, frame-rate compliance or release acceptance.
