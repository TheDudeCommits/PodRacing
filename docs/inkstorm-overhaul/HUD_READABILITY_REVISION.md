# HUD readability revision

7 September 2026. Local source revision after the round-15 frozen regression. No build, browser, commit or deployment was performed for this revision.

The round-15 launch capture placed an opaque hazard card on the distant foundry. The fallback-driving capture also showed the scenery warning covering heat and damage. These are the specific defects addressed here; this change does not establish the wider visual acceptance target.

## Changes

- Hazard labels move from an inner screen ellipse to a perimeter: 16px side and bottom margins, with the top rail below the race notice at y=150px. Collision avoidance searches the perimeter and never shifts a card inward over the central course or craft. It reserves the race information, critical notice, instruments, airborne/landing panel, route detail, tutorial, controls and visible fallback status.
- Cues use 160×32px strips, down from 168×44px cards: approximately 31% less label area. The dark backing, 11px type, colored direction arrow and critical border pulse remain. Additional-threat counts have their own column, so a long rival name cannot clip the count.
- At most three urgent bearing groups remain visible. Threats within 24 degrees combine under the most urgent member with an explicit count. Grouping happens before placement; unrelated threats that are displaced around a panel do not become falsely grouped. Urgency uses the actual source model and retains its stable ID tie-break. The arrow retains the actual craft-relative bearing after placement; the accessible label now includes direction and signed bearing as well as urgency and count.
- The full scenery failure message moves to the upper-right status area, below Route. When route detail is open, the map shifts below the status message. The garage retains a bottom-edge warning. The status still uses its original live status role and actual message; no warning or threat is suppressed for screenshot capture.
- Existing controls, race-phase visibility, comfort toggle, reduced-motion behavior and landing typography remain. High-contrast threat borders fit within the tested strip size. A long custom threat name can ellipsize, while the full label is retained in the title and accessible name.

## Verification

`npm test -- tests/ui/threatLayout.test.ts tests/ui/hudModel.test.ts tests/ui/galacticHudModel.test.ts tests/ui/sessionHudModel.test.ts`: 4 files, 28 tests passed.

`npm run typecheck`: passed. `git diff --check`: passed.

The geometric regression sweeps 384 combinations of bearings, airborne state, route detail and desktop viewports (1280×720, 1440×900, 1920×1080 and 2160×1350), while the fallback, tutorial and controls reserves are all active. Every combination retains three distinct directions, stays inside the viewport, avoids cue collisions and keeps the speed/heat/damage and landing regions clear. Other tests cover the rear wrap, nearby-bearing grouping, forward launch placement and malformed numeric input.

These are source and geometric checks, not a new screenshot acceptance. Root should capture normal canyon and launch racing at 1280×720, critical simultaneous hazards plus landing, and actual asset-failure driving with Route both closed and open. Verify full message placement and font fit on the target browser. Portrait/mobile, enlarged OS text, human motion readability and assistive-technology interaction have not been accepted here. The existing small-screen HUD remains densely packed; these tests make no mobile playability claim. Earlier frozen-build regression receipts describe their original build and remain unchanged.

## Interim 1280×720 browser QA

A bounded Playwright harness is now available as `scripts/inkstorm-hud-readability.mjs`. It owns a dynamically assigned preview port, has a 120-second deadline, hashes served JavaScript for every capture and closes its browser and preview process in `finally`.

The first run used served build `index-BJ8Znx2v.js`, SHA `b523306c8bc41f45876759e15c797dd811ad8c0e489f15e79f28258447243595`. Raw captures and receipt are preserved at `output/gauntlet/round-16-hud/`. The raw result is **FAIL: 53 of 54 assertions passed**. Its only failing assertion was the `+2` badge scroll height exceeding a 10px line box. Direct screenshot inspection shows the complete badge: visible overflow remains inside the 32px cue. The harness has subsequently been corrected to compare text bounds with actual clipping ancestors; it retains the raw line-box overflow metric separately. No runtime styling was changed to satisfy this metric. A new run on the next approved build is still required; the original receipt has not been rewritten.

The five screenshots were directly inspected:

- `03-canyon.png` and `05-launch.png`: existing diagnostic course seeks using the actual race renderer and HUD. Labels measure 160×32px, top y=134px; the forward course and launch foundry remain visible. These are staged views, not organic traversal.
- `critical-threats-airborne.png`: seek to launch progress 0.1796875 followed by 120 fixed simulation steps. The simulation produces two independently critical cue groups: a 92% geyser and a 91% incoming lance with two nearby threats. The actual landing panel shows 13.4m clearance and `Landing // Brace`. Both labels, grouped count and landing copy are readable in the screenshot and do not overlap the protected instruments. This is diagnostic simulation evidence, not a manually injected HUD fixture or a complete race.
- `fallback-route-closed.png` and `fallback-route-open.png`: one deliberately blocked actual canyon GLB request, ordinary Start Race button, eight seconds of live W input, then the ordinary Route button. Movement is 532.8m. The full original warning is visible at x=956, y=78, 292×48.8px. Open Route places the map at x=1068, y=154, 180×180px, below the warning and above the landing panel. The two captures are consecutive live states, not one frozen state. Missing scenery remains reported, with only expected deliberate-load console errors and no uncaught exception.

The owned browser and preview server were closed immediately after collection, before screenshot inspection. This is one-browser layout evidence and does not supply human readability, mobile, performance, full-race or world-art acceptance.

## Root follow-up on text clipping

The corrected clipping-ancestor harness ran on `index-BgaKQfcq.js` (SHA `27137ad3be42ee9b59e85c972ccefb64a615520317dab31289539b570226afa0`) and retained another FAIL receipt in `output/gauntlet/round-16-hud-verified`. It exposed standard labels inside overflow-hidden line boxes only 11.55px tall, while their text bounds were 15px. Root increased label and group-badge line height to 16px inside the unchanged 32px cue. This is a real CSS clipping correction, not a relaxed assertion; the next build must rerun the corrected probe. Both earlier failure receipts are preserved. That browser and its server closed in finally.
# Round 17 verification

The corrected clipping-ancestor harness passed all five captures on `index-DDt5c0Zg.js`, SHA `6a4e5a193edc949487477ce0fdaac9fdb0ce466b5b23eae29e1e319894b93184`. This includes two independently critical cue groups while airborne, and the unchanged scenery-failure message with the route panel closed and open. Actual threat-label line boxes now use 16px so the font ink clears the clipping boundary. Evidence: `output/gauntlet/round-17-hud/receipt.json`. The two earlier failed receipts remain preserved. Browser and owned preview were closed in the harness cleanup.
