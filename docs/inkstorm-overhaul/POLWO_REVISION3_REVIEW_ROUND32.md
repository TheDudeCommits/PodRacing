# Polwo revision 3 — comparative runtime review

**Retain revision 3 as the current candidate. The displaced exhaust stack and duplicate pale lip are visibly corrected; strict vehicle/world target parity remains FAIL.** The tallest launch chimney is still cropped, pilot presentation remains weak at chase scale, and the seven world targets remain materially ahead of the captured environment.

This is an independent, implementation-aware review, **not fresh or blind**. All nine revision 3 PNGs were directly compared with revision 1; concept 10 and all seven original world targets were directly inspected. The reviewer knows the exhaust repair intent. These are image judgments, not independent validation of the anchor calculation, seat contacts or motion. Prior reviews and captures are preserved. This task wrote this document only: no runtime/source edits, browser, Blender, build, test or GPU work.

## Retain / revise decisions

| Area | Decision | Visible evidence |
| --- | --- | --- |
| Garage exhaust cowl/lip | **RETAIN — specific revision 1 defect corrected** | Both displaced beige disks and the long cyan/white stacks on narrow stems are gone. The dark scalloped cowls now terminate in compact pointed tails with small cyan bands. Their silhouettes read as connected engine assemblies. Do not restore the extra pale lip or conceal the side view. This does not establish a convincing animated flame or the recessed open throat shown in concept 10. |
| Garage usefulness | **RETAIN** | Both complete engines, their tethers and cockpit remain large enough to distinguish construction. The vehicle stays inside the preview card; Frame choices, Inspect arrows, stats, event list and Start Race remain unobscured. The large engine-to-cockpit length still makes this a whole-vehicle view; hands and seat support cannot be inspected adequately here. No new visible UI overlap or crop compared with revision 1. |
| Chase depth and route visibility | **RETAIN** | Engines, tethers and cockpit remain separated in all seven staged views and the live still. Removing the added disks also removes conspicuous foreground circles that competed with the pilot. The model does not newly cover the forward lane or route markers. Its narrow central footprint and high viewpoint remain much less immediate than the broad engine/pilot composition in targets 01–07. |
| Pilot separation | **REVISE; unchanged limitation** | The pale helmet is identifiable, but the tall striped rear fin rises into its silhouette and obscures much of the torso. Dark shoulders/control areas merge into the cockpit, particularly in canyon/foundry. Garage exposes the helmet and upper body in profile, but not the compact, readable helmet–arms–controls arrangement of concept 10. There is no observed gross detached helmet. Hands, lower body, seat/back support and contact stability remain unverified. |
| Paint/material direction | **RETAIN direction; target gate FAIL** | Blue/cream cockpit stripes and orange engine blades remain coherent. Revision 3 shows no obvious new paint regression versus revision 1. Chase engines still read largely black, with thin orange marks, while concept 10 has substantial blue/orange panel areas, separated dark ribs and clearer metal edges. The cockpit's fine mottling is more prominent than readable panel construction. |
| Launch framing | **REVISE — partial improvement only** | The refinery has moved slightly down in the frame. The thinner adjacent chimney now has a visible top, but the tallest chimney still intersects the upper image boundary in `05-launch.png`. Vehicle depth and the descending road remain visible. This is an unresolved revision 1 finding, not a completed fix. |

## All nine captures and world comparison

