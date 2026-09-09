# Polwo final source review — implementation-aware

**Recommendation: REVISE. Retain the current source candidate and successful shoulder repair as the next working baseline; do not mark the strict target gate passed.** All three requested scores are below 8/10.

This reviewer knows the fit/shoulder implementation and previously analyzed its topology. This is explicitly **not a fresh or blind review**, and no previous critic scores were used. The assessment comes from direct inspection of concept 10 and the five final `polwo-inkstorm-shoulders-v2` PNGs listed below. It concerns a static offline source study, not FPS, actual race-camera readability, runtime loading, animated behavior, physical contact certification or in-world visual parity. Framing/lighting differ from the concept; the scores are visual judgments rather than pixel measurements.

## Scores and strict gate

| Category | Score | Image-grounded reason |
| --- | ---: | --- |
| Material / construction | **6.0 / 10** | The twin engines, tethers, restrained fittings, helmet, suit and harness form a coherent vehicle. The shoulder region now reads as continuous blue cloth. However, the cockpit closeups are dominated by broad mottled surfaces, hard angular shell transitions and a large, plain gray instrument/windshield shroud. Edge treatment and panel assembly are much less resolved than the target. |
| Fit / pose | **6.5 / 10** | The helmet is clearly visible in the rear closeup; the visible near glove contacts its grip, and the hands read as operating the controls. The body remains tall and upright, with a large exposed helmet/torso relative to the seat. The shell hides pelvis, lower back, knees and feet, so these final images cannot certify seat/pedal support or complete clearance. |
| Target palette / detail | **5.5 / 10** | Cobalt bodywork, orange engine blades/fittings, cream helmet and striped rear body provide a recognizable direction. The closeups still read predominantly dusty blue/gray with small orange marks, while the target has more deliberately distributed orange/blue panels, warm metal, specific wear at edges and clearer material separation. The full quarter views establish the silhouette but render the craft too small to substantiate target-level fine mechanical detail. |

**8+ strict gate: FAIL.** None of the categories reaches 8; the scores should not be averaged into a pass. The resolved shoulder topology/UV defect is a retained improvement, not evidence that the complete source meets the concept.

## Three actionable revisions

1. **Resolve and demonstrate the supported driving pose.** Keep visible hand-to-control contact and rear helmet readability, then inspect the unchanged final driver in a source cutaway showing pelvis, back, knees and feet together with the seat/controls. Adjust the seat support or driver pose where actual gaps/penetrations are established, and settle the unusually erect upper-body silhouette toward the concept's compact supported posture. Do not lower/raise the driver just to improve one screenshot. The current five views do not prove a floating pelvis, but they also do not prove contact; the distinction must remain explicit.
2. **Give the cockpit a clear assembly hierarchy.** Concentrate on the conspicuous gray shroud and the broad blue shell: define their rim thickness, trim or joint, consistent edge treatment, and a small set of functional seams/fasteners. Preserve the primary silhouette while replacing the impression of large faceted plates meeting abruptly. The front and side closeups, rather than the distant full-vehicle images, should demonstrate this improvement.
3. **Rebalance palette and wear by material and component.** Extend purposeful orange/blue panel assignments beyond the engine tips and small cockpit marks, separate painted metal from bare hardware/visor/cloth, and reduce the uniform mottled noise that flattens the cockpit panels. Follow the concept's readable construction and localized chips/scuffs without reproducing every illustrated scratch. Recheck the same closeups and a closer engine inspection; brighter lighting alone is not this material revision.

## Retained evidence and limitations

The two full quarter images retain the recognizable paired-engine, long-tether, rear-cockpit composition. The cockpit rear image exposes a readable helmet and arm above/beside the central rear structure. The front and side images show a driver within the cockpit silhouette, identifiable harness and gloves, and no obvious ivory/brown patchwork on the repaired shoulders. No gross helmet penetration into the visible shell/shroud is apparent in these views.

The final shoulder closure and source preservation are documented separately in `POLWO_V3_MESH_TOPOLOGY_ROUND32.md` from execution/export receipts; they are not inferred from image darkness. Boots and most lower-body contacts cannot be judged through the exterior in these five images. Actual chase speed, gameplay camera composition, material behavior under runtime lighting, package budgets and performance need their own evidence. This report changed documentation only and performed no Blender/browser/runtime/source-art edits.

Input image SHA-256 values at review:

```text
ff6884640507cfe0a336ffcc93495259f89e1d86f23dc5a366bae4b039ade708  docs/inkstorm-overhaul/concepts/10-polwo-vehicle-round32.png
4cc9eac7a91b92b90d00126725cc65371a4eca88708eaf5ef5b850dc0f89508f  assets/source/inkstorm/polwo-driver-round32/polwo-inkstorm-shoulders-v2-quarter-a.png
b5176e3e1619c2e114088c9f88262446eb53d293a323113e697eb560b769e1df  assets/source/inkstorm/polwo-driver-round32/polwo-inkstorm-shoulders-v2-quarter-b.png
97ab843574c74fadffd3f318d8d50baa5d6b6cbd7682fe01d6f9b6d210806799  assets/source/inkstorm/polwo-driver-round32/polwo-inkstorm-shoulders-v2-cockpit-side.png
28e531b9ff5a58968dbc9e4110e59c16e321c97f11b0e026f7d0a2248cde7d35  assets/source/inkstorm/polwo-driver-round32/polwo-inkstorm-shoulders-v2-cockpit-rear.png
d4b3c318319c98342a5a250a8890bb9c5a49d0378b437d845a53f02448d23288  assets/source/inkstorm/polwo-driver-round32/polwo-inkstorm-shoulders-v2-cockpit-front.png
```
