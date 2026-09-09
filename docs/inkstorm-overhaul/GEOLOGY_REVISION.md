# Scanned sandstone — current local publication

7 September 2026. The canyon-buttress family now uses the root-reviewed **Poly Haven Boulder 01 variant 1**, recolored into Inkstorm vertex paint and processed through Blender MCP. The original closed measured rock supplies natural fractures across its full crown and flanks. Two earlier open-cliff constructions were rejected because their fabricated caps or overlapping scan sheets still read as manufactured. Variant 2 remains staged; the existing fractured-spire accent family is unchanged.

| Current public file | Triangles | Bytes | SHA-256 |
|---|---:|---:|---|
| canyon-buttress.glb | 28,000 | 1,291,464 | ad9f484c3cd751e9042ecc332e9517c7c21d34919758dfdaa89bde77f153a5e6 |
| canyon-buttress-lod.glb | 4,200 | 247,284 | 9262af74e76f008803f96c21a17bfbe62eca2098648f58640a716d20de75f21a |

Both files preserve exact glTF bounds **(-40,0,-50)..(40,120,50)**, one mesh, primitive and material, finite vertex colors/positions and unit normals. The high and LOD are each one connected closed manifold component. Blender and an independent export-roundtrip topology check report zero boundary edges, non-manifold edges, inconsistent winding or degenerate triangles. All **17 public Inkstorm GLBs** pass Khronos validation with zero errors and warnings. The other **18 public files** were unchanged by publication. No family, layout, renderer, collision or gameplay code changed in this asset swap.

