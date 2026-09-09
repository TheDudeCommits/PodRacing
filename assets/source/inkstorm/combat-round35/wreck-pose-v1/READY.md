# Renderer wreck pose candidate — 9 September 2026

Applied and CPU-validated; **actual combined V10 rendering, motion quality and cadence remain with the parent**. This is implementation-aware engineering evidence, not a fresh visual acceptance review.

The preserved [V9 temporal review](../../../../../output/playwright/round35-combat-v9/temporal-review/REVIEW.md) found a readable camera cut but weak impact. Its full-geometry probe established that the global-time YXZ wreck rotation drove all 13,867 right-engine POSITION occurrences below the real race terrain at frames 910/922/943. The worst source vertex at birth was 13.038 m below terrain. The simulation trajectory itself was reproduced exactly; this was a displayed rigid-art pose defect.

## Applied change

`src/render/combat/WreckVisualPose.ts` owns one reusable result per racer. The live body, combat camera focus/heading/radius, and FX rupture anchor now consume that same current-state pose. It uses `2.15 - wreck.timer`, guarded by a regression against the actual recovery-start duration. It begins at the exact intact orientation/root, applies modest bounded pitch/roll/yaw around the measured rigid-art center, settles gradually over 0.8 seconds, and removes the offset over the final 0.35 seconds. It does not integrate wall time or alter simulation/network/snapshot state.

Actual source vertices are measured when geometry binds. The cache stores up to 74 real support points: 26 directional extrema and the lowest source vertex in each of 48 XZ cells. The unchanged-frame guard checks geometry revision plus mesh/BufferGeometry identity, including procedural proxy replacement. Each pose resolve reuses all vectors/quaternions and performs at most three bounded terrain passes (222 height queries). Camera plus body may resolve twice in a local cinematic/recovery frame, giving a 444-query upper bound; these native fixtures used 106–120 combined queries. There is no per-frame source vertex scan. The 0.55 m stand-off is an explicit support-approximation allowance, not exact collision contact. No source meshes, GLBs, physics, courses, terrain or shaders changed.

The original replay pose branch remains intact. Ordinary camera inputs, replay framing, manual/cockpit modes and existing cut/return restoration remain under the existing camera controller. The previously added bounds-aware chase return uses the new measured center. The FX owner's independent surface projection is retained as a final burst-only clearance guard.

## Actual CPU evidence

[All-family geometry receipt](all-family-ground-check.json) records source hashes, 104 evaluations (26 timestamps × four source families), actual POSITION counts and unchanged race state. Teemto uses the exact native V9 trajectory, including checkpoints 922 and 1153 matching saved position/yaw values exactly. Other families are geometric substitutions on that trajectory, **not independent driving runs**.

| Admitted source | POSITION occurrences | Cached samples / max terrain queries used | Minimum tested clearance | Maximum downward correction |
|---|---:|---:|---:|---:|
| Teemto | 73,048 | 60 / 60 | 0.550 m | 2.414 m |
| Sebulba | 60,558 | 53 / 53 | 0.424 m | 2.494 m |
| Polwo | 75,831 | 53 / 53 | 0.550 m | 2.745 m |
| Blockrunner | 67,740 | 58 / 58 | 0.410 m | 2.288 m |

Every tested POSITION occurrence clears terrain. None of these fixtures needs positive root lift; birth correction is exactly zero. Positive vertex samples do not prove continuous triangle/terrain clearance on every route, and the reduced support proxy is not a collider. Actual in-world settling, spectacle and simultaneous-wreck frame cost still require review.

Final [targeted tests](targeted-tests-v4.log): **22 PASS / three files**; [typecheck](typecheck-v4.log) and `git diff --check` PASS. The tests cover all four actual GLBs at 26 timestamps, exact intact entry, repeatable snapshot reads, simulation-state equality, sample/query bounds, transformed geometry without metadata mutation, same-proxy geometry replacement, existing camera restoration and the shared FX adapter. No browser or Blender was used by this subtask.

## Retained failures and limits

The first 24-cell low/high reduction missed a Polwo point by 0.272 m; a larger margin with that same coarse grid still missed 0.049 m at frame 1090 ([retained failure log](targeted-tests-v2.log)). The final reduction uses 48 underside cells within the same 74-point maximum; all temporal checks then passed. The initial cache-identity audit found that procedural class/LOD replacement can change geometry without revision; the final explicit geometry-identity guard and test address it. A transient test typecheck issue used a static Node import in this DOM-only TS project and was corrected to the repository's existing dynamic test-only import pattern.

[Final source inventory](source-freeze-inventory-v2.json) pins the applied helper/GameApp/tests. The numeric receipt was captured immediately before the cache-identity-only amendment; final tests repeat the same geometry checks after that amendment. Earlier inventories and frozen copies remain alongside it. No final visual/FPS pass is claimed.
