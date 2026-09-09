# V18 resource observer independent review

Reviewed `scripts/inkstorm-broadcast-ui.mjs` at SHA-256 `568ce4a2885f88acf4bde77fcffc13f3714854e00169a7e02208656511767970` against the preserved V17 harness. CPU-only, no edits to source or harness, no browser/build.

## P2 — visibility and shared-row proof is missing

Lines 92–116 record track width and `textContent`, then assert only percentage correlation. A resource hidden through opacity, visibility, off-screen positioning or overflow can retain the same width and text and pass. `trackBox` is recorded but unused; row/value boxes and ancestor visibility are absent. This is a gap in the requested visible-number/shared-row evidence, although the current receipt wording is narrower.

Add read-only evidence for each real `.pod-hud__meter` row, label, track and value: own and ancestor display/visibility/opacity, viewport and actual overflow bounds. Check the track and number as positive-size visible elements; a zero-valued fill must be allowed zero width. Skip only clipping-box tests for `display:contents` `.pod-hud__meter-head`, while retaining its visibility checks. Save row bounds to make actual alignment inspectable.

The correlation math is appropriate for the current CSS: `clientWidth` excludes the one-pixel border, tracks have no padding, telemetry width follows the custom property immediately, and boost has its existing 80ms width transition. The one-point number tolerance accommodates actual rounding. The natural zero/partial/full heat requirement detects the previous constant-full-width regression. The observer is read-only with respect to gameplay/HUD and is correctly excluded from performance evidence. The archived V17 diff contains only observer functions and the two calls around the existing input run. No catalogue, motion, lifecycle or screenshot gate was removed.

Status: open pending root correction/native execution. No visual PASS is claimed.

## Closure — current source

P2 closed in static review at SHA-256 `2474aa9b66cadf588f4c53086754c710cfe7ba6586452be5da9c7609b3ae1460` (42,450 bytes). Row, label, track and numeric-value evidence now includes own/ancestor visibility and actual viewport/overflow geometry. The finish gate requires each to be visible and requires label/track/value vertical centers within three pixels. `display:contents` retains visibility checks while skipping its nonexistent clip box. Zero fill width remains valid. Syntax passes. Ten CPU cases executed against the extracted actual helper pass, including hidden/transparent ancestors, offscreen and overflow clipping, and boxless-but-hidden ancestors. These are predicate checks, not browser or visual acceptance. Native execution remains pending.

### Initial snapshot attribution correction

The initial finding was reported from the tool-read version without inspect. The subsequently copied file resource-observer-reviewed-initial.mjs and its SHA 568ce4a2885f88acf4bde77fcffc13f3714854e00169a7e02208656511767970 already contained root's first row/track/value visibility fix due a concurrent edit before preservation. The initial JSON/MD incorrectly associated the earlier finding with that intermediate hash. Both are retained unchanged except this explicit appended correction; do not treat that SHA as proof of the original missing-helper version. The closure snapshot is exact and checked against source.
