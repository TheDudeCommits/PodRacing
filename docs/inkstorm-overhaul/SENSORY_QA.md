# Inkstorm sensory QA — bounded audio capture

7 September 2026. **The captured mix has measurable headroom and no detected digital clipping. Headphone listening, final mixing, four-class identity acceptance, and controller feel remain open.** No direct audio-listening capability was available in this session; none of the conclusions below claims that the file was heard.

## Exact evidence

The ordinary built game was opened in a new, isolated headless Chrome context at 1280 × 720. The visible **Start Race** control launched the default **Inkstorm Time Attack / twin-engine podracer**. Only normal keyboard W, S, Shift and Escape input followed. The diagnostic API was used only to read snapshots; no scenario changes, course seeking, simulation stepping, telemetry injection or game-source changes were used.

- Build: `dist/assets/index-DC5VY9fH.js`, SHA-256 `ab646e7b4cb4350be066c72a86d668e1aace193d557c0eefcb38ea1d94c77395` (round 18a). This receipt does not cover later builds.
- [Unnormalized stereo float WAV](../../output/audio/sensory-round18a.wav): 32.4267 seconds, 48 kHz, 32-bit float PCM; SHA-256 `0c87f3433b76f9a140dbfad640459e242ad4e0379272e32752d4f252b5f91d7c`.
- [Opus WebM listening copy](../../output/audio/sensory-round18a.webm), [complete input/state receipt](../../output/audio/sensory-round18a-receipt.json), [sample analysis](../../output/audio/sensory-round18a-analysis.json), [FFmpeg loudness output](../../output/audio/sensory-round18a-loudness.txt).
- [Capture script](../../output/audio/capture-sensory-round18a.mjs), [analysis script](../../output/audio/analyze-sensory-round18a.mjs), [final frame](../../output/audio/sensory-round18a-end.png).

A browser-only `AudioNode.connect` instrument added a parallel tap to the existing compressor's destination connection. The original speaker route, gains, routing, source automation and game runtime remained intact. A MediaStreamDestination captured Opus; a ScriptProcessor captured the same post-compressor signal as float PCM. The PCM file was not normalized, limited or converted from Opus. The silent ScriptProcessor sink adds no audible output. This measures the browser graph before operating-system/device volume or speaker/headphone response.

Both the owned Chrome process and local static HTTP server closed in `finally`; the receipt records successful closure. No existing user browser was used. No source files were edited and no build or deployment was performed by this QA task.

## What happened in the excerpt

Times are approximate to one 4096-sample tap block (85.3 ms).

| File time | Ordinary input and observed result |
| --- | --- |
| 0.30–4.31 s | Start/countdown, no throttle. Audio unlocked and the race score became scheduled. |
| 4.31–11.32 s | W held; recorded speed increased from zero to 124.29 m/s. |
| 11.32–14.33 s | W + Shift held; redline heat reached 0.985 and natural redline explosion/wreck/recovery events occurred. This includes a boost/heat/wreck combination, not an isolated clean boost stem. |
| 14.33–18.34 s | No input; the wreck recovered and speed reached zero. This is recovery into idle, not an isolated coasting comparison. |
| 18.34–21.35 s | S held at zero speed; idle mix. This does not establish the sound of braking from speed. |
| 21.35–24.36 s | **Pause attempted, not engaged.** Instantaneous Escape presses did not produce a sampled pause; race time advanced by 3.00 s. Pause attenuation/resume behavior is therefore not verified. A follow-up harness must hold the key across a simulation sample and verify paused state before timing this segment. |
| 24.36–29.37 s | W held again; speed reached 124.71 m/s. |
| 29.37–32.38 s | W + Shift; a second natural redline explosion/wreck sequence. |

There were zero browser console/page errors. Audio remained ready in every recorded game snapshot. Time Attack has no rival field, so this file does not establish spatial rival pass-bys. It also does not cover the other three vehicle voices, canyon response, landing comfort, race finish, human control feel or a sustained performance run.

## Signal findings

Measured from the original float WAV, with loudness and reconstructed peak calculated by FFmpeg's `ebur128=peak=true` filter:

| Measurement | Result |
| --- | --- |
| Integrated loudness | −14.7 LUFS |
| Loudness range of this short excerpt | 9.8 LU |
| True peak, rounded by FFmpeg | −4.2 dBFS |
| Sample peak | −4.155 dBFS / 0.61983 linear |
| Whole-file RMS | −16.66 dBFS |
| Samples at or beyond ±1 | 0 |
| Non-finite samples | 0 |
| Exact stereo-zero run | None |
| 20 ms windows with RMS below −80 dBFS | None |
| Left/right RMS | −16.64 / −16.68 dBFS |

Throttle windows measured approximately −15.62 dBFS RMS; the two boost/heat/wreck windows measured −14.91 and −14.99 dBFS RMS. Idle windows measured approximately −20.3 dBFS RMS. Those are observations of changing mixed game states, not isolated stem gain tests. No digital clipping or complete silence/dropout appears in this recorded excerpt; this does not prove the absence of audible clicks, masking, distortion, or device-level problems.

## Source findings and the next mixing decision

`src/audio/model.ts` defines four profiles using shared engine topology with pitch multipliers 1.00 (podracer), 0.70 (landspeeder), 1.46 (bike), and 1.16 (skim), plus different intake/exhaust ratios and gains. That establishes implemented parameter differences, not perceived identity separation. The current recording covers only the first profile.

`src/audio/PodracerAudio.ts` sends the combined mix through a −18 dB threshold, 8 dB knee, 7:1 compressor with 4 ms attack and 180 ms release. It also contains a 1,380 Hz heat-warning tone, a narrow Q 9.5 coupling band, and two 126 BPM adaptive rhythmic stems. These are concrete source features for an audition, not a claim of harshness or ear fatigue. Pause is designed to reduce master gain to 8% with smoothing; this capture does not verify that transition.

**The immediate useful next decision is a headphone audition of 11.3–18.3 s and 29.4–32.4 s:** determine whether the heat warning remains recognizable while the engine, redline effects and wreck cues overlap, and whether repeated exposure to the warning/coupling register becomes tiring. Then compare all four vehicle recordings at equivalent speed/load to judge identity separation. This evidence provides no reason by itself to change the master gain or declare the final mix accepted.

To reproduce against whichever build is present, run from the repository root:

```sh
node output/audio/capture-sensory-round18a.mjs
node output/audio/analyze-sensory-round18a.mjs
ffmpeg -hide_banner -i output/audio/sensory-round18a.wav -af ebur128=peak=true -f null - 2> output/audio/sensory-round18a-loudness.txt
```

The script records the current bundle SHA and overwrites its named output files. Preserve this evidence directory before rerunning against a later build. The script itself does not build the application.
