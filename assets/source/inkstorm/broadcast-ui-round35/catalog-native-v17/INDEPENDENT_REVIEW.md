# V17 catalogue harness — independent static review

Reviewed scripts/inkstorm-broadcast-ui.mjs SHA `6c0c9c796b21d0b8e088b18e2adae433b57255c081e281e2ea69a54c4bf3f781` (34187 bytes). Read-only review; no source edits, browser, build or GPU use. Native execution remains pending.

1. **P2 — original loadout is captured incrementally (lines 165–170, 194–201).** The loop reads each slot's initial ID after the previous slot's equip sequence. If an engine equip accidentally changes cooling, the changed cooling ID becomes the later baseline, and final equality can still pass. Read all five persisted IDs once before the first mutation, assert the matching initial UI selection, and restore against that snapshot.
2. **P2 — width alone does not prove a visible glyph (lines 185–190).** `glyph.width > 0` also passes hidden, zero-opacity, offscreen, clipped or zero-height schematics. Scroll the glyph into view and apply positive width/height, computed visibility/ancestor opacity, viewport and overflow clipping checks. Save the raw geometry. The current text checks do not exercise the glyph.
3. **P3 — label narrow input coverage precisely (lines 175–182, 202).** On narrow viewports, tap equips and waits before Enter. Enter therefore establishes focus/idempotent activation of an already equipped part, not keyboard-triggered equip/rebuild. Desktop Enter does cover that state transition. `hasTouch: true` in desktop Chromium provides emulated touch dispatch, not physical-device proof.

The visibility guard correctly preserves the display:contents clipping exception while rejecting actual hidden ancestors. Existing motion, cleanup, actual persisted-ID and overall failure gates remain. The receipt and motion comments explicitly exclude FPS claims. The new capture count is consistent: eight desktop, four for each narrow viewport, and the saved-calendar lifecycle capture, totaling seventeen.

Scope limits: readableText is a DOM geometry/visibility check, not contrast or visual-occlusion approval. The all-part selector list includes heading, description, benefit, tradeoff and equip action; it does not include every alternative's comparison disclosure. The native frames and fresh visual critic remain necessary.

## Follow-up source review

Reviewed SHA `a4107f13daa2133ae460ef162643d863b28b79d96a2170d93d8be4e0328c05e2` (36674 bytes). The immutable-loadout finding is closed: all five initial IDs are observed before any equip, matched to pre-existing persisted storage, checked again per slot, and used for final restoration. A fresh null storage state is handled correctly.

The full glyph guard now verifies positive width/height, own and ancestor visibility/opacity, viewport containment and overflow clipping. Desktop comparison disclosures are now checked when the part is an alternative. Input modes explicitly separate desktop Enter from narrow tap followed by Enter focus/idempotence.

One state-coverage detail remains before claiming all twenty installed desktop schematics: the full glyph guard runs before Enter, usually on the smaller alternative; after Enter the installed glyph still receives only width > 0. Reuse the same full guard after Enter and settling as well. Narrow checks already run after tap installs the part. This is a native-validation coverage gap, not evidence that the live glyph is clipped. No source edits, browser, build or GPU were used in this review.

## Static closure before native retry

Reviewed SHA `f9cc90b939fd2cb5f004a2cda2cc1593e4a635ef88afc92dcf639e89d8578688` (37303 bytes). All reported source-level coverage findings are closed. The shared verifyWorkshopGlyph guard now runs both before Enter and after selected state/340ms settling, retaining both glyphEvidence and installedGlyphEvidence. It checks the newly installed desktop schematic with the same size/visibility/viewport/clipping assertions.

The saved-calendar reader now waits for actual entry animations to stop and viewport opacity to equal 1 before the existing readability/overlap gates. This resolves reading deliberately hidden entry content without weakening those gates. Original V17 attempt evidence stays FAIL; the same-build retry must establish native acceptance. No source edits, browser, build or GPU were used for this closure review.
