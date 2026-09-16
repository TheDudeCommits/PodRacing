# Round 41 — Tight packs, grudges with a voice, photo finishes, boost decisions, debris (2026-09-16)

Owner request after round 40: five items from the excitement list. All five are in; each is deterministic on the simulation side and presentation-only where it touches the camera, clock or audio.

## 1. Fair catch-up through drafting only

- `RaceSimulation.draftCatchUpFactor` gives every racer a 0..1 factor from distance behind the race leader (zero inside 60 m, one at 420 m). The leader always gets zero, and nothing caps the leader's speed.
- `stepDraftingField` reads it: the wake reaches 70 → 120 m (`wakeReach`), the slingshot charges up to 1.8× faster and kicks up to 1.5× harder, and a bounded tow (4 → 16 m/s² at full wake) pulls the follower along while it sits in the wake. `RacerDraftingState.catchUp` records the factor.
- Tests: `draftingCatchUp` (reach, tow, slingshot charge, leader untouched, real-race factor).

## 2. Rival taunts and revenge beats with sourced voice lines

- New authoritative events: `revenge-pass` (you pass the racer who wrecked you while the grudge lasts) and `rivalry-settled` (you wreck them; the grudge clears). Both come out of the race step next to the existing `rivalry-marked`.
- HUD: a `revenge` combat cue names them on screen (`MARKED // X WRECKED YOU`, `REVENGE PASS // X`, `GRUDGE SETTLED // X`) beside the existing `REVENGE // X` bearing cue.
- Voice: five existing CC0 recordings from Kenney's "Voiceover Pack: Fighter" (`public/audio/voice-fighter/`, ledger and licence in `assets/source/audio-voice-fighter/`): "Prepare yourself" (marked), "Loser" (revenge pass), "Combo breaker" (grudge settled), "Final round" (final lap), "Sudden death" (photo finish). They play through the callout bus with the overtake ducking, one at a time, never pitch-shifted (`PodracerAudio.playVoiceLine`, cue kind `voice`). Nothing was synthesised.
- Tests: `rivalryBeats`, `voiceCues`, `raceMusic` (voice playback and no-overlap), `recordedCatalogue` (hash provenance, credits).

## 3. Photo finish and last-lap tension

- Music: entering the final lap of a multi-lap race lifts the race score by 5% tempo and +1.7 dB (`setRaceMusicIntensity`) and speaks "Final round". It resets at the next race.
- Camera: on the final lap, through the recovery straight and the start straight, the chase eye moves 4.5 m closer and 1.8 m lower, looks 14 m further down the road and opens the lens 4° (`CameraSubject.finalStraight`, blended in `GameApp`).
- Slow motion: `PhotoFinishPresentation` arms when the local racer is within 90 m of the line on the final lap and a rival on their final lap is predicted to cross within 0.5 s. Wall time eases to 0.32×, holds 0.7 s after the local racer crosses, then releases. A `PHOTO FINISH` banner shows while it is armed. It scales the scheduler's wall delta the way the combat cinematic does; fixed-step results, records and inputs are unchanged. Solo races only, never in capture.
- Tests: `photoFinish` (gap prediction, arm/hold/release, disabled), `finalStraight` (camera).

## 4. Boost as a decision

- Drafting charges the meter: boost regeneration scales by `1 + wakeStrength × draftBoostRegenBonus` (2.2× at full wake). The race layer passes `draftStrength` into `stepPodracer`.
- Real jumps refund: a clean landing after more than 0.45 s of air pays back up to 16% of the meter (`landingBoostRefund`, event `boost-refund`); slammed landings that take damage pay nothing.
- Overheating costs handling: for two seconds after the engines overheat, steering rate loses up to 35% and grip up to 25%, easing back linearly (`overheatHandlingTime/Penalty`, `boost.overheatHandlingTimer`). `DRIVE5_COMPATIBILITY_CONFIG` zeroes all three so the archived V9 replays still reproduce.
- Tests: `boostDecision`.

## 5. Wreck debris and the drop-in shadow

- A wreck sheds four parts 10–28 m ahead of the craft (`world.debris`, seven seconds, deterministic spread per racer and crash count). Driving through one costs 5% hull, a small shove and a 0.22 s stun, and kicks the piece away (`debris-hit`). The wrecked owner is never hit while down. AI drivers avoid debris through the same point-hazard path as mines.
- The respawn is telegraphed: while any racer is wrecked, a dark disc sits on its drop-in point and deepens as the recovery timer runs out (`respawn` hazard kind, new `respawnShadows` ground-disc pool in `GalacticEffectsView`). Debris shares the solid-hardware pool as a `debris` variant.
- Stills through the review API (`scripts/wreck-debris-stills.mjs`, hero orbit, player wrecked with the diagnostic hook): [wreck with shed parts](evidence/handling-round41/wreck-debris/02-wreck-debris.jpg), [mid-wreck shadow deepening](evidence/handling-round41/wreck-debris/03-mid-wreck-shadow.jpg), [drop-in](evidence/handling-round41/wreck-debris/04-drop-in.jpg), [after respawn](evidence/handling-round41/wreck-debris/05-after-respawn.jpg). The review placement makes every racer's respawn its placed spot, so the shadow sits beside the wreck in these frames.
- Tests: `wreckDebris`.

## Validation

- `npx tsc --noEmit` clean; **1052 tests / 183 files** pass; `vite build` passes.
- Browser on the built bundle: race start requests the race score and all five voice lines; debris/shadow stills above with zero page errors. Browsers and preview servers closed after each capture.
- Not captured in frames: the revenge cue, the photo-finish slow motion and the final-lap camera need a real rival race with the right outcome; they are covered by unit tests and the state they read is exercised in the native Battle flow.

## Diagnostics added

`window.__PODRACING__.debugWreckRacer(id)` (solo-only) beside `debugWreckPlayer()`; the review snapshot reports `galactic.debris`.
