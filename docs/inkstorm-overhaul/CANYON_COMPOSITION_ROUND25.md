# Canyon composition — round 25 source receipt

The two near flagship buttresses have moved outward and become unequal, lower shoulders. This implements only the first placement step of `CANYON_FORM_PROPOSAL.md`. The original arch, every other placement, and the physical course remained unchanged in this source receipt. Same-camera round25 review was required at handoff; its subsequent result is appended below. Exact earlier placement/protection measurements remain preserved.

Worktree: `/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`, base HEAD `0f0e8ab209cc5156efaf92b545630bd243b14478`. This is a source handoff within the existing uncommitted overhaul, not a commit, build, deployment, or visual acceptance claim. No browser or Blender session was opened for this subtask.

## Source boundary and preserved visual evidence

Changed files are `src/game/race/inkstormLayout.ts`, `tests/race/inkstormCanyonComposition.test.ts`, and this receipt. The source change adds a single flagship-only composition call after existing geology selection. Its selection uses `canyon-buttress` family, authored progress `0.44729237368968017`, and the sign of lateral displacement along the course right vector. Numeric placement suffixes are not used by runtime selection. Yaw, progress, and family are preserved.

Inspected the actual round 24 canyon image and the concept directly. The actual still reads as a very tall near wall around a keyhole opening; the concept presents a separate horizontal arch span, several depths of sunlit formations, and a winding visible road. This change is intended to expose the existing span. It does not establish concept parity without the next controlled capture.

- Preserved actual: `output/gauntlet/round-24/03-canyon.png`, SHA-256 `8737f70daf163581e5865c7a537d186e5f864249dfb8fc5295290093be3a57b8`.
- Preserved concept: `docs/inkstorm-overhaul/concepts/03-canyon.png`, SHA-256 `962f31af50b5e89d8f109443f914f33d5ca4aafb9ff010aaec0123fc75e63cea`.
- Original layout source SHA-256: `8f9b97fa69177f4382f03bd2e5c42eee87261e20a86379a1f48744fc187650ff`.
- Released layout source SHA-256: `a8a116265b0664d8d213f954a0898f7cc79315feca3f5e7e7e5bf33fc647f32d`.
- Released composition test SHA-256: `6a5eeed1e24ef4e9227b6ca0fea8c3dbaffa394cc82213c7555a06b0c8e0a2bd`.
- Untouched arch `public/assets/inkstorm/canyon-arch.glb`: SHA-256 `36876e340a578993c9c3d01084029d1ca0b757ef140ae482bbd1e0e1ff6b0453`.

## Exact placement changes

Both placements have progress `0.44729237368968017`. Negative side means left of the course right vector, positive side means right.

| Field | Left before | Left after | Right before | Right after |
| --- | --- | --- | --- | --- |
| ID | `inkstorm-canyon-buttress-91` | `inkstorm-canyon-near-left-buttress` | `inkstorm-canyon-buttress-93` | `inkstorm-canyon-near-right-buttress` |
| World X | 19931.643757184986 | 19942.651696328267 | 19762.46078381596 | 19745.94887510104 |
| World Z | 395.78964639280974 | 391.01206585263657 | 469.2171309360826 | 476.38350174634235 |
| Yaw | -2.8622132374091094 | -2.8622132374091094 | -2.602013507870892 | -2.602013507870892 |
| Scale X | 1.4585413849356428 | 0.92 | 1.4585413849356428 | 1.00 |
| Scale Y | 1.3004993238455427 | 0.72 | 1.3004993238455427 | 0.82 |
| Scale Z | 1.6 | 0.95 | 1.6 | 1.00 |
| Outward course-right offset | — | -12 m | — | +18 m |

Authored dimensions are now 73.6 × 86.4 × 95 m on the left and 80 × 98.4 × 100 m on the right. Existing footprint grounding may extend buried geometry downward while preserving the authored crown. Neither geometry nor its grounding algorithm changed.

## Actual geometry and full-corridor guard

The test loads both actual public buttress GLBs through `GLTFLoader`, applies their scene transforms, and reads the vertex bounds with `Box3.setFromObject(scene, true)`. Both meshes have bounds `[-40,0,-50]` to `[40,120,50]`; their union is used for the two complete rotated boxes. The test does not approximate the box by an ellipse or omit its corners.

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `canyon-buttress.glb` | 1,291,464 | `ad9f484c3cd751e9042ecc332e9517c7c21d34919758dfdaa89bde77f153a5e6` |
| `canyon-buttress-lod.glb` | 247,284 | `9262af74e76f008803f96c21a17bfbe62eca2098648f58640a716d20de75f21a` |

The main course has **16,384 direct `samplePlanAtProgress` samples**, including its closing interval. `getRenderData(16384)` would silently clamp to 4,096, so it is not used for this dense check. All branch segments contribute **3,761 samples**, with maximum spacing **0.3998211099675072 m** and the greater endpoint lane half-width applied throughout each segment. The complete point set is 20,145 samples.

For every point, the test measures Euclidean separation from the full rotated box and subtracts the lane half-width. It then subtracts **9.6 m** for the conservative wide-vehicle half-width and **0.4897254510872639 m** for the largest complete center interval plus its lane-width change. This interval debit is additional to the dense sample check. The retained required clearance is **7 m**.

