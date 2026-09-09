# Ark source preparation for round 35

Ark is ready for a focused serial Blender inspection after Ivory. It is not ready for runtime admission: the preserved GLB includes two assemblies, legacy effect geometry, unresolved cockpit occupancy and disclosed N64 texture reuse. This preparation used Ark's own saved inputs and decoded transforms. No Blender, browser, download, runtime edit, build or test was performed.

`NEXT_FLEET_AFTER_ROUND33.md` was read first. Its order—Colour, then Ivory—is preserved; Ark follows those candidates. Its old fleet counters are historical and are not repeated as current status here. No manifest or catalogue counts were changed.

## Verified source and assembly selection

- UID `41071debeaf1499a9a1586b78ea18a09`, “Star Wars - Ark Bumpy Rooses Pod Racer,” Mad Agus / `Agus555`. Saved official metadata reports CC BY 4.0. The original import is 1,558,424 bytes, SHA-256 `a4ea3127cbce56a577c7bd363490b4a1f0463f5da9e6394c6e4e0c59b9fac63f`; it was rehashed for this inspection.
- The author description explicitly says the textures come from the N64 game and that the original game model was used as reference. Preserve that disclosure. The uploader's license does not establish rights to the third-party textures or underlying property. Geometry preparation can proceed privately; a public derivative must not silently label these source textures as independently cleared. Plan original replacement surfaces and retain the geometry provenance limitation.
- The GLB has 363 nodes, 180 mesh definitions, 33 materials, 32 texture bindings and 26 embedded images. All 180 meshes are used once, so **31,984 triangles is also the actual instance-expanded source total**. No skins or animations are present.

| Own transformed source group | Mesh nodes / triangles | Blender bounds and use |
|---|---:|---|
| Detailed assembly at X≈0 | 87 / 31,118 | `[-2.680274,-3.187151,0.338609]` to `[2.680274,2.432898,1.708247]`. Select this complete assembly first. |
| Displaced low-detail assembly at X≈−6.52 | 93 / 866 | `[-9.319726,-3.189648,0.335091]` to `[-3.680450,2.431898,1.794953]`. Preserve privately; exclude from the derivative. Do not use it automatically as the rival LOD. |
| Detailed assembly excluding named legacy FX | 75 / 30,518 | Same extents; 21 remaining material slots. This is the practical body-preparation starting set, with cockpit roles still unclassified. |

The groups separate cleanly at Blender X=−3 using transformed vertex bounds. `source-node-bounds.tsv` maps the 87 detailed source mesh nodes to their semantic parents, materials and bounds. The displaced group is retained in the original GLB and summarized in the evidence JSON. Bake full source-world transforms from a copied derivative scene, then apply the selected craft's normalization. The import's 6.431112 scale already normalizes the **combined 12 m scene span**; applying it again or treating 12 m as one craft's length would be wrong.

Both original quarter PNGs were viewed individually. They show the side-by-side assemblies, two rear cockpit pods, orange clustered engines, a cyan shell on the detailed version and conspicuous black flat surfaces. Quarter-b confirms rear nozzle direction. This is source inspection, not an art-quality acceptance.

## Cockpit occupancy and fit

**Occupancy remains unverified after this independent inspection.** Each small pod shows a rounded dark element, but the saved views do not clearly separate a head, neck, torso, arms or seated legs. Do not label it an original driver, duplicate it with a new pilot, or mark `pilotAdded` yet.

Inspect these Ark-specific nodes in isolation, preserving them in the original scene:

- `Esfera_94` / mesh node **160**: 960 triangles; bounds `[-0.1988,1.6060,0.9329]` to `[0.1988,2.0036,1.3305]`. This is the ambiguous dark rounded cockpit object; the name and shape alone do not establish a helmet.
- `Pod_9.001_138` / node **272**: **10,624 triangles**, bounds approximately `[-0.1779,1.4770,0.6578]` to `[0.1779,2.2291,1.0511]`. Largest simplification hotspot; establish whether it is hull/seat before reducing it.
- Cockpit nodes **16, 18, 20, 22, 78, 80, 82, 122–140 (even indices), 160, 272** total 14,386 triangles. The exact names are in the TSV. Several thin textured surfaces overlap the same region; isolate by semantic parent and diagnose them before merging.

First serial pass: neutral-material close-ups from front, side, rear and overhead; classify canopy/cowl, seat, controls and any actual body parts; measure pelvis/seat plane, head/eye, shoulder clearance, hands-to-controls, knees and feet. If no driver exists, author a compact seated driver specifically inside this pod, with separate helmet/visor, cloth and glove roles and a stable `ark-pilot-` prefix. If a source driver exists, preserve its identity and record that it was retained. Do not borrow Blockrunner's pose, source transform or occupancy verdict. Keep the `podracer` physics contract.

## Candidate basis and anchors—not accepted fit

