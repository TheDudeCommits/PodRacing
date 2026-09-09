# Inkstorm UI gauntlet — fresh blind review 2

Date: 2026-09-06

**Verdict: FAIL for a premium UI release in the supplied states.** The overall visual system is coherent and the garage, workshop, and result panels are credible release work. Two safety-relevant racing cues still need presentation fixes: stacked threat markers obscure one another at 720p, and the airborne/landing message lacks reliable contrast on a bright track. These are UI findings, not judgments about world quality or runtime correctness.

## Scope and evidence

This review inspected only the eight supplied images: the approved `docs/art-direction-2026-09-06/B-inkstorm.png` target, five actual UI captures, and two explicitly synthetic fixtures. No source code, previous reviews, browser, or runtime was inspected. The finish capture is explicitly staged; it demonstrates presentation, not organic race completion. The synthetic fixtures demonstrate layout and copy states only.

Scores are visual judgments on a 0–10 scale. State consistency means visible naming, selection, and presentation consistency; it does not certify state transitions or data correctness.

| Evidence | Hierarchy | Readability | Action clarity | State consistency |
| --- | ---: | ---: | ---: | ---: |
| `inkstorm-ui2-actual-garage.png` | 8.5 | 7.5 | 8.5 | 8.5 |
| `inkstorm-ui2-actual-workshop.png` | 8.5 | 8.0 | 8.5 | 8.5 |
| `inkstorm-ui2-actual-bright-race.png` | 8.0 | 6.5 | 7.0 | 8.0 |
| `inkstorm-ui2-actual-canyon-720.png` | 7.5 | 6.0 | 6.5 | 8.0 |
| `inkstorm-ui2-actual-finish-staged.png` | 8.0 | 8.0 | 8.5 | 8.5 |
| `inkstorm-ui2-fixture-timeattack-result.png` — synthetic | 8.5 | 8.0 | 8.5 | 8.5 |
| `inkstorm-ui2-fixture-photofinish.png` — synthetic | 8.5 | 8.0 | 8.5 | 8.5 |

Actual-capture averages: **hierarchy 8.1, readability 7.2, action clarity 7.8, state consistency 8.3**. Synthetic fixtures are excluded from those averages.

## Remaining critical defects

1. **Threat-marker collision at 1280×720.** In `inkstorm-ui2-actual-canyon-720.png`, the three circular danger indicators beside the right engine form an overlapping cluster at approximately x=940–1005, y=475–535. Their direction arrows crowd one another, and the small black text strips overlap; “INCOMING L…” is visibly interrupted while “HEAT VENT” competes for the same space. These are urgent driving signals, so this is a release blocker even though the rest of the HUD fits. Separate colliding indicators with a minimum screen-space distance, or combine nearby threats into one prioritized indicator with a count. Keep direction and threat type legible without requiring the player to decipher tiny overlapping labels. Verify with the same three simultaneous threats at 1280×720.

2. **Airborne/landing cue is unreliable against the bright course.** In `inkstorm-ui2-actual-bright-race.png`, “AIRBORNE,” “16.9 M CLEAR,” and especially “LANDING // BRACE” sit directly over a pale orange road near the right engine. The coral landing copy and cream clearance copy have weak separation from the scene. The landing instruction is small and widely tracked, so it is easy to miss beside the much stronger speed readout. Add a compact dark backing or a comparably dependable contrast treatment, and give the immediate landing action a more readable size. Verify against the brightest track and sky as well as darker canyon surfaces.

## What works

- Cream condensed headings, ink backgrounds, vermilion accents, and cyan technical states carry a consistent authored identity across the interface. The typography and restrained race corner anchors relate clearly to the approved target. This is a UI comparison only; the reference's scenery and vehicle rendering are outside scope.
- Garage selection is unmistakable: the outlined and underlined vehicle card, large vehicle name, visible stat bars, selected challenge treatment, and orange Start Race button give the player a clear path. Event rules explain that stock parts are fixed, and the nearby workshop control looks unavailable in that state.
- Workshop equipment state is particularly clear. The current part has an explicit “Equipped” label, a distinct backing, and a strong border. Alternatives say “Equip Part,” show tradeoffs, and preview changes to the effective build. “Changes apply immediately and save on this device” removes uncertainty about committing an edit.
- Race position, lap, and speed remain visually dominant. The opaque director card stays readable on both supplied course backgrounds, and the resource panel has stable label placement and numerical values.
- Results use a clear headline, a strong highlighted player row, explicit replay affordances, and a prominent Race Again action. The synthetic photo-finish fixture correctly distinguishes the second-place player from the winner and gives a precise deficit. The synthetic time-attack fixture provides actionable next-run feedback and sector deltas.

## Nonblocking polish

- Garage manual labels, workshop comparison deltas, replay timestamps, and result footer hints are small. They can be read in a static capture, but some feel closer to administrative fine print than premium game UI. Enlarge the most useful supporting text or remove redundant wording to create room.
- “Circuit / Race order / 1 / 8” repeats the position information in a comparatively large box without showing further competitors in these captures. Its visual weight would be more justified by useful nearby-rival information or a leaner collapsed presentation.
- In the staged finish, “TAKEDOWN” is repeated as category, headline, and replay-card title. The panel remains usable, but named descriptions would make individual highlights easier to choose. This is copy refinement, not evidence of a broken replay system.
- The staged eight-driver result panel uses nearly the entire 900px height and has an internal scrollbar. Both primary exit actions are visible in this capture. Result layout at 720px height was not supplied, so no smaller-height result acceptance is implied.
- The time-attack fixture mixes milliseconds in `1:31.680` with hundredths in `TOTAL 1:31.68`. Consistent precision would improve the race-timing presentation.

## Release condition

Resolve the overlapping threat cluster and the bright-background landing cue, then provide matched 1280×720 canyon and bright-track HUD captures with those cues active. No other blocker is visible in the supplied menu, workshop, or result images. A passing UI review would still not establish world-art parity, functional replay behavior, accessibility, mobile coverage, or runtime race-state correctness.
