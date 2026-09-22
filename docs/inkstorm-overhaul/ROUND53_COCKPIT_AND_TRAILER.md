# Round 53 — Smuggler's Cockpit and trailer v6

Approved direction: F. Implements the physical console as live DOM controls with CSS 3D depth, pointer perspective, raised/depressing switches, recessed phosphor screens, actual mesh inspection and a restrained automatic inspection turn. Eight pod screens, four destinations, four race modes; Race rules, Online, Options and Play on the bottom. Build and Courses remain in Race rules. Mobile stacks the main display above two four-pod banks. Keyboard inspection, touch rotation, reduced motion and existing audio settings are preserved.

Sound: four unmodified Kenney Interface Sounds recordings, downloaded from the official source, CC0. They use the existing effects/master buses and share their lifecycle cleanup. No generated or synthesized audio. Provenance is in `public/audio/cockpit/SOURCES.md`. The only generated visual asset is the worn metal material; geometry, controls, CRT treatment and interaction are implemented in code.

Validation: 1,114 tests across 191 files passed; typecheck/build/diff check passed. Desktop 1600×1000 and mobile 390×844 checked. All eight pods load, all modes/destinations select, keyboard inspection changes the render, rules/settings controls work and Play starts a race. No browser page errors; audio file loading reports no failures. Evidence is local in `output/round53/qa/`. Browsers close after each completed check/capture.

Trailer v6 pipeline: `scripts/trailer/v6/`. A 70.25-second, 1920×1080/60 fps edit with 30 cuts: 5.85 seconds of the working cockpit menu, 50.73 seconds of fresh gameplay across eight pod identities and four destinations, 7.8 seconds of existing approved Higgsfield/Seedance inserts and a 5.87-second end card. Ends with **Podracing.Dude.Work**. No added labels over racing; one short segment retains the actual gameplay HUD. Licensed music is reused with a new phrase edit and 52 sourced audio layers.

Gameplay evidence in the selected cuts: Skybolt ability 49 frames, Sebulba flame 70 frames, shield 28 frames, six lance discharges and one mine drop. Both drift shots reach full drift charge. Zero unexpected local-player wreck frames or page errors across the selected takes. All eight pods and all four biomes are asserted by the delivery check. The impact shot stages an opponent wreck with the diagnostic hook; initial formations and cameras are directed, subsequent motion runs the actual 120 Hz simulation.

Media is local and gitignored at `output/trailer-v6/`: `PodRacing-Trailer-v6.mp4` (master), `PodRacing-Trailer-v6-web.mp4` (sharing), `QA.json`, `MANIFEST.json`, `PUBLICATION.txt`, `edl.json`, `audio-edl.json` and `review/`. Both exports have 4,215 video frames and stereo 48 kHz AAC. Full-file decode and frame-count checks pass. All 90 start/middle/end cut samples were inspected; menu selection/drag, legible end card, distinct pod silhouettes, map coverage and the selected action effects were checked. Flame/explosion audio cues were corrected against action timing. Sample inspection and measured loudness are not continuous human audiovisual approval.

Reproduction, source locations and attribution are in `scripts/trailer/v6/DIRECTION.md` and `PUBLICATION.txt`. Keep the music attribution with any public upload. Earlier v4/v5 exports are preserved. No trailer video was added to the game's loading path.

The final web encode measures **−14.52 LUFS integrated / −1.22 dBTP**, with no silence interval of 0.3 seconds or longer at the −55 dB check threshold. This is measured on decoded AAC, after the final flame/explosion timing correction. Measurement receipt: `output/trailer-v6/delivery-audio-check.log`.

Final delivery identity (full source/asset list is in the 77-entry manifest):

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `PodRacing-Trailer-v6.mp4` | 232,142,100 | `7fa3ab35dfb4b52b16d495f685c709d2b9d9def2419d68af0a76620296547cea` |
| `PodRacing-Trailer-v6-web.mp4` | 117,152,614 | `0e1d4684b05da89815de200e6a5f9ad23a80c2449c5bbccfd3bdf81f00374d7f` |

Production is live from runtime commit `feb7a9d` (the main console commit is `b9d3ef6`). Git preview `now-this-is-podracing-env2bgzuu-amirs-projects-d9680079.vercel.app` was promoted to READY Production `dpl_EA9duBSR64qyoUMpHE8s3APBqxCo`, deployment `now-this-is-podracing-17xv3cdtx-amirs-projects-d9680079.vercel.app`. Canonical https://podracing.dude.work serves `index-fFqYwSRS.js`, SHA256 `deb430d87bb354a35d5cd03abb094578b7788d9e39d9ac8d6d0d9813d8e14d76` (local byte hash; the live browser verified the exact bundle filename).

Production browser checks: actual drag rotates the model 45 degrees, Needle selection loads, Verdant Run selection starts the jungle race, Online drawer and audio settings respond, mobile width stays 390/390 without overflow, no page errors. The final pointer fix keeps the visually recessed display above the console hit-test plane; negative CSS depth had intercepted drags. Live screenshots and receipts are in `output/round53/qa/`. The QA browser was closed.
