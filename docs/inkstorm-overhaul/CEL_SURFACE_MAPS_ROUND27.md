# Authored normal and roughness maps — round 27

The vehicle adapter now retains standard glTF tangent-space normal maps and roughness maps in the NPR material. Pilot cloth and webbing surface detail can reach the game renderer instead of appearing only in Blender. This is a rendering capability, not acceptance of the pilot artwork or proof of final race performance.

## Material contract

- `CelMaterial.normalMap` and `roughnessMap` borrow the GLTFLoader textures. Their independent `channel` values select UV0–3. Automatic texture transforms are copied from offset/repeat/rotation/centre; manually supplied texture matrices are copied directly. No shared texture matrix, wrapping, filtering, flipY or color-space property is mutated.
- Normal and roughness textures must carry `NoColorSpace`, matching GLTFLoader's data textures. Normal RGB is decoded as `2 × texel − 1`; the signed normal scale multiplies X/Y. Roughness uses only green, multiplied by its material factor. Base-color texture decoding and paint shaping remain separate.
- Primitives without tangents use the equations in the installed Three 0.185.1 `normalmap_pars_fragment` chunk. Position derivatives and the normal basis are both in world space. `defaultnormal_vertex` supplies the inverse-transpose normal, so rotated children under nonuniform parent scales do not mix coordinate spaces. Primitives with authored tangents retain Three's view-space tangent/bitangent construction and interpolation, including tangent W handedness; the mapped result is converted to world space for lighting. The mapped normal drives diffuse lighting, graphic specular, rim and the view-space matcap. Back faces use Three's double-sided frame convention. Collapsed UVs and zero-length decoded normals fall back to the geometric normal without normalizing zero.
- The adapter preserves GLTFLoader's signed normal scale exactly in both paths, including its already-negated Y on primitives without tangents. It enables the authored branch only when the geometry contains complete, finite, nonzero tangent directions with W of −1 or 1. Converted-material caching distinguishes the two frame paths without adding geometry submissions.
- Roughness retains the graphic highlight shapes while reducing specular response to `1 − .88r²` and matcap reflection response to `1 − .92r²`. It does not turn the material into PBR shading. A material with no roughness map retains the existing response unless the caller explicitly supplies `CelMaterialOptions.roughness`. The adapter consumes an authored material factor when a roughness map is present.
- The admission pass checks every used map's UV channel, coordinate count, component count and finite values before any conversion. Unsupported object-space normal maps or incorrectly tagged data textures fail admission and retain the prior working art. Existing draw and triangle limits are unchanged.

The implementation was checked against the local authoritative Three shader chunks `normalmap_pars_fragment`, `normal_fragment_begin`, `normal_fragment_maps`, `defaultnormal_vertex`, `roughnessmap_fragment`, and GLTFLoader's `assignTexture`/`assignFinalMaterial`. No new dependency was installed.

## Ownership and cost

`CelMaterial.dispose()` releases only its existing private ramp and matcap. Loader textures remain alive across material disposal and concurrent vehicle leases, and are released once by `VehicleArtLibrary` after the final lease/cache entry is retired.

Each normal-mapped fragment adds one texture read plus its frame arithmetic. The authored path adds tangent and bitangent varyings; only the derivative path computes screen derivatives. Each roughness-mapped fragment adds one texture read. There are no additional geometry submissions, render targets or render passes. Assets without those maps compile without their sampler branches. Inspection of all four currently published Teemto/Sebulba GLBs found neither map; their legacy map-only treatment remains active.

Normal maps affect beauty shading. They do not change silhouette, geometry depth, the separate geometric-normal edge prepass, or shadow caster shape. Texture memory and full-race timing depend on the eventual V4 GLBs and remain separate validation work.

## Validation

The focused suite passes **52 tests in four files**, plus TypeScript and `git diff --check`. It covers independent UV channels/transforms, signed scale copies, authored frame selection, invalid tangents, legacy feature exclusion, factor-only roughness, map ownership across two live leases, missing/short/non-finite UVs, unsupported map encoding, exact-material style isolation and retention of prior live art after a replacement fails. These tests do not prove shader compilation or GPU tangent-frame parity.

The GPU fixture is ready for root execution; choose a new output directory for a retry:

```sh
INKSTORM_OUTPUT=output/gauntlet/surface-map-validation-round27-v2 node scripts/inkstorm-surface-map-validation.mjs
```

It serves only an isolated test page on owned port 5198, loads actual in-memory glTF fixtures through the real GLTFLoader, renders the production Cel mapped-normal code to RGBA readbacks and compares it against official `MeshNormalMaterial` output. Cases cover positive/mirrored UVs, independent UV1 with KHR texture transformation, authored tangents and derivative tangents, signed loader scales, rotated nonuniform and mirrored model transforms, double-sided back faces and collapsed UVs. A separate full-lighting case compares a green roughness texel multiplied by its factor against the equivalent scalar roughness.

The harness writes a JSON report and a contact sheet to its selected output directory, then closes its browser and server in `finally`. The tolerance is at most two byte levels per RGB channel, matching coverage, and at least 1,000 covered pixels per case.

Root's first GPU run on Chrome 152 / Apple M4 is preserved in `output/gauntlet/surface-map-validation-round27/`. All seven derivative cases and the roughness case matched exactly, but both authored-tangent cases failed with maximum error of eight byte levels across the covered plane. Negating the normal-scale sign while deriving a replacement frame was insufficient under the fixture's nonuniform/sheared transform. The source now retains the authored tangent frame, and three additional authored-frame cases cover KHR UV1 transformation, back faces and mirrored model transforms. The comparison threshold is unchanged. That run also logged one resource 404. The fixture now declares a data favicon to prevent implicit favicon requests; console errors are still collected without filtering.

The **13-case GPU retry passed at 2026-09-07 18:38:09 UTC**, on Chrome 152.0.7977.77 / ANGLE Metal / Apple M4. Every case had zero maximum and mean byte error, matching coverage and zero mismatched pixels; browser errors were empty. Root's report and actual GPU contact sheet are preserved in `output/gauntlet/surface-map-validation-round27-retry/`. The initial failed report remains intact. The owned browser closed and port 5198 had no listener after execution.

This proves the fixture's GPU math and compilation against Three's reference path. The game build with eventual V4 assets, live pilot screenshot comparison and full race timing remain separate root validation. No public asset or Blender state was changed by this source subtask.

## Exact authored material styles

The adapter now accepts optional `VehicleArtDefinition.surfaceStyles`, keyed by the exact, case-sensitive authored `material.name`. The exported `VehicleArtSurfaceStyle` permits only palette, specular strength, rim strength, reflection strength, wear and `normalStrength`. It cannot change source textures, UV transforms, nodes, geometry, material side or ownership.

Composition is global material options, then the matching style, then preserved source bindings and tint. `normalStrength` multiplies a clone of the original signed normal scale and defaults to 1; the original scale is never mutated. All supplied style scalars must be finite and nonnegative. Unsupported fields are rejected, and validation completes before conversion or replacement of active art. Names without an exact match affect no material.

The focused test uses two authored materials with similar names and different case in an unmatched style key. Only the exact match changes; the other retains all global settings. Shared source textures, UV channels/transforms, color factor, roughness factor and signed original scales remain intact, and draw/triangle counts do not change. Five invalid scalar cases preserve the prior live art and release the failed candidate. An untyped texture override is rejected. No shader math or appearance metadata was changed by this bounded addition; root owns actual style selection and its visual/performance verification.
