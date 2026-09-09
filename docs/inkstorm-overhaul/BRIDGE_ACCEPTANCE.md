# Flagship physical bridge acceptance

6 September 2026, 21:24 local. Simulation evidence only; this document does not certify visual matching, human driving feel, multiplayer transport or FPS.

## Implemented contract

Only seed `0x494e4b53` elevates its first shortcut. The existing 480.59 m polyline, 25 control points, widths, canonical progress mapping and all checkpoints retain their previous horizontal identity. Its smoothed terrain grade receives a sine-squared lift, with a global amplitude chosen so control points rise by at most 24 m. Both endpoints retain their analytic ground height. All other branches and course seeds remain unchanged.

`CourseBranchDefinition.elevated` is optional. Elevated points carry authoritative `y` values. `sampleBridgeSurface(branches, x, z)` returns the exact segment-interpolated height, branch identity, progress, lateral offset, width, tangent and grade. `createBridgeHeightSampler(base, branches)` overlays that support within the deck width, retaining analytic terrain outside and wherever a ramp margin is buried. `RaceSimulation` constructs its course from the base sampler first, then uses the shared wrapper for vehicle spawning, hovering, collisions and recovery. Branch projection also returns the deck height. No route progress, checkpoint advancement, player pose or multiplayer state is fabricated.

Ground pylons now have their rendered finite vertical span: ground −0.2 m to ground +9.9 m, with a conservative craft half-height of 2.8 m. `groundPylonConflictsWithBridge` is shared by renderer and simulation. It omits pylons occupying low ramp footprints with the widest stock vehicle's 7.8 m radius plus the pylon's 1.15 m radius. The first physical runs exposed `pylon-825-r` as a real entry obstruction; this shared exclusion removes that conflict without deleting scenery impacts elsewhere. Markers beneath high spans remain.

## Input-driven full laps

Commands from the checkout, using Node 24:

```sh
npx --yes tsx scripts/drive-balance.ts --bridge --bridge-speed=85 --only=inkstorm-trial --label=bridge-final-classes
npx --yes tsx scripts/drive-balance.ts --bridge --only=cup-canyon --label=bridge-final-production
npx --yes tsx scripts/drive-balance.ts --bridge --only=cup-canyon --observe-ai=210 --label=bridge-final-observation
```

The driver issues only steering, throttle, brake and boost inputs at 30 Hz into the actual 120 Hz simulation and actual analytic terrain. It starts on the normal grid, travels the full ordered lap and follows the bridge with pursuit targets. It now forecasts the fork's own curvature as well as the main road's curvature, so it brakes before the tighter joins. `--bridge-speed=85` is an additional diagnostic approach/span speed cap, not a physics or AI setting. No pose or progress is altered during the run.

| Stock class | Actual lap | Ordered checkpoints | Resets / wrecks / impacts | Time over elevated span | Grounded time over span | Minimum center-to-deck clearance |
|---|---:|---:|---:|---:|---:|---:|
| Podracer | 56.98 s | 10/10 | 0 / 0 / 0 | 4.56 s | 2.77 s | 0.58 m |
| Landspeeder | 64.37 s | 10/10 | 0 / 0 / 0 | 4.59 s | 2.80 s | 0.57 m |
| Speeder bike | 53.90 s | 10/10 | 0 / 0 / 0 | 4.53 s | 2.74 s | 0.59 m |
| Skim speeder | 59.88 s | 10/10 | 0 / 0 / 0 | 4.58 s | 2.78 s | 0.59 m |

Evidence: `output/drive-balance/bridge-final-classes.json`. Span statistics apply where the deck is more than 6 m above base terrain. Peak vehicle-center elevation above the desert is approximately 27.4 m, including hover clearance. No once-per-second player sample exceeds the legal corridor; this sampling cannot exclude a shorter excursion. The ordered checkpoint, reset, collision and lap events are checked every tick.

**Grounded does not mean continuously grounded while moving.** The deck has continuous physical support, and stationary integration stays grounded for all 360 ticks at each of three representative deck positions. At racing speed the downhill profile produces approximately 1.8 seconds of hover airtime before landing. A slower 50 m/s diagnostic still shows descending hover separation. These runs establish a driveable supported route and no fall-through; they do not satisfy an interpretation requiring wheels/repulsors to remain grounded over the entire descent. Global hover physics was not changed to conceal this behavior. Human testing should assess the landing: peak whole-lap damage ranges from 9.5% to 27.9%, highest for the bike, despite zero collision events.

## AI and finish-window distinction

The final Canyon Cup study uses the **production default 8-second results grace**. With the player completing two legal bridge laps in 113.12 s, only **1/7 rivals** finishes naturally before classification. The other six preserve their actual lap counts and null finish times. The player has zero resets or wrecks and nine racer-contact events; no scenery or pylon impacts occur during the pace run.

In the separate observation run, the player brakes after 90% of the final lap while rivals continue. All **7/7 AI** then complete two real laps with 20 ordered checkpoints each, in **117.73–144.92 s**. Six rivals use the bridge. One AI recovery remains, and none wrecks. The observation player finishes in 153.83 s; its time is not a pace or medal benchmark. Normal production does not wait for all rivals to finish.

Evidence: `output/drive-balance/bridge-final-production.json` and `bridge-final-observation.json`. Each receipt includes the exact source hashes and driver options at execution. The marker helper's later renderer-compatible input type narrowing preserves the same arithmetic and was regression-tested. Prior `bridge-first`, `bridge-supported`, `bridge-slow` and non-final bridge receipts record intermediate profiles/controllers/marker collisions and are superseded. The earlier `DRIVING_BALANCE.md` three-Cup tables are explicitly dated pre-bridge/layout snapshots and used a diagnostic **20-second** window, not the production default.

## Validation and remaining limits

- Typecheck and 26 targeted tests across bridge surfaces, race simulation and legal branch recovery pass. Thirteen bridge tests cover deterministic geometry identity, three nonhero seed fingerprints, exact supported interpolation, endpoint joins, legal branch projection height, full interior width, falling from a bridge edge to the actual desert, sustained stationary support, finite pylon airspace and ramp marker exclusion.
- No global analytic terrain, player handling, AI controller, result-window default or checkpoint rule changed in this bridge task. The existing first-route x/z and checkpoint SHA-256 fingerprints remain exact; nonhero branch arrays retain their complete old fingerprints.
- This is a heightfield support deck, not a volumetric underpass collision system. It allows falling from the edge onto desert; it does not model a vehicle deliberately driving underneath a deck at the same x/z. No canonical road crossing beneath the central span is introduced.
- AI scenery impacts still exist after the bridge: `inkstorm-roadside-shard-337` and `-369` account for seven events across the extended field, plus one `-2` event elsewhere. These do not prevent completion and are preserved in the receipt for later human/layout review.
- Renderer validation belongs to the shared visual gauntlet. Multiplayer reconstruction uses the unchanged deterministic seed contract, but the complete post-bridge browser regression is a separate root acceptance step. No browser was opened by this simulation study.
