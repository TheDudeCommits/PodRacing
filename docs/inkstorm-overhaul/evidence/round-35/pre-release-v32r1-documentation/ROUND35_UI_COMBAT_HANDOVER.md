# Round 35 — current V31 UI and combat handover

**V31 passes local functional and performance checks; visual acceptance remains FAIL.** Bundle `index-CON7YNy8.js`, **1,860,357 bytes**, SHA-256 `c9e1cf4e6c2c3d3d64ec048bbc682925823757d04f8c26e6aa7516ae92990915`. [Verification](../../output/reference-ui-round35/verify-v31.log): TypeScript/build and **923 tests / 155 files** pass. [Source/dist freeze](../../assets/source/inkstorm/combat-round35/v31-frozen-bundle/inventory.json).

## Admitted changes

[Central admission](../../assets/source/inkstorm/combat-round35/v31-central-admission/receipt.json) combines six exact targets: five production files and one existing test. The prior V30 camera, controls, countdown reservation and flame atlas remain unchanged.

- [Driving HUD](../../output/critics/ui-driving-hierarchy-v31/HANDOFF.md): an open cream speed loop ends above the three resource rows. Full flight/landing, launch-result/cause and drift messages use shorter local rows. Full warning captions can wrap within their existing cue bounds. High-contrast protection, live speed/resource bindings, complete wording and accessible hooks remain. Matched desktop feedback height fell from 179.66 to 135.06 px; narrow from 180.27 to 159.27 px. Component coverage includes 87 warning cases and 108 resource readings; it is not native universal warning acceptance.
- [Porous contact billows](../../assets/source/inkstorm/combat-round35/v31-contact-billow-preparation/HANDOFF.md): five actual rear-contact parents now drive two yaw-facing soft cloud cards each. Same one owned mesh, 40 parents / 80 cards maximum, **20 triangles per contact / 160 capacity**. They depth-test against scenery and casing, do not write beauty depth and do not enter opaque ink prepasses. Nine fixed terrain probes per parent give **45 probes per changed-age contact / 360 at capacity**, with zero on held-age camera yaw. Preallocated buffers and stable far-to-near ordering avoid per-frame object allocation. Source witnesses, lifetime, recovery/reset ownership and simulation authority remain unchanged. Existing component depth checks prove nonvacuous foreground/terrain occlusion; they do not accept the native appearance.

The fixed flame PNG remains SHA-256 `f14657a3388bf9618d0206806c7b9c54856bd7f54c98596ea1790d85c97dd4c5`. It is not recolored or resized. Camera numerical framing and component cloud coverage are not measured native FOV or concept matching.

## Native controls and interface

[Four native cases](../../output/playwright/round35-combat-v31/receipt.json) pass actual chase, manual camera, reduced motion and pause cancellation. [Separate high-speed case](../../output/playwright/round35-combat-high-speed-v31/receipt.json) observes **224.4494698 m/s** at frame 931, wreck 934 and cue 935, a 33.4 ms gap, null source/credit and resumed W-drive 77.86786 m. Clock ratios are approximately 1 → .192322 → 1. Both browsers/servers closed with empty errors.

[Independent controls audit](../../output/playwright/round35-combat-v31/native-independent-audit/NOTE.md) recomputes all five analyses from **1,517 raw samples**. Five atlas boot fetches and 33 stored ready snapshots pin the original image. Raw observers have no atlas/FOV fields, so no continuous-ready or measured-lens claim follows. Harmless running HUD-marker tails at frames 1359/1381 have no cue/matte/feedback/damage; they remain in the evidence.

[UI receipt](../../output/gauntlet/round35-broadcast-native-v31/receipt.json) passes **17 captures, 60 ordinary part equip/restores, 30 grouped total rows and seven functional motion traces**. [Independent review](../../output/critics/blind-hud-v31/REVIEW_COMPLETE.json) retains **3,885 native checks, 450 grouped-row checks and 18 critic-protocol checks**. Maximum center spread is .0078125 px against 3 px. These traces do not prove every-frame paint, physical touch or perceptual animation quality.

[Compact post-GO scenario](../../output/playwright/round35-compact-warning-native-v31/receipt.json) passes at raceTime 2.0167–2.10 with countdown hidden and actual impact/mine warnings. [53-check audit](../../output/critics/blind-hud-v31/COMPACT_POST_GO_RAW_AUDIT.json). The [separate GO-active opportunity](../../output/playwright/round35-compact-go-warning-native-v31/receipt.json) is **UNAVAILABLE with zero captures** under its unchanged 12-second bound. Its six provenance checks establish faithful unavailability only. There is no V31 GO image, GO-clearance claim or native INCOMING LANCE proof; preserve the historical V30 overflow separately.

## Actual imagery and fresh critics

[Straight native crash excerpt](../../output/playwright/round35-combat-v31/temporal-review/v31-native-crash-excerpt.mp4): **4.96 seconds / 124 frames**, source frames 256–379 inclusive, sample PTS 10.24–15.16, exclusive end 15.20. No retiming or overlays. The 25 fps recording is not engine FPS. [Media receipt](../../output/playwright/round35-combat-v31/visual-review-receipt.json) · [Visual review](../../output/playwright/round35-combat-v31/VISUAL_REVIEW.md).

All **184 consecutive frames** and six phases plus adjacent cut/return images were reviewed. First cut 264/10.56 follows ordinary frame 263/10.52; ordinary return 371/14.84 follows protected frame 370/14.80. The [fresh unchanged seven-image critic](../../output/playwright/round35-combat-v31/blind-critic/cli-critic-attempt1/review.md) scores **5/10**, with framing 6, impact 4, HUD 5 and excitement 4. [Raw protocol audit](../../output/playwright/round35-combat-v31/blind-critic/RAW_AUDIT.json). Dust is softer than V30 but too faint beneath the engine; the large pieces look neatly arranged. Concepts and implementation opinions were not supplied to the critic.

