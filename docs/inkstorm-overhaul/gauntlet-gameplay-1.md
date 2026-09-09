# Blind gameplay gauntlet 1

Date: 2026-09-06, approximately 13:23–13:30 UTC. Build served from the existing `dist` using a dedicated Vite preview on port 4183. Headed Chromium, fresh named session `gauntlet-gameplay-1`, desktop viewport 1440 × 1000.

This was a blind player-flow review. I read only package.json and the Playwright skill; I did not read game implementation, earlier audit reports, or implementation reports. Actions were ordinary UI clicks, browser reloads, and keyboard input. `window.__PODRACING__.snapshot()` was used read-only to verify course, event, vehicle, tutorial, and racer state. No state, record, lap, or finish injection was used.

## Verdict and scores

The authored hangar and responsive craft are compelling, and the training has real action-based progression after its opening step. The replay loop has two concrete gaps: the hangar's Save course control can save the wrong course identity, and an unfinished run cannot visibly be abandoned or restarted. I would fix those before treating the player flow as release-ready.

Scores are a critic's assessment of the observed scope, not automated test percentages.

| Area | Score / 10 | Evidence and limit |
| --- | ---: | --- |
| Default event promise | 8 | Time Attack launches solo, one lap, stock parts. The generic Circuit intro and combat-ready HUD dilute the event identity. |
| Vehicle selection | 9 | Clicking Needle Speeder Bike updates the hero, description and ratings; the launched training race has `vehicleClass: speeder-bike` and the correct visible craft. |
| Training | 7 | Speed, braking, drift-release and heat lessons progressed after actual input. Launch advances without input, and the useful tutorial panel only became visible after the countdown. |
| Saved-course flow | 4 | Saved entry persists and restores its stored seed. Saving after selecting an unstarted Open Expedition stores the previous Time Attack route under the new event's name. |
| Retry / session navigation | 3 | Pause exposes Resume and Settings only. Settings exposes controls, comfort and audio. No retry or return-to-hangar action was discoverable; switching events required a browser reload. Post-finish retry was not reached. |
| Championship progression story | 5 | Three named rounds and point-carry wording create an understandable premise. A fresh player can select and start the Final directly with no standings, completed rounds, or explanation of standalone versus championship play. Actual point carry was not tested. |
| Replayability, observed | 6 | Daily course, personal best, ghost placeholder, fixed events and expedition settings give reasons to return. Wrong save identity and lack of mid-run retry obstruct the practical loop. |

Overall observed player-flow score: **6 / 10**. No P0 crash/blocking launch failure observed. Two P1 replay-flow issues are below.

## Findings to address

### P1 — Save course uses the previous route under the newly selected event name

Reproduction in the fresh session:

1. Reload into default Inkstorm Time Attack. Read-only snapshot reports seed `1229867859`, signature `2dacfc90`.
2. Click **Open Expedition** in the event list, then **☆ Save course**, before starting. The UI reports **★ Course saved** and creates **Saved • Open Expedition**.
3. Click Start Race. Open Expedition actually generates seed `2136051594`, signature `a8f6c3ed`; snapshot reports `courseSaved: false`.
4. Reload. **Saved • Open Expedition** is still present. Select it and start.
5. It launches seed `1229867859`, signature `2dacfc90`, with `courseSaved: true`: the original Time Attack route, not the Expedition that was subsequently started.

Persistence is working, but the player's selected event, saved title and saved route are out of sync. Make Save refer to a concrete displayed/generated route, or make it unavailable until a saveable route actually exists. Evidence: `09-open-expedition-saved.png`, `10-saved-course-replayed.png`; UI snapshot `.playwright-cli/page-2026-09-06T13-28-09-200Z.yml`.

### P1 — An unfinished run has no visible retry or return-to-hangar path

During Time Attack, Flight School and Cup Final, hold Escape long enough for a normal keypress. The pause dialog shows only **Resume** and **Settings**. Settings contains Controls, Comfort and Audio, with no session navigation. **R** is documented as Recover and moved the training craft back toward the route; it is not a retry/menu action.

