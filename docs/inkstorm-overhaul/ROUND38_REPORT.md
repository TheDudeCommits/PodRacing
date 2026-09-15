# Round 38 — Solid world, real hulls, paced combat, rival personalities (2026-09-16)

Owner request after round 37: pods must react to terrain and scenery instead of passing through them; combat should be paced and personal. This round implements owner items 1–5, 6, 7, 9, 10, 12 and 13 from the improvement list. The ring/shield visual redesign (item 6's visual half beyond hit placement) was not attempted.

## Solid scenery (1, 5)

- Every rendered family now has a collider. Rock masses (`canyon-buttress`, `fractured-spire`, `cliff-strata`) use ellipses fitted inside their measured low-vertex footprints; the canyon arch is two measured legs (local X ±50–90 m) with an open span; the Foundry corridor's decorative landforms are solid too. `inkstormLayout.ts` owns the colliders, and the Heat Lance occluder reads the same proxies, so shots and pods agree.
- The pure rock-grounding and foundry-corridor plans moved from the renderer into `src/game/race/` (shims keep the old import paths) so the simulation can see them.
- `getInkstormSolidHeight` reports a rock crown as the surface inside a footprint; wreck poses and breakup debris settle on it, so a wreck leans on the rock it slid into.

## Real hulls (2, 3, 4)

- Two nose probes at 17.5 m join the six-point bed (`engine-left-nose`, `engine-right-nose`). The authored engines reach 19–23 m ahead of the origin; before this the bed could not see the ground under them, so a nose-down pitch buried the engines in every rising slope.
- A probe below the hard deck now rotates the craft away from the ground it hit (`hullKick`): a buried nose pitches up, a buried engine rolls up. Supported clearance is judged by in-range probes only, so a nose hanging over a deck edge no longer reads as airborne.
- Pod-to-pod contact uses two engine capsules and a cockpit sphere per craft (`hullPrimitives`, `closestHullContact`) instead of one 7 m circle: contact happens at the visible engine edge, and the lever arm is the real contact point. A side-by-side rub trades pace between the hulls and costs 40% of the damage of a shove.
- The starting grid pitch grows from 25 m to 31 m so noses no longer start inside the pod ahead, and the driving AI treats a rival within 30 m in its lane as urgent (hull overlap band), which halved rival wrecks on the three-lap Canyon run.
- `DRIVE5_COMPATIBILITY_CONFIG` keeps the six legacy probes and no hull kick, so the archived V9 wreck replays still reproduce.

## Paced combat (6, 7, 10)

- Heat Lance cells: six to start, one per shot, refilled by four authored `lance-cells` pickups aligned to the canyon entry, chicane, hairpin and open straight (respawning like the other combat pickups). The HUD shows `Ready ×N` and `Empty`.
- The lance flies at 150 m/s relative to the shooter (was 268), so leading a target is a skill; the beam is visible longer. The player gets a `target-lock` event and HUD target name when a rival is in the cone with a clear line of fire, refreshed at 15 Hz.
- Impacts carry the hull point the sweep reached (`hitX/Y/Z`); lance and shield flashes are emitted there instead of at the racer's centre.

## Physical racing (9)

- Drafting is visible: the leader's wake thickens the speed streaks and a slingshot flares them.
- Engine-to-engine rubs exchange forward speed (bounded per tick) instead of only dealing damage.

## Personalities and grudges (12, 13)

- Rival combat follows the driving personality (`GalacticAITactics.style`): aggressive rivals hunt the human and keep the trigger window open longer; clean rivals shield as soon as anyone lines them up; erratic rivals seed chicanes and hairpins with mines even without a pursuer.
- A racer that wrecks you is marked for 45 s (`rivalry`): the victim's rivals prefer that target, the HUD shows a `REVENGE // NAME` cue while they are within 220 m, and audio marks the moment.

## Validation

- `npm run verify`: TypeScript, **1030 tests / 175 files**, build pass ([log](evidence/handling-round38/validation.log)). New suites: `solidScenery`, `hullContact`, `combatPacing`.
- Headless input-only driver, ten clean laps across Canyon, Foundry and Glasslands (3 laps each) plus the Time Attack: zero player resets, wrecks or scenery contacts. Rival wrecks on the three-lap Canyon run: 2 of 7 (escarpment landings plus pack contact); none on Foundry or Glasslands. [Receipts](evidence/handling-round38/).
- Native browser Battle on the built bundle through the ordinary gamepad driver: finished, zero browser errors, all 11 recordings loaded; the live receipt shows target locks, lance-cell pickups, rivalry marks and takedowns. Browser and server closed. [Receipt](evidence/handling-round38/native-battle-receipt.json).
- Cadence remains unmeasured on a quiet machine (see round 37); the headless Battle step cost is unchanged in order of magnitude.

## Not done

The shield shell and ground-ring visual redesign, a reflect-timing shield, damage-driven handling, and the remaining roadmap items.
