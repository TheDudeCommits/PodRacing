# Gameplay replay regression 2

Date: 2026-09-06, approximately 13:38–13:43 UTC. Existing updated `dist`, dedicated preview `http://localhost:4184`, fresh headed Chromium session `gauntlet-replay-2`, 1280 × 720 viewport throughout the checks.

This is targeted verification of findings from `gauntlet-gameplay-1.md`, not another fresh blind critic. No source code was read. UI clicks and ordinary keyboard input drove all changes. `window.__PODRACING__.snapshot()` was used only to read verification state. No fabricated finish, laps, records, or championship points were introduced.

## Result

**All reachable targeted regression checks passed.** The two prior P1 findings are resolved in the observed flow. No new blocker was found in this bounded pass. A Continue Championship state and scoring carry remain unverified because no round was completed; this is not a full-game or full-release acceptance claim.

| Check | Result | Evidence |
| --- | --- | --- |
| Select Expedition, save, start exact selected course | PASS | Selection produced seed `3683035750`, signature `8bfbcfb2`. Save created Saved • Open Expedition; Start retained that seed/signature and `courseSaved: true`. |
| Saved Expedition after reload | PASS | Reload retained Saved • Open Expedition. Selecting and starting it restored seed `3683035750`, signature `8bfbcfb2`, `courseSaved: true`. |
| Pause Retry preserves course | PASS | Retry event was visible and clicked. Clock reset to 0 and countdown restarted with seed `3683035750` / signature `8bfbcfb2`. |
| Pause Back to Hangar works | PASS | Click returned to the craft/event selection UI; snapshot `awaitingStart: true`. Repeated successfully from Flight School. |
| Launch lesson does not advance without input | PASS | No throttle during countdown or afterward. At race time 4.58 s, speed 000, tutorial remained step 1 / 5, progress 0, incomplete. |
| Launch instruction visible during countdown | PASS | At countdown 3 the tutorial panel visibly said Launch and instructed the player to tap throttle during countdown and keep the rev needle near the marker. |
| Launch can advance using actual input | PASS | Holding W for 2.8 s after the idle check moved the craft, passed Launch/Build Speed and reached Brake before the bend, step 3 / 5. |
| Cup Start and practice context | PASS | Canyon says Cup round 1 of 3, explains points carrying across circuits, and offers Start championship. A fresh selection of Glasslands says Single-round practice, explicitly says no cup points, and offers Practice this round. |
| Cup grid count copy | PASS | Canyon now says Eight-racer grid, matching the started two-lap run's 8-racer HUD. |
| Continue Championship / earned point carry | NOT REACHED | No completed round. No claim about the later Continue state, post-finish scoring, or persistence is made here. |
| 720p hazard-label separation | PASS for reached state | Three visible Scrap Mine cards were separated, including a grouped +1 card. None overlapped another card or the speed panel in the captured state. |
| 720p airborne contrast | PASS for reached state | Airborne card used a solid dark panel with legible orange label and cream altitude/landing copy against bright desert. It was separated from the speed panel and training instruction. |

## Reproduction details

The course identity sequence was exactly: choose Open Expedition in fresh hangar → read seed/signature → Save course → Start Race → read identity → pause → Retry event → read identity and clock → reload → choose Saved • Open Expedition → Start Race → read identity. This exercises the previously failing pre-start save case, not just saving a completed course.

The pause dialog now identifies the event and includes **Resume**, **Settings**, **Retry event**, and **Back to Hangar**, followed by: “Retry repeats this course. Back to Hangar ends this attempt.” Back to Hangar was actually clicked and confirmed, rather than inferred from the button's presence.

After countdown with no input, the Launch instruction changes helpfully to “Hold throttle to launch. On your next attempt, tap throttle during the countdown to prime the engines.” The stage remains incomplete until actual throttle input.

Cup Glasslands still has its narrative “Final round” subtitle, but an adjacent visible block now distinguishes practice from the championship sequence and explains that practice does not add cup points. Canyon's primary action is Start championship. Starting it launched a two-lap eight-racer run. I did not complete it or inspect an earned Continue state.

## Screenshots

All are under `output/gauntlet/replay-2/`:

- `01-expedition-selected-saved.png` — pre-start saved Expedition.
- `02-pause-actions.png` — Retry and Hangar affordances plus their effect description.
- `03-hazards-720.png` — separated Scrap Mine cards, one grouped +1 card.
- `04-launch-countdown-instruction.png` — visible Launch lesson during countdown 3.
- `05-launch-no-input.png` — Launch remains incomplete without throttle.
- `06-airborne-720.png` — legible airborne panel during real throttle input.
- `07-cup-practice-context.png` — single-round practice explanation and primary action.
- `08-start-championship.png` — round 1 context and Start championship action.

The hangar at 720p scrolls vertically; the captured Cup panels are readable at the ordinary UI scroll position reached by clicking the event. HUD checks were performed in the race viewport, not inferred from the hangar.

## Limits and cleanup

No full lap, finish screen, record, ghost, championship points, Continue Championship, championship completion, or online multiplayer was verified. Hazard and airborne checks each cover naturally reached states; simultaneous airborne plus dense hazards was not reached. The earlier generic Circuit/Combat UI language in solo events was not a target of this fix pass and remains visible.

One stale Playwright element reference required a refreshed snapshot; it was an automation reference issue, not a game failure. Subsequent Back to Hangar clicks succeeded.

Browser `gauntlet-replay-2` was closed immediately after the final browser check. Dedicated preview server was stopped with SIGINT (exit 130). No source edits or commits were made.
