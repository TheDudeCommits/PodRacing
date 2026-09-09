# Preserve scanned geological paint — round24 candidate

The round21 shared stone material replaced the Blender scan vertex paint with a common world-space albedo. This discarded the source diffuse luminance and ambient occlusion already baked into the rock vertices, documented by scanned-geology/rock_face_01-paint-summary.json and bake_source_colors.py. The common color family is useful; erasing this local value information was not.

The round24 candidate retains a bounded luminance multiplier from RGB or RGBA vertex paint beneath the shared stone palette. A restrained cavity multiplier also survives the cool sky fill. It adds no textures, texture reads, meshes, vertices or physics changes. Its purpose is to reveal existing scanned fractures and recesses, not to claim improved large-scale landscape composition.

The round24 combined build passes 495 tests, typecheck and build. All seven actual section captures and five supplemental views compile with zero browser errors, using `index-CTODLYt3.js`, SHA `febf6f2c804a46c90c1ff64cb7e171aa8be9f32f0a0ea4456aebdf6350fb379f`. The saved canyon view shows more local value separation on existing fractures. The large purple wall composition and folded launch cliffs remain; this is a material correction, not a geometry or target-parity pass. Evidence: `output/gauntlet/round-24/`.

Fresh image-only criticism is pending. Full-race timing was deferred when actual garage review revealed a stale readiness message; that UI issue is being corrected in the next combined candidate. Round23 full-race timing predates this correction and does not establish the round24 result. The short 481-interval live capture averaged 60.003 Hz but is not a full-race measurement.
