# Multiplayer and procedural regression — 6 September 2026

## Later multiplayer recheck, 21:56 local

The online lobby layout fix passes on `index-edr4kL2B.js`: two members,
guest skim-speeder, 158.464 m remote movement, 0.676 m convergence error over
nine fixed steps, redline heat 0.1619, five mines and zero browser errors.
The inspected host lobby fills the former empty sidebar column and contains
no stale Time Attack description. Receipt timestamp: 2026-09-06T14:56:18.163Z.
The browser and owned preview server closed. This precedes the later industrial
art/vista pass; the rendering additions do not establish new multiplayer acceptance.

## Current-build recheck, 21:47 local

Both harnesses pass again on `index-Nxq1YP2g.js`, after bridge physics, ghost
geometry, results-clock and resource-disposal changes. Multiplayer receipt:
two members, guest skim-speeder, 171.696 m remote movement, 0.056 m convergence
error / three fixed steps, redline heat 0.1619, six mines, zero browser errors.
The newly inspected host-lobby image confirms the stale Time Attack sidebar is
gone. Its now-empty layout column was subsequently removed with a CSS-only fix.

Procedural receipt retains fixed Time Attack seed 1229867859 / signature
2dacfc90, Expedition seeds 1364030134 and 4247717558, 0.466845 radian turning RMS,
97.996% minimap change, same-seed reconstruction and matching live room geometry.
The current room signature is 21e7a75e. Both owned browsers/servers closed.
The earlier report below is retained with its original build and findings.

Both browser regression harnesses pass against the local production build with main bundle `index-CXY_Wc96.js`. One nonblocking UI defect was observed and reported to the root agent: the online lobby retains the solo Time Attack description. This report does not establish deployment, cross-network multiplayer, visual target parity, or a frame-rate result.

## Finding requiring application follow-up

**P2 — online lobby displays stale solo event rules.** Start on the default Time Attack screen, create a room, and join it from another client. The room controls correctly show two connected racers and host authority, but the right-hand panel still reads “Inkstorm • Time Attack,” “One clean lap. Stock machine,” and the solo personal-best explanation. The race actually uses the online rules and an eight-racer field. This can mislead players about the selected event, machinery and competitive records.

Evidence: `output/playwright/multiplayer-host-lobby.png`. The likely integration boundary is `GameApp` omitting its solo mastery view model for an online lobby while `RaceHud` retains previously rendered mastery content. Application code was outside this harness-only assignment; the root agent received the reproduction and screenshot path.

## Multiplayer — PASS

Command: `node scripts/multiplayer.mjs`.

Final receipt: `output/playwright/multiplayer-receipt.json`, captured `2026-09-06T13:46:48.877Z`.

| Check | Observed result |
|---|---|
| Initial selector | Four selectable class cards and five loaded previews, including the inspected hero craft |
| Real room | Host and guest joined the same six-character room; two members |
| Text input isolation | Gameplay-bound digits, WASD and action keys entered as room-code text without changing the vehicle |
| Clipboard | Native paste inserted the room code correctly |
| Authority | Host selected one lap; guest lap controls reflected the selection and remained disabled |
| Vehicle synchronization | Guest selected skim-speeder; host received the class change |
| Race start | Host launched; both clients left the waiting grid |
| Remote input | Guest W/D input moved the host-authoritative guest racer 158.75 m |
| Client convergence | 4.84 m position difference and nine fixed simulation steps at the sampled instant |
| Redline | Host heat reached 0.1619 while Shift was held |
| Mine action | World mine count increased after F; final count six |
| Browser errors | Zero console errors, page errors or unexpected failed requests |

The existing convergence limits remain 45 m and 30 fixed steps. The measured values are a single local two-client sample, not a latency guarantee. This uses actual signaling and a data channel, but both isolated Chrome contexts ran on one machine; no two-network or TURN acceptance is implied.

Screenshots include `multiplayer-selector-initial.png`, `multiplayer-host-room.png`, `multiplayer-host-lobby.png`, `multiplayer-guest-lobby.png` and `multiplayer-race-heat.png`. The host-lobby and live racing screenshots were visually inspected. The racing capture shows the playable chase view and HUD; it is not an art-quality approval.

## Course identity and generation — PASS

Command: `node scripts/procedural-courses.mjs`.

Final receipt: `output/playwright/procedural-course-receipt.json`, captured `2026-09-06T13:48:49.002Z`.

| Flow | Required behavior | Result |
|---|---|---|
| Default Time Attack | Fixed hero seed and time-trial rules | Seed `1229867859`, signature `2dacfc90` |
| Time Attack pause → Retry event | Same course and rules | Identical seed, signature and sampled geometry; profile remains `time-trial` |
| Select Open Expedition | Explicitly enter fresh-course mode | Profile `chaos`; first seed `1364030134`, signature `bd9962df` |
| Expedition pause → Retry event | Preserve this expedition's course | Seed and all sampled geometry unchanged |
| Expedition results → Back to Hangar → start | Generate the next expedition | Seed `4247717558`, signature `a3412bdd` |
| Fresh deterministic capture sessions | Reproduce geometry and minimap pixels | Exact geometry match; zero changed minimap pixels and identical PNG SHA-256 |
| Live multiplayer room | Host and guest share course identity | Seed `3006442613`, signature `28fcd744`; exact sample-array match |

The two Expedition courses changed their rotation-invariant turning profile by **0.4668 radians RMS**, and **98.00%** of the union of minimap ink pixels changed. This verifies a different sequence of bends, beyond translation or rotation. All tested course receipts retained the existing geometric checks: finite dimensions, playable length and width, required section tags, plausible bounds, arc/chord agreement, and no sampled centerline self-intersections.

The course harness stages countdown, finish and camera presets to capture comparable geometry and make the results navigation available. Its minimap images use a temporary enlarged, explicitly visible audit view. Those captures do not represent an organically completed race or the default HUD layout. The fixed Time Attack retry check uses ordinary start, pause and retry controls without a staged finish.

## Harness changes and cleanup

- Updated multiplayer preview readiness from four to five loaded images while still requiring exactly four class choices.
- Matched the actionable start prompt to the current “Space / Enter to launch” copy.
- Added fixed Time Attack and same-course Expedition retry checks. Fresh Expedition generation now explicitly selects Open Expedition and uses Back to Hangar, instead of incorrectly expecting every Retry to randomize the course.
- Retained the existing deterministic geometry, minimap, live room, authority and convergence assertions.
- Added failure snapshots/screenshots before rethrowing errors. Both harnesses retain `try/finally` closure of all pages, contexts, Chrome and their isolated Vite preview servers, on success or failure.

Validation: `npm run build`, both harnesses, both `node --check` syntax checks, and `git diff --check` passed. Initial harness attempts exposed outdated preview/start-copy expectations and an incorrect pause key in the new retry helper; these were corrected before the passing receipts. The earlier `procedural-course-failure.json` is superseded by the newer passing receipt.

All browser instances and isolated preview servers were closed immediately after their harness finished. The root agent was then notified that rebuilding the shared `dist` directory was safe again. No application code was changed in this assignment.
