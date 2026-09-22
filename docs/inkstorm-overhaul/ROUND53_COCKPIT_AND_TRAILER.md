# Round 53 — Smuggler's Cockpit and trailer v6

Approved direction: F. Implements the physical console as live DOM controls with CSS 3D depth, pointer perspective, raised/depressing switches, recessed phosphor screens, actual mesh inspection and a restrained automatic inspection turn. Eight pod screens, four destinations, four race modes; Race rules, Online, Options and Play on the bottom. Build and Courses remain in Race rules. Mobile stacks the main display above two four-pod banks. Keyboard inspection, touch rotation, reduced motion and existing audio settings are preserved.

Sound: four unmodified Kenney Interface Sounds recordings, downloaded from the official source, CC0. They use the existing effects/master buses and share their lifecycle cleanup. No generated or synthesized audio. Provenance is in `public/audio/cockpit/SOURCES.md`. The only generated visual asset is the worn metal material; geometry, controls, CRT treatment and interaction are implemented in code.

Validation: 1,114 tests across 191 files passed; typecheck/build/diff check passed. Desktop 1600×1000 and mobile 390×844 checked. All eight pods load, all modes/destinations select, keyboard inspection changes the render, rules/settings controls work and Play starts a race. No browser page errors; audio file loading reports no failures. Evidence is local in `output/round53/qa/`. Browsers close after each completed check/capture.

Trailer v6 pipeline: `scripts/trailer/v6/`. Fresh current-build footage, all eight pod identities and four destinations. Starts on the working cockpit menu and ends with Podracing.Dude.Work. No added labels over racing. Existing approved Higgsfield/Seedance inserts and licensed music are reused with a new edit and mix. Final render and publication receipts will be recorded here when complete.

Production: pending this round's Git preview and promotion.
