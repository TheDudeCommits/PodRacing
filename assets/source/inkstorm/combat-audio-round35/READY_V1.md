# Combat pickup audio — private patch ready

`combat-audio-v1.patch` is prepared only; no live audio or test files were edited. Root owns integration after the combat event changes. It adds two cue kinds and three event routes through the existing `mapGameEventsToAudioCues` → `PodracerAudio.trigger` path.

| Event | Listener policy | Synthesized response |
| --- | --- | --- |
| `emp-pulse` | Local emitter, matching existing fire-event policy | Descending 1,360→82 Hz triangle with a small cached bandpass-noise layer; 0.215 s envelope, 0.23 peak profile and 0.68 event intensity |
| `emp-hit` | Local target only; remote hits do not multiply the emitter cue | Existing electric response at 0.42 intensity, or existing shield response at 0.44 when blocked |
| `repair-salvage-collected` | Local collector with positive finite `repaired`, `cooled` or `coreCooled` | Ascending 440/554/660 Hz chime, 65 ms note spacing; 0.191 s per-note envelope with 0.18 peak profile and event intensity bounded 0.48–0.62 |

Existing event mapping has no one-shot position/distance contract. This follows its player-scoping policy rather than inventing spatial data. Unscoped preview calls remain supported. Existing strongest-per-kind batch coalescing limits duplicate EMP/shield voices. Core-only cooling is audible; no-op/nonfinite/negative restoration gives no false repair cue.

All nodes use existing oscillator/noise/arpeggio helpers, the cached noise buffer and owned effects bus. No new AudioContext, timer, recurring update, external media, permanent graph branch or pool was added. Existing mute/mix/context disposal behavior applies. Conservative numerical levels are a starting choice, **not a perceptual loudness or critical-listening claim**.

Validation: isolated TypeScript check passed; **20 tests across four audio files passed**. New tests cover emitter/target separation, blocked response, batch coalescing, finite envelope bounds, core-only cooling/no-op behavior, actual scheduled descending/ascending frequencies, short source stop times, reuse of cached noise/decoded context resources, and no playback allocation after disposal. Existing mapping/callout tests also passed. `git apply --check --whitespace=error-all` passed, and all four changed live-file baselines still match `inputs-v1.json`.

The patch changes `src/audio/PodracerAudio.ts`, `src/audio/model.ts`, `src/audio/types.ts`, extends the existing fake-audio scheduling harness in `tests/audio/PodracerAudioCallout.test.ts`, and adds `tests/audio/combatPickupAudio.test.ts`. Child GalacticEvent union changes are not required to typecheck this independent patch: the audio boundary already accepts `AudioEventLike`.

Before acceptance, root should listen during actual engine/music gameplay for EMP/blocked-hit distinction, repair intelligibility and transient stacking, verify effects mute/volume, and retain the normal full verification after integration. No browser or actual audio audition was performed here.
