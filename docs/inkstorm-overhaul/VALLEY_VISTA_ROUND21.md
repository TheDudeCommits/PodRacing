# Valley vista revision — round 21 candidate

The round 20 blind image review rejected the launch as a blocked corridor. The two central walls were mostly long, heavily stretched scanned accents placed in front of the new signed physical mountains. The factory also used several oversized similar cylinders and a solid enclosing gantry. This revision addresses those view-only placements and industrial shapes. **The revised screenshots have not yet been reviewed; concept quality and performance are not accepted by this document.**

The landscape's source field, shared ridge definition, racing surface, branch shape, route clearances and industrial bench footprints remain unchanged. All changes are in `InkstormVista.ts` plus the two explicitly obsolete art-composition expectations described below.

## Geometry changes

- Replace 21 overlapping escarpment scans with nine shoulder ledges spread over the same three physical ridges. Source footprints are now 63.8–91.2 metres wide and 76–103 metres long. Crowns sit only 12–24 metres above each placement's local ground, rather than reaching a distant ridge summit from the valley floor. The existing downward grounding helper still buries the rotated footprint and retains that crown.
- Keep the middle/far scans outside a 24-degree horizontal panorama from the actual launch anchor. This is a conservative placement bound; it is not a statement that physical terrain or the camera reveals every part of the descending road.
- Keep scan bounds outside all three founded refinery yards, with an eight-metre margin. These accents can no longer intersect a deck or become a high rock lump in front of its short retaining face.
- Retain the lower, middle and upper terrace locations, dimensions, foundation depth, short retaining walls and terrain-founded inter-yard service spans.
- Replace similar tall silo forms with shorter unequal pressure vessels, flattened domes, selective panel patches, ladders and external risers. Replace the large central closed block with an open process rack and staggered service platforms. A light laced crane, an awning/loading frontage, roof vents, grouped pipes, handrails and a braced slender stack add constructed scale without another material or draw batch.

The resulting Vista geometry has **20,604 triangles in three draw batches**, including the unchanged finish barriers/signals and fork beacons. The refinery itself has **10,392 triangles**. The pre-existing 40,000-triangle / three-batch limit is unchanged. Scanned ledge asset triangles are separate existing instanced assets; reducing their placement count lowers their contribution but no GPU timing is inferred from this CPU count.

## Verification and changed art tests

`npm run typecheck`, `git diff --check`, and the four focused test files pass: **19 tests**. This includes the unchanged dense lane/elevated-branch disk clearances, actual primitive footprint proof, fixed triangle budget, terrain sampling footprint, signed field bounds, source scan grounding and all founded refinery terrace checks.

Two old expectations required 20–24 scans, at least 14 scans, and more than 24 metres of overlap between neighboring scans. Those assertions enforced a continuous scanned wall at a stage when the physical terrain did not supply the mountains. Keeping them after the signed terrain change would preserve the visible defect identified by the critic. They were replaced with sparse-assembly limits, three-ridge coverage, an independent check of every rotated source corner against the central panorama and bench rectangles, and a tighter local crown-relief bound. The prior independent full-footprint sampling and 40-metre maximum protrusion check remains. No racing, obstacle, terrain continuity, foundation or performance threshold was relaxed.

The four test files are `tests/render/inkstormVista.test.ts`, `tests/render/inkstormRockGrounding.test.ts`, `tests/race/inkstormLaunchOwnership.test.ts`, and `tests/terrain/launchBasinComposition.test.ts`.

Evidence is in `output/terrain/round21-vista/`: before-source copies, `geometry-receipt.json`, `source-hashes.json`, `typecheck.log` and `focused-tests.log`. The CPU geometry inspection started only a Vite module loader, used no browser, renderer or GPU, and closed the loader in `finally`. No public asset file changed.

## Required visual follow-up

Capture launch approach, crest, principal launch and descent using the same positions as round 20. Verify that the physical valley and lower road actually read as a broad reveal, that the sparse accents merge into the physical slopes, and that the refinery remains a coherent destination at game resolution. Materials are being revised separately. If physical mountain silhouettes still block the view, a safe physical landscape revision may be needed; this visual-only change does not establish that terrain acceptance.
