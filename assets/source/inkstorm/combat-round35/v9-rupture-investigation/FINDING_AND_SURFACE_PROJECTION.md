# V9 rupture burial: executed CPU finding and correction

Normal-input CPU reconstruction uses seed1229867859, Time Attack, three-second countdown, brake throughout, boost at frames558–910. It exactly matches saved native frame557 and922 position/yaw/raceTime/redlineHeat. The event at910 gives a rupture center at Y-16.654480452533; terrain at the same X/Z is -12.908893608390. The center is **3.745586844m below terrain**. This is a confirmed source transform problem, not an inferred camera occlusion.

At birth, the flash radius is2.025m, growing to2.7m by its0.14 simulation-second expiry. The burst center stays fixed below terrain. The first observed cut sample at frame913 is age0.025 simulation seconds and flash opacity0.968; lack of a peak is therefore not explained by expiry before the shot. The native screenshot-associated snapshot922 is age0.1 simulation seconds, with flash opacity0.229. Screenshot acquisition and snapshot are sequential; no exact image/frame synchronization is asserted.

I inspected native V9 solo-chase-wreck.png plus temporal-011/019/030.png (sourcePTS10.36/10.68/11.12). Thin ground-adjacent sparks and later dark fragments are visible; no clear luminous peak in these inspected frames. This is frame inspection, not continuous video acceptance.

Authorized correction in GalacticEffectsView.emitCrash projects only crash/redline render births vertically when required. X/Z and supplied event are preserved. Clearance is severity ×1.35 flash scale ×0.4 core radius +0.04 depth pad; at full severity, ground+1.12m. The corrected first render plate Y is -11.788893699646. Existing above-surface anchors and unrelated styles are unchanged. Same eighteen fragment maximum, four plate maximum, eight draws. No simulation writes, new build, or browser run.

The authored event payload and exact at922 simulation state are identical before/after this effect projection. New reproduced-burial and airborne tests pass; total22 tests/3 files, full typecheck and scoped diff check pass.

A separate existing red-shell path in GameApp.syncGalacticEffects runs whenever redline.heat>0.65, with no wreck or redline.active gate. This accounts for persistent warning shells through wreck cooling; it has not been changed in this correction. Parent camera agent is separately inspecting/correcting rigid wreck geometry penetration and preparing a shared pose helper. The event-adapter helper integration remains pending at note creation.

Evidence hashes:

- before-projection.json: `33467e571ae6efd791b3027fb17dd0158965af017eafb0012e4a4f0d1028fc63`
- after-projection.json: `fa8052dea4267f82c22650592db7415f6fc28d73145b99243833f7cff519f4e5`
- reproduce-original-live-imports.mjs (original executed recipe): `710b0aa333d763257db5a04c76e84e9e8db1a6c5c8a74d2e90f2cceb5e8dc303`

Follow-up integration: consumeGalacticEffects now calls the parent's shared resolveWreckVisualPose for wrecked entries, preserving its cached position and rotation. FX adapter tests prove that lifted pose is used without state/cache mutation; all22 FX tests pass. Parent owns completion and full typecheck of the shared resolver.

The updated reproduce.mjs freezes the V9 consumer fragment against its originally recorded SHA256, so subsequent displayed-pose corrections cannot erase the historical reproduction. It produces byte-identical after-projection JSON. The original executed recipe is retained separately. Complete hashes and validation boundaries are in surface-projection-handoff.json.