The [separate high-speed supplement](../../output/playwright/round35-combat-high-speed-v31/visual-supplement/VISUAL_SUPPLEMENT.md) reviews 185 consecutive frames. It shows 808 KPH immediately before the actual cut at frame 278/11.12, forward wreck travel, trailing dust/grit and real foreground-rock occlusion. Camera returns at 383/15.32, ordinary HUD at 384/15.36. The original wall-based locator miss remains preserved: receipt wall 15.153 is not source video PTS. This supplement does not replace the primary critic or produce a new score.

[Fresh UI critic](../../output/critics/blind-hud-v31/cli-critic-attempt1/review.md): **HUD 6.5/7, Build 7/8, map 7/8, garage 7.5/7.5 — FAIL against 8**. The equipment and speed instruments still use different visual families. Menu PNGs are byte-identical V27–V31; changed menu scores are reviewer variation. Original seven-image prompts and references remain unchanged.

## Exact-build performance

[Full summary](evidence/round-35/full-race-v31-summary.json) includes **every non-null racing RAF interval**, including post-player classification grace, without warmup/interior exclusions. Chrome 153 / ANGLE Metal Apple M4, 1440×900, requested DPR2 adaptive; no screenshots/recording during collection.

| Race | Samples / duration | Mean Hz | p95 / p99 ms | Max ms | >25 / >50 ms |
|---|---:|---:|---:|---:|---:|
| Time Attack | 3,797 / 63,797.4 ms | 59.516532 | 16.8 / 16.8 | 33.4 | 31 / 0 |
| Cup round 1 | 8,126 / 137,727.8 ms | 59.000434 | 16.8 / 33.3 | 50.0 | 137 / 0 |

Actual DPR ranges are 1–2 / 1.875–2; max calls 100/254 and triangles 4,932,659/5,049,901. These are this device/build's RAF measurements, not physical scanout or other-device acceptance.

[Isolated crash cadence](../../output/playwright/round35-combat-cadence-v31/receipt.json) retains 58/49/54 before/cinematic/return intervals, approximately 60 Hz, p95/max ≤16.8 ms, none >25 ms. [Full-race receipt](../../output/playwright/round35-ui-combat-full-race-v31/receipt.json) verifies PB/ghost/results and Cup continuation. All four filesystem comparisons match build/source/public/dist/harness/config/tests. Adapter/wrapper cleanup closes owned port 58526 and process group 77709 with no residuals. Unrelated port 5211 was never adopted or signalled. Performance does not accept the failed art target.

[Independent raw performance audit](../../output/playwright/round35-ui-combat-full-race-v31/native-independent-audit/NOTE.md) reproduces both races, cadence, all six retained artifact boundaries across seven categories, build/atlas lineage and cleanup. Cup contains one exactly 50.0 ms interval and none greater than 50 ms.

## Fleet, next work and history

[Ivory palette copy](../../assets/source/inkstorm/blockrunner-ivory-round34/paint-copy-v1/HANDOFF.md) is now actually authored: **57 objects, 53 meshes, 44,028 triangles and nine new role materials** in scene 164. Two matched neutral driver/fullcraft renders preserve the original pilot, fitted controls, all prior scenes/context, geometry, normals, UVs and own source lineage. The mixed container still has 700 body + 4,128 pilot faces. This first palette is flat, its orange accent weak and visor plain. **No atlas, export, registry/public change or fifth-family admission.** Four of 26 preserved families are registered; 22 remain pending.

[Ivory material finish V1](../../assets/source/inkstorm/blockrunner-ivory-round34/material-finish-v1/HANDOFF.md) adds an actual 165th scene with nine copied finish materials, orange engine/front bands, a rear cockpit stripe and shoulder accents. Two matched neutral renders retain all 164 prior scenes/context, exact geometry and source masks. [Fresh five-image paired critic](../../output/critics/blind-ivory-material-v1/REVIEW_COMPLETE.json) scores palette→finish: materials 4→4, surface readability 5→5, driver 5→5.5, overall 5→5.5 and target closeness 4→5. Both FAIL against 8. No atlas, UV bake, export, public change or shared save. All render jobs closed.

[V32 ability-frame note](../../output/critics/ui-ability-family-v32/DESIGN_NOTE.md) guides private CSS preparation. No V32 source/native/performance admission. Existing compact E/Q/F captions do not follow settings remaps; that separate UI bug remains open. [Concept 19](concepts/19-ground-strike-volume-v30-target.md) and [concept 20](concepts/20-clean-driving-instruments-v31-target.md) are generated targets, not gameplay. Broader world, fleet, physical controller/device, audio and multiplayer acceptance remains open.

Private V32 work also covers [per-piece measured presentation-support cues](../../output/playwright/round35-combat-v31/NEXT_CRASH_PROPOSAL.md) and a separate actual-feedback reservation for the reproduced 844px warning/drift collision. These candidates do not inherit V31 acceptance. [Concept 21](concepts/21-ivory-worn-paint-target.md) is a generated Ivory material target from its actual source renders; a new material copy was authored separately from the runtime.

Work in `/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`, HEAD `0f0e8ab209cc5156efaf92b545630bd243b14478`. Preserve dirty/untracked work. No overhaul commit, push or deployment. [Exact former V30 front doors](evidence/round-35/pre-v31-documentation/inventory.json) · [Complete older handover](evidence/round-35/pre-v29-documentation/ROUND35_UI_COMBAT_HANDOVER.md). Close owned browsers immediately; never save the shared Blender file or touch unrelated port 5211.
