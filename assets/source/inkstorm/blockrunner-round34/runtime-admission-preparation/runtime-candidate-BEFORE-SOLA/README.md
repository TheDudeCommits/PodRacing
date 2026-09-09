# Blockrunner isolated runtime admission candidate

This directory is staged preparation only. No live source, tests, public assets, manifest or browser was changed. Apply only after final package checks and runtime admission are authorized.

## Prerequisite

Reuse `output/gauntlet/round34-blockrunner-exhaust-candidate/candidate.patch` first. This candidate deliberately does not duplicate that implementation. Its two baseline source files matched the live source during preparation. The saved external candidate result records 16 passed / 0 failed tests; these were inspected, not rerun here.

That prerequisite adds `exhaustApertureRadius` and the installed `exhaustRadialScale` getter. The 0.34 m common radius fits the measured 0.341783523 m inscribed aperture. It includes peak redline expansion, preserves the legacy 0.54 radial multiplier for existing craft, and requires two root translation anchors and a baked identity model root. Blockrunner omits the coupling pair and marks authored hardware to hide the duplicate nozzle lip.

## Package contract

Final node names are `blockrunner-body` and `blockrunner-pilot-{suit,helmet,visor,gloves}`, each with one primitive and canonical atlas material. Hero is 39,900 body + 4,128 original pilot triangles. Rival must retain 4,128 pilot triangles and total at most 30,000. The existing runtime limits stay at hero 60,000 / rival 30,000 and draws 12 total / 6 body / 6 pilot. This asset's stricter five submissions, one body and four pilot roles are asserted by the package test, without a new general budget option.

Hero uses one 1024 square base and one 512 square roughness atlas per owner; rival uses 512 / 256. Each pilot role shares the pilot owner's two images. Body and pilot never share images. Four images and five semantic materials are required. No invented normal map or tangent requirement is added: authored NORMAL values stay part of the export preservation proof, and these maps contain base color plus green-channel roughness only.

The registration uses normalization-candidate-v1's existing anchor measurements. The final exported GLB must independently confirm those coordinates, preserved rear apertures and +Z forward / +Y up. The CPU package must bake root transformations correctly; applying a rotation to POSITION while leaving NORMAL in a different basis would be invalid. The requested POSITION-only bake is valid only where normals already occupy the final basis and the remaining transform is uniform scale/translation.

## Application and focused checks

`candidate.patch` includes the existing metadata/settings/attribution edits and the two new focused test files. It does not include assets, the exhaust prerequisite, manifest updates, performance changes, an AI roster reassignment or camera changes. RaceHud generates the new selector button from ART_APPEARANCES, and its row already wraps. The shared garage framing and zero chase-clearance remain in force until actual imagery warrants an appearance-specific adjustment. Existing Polwo-only camera conditions remain untouched.

The required `BLOCKRUNNER_PACKAGE_RECEIPT` environment variable names a fresh final receipt with this schema: `packages.hero` and `packages.rival`, each containing actual `path`, `sha256`, `bytes`, `triangles` and `bodyTriangles`. Paths are absolute or repository-relative. No package count or hash is fabricated. The tests fail if the receipt is absent and independently compare its package bytes with the public URL file, inspect the GLB and embedded image dimensions, and assert the exact admission contract.

After applying both patches and copying the validated packages, run from the repository root:

    BLOCKRUNNER_PACKAGE_RECEIPT=/absolute/path/to/fresh-receipt.json npx vitest run tests/settings/vehicleAppearance.test.ts tests/settings/blockrunnerAppearanceAssets.test.mjs tests/render/blockrunnerAppearance.test.ts

Then typecheck and the normal suite with the same receipt variable. The new focused source tests have only received syntax/adoption checks in this preparation stage. No execution, visual, browser, gameplay or performance acceptance is claimed. Keep the supplied asset-test environment variable in full-suite automation, or replace it with a checked-in reference to the actual immutable receipt once that receipt exists.

## Remaining verification

Actual package validation and root-space anchor/normal parity, physical selector framing, failed-load/Retry and delayed cancellation, real Cup rival loading, original-pilot visibility/shadow exclusions, bounded exhaust at redline, complete races and fresh visual criticism remain required downstream. Updating source catalogue/runtime counts belongs after actual integration evidence. No generic scene budget or current technical checkpoint has been changed.
