# Canyon arch v2 staging

This is an isolated original environment candidate. Runtime and public assets are unchanged. No target parity or in-world acceptance follows from a Blender render.

The authored source is `scripts/blender/build-canyon-arch-v2.py`, executed through Blender MCP. Its output is confined to `assets/source/inkstorm/canyon-arch-v2/` and `output/arch-v2/`. No `.blend` file is saved. The source script preserves the exact prior Blender scene, view layer, active object, and selected object set in ordinary local variables with `try/finally`; it does not use `driver_namespace`.

The visual target was directly inspected at `docs/inkstorm-overhaul/concepts/03-canyon.png`, followed by round 25's `03-canyon`, `canyon-arch-approach`, `canyon-arch-under`, and `canyon-arch-beyond` actual images. The staging work uses only original geometry; it does not import source image pixels, third-party models, or textures.

The new form has unequal abutments, a broad left shoulder, a descending diagonal crown, three major recessed faults, tilted sediment ledges, and a continuous inner opening. It is a closed connected surface with substantial front/back depth. Large facet and fault breaks use hard normals, while weathered broad faces interpolate normals. Vertex values carry broad sandstone variation without baked directional lighting. Their linear luminance centers near the actual runtime shader's 0.19 normalization, preserving cavity variation inside its 0.38–1.45 clamp. There are no loose cubes, talus in the opening, interior cap faces, or animated displacement.

The proposed upper crest is intentionally lowered from the original 99.79 m to about 87 m, with the diagonal bridge falling toward 70 m on its right. The opening apex is about 54 m. This gives the outer span a better chance of remaining visible from a downward-aimed chase camera at the approximately 150 m approach distance identified in the form proposal. This is an authored composition hypothesis awaiting in-world verification, not a camera change or a claimed cure for the surrounding canyon's occlusion.

The maximum compatible envelope remains glTF X [-83.76,86.93], Y [0,99.79], Z [-16.79,16.78]. Blender source coordinates are X across, Z up, Y through depth; the exporter produces glTF (X,Z,-Y). The full canonical lower box X [-44,44], Y [0,24] across the entire depth remains reserved, with toes outside abs(X) >= 49. The asset validator tests every exported triangle against that protected box with separating axes, and checks topology, unit normals, colors, materials, bounds, triangle count, and the original public asset hash.

Reproduction stages, after shared GPU release:

1. Create the two output directories with ordinary filesystem tools. Send the literal source text to Blender MCP with its final `dispatch('build')` line. The safe endpoint accepts the bpy/bmesh/math/json source; it forbids an `exec(open(...))` wrapper, so no such wrapper is used.
2. Send the literal source text again with its final dispatch argument changed to `export`, then `front`, `quarter`, and `underside` one call at a time. Persist the printed geometry/context receipt with ordinary filesystem tools outside Blender.
3. Run `node assets/source/inkstorm/canyon-arch-v2/process-validate.mjs` using the existing `/tmp/inkstorm-rock-lod-tools` tool installation.
4. Inspect `output/arch-v2/front.png`, `quarter.png`, and `underside.png`, then inspect the processed candidate before any public integration.

The original `public/assets/inkstorm/canyon-arch.glb` must retain SHA-256 `36876e340a578993c9c3d01084029d1ca0b757ef140ae482bbd1e0e1ff6b0453`. Final placement acceptance still requires the actual curved road/vehicle sweep at both arch instances and each enabled course seed. The asset's reserved box alone does not establish that acceptance. Whole-race performance and source concept comparison remain runtime gates.

The first completed asset validation recorded **23,008 triangles**, one mesh/primitive/material, 20,191 exported vertices including normal splits, and **866,036 bytes**. The connected surface has zero boundary, nonmanifold, inconsistent-winding, or degenerate elements. All normals are unit length within 0.000001. Khronos validation reported zero errors, warnings, infos, or hints. The protected lower box has zero intersecting triangles; the closest toe is 53 m from the centerline. Actual glTF bounds are X [-82.309578,85], Y [0,88.262428], Z [-14.731627,16.103575].

Processed GLB SHA-256: `8c36d25b507eabb17f4c1e05677bdd9db4469f57589e5ef0a284b56f958046ff`. The corresponding asset and source receipts reside beside it. Blender's original Cruise scene, ViewLayer, Sketchfab_model.001 active object, 15 selected objects, and 17-object count were restored exactly after build/export.

The three actual 1500×1000 Blender Eevee renders are complete and were directly viewed at `output/arch-v2/front.png`, `quarter.png`, and `underside.png`. Their camera and exact preserved-context receipts are in `render-receipt.json`. The front and quarter show a legible lower horseshoe silhouette and thick span; the underside exposes its continuous soffit. The even rhythm of sediment seams and angular tessellation teeth along several narrow ledges remain visible, so these renders do not establish concept parity. The underside view intentionally crops part of the outer feet to prioritize the soffit.

Status: isolated geometry/source, processed GLB, validation receipt, and three actual Blender inspection renders delivered for root review. Public/runtime integration remains unperformed.

## V2b revision after root review

Root rejected the v2 periodic sawtooth beds as manufactured corrugation. That version's GLBs, receipts, renders, source snapshot (`assets/source/inkstorm/canyon-arch-v2/build-canyon-arch-v2.py`), and Blender scene remain preserved.

The active `scripts/blender/build-canyon-arch-v2.py` now builds the separate **v2b** scene and writes only to `assets/source/inkstorm/canyon-arch-v2/v2b/` and `output/arch-v2/v2b/`. A matching source snapshot sits in that candidate folder. Five explicitly positioned ledges replace the periodic/modulo bed function: unequal lower-left, left-shoulder, cap, right-shoulder, and lower-right remnants. Every ledge has its own lateral endpoints and fade length. Wide smooth transitions replace narrow ridges; all high-frequency displacement is removed. The three faults are wider. Broad front/back surfaces interpolate normals to avoid alternate triangle splits, while 738 perimeter and soffit hard edges preserve the large changes in surface direction.

Final v2b export: **23,008 triangles, 12,249 exported vertices, 580,128 bytes**, one connected mesh/primitive/material, no textures. Bounds are X [-82.341614,85], Y [0,87.208572], Z [-16.156435,15.658038]. The original envelope and protected lower opening remain intact. Full-depth protected-box SAT intersections, degenerate triangles, boundary/nonmanifold edges, and inconsistent windings are all zero. Khronos validation has zero errors, warnings, infos, and hints. Minimum toe abs(X) is 53 m.

Final processed GLB SHA-256: `708782e0e81e89133ea9436195b377e4518749de85e0403b5455b8644d85d308`. Raw Blender GLB SHA-256: `97be10c0809be3e06620eb7e1dc13de306424f47a20ad1f4ce9a2a618d4c7424`.

Actual final Blender Eevee `front.png`, `quarter.png`, and `underside.png` under `output/arch-v2/v2b/` were directly viewed. The periodic grooves are gone, and the lower diagonal horseshoe plus full depth remain legible. The broad faces look soft in the neutral clay render; slight triangulation waviness remains in the left fault. Judging the new broad geometry with the actual runtime stone material is still necessary. No concept parity or in-world acceptance is claimed. Exact Cruise scene/layer/active/selection state was restored after every successful Blender operation.

Status: v2b isolated candidate delivered for root review. **Neither v2 nor v2b has been integrated into public/runtime by this asset task.** Run the v2b `process-validate.mjs` from its nested candidate directory when reproducing validation.
