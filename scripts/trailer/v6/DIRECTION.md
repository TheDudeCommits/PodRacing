# V6 — From the cockpit to four worlds

Owner request: open on the implemented F / Smuggler's Cockpit home screen, update the trailer with the new destinations, eight pods and current mechanics, remove all feature/pod labels, end with **Podracing.Dude.Work**.

70.25 seconds, 1920×1080, 60 fps. The live interactive console is the invitation. Physical selection clicks give way to engine ignition and acceleration. Each destination introduces two machines through their actual silhouettes, then demonstrates speed or combat. Four short previously approved Higgsfield inserts punctuate the actual game footage. No added labels cover racing. The final card contains only the title, address and attribution/disclosure.

The time-accurate editorial source is `edit.mjs`; the generated EDL is `output/trailer-v6/edl.json`. The first 5.85 s shows actual pod selection and mouse inspection in the shipping menu. All four destinations are newly captured. All eight pod portraits are newly captured. Drift, Skybolt sprint, Sebulba flame, lance, shield, mine, impact and crest sections use the current renderer and simulation. Select final cuts from telemetry and images, not just requested inputs.

Camera positions and initial racer formations are staged through the existing capture-only tools; subsequent movement is the actual 120 Hz simulation. The impact scene triggers an opponent wreck through the existing diagnostic hook. This is a trailer capture technique, not evidence that every crash was caused naturally. Generated inserts are identified in the EDL and publication notes. No reference-trailer footage or music is used.

Music: existing 'Race The Sun' by Scott Buckley, CC BY 4.0, with a new phrase edit aligned to the 123 BPM structure. Menu cues: downloaded Kenney Interface Sounds, CC0. Other effects: the sourced game bank. No generated audio.

## Reproduce

1. Keep runtime code fixed during capture. Start Vite on 43153 for menu/title.
2. `node scripts/trailer/v6/capture.mjs --resume=1` (owns/closes its own browser and ephemeral Vite server).
3. `node scripts/trailer/v6/menu-title.mjs` (closes browser in finally).
4. `node scripts/trailer/v6/export.mjs`.
5. Inspect cut-boundary images and motion samples, the technical QA and audio measurements. Technical checks and sample review do not substitute for continuous human audiovisual approval.
6. `node scripts/trailer/v6/review.mjs` creates start/middle/end sheets for all cuts; its browser closes automatically. `node scripts/trailer/v6/delivery.mjs` writes publication credits and the SHA-256 source/delivery manifest.

Media is local and gitignored, under `output/trailer-v6/`. Preserve v4/v5 exports. Existing generated inserts remain in `output/trailer/gen/` and `output/trailer-v5/generated/`; existing music remains in `output/trailer-v5/music/`.
