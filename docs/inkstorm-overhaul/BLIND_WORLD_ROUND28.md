# Round 28 world image review

**Verdict: FAIL. All seven sections remain below the strict 8/10 gate.** The route landmarks are recognizable, and the warm terrain / violet shadow / blue machinery palette holds together. Sparse secondary detail, simple industrial construction and inconsistent surface treatment remain visibly short of the original concepts.

## Evidence and scoring boundary

Compared all seven original `docs/inkstorm-overhaul/concepts/01-grid.png` through `07-finish.png` with their matching numbered images in `output/gauntlet/round-28/`. Also inspected all eight supplemental images: `fork-approach`, `fork-after-entry`, `launch-approach`, `launch-crest`, `launch-descent`, `canyon-arch-approach`, `canyon-arch-under`, and `canyon-arch-beyond`; plus `garage.png` and `live-drive.png`.

This is a fresh image-only assessment. No prior criticism, source, plans, receipts or implementation claims were read. Scores concern visible output. Still images cannot establish FPS, animation, collision correctness, uninterrupted driving, or production acceptance. Vehicle silhouette differences from the generated concepts are allowed; vehicle scores concern finish and integration, not exact shape replication.

Every criterion must reach 8.0 for section acceptance. Means below are descriptive and do not override a failed criterion. Density means purposeful detail across foreground, middle distance and background, not raw object count.

| Section | Material | Composition | Route clarity | Density | Vehicle | Mean | Gate |
|---|---:|---:|---:|---:|---:|---:|---|
| 01 Grid | 6.0 | 6.0 | 8.0 | 4.5 | 6.5 | 6.2 | FAIL |
| 02 Salt run | 6.0 | 5.5 | 8.0 | 4.5 | 6.5 | 6.1 | FAIL |
| 03 Canyon | 6.5 | 7.0 | 8.0 | 6.5 | 6.5 | 6.9 | FAIL |
| 04 Fork | 6.0 | 6.5 | 7.0 | 5.5 | 6.5 | 6.3 | FAIL |
| 05 Launch | 6.0 | 6.0 | 7.5 | 5.0 | 6.5 | 6.2 | FAIL |
| 06 Foundry | 5.5 | 6.5 | 6.5 | 6.5 | 6.5 | 6.3 | FAIL |
| 07 Finish | 6.0 | 6.5 | 8.0 | 5.5 | 6.5 | 6.5 | FAIL |

## Section defects and corrections

**01 Grid.** The gantry establishes a start line, but its large clean beams dominate a largely vacant settlement. The concept has layered workshops, hanging equipment, draped cloth, cargo and human-scale activity close to the racing lane. Here most buildings sit behind flat retaining edges and small roof strips. Populate workshop mouths with recognizable repair equipment and clustered cargo; give awnings actual sag and thickness; articulate gantry joints, hanging lights and weathered beam edges. Keep the clear central lane.

**02 Salt run.** The clear marker corridor is surrounded by large bare shoulders and a broad empty horizon. A few isolated small orange rocks repeat without the concept's varied ledges, tilted spires and receding formations. Detailed craggy rocks sit beside smooth rounded cliff masses with visibly different detail scale. Build a stronger middle-distance sequence of rock shelves and spires, blend cliff bases into rubble, and use directional road wear to lead into the distant bend. The `live-drive` frame confirms the same sparse ground treatment and shows visibly dotted/jagged distant silhouettes.

**03 Canyon.** This is the strongest section: the arch encloses the route and the supplemental frames clearly show the corridor continuing through it. Most rock remains one broad violet value, however, with repeated vertical masses, abrupt bases and only a few isolated small rocks. The concept has richer strata, stepped shelves, accumulated debris and sunlit surfaces framing a winding road beyond the arch. Add warm reflected variation and selective exposed strata, connect the cliff bases with debris banks, and strengthen the road's visible curve. Preserve the clear arch opening.

**04 Fork.** Both branches are visible across the approach/entry frames, but the raised branch reads as a thin, smooth artificial ramp laid onto sand. Its constant clean curbs, plain dark supports and sharp entry edges are much less integrated than the concept's substantial routes cut around a central rock mass. A detached-looking triangular edge fragment appears to the right of the vehicle in `fork-approach.png`. Finish the entry/terrain joints, give the elevated road a convincing supported edge or rock foundation, and make the branch divider a stronger landmark. The repeated oversized chevrons compete with the small cyan branch lights.

**05 Launch.** The distant foundry supplies a destination, but the numbered, approach and crest frames are dominated by sky and a wide smooth foreground shelf. The descent frame reveals the route turning left, yet the vista remains a few large masses around an empty basin. It does not achieve the concept's deep layered valley or dramatic visible drop. Bring the descending road into view at the crest, add stepped middle-distance formations and smaller terrain breaks, and expand the foundry silhouette into a more legible cluster. Avoid allowing a thin checkpoint bar to become the main foreground landmark.

**06 Foundry.** The industrial identity is legible, but repeated smooth cylinders, cyan bands and similar pipe stubs make the machinery look assembled from a small kit. Several open pipe mouths face the road without a visually explained connection. The same broad gantry form used at the grid limits this section's identity. Add a clear hierarchy of main vessels, smaller service equipment and connected pipe runs; articulate flanges, access panels, braces and grime at joints. The sand hump and rock wall obscure the continuation, while the visible scene does little to explain the HUD's right turn. Shape or mark that turn in the world before the hump.

**07 Finish.** The left bend is clear, but the guardrail, dark sign boards and solitary box-shaped tower are too clean and simple for the concept's worn engineered cliff edge. The course appears gently undulating rather than a substantial banked sweep; there is no strong visible finish structure or comparable focal reward in this frame. Give the outer edge thickness, braces and segmented worn barriers; articulate the banking and add a readable finish landmark. Cluster small rock debris where the wall meets the road instead of relying on a few separated rock props.

## Shared vehicle and finish issue

The retained source vehicle is readable in every section. Its blue worn paint, pale stripe, exposed rods and cyan exhausts provide a consistent palette. The large engine shells still read as broad flat panels with sparse attached hardware; the pale cockpit top is cleaner and less articulated than the engines. The guide's layered metal, edge damage, fasteners, seams and stronger localized material response are not yet matched. Improve those surfaces within the existing silhouette. Do not remodel it merely to copy the generated vehicle.

The garage still offers a readable vehicle presentation but cannot substitute for world acceptance. The close pilot frames are assessed separately in `BLIND_PILOT_RUNTIME_ROUND28.md`. No round-27 world comparison was made, so this report does not claim a world regression or prescribe a world revert.
