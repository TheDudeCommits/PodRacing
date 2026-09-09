> Historical pre-execution planning record. See `PIT-PILOT-HANDOFF.md` and `pit-pilot-manifest.json` for the executed candidate and current status.

# Round 30 baked workshop lighting study

**Status: implementable next-round plan, not a baked or accepted result.** Only CPU source inspection, geometry metrics, frozen-input extraction, script syntax checks, and documentation were performed. No Blender process/session, UV unwrap, bake, GPU, browser, public asset, or runtime-source change occurred. Root must freeze the combined round29 result before authorizing an isolated bake.

The image-only round29 material critique is mixed: sunlight and gantry separation improved, while shaded engines, chests and rails lost silhouette. The next candidate should make the bays visibly warm and readable, with exposed metal edges, dark mechanical cavities, and a lit work plane. A technically correct but barely perceptible change is insufficient. Baked direct response can supply this stronger local contrast while allowing actual cabinets, engines, rails, cloth and people to block their lamps. It cannot invent missing edge materials, better equipment geometry, or moving-object shadows.

## Frozen input and feasibility

Use the final staged v4 candidates, not the earlier public v3 geometry. Input identity is pinned in `source-metrics.json` and the extracted JSON files under `inputs/`:

| Family | v4 SHA256 | Triangles / vertices | Total authored surface | Source-facing priority estimate |
|---|---|---|---|---|
| pit-complex | ea94400e38bf6cf5998f84cbd2cffd342054760e17c43c0f4b75ac636212d1dc | 12,012 / 22,906 | 44,892 m² | 14,780 m² |
| pit-district | 607ea30cc7563a0c07da20a21b25135055a7736adcc34527c057fa6216fba091 | 17,110 / 33,898 | 24,815 m² | 6,942 m² |

Those large areas include the broad slab and enclosed predecessor surfaces. The priority estimate tests triangle centroids near and facing lamps, without occlusion; large slab triangles inflate it. It is a UV planning upper estimate, not a measurement of actual illuminated area. Preserve hidden predecessor geometry and its original triangle ordering; do not remove it merely to simplify a bake.

Use shared v3 fixture anchors from `../grid-construction-round29/task-light-anchors.json`, SHA256 `2fafc4be49abd590acd62ff3a8c9e4672d6b27d6d929d334d5e5232584f8d8b1`. Pit GLB emitters: `(-50,9.44,-3)`, `(-8,9.44,-3)`, `(36,9.44,-6)`. District: `(-36,8.08,-4)`, `(1,13.08,-8)`, `(41,9.88,-1)`. The district sources stay under the lower service rails, behind the cloth attachment. No fixture moves are proposed.

The current layout contains three unit-scale pit complexes, three unit-scale districts, and one district at frontage scale `sx=0.72`. A canonical bake follows the scaled geometry visually but does not reproduce the changed light distances, projected areas, and normals under that unequal scale. The recommended exact option keeps two runtime atlases: one pit atlas, plus one district atlas containing unit-scale and0.72-scale tiles. Bake both district variants against their actually transformed geometry with the same UV chart layout. Runtime selects a district tile through a per-instance vertex UV offset, not a second texture sample. Translation and yaw need no extra bake because each lamp rotates/translates with its family and the sun is excluded.

## UV and atlas contract

Start with a **2048×1024 pit atlas** and a **2048×1024 district atlas containing two1024² scale tiles**. These two RGBA8 GPU allocations with full mip chains cost about21.33 MiB total; RGB PNG decoding commonly still uses four channels on the GPU. Target encoded delivery <=2.5 MiB total, to be measured rather than assumed. PNG files are initial delivery; do not introduce KTX2 decoder/compression work before the first bake demonstrates value.