| Capture | Revision 3 comparison and remaining target gap |
| --- | --- |
| `garage` | Exhaust assembly improvement is clear in the useful side view. Concept 10 still has stronger painted-panel hierarchy and a substantially more legible pilot/control arrangement. |
| `01-grid` | Corrected cowls; otherwise the retained chase/pilot presentation is essentially unchanged. Target 01's dense pit activity, layered canopies and authored surface construction remain absent or much simpler. |
| `02-salt-run` | Corrected tails leave an unobstructed straight and checkpoint frame. Target 02's long, layered road vista and richer rock silhouettes remain a major gap; the capture ends in a comparatively short, simple crest. |
| `03-canyon` | Route markers and arch opening remain visible; the cockpit is close to the bottom edge but not clipped. Target 03 has a readable road continuing through the arch, layered horizontal rock construction and a stronger lit exit. The captured mound/bend conceals most of that depth. |
| `04-fork` | Both routes and their marker sequences remain distinguishable, with unchanged engine/cockpit depth. The broad rising ramp remains visually dominant over the lower route; target 04 integrates both choices into a more convincing shared rock formation and roadway. This single staged view does not establish advance-choice readability at speed. |
| `05-launch` | Slight framing improvement; highest chimney still clipped. The descending road and bowl are visible, but target 05's distant, layered basin and distributed industrial skyline are not matched. |
| `06-foundry` | Vehicle correction is retained. The start-light gantry repeats here; large plain vessels/pipes frame a short apparent road view near the central mound. The PNG cannot identify the primary occluder. Target 06 has a deep sequence of overhead crossings and much stronger vessel, flange and gallery construction. No meaningful world-parity advance is visible from this vehicle revision. |
| `07-finish` | Tail correction is visible; the bend, signs and outer barrier remain readable. Target 07's banked road, segmented worn barrier and finish approach have substantially stronger construction and depth. |
| `live-drive` | At the shown moment, engine/cockpit separation and the forward lane remain clear; no new gross exhaust offset is visible. This is one live-drive still, not a motion or handling evaluation. |

## Prioritized follow-up

1. **P2 — Finish launch landmark framing.** Give the tallest chimney actual top margin while retaining the visible downhill lane and separated vehicle. Compare the same launch progress and verify the whole skyline, not only the thinner adjacent stack. Avoid compensating by hiding the vehicle or moving terrain for a camera defect.
2. **P2 — Make pilot and vehicle construction readable at the retained chase scale.** Improve helmet/shoulder/control contrast around the fin and add a useful cockpit inspection view. Retain the blue direction; concentrate orange/blue paint into purposeful visible panels and distinguish engine ribs/edges from those panels. Do not infer support/contact correctness from the visible helmet or change the pose without checking the actual geometry.
3. **P2 — Treat world parity as separate unfinished work, led by the foundry corridor.** Replace the industrial start-light repetition with functional industrial equipment, strengthen vessel/pipe joints and galleries, and resolve the short apparent forward view. Measure scenery/terrain first-hit occluders before choosing a depth fix; these stills do not establish terrain as its primary cause. Scenery/camera changes are presentation work; changes to physical terrain/road height or layout require the appropriate course/record edition treatment.

No new concrete visual regression beyond the carried limitations was found relative to revision 1. That finding supports retaining the repair; it does not turn the strict target gate into a pass.

## Evidence boundaries and build

Both receipts report `errors: []`; all seven staged player records report Polwo active/ready. The seven numbered views are **time-zero staged chase captures at simulation frame 2400**, not race traversal. Both live PNG clocks display **0:07.16**, but revision 1 reads **486 KPH** and revision 3 **485 KPH**. The separately saved live snapshots are at 7.366666666666823 and 7.266666666666818 seconds respectively; neither is an atomic PNG/state match. The live images are not identical simulation states. No FPS, full-race, input, lifecycle, seating-contact or motion acceptance is inferred from these images or the capture receipt's short timing section.

Revision 3 receipt identifies `index-1xbykiGm.js`; the existing `dist/assets/index-1xbykiGm.js` was read and its SHA-256 independently matched **f09516c19dc7c4b04372e7ee4416537444a9b989c404a05206088f9fb27855e0**. No build was run. This review applies to these frozen inputs, not later changes.

## Input SHA-256

Paths are relative to `/Users/amir/Projects/PodRacing`.

