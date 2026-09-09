# Blockrunner isolated runtime admission candidate

This directory is staged preparation only. No live source, tests, public assets, manifest or browser was changed. Apply only after final package checks and runtime admission are authorized.

## Prerequisite

The parent has applied the optional exhaust contract from `output/gauntlet/round34-blockrunner-exhaust-candidate/candidate.patch` to live source and reports typecheck plus its 16 focused tests passing. Do not apply that prerequisite twice. This registration candidate deliberately does not duplicate it; the candidate's isolated checks also include the already-applied contract.

That prerequisite adds `exhaustApertureRadius` and the installed `exhaustRadialScale` getter. The 0.34 m common radius fits the measured 0.341783523 m inscribed aperture. It includes peak redline expansion, preserves the legacy 0.54 radial multiplier for existing craft, and requires two root translation anchors and a baked identity model root. Blockrunner omits the coupling pair and marks authored hardware to hide the duplicate nozzle lip.

## Package contract

Final node names are `blockrunner-body` and `blockrunner-pilot-{suit,helmet,visor,gloves}`, each with one primitive and canonical atlas material. Hero is 39,900 body + 4,128 original pilot triangles. Rival must retain 4,128 pilot triangles and total at most 30,000. The existing runtime limits stay at hero 60,000 / rival 30,000 and draws 12 total / 6 body / 6 pilot. This asset's stricter five submissions, one body and four pilot roles are asserted by the package test, without a new general budget option.

Hero uses one 1024 square base and one 512 square roughness atlas per owner; rival uses 512 / 256. Each pilot role shares the pilot owner's two images. Body and pilot never share images. Four images and five semantic materials are required. No invented normal map or tangent requirement is added: authored NORMAL values stay part of the export preservation proof, and these maps contain base color plus green-channel roughness only.

The registration uses normalization-candidate-v1's existing anchor measurements. The final exported GLB must independently confirm those coordinates, preserved rear apertures and +Z forward / +Y up. The CPU package must bake root transformations correctly; applying a rotation to POSITION while leaving NORMAL in a different basis would be invalid. The requested POSITION-only bake is valid only where normals already occupy the final basis and the remaining transform is uniform scale/translation.

## Application and focused checks

`candidate.patch` includes seven files: metadata, attribution, existing settings and roster expectations, two new focused test files, and the checked-in package fixture. It does not include assets, the exhaust prerequisite, manifest updates, performance changes, physics changes or camera changes. RaceHud generates the new selector button from ART_APPEARANCES, and its row already wraps. The shared garage framing and zero chase-clearance remain in force until actual imagery warrants an appearance-specific adjustment. Existing Polwo-only camera conditions remain untouched.

The checked-in `tests/fixtures/blockrunnerPackage.json` fixture supplies actual package hashes, bytes and counts; ordinary `npm run verify` needs no external environment or private source GLB. The staged fixture currently pins private V3 packages and must be regenerated from actual final package receipts before live application. No placeholder hash is used. The tests independently inspect public bytes, canonical meshes/materials, absence of COLOR attributes and embedded image dimensions.

The candidate now also changes only ai-sola's cosmetic preference to Blockrunner and updates production-roster expectations. ai-rax remains unchanged. The ordinary grid's Sola is the only AI podracer; the class-gated landspeeder at ai-rax would not load this model. The prior full candidate is preserved in `../runtime-candidate-BEFORE-SOLA/`.

After final package preparation/copy and coordinated application, run ordinary focused tests and `npm run verify`; the fixture is part of the patch. Current isolated validation passed 42 tests/5 files with real private package bytes and synthetic renderer fixtures. No browser, build, driving, performance or final art acceptance is claimed.

## Remaining verification

Actual package validation and root-space anchor/normal parity, physical selector framing, failed-load/Retry and delayed cancellation, real Cup rival loading, original-pilot visibility/shadow exclusions, bounded exhaust at redline, complete races and fresh visual criticism remain required downstream. Updating source catalogue/runtime counts belongs after actual integration evidence. No generic scene budget or current technical checkpoint has been changed.
