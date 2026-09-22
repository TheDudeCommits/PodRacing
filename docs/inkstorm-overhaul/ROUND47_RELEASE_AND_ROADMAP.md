# Round 47 — Production release and quality priorities

## Release

The owner explicitly requested Production deployment to https://podracing.dude.work/.
The existing branch was pushed, its Git-integrated preview reached READY, and
that exact preview was promoted into the production environment.

- Runtime source: `cdb3fe8687a4a458fab2bfa477937884acefd4a9`.
- Preview: `dpl_3xtkoeFQdeCKvm7RE9KezVnncrDw`.
- Production: `dpl_DZ5je3Rd6PrwK3pHjGwDnbxe2qkz`, READY.
- Deployment URL: https://now-this-is-podracing-73oll8x3t-amirs-projects-d9680079.vercel.app.
- Verified aliases include `podracing.dude.work` and `now-this-is-podracing.vercel.app`.
- Bundle: `index-CqDGBrTc.js`, 1,937,217 bytes, SHA-256
  `721fd11bdb4abbe34de9ad509fe3368d8e59079cdac82994595c125c9cd68366`.
- The canonical domain's browser-loaded bundle matches the tested local bytes.
- Final live run completed **12 checks with zero page, console or failed HTTP
  response errors**. All eight pod selections loaded, all three destinations
  accepted keyboard driving, and the mobile layout had no horizontal overflow.
- Previous Production for rollback: `dpl_EvmpCPx4YfPwQxtPcmhJAJnjzxAF`.
- Local source validation remains 1,080 tests / 187 files, TypeScript and build
  passing. No runtime source changed in this release round.
- Live evidence: `output/round47/deployment.json`, `live-qa.json`, screenshots and
  `live-qa.log`. These files are local and gitignored.

The live smoke test uses all eight carousel entries, starts all three new courses
through the ordinary setup screen, drives with keyboard input, checks the mobile
390px layout, and reads the loaded script response to verify the exact bundle.
Separate scenery screenshots use capture staging and are not full-lap proof.
All task-created browser sessions close in `finally`. The first probe tried to
read redirect response bodies on reload; it was corrected to hash only successful
200 responses. That instrumentation issue was not a game asset failure.

## Recommended order of work

These are design recommendations based on the current implementation and native
captures. They are not a claim that this web game already matches a large studio
production. The strongest next milestone is **one complete, polished flagship
lap with two thoroughly finished pods**, then extending its standards to the rest.

| Priority | Work | Concrete outcome / acceptance |
|---|---|---|
| 1 | Author a memorable flagship circuit | Design the lap around an enclosed wreck passage, a dangerous alternate route, a major elevation change and a final overtaking straight. Distinct landmarks communicate where the player is. Every path has tested collision, reset and AI behavior. Complete human laps must feel readable and repeatable. |
| 2 | Unify environment and vehicle art | Replace repetitive first-pass trees/ice/columns with an authored modular kit, varied silhouettes and deliberate composition. Bring recovered pods to one scale, material, wear and outline standard. Judge side-by-side native frames at the same lighting and camera. |
| 3 | Refine driving feel and the gameplay camera | Tune turn-in, drift entry/exit, countersteer, throttle response and landing recovery on every biome. Give each body an unobstructed chase view; strengthen near-ground speed cues while retaining optional shake and stable aiming. Validate full laps with keyboard and controller. |
| 4 | Fit physical interaction to each craft | Give the recovered pods matching collision/support footprints and body-specific visible damage. Tune glancing scrapes versus race-ending impacts, safe roof clearances, jump landings and predictable recovery. Preserve the owner's removal of loose wreck debris and photo-finish slow motion. |
| 5 | Make environments feel active | Add snow spray, wet-road reflections/spray, canopy movement, localized mist, ash/embers and heat shimmer. Connect every hazardous surface to clear visual and sound cues. Keep the readable route and safe lane obvious at racing speed. |
| 6 | Give combat and pod abilities distinct roles | Refine existing lance, mines, tow and shield feedback first. Prototype a short-range directional flame attack and one mobility ability with a visible wind-up, defined range, cooldown and counterplay. It should create a racing decision rather than obscure the road. |
| 7 | Improve rival racecraft | Tune overtaking lines, defensive positioning, mistake recovery and per-rival aggression. Run repeated complete races at each difficulty; measure finishing gaps, collisions, resets and stalls. Preserve physical fairness and the existing draft-based catch-up design. |
| 8 | Finish the sound mix | Differentiate engines by load and acceleration, polish existing spatial pass-bys, add convincing scrape/landing transients and environment-dependent tunnel acoustics. Phrase music around launch, combat, danger and the finish. Use sourced/licensed audio and preserve the owner's selection intro. |
| 9 | Make frame pacing and loading reliable | Measure whole races on representative hardware, including effects-heavy sections and first-load behavior. Set a 60 fps target for the chosen desktop tier; provide explicit lower tiers. Reduce texture/geometry transfer, stream pods deliberately and avoid shader compilation stalls. Current short local cadence samples are not sufficient acceptance. |
| 10 | Finish the surrounding race experience | Refine HUD hierarchy, warnings, controller navigation and readable results. Extend a curated championship through the new destinations, balance medals/upgrades, and add the new selection flow to multiplayer with reconnect/desync tests. Make settings, tutorials and remapping easy to find. |

### First delivery milestone

Build one representative 60–90 second racing section to the target quality: two
finished pods, a designed corner sequence, an enclosed passage, one jump, close
racing, clean combat feedback and a final acceleration beat. Review it in normal
play at the target frame rate. Then complete the flagship lap before multiplying
maps or adding more archived models. Capture a new trailer only after these
improvements work during ordinary play.

The benchmark's official hands-on describes vehicle-specific maneuvers, heat-risk
boosting, environment variety, weapons/shields and aggressive contact racing.
Those descriptions support the comparison; the priority order above is our own
assessment of this project's needs. Sources: [PlayStation hands-on](https://blog.playstation.com/2026/06/25/star-wars-galactic-racer-hands-on-report/)
and [official gameplay trailer article](https://www.starwars.com/news/star-wars-galactic-racer-gameplay-trailer).
