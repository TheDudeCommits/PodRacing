# Sebulba asset preparation — first export

Prepared September 7, 2026. These are prepared asset files, not an accepted in-game appearance. The vehicle-study critic rejected the simple pilot as toy-like; improving that character remains open. No render or browser was run during this export task because the shared GPU was reserved for round 22 acceptance.

## Source and changes

[Sebulba podracer star wars](https://sketchfab.com/3d-models/sebulba-podracer-star-wars-f97e3891a6a846ed97379e3cfa5931a0) by [Vlad / vladvhm](https://sketchfab.com/vladvhm), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The license receipt was verified from official model metadata on September 7. The preserved imported source remains 68,689,196 bytes, SHA-256 `4bc2a4caf9370e8eb3adbb112749790123a7b113ca005a07611bfefafa70aaae`.

The separate study repaints the shell in the chosen Inkstorm palette and adds an original static pilot to the visibly empty cockpit. Source Material_765 had alpha values 139–255. This graphic adaptation deliberately treats its hardware/glazing as opaque; it does not reproduce the source transparency. The untouched imported source and source textures remain available.

The body was reduced from 411,899 to 47,362 triangles in two meshes. The hero preserves all 7,160 pilot triangles in four meshes. Welding uses a microscopic 0.0000022 game-unit distance; UVs remain per loop. Body collapse decimation uses ratio 0.115. Blender validation removed three invalid shell triangles after decimation. The rival then uses glTF Transform simplification at ratio 0.45 and error 0.01, including the pilot.

## Artifacts and structural checks

All source exports and receipts are under `assets/source/inkstorm/vehicles/f97e3891a6a846ed97379e3cfa5931a0/processed/`. After the round 22 capture freeze was released, identical hero and rival copies were published as `public/assets/inkstorm/vehicles/sebulba-hero.glb` and `sebulba-rival.glb`. Existing public files and `dist` were unchanged. The runtime has not yet been wired to these files. Keep the accompanying source credit/change notice when integrating this appearance.

| Artifact | Bytes | Triangles | Meshes / material draws | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| `sebulba-normalized-v2.glb` | 7,335,312 | 54,522 | 6 | `5f7528f1de4d668f1ca8cd3ab19923bbc1baaaf8240a7ba981348e5f8edcb075` |
| `sebulba-hero-v1.glb` | 2,672,804 | 54,522 | 6 | `f4b31d9260e3272ec394161dea236c874d551b469f18a1d794ec85c05b625b7e` |
| `sebulba-rival-v1.glb` | 1,819,016 | 24,559 | 6 | `22e1adf8e3dd6562ce143132fb4e82cdb56e62696d9894804ca07b4a3552d951` |

Both optimized GLBs pass `@gltf-transform/cli@4.5.0 validate` with **zero errors and zero warnings**. Each has one informational notice for the 1254×1254 non-power-of-two paint image. Both have six opaque, double-sided materials, two embedded WebP images, no animation, no skin, no extras, no cameras, and no lights. `EXT_texture_webp` is required; neither Draco nor Meshopt geometry decoding is required.

These are two static body meshes, not articulated engine/cockpit components. Runtime names are `sebulba-body-hardware.002`, `sebulba-body-shell.002`, and four nodes beginning `sebulba-pilot-`. Use the pilot prefix to suppress the procedural driver and exclude the imported pilot from the existing body-shadow pass, according to the current presentation contract.

## Basis, bounds, and effects attachments

Source +X forward and +Z up become runtime +Z forward and +Y up. Uniform scale is 2.2:

```text
runtime x = 2.2 × source Y
runtime y = 2.2 × source Z + 0.2
runtime z = 2.2 × source X − 0.712
```

Both optimized variants retain bounds `[-9.582127571, 0.525676310, -7.276037693]` to `[9.582118988, 8.310291290, 19.124982834]`. The inspected seat maps to approximately `[0, 1.366, -5.2]`.

glTF Transform removes the empty anchor nodes, so pass the following explicit root-local coordinates through metadata. These are geometry-derived candidate attachments that still require effect-on visual inspection.

| Attachment | Runtime XYZ | Measurement basis |
| --- | --- | --- |
| Exhaust left | `[-4.426030636, 3.854108810, 3.669570684]` | Center of 1,084 vertices in the left circular rear-rim X bin 1.985–1.995 |
| Exhaust right | `[4.426030159, 3.854107857, 3.669572830]` | Center of the corresponding 1,084 right-rim vertices |
| Coupling left | `[-2.767781019, 3.899996042, 10.019994736]` | Actual inner-shell vertex nearest the authored source target `[5,-1.25,1.66]` |
| Coupling right | `[2.767776728, 3.899995565, 10.019995689]` | Actual inner-shell vertex nearest the authored source target `[5,1.25,1.66]` |

The coupling positions are authored VFX attachment choices measured on source geometry, not evidence that the source contains an animated coupling. Detailed source coordinates and the 0.124-unit nearest-vertex distances are in `sebulba-export-v1-receipt.json`.

## Preserved failures and remaining acceptance

The first normalized export is preserved as failed evidence. An inactive Blender study had stale parent `matrix_world` values and placed the pilot near the origin. Version 2 explicitly evaluates the source scene and caches the fitted world matrices before switching scenes. It also validates the copied decimated mesh. The active Cruise scene, ViewLayer, active object, and all 15 selected objects were restored and verified after export. No full `.blend` save was made.

Remaining work:

- Render the normalized hero and rival from front, side, and chase views to check silhouette, decimation, UV seams, and pilot placement.
- Improve the rejected pilot, then repeat fitting and export acceptance.
- Verify exhaust and coupling attachments with effects visible.
- Integrate the second appearance and verify loading, fallback, MRT outlines, body shadows, and bounds in the actual garage/race.
- Measure full-race performance after the combined final bundle. Structural validation does not establish 40–60 fps or concept parity.

`sebulba-export-v1-receipt.json` records immutable source/script/log hashes, the failed first export, Blender output, final artifact counts, and these acceptance limits. Optimization logs are in `output/vehicles/sebulba-review/`.
