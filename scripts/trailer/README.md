# Trailer build

A 60.000s / 1920x1080 / 60fps launch trailer. Roughly 70% is real gameplay
rendered from the shipping bundle; the rest is generated cinematic material and
typography.

## Pipeline

| Step | Command | Output |
| --- | --- | --- |
| Scout the circuit for locations | `node scripts/trailer/scout.mjs` | `output/trailer/scout/` |
| Render every gameplay take | `node scripts/trailer/capture.mjs` | `output/trailer/shots/<id>/f%05d.jpg` |
| Render the typographic cards | `node scripts/trailer/cards.mjs` | `output/trailer/cards/*.png` |
| Cut, grade and mix | `node scripts/trailer/edit.mjs` | `output/trailer/PodRacing-Trailer.mp4` |

`shots.mjs` is the capture shot list, `edl.mjs` the edit decision list.
`--skip-clips` on `edit.mjs` reuses already-rendered clips.

## Why the capture works the way it does

Gameplay is rendered **offline and deterministically**, not screen-recorded. The
review API's `step()` is driven by hand, two 120 Hz ticks per output frame, and
a frame is grabbed after each pair. This matters for three reasons:

- Real-time headless capture only reached ~24fps and the adaptive governor
  dropped to quality level 8. Capture mode pins quality level 0, so every frame
  is a full-quality render.
- Two ticks per frame keeps simulation and presentation in lockstep: `step()`
  calls `render(FIXED_DT)` once, so two steps advance effect time by exactly
  1/60 s. Stepping 2 at once would run render-side motion at half rate.
- `step()` advances persistent dust per tick, so wakes and particles accumulate
  the way a player sees them. This is the constraint ROUND39 recorded about
  batched capture; it is satisfied by stepping one tick at a time.

Camera control (`setCamera`) is **not** capture-mode gated, so shots are framed
from the real gameplay cameras. `course` is avoided: it disables the cel post.
The `hero` camera consistently frames too far out and was cut from the edit.

## Provenance

**Music.** "Juggernaut" by Scott Buckley, already licensed in this repo as the
selection-screen score. Used from 13.97s for 60s. Credited in
`public/audio/salt-dusk-v2/CREDITS.html`.

**Sound effects.** The game's existing sourced SFX bank only
(`public/audio/salt-dusk`, `salt-dusk-v2`). No audio was generated. The runtime
audio ledger is untouched.

**Typography.** The game's own shipped faces (Black Ops One, Russo One, Chakra
Petch) and HUD palette.

**Generated footage — disclose when publishing.** Six shots were generated with
Seedance 2.5 via Higgsfield, each conditioned on real frames from this build as
style or start references: `g1-engine-ignite`, `g2-low-pass`, `g3-pilot`,
`g4-crash`, `g5-canyon`, `g6-dust-plate` (in `output/trailer/gen/`). They are
about 11s of the 60s cut. They are **trailer assets only** and must never enter
`public/`, the game bundle, or the audio/asset provenance ledgers.
