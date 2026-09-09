# Pilot material atlas v2 — isolated production study

**Isolated atlas and processed GLB candidate complete; fresh blind review is 5.6/10, below the required 8/10. Do not promote this as an accepted vehicle.** This is a material-production follow-up to [the v2 pilot study](PILOT_DETAIL_V2.md) and [its independent 5.0/10 review](BLIND_PILOT_V2.md). The generated [material guide](concepts/vehicles/pilot-material-guide.png) guides finish only; the original [Teemto concept](concepts/vehicles/teemto-inkstorm.png) remains the acceptance reference.

The material task preserves the 8,672 triangles and four rigid pilot groups. It cannot resolve the critic's remaining geometry, anatomy, harness-routing or cockpit-composition findings by texturing alone. No parity or runtime-performance claim is made.

## Production method

[`inkstorm-pilot-material-v2.py`](../../scripts/blender/inkstorm-pilot-material-v2.py) runs through Blender MCP in separate `setup`, `bake`, `preview` and `export` calls. Setup is inspected before baking. Four copied pilot meshes receive jointly packed UVs in a shared 2048 × 2048 color atlas. Connected mesh components select cloth, sleeve cloth, gloves, woven webbing, rubber, ivory helmet, dull metal, orange cloth and visor bake roles; those intermediate roles collapse back to four final material groups after baking.

The atlas is produced by Blender's diffuse-color bake, with direct and indirect lighting disabled. Original source-space procedural nodes provide controlled base-color variation, textile weave, edge wear and local contact/seam AO. The shader revisions add analytically positioned sleeve panel seams, narrow paired borders and localized rubbed cloth. This is 3D UV/material authoring. The generated guide and earlier screenshots are not edited or pasted into the texture.

One shared baked color texture supplies all four final pilot materials. Final roughness/metallic values remain per group; there is no added normal map, roughness texture or runtime procedural material dependency. Consequently, rubber, webbing and visor do not each retain separate per-pixel roughness. The shared atlas adds texture memory, but the candidate adds no pilot triangles or material draws.

## First material attempt retained

The first bake succeeded at 2048² with four unchanged groups, but actual image review found excessive cloudy cloth mottling and insufficient sewn-panel detail. Its atlas and three actual CPU Cycles captures remain under:

- `assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-material-v2/`
- `output/vehicles/pilot-material-v2-review/`

The exact initial script is retained as `output/vehicles/pilot-material-v2-review/inkstorm-pilot-material-v2-first-bake.py`. It is failed material evidence, not the selected candidate. The original pilot geometry study and all earlier images remain intact.

The second bake (`pilot-material-v2b`) also succeeded technically but was rejected after both close views were inspected. Visible weave and repeated bright seam bands dominated the navy suit. Constant-X seam fields intersected broad flat garment regions and produced an unintended regular pattern. Its atlas, three views, exact script and MCP receipts remain in the parallel `pilot-material-v2b` processed/review folders. It was not exported or placed in public assets.

The executed v2c shader removes those lengthwise seam planes, limits seam treatment to intentional sleeve boundaries, reduces it to narrow broken low-contrast borders, reduces weave to a subtle value variation, darkens the navy cloth and raises dull buckle value. All three final images were directly inspected after baking. The distracting stripe pattern is removed, glove/suit values separate, and the helmet has restrained surface variation. The suit still reads too smoothly against the guide and original concept; this is a modest material improvement and a concrete production candidate, not a premium visual pass. It retains the model's long neck, simplified sleeve volumes and previously identified cockpit composition limitations.

## Preservation

The material study copies the pilot, source body mesh data, review lights/camera and world. Body material data is shared read-only. No original scene, earlier study, public GLB or runtime source is replaced. No `.blend` is saved, no scene extras are exported, and no credential or external API is used. Every action restores the exact shared scene, view layer, active object and selection using ordinary local variables.

Initial shared context was verified as `Cruise — Going Merry source 4b2cb678`, 17 scene objects, `ViewLayer`, active `Sketchfab_model.001`, 15 selected. Every setup, bake, render and export restored that same context. No browser was opened by this task; render ownership was coordinated with the runtime acceptance agent and released after the final export.

## Final v2c evidence

Actual source-space material study images (1400 × 1000, CPU Cycles, 24 samples):

- [Side](../../output/vehicles/pilot-material-v2c-review/teemto-material-side-v2.png)
- [Front quarter](../../output/vehicles/pilot-material-v2c-review/teemto-material-front-quarter-v2.png)
- [Full craft](../../output/vehicles/pilot-material-v2c-review/teemto-material-full-v2.png)

