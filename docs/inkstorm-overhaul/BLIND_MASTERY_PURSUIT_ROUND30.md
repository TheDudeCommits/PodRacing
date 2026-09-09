# Blind mastery and pursuit UI review — round 30

## Scope and verdict

Reviewed the five supplied actual screenshots individually, without reading source, receipts, implementation descriptions, or an art concept. This is a still-image comprehension review. It does not establish interaction behavior, animation, audio, responsiveness during play, or FPS.

**Verdict: the replay goal is understandable and the main actions are clear, but the mastery information needs two corrections before a clean comprehension pass: disambiguate the result row's “BEST” and explain the scope of the live PB gap.** Small comparison text and a weakly presented target split also limit usefulness.

Evidence:

- `output/playwright/mastery-pursuit-round30/pursuit-results-1440.png` — 1440 × 900 result screen.
- `output/playwright/mastery-pursuit-round30/pursuit-results-1280.png` — 1280 × 720 result screen.
- `output/playwright/mastery-pursuit-round30/pursuit-garage-1280.png` — 1280 × 720 preparation screen.
- `output/playwright/mastery-pursuit-round30/pursuit-sector.png` — 1440 × 900 race HUD.
- `output/playwright/mastery-pursuit-round30/baseline-results.png` — 1440 × 900 initial best result screen.

## Findings, in priority order

### P1 — “BEST” conflicts with the apparent personal-best story

Both pursuit result screenshots show the current finish as `1:08.783` and label the adjacent value `BEST 1:08.783`. The baseline result shows `NEW PERSONAL BEST` and `1:03.316`, while the garage separately displays `PERSONAL BEST 1:03.31`. The pursuit summary explicitly compares the slower run with a “previous PB.”

As a player, I cannot tell whether “BEST” means my retained personal best, this event's best lap, or this entrant's best time in the current session. Its unqualified wording makes the slower time look like a replacement personal best. This undermines confidence in the comparison even though the sector deltas appear coherent.

**Recommendation:** show the retained `PERSONAL BEST 1:03.316` beside `THIS RUN 1:08.783`, preferably with the total difference. If the row intentionally reports a different kind of best, name that scope explicitly.

### P2 — The live gap does not explain which pace it measures

The race still presents elapsed time `0:08.45` beside `PB +0.492`. The sign and coral color suggest a loss, but nothing visible states whether the value is cumulative race pace, the last completed sector's delta, or a current-sector comparison. The much larger position, lap, and speed are immediately readable; the PB comparison is a small secondary value against a similarly warm cliff.

**Recommendation:** label the value according to its actual meaning, for example `LAP GAP +0.49s` or `S1 +0.49s SLOWER`. Give this comparison a more consistently dark backing or stronger contrast. If a completed-sector notification appears elsewhere in motion, this still cannot verify it.

### P2 — The pursuit names a useful target, but makes the player derive the split to beat

The result message is concrete: `NEXT PURSUIT · Sweeper · S4 · +1.17s against your previous PB. Race again to recover this section.` The garage carries the same sector and loss forward. This is a meaningful reason to retry.

However, the result grid shows the present S4 split (`0:08.20`) and its loss (`+1.167`), without placing the PB split beside them. The earlier baseline screenshot shows S4 `0:07.03`, but a player should not need that previous screen or subtraction to understand the next target. The grid also gives the target tile essentially the same treatment as every other sector.

**Recommendation:** make the target self-contained: `S4 · Sweeper — 8.20s this run / 7.03s PB. Recover 1.17s.` Visually emphasize S4 in the grid. This would make the current action clearer without claiming that the UI already knows which driving technique caused the loss.

### P2 — Sector comparison text is small and dense at both supplied result sizes

The medal, victory heading, primary action, and total time have useful separation. In contrast, sector names and tightly packed split/delta rows require deliberate reading. The 1280 × 720 result fits the viewport with no visible clipping, but the result footer is close to the bottom and the compact type leaves little room for comfort. The larger screenshot retains similarly small sector tiles rather than using its extra screen area to improve that information.

Repeated labels such as `OPEN STRAIGHT` and `RECOVERY STRAIGHT` are distinguishable through S1–S10, so the numbering is valuable. Positive and negative signs also preserve some meaning beyond color. The baseline's dash values, however, have no visible explanation.

