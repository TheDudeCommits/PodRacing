# Blockrunner cleanup V1: actual neutral comparison

2026-09-08. Root executed stages 04 and 05; this reviewer inspected all four resulting PNGs individually and directly compared original/cleaned driver images. The numerical preparation status in earlier notes is superseded by these actual receipts.

The isolated cleanup scene contains **59 meshes and 43,556 triangles** after removing the measured 4,828 exact opposing duplicates. The stage-04 receipt confirms that all 140 earlier scenes, source geometry/material structure, source corner normals and active context were preserved. It retains one new study scene, for 141 total. Each stage-05 receipt confirms source/cleanup preservation, removal of its temporary scene, restored context and all 141 earlier scenes unchanged.

| Actual inspected view | Observation |
| --- | --- |
| `cleanup-v1-driver-20260908-round34-compare-v1.png` | Pronounced zebra stripes at the legs/base and helmet/arm triangle artifacts seen in the original are gone. Hollow hand grips, helmet stud opening, visor silhouette and leg recesses remain. Hands are still detached from the two original control rods. |
| `cleanup-v1-rear-20260908-round34-compare-v1.png` | The visible true rear engine throat remains open. Cockpit rear wedges, sidewalls and the minifigure remain intact; the opposite throat is partly obscured at this camera. |
| `cleanup-v1-front-20260908-round34-compare-v1.png` | Both radial front fans and the physical crossbeam remain intact, with the minifigure retained in the open cockpit. |
| `cleanup-v1-fullcraft-20260908-round34-compare-v1.png` | Overall paired-engine, long-arm and rear cockpit silhouette remains intact. The driver's cleaned surfaces remain readable in the full craft. |

Image hashes and actual receipt paths are recorded in `cleanup-v1-independent-review-evidence.json`. All four use the actual original neutral camera and source-bound lighting. This supports keeping the narrow duplicate-removal cleanup as the basis for the next isolated fit trial. It does not establish gameplay readiness, palette styling acceptance, complete hidden-surface correctness or every normal direction.

No broader normal recalculation is indicated by these four views. Keep all original normals and intended openings at this stage; preserve the original imported source and the isolated cleanup scene. The next issue is mechanical hand/control contact. The roughly 9 mm positive support gaps at three seat/floor samples do not justify moving or deforming the pilot.
