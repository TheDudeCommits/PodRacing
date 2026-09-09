# Round 16 — independent image-only critique

## Scope and evidence

This review inspected only the supplied target and screenshots. No source, reports, earlier critiques, receipts, or implementation claims were consulted.

- Target: `docs/inkstorm-overhaul/concepts/05-launch.png`.
- Foreground evidence: `output/gauntlet/round-16-foreground/05-launch.png` and `live-drive.png`.
- HUD evidence at 1280×720: `output/gauntlet/round-16-hud/03-canyon.png`, `05-launch.png`, `critical-threats-airborne.png`, `fallback-route-closed.png`, and `fallback-route-open.png`.

The foreground images have a different framing/aspect ratio from the HUD images, so the 1280×720 HUD judgment uses the HUD set directly. These are still-image judgments; they do not establish FPS, temporal readability, interaction, handling, or successful play. Full-world detail and scanned geology are outside this review.

## Verdicts

| Bounded task | Verdict | Score |
| --- | --- | --- |
| HUD readability and scene obstruction at 1280×720 | **PASS, with polish issues** | **8.0/10** |
| Vehicle and foreground finish against the target | **FAIL** | **6.3/10** |

The HUD pass is a screenshot-layout pass. The foreground fail is independent of the environment’s detail level.

## Task 1 — HUD

The principal hierarchy works. Position, lap, speed, and the airborne clearance are readily distinguishable. The central road corridor remains visible in the canyon and launch views. The heatwave banner occupies the sky rather than the immediate driving line, while the hazard chip, landing card, and grouped incoming-threat chip have separate positions in the crowded airborne view. There is no visible collision between their text blocks.

Grouping incoming threats into `INCOMING LANCE +2` keeps the critical screenshot from becoming a stack of separate warnings. That chip is visible against its dark backing and does not cover the road ahead. The landing card clearly separates clearance from the landing instruction. Its size and contrast remain effective in both fallback screenshots. Opening the route map leaves the main forward corridor available.

Visible issues, in priority order:

1. **P2 — Secondary text is too small for a comfortable glance.** The narrow route-name text beside the distance, the hazard-chip label, the incoming-threat label, and small telemetry percentages require considerably more attention than the large speed and clearance values. In the critical screenshot, `+2` can be read, but it is very small and conveys only a count. Increase the compact alert text and count modestly, and give the route name a less condensed treatment. Preserve the current small panel footprints where possible.
2. **P2 — The expanded map creates a busy right-hand column.** In `fallback-route-open.png`, the route panel, flag, long vertical progress line, landing card, and speed arc form a dense chain. The exposed lower progress line and circular marker reach the speed-gauge area, weakening the grouping between map information and speed. Contain the progression graphic within the map region or give it a short, clearly separate extent above the landing card.
3. **P3 — Bright-sky contrast varies in the unbacked upper-left labels.** Position/lap captions and the small route name are less secure against the launch sky than against the dark canyon. The large digits remain readable. Add a restrained consistent local backing or stronger text edge/shadow for those secondary labels.
4. **P3 — The upper-left race-order panel repeats a large amount of positional information.** In the supplied circuit views, `RACE ORDER 1/8` occupies a fairly wide panel beneath an already prominent `POSITION 1/8`. It is not blocking the road, but the visible content does not justify that much area. Tighten the panel unless more information is actually present.

The evidence does not show whether `+2` can be expanded, how long alerts remain on screen, or how the warnings change during motion. No conclusion about those behaviors is implied.

## Task 2 — Vehicle and foreground

The vehicle reads coherently as two engines connected to a central occupied cockpit. The teal/orange palette, circular engine faces, black segmented hoses, cockpit rim, helmet, and visible wear marks create a recognizable authored design. The hoses visibly reach the craft and engines; the cyan coupling visibly joins the two engine units. In `live-drive.png`, the offset ground shadow provides a readable cue that the craft is above the surface.

The remaining gap is in construction and material depth, not merely missing world detail. The target has densely layered engine machinery, broken-up painted metal, a recessed occupied cockpit, fine branching energy, and more nuanced ground interaction. The actual foreground still shows broad simple shells, crisp graphic outlines, and comparatively flat effects.

Visible issues, in priority order:

1. **P1 — The checkpoint still reads as a thin frame.** The launch view shows two narrow uprights joined by a very thin straight beam, with small box joints. It lacks a substantial supporting structure, convincing beam depth, and readable mechanical assembly at this camera distance. Give it deeper sections, a braced or layered crossmember, substantial mounting feet, and a few purposeful joints or fixtures. The target does not contain this checkpoint, so this is an integration/construction judgment rather than a demand to copy a target object.
2. **P1 — The coupling looks like a flat zigzag strip.** The cyan connection is clearly visible but dominated by a broad, fairly uniform opaque ribbon with pale jagged edges. The target’s coupling has thin branching strands, variable thickness, luminous cores, and open space between arcs. Replace the ribbon-dominated appearance with several uneven, separated strands and localized branching; strengthen the visual attachment at the engine ends. Keep the open center readable.
3. **P1 — The underbody and contact treatment remain under-resolved.** The cockpit shell has little readable underside construction, and its lower edge closes into a simple faceted hull. The live-drive ground shadow is large, hard-edged, and comparatively uniform. It establishes hover separation but does not provide the target’s rich interaction between machinery, light, ground, and dust. Add visible underside depth and selected structural parts, strengthen local self-shadowing around attachments, and vary the ground shadow/contact treatment with softer edges and a restrained dust/ground-response layer. Preserve clear hover separation.
4. **P2 — Engine faces and casing surfaces need more depth and material variation.** The front openings have useful rings and central detail, but many elements read as flat outlined pieces in a bright cyan disk. Broad gray casing facets and clean orange bands make the engines feel lighter and simpler than the target. Deepen selected recesses, vary ring thickness and occlusion, and concentrate wear around panel boundaries and hardware instead of relying mainly on broad patches.
5. **P2 — Cockpit and hose connectors need a final integration pass.** The hoses are readable and appropriately segmented, but their large repeated dark segments dominate the joins. The pilot and cockpit remain simplified, with a visibly blocky seat/back area and broad flat body panels. Add a small number of convincing sockets, collars, overlapping cockpit layers, and controlled shadow pockets. These high-value junctions matter more than scattering small details everywhere.

## Concrete completion priorities

Keep the HUD’s current overall placement. First separate the route progression graphic from the speed area and improve compact alert/route text. For foreground acceptance, prioritize checkpoint construction, a strand-based coupling appearance, and underbody/shadow integration before adding more decorative wear. Re-capture the same launch and live-drive framings plus the same crowded 1280×720 HUD states for comparison.
