# Round 40 — Lance that stays alive, a camera that comes back, race music (2026-09-16)

Owner report after round 39: the Heat Lance (E) stopped firing part-way through a race; the camera angle felt stuck after a wreck and respawn; the race needs more exciting background music.

## Heat Lance stopped firing

**Cause.** Round 38 made lance cells finite (six to start, one per shot) and refilled them from four authored `lance-cells` racks. The racks respawn every five seconds, but the combat-pickup ledger (`collectedPickupIds`) treats every combat pickup as one claim per racer per race, which is right for the EMP cell and repair salvage and wrong for ammunition. A racer could therefore collect each rack once: 6 + 4 × 4 = 22 shots for the whole race, after which the trigger did nothing and the HUD read `Empty`. Bots ran dry the same way.

**Fix.**
- Lance racks are ammunition: the same racer may take a respawned rack again on every lap (`combatPickups.ts`, claim loop in `system.ts`). EMP and salvage keep their one-claim rule and their tests.
- A trickle: while the rack holds fewer than three cells it regenerates one cell every six seconds (`LANCE_CELL_REGEN_FLOOR`, `LANCE_CELL_REGEN_SECONDS`, `weapon.regen`). Pickups are still the only way to a full rack, so the pacing intent survives, but the weapon can never die for the rest of a race.
- The HUD's primary slot shows `Charging N%` with the dial filling while empty instead of a dead `Empty`.

Tests: `combatPacing` gains "lets the same racer refill from a rack again once it has respawned" and "trickles one cell back every six seconds…"; the firing-window test now covers four seconds so it measures the finite rack rather than the trickle.

## Camera after a wreck

**Cause.** The victim wreck chase (`combatChaseRecovery`) stayed engaged through the *recovering* phase, which is the 1.55–2.9 s control-link countdown after the craft has already been placed back on the track. The rig holds a fitted three-quarter/side eye for that whole window, then hard-cuts to chase when the phase turns to *running*. The player sat looking at the side of their own pod on the start straight, then the view jumped.

**Fix.** The wreck chase now ends at the respawn itself: `stillWrecked` requires the *wrecked* phase, and the one-time cut to the exact chase pose happens on the first *recovering* frame, which is the same tick the craft teleports. Frames from a real Battle race on the built bundle, player wrecked through the new diagnostic hook:

| | wreck ends | respawn +0.3 s | respawn +0.8 s | control link restored |
|---|---|---|---|---|
| before | [05](evidence/handling-round40/recovery-camera-before/frame-05.jpg) | [06](evidence/handling-round40/recovery-camera-before/frame-06.jpg) side view, HUD hidden | [07](evidence/handling-round40/recovery-camera-before/frame-07.jpg) still side view | [08](evidence/handling-round40/recovery-camera-before/frame-08.jpg) hard cut to chase |
| after | [04](evidence/handling-round40/recovery-camera-after/frame-04.jpg) | [05](evidence/handling-round40/recovery-camera-after/frame-05.jpg) chase behind the pod | [06](evidence/handling-round40/recovery-camera-after/frame-06.jpg) chase | [07](evidence/handling-round40/recovery-camera-after/frame-07.jpg) chase, no jump |

Receipts with the wreck phase per frame sit beside the images. `scripts/recovery-camera-frames.mjs` reproduces this; it uses `window.__PODRACING__.debugWreckPlayer()`, a new solo-only diagnostic that wrecks the local player as a fatal impact would (`RaceSimulation.forceWreck`). It writes no records.

## Race music

The race phase used the selection score (the Scott Buckley "Juggernaut" excerpt) at a restrained 0.31 mix, which reads as ambient under the engines. Two existing high-energy compositions by Kevin MacLeod (CC BY 4.0, incompetech.com) now play only while a race runs, rotating per race so back-to-back races do not repeat:

- "Exhilarate" (trimmed 0:00.6–2:21.0) and "Cyborg Ninja" (to 2:59.9), both −4 dB with short edge fades, 44.1 kHz / 128 kbps MP3, looped.
- `PodracerAudio.transitionMenuMusicToRace` schedules the race score into its own group on the music bus (0.56 group gain, bus 0.5 × the music slider, roughly 7 dB above the old race mix) and silences the selection score's group; `transitionMenuMusicToSelection` reverses it without restarting the intro. If the race score fails to decode, the old mix stays as the fallback. The overtake-callout ducking already sits on the music bus, so it covers the new tracks.
- Provenance: `assets/source/audio-race-set/` (originals, `SOURCE_MANIFEST.json`, `runtime-files.json` with the exact ffmpeg operation and runtime hashes) and `public/audio/race-set/CREDITS.html`. No music or sound was generated; the intro file is untouched (SHA256 39c4d411…).

Tests: `recordedCatalogue` admits the new folder by hash and credits; `raceMusic` drives a fake context through selection → race → selection → race and checks the loop, the fade targets and the rotation.

## Validation

- `npx tsc --noEmit` clean; **1034 tests / 176 files pass** (`/tmp/vitest-full.log`, machine still under the owner's other workloads); `vite build` passes.
- Real browser on the built bundle: starting a race requests `/audio/race-set/exhilarate.mp3` after the selection score, zero page errors. Recovery-camera frames above, zero page errors.
- Browsers and preview servers were closed after each capture.

## Not done

Frame cadence on a quiet machine; the remaining 1.6% hull burial; the improvement list in the handover.
