# Actual Inkstorm visuals — Round 35 / V31

**These are actual local V31 images. Visual acceptance remains FAIL:** crash 5/10; HUD style/readability 6.5/7. The exact build passes functional checks and measured full races average 59.5/59.0 Hz on M4. [Full scope and evidence](ROUND35_UI_COMBAT_HANDOVER.md).

## Actual crash

[Play the straight 4.96-second native excerpt](../../output/playwright/round35-combat-v31/temporal-review/v31-native-crash-excerpt.mp4) · [Timing/provenance](../../output/playwright/round35-combat-v31/temporal-review/short-clip-receipt.json) · [Visual review](../../output/playwright/round35-combat-v31/VISUAL_REVIEW.md). No retiming/overlays; 25 fps recording is not engine FPS. Dust is softer than the rejected solid V30 mounds, but faint beneath the engine and insufficiently forceful.

![Actual V31 debris-return frame, still below art target](/Users/amir/Projects/PodRacing/output/playwright/round35-combat-v31/temporal-review/debris-return-pts11.60.png)

[Separate actual high-speed review](../../output/playwright/round35-combat-high-speed-v31/visual-supplement/VISUAL_SUPPLEMENT.md) records forward wreck travel, trailing dust and real foreground-rock occlusion. It does not replace the primary comparison or its score.

## Actual driving interface

![Actual V31 native HUD](/Users/amir/Projects/PodRacing/output/gauntlet/round35-broadcast-native-v31/06-desktop-live-race.png)

[Build](../../output/gauntlet/round35-broadcast-native-v31/03-desktop-build.png), [map](../../output/gauntlet/round35-broadcast-native-v31/02-desktop-map.png) and [garage](../../output/gauntlet/round35-broadcast-native-v31/01-desktop-garage.png) remain byte-identical V27–V31. [Fresh UI review](../../output/critics/blind-hud-v31/cli-critic-attempt1/review.md). No menu-score variation is treated as implementation progress.

## Actual compact post-GO warnings

RaceTime 2.0167–2.10, countdown hidden, ordinary controller and actual impact/mine warnings. [53-check audit](../../output/critics/blind-hud-v31/COMPACT_POST_GO_RAW_AUDIT.json).

![Actual V31 compact post-GO warning opportunity](/Users/amir/Projects/PodRacing/output/playwright/round35-compact-warning-native-v31/native-compact-warning.png)

The separate [GO-active opportunity](../../output/playwright/round35-compact-go-warning-native-v31/receipt.json) is **UNAVAILABLE with no image**. V31 has no native GO-clearance or full INCOMING LANCE claim. Its caption wrapping passed component cases; the V30 overflow remains historical evidence.

## Ivory — actual Blender source previews, not gameplay

The material-finish copy adds engine bands, a cockpit stripe and driver shoulder accents while preserving the source's original pilot, fitted controls and geometry. Fresh paired review scores it 5.5/10 overall and 4/10 for materials: FAIL against 8. No atlas/export/runtime admission. [Source review](../../assets/source/inkstorm/blockrunner-ivory-round34/material-finish-v1/HANDOFF.md) · [Unmodified blind critique](../../output/critics/blind-ivory-material-v1/cli-critic-attempt1/review.md).

![Actual Ivory source finish, full craft](/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-ivory-round34/material-finish-v1/ivory-finish-v1-fullcraft.png)

![Actual Ivory source finish, original pilot and fitted controls](/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-ivory-round34/material-finish-v1/ivory-finish-v1-driver.png)

## Generated targets — not gameplay

Concept 19 guides the ground cloud. Actual V31 does not yet meet it. [Notes](concepts/19-ground-strike-volume-v30-target.md) · [Provenance](concepts/19-ground-strike-volume-v30-receipt.json).

![Generated ground-strike target](/Users/amir/Projects/PodRacing/docs/inkstorm-overhaul/concepts/19-ground-strike-volume-v30-target.png)

Concept 20 studies an open speed outline and compact alert/resource rows. Generator reconstruction and omissions do not authorize dropping live data or altering source geometry. [Notes](concepts/20-clean-driving-instruments-v31-target.md) · [Provenance](concepts/20-clean-driving-instruments-v31-receipt.json).

![Generated driving-instrument target](/Users/amir/Projects/PodRacing/docs/inkstorm-overhaul/concepts/20-clean-driving-instruments-v31-target.png)

Concept 21 guides restrained worn paint and broader orange markings on the existing Ivory source surfaces. The generated image does not authorize geometry reconstruction. [Notes and provenance](concepts/21-ivory-worn-paint-target.md).

![Generated Ivory material target, not an actual render](/Users/amir/Projects/PodRacing/docs/inkstorm-overhaul/concepts/21-ivory-worn-paint-target.png)

[Current implementation](ROUND35_UI_COMBAT_HANDOVER.md) · [Exact former V30 gallery](evidence/round-35/pre-v31-documentation/CURRENT_VISUALS.md) · [Complete older gallery](evidence/round-35/pre-v29-documentation/CURRENT_VISUALS.md).
