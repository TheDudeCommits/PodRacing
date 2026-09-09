# Polwo final V2-shoulder source packages

Source-only technical handoff, 2026-09-08. No public/runtime files changed by the packaging task. Root owns reimport/render, live installation, fresh visual critique, and performance testing.

| Asset | Bytes | Triangles | Body / pilot draws | Full-mip RGBA8 estimate |
|---|---:|---:|---:|---:|
| `polwo-hero-v1.glb` | 10,189,760 | 48,975 | 2 / 6 | 25,165,816 bytes (<24 MiB) |
| `polwo-rival-v1.glb` | 4,188,076 | 28,830 | 2 / 6 | 6,291,448 bytes (<6 MiB) |

Both contain 6 image payloads, 6 texture definitions, 8 opaque materials, 8 referenced meshes, and 5 intentional anchor-only nodes. All remain within existing 60k hero / 30k rival and 6-body/6-pilot/12-total draw limits. Estimates are not measured GPU allocations.

Hero SHA-256: `17e117cd9cbf86a2cf096ca6cdc0e46413b391395577b5f0774203ce7987f39f`.

Rival SHA-256: `b9a2f310ffd43477091575a52f1cb6804ec9fafca6fcf31093072b7f43e6d502`.

Input is `../polwo-inkstorm-shoulders-v2-native.glb`, with corrected UVs on the 132 new shoulder-cap triangles. Failed uncapped paint and shoulder V1 sources remain intact in their original locations.

`polwo-shoulders-v2-tangent-repaired.glb` is a separate baseline. It repairs 25 zero tangent XYZ vectors from adjacent valid UV triangles, preserves W, and changes only 203 BIN bytes. No arbitrary fallback basis was needed. Positions, normals, UVs, indices, image payloads, and existing nonzero tangents are exact. The subsequent hero packager changes only derivative images, names, texture-record deduplication, and explicitly supplied anchor nodes.

The rival has genuine reduced geometry. `rival-lod/01-topology-locked.glb` is a failed 36,079-triangle trial, preserved for history. `02-attribute-seams.glb` meets the budget at 28,830 triangles; `03-rival-reordered.glb` reorders those same triangles for vertex-cache locality. No new/interpolated vertex attributes are introduced. `lod-lineage-receipt.json` proves all 132 new cap triangles remain with exact UVs, normals, tangents, and winding; reorder retains the exact oriented triangle multiset. Hero bytes remain unchanged by LOD creation.

Both `hero-source-preflight.json` and `rival-source-preflight.json` pass. Both `*.khronos.json` reports have 0 errors and 0 warnings. Seven informational entries concern the untextured antenna's retained UV/tangent attributes and the five intentional empty attachment nodes.

Runtime names: `polwo-body-0`, `polwo-body-1`, and six `polwo-pilot-{accent,hardware,rubber,shell,suit,webbing}` mesh nodes. Required pilot prefix: `polwo-pilot-`. Pilot material names are `Pilot atlas v4c runtime <part>`. Body paint material is `Polwo Inkstorm body paint-v1`; antenna remains `antenne_low__0`.

Attachments came from `../attachments-study.json`. Their basis and `visuallyAccepted: false` are retained in the hero package receipt. Exhaust centers use source bounding measurements and still need actual opening/radius/orientation confirmation. These study anchors do not justify accepting hardcoded Teemto nozzle dimensions for this vehicle.

Texture derivative sizes: hero body color/normal/ORM and pilot color at 1024²; hero pilot normal/roughness at 512². Rival body color/normal/ORM and pilot color at 512²; rival pilot normal/roughness at 256². PNG output is lossless after the explicit resize; color filtering uses linear light, normal filtering renormalizes vectors, and ORM channels retain their meanings. Original painted 2048² source masters and imported 4096² maps remain untouched. Inspect the loss of fine wear/normal detail in actual views before acceptance.

Source attribution remains [Anakin's pod Star Wars](https://sketchfab.com/3d-models/anakins-pod-star-wars-5a3422df6f894b48b846d590cdc2bf4c) by [Nolan “Polwo” Zannato](https://sketchfab.com/polwo), with the stored official metadata's CC BY 4.0 attribution requirements. This is a named Inkstorm derivative with a project-authored driver, not a replacement for the original source credit.
