# Thrustline

A Three.js + TypeScript browser racer: eight original tether racers, four worlds
(Sunscar Canyon, Frostline, Ember Rift, Verdant Run), drafting, drift, heat and
combat, deterministic 120 Hz simulation and host-authoritative online rooms.

The Round 54 overhaul (branch `overhaul/aaa`) rebuilt the presentation in a
cinematic stylized direction: an HDR post chain, one shared sun per world,
world-specific ground and skies, the Colossus set piece, a start ceremony, the
Verdant canopy, and an original fleet and announcer that replace the earlier
fan-replica pods. See [the overhaul notes](docs/thrustline/OVERHAUL.md) and the
[handover](HANDOVER.md).

[Play](https://podracing.dude.work/) (Production still runs Round 53 until the overhaul is promoted).

## Run locally

```sh
git lfs install
git lfs pull
npm ci
npm run dev
```

`npm run verify` runs TypeScript, tests and production build. Runtime assets live in `public/assets`; source provenance and historical authoring records live under `assets/source` and `docs`. Current QA evidence is supplied as a release attachment; the full local experimental `output/` archive is not served by the game.
