# Executed native combat gauntlet

Four runtime behaviors passed on Chrome 1440×900 / DPR 1 using ANGLE Metal / Apple M4 and the same served bundle `index-_F1BLY7k.js`, SHA256 `d1c2dd3ecb226da13f9b729934d0564db31596ea4088fb2f8cf57e8b404eb079`. Browser contexts and the owned port 5196 server were closed after every attempt. Root's later UI v6 source changes were not built during these runs.

| Case | Executed receipt | Observed result |
| --- | --- | --- |
| Solo chase | `output/playwright/round35-combat-v2/receipt.json` | Actual redline explosion and wreck from native S + Shift. Simulation pace about 1.00× → 0.173× → 1.00×; side camera/matte and chase restoration passed. |
| Solo manual camera | same V2 receipt | Cockpit selected through the existing presentation-only camera API after actual launch. Actual wreck cut to side, then restored cockpit; slow pace about 0.173×. |
| System reduced motion | same V2 receipt | Actual wreck still slowed scheduling about 0.173×. No side cut or matte was observed. |
| Pause cancellation | `output/playwright/round35-combat-v3/receipt.json` | Native P held for 80 ms during the actual shot. 22 paused samples kept identical simulation frames, removed cue/matte, and restored cockpit. Resume pace was 1.0001×. |

V2's overall receipt remains FAIL because its zero-duration automated P pulse was not observed by the game's held-key RAF input poll. The first three cases passed independently. V3 reran only that pause case with an explicit 80 ms native hold. `native-gauntlet-audit.json` consolidates those four accepted cases, pins receipt/harness/image/video hashes, and preserves the failed attempts. It does not rewrite an earlier failed run as passing. V1 also preserves an initial manual-camera harness setup failure: normal Start cleared a camera selected in the garage; the corrected setup selects it after launch.

The read-only observer samples actual simulation-frame/race clocks, authoritative recent events, camera mode and HUD state. It does not use capture mode, a preset, diagnostic stepping, injected events, health/heat changes, or modified race state. Browser coverage is incoming solo redline wrecks; it does not claim a browser outgoing takedown or a live multiplayer session. The native video is a 25 fps visual recording, not a cadence benchmark, and contains no audio stream.

`tests/combat/CombatSimulationBoundary.test.ts` adds four passing CPU integrations. They generate an actual overheat/wreck from ordinary semantic inputs, compare identical 720-tick simulation outcomes with and without wall pacing, preserve existing wreck record rejection, keep host timing real time, restore guest snapshots without local guest stepping, and confirm clean-profile fire/mine controls produce no outgoing offense. The record-persistence check explicitly uses a synthetic finish boundary after real wreck ticks; it does not claim the brake/boost drive completed a lap. Existing controller unit tests cover a synthetic outgoing event in a clean policy and host/guest role gating.

New test file: 4/4 PASS. Full TypeScript check: PASS. This agent did not rerun the full 740-test suite previously reported by root.

## Visual review

The actual wreck cue is legible, and reduced-motion/pause stills show the expected suppression. The victim side shot clips the near Teemto engine at the bottom edge; framing acceptance remains open. This is visible evidence, not a simulation or timing failure.

A 5.48-second silent excerpt of the actual chase run is `output/playwright/round35-combat-v2/solo-chase-wreck-clip.mp4`. It was trimmed from source-video time 8.5 seconds and transcoded to H.264 without speed changes, interpolation, compositing, or state injection. Full native WebM recordings, 14 accepted-case PNGs, compact observations, exact served build hashes, and cleanup receipts remain in the V2/V3 folders. `solo-chase-wreck.png`, `solo-reduced-motion-wreck.png`, and `solo-pause-cancel-paused.png` were visually inspected; the excerpt was checked at its wreck frame.

## Run again

Build separately when intended, then run the already-built preview:

```sh
node scripts/inkstorm-combat.mjs
```

Optional environment variables: `INKSTORM_OUTPUT` chooses a new evidence directory, `INKSTORM_OWNED_PORT` chooses an unused owned port (5211 is refused), `INKSTORM_EXPECTED_BUILD` pins the served JS SHA, and `INKSTORM_HEADED=1` shows Chrome. `INKSTORM_COMBAT_CASES=solo-pause-cancel` reruns only the named case; comma-separated subsets are supported. The default runs all four cases. The script always closes its contexts/browser and owned preview server, including errors/signals; it never reuses another preview process.

Run the new CPU integration tests with:

```sh
npm test -- tests/combat/CombatSimulationBoundary.test.ts
```