**Recommendation:** increase the sector text size, use a predictable column structure, and add a compact comparison label such as `SECTOR TIME / VS PERSONAL BEST`. In the baseline state, replace unexplained dashes with a short `First recorded run` or `Baseline set` explanation if that is the intended meaning.

### P3 — Terminology and replay presentation add minor uncertainty

The in-race route cue says `FAST STRAIGHT`; the results use `OPEN STRAIGHT`. The stills do not prove these refer to the same route segment, but they do not establish how the vocabulary relates. Consistent names would make it easier to connect a named weakness with a location while racing.

The lower result area repeats `CLEAN RACE`, `FINISH`, and `YOU` in a large status panel and a smaller `REPLAY · CLEAN RACE` card. The card's play triangle helps distinguish watching from `RACE AGAIN`, but `FINISH` does not tell the player why this replay is worth watching. No visible connection links the replay card to the targeted Sweeper section.

**Recommendation:** reduce repetitive finish status and use a descriptive replay label. If a sector replay exists, name it `Watch S4 · Sweeper`; otherwise label the current card plainly as a finish replay. Use one location vocabulary, or explain the distinction between a driving cue and a sector name.

## Individual screenshot assessment

### Pursuit results — 1440 × 900

- Strong first read: `VICTORY`, `RACE AGAIN`, and `GOLD MEDAL` are unmistakable.
- The dark central panel isolates text effectively from the busy track background.
- The pursuit sentence supplies a specific sector and recoverable loss; it is more actionable than a generic retry prompt.
- The mastery content is subordinate to a very large victory treatment and repeated finish panels. The split grid deserves more space and emphasis.
- `TOTAL 1:08.78` versus the row's `1:08.783` changes precision. This is a minor consistency issue; the meaning of `BEST` is the material one.

### Pursuit results — 1280 × 720

- The entire result is visible, including both actions and the replay card; there is no visible overlap or truncation.
- The primary action remains easy to find and large enough to read.
- Sector names, times, deltas, and the keyboard footer are small. The pursuit sentence remains readable at rest but is not prominent enough to be the main second-glance takeaway.
- The same ambiguous `BEST` value remains present.

### Pursuit garage — 1280 × 720

- `START RACE` is the strongest action and sits with the selected event's rules. The selected `INKSTORM · TIME ATTACK` event is visibly highlighted.
- `PERSONAL BEST 1:03.31`, the Sweeper pursuit, and `Ghost ON` form a sensible preparation group.
- The pursuit is useful but comparatively faint and small, between a strong PB number and two buttons. The target split is absent.
- The screen is dense with craft choices, a flight manual, event navigation, race setup, and online controls, but its columns and separators keep these regions recognizable.
- Two selection systems are visible: small `FRAME` options and four craft cards. `Same handling` helps with the former, although a novice may still need time to understand their relationship. This is secondary to the replay-goal task.

### Pursuit sector — race HUD

- The road and vehicle dominate; the HUD leaves the central view open.
- Position, lap, elapsed time, and `450 KPH` are easy to locate. The bottom-right status group is organized and legible at rest.
- `PB +0.492` exposes a comparison, but its scope and meaning are under-labeled. The supplied frame does not visibly identify `S1`, a completed split, or the S4 pursuit target.
- The arrow, `297 M`, and `FAST STRAIGHT` supply a forward cue, though the smallest route text requires attention.
- No conclusion about whether players can read this while driving is possible from this still.

### Baseline results

- `NEW PERSONAL BEST` clearly communicates progress and offers a natural reason to race the ghost next.
- The initial sector record is visibly complete across S1–S10.
- The dashes beside every split lack a first-run explanation. A short baseline message would make their meaning clear.
- `Race your ghost or enter the Inkstorm Cup` names two future goals, but the visible buttons are `RACE AGAIN` and `BACK TO HANGAR`. The navigation is broadly understandable, though the Cup path takes an inferred step through the hangar.

## Acceptance boundary

**Clear in these stills:** how to start or repeat a race; which event is selected; the existence of a PB and ghost; a named next sector to improve; completion and medal status.

**Not yet clear enough:** what “BEST” means on the slower result; whether the live PB number is lap pace or a sector result; the explicit split to beat in the pursuit; why the displayed finish replay helps the next attempt.

The highest-value next revision is small: resolve the best-time label, explicitly name the live comparison's scope, and present S4's current-versus-PB times together with larger comparison text. Recheck actual stills at both supplied viewport sizes afterward. Interaction and motion acceptance require separate evidence.
