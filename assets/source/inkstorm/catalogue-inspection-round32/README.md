# Catalogue source inspection — round 32

This folder preserves **48 source PNGs and 24 render receipts**, two oblique views for each of the 24 newly acquired candidates. They show original imported geometry and materials with isolated inspection lighting. They are not stylized derivatives, game screenshots, driver-fit acceptance or performance evidence.

The root task reviewed **all 24 `quarter-a` views and Polwo's `quarter-b` view**: **25 images reviewed, 23 additional `quarter-b` images captured but not claimed as viewed**. The inventory author recomputed every PNG/receipt SHA256 and read actual source GLB JSON/accessor headers without decoding binary meshes or textures. [inventory.json](inventory.json) records dimensions, camera/source frame, cleanup, file hashes and header counts. [inspection-notes.json](inspection-notes.json) preserves model-specific root observations and confidence separately.

## Confirmed driver observations and limits

- Both `20001748` variants contain **existing minifigure drivers** in the saved `quarter-a` images. These were not added by this project, and their fit/style/runtime compatibility is unaccepted.
- Polwo's original cockpit is **confirmed empty**, based on both saved views. Original Inkstorm pilot fitting is separate source work under [polwo-driver-round32](../polwo-driver-round32/): V1/V2 are preserved, and V3 files also exist. All remain source fit candidates with acceptance pending in this inventory; no third runtime integration or accepted added-driver count is claimed.
- Empty-looking chairs, closed shells, glass/alpha defects and unclear seating in the other **21** candidates are **probable, occluded or unverified observations**, not confirmed driver inspections. A visible seat does not establish every hidden mesh or a usable driving posture.

Teemto and Sebulba's two earlier confirmed source-occupancy inspections remain unchanged. Thus the manifest now records **26 source visual inspections (2 earlier + 24 new)** and **5 driver inspections (2 earlier + Polwo + 2 toys)**. Counts remain **2 original drivers added to the existing runtime families, 2 runtime integrations and 2 stylized-export families**; all acquisition, variant/file, archive, license and other counters remain unchanged. Source fit pilots do not increment accepted export/runtime counters.

## Per-candidate source observations

The construction and probable occupancy notes below are the root task's direct source-image observations. They are not blind criticism or runtime recommendations. Exact UIDs, source SHA identities and license metadata remain in the JSON inventory and notes.

