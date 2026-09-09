# Retained-normal correction

The first authoring run failed at `Retained normal drift` with maximum component delta **0.00011573731899261475**, against the original **3e−5** guard. The failed author payload remains byte-exact in `failed-normal-reencode-v1/author-service-gantry-mcp-safe.py`, SHA256 `8ae49a85e052ec86bcb76aca5e57c3f88515bbf6fdc7d8100537b70366b11da0`. Root verified that the failed stage was removed and the original Cruise scene,17 objects,15 selected objects and active object were restored; see `v1/mcp-failed-authoring-cleanup.json`.

The failure alone establishes a normal readback difference. It is not evidence that retained positions, colors or winding changed.

Root then executed the disposable storage probe in **Blender5.2.0 LTS**, using an unchanged copy of the imported predecessor. Actual results are preserved in `v1/mcp-normal-storage-probe-safe-loop.json`:

| Operation on the identical mesh copy | Storage | Changed corners | Corners exceeding3e−5 | Maximum component delta |
| --- | --- | ---: | ---: | ---: |
| Set the readback vectors through `normals_split_custom_set` | `INT16_2D`, corner domain | 1,865 | 1,842 | 0.00011573731899261475 |
| Write the same vectors into `custom_normal` directly | `FLOAT_VECTOR`, corner domain | 0 | 0 | 0 |

The actual probe reports exact copied geometry, untouched source normals, exact pre-existing scene/collection memberships and restored shared context. It performed no export or render. The first probe was rejected for a dunder method, and its lambda rewrite was also rejected; both rejected sources/receipts are preserved. The final accepted probe uses an explicit loop.

This result matches Blender's [custom-normal implementation](https://raw.githubusercontent.com/blender/blender/main/source/blender/blenkernel/intern/mesh_normals.cc): the normal setter normalizes its input and stores corner-space factors in signed16-bit pairs, including rounding and a near-automatic-normal shortcut. The corner-normal cache also supports direct float vectors. The unchanged-mesh probe reproduced the exact authoring failure magnitude, isolating the setter round trip from removal/addition topology.

The corrected author payload retains the **same3e−5 guard** and writes a `FLOAT_VECTOR`/`CORNER` attribute named `custom_normal`. Retained corners receive their original imported vectors. New corners receive their actual computed mesh normals before the float attribute is installed. Zero vectors are not used as an automatic-normal sentinel in float storage.

The export helper now checks both the successful authoring marker and this exact normal storage type/domain. Geometry, colors, material assignment, support footprints, clearances and 6,500 triangles are unchanged by this correction.

The incoming glTF already passed through Blender's importer, whose probe storage was `INT16_2D`. Therefore exact DCC readback preservation does **not** by itself prove byte-for-byte equality with the predecessor's original glTF `NORMAL` accessor. Inspect the actual native export before deciding whether a post-export restoration is needed. The optional local checker must match whole oriented triangles and corner seams, not welded positions: the retained source has many coincident positions with distinct normal/color records. If the native attributes already match, do not rewrite them.

No tolerance was raised. Neither a render nor a normal guard substitutes for the later actual-world/critic acceptance.


## Executed export and exact-source restoration

Root's corrected authoring run passed with zero retained imported-normal delta; its native export and three neutral renders completed with context/membership checks passing. The source check then found that the original GLB's normal and color records had already changed through the DCC round trip: positions and oriented triangles remained exact, but 580 retained normal corners and all 11,820 retained color corners differed. The respective maximum component deltas were `0.00029999471735209227` and `0.003992617130279541`. This observation does not invalidate the zero-delta float-storage probe, which compared against the imported Blender vectors rather than the original GLB buffer.

After that evidence, root authorized the bounded source-only packer. `v1/foundry-service-gantry-v1.glb` now contains the original 7,336 retained position/normal/RGB records byte-exact, with distinct normal/color seams and oriented triangles preserved, followed by the unchanged 2,560 native addition triangles. The native GLB and technical renders remain preserved. The packer did not renormalize or approximate the original retained vectors.

The final derivative is 438,108 bytes, SHA256 `2acef39a4d9d81950b3421aac20dd1cb02f9c7a89ca951eed387417039eb65d7`. It passed a fresh retained-oriented/byte check and Khronos validation with zero issues. All normals are finite/nonzero, with maximum length error `1.1097592311770654e-7`. Exact bounds, clearance and material JSON are documented in `v1/exact-retained-technical-check.json`; the original/native attribute difference and direct repair proof remain in the adjacent native/packaging receipts. No tolerance was raised and no Blender call was made for packaging.


The installed Blender5.2 importer directly establishes the color-loss mechanism: `/Applications/Blender.app/Contents/Resources/5.2/scripts/addons_core/io_scene_gltf2/blender/imp/mesh.py:459` creates `BYTE_COLOR`, and line461 writes the incoming linear float colors into it. A read-only native/source analysis found all 35,460 retained RGB channels on the sRGB8-to-linear lattice within `2.79e-7`, while the native additions retain the six exact authored float32 palette colors. The restoration therefore corrects source color loss introduced before the author script's `FLOAT_COLOR` copy. No further precision changes are needed after the actual packaged derivative's clean validation.
