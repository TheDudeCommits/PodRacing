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

## Round 50 map selector

`map-desert.webp`, `map-frozen.webp`, `map-volcanic.webp`, and `map-jungle.webp`
are 800×450 captures of the current game's actual destinations, using the native
renderer and diagnostic camera. Total added download: approximately 113 KB.
Reproduce with `node scripts/capture-maps-round50.mjs` after building. The script
closes its browser and preview server in `finally`.

The four Imagegen art-direction concepts are previews only, saved under
`output/round50/previews/`. They are not runtime map thumbnails or claims about
current gameplay graphics. The two user-image-inspired concepts use the supplied
blue/violet chrome and red lighting treatment without importing character art.

## Selected Liquid Chrome direction

Owner selected preview D in this session. `liquid-chrome-backdrop.webp` is an
Imagegen-generated environment-only menu background based on that approved
concept: cobalt/violet sky, planet crescent, reflective terrace, and red lighting.
It contains no embedded UI, characters, pod images or claimed gameplay imagery.
Original: `output/round50/previews/` / Codex generated image output
`exec-c54e158d-df58-462c-8823-293929e4acdb.png`; WebP conversion changes format only.
The eight `pod-*.webp` portraits were recaptured from the actual meshes with the
menu's new violet/chrome highlights. Reproduce with
`node scripts/capture-home-portraits-round50.mjs` after building.
