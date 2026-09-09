# Inkstorm UI gauntlet 2 implementation and evidence

All screenshots below are local evidence from 6 September 2026. The world art remained under concurrent development during these captures. This document does not grade world quality or establish full-lap handling/performance acceptance.

## Changes after blind UI review 1

- Fixed events now replace irrelevant selectors with one exact launch summary: actual lap count, stock machinery, selected event subtitle and a plain explanation of Workshop availability. Open Expedition retains the existing editable mode/AI/lap controls.
- Drift, boost, heat and damage have a shared dark backing, thicker tracks, larger cream labels and visible percentage values. Heat/damage are above the backing in the stacking order. Redline is transient while active/hot. Airborne text also has a small backing.
- Workshop now leads with effective net modifiers from the authoritative workshop summary, including synergies. Default pod values are cooling -9%, armour 0%, boost +18%. Each candidate shows current-to-candidate effects and an explicit Equip Part action; contributors remain expandable. Added Done / Back to Hangar and immediate-application feedback.
- Results name the completed event and label record time as TOTAL. Replay entries have a play affordance, and Next Event includes the destination. The contradictory photo-finish/record screenshot fixture was replaced with separately coherent event fixtures.
- Raised supporting text contrast and retained the core cream/coral/indigo art language. Added restrained cut corners to hero and selected vehicle.
- Updated original capture/selector preview count to five (four class portraits plus one inspected craft), and capture waits for the actual selected DOM marker after vehicle click.

## Actual built-app evidence

- `output/playwright/inkstorm-ui2-actual-garage.png`: real initial Time Attack menu, stock one-lap launch summary.
- `output/playwright/inkstorm-ui2-actual-workshop.png`: real Open Expedition Workshop, effective totals and candidate comparisons.
- `output/playwright/inkstorm-ui2-actual-bright-race.png`: actual rendered world and HUD; diagnostic course positioning at 0.08, 240 simulation ticks. This is a staged camera/state sample.
- `output/playwright/inkstorm-ui2-actual-canyon.png`: actual rendered world and HUD; diagnostic course positioning at 0.46, 240 simulation ticks. This is a staged camera/state sample.
- `output/playwright/inkstorm-ui2-actual-canyon-720.png`: same actual-app diagnostic path at 1280x720.
- `output/playwright/inkstorm-ui2-actual-finish-staged.png`: actual app finish preset; explicitly staged results, no personal record created.

The earlier `inkstorm-ui2-actual-race.png` was a real keyboard-throttle run that wrecked, and exposed a resource-backing stacking defect. It is retained as an intermediate failure, superseded for readability by the final bright/canyon screenshots.

## Interactive checks

Real DOM clicks selected Open Expedition, opened Workshop, equipped R-44 Balanced Ion Drive, and closed with Done. The equipped DOM and effective totals changed correctly (top speed +6%, cooling -2%, armour +4%). Start Race entered the real race; W throttle advanced gameplay. Browser recorded zero runtime errors; initial warnings were the browser's AudioContext gesture requirement.

## Supplemental controlled fixtures

These deliberately use the UI-only harness to make record/photo-finish facts inspectable; they are not completed player races or world screenshots.

- `output/playwright/inkstorm-ui2-fixture-timeattack-result.png`: one-lap Time Attack player total, best lap, record total and sum of three sectors all equal 91.680 seconds. No unrelated championship/AI finish table appears.
- `output/playwright/inkstorm-ui2-fixture-photofinish.png`: winner 184.130, player 184.177, table difference 0.047 seconds, photo-finish gap 0.047 seconds. The replay detail states that same deficit.

TypeScript, production build and all 21 UI tests passed. Tests now cover net Workshop values and candidate effects. UI/scripts diff checks pass. All browser sessions and both local servers opened for this UI verification were closed when finished.