| Anchor | Minimum box-to-full-lane clearance | After interval debit | After interval debit and 9.6 m vehicle half-width | Required |
| --- | ---: | ---: | ---: | ---: |
| Left | 46.84780970135595 m | 46.35808425026868 m | **36.75808425026868 m** | ≥7 m |
| Right | 47.39831359786088 m | 46.90858814677361 m | **37.30858814677361 m** | ≥7 m |

The denser main-route sampling produces slightly different minima and a smaller interval debit than the proposal's earlier CPU receipt. No threshold was reduced. This is a geometry/corridor result for the flagship and does not certify a future replacement arch, visual readability, or frame rate.

## Preservation checks and test results

The full before/after flagship layout still contains 227 placements. Exact JSON comparison finds changes at only the two intended records. The SHA-256 of the other 225 records, in original order, remains `bf1dfd8846615ede6d652844c20bd6e3b8f9a0b940cbfb7883843d6596e4910b`. This includes both original arches, every other canyon depth band, and all fork dividers. Full layout SHA-256 changes from `306b2ae647a130e4b44e884886c1493a630e90ab67e17d20b52ed0d2f7d89f43` to `cc7c841ba39c999f9b7b8a745a621b579c6c47bebba62220cbc6bf65e52e2ac8`.

The full layouts for seeds `0`, `1`, `42`, `1234`, `987654321`, `0x494e4b52`, `0x494e4b54`, and `0xffffffff` match the recorded before-change SHA-256 values byte for byte; the new tests retain those eight baseline digests. The strict runtime seed gate also returns before any composition work on all non-flagship seeds; the sampled verification does not claim an exhaustive test of all 32-bit seeds.

Physical snapshots of signature, total length, control points, checkpoints, 4,096 render route samples, and all branches match before/after for all nine checked courses. Flagship physical SHA-256 remains `a287bb09b5ea503026d5f8bc6fbe2ee491104481e5abb94622c4af8d15a855e2`. The new test additionally checks that layout generation leaves this physical data unchanged and that the two ordinary buttress centers produce no new obstacle contact. The collider definition code was not edited; the existing fork and roadside collision tests still pass.

Validated on 2026-09-07:

- `npx vitest run tests/race/inkstormCanyonComposition.test.ts tests/race/inkstormLayout.test.ts tests/race/inkstormGeology.test.ts tests/race/inkstormFork.test.ts tests/race/inkstormPitDistrict.test.ts tests/race/inkstormLaunchOwnership.test.ts tests/render/inkstormRockGrounding.test.ts` — **7 files / 27 tests passed**.
- `npm run typecheck` — **passed**.
- `git diff --check` — **passed**.

The first typecheck attempt failed on `node:crypto`, `node:fs`, and `process` declarations in the new test because this browser project has no Node type package. That failure is preserved in the root task's `output/terrain/round25-detail-typecheck.log`. The test now uses WebCrypto for SHA-256 and a narrowly typed file loader scoped to its actual-GLB test hook. No dependency, compiler setting, or existing guard was changed to pass.

Temporary before/after CPU receipts are `/tmp/inkstorm-canyon-round25/before.json` and `/tmp/inkstorm-canyon-round25/after.json`; the original source copy is `/tmp/inkstorm-canyon-round25/inkstormLayout.before.ts`. The essential original transforms, preserved-file hashes, and clearance measurements are recorded above so this receipt remains useful after temporary-file cleanup.

## Original acceptance boundary — preserved

At source handoff, the root task was to build and capture the same canyon camera with its independent round25 terrain changes, inspect whether the existing arch silhouette and continuing road were exposed, and preserve the round24 comparison. Arch sculpting and farther buttress changes were deferred until that review. No asset, `GameApp`, `TerrainSystem`, terrain topology, road, branch, obstacle, driving or PB-identity edit was made by this source subtask.

## Subsequent round25 result and next unvalidated work

Combined `index-DYsxLpxt.js`, SHA `14c129a2de533fa5c3e4adbdacd1eb1e6cda21112df3fa7317b2e613ae1ac4b5`, passed **512 tests / 90 files**, typecheck/build/diff. The seven-section capture and eight supplemental views compiled without browser errors. Actual canyon images expose more sky beside the reduced shoulders but retain the broad wall/keyhole composition. The fresh canyon score is **5.3/10 overall** and fails the minimum 8-per-category gate; the complete world remains **0/7 sections accepted**. [Image-only review](BLIND_WORLD_ROUND25.md).

Both default Teemto and UI-selected Sebulba then passed full Time Attack, two-lap Canyon Cup and actual Continue on **local Apple M4 / Chrome 152 at adaptive resolution**. All four racing phases averaged approximately 60 Hz, with 16.7 ms p95, maximum 16.8 ms, no racing interval above 25 ms and zero browser errors. Time Attacks used DPR 1–2; Cups briefly used 1.875 before returning 2. Raw countdown slow frames remain recorded; all frozen source/public/dist/harness manifests matched and owned browsers/servers closed. [Exact full-race report](FULL_RACE_PERFORMANCE_ROUND25.md). This does not establish visual acceptance, fixed-resolution performance or other-device results.

The round25 freeze has been released. **Round26 arch/fork work is released for the next pass but has not been validated**, and no round25 result is transferred to it. Pilot v2c remains unpublished and rejected at 5.6/10; 24 catalog downloads remain pending. There has been no overhaul deployment.
