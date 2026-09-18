# Reference trailer — scene list and mapping

Source: https://www.youtube.com/watch?v=2MtgIoToa7I (1:31, 50 scenes, ~1.8s
average cut). The shot breakdown was produced by Higgsfield's video analysis of
the URL; `scripts/trailer/scenes.mjs` recreates it scene for scene at the same
timecodes.

## What could not be matched literally

The reference is a multi-world trailer with actors. This game ships **one desert
circuit and no characters**, so five groups of scenes are played with the
circuit's own equivalent rather than invented. Nothing advertises content the
game does not have.

| Reference scenes | The original shows | What this trailer shows instead |
| --- | --- | --- |
| 2-3 (0:02-0:06) | A craft in orbit, then atmospheric entry | Generated: the pod held against the dusk cloudbank, then diving to the desert. Same beat, this game's sky. |
| 5-7 (0:11-0:18) | A pilot walking through a hangar and scrapyard | The machines instead: the pod field, and the wreckage of a real crash. |
| 30-33 (0:53-1:00) | An alien antagonist, four scenes of dialogue | The roster, cut on the same rhythm: tight framings of the authored pod classes. |
| 34-46 (1:00-1:18) | A jungle island, a lava cave, then an ice world | The circuit's most distinct ground: the dusk spires, the purple canyon, the rock arch, the refinery. The *beat* (a new place, faster cutting) is kept; the biomes are not faked. |
| 49 (1:24-1:26) | Close-up of the pilot nodding | A close framing of the hero pod's sled. |

Two more honest notes:

- Scene 4 is a single 5s industrial flyover in the reference. The refinery take
  has a 3.28s clean run, so the beat is carried across two continuous industrial
  shots rather than one.
- Scene 24 is a POV looking *backward* at pursuers. The review API exposes no
  rear camera, and the generated stand-in came back as a forward pack shot, so
  this beat reads as pursuit rather than a literal rear view.

## Scene map

The authoritative, per-scene mapping with in-points lives in
`scripts/trailer/scenes.mjs`; each entry carries the reference scene number,
that scene's timecode in the original, and a one-line description of the shot it
recreates.

## Generated shots

All conditioned on real frames from this build. `bridge-launch` additionally
uses the `start_image` + `end_image` bridge technique (see README), beginning
and ending on real game frames.

| Clip | Serves reference scene |
| --- | --- |
| `gen-sky` | 2 — the craft held in space |
| `gen-descent` | 3 — atmospheric entry |
| `g1-engine-ignite` | 9 — engines igniting, close |
| `bridge-launch` | 11 — launch off the line |
| `gen-pass` | 22 — a racer screams past, electricity arcing between the cowlings |
| `gen-rear` | 24 — the pursuit |
| `g4-crash` | 26 — a racer flips and breaks apart |
| `gen-duel` | 33 — the confrontation beat |
| `g5-canyon` | 41 — bursting back into the light |
| `g6-dust-plate` | 1, 47, 50 — the dark open, and the title/end-card plates |
