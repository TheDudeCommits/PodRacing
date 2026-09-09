# Teemto race-camera pilot visibility — bounded source diagnosis

No runtime, camera or asset changed. The actual FrontSide body-material contract confirms the prior conservative body-occlusion finding: all199 sampled driver vertices are hidden behind the licensed cockpit body from the current chase eye. Raising that eye to12m or16m still hides199/199. A3m sideways offset exposes only2samples. These are sparse source-geometry rays, not visible-pixel counts, all-pose coverage, a proposed camera or frame-rate proof.

The actual round28 side/front-quarter/rear-quarter diagnostic captures show the driver seated behind the existing opaque cockpit roof/frame. Changing camera distance or improving suit material cannot expose that same driver through the opaque roof in centered chase. The source geometry and pilot anchors have been left intact. A different open-cockpit roster model, an explicitly authored separate canopy variant, or a different inspection view is a separate art decision; no clipped or transparent canopy is being passed off as the preserved model.

`study.mjs` reads the exact public TeemtoV4C GLB; `receipt.json` records material sides, eyes and first blocking mesh counts. This source-only diagnosis supports prioritizing the current world/bake work while preserving vehicle identity. It does not relax the detailed-pilot art gate or establish cockpit-camera playability.
