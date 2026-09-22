# V5 — The line is yours

This is the new directed edit. V4 and its source material are preserved. Read
[DIRECTION.md](DIRECTION.md) for the script, visual approach and music source.

The final exports, takes, telemetry, generation receipts and editable Higgsedit
title project live in `output/trailer-v5/`. That directory is ignored by Git:
the committed scripts are not a backup of the rendered media.

## Rebuild

Run from the repository root. Dependencies are the project's Playwright,
Chromium and local FFmpeg/FFprobe. The capture script starts a private ephemeral
Vite server and closes both browser and server in `finally`.

```sh
node scripts/trailer/v5/capture.mjs --resume=1
node scripts/trailer/v5/labels.mjs
node scripts/trailer/v5/export.mjs
```

Capture a subset with `--only=p1-teemto,23-hud`. Remove `--resume=1` to deliberately
replace those takes. Existing MP4s are reused only when their completed JSON
receipt exists. Do not modify runtime source during capture: Vite would reload it.

`edit.mjs --resume --prepare` renders available cuts while capture is in progress.
`--edl-only` writes the authoritative frame-accurate `edl.json`. Finished cut
cache keys include the EDL entry and source byte count.

The native Higgsedit title source is `title.mjs`. It was run in Higgsfield's remote
Linux sandbox with the game's own fonts. Its exported 8-second `title.mp4` and
`higgsedit-title-project.zip` are already in the output directory. The title
project is editable there; the complete trailer is reproducible from this EDL.

## Picture and sound

- Gameplay runs actual 120 Hz simulation and AI, two individual ticks per frame,
  at capture quality 0. Starting positions and camera moves are staged.
- Four clean moving portraits show the actual selectable pod meshes. A standard
  HUD/camera shot anchors the cinematic views in the playable game.
- Labels follow captured events: drift, Heat Lance, shield, rear mine and tow.
  One victim-focused wreck uses the existing diagnostic wreck trigger.
- Seedance 2.5/Higgsfield supplies cinematic inserts. The new refinery insert is
  conditioned on a real game frame. Existing v4 inserts are reused selectively.
  One new pilot generation failed; its terminal receipt is retained, and it was
  replaced with an existing insert without another paid submission.
- Music is “Race The Sun” by Scott Buckley, CC BY 4.0, phrase-edited around a
  measured 123 BPM pulse. Effects come from the game's sourced audio bank.
- `sound.mjs` produces a stereo 48 kHz mix and explicit sound-layer EDL. No
  generated audio or trailer media was added to the runtime asset folders.

## Review evidence

`QA.json` reports final frame counts, complete decode, source windows, real
mechanic events and known limitations. `review/` contains visual contact sheets.
Full decode and sampled-frame checks do not constitute continuous human
audiovisual approval. The owner should review the finished video before publishing.

Do not deploy from this checkout. The trailer and capture tools are local work;
Production promotion remains the separate owner-approved release action described
in the main handover.