At65% assumed packing occupancy, uniform1024 density is only3.90 texels/m for the pit and5.24 for the district. Allocate roughly80% of usable UV area to the floors, working machines, exposed metal, cabinets and low receiver surfaces; the suggested sizes give approximately8.6 and8.9 texels/m in the conservative priority areas. Aim for at least8 texels/m on visible workshop shadow receivers and12–16 on critical engine/rim/bench islands if packing permits. These are targets, not achieved UV density. Keep dark exteriors/hidden faces at lower density but give every chart valid unique space; do not pile unlit faces into one black texel in the first candidate.

Preserve all triangles. Build a temporary Blender mesh directly from `inputs/<family>.json`, converting positions/normals from GLB `(x,y,z)` to Blender `(x,-z,y)`. Set custom corner normals from the input and assign `sourceVertexId`/`sourceTriangleId` attributes. UV-only operators may add/adjust a lightmap UV layer but must not weld, dissolve, triangulate again, remesh, recalculate normals, or apply modifiers. Existing source attributes are POSITION/NORMAL/COLOR_0 only: there is no UV to preserve. Use angle-based/smart projection as an initial unwrap, join sensible coplanar receiver islands, set priority island scale, then pack with rotation and no mirrored/stacked islands. Thin rods may keep small charts; minimum island dimensions and padding matter more than giving each tiny triangle a full texel.

Reserve >=8 pixels of dilation around every chart at the delivered tile resolution, with >=16 pixels between occupied chart interiors. Give each district scale tile its own outer gutter. Use scale-independent UV charts for both district bakes. Reject inter-chart overlap, UVs outside[0,1], flipped/zero-area UV faces, insufficient padding, and severely stretched important islands. Report chart occupancy, density distributions, thin-island failures and rasterized overlap counts; a pretty UV screenshot alone is insufficient. Compare full and half-resolution shadow crops before raising texture size. If critical shadows fail, first improve packing or reduce exterior density; an increase to2048² for the pit needs a new memory/performance budget.

Export only per-corner UV records with original face/vertex IDs, using the schema below. `transfer-uv1.mjs` then copies original source floats into any UV seam duplicates and validates every POSITION/NORMAL/COLOR_0 component per triangle corner exactly. No Blender geometry/color re-export can silently change the shipped surface. It creates TEXCOORD_0 and TEXCOORD_1 pointing at the same new UV accessor because glTF2 indexed semantics must start at0 and be consecutive. There was no prior UV0, so this alias loses nothing. [glTF2 specification](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc)

```json
{
  "sourceSha256": "pinned v4 family hash",
  "uvOrigin": "BLENDER_BOTTOM_LEFT",
  "uvValidation": {"status":"PASS","overlapPairs":0,"minimumChartPaddingPixels":8},
  "triangles": [{"sourceTriangleId":0,"corners":[
    {"sourceVertexId":0,"uv":[0.1,0.2]},
    {"sourceVertexId":1,"uv":[0.2,0.2]},
    {"sourceVertexId":2,"uv":[0.2,0.3]}
  ]}]
}
```

The transfer explicitly uses `v_glTF=1-v_Blender`; set runtime texture `flipY=false`. Verify this once with a colored UV checker/gradient baked onto known faces and actual GPU pixel samples. Do not guess or apply a second V flip. Local Three0.185.1 GLTFLoader maps TEXCOORD_1 to `uv1`. A custom ShaderMaterial must declare/use that attribute explicitly without colliding with Three's conditional USE_UV1 declaration; its standard `lightMap` property is not wired automatically into this custom shader. The current World clone/merge path may duplicate UV0 and UV1 buffers even when the GLB accessor is aliased; account for that memory and inspect it after integration.

## Isolated Blender bake

After GO, create a new isolated scene/collection, save original scene/view layer/active object/selection/mode, and restore all in `finally`. Operate only on temporary objects created from the frozen JSON. No original scene objects, final candidates, public GLBs, render settings of other scenes, or full .blend saves are changed. Verify source hashes before and after. Record Blender5.2 build/device, Cycles settings, script hash, UV hash, atlas resolution and lamp parameters.

