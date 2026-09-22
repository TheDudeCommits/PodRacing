# Round 52 — Orbitron and a quieter race HUD

Owner selected A (Orbitron) after the Round 51 comparison, then asked what C does
and requested removal of distracting race notifications. Implemented 2026-09-23.

## Typography

- Orbitron 700 now supplies home headings, racer/map/mode names and main actions.
  Small utility copy keeps Chakra Petch for legibility.
- Self-hosted, preloaded 38,576-byte variable font, moved from the comparison
  directory to `public/fonts/liquid-chrome/`. Original OFL license is retained.
  Both the home menu and comparison page share the same cached resource.
- Widened Play and fitted long pod names at small widths. Comparison page labels
  Orbitron as Selected. Liquid Chrome artwork and game rendering remain as selected.

## C / LB abilities

C is a keyboard shortcut, not a clickable HUD button. Normal native-key browser
input already reached simulation correctly. Teemto's coolant burst has little
visible effect when engines are cold and boost is full. There was also a real
activation bug: overheating blocked cooling, and the HUD still claimed READY.

Abilities remain because they affect racing:

| Pod | Ability |
| --- | --- |
| Teemto | Coolant burst: removes 24 percentage points of engine/redline heat and restores 12 points of boost |
| Verdigris | Deep vent: removes 40 points of heat and restores 12 points of boost |
| Polwo / Needle | Lateral dodge; steer while pressing C to select direction |
| Skybolt | Forward sprint |
| Blockrunner / Pog | Forward ram, with reduced contact damage during the charge |
| Sebulba | Directional flame cone in Battle mode |

Cooling now works while overheated. Other abilities retain their overheat lock.
Airborne dodges no longer spend cooldown without moving the craft. Activation and
HUD share the same restrictions; the fixed ability strip reports OVERHEATED,
AIRBORNE or RECOVERING instead of a false READY. Cooldown and press/release gating,
flame counterplay and network authority remain intact.

## Notifications removed

Removed the DOM and render updates for combat/takedown/repair text, race-director
announcements, damage/heat/status alerts, wrong-way banners, airborne messages,
automatic control hints and directional threat text. Removed the now-unused threat
projection work and its menu toggle. Launch-result callouts stop at race start.
Flight-school instructions are available from Pause.

Countdown/GO, the countdown launch gauge, fixed race instruments, drift charge,
ability readiness, effects/audio and results remain. Presentation changes do not
change damage, scoring, recovery, lap or finish authority.

## Validation

- Full suite: 1,113 tests across 191 files pass, including nine new ability cases.
- Final ability/wreck-presentation regressions: 13 tests pass after removing the
  obsolete threat projection code. Typecheck, build and `git diff --check` pass.
- Native browser C presses activate Teemto, Skybolt and Needle. No page errors.
- HUD stress harness exercises all combat text events, hazards, wrong-way,
  airborne, launch-result and tutorial state: removed popup nodes remain absent.
  Countdown launch gauge and finish/results still appear.
- Home checks at 1440x900, 1024x768, 390x844, 360x740 and 844x390: no overflow or
  clipped labels; mode/map/pod selection, Rules, Options and Escape pass.
- Evidence: `output/round52/` logs/scripts and `output/playwright/round52/` captures.
  Browser sessions closed immediately after their checks. Controller hardware was
  not retested; normal keyboard activation and simulation/network regression
  coverage are the evidence for this change.


## Production release — verified 2026-09-23

- Source commit: `c147ce17c23f9f151be7d0150a540cc890f324cb`, pushed to
  `TheDudeCommits/PodRacing` on `codex/now-this-is-podracing`.
- Production: `dpl_132qKfwz78Sy1tcAaKMeqKbRUHDV`, **READY**.
- Deployment: https://now-this-is-podracing-prul3b01b-amirs-projects-d9680079.vercel.app.
- Canonical alias: **https://podracing.dude.work/**, live browser verification passed.
- Exact browser bundle: `index-PWWCNfeS.js`, 1,967,085 bytes. SHA-256
  `2e9860a88371a92a00a9d226ec7bda1d63a2d3dbdba3877ec1f2df3b6339236d`,
  identical to the local tested build.
- Live: Orbitron loaded, all 8 illustrations loaded, all 4 mode and 4 map selections
  work, 390px layout has no overflow, normal C-key cooling activation works,
  removed popup DOM count is zero. No page, console or HTTP errors.
- Receipts: `output/round52/{deployment,production-qa}.json`;
  live screenshots: `output/playwright/round52/live-{home,mobile,race}.png`.
- All task browsers and the task's port-43152 development server are closed.
- Rollback candidate: Round 51 `dpl_46G1pa7owfQDKwRrCkNQJh7Jq5Ze`.
