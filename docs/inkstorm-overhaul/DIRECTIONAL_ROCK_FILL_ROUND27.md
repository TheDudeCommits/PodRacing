# Directional rock fill — round27

The common geology shading now gives surfaces facing the sky more ambient fill than undersides. The previous fill varied only from 0.84 to 1.0; the candidate uses a squared directional term ranging from 0.38 to 1.0. It retains the authored sun, warm lit faces and cool shadow palette. The intent is to distinguish cliff planes and recesses that previously collapsed into a broad uniform violet field.

Only `src/render/inkstorm/InkstormGeologyShader.ts` changes for this treatment. Its predecessor is preserved at `assets/source/inkstorm/shadow-fill-round27/InkstormGeologyShader.round26.ts`. No geometry, physical terrain heights, light direction, texture count, mesh count or pass count changes. The shared function applies to scanned rocks and authored terrain; their geometric normals remain their separate inputs.

Actual combined captures are in `output/gauntlet/round27-shadow-nozzle-v2/` and subsequent cliff-normal/V4B sets, with zero browser errors. These also contain nozzle and contact changes, so they are not isolated lighting A/B evidence. The later paired world review retains a modest improvement but still fails the target; the broad walls and sparse layered composition remain visible problems. The successful initial GPU probe is separately scoped in `GPU_FRAME_PROBE_ROUND27.md`; final combined full-race timing remains pending.