These renders show the baked PNG applied through ordinary Principled materials, with no live procedural nodes left in the displayed pilot materials. They do not show the WebP candidate loaded in the game. Full-craft body geometry and existing paint maps are preserved; this task concerns the added driver.

Latest scene: `PodRacing — Teemto pilot material v2c`. Normalized copy: `PodRacing — Teemto pilot material v2c normalized`. The source study, v2/v2b material attempts and all associated images remain unchanged.

All final assets are in `assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-material-v2c/`:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `pilot-color-atlas-v2.png` — 2048² shared pilot color atlas | 2,214,951 | `6b47509a9ccf4755d643a6101d65c88240dab8902e41d75890af88a5aee7f282` |
| `teemto-pilot-material-v2-normalized.glb` — Blender export | 10,076,136 | `89fcdf43f8ed345aaaa52811672c118c249543a74d019740f01edfb7eaae2856` |
| `teemto-pilot-material-v2-candidate.glb` — optimized study candidate | 3,035,412 | `1070bea977a74e0ddcc4640f86dc3fca7bc8b211e6af5896284677de7dc7f283` |

The candidate has **52,217 triangles, seven mesh primitives, six unique materials and three WebP images**. The driver is unchanged at **8,672 triangles/four material groups**; its four groups share one atlas. The other two images are the existing 1254² body paint maps. There are no animations, skins, geometry compression decoders, camera nodes, light nodes or exported scene extras. `EXT_texture_webp` is the only used extension. Triangle count is unchanged by optimization.

Normalization matches Teemto v1: 2.5 scale, 12.742° source pitch and +Z-forward/Y-up export. The resulting bounds are `[-6.545274734, 0.072866201, -7.333491802]` to `[6.496447563, 5.250973701, 22.738540649]`. All exported node TRS values are identity/omitted. Blender's global name collisions result in `teemto-cockpit-body.001`, `teemto-engine-left-body.001`, `teemto-engine-right-body.001` and `teemto-pilot-suit.002`; other pilot nodes retain the `teemto-pilot-` prefix. These are recorded study names. A later runtime replacement must canonicalize or deliberately map them, and retain the existing explicit effect-anchor metadata; this candidate does not provide a new anchor contract.

glTF Transform **4.5.0** optimization used no geometry simplification, flattening, instance conversion, mesh joining, palette merging or geometry compression, with WebP textures at a maximum 2048. Its validator reports **zero errors and zero warnings**. Three info records remain from the unchanged body: two non-power-of-two 1254² images and two degenerate triangles in the 19,965-triangle cockpit primitive. No new driver validation issue was reported.

Exact script SHA-256: `db3c75f07eda3c94f8765d6db84b2eea0b5178af7fe3ffb3483c995f25147963`. Full counts, node names, image hashes, MCP receipts and CLI logs are retained under `output/vehicles/pilot-material-v2c-review/`. Python syntax compilation and `git diff --check` pass. No runtime screenshot or FPS result is claimed for this material candidate.

## Fresh blind result

An independent agent opened only the three v2c actual images and original Teemto target, with no source, earlier images, prior reviews or implementation claims. Its [report](BLIND_PILOT_MATERIAL_V2C.md) gives **5.6/10 against the 8/10 threshold**. It recognizes readable helmet/suit/glove separation and visible finger engagement, but still identifies mannequin-like sleeves, insufficient cloth compression and seams, rigid-looking harness strips, simplistic helmet/glove construction, an overly glossy neck and competing cockpit hoses/rods. The full-craft image does not compensate for the close-up weaknesses.

This is a failed visual gate. It supports retaining the atlas and candidate as reviewable production work, not declaring a premium pass or replacing the public vehicle.

## Attribution and next acceptance

Vehicle source: [Teemto Pagalies' Podracer](https://sketchfab.com/3d-models/teemto-pagalies-podracer-4eff45899ada40bb920c5c744663db90) by [Rafael Fernández Calvo / rafarelo](https://sketchfab.com/rafarelo), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), as verified in the project source manifest. Existing vehicle stylization and the original static Inkstorm pilot are derivative project work. This material task adds original procedural pilot surface treatment and a UV bake; it does not claim the source vehicle or generated concept as an original model.

The next step is geometry/material revision addressing that report, especially clothed joints, harness thickness/tension, neck response and helmet/glove construction, plus the separately owned cockpit composition. Only an accepted candidate should proceed to runtime naming/anchor mapping, garage/race inspection, and fresh performance checks. Current public Teemto and Sebulba files remain untouched by this study. The public Teemto hero/rival hashes were rechecked as `a7787f380a71ac31c8dbbaf228cb949e97c119d763a54384e66c05f884cba491` and `3d9d8d8d924258b84553de7f31f44dc4f69f069511cb6358ab2c174768e3385f` respectively.
