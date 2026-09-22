# Round 46 — benchmark racing audit and first expansion

Reference: https://www.youtube.com/watch?v=2MtgIoToa7I

The video was re-inspected at 35, 40, 45, 65, 70 and 75 seconds in the YouTube player, alongside its existing scene-analysis receipt. Findings below distinguish visible features from additional official product descriptions. This is an original implementation using our game and preserved assets, not a copy of the reference track layouts or media.

## Racing feature comparison

| Feature | Reference evidence | Existing game | Round 46 |
|---|---|---|---|
| Environment variety | Industrial wreck interiors, desert, dense jungle/arches and frozen industrial terrain visible in the trailer | Six desert-region terrain profiles; Inkstorm presentation dominates | Three selectable original circuits: Frostline, Ember Rift and Verdant Run |
| Terrain affects driving | Reference demonstrates distinct environments; precise traction values are not established by the trailer | Event-based traction/cooling modifiers | Permanent course grip/cooling, plus marked volcanic shoulder heat |
| Branching routes and jumps | Visible route changes, passages and gaps; official game page confirms branching | Already implemented, including elevated branches, a launch drop and banked sweeper | Preserved on new seeded routes |
| Drift, boosts and heat | Official PlayStation hands-on describes Afterburner and Ramjet | Drift charge, boost meter and Redline already implemented | Destination cooling alters boost risk |
| Weapons and shield | Official hands-on confirms weapons, shields and a Sebulba flame attack | Heat Lance, Overcharge, mines, tow cable and shield already playable | Existing combat available on every new Battle circuit; no new weapon in this slice |
| Close-contact class abilities | Official hands-on describes Kinetic Burst, Knife Edge and takedowns | Collision damage/takedown attribution and several internal classes exist, but the current setup focuses on pods | Dedicated class maneuvers and directional flame attack remain future work |
| Enclosed racing spaces | Wreck interiors and low jungle passages are visible | Canyon arches and foundry structures; no continuous enclosed wreck course | Still a gap; scenery variants are not a new tunnel collision system |
| Mode variety | Official descriptions include Field Tests and Eliminators | Seven internal modes and mastery events already exist | New destinations expose Battle/Race/Time Trial; Cup remains its existing three rounds |

