# Cup replay lifecycle

Status: local UI fix, unit validation and subsequent ordinary-input browser acceptance are complete. [Round 19b](CUP_CYCLE_ROUND19B.md) records all three rounds, both actual replay actions, persistence and a completed first round of the new Cup. Its original label-assertion failure remains preserved separately from the passing retry. The implementation-stage checks below initially ran without a build or browser.

The three-round Inkstorm Cup previously ended with “Start a new cup” in the result objective, but the HUD never rendered its existing `restart-championship` action. Selecting Canyon after completion instead opened single-round practice, and the unit suite only invoked `restartChampionship()` directly. This left the next full championship unreachable from the visible controls.

`RaceHud.ts` now renders **Race another cup** in the results action row once all three rounds are banked. The same action appears in the completed Cup's garage context, including after a page reload defaults to Time Attack. It uses the existing HUD dispatch and GameApp action handler, returning to Canyon preparation with **Start championship**. Selecting an event, opening the garage or loading the profile does not reset standings. Only the explicit replay click clears the current series; PBs, ghosts, history, saved courses and preferences remain. Practice and ordinary retry retain their existing behavior. Stale solo progression buttons are removed when mastery is absent.

The additional mastery lifecycle test covers completion, reload and practice selection without data loss; explicit series reset while the remaining profile stays byte-for-byte equivalent as structured data; a slower first round in the new series preserving the previous PB and ghost; and repeated finish observations awarding that new round only once. `npx vitest run tests/race/mastery.test.ts` passed **16 tests**. `npm run typecheck` and `git diff --check` passed.

## Browser acceptance harness

The separate `scripts/cup-cycle.ts` harness uses the ordinary gamepad driver copied exactly from `competitive-flow.ts`. The existing performance harness remains untouched, SHA-256 `a0b70239216daaa41ce80787aef39e23f5b75b0d1aebb46afcf3afb1444815e7`. The new script's `--check` path loaded successfully without a server or browser; the copied driver was compared with the original and matched exactly.

Run only after the parent releases a frozen combined build and browser ownership:

```sh
npx --yes tsx scripts/cup-cycle.ts --expected-build-sha=FROZEN_BUNDLE_SHA --output=output/playwright/cup-cycle-roundNN
```

It drives Canyon, Foundry and Glass through shipped input, clicks actual **Next event** controls, and checks ordered points, complete clean laps, persisted PB ghosts and duplicate-award stability. After the third round, it checks the visible results replay button and clicks the returning player's completed Cup garage replay in a separate temporary page. Then it clicks the original results replay button, records both emitted HUD actions, checks fresh Canyon preparation and verifies every non-championship profile field is preserved through reset and reload. `--finish-replay-round` additionally drives the first round of the new series and checks that only its points are banked.

Raw per-round snapshots, profiles, traces, rendered results markup, action dispatches, screenshots and errors are written before acceptance assertions. Failure does not become a filtered pass. The owned browser closes in `finally`, followed by termination of only the harness's preview-server process group. This is a user-reachability and persistence check; neither these unit tests nor the pending automated driver establish human fun, medal balance, physical-controller feel or FPS acceptance.

## Audit finding at implementation time: preserve incompatible records

This finding described the pre-archive implementation. The parent subsequently implemented the bounded retention follow-up; see [Past-edition records](PAST_EDITION_RECORDS.md). The diagnosis and proposed tests below preserve the reasoning from the original Cup audit.

The earlier `src/game/mastery/storage.ts` dropped structurally valid PBs from the loaded profile when any generator, physics or rules version differed, and favorites on generator mismatch. The next ordinary save serialized that filtered profile, permanently removing the older entries from the sole storage key. Race history survived, because its schema has no version fields, but did not retain the missing full identity, sectors, laps or favorite metadata. This was separate from the correct requirement that incompatible PBs and ghosts must never become active comparisons.

A bounded follow-up can add optional `archivedRecords` and `archivedFavorites` collections to the existing version-1 profile. Preserve validated record metadata and original identity with `ghost: null`, and validated favorite metadata with its original generator version. Keep archives out of `records`, active event selection and ghost lookup. Deduplicate by canonical record identity and by generator-plus-seed for favorites, cap each collection, and preserve it through regular saves and ghost-quota fallback. Never reactivate a historical entry automatically. No cloud services or physics compatibility relaxation is needed.

Meaningful tests should load mixed current/older generator, physics and rules identities; verify active comparisons still exclude older entries; save/reload repeatedly without archive duplication or metadata loss; reject malformed entries; enforce archive caps without consuming active record slots; and preserve archives during quota fallback and Cup replay. A small read-only historical record view can then expose the preserved achievements, since current `RaceMastery.model()` and `HudMasteryViewModel` do not expose either history or a record book. Storage preservation alone should not be described as a visible record book or proof that players will return.
