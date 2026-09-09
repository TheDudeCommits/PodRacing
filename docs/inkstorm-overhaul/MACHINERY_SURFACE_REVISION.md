# Machinery paint revision

7 September 2026. Local development; visual and sustained performance acceptance pending.

The previous machinery shader supplied broad vertex colors and weak procedural variation, leaving large tanks and pipes visually plain even where their geometry had flanges, service panels and rails. A new original Codex imagegen grayscale enamel map modulates that existing paint. Sparse dark chips, rubbed patches and fine streaks remain subordinate to the cobalt/coral color blocks. A restrained warm highlight separates intact enamel from worn areas. Cyan service-light colors are masked out of the wear treatment.

The 1,254 × 1,254 PNG is copied unchanged from imagegen, 2,615,566 bytes, SHA `63e7a4c2925352e1d38c0842b6b87a9bde1441a8097a075f85909d313698a894`. It adds one shared texture (approximately 8.4 MB including RGBA mipmaps); no additional meshes or draw submissions. It is luminance data, not a replacement albedo palette. Existing materials receive its asynchronous load through shared uniforms. Paint projection now uses the local-space normal corresponding to its local-space coordinates, so rotated instances retain consistent projection.

Source receipt: `assets/source/inkstorm/machinery-paint-receipt.json`. Public file: `public/assets/inkstorm/machinery-paint.png`. The public art set now contains 17 GLBs and four PNGs; the round-18 20-file manifest remains historical evidence.

## Exact generation prompt

Create ONE seamless tileable game material texture, square 1024x1024, flat orthographic diffuse/albedo only, edge-to-edge neutral grayscale. Subject: worn industrial enamel on steel for a premium hand-painted cinematic science-fiction racing game, art direction 'Inkstorm': painterly realism with deliberate large quiet painted surfaces, sparse organic clusters of chipped enamel exposing dark steel, dry fine scratches, subtle vertical grime streaking, occasional broad rubbed patches. About 80 percent quiet medium-light warm gray intact paint; sparse dark irregular chip clusters with tiny lighter broken lips and gray oxidized undercoat, no deep black. Surface detail must operate at three coherent scales with authored irregularity, no even all-over noise, no cartoon vector outlines. Strictly NO objects, NO pipes, NO bolts, NO rivets, NO text, NO labels, NO symbols, NO panel borders, NO dramatic light/shadow, NO horizon, NO perspective, NO AO shadows, NO framed swatch, NO repeated tiled grid. Absolutely flat evenly lit material map designed to repeat seamlessly on curved tanks and structural steel. Grayscale-only luminance will modulate separately authored orange/cobalt paint in a real-time shader; do not bake colored paint into this image.

The generated dimensions differ from the requested dimensions and are reported as returned. This is a material source, never an in-game screenshot or proof of concept parity.
