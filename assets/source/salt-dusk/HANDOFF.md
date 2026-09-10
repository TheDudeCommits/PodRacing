# Salt Flats at Dusk — first asset packet

Prepared 2026-09-10 against PodRacing `a4bb70d`. Asset-only work. No runtime, physics, shared Blender, audio, commit, or deployment changes. Public paths are ready for integration; this is not in-world visual or performance acceptance.

## Selected sources and actual fit

- **[Rock 06](https://polyhaven.com/a/rock_06), Rob Tuytel**: layered weathered rock, physical scan width 1.5m. Actual preview and prepared albedo viewed. Useful fissures and mineral variation for the reference cliffs. Its ochre albedo is warmer and more mottled than the approved dark gray-brown arch; modest desaturation/cool shadow lighting is appropriate. Do not turn the entire arch into a stretched 1.5m tile: retain large-form geometry and use world-scale detail mapping.
- **[Dry Ground 01](https://polyhaven.com/a/dry_ground_01), Rob Tuytel**: 4m-wide compact cracked dry earth, selected after viewing actual preview. It is a mineral/crust proxy, **not a photographed salt scan**. Actual output has fine fissures and grain. Pale salt treatment needs material color calibration; originals remain unchanged. Keep normal relief restrained and use separate route-scale color/roughness treatment for the compacted lane. This packet adds no displacement or collision relief.
- **[Sunset in the Chalk Quarry](https://polyhaven.com/a/sunset_in_the_chalk_quarry), Sergej Majboroda**: actual preview and 2K prepared panorama viewed. Broad low cloud bands, amber low sun, blue-gray ambient sky, pale quarry ground fit the approved direction. The photograph includes a small quarry post/tower near u≈0.53 and sparse distant vegetation; it contains no enclosing forest. Keep the photographic lower hemisphere behind the authored terrain. One environment in two formats, not two different sky assets.

Reference inspected: `output/imagegen/photoreal-direction-2026-09-10/03-salt-flats.png`. Website preview images are private research only; no example render is included in the public packet.

## Integration paths

| Role | URL | Dimensions | Bytes |
| --- | --- | ---: | ---: |
| Rock albedo | `/assets/salt-dusk/rock/albedo.jpg` | 2048×2048 | 1,855,891 |
| Rock GL normal | `/assets/salt-dusk/rock/normal-gl.png` | 1024×1024 | 1,829,944 |
| Rock roughness | `/assets/salt-dusk/rock/roughness.jpg` | 1024×1024 | 167,875 |
| Ground albedo | `/assets/salt-dusk/ground/albedo.jpg` | 2048×2048 | 1,448,320 |
| Ground GL normal | `/assets/salt-dusk/ground/normal-gl.png` | 1024×1024 | 1,963,905 |
| Ground roughness | `/assets/salt-dusk/ground/roughness.jpg` | 1024×1024 | 264,390 |
| Linear HDR | `/assets/salt-dusk/environment/sunset-quarry-1k.hdr` | 1024×512 | 1,580,299 |
| Photographic LDR | `/assets/salt-dusk/environment/sunset-quarry-2k.jpg` | 2048×1024 | 325,385 |

Total payload **9,436,009B (9.00MiB)**; **7,855,710B** if only the LDR environment is requested at runtime. Two 2K albedos and four 1K data maps preserve close detail. JPEG/PNG do not provide GPU block compression: six material maps alone are about 64MiB under RGBA8 plus mipmaps. `toktx` was unavailable; no unverified KTX conversion supplied. Loader reuse and lower-resolution fallback remain integration decisions. Do not load both environment formats unless each serves a distinct purpose.

## Shader setup / palette starting point

Albedo and LDR panorama are sRGB; normal/roughness are linear data. GL normal green is unchanged. Normalize sampled tangent normals before use, including after interpolation: source normal lengths vary. Ground's original normal alpha is uniformly255 and was safely removed. Public normals are RGB8 PNG with no color/gamma metadata; the 16-bit source ground normal is retained privately. Roughness is grayscale replicated by normal image sampling; no metal map is needed (metalness0).

Start world tiling at source widths (rock1.5m, ground4m); inspect repetition at race speed before changing. Suggested normal strengths rock0.55–0.8, ground0.2–0.35. Raw mean roughness is ~0.518 rock /0.829 ground. For dry non-polished cliffs, a roughness floor around0.65 is a reasonable initial material decision. Preserve cracks and local values; avoid broad specular coating.

Suggested art-direction swatches (not values measured from a calibrated render): salt `#d2c9b5`, compacted lane `#aaa697`, rock `#66594d`, shadow `#53616a`, horizon `#e7b17a`. Favor naturally warm direct light and cool ambient shadows rather than painting orange into all surfaces. These scans are diffuse/normal/roughness maps, not pre-shaded CGI beauty textures; no AO composite was applied.

## Environment alignment

`environment-analysis.json` contains the actual decoded HDR measurement and exact conventions. With native image orientation and zero environment yaw:

- Brightest pixel center: image-top-left UV **(0.60009765625, 0.4853515625)**.
- Three `equirectUv`, uploaded flipY=true: shader UV **(0.60009765625, 0.5146484375)**.
- Normalized direction **toward sun**: **(0.8078000518, 0.0460031821, 0.5876587305)**. Incoming light rays are its negative.
- Elevation **2.63671875°**, native azimuth atan(z,x) **36.03515625°**.
- If shader lookup adds `yaw/(2π)` to u, world sun azimuth is native azimuth minus yaw. Apply the same convention to direct lighting. Image-top-left mapping instead uses `v=0.5-asin(y)/π`.

Start linear HDR with ACES exposure1.0 and evaluate actual game contrast. The LDR is the provider's tonemapped 8K photographic panorama downsampled to2K; it is already sRGB and tonemapped. Do not blindly apply a second filmic curve or use its values as linear HDR lighting. Both share the same composition; provider tone settings are not documented. HDR sky median/95th/99th luminance are0.557/0.947/2.054; peak sun luminance3312.28. Those are file measurements, not calibrated lux or a validated game exposure.

## Provenance and validation

All eight original downloads passed exact API byte-count and MD5 checks; SHA256s are recorded. `original-downloads.json` binds URLs to immutable originals. `prepared-assets.json` binds every public output to its source and exact conversion. `MANIFEST.json` hashes the reference, selected metadata, license evidence, originals, scripts and public packet. The HDR public copy is byte-identical to upstream. No atlas pixels, artistic content, normal direction, or geometry were painted/generated here. Public albedo/roughness JPEGs were recompressed; the LDR alone was spatially downsampled. Originals preserve upstream precision.

Assets are CC0 under [Poly Haven's license](https://polyhaven.com/license). Original legal text and API terms are retained in `research/`; public `PROVENANCE.md` and `CC0-1.0.txt` cover the shipped files. API calls used the descriptive `PodRacing-SaltDusk-AssetPreparation/1.0` User-Agent. No runtime API dependency, paid call, browser, GPU/render process, or shared Blender session was used.

## Publication boundary

Website example-render PNGs and whole-page HTML research caches remain local and Git-ignored; the website renders are not covered by the asset CC0 grant. The reproducible decoded HDR float scratch file is also ignored. Runtime asset originals, preparation scripts, API metadata, source URLs/hashes and license records remain committed.

`MANIFEST.json` is the historical asset-preparation inventory. Its HANDOFF hash precedes this publication appendix; `PUBLICATION_INVENTORY.json` records the release-source files.