The [official source](https://polyhaven.com/a/boulder_01) is by Rico Cilliers and is [CC0](https://polyhaven.com/license). Every original download was resolved from the official manifest, checked against provider MD5/size and separately SHA-256 hashed. Original source files, deterministic local original-file archives and provenance remain in `assets/source/inkstorm/scanned-geology/`. The downloaded glTF contains 66,122 triangles, despite the page's 124K catalog count. Original source normals/photographs are preserved in the archive; the delivered game meshes carry only restricted vertex paint.

Current receipt: `assets/source/inkstorm/scanned-geology/public-geology-receipt.json`. It lists all 20 public asset hashes and individual GLB validation counts. Candidate topology/source details: `boulder-candidate-receipt.json`. Exact outgoing broad high/LOD bytes, publisher and receipt are archived in `history-pre-scan-buttress/`; older round-13/14 archives are unchanged.

```sh
node assets/source/inkstorm/scanned-geology/publish_scanned_geology.mjs --check
```

The previous `publish_mixed_geology.mjs` is a historical rollback tool. It requires `--restore-round15` to restore the old four-file mixture. Its historical `--check` is not the current publication check.

Root reviewed the neutral high comparisons before local integration. Round-17 game captures confirm more natural fractures, while revealing that the new pointed basal shape can appear poorly grounded when the renderer uses only center terrain height minus 1.5m. After the clean round-17 benchmark was released, the renderer received a separate grounding correction. `InkstormRockGrounding.ts` samples a 5×5 grid across each broad rock’s exact yaw-rotated XZ box during `setCourse`. It places the base at the lowest sampled terrain minus 1.5m and 15% of the original nominal height, then increases render-only vertical scale to retain the original crown. This extends a pointed base into terrain without moving any horizontal bound or hiding an entire low rock on a steep basin shoulder.

Citadel instances retain the exact support-top values provided by the existing Vista metadata. Settlement instances use the underside of the unchanged five-metre deck (`centerGround + 121 * originalSy - 2.5`); the compensated render scale never feeds back into the original form or deck calculation. Every ordinary and fork-divider crown remains `centerGround - 1.5 + 120 * originalSy`. X/Z, yaw, horizontal scales, authoritative layout and collider data remain unchanged. Other asset families retain their previous planting. The existing instance/sphere rebuild and shadow revision update include the new transforms automatically.

Three focused grounding tests independently check a rotated unequal footprint on an analytical slope, a deep interior trough that center/corner-only sampling misses, exact horizontal transform preservation, fixed citadel support tops and the actual outpost deck underside read from generated mesh vertices. Those tests plus the two existing fork clearance/collision tests pass (**5 tests in 2 files**); TypeScript checking also passes. No browser or build was run by the grounding task. A 5×5 grid can miss smaller troughs, and sampling enclosing corners may extend geometry downward beyond the irregular rock’s occupied area. The next coordinated capture must assess basal contact and any remaining support gaps.

The new triangle costs are **3.5× high / 2.34× LOD** relative to the outgoing 7,990/1,798 pair. No source/render work was run during the coordinated performance measurement. Neutral Blender renders and asset contracts establish neither 40–60fps nor concept-image parity; integrated runtime evidence remains authoritative. The comparative renders are `boulder-1-preview.png`, `boulder-2-preview.png`, both corresponding LOD previews, and `procedural-boulder-comparison-preview.png` in the source directory. Full experiment and session-preservation notes are in that directory's `README.md`.

The later connected launch-ridge pass replaces the Vista's isolated support heaps and outposts with physical ridge benches and three founded industrial yards. Ordinary buttress grounding and public GLBs remain unchanged. Its separate evidence and remaining visual gate are in [CONNECTED_LAUNCH_RIDGES.md](CONNECTED_LAUNCH_RIDGES.md); the earlier support-top tests described above are historical, while the generic explicit-crown contract remains tested.

Everything below is preserved historical reporting. Its counts, hashes, old commands and acceptance scope describe earlier revisions.

---

# Historical round-15 mixed sandstone publication

7 September 2026, local. The round-14 blind review scored concept closeness **4.21/10** and identified repeated angular fins as a regression in geological mass. The original broad sandstone buttress is now restored; the split-crown sculpture is retained as a separate **fractured-spire** accent family. This is a composition correction prompted by the critic, not a claim that the next visual gate has passed.

The flagship authoritative layout contains **85 broad buttresses and 14 spire accents** (14.1% accents). The renderer adds 10 more broad citadel buttresses. Canyon walls, hairpin walls, start and foundry surroundings, fork dividers, the largest distant escarpments and citadel remain broad. Spires are selected only from existing open-ground placements in fast straights, wide sweepers, launch and recovery sections. Coordinate-seeded selection breaks paired repetition; each selected accent is at least 260 m from another, and its scale is capped at 1.6 × 1.55 × 1.7. No new decoration positions or larger ground footprints are introduced.

Both families have a high and distant instanced batch. Spires use the rock material, correct 120 m nominal height for projected shadows, and the existing 240 m LOD threshold. This adds one high and one low geometry/material batch. Restoring broad cliffs raises their close-up triangle count again, so previous performance measurements do not establish this build's performance. Integrated capture and complete race measurement remain required.

| Published asset | Triangles | Bytes | SHA-256 |
|---|---:|---:|---|
| canyon-buttress.glb | 7,990 | 716,600 | a65200e93cf582925bd4ee496e9a91569152156e59c56a23a157bd8a66b708e2 |
| canyon-buttress-lod.glb | 1,798 | 126,372 | a358427e62edcfaf1a1e3308b3662ecd9715078c6066717099f9902a3c671e7c |
| fractured-spire.glb | 3,416 | 373,568 | e82a86b1e0667dace700cfe5b24d6af8e2dc0ae1b4f6da6160ade168a4df79d7 |
| fractured-spire-lod.glb | 1,803 | 176,148 | b0203d116d7b3bbf9858a06d0366a90ce08c8aa6b4a2b43ae2167a01df92dccc |

The four files have exactly the same normalized bounds **(-40, 0, -50)..(40, 120, 50)**, ground origin, one mesh/primitive/material, finite position/color/normal attributes and unit normals. Both broad files are byte-identical to the preserved round-13 pair; both spire files are byte-identical to the round-14 pair. Historical internal node names are retained for byte preservation, while runtime family names and URLs distinguish the forms.

All **16 public Inkstorm GLBs** passed Khronos glTF Validator with zero errors and warnings. Every issue count is in `assets/source/inkstorm/mixed-geology-receipt.json`. Six focused tests across three files passed, including the unchanged physical divider clearance and collision tests, all racing lanes, the sparse family mix over three seeds, and independent dense main/branch sampling against each accent's complete transformed horizontal bounding box. This does not establish human perception or frame rate.

Reproduction:

```sh
node assets/source/inkstorm/publish_mixed_geology.mjs --check
node assets/source/inkstorm/build_geology_revision.mjs --check
npm run test -- tests/race/inkstormGeology.test.ts tests/race/inkstormLayout.test.ts tests/race/inkstormFork.test.ts
```

`publish_mixed_geology.mjs` without `--check` restores/publishes the four verified historical byte streams and refreshes the all-GLB receipt. The original round-14 generator, Blender source, receipt and two GLBs are preserved in `assets/source/inkstorm/geology-revision/history-round14/`. The current `build_geology_revision.mjs` publishes **fractured-spire** assets only; rerunning the sculpture pipeline no longer replaces broad cliffs. Its output receipt is `fractured-spire-receipt.json`. No new Blender operation or browser session was needed for this mixture; the meshes retain their original Blender MCP provenance. No files were committed or deployed.

The remainder records the earlier round-14 replacement and its narrower asset-level validation. Its old published filenames and scope are historical.

---

# Historical round-14 canyon buttress replacement

7 September 2026, local. Only `canyon-buttress.glb` and `canyon-buttress-lod.glb` are replaced. Both preserve exact glTF bounds **(-40, 0, -50) to (40, 120, 50)**, the ground origin, and one mesh, primitive and material. No renderer, terrain, placement, collision, vehicle or gameplay code changes are included.

The former asset has repeated ledges around much of its perimeter. The revision instead uses broad irregular vertical fracture faces, two unequal crown peaks separated by a deep notch, two localized undercuts, 34 clustered talus plates and two embedded fracture shoulders. The crown also varies across depth, avoiding the original flat cap. Corner vertex colors paint warm mineral faces and restrained variation without a repeated horizontal color-band function.

The neutral Blender comparisons demonstrate a material change in silhouette and surface organization. They do **not** establish concept-image parity or in-world quality. The new rock is still strongly stylized, with broad surfaces and visibly polygonal edges; the next game capture must assess whether repeated placements read naturally and whether the current rock shader adds sufficient surface detail. The shared concept's richer small-scale weathering and world composition remain separate concerns.

| Asset | Previous triangles / vertices | Revised triangles / vertices | Previous / revised bytes |
|---|---:|---:|---:|
| Canyon buttress | 7,990 / 18,544 | **3,416 / 9,778** | 716,600 / 373,568 |
| Distant LOD | 1,798 / 3,181 | **1,803 / 4,563** | 126,372 / 176,148 |

The high mesh uses about 57% fewer triangles. The LOD retains five more triangles than before, and its harder normal/paint seams increase its vertex count and file size. Both remain below the requested 8,000 / 3,000 triangle budgets. This is not a new frame-rate measurement.

## Validation and reproduction

Both published GLBs pass Khronos glTF Validator with **zero errors, warnings, infos or hints**. Each contains `POSITION`, unit-length `NORMAL` and finite `COLOR_0` values inside [0,1]. Normal lengths range approximately 0.99999992–1.00000012. Both exact bounding boxes pass numeric equality checks.

The LOD uses attribute-aware meshoptimizer reduction with original normals and colors retained. Initial vertex locks alone allowed a small extremal talus component to disappear. Validation rejected the resulting +X bound before any publication. The final pipeline retains six actual incident source triangles at missing bounding extrema, preserving real sculpture geometry without adding dummy points or rescaling the reduced mesh. The completed LOD is 1,803 triangles.

The full Blender source was executed again through MCP, followed by a read-only regeneration check. Optimized high and LOD bytes matched the published GLBs exactly. Reproduction scripts are:

- `assets/source/inkstorm/build_geology_revision.py` — literal Blender-safe source; creates new objects only in **Inkstorm World Kit** and exports a staged raw GLB.
- `assets/source/inkstorm/build_geology_revision.mjs` — glTF Transform dedup/prune, attribute-aware LOD, strict contracts, preservation and publication. `--check` validates regenerated bytes against the published pair without writing them.
- `assets/source/inkstorm/preview_geology_revision.py` — neutral Blender-only high/LOD comparison with scene restoration.

```sh
node assets/source/inkstorm/build_geology_revision.mjs --check
```

The Blender tool remains in safe mode. Literal source is supplied through MCP; there is no `eval`, `exec`, file reading, network access or process launch inside Blender. The initial unsupported `exec` attempt was rejected without executing, then replaced by the allowed literal-source workflow.

## Preservation and provenance

Original GLBs, source scripts and receipts remain archived in `assets/source/inkstorm/geology-revision/history-round13/`; existing earlier source files remain unchanged. No old Blender objects or unrelated datablocks are deleted or purged. New revisions and preview resources stay in the owned Inkstorm scene. The previously active **Korostyshiv Fractured Quarry Revision** scene is restored after every operation; its seven objects and the object inventories of unrelated scenes remain unchanged.

This is original authored Blender geometry. It is **not** a Sketchfab download or a claim that blocked vehicle downloads were completed. The exact user wording accompanies the Blender calls and is retained in the receipt.

Published content hashes:

- `canyon-buttress.glb`: `e82a86b1e0667dace700cfe5b24d6af8e2dc0ae1b4f6da6160ade168a4df79d7`
- `canyon-buttress-lod.glb`: `b0203d116d7b3bbf9858a06d0366a90ce08c8aa6b4a2b43ae2167a01df92dccc`

Detailed provenance, source hashes, contracts and validation are in `assets/source/inkstorm/geology-revision-receipt.json`. Neutral renders are `previous-asset-preview.png`, `revision-asset-preview.png` and `lod-asset-preview.png` inside `assets/source/inkstorm/geology-revision/`. The LOD was loaded back through the glTF importer and visually checked under the same camera/light setup. No browser was opened for this task. Runtime visual and performance acceptance belongs to the next coordinated build and capture.
