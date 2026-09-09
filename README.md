# Now This Is Podracing — Inkstorm

A Three.js + TypeScript browser racer. The Inkstorm V32r1 checkpoint adds authored desert scenery, imported vehicles, a reference-led interface, persistent race challenges/ghosts and cinematic combat to the original game.

[Play](https://now-this-is-podracing.vercel.app) · [Release and QA archive](https://github.com/TheDudeCommits/PodRacing/releases/tag/inkstorm-v32r1-20260909) · [Accomplishments / remaining work](docs/inkstorm-overhaul/RELEASE_REPORT_2026-09-09.md) · [Handover](HANDOVER.md).

This is a published work-in-progress checkpoint, not completed AAA art acceptance. Four vehicle appearance families are integrated; 22 preserved sources remain pending. Local verification:938 tests,158 files; M4 complete-race averages59.5/59.1Hz.

## Run locally

```sh
git lfs install
git lfs pull
npm ci
npm run dev
```

`npm run verify` runs TypeScript, tests and production build. Runtime assets live in `public/assets`; source provenance and historical authoring records live under `assets/source` and `docs`. Current QA evidence is supplied as a release attachment; the full local experimental `output/` archive is not served by the game.
