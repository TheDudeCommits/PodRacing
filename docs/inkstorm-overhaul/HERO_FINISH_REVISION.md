# Hero finish revision after round 14

2026-09-07. The round-14 blind review, matching launch concept, actual launch frame and garage frame were inspected. This pass continues the original procedural fallback craft. It does not import requested Sketchfab vehicles or claim that downloaded models now have drivers.

## Visible changes

- **Cockpit:** a continuous blue rear deck and contoured seat shell replace the broad empty black rectangle behind the driver. A smaller inset bucket faces forward, with an orange stripe following the raised rear deck. Existing pilot and control anchors remain unchanged.
- **Pilot:** the hero has a larger, oval blue helmet with a narrow painted stripe across its crown/rear and a curved dark forward visor. Its helmet has zero emission and restrained specular/reflection strength. The hidden face mesh under this enclosed visor was removed, keeping the hero pilot within the existing 40-submission budget. Other exposed-face variants retain their shallow face geometry and existing accessories.
- **Engines:** broad low swept blue shoulders replace the narrow fin as the principal upper silhouette. Pressure ribs support the surface. Fewer repeated external bands and less evenly bright tow-cable cuffs reduce the striped-barrel appearance.
- **Burner depth:** the nozzle has an inward-facing tapered cavity, a dark backplate, a recessed turbine, and localized fastening ears. The powered cyan ring sits inside the lip; the central core is roughly one metre deeper. Normal ignition is cyan, with red reserved for redline.
- **Paint:** square cell noise was replaced by continuous object-space brush variation and sparse irregular exposed-metal islands. The change is gated by the existing `uWear` material control. Root owns the separate world-shadow integration.

Root's intermediate `shadow-preview` screenshots were inspected. They showed the new pilot/cowl and a real burner cavity, but the warm ignition overlay and bright cavity walls washed out the cyan power source. The final source correction darkens the wall, brings the cyan annulus forward inside the recess, and changes normal ignition to cyan. Those last corrections still require the next integrated capture and blind verdict.

## Geometry receipt

Measured from the current TypeScript modules without a browser or full build. A temporary Vite SSR loader was closed immediately after the measurements. Counts cover visible full-detail craft geometry, including exhaust/coupling, excluding the separately attached pilot, outline and MRT passes.

| Class | Round-14 craft meshes | Current meshes | Round-14 triangles | Current triangles |
| --- | ---: | ---: | ---: | ---: |
| Podracer | 22 | 21 | 14,632 | 14,508 |
| Landspeeder | 27 | 26 | 10,724 | 10,600 |
| Speeder bike | 27 | 26 | 10,700 | 10,576 |
| Skim speeder | 27 | 26 | 10,712 | 10,588 |

All four solid bounds remain inside the original pre-overhaul craft envelopes enforced by the existing hero geometry test. Current pod bounds are X ±10.472m, Y -0.630 to 3.501m, Z -8.550 to 15.175m. This is a visual footprint check, not a new physics collider certification.

The hero Sunflare pilot reports 25 beauty meshes, 15 outline meshes, 40 estimated submissions and 872 beauty triangles. Its distant variant reports 15 beauty meshes, 8 outlines, 23 submissions and 394 beauty triangles. The new helmet/visor retains rig identity, animation and control-grip behavior.

## Verification and remaining acceptance

36 focused tests across seven files passed. New checks verify an opaque ray can pass through the nozzle mouth to the recessed core, forward-only curved visor geometry, matte non-emissive helmet material, and the painted stripe remaining attached to the head rig. Existing checks cover solid envelopes, geometry budgets, class switching, finite LOD/prepass transitions, ghost drawing, pilot IK, landing/celebration poses and material contracts. Typecheck and targeted `git diff --check` passed.

No browser, full build, full-race benchmark, commit or deployment was performed by this subtask. The next integrated screenshots and performance run determine acceptance; this pass does not establish concept parity or 40–60fps by itself.
