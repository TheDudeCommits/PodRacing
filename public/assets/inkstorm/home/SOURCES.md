# Home screen artwork — Round 49

Eight transparent portraits rendered with `VehicleCardPreviewRenderer` from the
project's existing admitted pod models. Four mode images captured in the native
race renderer on Inkstorm, Frostline and Verdant Run, using its diagnostic camera.
The underlying models, materials and textures retain their existing project provenance.

The Rift Arena reference informed layout and interaction. None of its illustrations,
character art, fonts or source code was imported.

Reproduction: build, then `node scripts/capture-home-art-round49.mjs` from the repo.
`MODES_ONLY=1` refreshes the four mode images without rerendering the portraits.
The script closes its browser and preview server in `finally`.
