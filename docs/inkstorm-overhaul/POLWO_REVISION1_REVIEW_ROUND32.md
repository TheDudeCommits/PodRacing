# Polwo revision 1 — comparative runtime review

**Recommendation: retain the garage framing, chase-depth improvement and paint direction; correct the exposed tail assembly before acceptance. Strict visual target gate remains FAIL.** A wholesale revert would lose useful readability gains.

This is an independent, implementation-aware comparison, **not fresh or blind**. It compares the nine `round-32-polwo-revision1` images with the prior nine `round-32-polwo` captures and concept 10. No previous scores were used. Prior reviews are preserved. This task changed documentation only; no code, browser, GPU, Blender or test execution occurred.

## Retain / revert decisions

| Change | Decision | Comparative evidence and remaining issue |
| --- | --- | --- |
| Garage scale and side angle | **RETAIN** | The model now uses most of the preview width, and both complete engine bodies, long tethers and the cockpit are distinguishable. Previously the small rear-quarter cluster concealed this construction. Selection, inspection arrows, event list and Start Race remain legible without obvious overlap; the model stays inside its card. The cockpit is still small relative to the long engines, so this is a useful whole-vehicle view rather than a complete pilot inspection. |
| Elevated chase framing | **RETAIN, with local framing correction** | Salt-run, fork and live views now separate engines, tethers and cockpit in depth. The fork exposes more of the lower route and its marker sequence. More road is visible ahead of the vehicle, with no new route blockage by the model apparent. The cost is a more top-down presentation, a narrow engine footprint compared with the original concepts, and much less bottom margin around the cockpit. In the revised launch image, the tallest refinery stack is cropped by the top edge; it was contained in the prior launch image. Preserve the eye clearance while adjusting launch look direction/framing to recover that landmark. |
| Polwo paint/material direction | **RETAIN** | Cockpit blue/navy is more coherent and less pink/mauve in the matched salt/fork views. The larger garage view exposes orange blade surfaces, ribbing and component breaks. This moves toward concept 10. Engine barrels remain very dark and fine construction is weak at chase scale; orange is still concentrated at the tips and small marks rather than the target's larger painted panels. Lighting/framing also changed, so the images do not isolate shader tuning as the sole cause. |
| Current nozzle/tail appearance | **REJECT AS SHOWN; repair the assembly, not the revealing camera** | Both garage engines show pale thick collars/disks followed by stacked cyan/white cone pieces, placed aft of the original scalloped tail housings on conspicuous narrow stems. They read as external appendages or an exploded assembly, rather than recessed engine throats with exhaust emerging from them. Concept 10 shows integrated dark aft openings. The previous rear-facing view largely hid the axial spacing, so these images establish a newly exposed defect, not that revision 1 introduced it. |

## Concrete priorities

1. **P1 — Resolve the exposed nozzle depth and appearance on both engines.** In a side and rear-quarter inspection, compare the original housing opening with the runtime collar, core and exhaust anchors. Seat any intended metal rim at the actual housing and distinguish a recessed throat from an emitted flame. The current opaque pale/cyan segmented shapes do not read as either convincing hardware or luminous exhaust. These PNGs cannot determine which node or transform is responsible, and they do not prove literal disconnection in topology. Do not accept rear-axis centering alone as sufficient placement evidence.
2. **P2 — Recover launch skyline headroom without collapsing vehicle depth again.** The revised launch view cuts the tallest chimney; the prior view included it. The revised canyon cockpit also sits close to the bottom boundary, although it is not clipped in the supplied image. Tune look direction or section framing while retaining the newly legible engines and visible route. Avoid treating a globally higher camera as complete concept parity.
3. **P2 — Improve readable pilot and engine material separation.** The top-down view exposes more of the cockpit opening, but the helmet remains a small pale shape and the rear fin still divides/occludes the body. Hands, seat support and lower-body contacts remain unverified. Retain the blue correction; focus the next material pass on visible engine rims/ribs and purposeful orange panel areas, not additional fine mottling.

There is no observed new UI overlap, whole-vehicle garage clipping or gross pilot detachment. World visibility benefits from framing, especially at the fork and into the launch bowl, but the foundry mound and simpler environmental construction remain. Camera changes have not established world-art parity or successful route traversal.

## Evidence boundaries