```text
2bd4566a478e22c9c86c87f0fa71483ac8bed7b52abe5e85aa8bdf83fce1eafe  output/gauntlet/round-32-polwo-revision1/garage.png
ccf71a9c583d1844e469ce108f8a582717a30cfa7205a7d5d2c6e48171c0d998  output/gauntlet/round-32-polwo-revision1/01-grid.png
227ed75db5e8381bcf2f1d9272aa581a665cf37b439c6361bfcf07c678df7988  output/gauntlet/round-32-polwo-revision1/02-salt-run.png
ab7353388f2fbb33d9ecd78c226da0284ab818108cbe044be9cb43bbed7d4c4f  output/gauntlet/round-32-polwo-revision1/03-canyon.png
fd74bfd40788b56d1fe59b19abf1a1a31ee860fa526808129eba1a8ab0a105e7  output/gauntlet/round-32-polwo-revision1/04-fork.png
c715e21c3a23c8c6803406085d6cdbc7de58d2f061d55c5f8a392e960ff02b51  output/gauntlet/round-32-polwo-revision1/05-launch.png
7211960b518c5040eaf8eb34b797449d0a104b852ba339316212ac6f11810a22  output/gauntlet/round-32-polwo-revision1/06-foundry.png
15543edb37d76e32d310c5f1f9fa95699576500890cf898ef2692e00db6beefc  output/gauntlet/round-32-polwo-revision1/07-finish.png
23c7f05beabc9b31b5e89b88ea5af784bf7078eb4f85001b83372f8423cdecc7  output/gauntlet/round-32-polwo-revision1/live-drive.png
58a28604ff9c3bcff067b617499e97a506f4d2fccde09ac84c5a3ce05780bf36  output/gauntlet/round-32-polwo-revision3/garage.png
f6b3f2776ec8af82da1026ac8b55d04b2fdb83ba3607b7891314b0f5ec3e7a9e  output/gauntlet/round-32-polwo-revision3/01-grid.png
9ecb539b760a9df5a9dda95c33530dabbfbe55b83075f56fbbcf87514f2b7b27  output/gauntlet/round-32-polwo-revision3/02-salt-run.png
d8e8b9a5a715bba5f815e0cdbebce501b4c1e6e39f62e740f3de31b731e93493  output/gauntlet/round-32-polwo-revision3/03-canyon.png
cb45c6d0bcf5f9f5a8ef26abe78b699f9c8f342c3ef7860c8feff2ff0b884c18  output/gauntlet/round-32-polwo-revision3/04-fork.png
c7a424dc986c06a8f59ccae7791106882ff13b35eec79c91bb0a7bd828382836  output/gauntlet/round-32-polwo-revision3/05-launch.png
6ca2fbc3109f4ca43af7352c7a26b52c69f50c0a2e4831be365da6a2efaf3132  output/gauntlet/round-32-polwo-revision3/06-foundry.png
3264189dc0d48e9e96f4c3289a71f5f9f252e1486722404080ca163a1b053243  output/gauntlet/round-32-polwo-revision3/07-finish.png
d1d96ab80eae14d49abf0756139dea4384aea6d94e72089b8f6cb31fcdd40d09  output/gauntlet/round-32-polwo-revision3/live-drive.png
3b2a7ebd7fc1ccaeb3f9811a127822972c6482d03c1efef78158286ef9562f6f  output/gauntlet/round-32-polwo-revision1/receipts.json
001038626d27b9256349e8731d0a6327a20615848845df42cf9a77732a3443c6  output/gauntlet/round-32-polwo-revision3/receipts.json
9b0cb5d949dbd077abc593b39d9f23805fcf9c7d45e7c1737987d671c2d11445  docs/inkstorm-overhaul/concepts/01-grid.png
5827c03ff9e029f9c8ac5a24dfc4dcc4dbc2942e25b4925f3d14b0d8fe2e4182  docs/inkstorm-overhaul/concepts/02-salt-run.png
962f31af50b5e89d8f109443f914f33d5ca4aafb9ff010aaec0123fc75e63cea  docs/inkstorm-overhaul/concepts/03-canyon.png
cab90a3aa51d6e80bb4cfe0d95af97d7e1803b4eff5420f48df2aff65501106f  docs/inkstorm-overhaul/concepts/04-fork.png
a791c4726db5997b8395d0d50e8ee3b858db80e0ecb01eb817ad30e7b2dc212a  docs/inkstorm-overhaul/concepts/05-launch.png
e56c72e8a4c96be345a5cfa088186ad65763fbc94c5f8b85233bb9a04b1aeb50  docs/inkstorm-overhaul/concepts/06-foundry.png
49150b64ed3dab444fde9aab7fb5091443e685a93d5c42270df257b7b8b640a2  docs/inkstorm-overhaul/concepts/07-finish.png
ff6884640507cfe0a336ffcc93495259f89e1d86f23dc5a366bae4b039ade708  docs/inkstorm-overhaul/concepts/10-polwo-vehicle-round32.png
f09516c19dc7c4b04372e7ee4416537444a9b989c404a05206088f9fb27855e0  dist/assets/index-1xbykiGm.js
```
