# Round35 wreck effects revision

CPU checks pass: 20 tests in 3 files, full TypeScript check, and scoped diff check. Live owned edits are complete and frozen for root integration. No browser was run for this revision; the V7 critic rejection remains the last visual judgement.

The old effect used the simulation root. The actual Teemto hero uses the authored exhaustRight at `(4.025, 0.178, 5.638)` in normalized root coordinates. Redline/crash casing rupture now uses the loaded nozzle transformed by the exact displayed event-tick YXZ pose. Procedural craft use their real engine-right group. Missing anchors fall back to the root. Terrain height is sampled at the emitted point. Events provide no world contact point, so this is an engine rupture origin, not a claim of measured collision contact.

At full severity, the same eighteen fragment slots now contain fifteen dark burnt casing pieces and three thin ivory/amber sparks. Metal retains its value while tumbling, then contracts near expiry. Sparks travel along their velocity and expire sooner. Four existing plate slots create a brief localized ivory peak, restrained amber flare and two soft smoke lobes. No screen-space effect or new draw pool is added.

Capacities remain eight instanced draws, 64 debris slots, 16 burst plates plus 72 hazard plume slots. Fragment geometry remains twelve triangles. New material shader behavior means compiled-program counts still need runtime observation; unchanged pool counts do not prove unchanged programs or frame time.

Owned live paths:

- `src/render/galactic/GalacticEffectsView.ts`
- `src/render/app/GameApp.ts`: `consumeGalacticEffects` only
- `tests/render/GalacticEffectsView.test.ts`
- `tests/render/GalacticEffectsContact.test.ts`

The tests exercise the actual GameApp event adapter against authored Teemto attachment metadata and stale render-group transforms, verify correct new wreck pose and origin without state writes, preserve redline/wreck deduplication and fallback behavior, and check dark/bright separation, shape ratios, localized peak lifetime, fixed pool wrapping, repeatability and expiry. Imported source meshes themselves remain rigid.

The camera agent owns camera framing and return behavior. Root owns HUD presentation. Visual acceptance awaits their merged build and native browser capture.

Audit: `v9-fx-cpu-audit.json`, SHA256 `af557000516a105858974207739c5a60d475de5480ea70e212f12a3c809da977`.
