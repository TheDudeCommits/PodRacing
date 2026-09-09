# Teemto appearance integration — round 22

Verified 2026-09-07 in `/Users/amir/Projects/PodRacing`. This completes the runtime integration that was intentionally deferred in `IMPORTED_VEHICLE_PRESENTATION.md`; that document records the earlier infrastructure checkpoint.

## Delivered behavior

The garage exposes Teemto and Classic frames for the podracer physics class. New or invalid appearance saves default to Teemto; an explicit Classic selection survives reload. The other three physics classes keep their existing procedural presentation. Appearance has its own versioned storage key and does not change class, physics, course/drive record identity or mastery data.

`RacerPresentation` keeps procedural and imported ownership separate. GameApp and the garage share a lazy, reference-counted library for only the hero and rival variants currently requested. A successful art switch unregisters the old MRT proxies, registers the actual imported meshes, binds the current static shadow uniforms and refreshes the hero shadow casters. Seven actual meshes replace the single procedural prepass; the three body meshes cast the dynamic sun shadow. The embedded driver replaces the procedural pilot. Exhaust, coupling and dust use the measured export anchors. Rival art retains its body silhouette and retires embedded pilot/VFX detail at lower LODs.

Loading and failure states remain visible in the garage, with an explicit Retry action. Failed initial loads retain the procedural fallback. Selection generations, abortable consumers and idempotent leases prevent late completions from replacing newer choices or disposing shared geometry still in use. Hiding the garage releases its preview renderer/context.

## Exact tested artifacts

`npm run verify` passed **484 tests in 86 files**, TypeScript checking and the production build. The first full verification found an existing strict HUD model-key assertion: emitting an optional `appearance: undefined` key changed its shape. The implementation now omits that key when no appearance model is supplied, and a focused test covers the added model contract.

| Artifact | Bytes / geometry | SHA-256 |
| --- | --- | --- |
| `dist/assets/index-pdFDTN2P.js` | 1,538,959 bytes | `4cf676178460ac5d8ea7a0b02b18102411c055553e9acddd32c29b50cb4aec3f` |
| `teemto-hero.glb` | 2,639,312 bytes; 50,705 triangles | `a7787f380a71ac31c8dbbaf228cb949e97c119d763a54384e66c05f884cba491` |
| `teemto-rival.glb` | 1,931,540 bytes; 26,180 triangles | `3d9d8d8d924258b84553de7f31f44dc4f69f069511cb6358ab2c174768e3385f` |
| Acceptance harness at successful run | `scripts/vehicle-appearance-acceptance.mjs` | `3ba28a975ea560e04e339383d5fa24a91b081355ed96e19b3ff9f40d8e453f00` |

Both before/after artifact manifests in `output/playwright/vehicle-appearance-round22-retry/` are identical: 130 runtime source files, 24 public Inkstorm artifacts, 29 dist assets, the dist index and the harness were frozen. The later round-23 edits and newly published Sebulba assets are outside this receipt.

## Browser acceptance

`scripts/vehicle-appearance-acceptance.mjs` passed on Headless Chrome 152.0.7977.77, macOS arm64, Node 24.19.0, with a 1440×900 page at device DPR 2; the injected failure context used 1280×720. It uses actual HUD clicks and ordinary keyboard drive, with no simulation positioning or mastery writes.

The successful receipt is `output/playwright/vehicle-appearance-round22-retry/receipt.json`. It verifies default Teemto art and rendered garage image, Classic selection and reload persistence, Teemto reselection, all four class choices, return to the podracer frame, preview rotation, seven-to-one-to-seven exact MRT registration, unchanged mastery storage, and five seconds of actual driving with the imported hero. Only the Teemto hero/rival URLs were requested.

A real `WEBGL_lose_context` loss/restoration preserved the imported presentation and resumed dynamic shadow updates. A fresh page received one deliberate HTTP 503 for the hero GLB: procedural fallback and visible Retry appeared, the load did not repeat per frame, and clicking Retry after removal of the fault recovered both the hero and the garage image. The raw receipt retains the single expected 503 console error; there were **zero unexpected browser or shader errors**.

At the live checkpoint the imported hero had 7 opaque draws, 3 body draws, 4 pilot draws, 50,705 triangles, and 7 registered/visible prepasses. Its 512-pixel dynamic shadow submitted 3 body draws / 43,545 triangles with no omitted candidates, failure or skipped reason; frames advanced to 515. The recorded current CPU submission time was approximately 0.10 ms and maximum 2.80 ms after the selection/reload sequence. These are JavaScript submission measurements, not GPU timings.

The main WebGL canvas remained live after starting the race, while the auxiliary preview context was actually lost and its canvas reduced to 1×1. The harness closed its browser and server in `finally`; ports 56636 (initial attempt) and 56724 (retry) were separately verified to have no listener.

The initial attempt is preserved unchanged in `output/playwright/vehicle-appearance-round22/`. It failed because the harness checked hidden appearance controls immediately after the authoritative physics-class change, before the HUD's next scheduled render. The retry changed only this synchronization to await the actual hidden UI state. No runtime outcome, threshold, error filter or artifact was changed to obtain the pass.

## Visual evidence and limits

The successful output directory contains `garage-teemto.png`, `garage-classic.png`, `garage-teemto-return.png`, `live-teemto.png`, `restored-teemto.png`, `http-fallback.png` and `http-retry-teemto.png`. The garage and live images were inspected: imported painted geometry, embedded pilot, coupling and ground shadow are present. Root subsequently captured the complete round-22 world with zero errors after the gauntlet harness was taught to await the actual selected art and garage image.

This is functional rendering acceptance, not human art-direction/fun acceptance or uninterrupted race FPS acceptance. The live checkpoint reached adaptive quality 7 / DPR 1.125. Its far refinery exposed a separate terrain coverage defect: quality reduction hid distant clipmap rings while their landmarks remained visible. That defect is tracked for round 23. Startup uploads and preview work also entered the governor's measured work/cadence histories; those slow intervals remain in the raw evidence. Full-race performance must be remeasured after the coverage fix.
