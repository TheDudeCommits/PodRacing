# Inkstorm driving acceptance — 6 September 2026

**Snapshot boundary:** the four-class and three-Cup tables below are the pre-bridge, earlier-layout study completed around 20:39 local time. Their JSON receipts retain the exact source hashes. They are historical diagnostics, not acceptance of the later elevated route or current scenery. See `BRIDGE_ACCEPTANCE.md` for the subsequent physical bridge evidence.

The 7,646 m hero circuit is legally completable in every stock vehicle class with zero resets and zero collision events. The automated study found and corrected AI branch deadlocks and false recovery on a valid shortcut. Every rival now completes two actual laps in all three Cup events when given enough time. This is simulation acceptance, **not human handling, visual, audio, or frame-rate acceptance**.

## Reproduce

From the project root with Node 24:

```sh
npx --yes tsx scripts/drive-balance.ts --grace=20 --label=final-pace
npx --yes tsx scripts/drive-balance.ts --grace=20 --observe-ai=210 --label=final-observation
npx --yes tsx scripts/drive-balance.ts --grace=20 --only=cup-canyon --label=repeat-canyon
```

The script imports the same `sampleTerrainHeight` used by `TerrainSystem` and the shipped `RaceSimulation`. The hero seed is `INKSTORM_HERO_SEED` (`0x494e4b53`, decimal `1229867859`). It selects each stock vehicle before locking the grid, then supplies only semantic steering, throttle, brake, boost and, if stalled for 12 seconds, a reset input. It never changes racer poses, progress, checkpoints, timers, physics or result rules during a run. No reset was needed by the player in any final run.

Simulation remains fixed at 120 Hz; the diagnostic driver updates inputs at 30 Hz. It follows the canonical spline with 23–77 m pursuit distance, forecasts curvature over 325 m, brakes against 65% of the class's authored braking force, and boosts only while aligned with spare heat and energy. `--pace=0.88` is a cornering confidence multiplier, not a human difficulty estimate. It does not use drift, alternate routes or opponent avoidance. Its exact course knowledge is a substantial advantage over a human newcomer.

**Finish-window correction:** these original diagnostics explicitly configured **20 seconds** of grace. The production default is **8 seconds**. Thus the table's AI completion counts at player +20 seconds must not be described as the production results window. The script now defaults to 8 seconds and records `resultsGraceSeconds`; `--grace=20` reproduces the historical diagnostic policy. It never changes the production default.

`--observe-ai=210` brakes the player on the final lap after 90% progress until every rival crosses the line or race time reaches 210 seconds. This extends observation using player input alone. The player can affect nearby rivals while waiting, so these runs establish completion rather than clean comparative pace. Their player times must not be used as medal benchmarks.

Each run writes `output/drive-balance/<label>.json`, including source hashes, lap events, checkpoint counts, reset events, collision sources, impact coordinates, one-second player traces and individual rival results. Natural finishes are counted from actual `lap-complete` events; the results board's classification is never accepted as a completed lap. The old `baseline.json` and `acceptance.json` predate diagnostic corrections and are superseded.

## Four stock classes — hero time trial

| Class | Legal lap | Checkpoints | Resets | Collision events | Highest damage |
|---|---:|---:|---:|---:|---:|
| Podracer | 54.58 s | 10/10 | 0 | 0 | 16.6% |
| Landspeeder | 62.77 s | 10/10 | 0 | 0 | 7.4% |
| Speeder bike | 51.39 s | 10/10 | 0 | 0 | 23.1% |
| Skim speeder | 57.79 s | 10/10 | 0 | 0 | 9.0% |

Evidence: `output/drive-balance/final-pace.json`. No sampled player position exceeded the projected course width. Off-course sampling is once per second; it cannot exclude a shorter excursion between samples. The legal checkpoint and finish events are evaluated every simulation tick.

All four beat the current 90-second gold threshold. This rules out an impossible medal baseline for the stock classes, but does not establish an appropriate human challenge. Preserve the current thresholds as provisional until keyboard, gamepad and touch playtests provide completion distributions. Landing/terrain damage exists even without collision events; inspect the bike's 23.1% peak damage during a human lap before adjusting durability.

## Cup pace and real rival completion

All Cup entries use stock builds, medium difficulty and the clean-race profile. The player uses the same canonical controller as the solo benchmark.

| Cup | Seed | Course length | Player two-lap time | Player resets | Player collisions | AI finishers before player + 20 s |
|---|---|---:|---:|---:|---:|---:|
| Canyon | `0x494e4b53` | 7,646 m | 110.55 s | 0 | 9 | 3/7 |
| Foundry | `0x464f554e` | 8,068 m | 115.37 s | 0 | 20 | 4/7 |
| Glass | `0x474c4153` | 9,365 m | 126.03 s | 0 | 18 | 2/7 |

