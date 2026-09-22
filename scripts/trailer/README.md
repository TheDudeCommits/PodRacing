# Trailer build

The current edit is **V5 — The line is yours**, a newly directed 72.683-second
trailer with new deterministic gameplay capture, four pod portraits, combat,
new music and selective Seedance cinematic inserts. Start at
[v5/README.md](v5/README.md) and [v5/DIRECTION.md](v5/DIRECTION.md).

The material below documents the preserved V4 workflow. V4 was a
**scene-by-scene remake of the reference trailer**:
91.000s / 1920x1080 / 60fps, 51 cuts matching the reference's 50 scenes at its
own timecodes. See `REFERENCE.md` for the mapping and for the five groups of
scenes that could not be matched literally.

Build it with:

```
node scripts/trailer/edit.mjs --edl=./scenes.mjs --shots=shots3 --out=PodRacing-Trailer-v4
```

Earlier cuts (`edl3.mjs`, 60s original edit) still build the same way. Roughly 70% is real gameplay
rendered from the shipping bundle; the rest is generated cinematic material and
typography.

## Pipeline

| Step | Command | Output |
| --- | --- | --- |
| Scout the circuit for locations | `node scripts/trailer/scout.mjs` | `output/trailer/scout/` |
| Render every gameplay take | `node scripts/trailer/capture3.mjs` | `output/trailer/shots3/<id>/` |
| Report the best window per take | `node scripts/trailer/pick.mjs` | stdout |
| Render the end card | `node scripts/trailer/cards.mjs` | `output/trailer/cards/*.png` |
| Cut, grade and mix | `node scripts/trailer/edit.mjs --edl=./edl3.mjs --shots=shots3 --out=PodRacing-Trailer-v3` | `output/trailer/PodRacing-Trailer-v3.mp4` |

`shots3.mjs` is the capture shot list, `driver.mjs` the in-page hero driver,
`edl3.mjs` the edit decision list. `--skip-clips` reuses rendered clips.

## Driving the hero pod

The first cut held `setInput({throttle:1})` with no steer, so the pod drove
straight off the racing line while the camera followed it into open desert;
lateral offset reached -24 m and climbing while the AI rivals held -17..+12.
`driver.mjs` replaces that with a closed-loop driver reading the review
snapshot: a PD lane hold (kp 0.055 / kd 0.115), targets clamped to the racing
surface, an explicit recentre above 11 m, overtaking that picks the free side,
lance fire only at a rival inside the forward cone, and shields raised on real
incoming projectiles.

`seekCourse` also places the hero ahead of the entire field, so a chase camera
sees nobody. Each take runs a low-throttle `yieldFor` phase first and lets the
seven rivals stream past.

## Choosing cuts from telemetry, not by eye

`capture3.mjs` writes `telemetry.json` beside every take: per-frame lateral
offset, rivals within range, lance fire, mine drops, shield state, drift, wreck
phase. `pick.mjs` slides a window over it, rejects any window where the hero
leaves the racing line or wrecks unintentionally, and scores the rest for the
feature the beat must show. Weapon beats are cut to the exact frame the weapon
fires. Small effects are reframed tighter (`crop` in the EDL) because a lance
bolt is only a few pixels in a full chase frame.

`edit.mjs` refuses to build a cut that runs past the end of its take; two shots
silently truncated to a third of their length before that guard existed.

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
Petch) and HUD palette. The cut carries no on-screen text except the end card.

**Generated footage — disclose when publishing.** Shots generated with Seedance
2.5 via Higgsfield, all conditioned on real frames from this build. Three are
*bridges*: each is conditioned on the last frame of the gameplay cut before it
and the first frame of the cut after it (`start_image` + `end_image`), so it
begins and ends on real game frames and cuts invisibly. Generated at 4s and
retimed into their slots (`fit: true`) so both boundary frames are traversed.
`bridge-launch`, `bridge-war`, `bridge-finish`, `g1-engine-ignite`, `gen-pack`,
`gen-duel`, `g4-crash`, `g6-dust-plate` (in `output/trailer/gen/`). About 20s of
the 60s cut. They are **trailer assets only** and must never enter
`public/`, the game bundle, or the audio/asset provenance ledgers.
