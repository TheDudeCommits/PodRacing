# Round30 implementation triage and staged foundry candidate

8 September 2026. This is source-informed implementation triage, not blind image acceptance. Read HANDOVER, STATUS, the original overhaul review and B prompts, round29 fresh world criticism, driving/competitive-flow evidence, and current runtime source. Directly inspected B and round29 fork, launch and foundry stills. No browser, Blender, GPU, network or download was used. Checkpoint claims below are reported by their existing documents, not newly executed acceptance.

## Main-picture judgment

The project is at risk of staying in small polish loops. Round29 improves workshop floors, cloth, equipment and paint, but the fresh critic still accepts 0/7 sections. The repeated macro defects are the unintegrated fork, hidden/sparse launch basin, and disconnected foundry. Another workshop-only improvement cannot close these. Preserve the useful pit studies, finish their isolated A/B, then spend the next iteration on a complete driving sightline.

The eight packages are substantially implemented: stock events and lesson; authored circuit and three branches; asset loading; two imported appearances; environment and shadows; HUD/garage; PB/sectors/ghosts/Cup/daily; synthesized sensory feedback. Do not re-pitch these features as absent. Their remaining art, human handling, balance and sensory gates are real.

## Three highest-impact next changes

### 1. Recompose the actual launch and foundry sightlines

**Next bounded implementation:** turn the foundry from repeated tanks and a start-light gantry into connected industrial architecture, using actual existing module transforms. `inkstormLayout.ts` currently places the same `foundry-gantry` family at the grid and the first chicane, then repeats `pipe-bank` on both sides. The sockets are open and modules have no runtime connections. Replace the chicane gantry with three unequal overhead pipe/service crossings, connect visible bank nozzles to header runs, and retain open views through the structures. Use geometry, existing worn machinery material and actual static shadows; no panorama, fake skyline image or extra light array.

**Larger follow-on:** `LaunchBasinPlan.ts`, `CourseGulfField.ts`, `InkstormVista.ts`, `CinematicCamera.ts` and `GameApp.ts` need one coordinated reveal study. The physical descent is already 94m over 600m. The chase preview looks only 55–125m ahead, with bounded pitch correction. Vista placement rejects scenery inside a 24-degree central cone, while the ridge destination is placed 825m ahead/right 360m. This explains why adding more flank rocks may still leave a sparse center; it does not by itself prove the cause of the screenshot. First measure line-of-sight to the real descending road from approach/crest/main/descent. Then stage unequal lower/middle/far forms around that road. If the crest profile itself must change, make it an explicit new course edition with full branch/landing/record validation rather than silently preserving inappropriate isolation constraints.

**Expected validation:** same actual four launch views plus foundry approach/main/exit, live input through the whole sequence, at least one view from each appearance, fresh image-only critic, no route concealment by pipework, real per-vertex/segment clearance, no new per-frame geometry construction, and isolated full-race timing after integration. The staged candidate here targets the near foundry network only; it cannot claim to solve the launch basin.

### 2. Integrate the fork island and raised entry

`InkstormBridge.ts` makes a 1.5m slab with constant 0.32m curbs, finite end caps and simple piers. `getInkstormForkDividers()` places three fitted overlapping buttresses at branch fractions .375/.50/.625. The current image exposes the long slab edge and places the main rock behind much of the decision. A connected, tapered rock nose with a downstream crown should organize the two lanes; the bridge entry needs a deliberate supported abutment and curbs that taper into the shoulder instead of ending as slivers. Preserve the existing branch rows/checkpoints first. Modify `inkstormLayout.ts`, `InkstormBridge.ts`, `InkstormVista.ts`, `InkstormRockGrounding.ts`; touch `branches.ts`/`bridgeSurface.ts` only if an intentional physical change is necessary.

**Expected validation:** original branch height/normal samples if unchanged; full rotated collider envelopes and both lanes clear; main and shortcut input-only laps for four classes; fork approach/main/after-entry images with ribbon off; AI fork recovery; generator version and archived records if geometry that affects driving changes. Do not use a camera orbit to hide exposed joins.

### 3. Turn existing sector records into a concrete retry pursuit

