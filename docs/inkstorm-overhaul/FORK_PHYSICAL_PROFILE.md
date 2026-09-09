# Physical fork revision — course 8 candidate

The main route in round 18 disappeared behind its first dune crest and the overlapping raised branch entry. This revision changes the actual route and shared terrain: the bridge diverges earlier, and the main-road crest is cut down. It does not alter the live camera or use a review-only pose. The course 7 path remains recorded in `fixtures/fork-course7.json` for an independent comparison.

## Implementation

- `src/game/race/branches.ts`: the flagship elevated shortcut receives a smooth sideways offset of up to 24 m over the first half of its existing route progress. Start/end XYZ, width, point count, canonical progress, checkpoint plan and all other branches/seeds remain unchanged. The existing supported-deck elevation builder regenerates deck heights at the new XZ points. This is an intentional physical bridge change; intermediate deck heights are not claimed identical to course 7.
- `src/game/race/CourseGulfField.ts`: a negative-only main-road profile is baked into the existing finish displacement grid. Relative to branch entry at 6107.454 m, the influence fades in over +12 to +72 m and out over +340 to +440 m. Its ceiling descends from approximately −2.42 m to −4.42 m; existing lower hollows are retained. The full-width field extends 50 m from the main centreline and fades by 110 m.
- The carve protects every new branch lane plus the bilinear cell diagonal and 1.5 m. Dense independent comparisons confirm exact equality of branch ground/support heights and the 0.85 m CPU / 1.15 m MRT normal probes, with and without the main carve. The formerly untouched extra 10 m off-road branch shoulder can now transition toward the canonical lane. Beauty lighting's 9.5–48 m stencil may intentionally average across that transition.
- The two existing R32F grids remain 417² and 257²: 959,752 bytes total. No new geometry, texture, per-frame allocation or shader sampler is added by the profile. The launch grid is byte-identical when toggling this fork profile. The finish grid minimum remains −150 m, inside the existing −170 m displacement bound.
- Main-road sampling, physical recovery, AI, bridge support, road displacement and terrain use the existing shared field installation. No GameApp integration change was needed. The parent task updates the generation identity to course 8.
- The root separately corrected open road endpoint tangents in `InkstormRoad.ts`. That bug was real, but detailed triangle rays showed it was not the whole visibility problem: subsequent bridge rows still overlapped the old main sightline.

## Geometry and driving evidence

`tests/terrain/forkApproachProfile.test.ts` adds independent old/new field comparisons, a saved original branch comparison, full branch lane and normal-probe sampling, unchanged launch/other-course checks and full usable road-width grade checks. Related branch, divider, camera framing and road endpoint tests also pass: **32 tests in 6 files**. Typecheck and `git diff --check` pass. Tests retain the exact checkpoint hash and update the branch-plan hash for the authorized physical change.

Measured main centreline over entry to +460 m, sampled every 2 m with an 8 m forward grade: the maximum falls from 0.327 to 0.288; the maximum where this carve changes either endpoint by more than 0.1 m is 0.187. Maximum centreline lowering is 6.15 m. Full usable-width samples also do not increase their previous peak grade. These are measured samples, not a bound on every off-road shoulder.

Eight input-only single laps completed naturally, with every ordered checkpoint and **zero collisions or resets**:

| Class | Main route | Raised route |
|---|---:|---:|
| Podracer | 54.74 s | 56.12 s |
| Landspeeder | 62.67 s | 63.64 s |
| Speeder bike | 51.44 s | 52.82 s |
| Skim speeder | 57.86 s | 59.05 s |

The raised-route runs spend 2.78–3.36 s on the bridge region and include physical grounded support. They use the installed RaceSimulation terrain, semantic steering/throttle/brake/boost inputs and stock event settings. They do not teleport racers or mutate progress. These times are controller evidence, not human handling or medal-balance acceptance.

The additional stock Canyon Cup observer uses **`competitionProfile: clean-race`**, two laps and eight racers. All eight finish naturally, cross all 20 checkpoints in order and perform zero resets. It is **not collision-free**: Kodo has four leading-divider contacts and Olan one; other contacts include racers and a small number of existing roadside objects. The player brakes before the final line to let AI complete; the canonical eight-second result grace remains unchanged. This establishes bounded completion, not clean AI driving or combat-mode acceptance.

Raw receipts with per-run source hashes:

- `output/drive-balance/fork-profile-main.json`
- `output/drive-balance/fork-profile-bridge.json`
- `output/drive-balance/fork-profile-cup-observer.json`
- `output/terrain/fork-physical-profile/acceptance.json`

Concurrent launch scenery cleanup belongs to a separate task. The raw hashes preserve precisely which shared source state each CPU drive used; the combined latest build still needs the parent's regression capture.

## Actual triangle visibility and remaining limits

`scripts/fork-physical-visibility.ts` recreates shipping main/branch road triangles, the bridge structure and the first three camera-centred terrain clipmap rings. It evaluates the shared Float32 displacement at their vertices, then rays to five points across each lane at +90/+120/+150/+180/+220 m. The ordinary junction camera uses the actual round-18 speed and hover height. The three comparisons are original path without carve, diverged path without carve, and divergence plus carve.

At the branch entry, for lateral positions −6/0/+6 m, visible main-road samples improve from **1/25 each** to **16/25, 17/25 and 18/25**. The raised lane remains **25/25**. Divergence alone still gives only 1/25 main samples, so the shared physical crest change is necessary. At +20 m, 19/25 main samples are visible; raised-lane visibility is 23–25/25.

The result is not uniformly readable along the approach. At −60 m only 8–11/25 main samples are visible; at −20 m only 2–5/25. Thus this receipt cannot claim continuous simultaneous-route visibility, concept parity or visual acceptance. Rays exclude most world scenery, other racers, fragment transparency and GPU precision differences. Grounded cliff rays in the separate framing receipt supplement this diagnostic; neither replaces the next actual in-world capture and blind review. No browser, production build or FPS benchmark was run by this subtask.

Exact numerical evidence and source/fixture hashes: `output/terrain/fork-physical-profile/rendered-visibility.json`. The earlier optical-envelope receipt remains `output/terrain/fork-revision/framing.json`; the updated diagnostic is `output/terrain/fork-physical-profile/framing.json`. The latter's six-point envelope must not be confused with rendered lane visibility.

Reproduce the focused checks with:

```sh
npx vitest run tests/terrain/forkApproachProfile.test.ts tests/terrain/courseGulfField.test.ts tests/race/bridgeSurface.test.ts tests/camera/courseJunctionFraming.test.ts tests/race/inkstormFork.test.ts tests/render/inkstormRoad.test.ts
npx tsx scripts/fork-physical-visibility.ts
npx tsx scripts/drive-balance.ts --only=inkstorm-trial --label=fork-profile-main --wall=45
npx tsx scripts/drive-balance.ts --only=inkstorm-trial --bridge --label=fork-profile-bridge --wall=45
npx tsx scripts/drive-balance.ts --only=cup-canyon --bridge --observe-ai=260 --limit=300 --wall=60 --label=fork-profile-cup-observer
```