Both saved capture receipts report `errors: []`, and all seven staged player records report Polwo active/ready. The seven numbered views in each set remain **time-zero staged chase captures**, separate from live driving. Prior live PNG: **0:07.18 / 483 KPH**; revision 1 live PNG: **0:07.16 / 486 KPH**. Their separately saved snapshots are at 7.266666666666818 and 7.366666666666823 seconds respectively. The live images are not identical simulation states or atomic matches to those snapshots. No FPS, full-race, contact stability, input usability or lifecycle acceptance is inferred here.

Prior bundle receipt: `cbb59d8fdfeb4eb660cc8072dec1b66f1fe267bd6184afc7883670bbda089c2a`. Revision 1 bundle receipt: `dea620746cbc9495686247bc93d794078b4ff0c7566573ed18997cb79229570c`.

## Input SHA-256

Paths are relative to `/Users/amir/Projects/PodRacing`.

```text
39e47de86f323bf6b9df930a58ce73447becfabee9c34e8d24d29db385e45210  output/gauntlet/round-32-polwo/garage.png
093dc1507a95b0f6311dd15f566c0998d44b91d0a0483faf82fe04a5e3224946  output/gauntlet/round-32-polwo/01-grid.png
dd2ea1d5372a71a74b4ff46b14b6a6800e790d1c3b48bdceaa0fcf17c3b4cef9  output/gauntlet/round-32-polwo/02-salt-run.png
157b2a71885d88f9a1e2344417b3549a5d9ffd362b945c9eaa9a656ed111c4f7  output/gauntlet/round-32-polwo/03-canyon.png
821d43859ccab43cd02525cb71a6af9c0999891f79fba69c192e6a255cd8b3ac  output/gauntlet/round-32-polwo/04-fork.png
402b684af9725b55388ad2415fd9a32239b5e7a8b3b146ca948cfd2ccdbc7eda  output/gauntlet/round-32-polwo/05-launch.png
dc5642af2646bb7bc52ea49d1d8c052ff88893bf319101b147a5b2181245a2d5  output/gauntlet/round-32-polwo/06-foundry.png
0bce86da671654c45b66b7b4ddd1cafb3e00405b9375cfc78196bd890d38719e  output/gauntlet/round-32-polwo/07-finish.png
34d69727ca442f2e6c62c3eb0530825d862528ef29c6f8555381c8d80a35dec0  output/gauntlet/round-32-polwo/live-drive.png
1bfdd8eb51801521bf8bd25134309366821a050f778d34bc7859bba8d64d8fba  output/gauntlet/round-32-polwo/receipts.json
2bd4566a478e22c9c86c87f0fa71483ac8bed7b52abe5e85aa8bdf83fce1eafe  output/gauntlet/round-32-polwo-revision1/garage.png
ccf71a9c583d1844e469ce108f8a582717a30cfa7205a7d5d2c6e48171c0d998  output/gauntlet/round-32-polwo-revision1/01-grid.png
227ed75db5e8381bcf2f1d9272aa581a665cf37b439c6361bfcf07c678df7988  output/gauntlet/round-32-polwo-revision1/02-salt-run.png
ab7353388f2fbb33d9ecd78c226da0284ab818108cbe044be9cb43bbed7d4c4f  output/gauntlet/round-32-polwo-revision1/03-canyon.png
fd74bfd40788b56d1fe59b19abf1a1a31ee860fa526808129eba1a8ab0a105e7  output/gauntlet/round-32-polwo-revision1/04-fork.png
c715e21c3a23c8c6803406085d6cdbc7de58d2f061d55c5f8a392e960ff02b51  output/gauntlet/round-32-polwo-revision1/05-launch.png
7211960b518c5040eaf8eb34b797449d0a104b852ba339316212ac6f11810a22  output/gauntlet/round-32-polwo-revision1/06-foundry.png
15543edb37d76e32d310c5f1f9fa95699576500890cf898ef2692e00db6beefc  output/gauntlet/round-32-polwo-revision1/07-finish.png
23c7f05beabc9b31b5e89b88ea5af784bf7078eb4f85001b83372f8423cdecc7  output/gauntlet/round-32-polwo-revision1/live-drive.png
3b2a7ebd7fc1ccaeb3f9811a127822972c6482d03c1efef78158286ef9562f6f  output/gauntlet/round-32-polwo-revision1/receipts.json
ff6884640507cfe0a336ffcc93495259f89e1d86f23dc5a366bae4b039ade708  docs/inkstorm-overhaul/concepts/10-polwo-vehicle-round32.png
```
