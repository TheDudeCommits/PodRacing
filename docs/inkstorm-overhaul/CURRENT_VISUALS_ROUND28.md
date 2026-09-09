# Inkstorm — current world and generated targets

[Active round29 workshop comparisons](WORKSHOP_ROUND29.md) — local source in progress, separate from the frozen round28 gallery below.

**Latest complete world-review gallery: round28.** These 17 images are byte-for-byte copies of actual renderer captures from `index-CED-RrRq.js`, SHA **`ca752f0a0f3da8e7585dd6c999d7ed5615d56c766c04e4dd767ef07256f1175d`**. The build combines launch shelves and fractured spires, corrected cliff/contact shading, mechanical exhaust mouths and Teemto's V4C blue-gray driver cloth. **563 tests / 99 files**, typecheck/build/diff, zero capture browser errors, and all 14 vehicle lifecycle stages pass.

The fresh [round28 image-only review](BLIND_WORLD_ROUND28.md) is **FAIL, 0/7 sections accepted**. Grid workshops remain vacant, salt shoulders sparse, canyon surfaces repetitive, fork joints unfinished, the launch drop weakly framed, foundry machinery repetitive and the finish underbuilt. The [driver review](BLIND_PILOT_RUNTIME_ROUND28.md) retains the clearer cloth but still rejects garment construction and finish.

Generated concepts are targets, not runtime screenshots. The section harness stages a chase camera in the eight-racer combat profile; ordinary Time Attack hides combat panels. Still images establish neither completed laps nor sustained frame rate.

Both appearances have now completed Time Attack and Canyon Cup with actual Continue on this exact runtime. The detailed [round28 performance report](FULL_RACE_PERFORMANCE_ROUND28.md) separates successful flows from two preserved Sebulba attempts stopped by a floating-point display-oracle error in the test. The narrow test correction changes neither game source nor the driving/cadence controller. Local adaptive racing cadence is about59.8Hz, p95 at most16.8ms; exact raw counts and resolution history belong to that report. This does not change the art failure.

[Implementation and acceptance](STATUS.md) · [Round28 continuous race timing](FULL_RACE_PERFORMANCE_ROUND28.md) · [Historical round26 criticism](BLIND_WORLD_ROUND26.md) · [Historical round26 timing](FULL_RACE_PERFORMANCE_ROUND26.md)

## Starting grid

| Generated target | Round28 staged renderer |
| --- | --- |
| ![Starting grid target](concepts/01-grid.png) | ![Current Starting grid](evidence/round-28/01-grid.png) |

## Salt run

| Generated target | Round28 staged renderer |
| --- | --- |
| ![Salt run target](concepts/02-salt-run.png) | ![Current Salt run](evidence/round-28/02-salt-run.png) |

## Canyon

| Generated target | Round28 staged renderer |
| --- | --- |
| ![Canyon target](concepts/03-canyon.png) | ![Current Canyon](evidence/round-28/03-canyon.png) |

## Fork

| Generated target | Round28 staged renderer |
| --- | --- |
| ![Fork target](concepts/04-fork.png) | ![Current Fork](evidence/round-28/04-fork.png) |

## Launch

| Generated target | Round28 staged renderer |
| --- | --- |
| ![Launch target](concepts/05-launch.png) | ![Current Launch](evidence/round-28/05-launch.png) |

## Foundry

| Generated target | Round28 staged renderer |
| --- | --- |
| ![Foundry target](concepts/06-foundry.png) | ![Current Foundry](evidence/round-28/06-foundry.png) |

## Finish

| Generated target | Round28 staged renderer |
| --- | --- |
| ![Finish target](concepts/07-finish.png) | ![Current Finish](evidence/round-28/07-finish.png) |

## Garage

![Current garage](evidence/round-28/garage.png)

Teemto V4C is shown here; Sebulba is also selectable. Its rival and Sebulba retain their earlier static drivers. All 14 current appearance lifecycle checks pass, including model switching, paused readiness, deliberate download failures/Retry and Teemto graphics-context restoration. Source and in-world art acceptance remain open. There are still 24 catalogue downloads pending and no overhaul deployment.

## Supplemental round28 views

All supplemental PNGs are preserved byte-for-byte beside the seven section views.

| Canyon sequence | Fork sequence | Launch sequence |
| --- | --- | --- |
| [Approach](evidence/round-28/canyon-arch-approach.png), [under](evidence/round-28/canyon-arch-under.png), [beyond](evidence/round-28/canyon-arch-beyond.png) | [Approach](evidence/round-28/fork-approach.png), [after entry](evidence/round-28/fork-after-entry.png) | [Approach](evidence/round-28/launch-approach.png), [crest](evidence/round-28/launch-crest.png), [descent](evidence/round-28/launch-descent.png) |

[Actual short live-drive capture](evidence/round-28/live-drive.png) accompanies the staged set. Its 482 measured intervals averaged60.001743Hz; the full-race report supplies separate sustained-cadence evidence. Raw capture receipts remain in `output/gauntlet/round-28/receipts.json`. [Copy receipt](evidence/round-28/copy-receipt.json) records all17 unchanged image hashes.
