# Ivory and colour Blockrunner originals — measured reuse boundaries

2026-09-08. Read-only external comparison of the two preserved original GLBs. No Blender, rendering, acquisition, source edit or runtime registration was performed. They share most authored surfaces and the entire pilot, but **their topology, transforms and normals are not identical**. The ivory original needs its own source guard and lineage; it must not be replaced by the colour derivative.

| Original | Colour | Ivory |
| --- | --- | --- |
| UID | `a6f14ae799ab40d7ac425f043f824ff8` | `e42fb924b344481ea013c58cb0f52ad7` |
| Bytes | 2,667,212 | 2,868,492 |
| Nodes / mesh occurrences / materials | 268 / 59 / 20 | 55 / 51 / 51 |
| Actual triangles | 48,384 | 48,384 |
| Mesh occurrences with negative determinant | 9 | 0 |
| Image textures | 0 | 0 |
| Primitives with exported `TEXCOORD_0` | 52 of 59 | 51 of 51 |

Exact preserved source paths are recorded in [the numeric comparison](original-variant-comparison.json). Their mesh occurrence names have no exact intersection. No raw POSITION, NORMAL or index accessor array hashes match across the two primitive sets; one UV-array hash matches. Thus raw vertex IDs, polygon IDs, names, slot IDs, hierarchies, normal buffers and earlier source signatures cannot be reused directly. The presence of source UV accessors does not establish usable paint atlases.

To compare actual placed surfaces, the external analysis evaluates every node hierarchy and inverse-transpose normal transform, accounts for effective winding on the colour source's nine mirrored occurrences, and changes only the placement of ivory analysis arrays by translation (0.0244834954, −22.5576396474, −0.0000004419). There is no rotation, scale fitting, ICP or edit to either source. A one-to-one triangle/corner search at a stated 30 μm source-space tolerance finds **46,641 corresponding triangles (96.40%)**, with maximum position difference 16.845 μm. No matched triangle requires reversing effective winding. This is tolerance-based correspondence, not exact geometric equality.

The remaining differences are localized:

- The two **828-triangle crossbeam halves** (`pasted__L2x6_phongE2_0` and its pasted counterpart) are genuinely placed differently. After the whole-craft translation above, bringing the ivory halves onto their colour counterparts needs additional X translations **+0.527285645** and **−0.540431999** source meters. Their respective shapes then have complete unique triangle matches with maximum corner differences 3.43 and 3.30 μm. Preserve the ivory positions; copying the colour crossbeam placement would change that source's layout.
- **87 nondegenerate triangles use different triangulations**: 7 and 8 in the paired `LegoTri19` side surfaces, and 35 and 37 in the paired `pCylinder4` surfaces. They have the same vertex sets and boundary edges within 30 μm, but different triangle interiors. The side surfaces are planar within 6.22 μm. The cylinder patch groups are not collectively planar, so equal boundaries do not prove exact surface equivalence there. Do not transfer individual face masks or UV corners onto these triangles by index. Their detailed measurements are in [the unmatched refinement](original-variant-unmatched-refinement.json).

On the 46,641 matched triangles, the maximum world-normal difference is a chord of 0.001999999, approximately **0.11459°**; 24,824 matched triangles stay within a chord of 0.00001. These are measured differences between two original assets, not permission to apply the colour derivative's normal budget to ivory. Preserve each variant's own corner normals.

The **entire original pilot** has a one-to-one correspondence: colour object `pasted__LegoTri36_lambert1_0`, 8,256 triangles, maps into ivory object `pasted__L2x3slope2_lambert1_0`. Maximum position difference is 9.649 μm and maximum normal chord is 0.000638029 (about 0.03656°), with matching effective winding. This makes semantic role transfer feasible through an explicit face/corner mapping. It does not authorize reuse of the colour object's raw polygon numbers against ivory.

For the next bounded source trial, reuse the **algorithms and measured design choices**: exact opposed-face cleanup on a copy, original pilot semantic classification, two fitted controls/supports, 2-owner consolidation, palette/mask authoring, bake/finalize, ClampToEdge and guarded export. First create ivory-specific references and validate its own cleanup defects. Use the saved pilot correspondence to translate helmet/suit/visor/glove face roles, then validate complete/disjoint coverage against its source. Measure ivory control contact and preserve its original pilot and crossbeam transforms. Recompute lineage-based wear features on its copied topology; preserve the 87 alternate triangles and own normals. Any atlas/UV transfer needs explicit triangle-corner correspondence and separate treatment of those patches; a fresh copy-only UV/bake stage is the simpler initial route.

The saved [analysis mapping](original-variant-correspondence-analysis-copy.npz) maps original colour global triangle indices to original ivory indices and corner permutations; unmatched entries are −1. [The external comparator](compare-blockrunner-original-variants.py) records the exact global triangle ranges and both original SHA256 values. These are preparation evidence, not source authorship or gameplay readiness. Both saved official metadata records identify author `20001748` and CC BY 4.0; retain independent UID/license provenance for each variant.
