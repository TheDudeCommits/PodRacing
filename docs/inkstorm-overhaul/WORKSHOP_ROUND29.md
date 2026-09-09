# Workshop overhaul — round29 work in progress

Shared pit/district grading, repair equipment, gantry detail, thin repaired cloth and the first task-light pass are running locally. Blue paint now receives normal material shading while actual cyan emitters remain distinct. Fresh blind reviews retain clear pit floors and new equipment, but **strict concept parity remains FAIL**; the service-material review is mixed because shaded machinery loses separation. Fresh independent reviews retain both the thinner cloth and district grading. Abrupt frontage banks and exposed foundations remain unresolved. These actual diagnostic views use the full game renderer with close cameras. They are not racing-camera or frame-rate proof. The combined frozen round29 build now passes its own full-race performance check; links and scope follow below.

[Grading review](BLIND_PIT_GRADING_ROUND29.md) · [Equipment review](BLIND_WORKSHOP_GEOMETRY_ROUND29.md) · [Initial lighting review](BLIND_WORKSHOP_LIGHTING_ROUND29.md) · [Service-material review](BLIND_SERVICE_MATERIAL_ROUND29.md) · [Cloth review](BLIND_CLOTH_ROUND29.md) · [District-grading review](BLIND_DISTRICT_GRADING_ROUND29.md)

## Target

![Original Inkstorm grid concept](/Users/amir/Projects/PodRacing/docs/inkstorm-overhaul/concepts/01-grid.png)

## Actual pit — same camera, unchanged rigid building pose

| Slab alignment only | Shared physical grading |
| --- | --- |
| ![Before grading](/Users/amir/Projects/PodRacing/output/gauntlet/grid-grounding-round29-after/pit-1.png) | ![After grading](/Users/amir/Projects/PodRacing/output/gauntlet/grid-grounding-round29-graded/pit-1.png) |

| Revised equipment, original lighting | Initial local task-light pass |
| --- | --- |
| ![Equipment candidate](/Users/amir/Projects/PodRacing/output/gauntlet/grid-construction-round29-unlit/pit-1.png) | ![Initial lit equipment](/Users/amir/Projects/PodRacing/output/gauntlet/grid-construction-round29-lit/pit-1.png) |

## Current actual pit — thin repaired cloth and corrected paint

![Current pit](/Users/amir/Projects/PodRacing/output/gauntlet/grid-construction-round29-district-graded/pit-1.png)

## Current actual district — clear service floors

![Current district](/Users/amir/Projects/PodRacing/output/gauntlet/grid-district-round29-district-graded/district-1.png)

## Actual grid gantry — revised geometry

![Grid gantry](/Users/amir/Projects/PodRacing/output/gauntlet/grid-gantry-round29-after/gantry-1.png)

All9 geometry comparison camera/matrix pairs and all7 initial-lighting pairs match exactly. Every capture invocation has an empty browser-error array, with source/asset hashes frozen within the invocation. All owned browsers and preview servers closed. Complete paired image coverage and scores are listed in the linked independent reports.

The new three-family kit retains original geometry as exact prefixes and stays within its source budgets:12,012 pit,17,110 district and6,300 gantry triangles;839,948 additional delivery bytes, no new draws/materials/textures. Original assets and rejected candidates remain in the source history. The rejected thick cloth remains preserved. The current thin-shell revision retains original geometry and repair colors; its fresh image review retains the change while rejecting strict target parity.

All7 cloth and all7 subsequent district-grading camera/matrix pairs also match exactly, with no browser errors. The expanded shared atlas has 344×702 R32F texels (965,952 bytes), adding257,112 bytes without another texture sampler or terrain triangle. All641,400 protected route/shoulder/normal probes across three seeds remain unchanged. Actual indexed mesh checks keep the lower neighboring pit clear; the first district still needs treatment of substantial exposed foundations. The GPU sampler passed275 points in four independent binding states, maximum GPU/CPU difference0.000006963m at identical float32 coordinates. These are geometry and sampler checks, not frame-rate acceptance.


The complete round29 build passes582tests/104files and both racers’ Time Attack/Canyon Cup/Continue flows. [Full-race evidence](FULL_RACE_PERFORMANCE_ROUND29.md) records59.719–59.781Hz mean local adaptive cadence, p9516.7–16.8ms. [World review](BLIND_WORLD_ROUND29.md) still rejects all7section targets. The [supplementary workshop lighting concept](concepts/08-workshop-lighting-target-round30.png) and next road-level-anchor/bake studies are outside this frozen runtime.