A novice who wrecks a lap, chooses the wrong event or finishes the tutorial exercises must continue the entire lap or reload the browser to choose again. This matters especially for a Time Attack game whose promise is repeated attempts. Add Restart event and Return to hangar to pause, with clear effect on an active championship if applicable. Evidence: `03-pause-settings.png`, `05-training-accelerated.png`, `08-training-heat-release.png`, `12-final-round-race.png`.

### P2 — Flight School skips the launch lesson without performing it

I clicked Start Race in Flight School and gave no throttle input during countdown. The read-only tutorial snapshot reported step 1, **Launch**, with the instruction “Tap throttle during the countdown. Keep the rev needle near the launch marker.” The actual visible countdown showed the generic Perfect Launch meter, rather than the tutorial instruction. After the countdown, with speed still `000`, Flight School was already on step 2, **Build speed**, progress 0.

The subsequent training is better: W advanced speed to step 3, S advanced braking to step 4, and holding Space with steering then releasing advanced drift to step 5. Shift use followed by release led to **Flight school complete**. Thus the opening is a missing lesson rather than evidence that all training is time-based. Show the launch instruction during countdown and either allow retrying it or explicitly describe it as a demonstration. Evidence: `04-training-no-input.png` and `05`–`08` screenshots.

### P2 — Championship entry does not explain progression versus a single round

With no completed races, I could choose **Inkstorm Cup • Glasslands** (“Final round. Carry your championship points into the high-speed flats.”) and launch immediately. The run had two laps and eight racers, but snapshot still had `championship: []` and `championshipRound: 0`. No pre-race standings or message explained that I was beginning at the Final without prior points.

This is a clarity problem, not proof that scoring is broken. Explain standalone round selection, or make Start Championship / Continue Championship the obvious primary action. The Canyon card also promises **Eight named rivals**, while the started Cup run contains **eight racers total**, including the player; use “eight-racer grid” if the intended opponent count is seven. Evidence: `11-final-round-selectable.png`, `12-final-round-race.png`.

### P3 — Time Attack and training retain generic circuit/combat language

Both began with the generic Circuit race-order intro, despite being solo one-lap modes, and kept Heat Lance Ready, Shield Ready and Mine ×3 visible. This is not a failed rules check: the default snapshot correctly showed `competitionProfile: time-trial`, one lap, only the player in the active racer list, and zero stock upgrades. Use event-specific labels and relevant systems so the racing goal remains clear. Evidence: `02-default-race.png`, `04-training-no-input.png`.

## What passed

- The initial menu clearly communicates one lap and stock machinery; Workshop is visibly disabled with an explanation.
- Selecting the Needle craft changes its title, hero image, ratings and raced vehicle correctly.
- Actual throttle creates speed; braking reduces it; steering and drift visibly rotate the craft and build a drift meter; release earns a burst and advances the tutorial.
- Recover is usable after losing the route, and wrong-way feedback is visible.
- Pause holds the race timer once activated; Settings offers remappable bindings and assist controls.
- Saving creates a visible entry which survives reload. Starting that entry reproduces the stored seed/signature exactly; the issue is the selection-time identity above.
- Open Expedition exposes AI difficulty, seven mode choices, lap count and Workshop, and starting it generated a fresh course in the observed attempt.
- The Cup Final launches with a two-lap, eight-racer grid.
- No browser console errors were recorded. Console warnings were repeated pre-gesture AudioContext warnings; listening/audio-quality acceptance was outside this review.

## Boundaries

No full lap was completed. No personal best, medal, ghost recording, finish screen, post-finish retry, championship round transition, point persistence, or title award is verified by this pass. “Flight school complete” refers to all five tutorial stages, not a completed race. No online multiplayer was attempted. The longer-term fun/balance score is provisional; this is an onboarding and replay-flow review.

The named browser was closed immediately after the last browser check. Its dedicated preview server was stopped with SIGINT (exit 130). No game code or commit was changed.

Screenshots: `output/gauntlet/gameplay/01-default-hangar.png` through `12-final-round-race.png` (descriptive filenames). Screenshot `02-default-race.png` depicts active racing; the first instantaneous automated Escape press was not sampled, so a later 120–150 ms keypress was used for all pause checks. This automation timing artifact is not counted as a player-facing pause bug.
