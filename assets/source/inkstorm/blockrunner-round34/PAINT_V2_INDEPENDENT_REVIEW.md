# Actual procedural paint V2: independent source review

2026-09-08. This reviewer individually opened the actual driver, front, fullcraft and rear V2 PNGs. Their names retain the generic renderer's `paint-v1-` prefix and identify the actual version in the `20260908-round34-paint-v2` token. Exact files and hashes are in `paint-v2-independent-review-inventory.json`. The original actual fit front PNG was also reopened to compare the dark central crossbeam section.

The actual author receipt is `mcp-safe/paint-author-v2-receipt.json`: two meshes, 39,900 body triangles and 4,128 pilot triangles. It records 7,172 mirrored triangle winding corrections, effective surface/corner-order checks, source/fit preservation, and retention of 143 prior scenes while creating scene 144. The copied body's maximum recorded normal encoding error is 0.071737793 degrees; the pilot's is 0.03010048 degrees. These are derivative encoding measurements. They do not authorize changing original normal directions.

| Actual view | Observed result |
| --- | --- |
| Driver | Ivory helmet, dark amber/brown visor, graphite suit and warm gloves are visibly separated. The fitted hands remain around the grips, and the thin side supports remain below the arms. No recurrence of the former striped leg/helmet artifacts is visible. |
| Front | Oxblood engine cowls, graphite frame and ivory cockpit are distinct. Both intake fans, the physical crossbeam and the large central opening remain legible. The nearly black rectangular crossbeam section is also present in the actual fit baseline, so it is not new evidence of a V2 flattening regression. |
| Fullcraft | The source silhouette and original seated pilot remain recognizable. The color families read clearly at whole-vehicle scale. Wear is restrained; this reads as a controlled palette trial rather than the stronger worn-paint treatment in concept 12. |
| Rear | The actual source exhaust openings and engine shells remain legible, with the pilot back, rear body and graphite shields visible. No concept-generated rear structure or enlarged nozzle is inferred or introduced by this review. |

This evidence supports the next matched atlas comparison. It does not accept final Inkstorm styling, hidden geometry, normalized anchors, exported glTF appearance, rival detail or runtime performance. No Blender or browser was executed by this reviewer.
