# Salt Dusk stone refinement v1 — ready for native gallery

Two versioned GLBs are integrated by URL mapping only in InkstormWorld; original files remain byte-exact. Root's stamped-shadow removal is preserved. No scenery plan, normal utility, terrain, shader, camera or simulation change was made in this refinement.

| Asset | Triangles | Bytes | Draws/textures |
|---|---:|---:|---|
| canyon-arch-dusk-v1 |70,000|1,681,836|1 /0|
| wind-blade-dusk-v1 |10,000|241,260|1 /0|

The source-authoring script runs in standalone Blender5.2LTS with factory startup, one CPU thread, no rendering and no blend save. It adaptively subdivides long edges, then builds shallow outward relief around continuous warped bedding joints and vertical flutes. Fine arch regions receive less displacement; the modulation is interpolated across original vertex scales instead of changing at triangle borders. Existing bounds and root collars are pinned. The wind blade uses horizontal outward displacement and a pinned original crown; its formerly open18-edge underground toe is closed at the original base.

Actual arch relief peaks at0.916m (27,155 moved vertices, mean0.120m); blade peaks at0.709m (4,207 moved vertices, mean0.262m). These are added authored surface forms, not newly recovered scan detail. Each vertex color comes from the original source triangle and barycentric weights; the new hidden toe cap samples the nearest original side. Maximum interpolation error is under1e-6.

17 focused tests pass; typecheck and diff check pass. Khronos reports0errors/0warnings for both exports. Actual installed-loader tests verify one mesh, exact original bounds, finite normals/colors, closed consistent winding, positive volume, nine/one components, no degenerate faces and clear arch passage.1,444 blade contact rays show maximum inward difference0.000023m. Initial cap-correspondence and crown-profile failures remain in local logs; the cap is explicitly sampled from the nearest original surface and the crown was pinned, without lowering the contact criterion.

The arch derives from the preserved nine-piece arrangement of Rico Cilliers' Poly Haven boulder_01 CC0 scan; the wind blade is original project geometry. Existing provenance is linked in HANDOFF.json. No external media or textures were added.

Native visual acceptance is pending. Added cost is32,200 triangles per visible arch and9,336 per blade with unchanged draw counts; no FPS claim or new LOD. The improvement needs the same current canyon and basin views, especially joint silhouette, obvious repeating ribs, source root seating and broad-panel lighting.
