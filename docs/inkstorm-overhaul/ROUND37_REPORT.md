# Round 37 — Drive 6 handling, course 10 sweeper, fair combat, pod identities (2026-09-16)

This round implements the first four roadmap items from the stylized restoration handover: satisfying handling, one polished circuit, fair combat with smarter rivals, and distinct pod personalities with sourced engine voices. The stylized art direction and the retained dusk sky are untouched. Records and ghosts are versioned (`inkstorm-course-10`, `inkstorm-drive-6`), so earlier bests are archived rather than compared against the new feel.

## 1. Handling (drive 6)

All changes live in the deterministic 120 Hz vehicle step (`src/game/simulation/podracer.ts`, `config.ts`) and are data-driven through `PodracerConfig`.

- **Predictable braking.** Brake input scales engine thrust down (`brakeThrottleCut`), so a held throttle cannot fight the brake. Braking also scrubs lateral slide (`brakeLateralScrub`) and adds trail-braking steering authority (`brakeSteeringBonus`). Brake deceleration is one constant on top of drag across the speed range (tested within 8%).
- **Controllable drifts.** The slip angle follows live steering magnitude (`driftSteerSlipShare`): easing the stick shallows the slide. Releasing a drift blends grip back over 0.36 s instead of snapping, and the scrubbed slide becomes forward travel (`momentumRetention`).
- **Smoother hover.** Within repulsor range the bed is a two-way spring: it pulls the craft back toward hover height when it rides high or rises fast (`repulsorAttraction`). Crests are hugged closer than under the drive-5 tune while a real drop beyond range still flies.
- **Landings preserve momentum.** Airborne grip and steering are reduced (`airLateralGrip`, `airSteeringScale`), so velocity carries through flight; a real landing regrips over 0.3 s. The per-landing damage cap drops from 0.22 to 0.14, because the authored 138 m launch escarpment lands at terminal speed every lap and the old cap made a clean three-lap race wreck itself.
- **Bank assist.** A banked surface turns the craft toward the low side (`bankAssist`) and lets a slow craft creep down the camber (`bankSlide`).
- `DRIVE5_COMPATIBILITY_CONFIG` reproduces the previous feel for the archived native V9 wreck replays; new races never use it.

## 2. Flagship circuit (course 10)

- **Banked sweeper.** `bakeSweeperBanking` cambers the wide sweeper inside the shared launch gulf field, scaling with the actual curvature (up to 0.24 rad where the bend is strongest) and fading back to desert at both ends and beyond a 16 m shoulder. Physics and the terrain shader sample the same texels, so the craft rolls with the bank it can see. The remaining course-8 lane samples outside the launch and sweeper editions are proven bit-identical (old code and new code produce the same digest on the sweeper-excluded set).
- **Fewer distracting props.** On the flagship seed only: half the roadside shards, none through the sweeper, sparser near buttresses and refinery stacks (layout 227 → 158 placements).
- **Turn markers.** Two tall wind blades stand on the outside of the sweeper apex and the hairpin apex, beyond the lane and its runoff, so exits read before the braking point.
- The existing elevated shortcut, technical and safe branches are retained unchanged.

## 3. Fair combat and smarter rivals

- **World occlusion.** `stepGalacticWorld` accepts an occluder; `RaceSimulation` supplies one built from the course scenery and canyon-wall proxies. A lance that hits scenery before a hull is removed and emits `heat-lance-blocked`. Proven in a real race: a lance aimed at the canyon wall never crosses it.
- **Nearest swept hit.** Projectile and mine hits resolve to the nearest hull along the sweep (`sweepCircleEntry`), with a stable id tie-break, instead of the first roster entry.
- **Threat-aware rivals.** `assessGalacticThreats` replaces the periodic windows: rivals fire only at a target inside the lance cone with a clear line of fire, on a deliberate half-second-every-two-seconds cadence, never from the grid, never at a returning or shielded racer; they drop mines only with a genuine pursuer; they shield only for an inbound lance, an unavoidable mine ahead, or an aimed rival while damaged. The driving AI steers around deployed mines, no longer brakes for a rival that is leaving the grid, and lifts the throttle when it brakes.
- **Protected returns.** Recovery immunity grows with consecutive wrecks (1.55 s → up to 2.9 s).

## 4. Pod identities and sourced engine voices

`src/game/podIdentity.ts` gives each registered appearance a handling/weight/heat identity applied on top of the class and workshop tune, plus a sourced engine voice:

| Pod | Role | Handling notes | Engine voice |
| --- | --- | --- | --- |
| Teemto | Balanced racer | reference tune | Rocket Boost Engine Loop (qubodup, CC0) |
| Sebulba | Fast, heat-sensitive | +5% top speed, +12% boost, 40% hotter boost, slower cooling, lighter | same loop, higher rate and brighter |
| Polwo | Agile specialist | +16–22% steering, stronger grip and drift charge, −3.5% top speed, light, takes landings badly | Fan motor (Rvgerxini, CC0) |
| Blockrunner | Heavy bruiser | 1.32× mass, slower to turn, stronger brakes, 35% less landing damage, cooler running, 18% less incoming damage | Car Engine Loop (qubodup, CC BY 3.0) |

The identity travels in the race entry (`podIdentity`), survives reset and snapshots, is part of the record identity, and drives the garage card (role, tagline, four ratings) and the player/rival audio registers. No audio was generated; both extra loops were already in the licensed bank and are credited on the audio credits page.

## Validation

- `npm run verify`: TypeScript, **1012 tests / 172 files**, build pass. [Validation log](evidence/handling-round37/validation.log).
- **Ten clean laps across three authored courses** with the headless input-only driver (`scripts/drive-balance.ts --laps=3`): Canyon 3 laps 56.9/56.7/58.1 s, Foundry 3 laps 58.5/57.3/57.2 s, Glasslands 3 laps 63.9/62.6/62.6 s, plus a 55.5 s Time Attack; zero player resets, wrecks or scenery contacts; no AI wrecks on Canyon or Foundry. Before this round the same driver reached 0.67 damage in two Canyon laps and wrecked in three. [Receipts](evidence/handling-round37/).
- **Identity laps** on the Time Attack: Sebulba 54.0 s, Polwo 55.0 s, Teemto 55.5 s, Blockrunner 57.7 s, all clean.
- **Native browser Battle** through the ordinary gamepad driver on the built bundle: finished, zero browser errors, all 11 recordings loaded (including the two engine loops), takedowns credited, browser and server closed. [Receipt](evidence/handling-round37/native-battle-receipt.json), [results still](evidence/handling-round37/native-battle-results.png). Cadence is recorded separately in the performance run noted in the handover.

These are automated-driver and headless measurements, not human handling acceptance. Physical controller laps, listening approval of the engine voices and a first-time player check remain owner work.

## Not done this round

Mastery calibration, HUD combat lesson, real-hardware profiling, private multiplayer checks, and admitting more vehicle families (the fleet stays at four until the identities have been felt by a human).