For each bake, use Cycles with a black world, no sun, no HDRI, no imported lights, no glow, no camera tone mapping, and no ambient-occlusion multiplication. Replace the temporary receiver material with a white Diffuse BSDF, roughness0, connected to output; an active Image Texture node points at a float bake target using the lightmap UV layer. Every real source face remains present and opaque for shadow rays. Preserve custom normals and all actual clothing/cloth/equipment occluders. Original cyan and warm face colors are not emission materials during the white bake; physical task lights are the sole illumination.

Create one rectangular AREA light per fixture, size2.1×0.68 m, oriented along the visible underside normal (Blender -Z), about0.003 m below the emitting plane to avoid self-intersection. Keep the actual dark housing as an occluder. Do not tilt a virtual light through its housing to aim at a prettier receiver. Use `normalize=True`, `use_shadow=True`, and a full/downward broad spread; let source geometry produce occlusion. These positions are the existing fixtures, not invisible fill sources. Cycles area-light energy is radiant watts, not electrical lamp wattage. [Blender area-light API](https://docs.blender.org/api/5.0/bpy.types.AreaLight.html), [light normalization API](https://docs.blender.org/api/5.2/bpy.types.Light.html)

Bake `type='DIFFUSE'`, Direct on, Color on, Indirect off against that white BSDF; use margin8 and an extend/dilation mode that does not pull unrelated neighboring charts. Disable denoising for the first128-sample pilot; raise to256–512 only if repeated sample estimates reveal noise. Baking uses the active UV/image target and Cycles sample/light settings. [Blender bake manual](https://docs.blender.org/manual/id/5.0/render/cycles/baking.html), [BakeSettings API](https://docs.blender.org/api/5.2/bpy.types.BakeSettings.html)

The RGB result is the **direct outgoing response of a unit-white diffuse surface**. It is often called an irradiance lightmap, but raw irradiance and white Lambertian response differ by a factor ofπ. Define the stored convention explicitly and verify it with a white calibration card. With the proposed convention runtime multiplies wornBase by the decoded map directly; do not add another Lambert term, `N·L`, inverse-square falloff, sun visibility, AO, or division byπ. Color on is safe because the receiver is exactly white and preserves the area-light color; no authored albedo is baked twice.

## Strength and material direction

The concept establishes the direction—warm service pools, material separation and dark hollows—but it does not supply physical lamp wattage, exposure, or measurable scene radiance. Treat strength as art calibration, not a recovered physical measurement. Start with broad warm fixture color `(1,.70,.38)` and a recorded radiant-power bracket such as150/300/600 W. These are pilot settings only; measure the resulting white-card response before choosing power. Normalize the lamp's area explicitly, and bake the0.72 district variant with its scaled source width and actual geometry under the same chosen power.

The first visible candidate should be deliberate: on the engine/bench work plane, aim for a median white response around0.8–1.4 and bright exposed surfaces around1.6–2.2, while geometrically blocked cavities stay near zero. Those values are review targets, not baked results or a substitute for the concept comparison. Render a clearly stronger candidate and one restrained alternative from the same physically occluded solution. Preserve the existing cyan predicate and warm lens self-emission. Current cobalt is reflective paint; it must receive task diffuse. Let authored steel, cream/chips and facing ridges become readable through their albedo and illumination, keeping turbine throats and occluded joints dark. If white diffuse cannot recover an edge because its vertex paint/material is indistinguishable, report that as a separate authored-material issue rather than painting fake edges into the irradiance map.

Do **direct only** first. Indirect fill can improve room depth but a white-material bounce bake gives walls unrealistically high reflectance and may wash out metal/cavity separation. Any later indirect variant needs the actual source albedos for transport and a verified receiver-color separation, with its own diffuse-indirect pass and evidence. An arbitrary ambient gradient should not be described as baked light transport. Do not bake the sunset, sky, scenery sun shadows or neighboring family illumination; those would repeat incorrectly across placement yaw/terrain and double-count the existing runtime lighting.

Save a linear half-float EXR master per bake/tile, plus sample statistics and settings. For compact runtime delivery, divide the chosen white response by a recorded decode range (initial candidate4), encode RGB through the standard sRGB transfer function to8-bit PNG, and load it as SRGBColorSpace. The sample then decodes to linear automatically; multiply by the same range once. No AgX/Filmic/view exposure is applied to the saved lighting. Record clipping and quantization error against EXR; reject meaningful clipped highlights and visible dark-band/penumbra steps. Assemble the two district scale tiles before mip generation, with intact gutters. A texture filename and manifest must identify both UV geometry and bake hashes.

## Future runtime change, not performed

Keep one instanced batch and material per family. Add a vec2 lightmap varying from uv1; the district vertex path maps uv1 into the appropriate half of its atlas based on the known0.72/1 scale bucket. Assert only supported scales at load/rebuild instead of silently reusing the wrong tile. Remove the analytic receiver/falloff/cone/normal functions and their vWorkshopScale varying. Retain only the inexpensive local fixture-lens mask and the current sun, texture wear, sheen, haze and cyan logic.

```glsl
vec3 taskResponse = texture2D(uWorkshopBake, vWorkshopUv).rgb * uWorkshopDecodeRange;
color += wornBase * taskResponse * (1.0 - service);
// Keep the existing small warm lens self-emission; do not make the map emissive.
```

This is one extra RGB fetch replacing analytic diffuse arithmetic, with no runtime scene lights, new draws, or rendering passes. It adds texture bandwidth/memory and UV seam vertices, so it is not a promise of higher FPS. Worst-case per-face UV splitting is87,366 vertices across both families versus56,804 currently; triangle counts remain unchanged. Exact growth must be measured. Attribute bandwidth may increase further because World merges UV0 and UV1 separately. Two full district variants share one texture and one lookup; no per-frame CPU allocation is needed.

Load the paired UV GLB and content-hashed lightmap together and validate uv1 before enabling the baked material. Missing/mismatched assets should report an error and omit task diffuse temporarily, not silently map unrelated UV0 or use stale light. Do not ship a mixed-cache old-geometry/new-map pair. Existing separate foundation/terrain and moving racers are not in the family bake: baked light neither reaches those receivers nor gains their shadows. The family's original static crews cast baked shadows; moving them later requires a rebake. All geometry/normal/fixture changes invalidate the bake.

## Acceptance and available source tools

Before an in-world comparison, verify: glTF validation0 errors/warnings; exact per-corner source geometry/normal/color preservation; unchanged bounds/triangle/material/primitive counts; UV overlap/padding/density; source and bake hash pairing; valid pixel ranges/clipping; a known UV orientation test; white-card normalization; and actual source-geometry contact/occlusion. Sample both visible and blocked receivers. Compare EXR/baked pixels against Cycles direct-light reference at points under an engine, behind a cabinet, beneath cloth, and on unobstructed work surfaces. The previous162 fixture-path test should be rerun on v4 as a diagnostic, not treated as full bake validation.

After source checks, root captures the same pit/district/grid views and a bright exterior view with fixed camera/exposure. Grade the actual image for readable warm work zones, selective material contrast, dark cavities, credible equipment shadows, no UV seams or atlas bleed, and no extra orange haze on the whole yard. Test near/distant mip levels and both district scales. Measure actual GPU/frame/resource cost against the frozen round29 baseline and close the browser immediately after capture. No parity or40–60 FPS claim is earned by a completed bake alone.

- `source-metrics.mjs`: executed; audits exact v4 geometry, area and atlas estimates.
- `export-bake-input.mjs`: executed; writes exact source IDs/arrays under `inputs/`, with no Blender use.
- `transfer-uv1.mjs`: staged and Node syntax-checked only. It requires validated future UV-corner files, transfers only UVs and source-preserving seam splits, and writes only round30 candidates. No UV transfer has occurred.

References were checked against primary Blender/Khronos sources and the installed Blender5.2/Three0.185.1 source files. The web manual's direct latest URLs returned a fetch error, so available indexed official manual/API pages and installed source were used; no third-party technical claims are required by this plan.