Own geometry supports Blender **−Y forward / +Z up**, equivalent to source glTF world **+Z forward / +Y up**: the cockpit is near Y=+1.8, intakes extend toward Y≈−3.19, and flame geometry extends toward increasing Y. Confirm rear axes in the serial close-up.

A usability-first starting envelope is **10.5 m wide**, using uniform scale **1.9587546755** on the isolated detailed assembly. This gives approximately **10.5 wide × 2.6828 high × 11.0083 long**. It preserves Ark's broad proportions. The trial transform is:

`runtime [X,Y,Z] = [s*sourceX, 0.1+s*(sourceZ−0.3386094820), −5.2−s*(sourceY−1.8048)]`

Here 1.8048 is the longitudinal center of the unresolved rounded object, not a measured pelvis or accepted pilot anchor. The driver-fit pass must replace that provisional datum if necessary. No final `pilot` attachment is supplied yet.

Rear-rim vertex decoding gives four genuine small annular candidates at Blender Y=**−1.2889808**, Z=**1.0952198**, X=**±0.9122275** and **±2.3644755**. Each has 32 inner and 32 outer vertices with 64 rear-plane annular triangles. The inner circumradius is approximately .073099 m; the 32-gon inscribed radius is approximately .072747 m before normalization. These are measured rim candidates, not a complete throat-clearance result.

For the existing two-exhaust contract, the symmetric inner pair is a concrete first option:

| Attachment | Ark parent / mesh node | Trial runtime position |
|---|---|---|
| `exhaustLeft` | `Cilindro.045_112` / **44** | `[-1.786830,1.582014,0.859958]` |
| `exhaustRight` | `Cilindro.066_150` / **86** | `[1.786830,1.582014,0.859958]` |

Use rear direction `[0,0,-1]`. The trial normalized inscribed radius is **.142494 m**; after full cavity verification, supply `exhaustApertureRadius` so the existing code scales the effects to the opening. Retain authored lips. The outer pair, nodes **68/100**, remains physical geometry without additional plumes under this two-anchor option; document that choice. Do not invent a central effect origin to conceal the limitation. In particular, the central tubes' maximum-Y bounds yield only one extreme vertex, **not an aperture center**; those attempted probes are explicitly rejected in the evidence JSON.

The detailed binder spans X≈±.6482, Y≈−1.7673, Z≈1.08355. Its own endpoints give provisional coupling positions `[-1.269665,1.559156,1.796868]` and `[1.269665,1.559156,1.796868]` under the trial transform. Check the receiving hardware before keeping both anchors. Preserve the two detailed cable meshes **142/144**; do not replace physical tethers with unrelated geometry.

## Concrete packaging sequence

1. Copy only the detailed assembly into a UID-owned derivative scene. Omit the 12 named flame/binder meshes listed in `source-evidence.json` from the runtime copy; retain them in the original. This removes all candidate BLEND materials and 600 legacy-FX triangles.
2. Resolve occupancy and fit before merging cockpit geometry. Record explicit driver/body membership. Reduce hidden hull tessellation—especially node 272—while preserving the cockpit opening, controls, engine mouths, cables and source silhouette. Target ≤25,000 rival body triangles, leaving room for an approximately 4,000-triangle driver; create the rival from this detailed derivative.
3. Replace the reused game textures with independently authored surface assets. The 26 embedded images total only 26,122 bytes and are mostly 16–64 pixel textures; there are no normal or roughness maps. All decoded image alpha is opaque, including the images used by legacy effect cards. Two materials use BLEND via scalar alpha, while several other effect cards are opaque. Thus missing image files are not the demonstrated cause of the black surfaces. Diagnose solid-shell UV/material response separately; do not apply an indiscriminate black-pixel cutout fix.
4. Consolidate the 21 solid slots into a small original atlas/material set: painted engine shells, darker metal/recess hardware, cockpit body, and separate driver responses if required. Keep pigment/metal/cloth separation, restrained wear and useful large planes. Do not bake or sample the N64 textures into the replacement atlas. Preserve source normals where sound; fix proven hard-edge issues in the derivative.
5. Export rigid opaque GLBs with baked identity roots, source-specific pilot prefix and identical hero/rival root attachments. Stay within six body draws, six pilot draws, twelve total; hero ≤60,000 and rival ≤30,000 triangles including the actual driver. No loader budget increase is needed. Verify topology, normals, UVs, texture ownership, opaque materials, measured aperture clearance and reimport parity before registration.
6. Hand root one isolated source inspection plus the exact derivative/anchor/material receipts. After registration, use garage/chase/side views and ordinary public controls for fit and readability, then full-race evidence and a fresh art critic. No source PNG or triangle budget establishes those results. Preserve the original UID and disclose every replacement; do not update family counts before admission.

The remaining serial blockers are explicit: classify the dark cockpit form, confirm seat/driver fit, inspect actual throat clearance, approve the two-plume presentation choice, and author replacement materials. The source selection and geometry measurements above allow those steps to start without another broad catalogue pass.