Sources: [official gameplay trailer article](https://www.starwars.com/news/star-wars-galactic-racer-gameplay-trailer), [official game page](https://www.starwars.com/games-apps/star-wars-galactic-racer), [PlayStation hands-on](https://blog.playstation.com/2026/06/25/star-wars-galactic-racer-hands-on-report/).

## First implementation

- Frostline: seed `0x46524f53`, ice palette/fin formations, ground grip 0.58, cooling 1.45.
- Ember Rift: seed `0x454d4245`, basalt palette/column formations, ground grip 0.94, cooling 0.65. Marked shoulders between 30–44% of the lap add engine/Redline heat; the centre lane remains safe.
- Verdant Run: seed `0x56455244`, forest canopy/ruin palette, ground grip 0.79, cooling 1.12.
- These are original seeded route variants on the established height field, with new scenery and driving conditions. They do not yet reproduce waterfalls, flowing lava, blizzards, or the reference’s enclosed wreck interiors.
- CPU and shader terrain height functions are unchanged. New surface behavior is fixed-step simulation data; renderer grading does not alter physics. Course identity comes from seed for replay/network consistency.
- Four recovered pods have distinct handling, damage tolerance and sourced engine voice profiles. Open cockpits receive the existing original Inkstorm pilot; Pog retains its enclosed cockpit. Hero/rival geometry stays within 60k/30k triangles.
- Existing four pods remain available. AI assignments now also exercise all four recovered designs.

## Preserved source inventory

26 included source entries were located (some are duplicate variants), of which four were already integrated. This round adds four more. The remaining sources have not silently been treated as runtime-ready.

| Original source | UID | Runtime status / next work |
|---|---|---|
| Teemto Pagalies' Podracer | `4eff45899ada40bb920c5c744663db90` | Already integrated before this round |
| Sebulba podracer star wars | `f97e3891a6a846ed97379e3cfa5931a0` | Already integrated before this round |
| BEN QUADINAROS PODRACER | `c2ca24c9b3c2416db0abe026d9f4b7ac` | Preserved; source has a noncommercial restriction, not admitted in this batch |
| Podracer | `25d51fbd4efc4c888ca4ff2549b1c6ae` | Preserved; needs geometry/driver/material preparation and runtime review |
| Star Wars Galaxies - Anakin's Podracer | `e377c2e49ad447caa0517b87562b3acc` | Preserved; original commercial-game provenance/texture notes need resolution before runtime admission |
| Anakin Podracer | `dd948b66950147b78ace05dfcb9ccbbb` | Private study only: source is BY-NC-ND; adapted public runtime needs separate permission |
| Ye Old Podracer | `4022e489f3d74eebb0aa3305f38dcc3f` | Added as verdigris |
| Old Worn Out Spaceship | `fee6dfa2369149aa84e7f99d9bb35cb0` | Preserved; needs geometry/driver/material preparation and runtime review |
| Star Wars Galaxies - XJ-6 Airspeeder | `7766ca8e7bd047f5ad4bdb86d11ec6d4` | Preserved; original commercial-game provenance/texture notes need resolution before runtime admission |
| Anakins Pod Racer | `dac6d14dcf914e88af8625b59f4020bc` | Added as skybolt |
| World Skills Pod Transporter | `39f96d4fcf00432dba3beb2e42163aa6` | Preserved; needs geometry/driver/material preparation and runtime review |
| Anakin's pod Star Wars | `5a3422df6f894b48b846d590cdc2bf4c` | Already integrated before this round |
| podracer | `ce9c2d4e92a44dffbd78e6b29d6c0182` | Preserved; needs geometry/driver/material preparation and runtime review |
| Pod Racer - Star Wars Inspired Build | `309c3c42bac24b5c801fcc09f875e6a7` | Preserved; needs geometry/driver/material preparation and runtime review |
| Star Wars Pod Racer | `6ea36ebb4e504fb8976d2b527b5e40dc` | Preserved; needs geometry/driver/material preparation and runtime review |
| Podracer stl file | `19a50e866e5d44cb8e4840b616cc8132` | Preserved alternate/duplicate variant; not counted as an extra finished design |
| Podracer obj file | `ff12ef200c994c8b9c6b61ea45702454` | Preserved alternate/duplicate variant; not counted as an extra finished design |
| Yet Another Pod Racer | `e10eb39da3cf48018ba79c341a867d45` | Preserved; needs geometry/driver/material preparation and runtime review |
| Star Wars - Ark Bumpy Rooses Pod Racer | `41071debeaf1499a9a1586b78ea18a09` | Preserved; original commercial-game provenance/texture notes need resolution before runtime admission |
| Pod Racer Colour | `a6f14ae799ab40d7ac425f043f824ff8` | Already integrated before this round |
| Pod Racer | `e42fb924b344481ea013c58cb0f52ad7` | Preserved alternate/duplicate variant; not counted as an extra finished design |
| Spaceship(pod) | `5a927a9fa0984371bd970b31f5f06086` | Added as needle |
| Pog Racer | `c0d192c145a44459a454627708e46cf5` | Added as pog |
| Advanced X1 | `9ecf7f66246d4f30b990cc605359e3b6` | Preserved; needs geometry/driver/material preparation and runtime review |
| Now This Is Podracing MWRB | `eb1a1861d3f140fa958ca7eb70a9f380` | Preserved; needs geometry/driver/material preparation and runtime review |
| Now This Is Podracing MWRB | `0baa936f45434c7eb8d58c31890402a2` | Preserved alternate/duplicate variant; not counted as an extra finished design |

## Reproduction and validation

Run `Blender --background --factory-startup --python scripts/blender/recover-roster-round46.py`, then `python scripts/assets/optimize-recovered-roster.py` (Pillow required), then `python scripts/assets/repair-recovered-tangents.py`. The packager uses isolated factory scenes and never opens or saves the interactive Blender scene. Runtime hashes/anchor measurements are in `assets/source/inkstorm/roster-round46/`.

- TypeScript and production build pass. Final full suite: **1,080 tests / 187 files** (`npx vitest run --maxWorkers=2`). One earlier run overlapped browser rendering and timed out in the existing expensive Teemto support test; the quiet rerun passed. The narrow-branch heat regression now verifies the actual fixed-step heat increase.
- Bundle: `index-CqDGBrTc.js`, **1,937,217 bytes**, SHA-256 `721fd11bdb4abbe34de9ad509fe3368d8e59079cdac82994595c125c9cd68366`. The existing large-chunk warning remains.
- Asset checks verify original source hashes, CC BY 4.0 records, packaged hashes, valid geometry/tangents, texture MIME declarations, opaque materials, embedded pilots and hero/rival budgets. The four recovered designs all load through the normal runtime adapter.
- Final browser and timing receipts: `output/round46/browser-qa.json` and `output/round46/drive-qa.json`. The former uses the actual destination/mode buttons and checks all four recovered garage models, desktop and mobile setup; the latter fingerprints the production bundle and drives each course through the real simulation.
- Final browser pass: **zero page/console/network errors**; all recovered assets loaded, all three mode buttons retained the selected destination, and portrait 390×844 / landscape 844×390 setup had no horizontal overflow. Both browsers and private servers closed in `finally`.
- Four clean-race drives (new destinations plus original Inkstorm) each advanced 1,200 individual 120 Hz driving ticks after countdown. Every player's final wreck counter was **0**. These are ten-second starts, not complete laps.
- Quiet production-renderer sample at 1440×900, device pixel ratio 1, quality 0, Chromium ANGLE/Metal: **16.666 ms mean frame cadence** on all four courses; p95 **16.7–16.8 ms**, roughly 60 fps. Each measured six seconds after a one-second warm-up. This is local requestAnimationFrame cadence, not GPU timing or a universal performance guarantee.
- Final UI tests were also rerun after the last layout adjustment: **9/9**. `git diff --check` passes. Native screenshots were inspected for the four recovered designs and three destinations; mobile portrait and landscape were both visually reviewed.

### Limits and next work

- This is local work; nothing was pushed or deployed. Production remains the Round 44 release. V5 media was not edited in this round.
- Native captures are sampled automated visual evidence, not owner approval. Short clean-race runs do not establish full-lap balance or performance on other devices. Medal targets for the nine new events are provisional.
- New course selection is solo-only. This round did not repeat the multiplayer browser session; existing network unit tests are included in the passing suite.
- Recovered bodies use the shared pod physics probe footprint. No bespoke destruction shell was authored. Engine voices reuse licensed recorded loops already in the game; the runtime audio ledger and selection intro are untouched.
- Ice/basalt/forest meshes are decorative and kept away from playable lanes. Existing road, branch and obstacle collision systems remain; enclosed tunnels and rich environment hazards need their own geometry/physics work.
- Remaining source admission priorities are the unrestricted, unique designs in the inventory. Duplicate variants should not inflate the roster. Sources with provenance or license constraints require resolution before adapted public runtime use.