| Search # / candidate | Reviewed images | Source occupancy scope | Construction observation |
| --- | --- | --- | --- |
| 3 — BEN QUADINAROS PODRACER<br><code>c2ca24c9b3c2416db0abe026d9f4b7ac</code> | [A only](c2ca24c9b3c2416db0abe026d9f4b7ac-quarter-a.png) | probable empty | Four red engines, blue chair visibly empty. |
| 4 — Podracer<br><code>25d51fbd4efc4c888ca4ff2549b1c6ae</code> | [A only](25d51fbd4efc4c888ca4ff2549b1c6ae-quarter-a.png) | occluded unverified | Low-poly textured craft with a closed cockpit. |
| 5 — Star Wars Galaxies - Anakin's Podracer<br><code>e377c2e49ad447caa0517b87562b3acc</code> | [A only](e377c2e49ad447caa0517b87562b3acc-quarter-a.png) | probable empty | Low-poly textured craft; open cockpit looks empty. |
| 6 — Anakin Podracer<br><code>dd948b66950147b78ace05dfcb9ccbbb</code> | [A only](dd948b66950147b78ace05dfcb9ccbbb-quarter-a.png) | probable empty | Red seat visibly empty in the source view. |
| 7 — Ye Old Podracer<br><code>4022e489f3d74eebb0aa3305f38dcc3f</code> | [A only](4022e489f3d74eebb0aa3305f38dcc3f-quarter-a.png) | probable empty | Green steampunk construction, wood-like fins and a visible red seat. |
| 8 — Old Worn Out Spaceship<br><code>fee6dfa2369149aa84e7f99d9bb35cb0</code> | [A only](fee6dfa2369149aa84e7f99d9bb35cb0-quarter-a.png) | occluded unverified | Orange industrial craft with three engines; glass canopy obscures the driver region and a panel shows an alpha-grid defect. |
| 9 — Star Wars Galaxies - XJ-6 Airspeeder<br><code>7766ca8e7bd047f5ad4bdb86d11ec6d4</code> | [A only](7766ca8e7bd047f5ad4bdb86d11ec6d4-quarter-a.png) | probable empty | Yellow convertible with a two-seat empty-looking cavity. |
| 10 — Anakins Pod Racer<br><code>dac6d14dcf914e88af8625b59f4020bc</code> | [A only](dac6d14dcf914e88af8625b59f4020bc-quarter-a.png) | probable empty | Chrome/yellow craft with a visibly empty red seat. |
| 11 — World Skills Pod Transporter<br><code>39f96d4fcf00432dba3beb2e42163aa6</code> | [A only](39f96d4fcf00432dba3beb2e42163aa6-quarter-a.png) | unverified | Yellow two-engine cargo/net/box craft; tiny seat is unclear. |
| 12 — Anakin's pod Star Wars<br><code>5a3422df6f894b48b846d590cdc2bf4c</code> | [A](5a3422df6f894b48b846d590cdc2bf4c-quarter-a.png) + [B](5a3422df6f894b48b846d590cdc2bf4c-quarter-b.png) | absent confirmed | Detailed ring engines and prongs; original cockpit confirmed empty from quarter-a and quarter-b. |
| 13 — podracer<br><code>ce9c2d4e92a44dffbd78e6b29d6c0182</code> | [A only](ce9c2d4e92a44dffbd78e6b29d6c0182-quarter-a.png) | unverified | White three-prong wedge without a constructed cockpit in the reviewed source view. |
| 14 — Pod Racer - Star Wars Inspired Build<br><code>309c3c42bac24b5c801fcc09f875e6a7</code> | [A only](309c3c42bac24b5c801fcc09f875e6a7-quarter-a.png) | unverified | Untextured industrial cargo/chair construction; high triangle count. |
| 15 — Star Wars Pod Racer<br><code>6ea36ebb4e504fb8976d2b527b5e40dc</code> | [A only](6ea36ebb4e504fb8976d2b527b5e40dc-quarter-a.png) | unverified | Untextured retro-jet/bowl construction; high triangle count. |
| 17 — Podracer stl file<br><code>19a50e866e5d44cb8e4840b616cc8132</code> | [A only](19a50e866e5d44cb8e4840b616cc8132-quarter-a.png) | unverified | White three-prong wedge without a constructed cockpit; this listing is vertically oriented. |
| 18 — Podracer obj file<br><code>ff12ef200c994c8b9c6b61ea45702454</code> | [A only](ff12ef200c994c8b9c6b61ea45702454-quarter-a.png) | unverified | White three-prong wedge without a constructed cockpit in the reviewed source view. |
| 19 — Yet Another Pod Racer<br><code>e10eb39da3cf48018ba79c341a867d45</code> | [A only](e10eb39da3cf48018ba79c341a867d45-quarter-a.png) | unverified | Untextured fin/ring engines with long pipes; cockpit is unclear. |
| 21 — Star Wars - Ark Bumpy Rooses Pod Racer<br><code>41071debeaf1499a9a1586b78ea18a09</code> | [A only](41071debeaf1499a9a1586b78ea18a09-quarter-a.png) | unverified | Multiple craft copies or LOD-like groups and black planes are visible. |
| 22 — Pod Racer Colour<br><code>a6f14ae799ab40d7ac425f043f824ff8</code> | [A only](a6f14ae799ab40d7ac425f043f824ff8-quarter-a.png) | present minifigure confirmed | Toy brick craft with an existing minifigure driver visibly present. |
| 23 — Pod Racer<br><code>e42fb924b344481ea013c58cb0f52ad7</code> | [A only](e42fb924b344481ea013c58cb0f52ad7-quarter-a.png) | present minifigure confirmed | Uncoloured toy brick craft with an existing minifigure driver visibly present. |
| 25 — Spaceship(pod)<br><code>5a927a9fa0984371bd970b31f5f06086</code> | [A only](5a927a9fa0984371bd970b31f5f06086-quarter-a.png) | unverified | Dark angular craft with fan engines; cockpit is unclear. |
| 26 — Pog Racer<br><code>c0d192c145a44459a454627708e46cf5</code> | [A only](c0d192c145a44459a454627708e46cf5-quarter-a.png) | occluded unverified | Single-cylinder engine and a closed upper capsule with opaque orange glass-like material. |
| 27 — Advanced X1<br><code>9ecf7f66246d4f30b990cc605359e3b6</code> | [A only](9ecf7f66246d4f30b990cc605359e3b6-quarter-a.png) | occluded unverified | TIE-like vehicle with a closed cabin, not a conventional pod configuration. |
| 28 — Now This Is Podracing MWRB<br><code>eb1a1861d3f140fa958ca7eb70a9f380</code> | [A only](eb1a1861d3f140fa958ca7eb70a9f380-quarter-a.png) | probable empty | Blue/yellow toy pod with an open, empty-looking seat. |
| 29 — Now This Is Podracing MWRB<br><code>0baa936f45434c7eb8d58c31890402a2</code> | [A only](0baa936f45434c7eb8d58c31890402a2-quarter-a.png) | probable empty | Blue/yellow toy pod with an open, empty-looking seat. |

## Preservation and next work

Every successful render receipt records original active-context restoration, no pre-existing scene/collection membership changes and removal of its temporary review scene. This describes the inspection renders; it does not erase the separate Ben acquisition scene-membership anomaly. `initial-safe-mode-rejection.json` preserves the initial rejected source-render script. Nothing was rendered or retried during this inventory task.

The full pre-review manifest is [preserved separately](../vehicle-manifest-before-catalogue-inspection-round32.json). The update changes only the 24 `sourceVisualInspection` records and their histories, Polwo/two-toy driver records and their histories, the two inspection counters and an invalid performance-receipt path. The current path is repository-relative `output/gauntlet/round31-freeze/race-evidence-inventory.json`; the prior path remains in this inventory and full snapshot. All author/license/acquisition/429/model/export/runtime/checkpoint histories remain intact.

The NoDerivs Anakin remains restricted to private noncommercial adapted study; Ben's noncommercial condition, N64-texture statement and Star Wars Galaxies provenance labels remain attached. No source inspection removes these restrictions. Further work is dedicated seating/occupancy inspection where uncertain, source-preserving body/material cleanup, driver fitting where appropriate, optimization/LODs/anchors, runtime loading and actual visual/performance review. The last completed runtime checkpoint remains round 31; these 24 sources do not inherit its acceptance.
