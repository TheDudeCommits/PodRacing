# Isolated Teemto pilot material candidate v2c

This folder is a processed study, not the public/runtime vehicle.

- `pilot-color-atlas-v2.png`: one original 2048² pilot UV color bake, containing color, controlled wear and local AO.
- `teemto-pilot-material-v2-normalized.glb`: normalized Blender export, 52,217 triangles.
- `teemto-pilot-material-v2-candidate.glb`: optimized WebP candidate, 3,035,412 bytes, 52,217 triangles, seven mesh primitives. SHA-256 `1070bea977a74e0ddcc4640f86dc3fca7bc8b211e6af5896284677de7dc7f283`.
- `inkstorm-pilot-material-v2.py`: exact staged Blender MCP recipe.
- `artifact-receipts.json`: exact artifact hashes, mesh/image counts and exported names.

The pilot is unchanged at 8,672 triangles/four rigid material groups. The candidate has no animation, skin or per-pixel roughness/normal texture. It is not approved for concept parity, runtime use or frame rate. Global Blender suffixes on body/pilot node names require deliberate mapping or canonicalization before any later integration.

Vehicle source: [Teemto Pagalies' Podracer](https://sketchfab.com/3d-models/teemto-pagalies-podracer-4eff45899ada40bb920c5c744663db90) by [Rafael Fernández Calvo / rafarelo](https://sketchfab.com/rafarelo), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The source is retained separately. Project changes include existing vehicle paint stylization, an original static pilot, and this original procedural pilot UV/material bake. The generated material guide is a design reference and is not pasted into this texture.

See `docs/inkstorm-overhaul/PILOT_MATERIAL_V2.md` in the repository for actual screenshots, failed iterations, preservation checks, validation and acceptance limits. Public Teemto/Sebulba assets are untouched by this study.
