# Fixed-resolution section benchmark

6 September 2026, local build index-BiUeiPVZ.js. Chrome152 headless, Apple M4 / ANGLE Metal,1440×900CSS pixels, DPR2 (2880×1800 render). Other owned test browsers were closed.

Quality level0 disables adaptive changes for this diagnostic. Seven separate section starts are staged, then capture mode is disabled and actual W input/live simulation runs for7.5seconds. Each measurement excludes1.5seconds warmup and samples the following6seconds. Records remain cancelled after staging. This is not a continuous driven lap, human playtest, GPU timer query or all-device guarantee.

| Section | Mean FPS | p95 ms | DPR | End-frame draws | End-frame triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| 01-grid | 60.00 | 16.70 | 2 | 103 | 263,168 |
| 02-salt-run | 60.00 | 16.70 | 2 | 165 | 305,160 |
| 03-canyon | 60.00 | 16.70 | 2 | 199 | 725,060 |
| 04-fork | 60.00 | 16.70 | 2 | 103 | 324,688 |
| 05-launch | 60.00 | 16.70 | 2 | 101 | 249,144 |
| 06-foundry | 60.00 | 16.80 | 2 | 105 | 331,620 |
| 07-finish | 60.00 | 16.70 | 2 | 105 | 319,616 |

All2,527measured intervals were at or below25ms. Console/page errors:0. End-frame draw/triangle counts are individual samples, not measured maxima across every frame. All seven endpoints retain DPR2.

Compared with the earlier same staged canyon endpoint, full-frame triangles fell from1,891,652 to725,060 (61.7%). Rock LODs retain the detailed close assets, use1,798-triangle buttresses/1,198-triangle scree at distance, and preserve exact bounding extents and vertex colors. Overlapping cliff placement and road tessellation were also reduced.

The existing governor's600k-triangle/180-draw pressure limits could lower quality despite this measured workload meeting cadence. GameApp now calibrates those content-pressure limits to800k/210; the existing measured-frame overload policy still operates. Defaults for other PerformanceGovernor consumers/tests remain unchanged. A separate normal-adaptive recheck is required and recorded in PERFORMANCE_REVIEW.md when complete.

Raw receipt: output/gauntlet/fixed-retina-final/section-performance.json. Scripts, screenshots and device details are retained. The benchmark browser and preview server closed in finally. This result does not override the failed visual-concept review.