`RaceMastery` already saves ten checkpoint sectors and exposes the latest sector delta. Results label them S1…S10, and after gold the objective becomes generic ghost/Cup advice. Add a presentation mapping from real checkpoint spans to named course beats, a cumulative PB pace comparison at accepted checkpoints, and a result card for the largest measured loss: for example “Canyon exit +0.42s versus your PB — recover this section next run.” Reuse the existing Race Again action and ghost. Keep the target visible briefly on the next full-lap retry, then return to the normal HUD. Do not infer “brake later” or branch superiority from sector time alone. Files: `game/mastery/{types,RaceMastery}.ts`, `ui/{RaceHud,inkstormStyles}.ts`, with an explicit sector-label projection from course checkpoints.

**Expected validation:** no PB/no loss/tied PB/multiple laps/recovery-invalid cases; cumulative time uses the same accepted splits and race clock; storage/reload/ghost identity remain unchanged; actual result→retry interaction at 1440×900 and 1280×720. Current 90s gold is provisional; the historical no-boost/no-drift automated 63.37s lap suggests the expert challenge may run out quickly, but this is not human medal calibration evidence. Do not arbitrarily tighten saved medal conditions.

## Current staged implementation authorization

Root selected priority 1 for a bounded source candidate. Only the foundry sightline is being staged under this directory. Fork and mastery changes are deferred. Runtime, public assets and docs are not modified by this agent. `original/` preserves the inspected source before staging. Root owns actual-camera A/B and any integration.

The candidate uses existing source module sockets from `build_industrial_revision.py`: Blender (-42,-9,7), (-38,-13,19), (8,-10,30), converted to glTF (x,z,-y), then the exact placement scale/yaw and terrain anchor -1.5m used by `InkstormWorld`. The CPU receipt will report triangulation, materials, bounds and clearance; these are engineering checks, not visual or performance acceptance.


## Candidate ready for root A/B

- Add `candidate/InkstormFoundry.ts` as `src/render/inkstorm/InkstormFoundry.ts`.
- Apply the small `integration-world.diff` to the current `src/render/inkstorm/InkstormWorld.ts`. Do not replace other current work with old snapshots. The diff only imports the new module, appends its mesh into the existing owned/disposed structural mesh array, and suppresses the flagship chicane gantry artwork. Two exact existing gantry collision columns are visibly rebuilt as plant supports. The grid gantry is retained. No `GameApp`, mastery, layout, gulf or physics patch is part of this candidate.
- CPU receipt: **8 banks, 24 source sockets, 33 pipe runs, 3 unequal crossings, 27 boxes, 17,300 triangles, 51,900 nonindexed vertices, 1,868,400 attribute bytes**. One additional opaque mesh/material; no new textures/lights, no per-frame update. Cap 24,000 triangles. This is not GPU allocation or frame timing.
- Material: `new InkstormSurfaceMaterial(false)` uses the existing **Inkstorm worn machinery** shader family, existing shared machinery paint and world/racer shadow uniforms. No workshop bake family/texture is passed. Vertex colors: blue `#466879`, rust `#b26642`, bone `#d9c3a1`, iron `#363747`. The structural mesh enters the existing full-placement static shadow caster path and existing disposal path.
- Exact local glTF sockets are `[-42,7,9]` radius3, `[-38,19,13]` radius1.8, `[8,30,10]` radius2.25; all use each current bank's scale, yaw, and `heightAt(center)-1.5` anchor. These come from preserved original source coordinates, not guessed screen positions. `plan.json` enumerates every world-space socket, curve control point and box. Other unselected pipe openings are not claimed to have been connected.
- CPU vertex plus triangle-centroid checks report **9.355m minimum low geometry clearance**, **78.744m minimum overhead height near the road**, zero nonfinite values/failures. These discrete probes are not an exact swept-pod or full triangle-volume proof. The high pipe bridge may read oversized or leave the close camera; root must judge actual foundry approach/main/exit before keeping it. Tube curves and collars are real 3D geometry, not an image panorama.
- Strict candidate/dependency typecheck passes. The world-hook diff has no whitespace errors (`git diff --no-index --check` returns1 because the compared files differ, with no diagnostics). CPU-only loader uses Node's TypeScript transform; no renderer is instantiated.
- Reproduce CPU audit from repository root: `node --loader ./assets/source/inkstorm/round30-next-steps/cpu-loader.mjs ./assets/source/inkstorm/round30-next-steps/audit.ts`. Typecheck command is saved in `typecheck-command.txt`.
- **No visual acceptance, full-race cadence, browser lifecycle or launch-basin success is claimed.** The launch/foundry framing and pipe height are hypotheses for the root-owned A/B, not approved art.
