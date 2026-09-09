# Sebulba appearance — frozen round24 evidence

The second imported appearance is selectable and usable in the garage and race. Teemto remains the default, and the explicit Classic preference remains respected. This is a presentation choice within the existing podracer physics class; it does not create a new handling class or change personal-best identity.

**Acceptance is incomplete.** The functional harness passed its stated model/loading/lifecycle checks, but subsequent screenshot inspection confirmed a stale garage readiness label. The imported craft and decoded preview were ready while the UI still said “Preparing Sebulba preview… Your race craft is ready.” Round24 also lacks full-race performance measurements: those were deferred before starting so the visible status bug could be corrected in round25. Neither automated tests nor these captures establish human enjoyment or art acceptance.

## Frozen candidate and source verification

- Build: `dist/assets/index-CTODLYt3.js`, 1,542,401 bytes, SHA-256 `febf6f2c804a46c90c1ff64cb7e171aa8be9f32f0a0ea4456aebdf6350fb379f`.
- Full `npm run verify`: 495 tests in 87 files, typecheck and build passed. The normal large-chunk build warning remains.
- The first full verification found an existing procedural geometry budget regression: adding nozzle caps initially produced 11,008 triangles against the unchanged 11,000-triangle non-pod limit. The cap was retained and redundant axial cone subdivisions reduced from six to five. The same budget then passed; no threshold was raised. That first failure is recorded here, rather than represented as a first-attempt full pass.
- Focused coverage includes exact published asset hashes/geometry admission, appearance persistence and unchanged records, actual six-source MRT replacement, late-load cancellation, retained prior art on failure and explicit retry, model-specific VFX anchors, and a raycast into the closed nozzle core.
- Round24 also includes the independently authored scanned-paint luminance change documented in `SCANNED_PAINT_ROUND24.md`.

## Published geometry and runtime behavior

The existing optimized exports and their provenance are documented in `SEBULBA_ASSET_EXPORT_V1.md`. This integration did not modify public art, normalized sources, attribution or Teemto assets.

| Variant | Bytes | Triangles | Opaque body / pilot draws | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| Sebulba hero | 2,672,804 | 54,522 | 2 / 4 | `f4b31d9260e3272ec394161dea236c874d551b469f18a1d794ec85c05b625b7e` |
| Sebulba rival | 1,819,016 | 24,559 | 2 / 4 | `22e1adf8e3dd6562ce143132fb4e82cdb56e62696d9894804ca07b4a3552d951` |

The two rigid body meshes and four embedded pilot meshes use the actual exported geometry. The procedural PilotView is suppressed, all six meshes participate in the MRT prepass, and only the two body meshes cast the bounded dynamic ground shadow. No unsupported engine pivots are invented for the static batched source. Explicit source-receipt coordinates locate the seat, exhausts, coupling and wake/dust effects because optimization removed empty anchor nodes.

Appearance metadata resolves the hero/rival asset lazily. The stable presentation wrapper reports the actual installed appearance, preserves the previous ready craft during a pending or failed replacement, and cancels superseded consumers. Replacement unregisters previous MRT sources and refreshes the actual shadow sources. Coupling geometry is rebuilt only when the installed asset changes; it borrows the existing effect material. No per-frame geometry rebuild or additional flame draw was added.

The browser requested only Teemto hero/rival and Sebulba hero. It did not preload Sebulba before the first selection, load its unused rival variant, or fetch the full catalog. Rival metadata and asset admission are covered by focused CPU checks; a live Sebulba rival grid is not claimed.

## Browser checks and immutable receipts

Command:

```sh
INKSTORM_EXPECTED_BUILD=febf6f2c804a46c90c1ff64cb7e171aa8be9f32f0a0ea4456aebdf6350fb379f \
INKSTORM_OUTPUT=output/playwright/vehicle-appearance-round24 \
node scripts/vehicle-appearance-acceptance.mjs --sebulba
```

The harness SHA during that run was `6943f7f83b557ad3a016d240e2400ddd077f9108265d8924258bfeed81ae12c3`. The raw receipt and log remain in `output/playwright/vehicle-appearance-round24/`. Browser work ran 2026-09-07 16:13:13.188–16:13:47.886 UTC on Chrome 152.0.7977.77, 1440×900 CSS pixels with requested DPR 2. The separate initial HTTP-failure context used 1280×720. This was functional QA, with no FPS acceptance gate.

