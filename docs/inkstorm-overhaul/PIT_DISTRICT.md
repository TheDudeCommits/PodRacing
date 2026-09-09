# Inhabited grid district

7 September 2026, local. The round-14 grid image left isolated hangars beside an empty road; the matching Inkstorm concept has overlapping canopies, service fronts, roof connections and visible ground activity. A new original Blender asset fills the gaps between the existing hangars with a coherent service district.

`pit-district.glb` contains three unequal open repair bays; four sagging painted canopies; supported scaffolding, balcony and access ladders; connected overhead power lines and lamps; layered service signage; spare engines with turbine throats; shipping cases, repair benches and **14 static crew silhouettes at approximately 1.8 m human scale**. The palette uses rust/coral, muted cobalt, cream, dark recesses and small cyan service marks. Local vertex colors put paint loss on exposed panels and canopy edges. This is original environmental geometry, not a downloaded vehicle or completion of the Sketchfab request.

The flagship uses four instances at normalized route progress 0.0085 (left, shortened frontage), 0.026 and 0.044 (right), and 0.048 (left). All face the road. A full bounding-box overlap guard skips a candidate if it does not fit between existing hangars on another course seed. Each accepted module stays outside the main and branch route envelopes and adds a physical scenery proxy. The existing world integration raises its feet to 5 cm above the 1.5 m apron, and includes the geometry in the static sun-shadow bake. The new family uses the existing machinery material and a single instanced batch.

| Contract | Published value |
|---|---|
| Triangles | 13,254 per instance; 53,016 for all four before view culling |
| Vertices | 25,260 |
| Meshes / primitives / materials | 1 / 1 / 1 |
| File size | 990,016 bytes |
| glTF bounds | (-56.82, 0, -18) to (58.25, 34.05223, 12.53502) |
| Conservative horizontal envelope / height | 60 × 18 m half extents / 35 m |
| SHA-256 | 947b7b7043775f0f4cdb007e30c055f6cfe485bddc6dcf6632f131a88833d2a0 |
| Khronos glTF Validator | Zero errors, warnings, infos and hints |

The source was executed as literal Python through Blender MCP. All created geometry and preview resources stay in **Inkstorm World Kit**; previous objects were retained, and the active **Korostyshiv Fractured Quarry Revision** scene was restored with its seven original objects. The neutral preview was inspected, and unsupported high-canopy corners and power-line endpoints were corrected before the final export. Preview render settings were restored. No browser was opened for asset production.

The optimized export has finite position/normal/color attributes, unit normals, bounded vertex colors, exact verified bounds and stable hierarchy names. The publishing script can regenerate the same optimized bytes from the staged export:

```sh
node assets/source/inkstorm/build_pit_district.mjs --check
npm run test -- tests/race/inkstormPitDistrict.test.ts tests/race/inkstormGeology.test.ts tests/race/inkstormFork.test.ts tests/race/inkstormLayout.test.ts
```

All **nine tests across four files**, typecheck and `git diff --check` passed. District tests independently verify four flagship modules with at least 2 m separation from other hangar bounds, dense main/branch route clearance across three seeds, and physical envelope/clear airspace behavior. They do not establish the in-world appearance or frame rate.

Source: `assets/source/inkstorm/build_pit_district.py`. Optimization/validation: `build_pit_district.mjs`. Full provenance and hash receipt: `assets/source/inkstorm/pit-district-receipt.json`. Neutral Blender preview: `assets/source/inkstorm/pit-district/district-asset-preview.png`. The preview is asset evidence only; the coordinated game capture, fresh blind critic and complete-race measurement determine visual and performance acceptance. The remaining finish retaining construction is outside this asset task.
