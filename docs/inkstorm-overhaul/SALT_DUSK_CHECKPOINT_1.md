# Salt Flats at Dusk — checkpoint 1

This is a playable progress Preview, not final approval of the photographic target. The approved direction replaces Inkstorm’s anime shading; the existing course still needs major shape and composition work. Production promotion requires the owner’s checkpoint approval.

## What changed

- Photographic CC0 rock and cracked-ground materials from Poly Haven, with a photographic sunset cloud environment, coordinated low sun, warm reflections and cooler shaded surfaces. Dry Ground 01 is a recolored earth proxy, not a salt-flat scan.
- Continuous physical shading for imported pods, including source normal/roughness/metalness maps; reduced graphic outlines and softer dust/wake streaks. Moving shadows now handle the low sun. Smoothed road lighting removes triangular reflection patches without changing its physical heights.
- Navy, white and amber menu/HUD treatment, quieter panels and motion, smaller timer and event readouts, and correctly exposed settings dialogs. The simple four race tabs → inspectable 3D pod → necessary options → Race flow is preserved. Descriptive text is reduced while accessible names remain.
- Replaced active synthesized engine/effect/score playback with 27 existing audio files. Sources include recorded engines, motor and wind, Kenney catalogue effects, and Scott Buckley’s human-composed “Juggernaut.” No audio was generated. The original “Now this is podracing” file is byte-for-byte unchanged.
- Audio credits, bounded event voices, garage silence for vehicle loops, hidden-tab mute, and preserved player volume/music preferences. Original recordings and attribution/license records are retained.
- Shared texture ownership and preview readiness fixes prevent duplicate uploads, stale cached previews and abandoned asynchronous asset loads from leaking GPU resources.

## Validation

The frozen final source passed **971 tests across 166 files**, TypeScript, build and diff checks. This includes the corrected settings accessibility state and its complete HUD fixture. Diagnostic screenshots have no browser errors. They use staged camera/position controls and are explicitly not gameplay/performance proof.

The exact final bundle completed a default eight-pod armed Battle through standard virtual gamepad input: **59.910 FPS mean, 16.8 ms p95, 16.8 ms p99, 33.4 ms maximum racing frame**, across 5,858 samples / 97.780 seconds. Countdown is separately reported with one 49.9 ms frame. Device: Apple M4, Chrome 153, 1440×900 CSS viewport, requested DPR 2, adaptive actual DPR **1–2**. This is native browser RAF cadence, not GPU timing or a promise for other devices. The player finished in 86.450 seconds; recovery correctly invalidated the personal best. Field events included weapons, mines, shields, EMP, repair, takedowns and recovery. All 27 audio files loaded with no failures. Browser/server closed, errors empty.

Three selector/inspection/course cycles plateaued at identical second/third-cycle retained resources on the immediately preceding bundle with the same ownership code. Native responsive UI controls passed four viewport sizes. These checks do not establish human driving feel, perceptual audio quality or console-level visual parity.

Bundle: `index-DHCXwEh-.js`, **1,872,109 bytes**, SHA256 `21e5342d01a6da615856cfabccd6c7e23e41aa3f4bbc982d6e5564a001cbfb28`.

## Independent visual verdict

Fresh blind critic: **5.5/10 overall, 3.5/10 reference match**. Suitable to review as progress; not final visual acceptance. The menu, weathered pod materials and warm road reflections are the strongest surfaces. The concept’s cinematic geology, depth and light are not yet present. See [verbatim assessment scope](evidence/salt-dusk-checkpoint1/BLIND_CRITIC.txt).

## Next checkpoints

1. Author a broad salt basin and eroded stratified cliffs: strong silhouettes, distant mountain layers, clean runoff and irregular transitions. Existing white rolling banks can read as snow and the cliffs repeat texture.
2. Make dusk unmistakable: structured clouds, stronger grazing highlights, cool foreground shadows, selective reflective salt and distinct dry racing lanes. Keep the route readable at speed.
3. Replace geometric exhaust and tune ground-connected dust/wakes in a populated race; remove more persistent HUD labels and heavy shadows after evaluating readability in combat.
4. Listen to the sourced music/effects on real speakers/headphones and tune the mix. Current music is one 75-second licensed excerpt; additional licensed tracks and more distinctive engine recordings remain useful. Technical decode/playback checks are not listening approval.
5. Profile representative Windows/integrated-GPU and mobile hardware; compress texture uploads and improve LOD/load behavior. Current six PBR maps cost roughly 64 MiB uncompressed GPU memory, and decoded audio is roughly 46.6 MiB at a 48 kHz context.
6. Continue remaining vehicle admission/pilots: four of 26 preserved families are registered; this checkpoint adds no vehicle families. Keep the original model provenance/admission rules.
7. Continue the broader handling, course-flow, replayability and content backlog. This visual/audio checkpoint changes no simulation physics. Do not restore the withdrawn V36 terrain-relative suspension experiment.

## Assets and evidence

[Audio sources and modifications](SALT_DUSK_AUDIO.md) · [Visual source handoff](../../assets/source/salt-dusk/HANDOFF.md) · [Build/voice freeze](evidence/salt-dusk-checkpoint1/build-freeze.json) · [Native Battle summary](evidence/salt-dusk-checkpoint1/native-battle-summary.json).

Actual diagnostic images: [menu](evidence/salt-dusk-checkpoint1/00-menu.png), [salt straight](evidence/salt-dusk-checkpoint1/02-salt-run.png), [canyon](evidence/salt-dusk-checkpoint1/03-canyon.png), [launch](evidence/salt-dusk-checkpoint1/05-launch.png). These are game renders, not generated concepts. Raw local evidence: `output/salt-dusk/checkpoint1/`, `output/dusk-ui-2026-09-10/`, and `output/playwright/salt-dusk-audio/`.

Publication receipt will record the source commit, immutable Preview URL and authoritative deployment state after upload. The canonical main game remains the V36 Production baseline until checkpoint approval.
