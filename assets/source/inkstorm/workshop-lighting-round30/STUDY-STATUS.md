> Historical pre-execution planning record. See `PIT-PILOT-HANDOFF.md` and `pit-pilot-manifest.json` for the executed candidate and current status.

# Round30 source study handoff

Status: proposed next-round candidate. No Blender, GPU, browser, unwrap, light bake, UV transfer, or runtime integration was performed for this study. Only files in this round30 staging directory were created. The frozen construction candidates, public assets and runtime source were not changed.

The image-only critic at `docs/inkstorm-overhaul/BLIND_SERVICE_MATERIAL_ROUND29.md` is the visual brief: round29 improved sunlight and gantry material response but weakened shaded engine, chest and rail silhouettes. The first bake pilot should make one turbine service bay visibly warm and readable in the existing pit-1/2/3 views: a lit work plane, selective exposed-metal lips and frame edges, and dark mechanical cavities. A small technically correct shift is insufficient. If the source albedo cannot distinguish those edges, report that material limitation separately.

The implementable design is in `PLAN.md`. Recommendation: begin with direct-only, white-diffuse, source-occluded area-light bakes at the existing six fixture anchors. Preserve original per-corner position, normal and color data; transfer only a validated second UV set plus unavoidable seam splits. Multiply the decoded white response by the current worn base color in one texture lookup, replacing analytic diffuse arithmetic. Keep cyan emission and the small warm fixture-lens response separate.

CPU findings: neither family currently has UVs. The pit has 12,012 triangles and the district 17,110. The district also has one nonuniform 0.72 X-scale placement, so the proposed district atlas contains separate scale-1 and scale-0.72 tiles. Two 2048×1024 runtime atlases would occupy about 21.33 MiB combined as RGBA8 with full mip chains; actual compression size, UV density, seam growth and GPU cost are unmeasured.

Executed: source geometry/area metrics and exact bake-input JSON export. Syntax checked only: UV transfer utility. Not executed: UV unwrapping/validation, the transfer utility, any bake, texture encoding, GPU material test, or in-world A/B. No completed-quality, parity or performance claim is made.

Pinned construction v4 inputs:

- Pit SHA256: `ea94400e38bf6cf5998f84cbd2cffd342054760e17c43c0f4b75ac636212d1dc`
- District SHA256: `607ea30cc7563a0c07da20a21b25135055a7736adcc34527c057fa6216fba091`
- Shared fixture-anchor SHA256: `2fafc4be49abd590acd62ff3a8c9e4672d6b27d6d929d334d5e5232584f8d8b1`

All further execution waits for root's round29 freeze and isolated bake authorization. CPU/GPU work is released for the timing benchmark.
