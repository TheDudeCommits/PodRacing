# Initial-course GPU timing probe

The new diagnostic complements native RAF cadence with elapsed GPU command time from `EXT_disjoint_timer_query_webgl2`. It serves the existing `dist` unchanged, observes the actual main game canvas and brackets the game's complete draw-producing native RAF callback. It does not modify the application, competitive-flow controller, rendering settings, clocks or simulation.

Run it only while Blender renders and other GPU diagnostics are idle:

```sh
INKSTORM_EXPECTED_BUILD=<exact-current-bundle-sha256> \
INKSTORM_OUTPUT=output/gauntlet/gpu-frame-probe-round27 \
node scripts/inkstorm-gpu-frame-probe.mjs
```

`INKSTORM_APPEARANCE=sebulba` uses the ordinary visible appearance selector; the default is Teemto. The owned preview port is 5199, overridable with `INKSTORM_PORT`. Port 5211 is explicitly rejected. An existing output directory causes an error, preserving prior failed and successful receipts. The script builds nothing.

## Scope and frame coverage

The runner waits for the world, selected vehicle and garage preview to load, starts the probe, clicks the ordinary Start button, holds the real W key for 20 seconds, releases it and stops sampling. Countdown is retained. There is no seeking, capture mode, direct position write, synthetic gamepad, fixed quality override or completed-lap requirement. This probes only the initial course reached by that input, which can include going off the ideal line. It is not full-circuit, complete-race, human-control or art acceptance.

Local source inspection established the canvas contract: `GameApp` gives its renderer canvas ID `viewport`, aria label `Podracing viewport`, and appends it directly to the `#game` mount. The probe identifies that exact DOM node and matches it to the WebGL2 context observed during native `getContext`, so a garage preview context cannot be mistaken for the main game context.

`GameApp.start` performs simulation advancement, its complete `render` method and performance-governor work inside one native RAF callback. That render includes the scenery shadow update when dirty, moving-racer shadow, custom MRT prepasses, beauty scene and final composition. The callback is identified from actual main-context draw submissions; function names are diagnostic metadata only. Each sampled query counts ordinary and instanced array/indexed submissions, plus multiDraw when present, and compares calls/triangles with the app's existing whole-frame renderer receipt. More than one main draw-producing callback, draws outside RAF, counter mismatches, main or unidentified context changes, or missing instrumentation prevent a complete coverage result. Lifecycle events on explicitly registered auxiliary contexts remain visible in the report and are identified separately from main-context coverage.

The query includes synchronous GPU commands issued throughout that callback, including any update/uploads issued there. Asynchronous asset uploads or other context work outside the callback are outside the interval; counting draw submissions does not prove every possible non-draw GPU upload happened inside it.

## Query lifecycle and evidence

- At most one elapsed query exists at a time. Sampling is attempted roughly every 250 ms only after the callback has been observed drawing. An already active application query is left untouched.
- Results are polled after returning control to the browser. No `finish`, pixel readback, fence wait, clock replacement or timestamp adjustment is used. Results become usable only when available and not disjoint. This follows the [Khronos extension specification](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/).
- Every attempted query retains its status, native RAF timestamp, query start/end/poll times, raw nanosecond result when available, begin/end backing-buffer dimensions, phase, race time, progress, rendering configuration, whole-frame call comparison and cleanup state. Invalid/disjoint/timed-out queries remain in the report and do not become zero-duration samples. A zero timer result for a callback that issued draws is retained as `invalid-zero-duration`, with usable elapsed time left null.
- Queries time out after five seconds; pending work drains asynchronously during stop. A 256-query and 10,000-frame bound prevents an unbounded log. Every created query is deleted, wrappers are restored and the runner closes its owned browser and preview server in `finally`, including failure paths.
- `report.json` includes actually served bundle SHA-256 before/after, a complete file/hash manifest of existing dist before/after, harness hashes, browser/OS/hardware details, selected context, all raw sampled queries, native RAF records, context/callback inventories, browser errors, and cleanup. A screenshot is taken only after timing stops and instrumentation has been restored.