The first browser attempt passed these checks:

- Actual default Teemto geometry, explicit Classic reload persistence, all four physics-class selectors, and unchanged mastery storage.
- Teemto MRT registration 7→1→7, actual keyboard drive beyond five race seconds, temporary preview-context cleanup, real main WebGL context loss/restoration, and explicit recovery from one injected asset HTTP 503.
- One held/deduplicated Sebulba request, visible cancellation back to Teemto, then release of the old response without replacing the newer selection.
- Actual Sebulba selection, reload persistence, class browsing and return, six registered MRT sources, embedded driver, three inspection-angle screenshots, and ordinary keyboard drive beyond five race seconds.
- Selected Sebulba reload with one HTTP 503, truthful Classic fallback and visible Retry, no repeated automatic requests during a 1.2-second observation, and actual Retry recovery to six MRT sources.

There were exactly two expected console errors from the two injected HTTP 503 responses and **zero unexpected browser/shader errors**. Teemto-specific WebGL restoration passed; separate Sebulba-specific restoration was not tested. The initial harness did not assert settled appearance status, which explains why its PASS did not catch the visible label failure.

Before/after manifests show all 130 runtime source files, 26 public Inkstorm files, 33 dist files, and the harness unchanged during the browser run. Browser/context cleanup occurred in `finally`; owned preview port 57951 had no listener afterward.

## Actual live snapshots and visual limits

| Live appearance | Hero triangles / MRT sources | Dynamic shadow | Failure / skipped | Effective terrain |
| --- | --- | --- | --- | --- |
| Teemto | 50,705 / 7 | 512², 3 draws, 43,545 body triangles | null / null | 6 rings, 3,072 m radius at requested 4 |
| Sebulba | 54,522 / 6 | 512², 2 draws, 47,362 body triangles | null / null | 6 rings, 3,072 m radius at requested 4 |

Both live snapshots report zero omitted shadow casters and 0.10 ms current CPU shadow submission time. This is a sampled CPU diagnostic, not GPU execution time or a full-frame failure census. Shadow frame counts advance; static-atlas failure is null in the Sebulba live snapshot.

Saved images include `garage-sebulba.png`, `garage-sebulba-angle-90.png`, `garage-sebulba-angle-180.png`, `live-sebulba.png`, and `live-teemto.png`. Inspection confirmed the imported model fits the preview, uses the forward-facing chase orientation, and has visible embedded pilot and body-cast ground shadow. The filled exhaust caps prevent seeing terrain through the former hollow cores. However, the cores now read as pale flat discs and remain short of the energetic turbine target. The source pilot also retains its previously identified toy-like appearance. These are unresolved art limitations, not accepted visual outcomes.

## Confirmed paused-garage label defect

`GameApp.render()` schedules HUD updates by `simulationFrame + 4`. `advanceRealtime()` returns without advancing that frame while the garage is awaiting Start. The race-art callback invalidates the HUD when actual geometry becomes ready, but the separately rendered preview can finish decoding afterward. `VehicleCardPreviewRenderer` then committed the ready image/status without notifying the HUD. Inspect-angle actions refreshed the image but also did not refresh the label.

Consequently, three saved Sebulba garage images retained “Preparing…” despite actual ready geometry. The later HTTP-retry image happened to show the correct ready text because its asynchronous completion order differed. Waiting four render frames alone would not reliably correct this bug.

The root requested a correction before timing. The bounded round25 source change publishes preview status transitions after decoded-image commit and updates only the appearance feedback controls from the latest selection. Focused tests hold decode after race readiness, require feedback to settle without another simulation/HUD tick, cover auxiliary preview failure, and reject a late commit after leaving the garage. The expanded browser harness now holds native data-URL decoding temporarily and asserts the label settles while `simulationFrame` stays unchanged. Round24 receipts remain immutable; round25 browser acceptance is still required.

The performance harness gained a validated optional `--appearance=sebulba` before any round24 timing began. It clicks the real garage button and waits for actual race geometry and decoded preview before ordinary Start. Its default path, driver, raw frame collection, and cadence judge remain unchanged. Prepared harness SHA: `07ccba4b9f8ca567099f6d0e9b85ade62cadbda0d8e1123ab62bddc3490966f5`. There are no round24 full-race timing results to report.