The final player collision events were racer contacts, not scenery impacts. Each player completed 20 ordered checkpoint crossings. All three beat their current 180-second gold threshold. Fast player completion still classifies slower entrants before they reach the finish; this is now an honest DNF/distance result rather than an invented lap time.

The extended observation run demonstrates that the remaining entrants are progressing rather than stalled:

| Cup | AI actual two-lap finishes | AI finish-time range | Total AI resets | Total AI scenery collision events |
|---|---:|---:|---:|---:|
| Canyon | 7/7 | 117.68–144.46 s | 1 | 10 |
| Foundry | 7/7 | 119.18–145.28 s | 0 | 0 |
| Glass | 7/7 | 132.63–165.63 s | 4 | 3 |

Evidence: `output/drive-balance/final-observation.json`. All 21 rivals crossed the finish after two recorded laps. Five resets remain across the field, including two for one Glass entrant. No rival exhibits the repeated branch-endpoint loop found in the baseline.

## Failures found and changes made

Before these fixes, zero of seven AI entrants finished naturally in any Cup before classification. The shorter baseline window produced 69/88/125 AI resets and 88/197/144 scenery collision events for Canyon/Foundry/Glass. Only two Canyon rivals completed even one lap; no Foundry or Glass rival did. The old classifier then manufactured completed laps and projected finish times, obscuring that failure.

1. **AI corner cutting:** a 48–170 m steering target pulled racers through the inside of corners. Pursuit now uses 23–77 m while braking retains a separate 325 m forecast. The speed limit is solved against the selected vehicle's turning and braking config, including upgrades; the previous controller assumed every class handled like the base podracer.
2. **Avoidance leaving the corridor:** full steering impulses and edge-seeking mistakes pushed the field into scenery. Avoidance now moves the pursuit aim within a bounded lane. Ordinary circuit turns retain grip; intentional drift remains a drift-trial behavior. Personality, seeded mistakes, difficulty, passing decisions and the existing mild catch-up policy remain distinct.
3. **Branch endpoint deadlock:** the previous target was a discrete branch point clamped at the penultimate point. The new target interpolates the actual polyline and continues beyond its merge onto the main course. After a backward recovery jump, the AI abandons the failed branch while retaining the decision key, so it does not immediately reselect the same failure. Branches blocked by the swept craft body are declined before commitment.
4. **False recovery on a legal shortcut:** Glass rivals were reset at approximately `(11036, 1306)` and progress `0.835`, with branch projection reporting zero off-course distance. The recovery routine compared them to the distant main road. Root corrected the branch-aware corridor check in `RaceSimulation`; the new sustained shortcut regression verifies that a valid branch remains playable.
5. **Synthetic finishing evidence:** root changed `classifyRemainingRacers` to preserve real lap counts and null finish times for unfinished entrants. The diagnostic independently counts actual lap-complete events to avoid trusting presentation classification.

Baseline impact hotspots are preserved in `output/drive-balance/before-ai-fix.json`. These coordinates are the first observed **craft impact positions**, not mesh origins:

| Cup | Scenery source | Impact X, Z | Baseline events |
|---|---|---|---:|
| Canyon | `inkstorm-roadside-shard-304` | 19442, -935 | 14 |
| Canyon | `inkstorm-roadside-shard-287` | 19659, -607 | 12 |
| Foundry | `inkstorm-wind-blade-263` | -19400, 818 | 37 |
| Foundry | `inkstorm-refinery-stack-243` | -19431, 805 | 24 |
| Glass | `inkstorm-roadside-shard-81` | 9737, -768 | 54 |
| Glass | `inkstorm-roadside-shard-79` | 9769, -717 | 50 |

The unchanged layout is traversable on the canonical line; these hotspots primarily exposed AI path failure. Move scenery only if live human playtests find a misleading passage, rather than removing collision truth to hide controller errors.

## Validation and remaining acceptance

- `npm run test`: **297 tests passed across 54 files**.
- New AI regressions cover braking by actual handling limits, pursuit past a branch merge, abandoning a recovered branch, and sustained occupancy of a legal shortcut. Existing deterministic controller, personality, checkpoint and avoidance tests pass.
- `repeat-canyon.json` matches `final-pace.json` exactly for racers, recorded input/trajectory trace, recoveries, collisions and hotspots. Execution time and receipt metadata are excluded from that comparison.
- The script ran to completion without its simulation or wall-clock limits. No browser was opened and no rendering/FPS conclusion is drawn from headless simulation timing.

Next human acceptance should check the hero lap with all four classes, especially bike landing punishment; evaluate whether hard AI provides a satisfying pace challenge; and calibrate medal tiers from real player distributions. The production 8-second finish window remains unchanged; the 20-second window above was diagnostic only. Three fixed Cup seeds and medium AI were covered in this snapshot. Chaos modes, all procedural seeds, all upgrade combinations and touch/controller feel remain outside this study.