If the extension or its elapsed counter is unavailable, the summary says **UNAVAILABLE** and GPU times remain null. **MEASURED** requires at least ten usable queries and complete observed draw coverage. It denotes a successful diagnostic collection, not a 40–60 fps performance pass. **INCOMPLETE** retains the evidence and identifies the coverage problem. Disjoint and other query status counts remain explicit even when enough other samples are usable.

Elapsed GPU time and display cadence answer different questions. The query interval is affected by GPU scheduling and possible idle gaps between commands; it is not physical presentation latency. Instrumenting draw calls and native RAF introduces CPU overhead, and the game's normal adaptive quality governor remains active. Begin/end dimensions are recorded separately because quality can change during the callback. No reciprocal of a GPU sample is labeled as FPS.

## Current validation

Both JavaScript files pass Node syntax checking. Four CPU mock lifecycle checks passed: normal availability and exact forwarded RAF timestamps; unsupported extension reported as unavailable with null timing; disjoint result retained and excluded from usable timings; and a main-context draw outside RAF flagged as incomplete. The checks also verified unique query deletion, no pending query at stop and restoration of original RAF. These mocked query values are not GPU measurements.

Root's first actual run is preserved in `output/gauntlet/gpu-frame-probe-round27/report.json`, SHA-256 `f23e28f3b6def950d2286de6635591ce31de291c5e2cfd2c71bfd7293d54fc24`. It served bundle `13c08579eae363aad38564be38c003f243e3c5d8fbe7047b0cf8b6be97450e24`; dist and harness hashes were stable. All 78 elapsed queries became available and matched whole-frame draw and triangle counts. Their recorded mean is 12.490888 ms, p95 14.0775 ms and maximum 30.707333 ms. Adaptive DPR varied from 1 to 1.75 across sampled frames, so these are not fixed-resolution timings. The sampled race time ends at 16.9 seconds. Browser errors were empty, one main rendering callback was observed, no main draws occurred outside RAF, and owned browser/server cleanup completed.

The first summary nevertheless said **INCOMPLETE** because a global context-loss predicate treated the detached garage preview's context 2 loss as a main-context failure. The selected game context was 1 throughout. `VehicleCardPreview.hide()` calls `releaseGpuResources()`, which disposes its separate renderer and calls `forceContextLoss()`. The raw context-2 event is retained unchanged. The corrected summary classifies lifecycle events by the recorded context registry and all main context IDs, and future event records also include main/auxiliary identity at the time of the event. Main loss, an unknown/missing context ID, an event explicitly marked main, main-context replacement and query ownership changes still invalidate coverage.

Read-only reclassification tests against the preserved report verified that this one known auxiliary event is identified separately while all timing values stay unchanged. Counterexamples for main loss, unidentified loss, missing identity, main-at-event loss, outside-RAF draws and draw-count mismatches still return **INCOMPLETE**. No original receipt was rewritten or presented as a fresh run.

Root's actual retry completed at 2026-09-07 19:02:54 UTC and returned **MEASURED** with no coverage problems. `output/gauntlet/gpu-frame-probe-round27-retry/report.json` has SHA-256 `7af547e28114555f582925c5f409dda19d349b948d305221f8931328f4c733e6`. All 79 queries were available and matched frame coverage: mean 12.068718 ms, p95 13.576666 ms, maximum 26.488624 ms. The separate auxiliary context-2 loss remains explicitly recorded. Browser errors were empty; dist and harness hashes were unchanged; browser and preview server closed with no server listener remaining.

The retry used the same bundle `13c08579eae363aad38564be38c003f243e3c5d8fbe7047b0cf8b6be97450e24`, **before the later exact-material surface styles were integrated**. It covers ordinary Start plus the 20-second W hold only, with sampled race time 0–17 seconds and adaptive DPR 1–1.75. It provides no fixed-resolution, complete-race, physical-presentation or later-styled-build performance claim.
