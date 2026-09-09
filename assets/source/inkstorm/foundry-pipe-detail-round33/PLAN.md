# Foundry pipe-bank detail preparation — round33 V1

Source authoring, export and three neutral technical renders have now completed
through root's Blender MCP execution. The actual export and an exact retained
attribute derivative pass the source checks documented below. This preparation
and verification agent made no public asset, runtime code, physics, occupancy,
deployment or acceptance-state changes. The original seven world concepts remain
the art targets. `06-foundry.png` is the Foundry target; supplementary
`11-foundry-construction-round33.png` supplies construction studies.

The inspected current gameplay image is
`output/gauntlet/round-32-polwo-revision3/06-foundry.png`. Flat dark procedural
connector collars visible there belong to `InkstormFoundry.ts`; root owns that
separate correction. This package does not claim to fix those procedural faces.

## Source contract

The frozen predecessor is `predecessors/pipe-bank-round32.glb`, SHA256
`4b3510d0f8b10e1a44158edb0b0bbdc25bac33019176368638937ab1834a3b81`,
504,460 bytes, 7,160 triangles, one mesh/primitive/material, no texture or animation.
The exact original builder is also copied and hashed in `predecessor-receipt.json`.

The additive candidate keeps every original source triangle, position, color,
winding and normal, including the 1.2 m foundation slab, all old platforms,
crew, cabinet, ladders, pipes, supports and vessel shells. Final bounds remain
Blender X `[-47,47]`, Y `[-20.20081901550293,23]`, Z `[0,51]`.
All additions are at Z ≥ 2.1. No collision/placement edit is required or included.

Blender coordinates are X width, Y depth, Z up; front is -Y. glTF conversion is
`(x,y,z) -> (x,z,-y)`. All three established runtime sockets are unchanged:

| Blender center | Outward | Radius | Source triangles | New treatment |
| --- | --- | --- | --- | --- |
| `(-42,-9,7)` | `(-1,0,0)` | 3 | 2930–2943 | None |
| `(-38,-13,19)` | `(-1,0,0)` | 1.8 | 4066–4075 | None |
| `(8,-10,30)` | `(-1,0,0)` | 2.25 | 4806–4817 | None |

The actual free source terminations are `(1,-9,38)` +Z, `(-10,-13,3)` -Z and
`(37,-10,10)` -Z. Their complete terminal disks are independently attributed
to source triangles 2944–2957, 4076–4085 and 4818–4829. Only these three ends
receive paired annular flanges, a visible joint seam, recessed shaped pressure
plates, eight radial fasteners and hinge/keeper construction. Their old faces
remain intact behind the additions.

The root's new collector reservation, X `[-4.3,4.3]`, Y `[-21.3,-12.7]`, is
tested by clipping every added polygon. The result is zero intersections.
The nearest free-end rim remains at Y -12.55, leaving 0.15 m to this reservation.
Connected mouth slabs are also clipped at axial ±1 m, with radial clearance
strictly exceeding each pipe radius + 0.15 m. A null radial value means no added
polygon reaches that socket slab, not a measured infinite clearance.

## Construction hierarchy and cost

- Nine paired vessel bands with thick flanges, six broad clamp lugs at each
  joint, contrasting fasteners, and longitudinal shell joining straps.
- Three deep inspection manways with reinforcement pads, necks, inset shaped
  lids, paired bolted flanges and operating spindles. The small-vessel manway
  stays below its access floor.
- Three closed wraparound deck extensions with toe plates, upper rails,
  triangular gussets and diagonal brackets. New floors butt to the preserved
  old deck edge. The small vessel includes a real connecting bridge across its
  former deck-to-tank gap; its retained ladder is correctly centered from the
  original deck X35 rather than tank X37.
- Crown collars, radial fasteners and lifting ears clarify vessel construction.
- Three free pipe ends receive finished inset pressure-cap assemblies.

The candidate is **19,960 triangles**: 7,160 retained plus 12,800 added.
Every addition uses the original vertex-color material. No extra draw call,
texture, UV set, shader or light is added to the shipping asset contract.
Broad structure and readable assembly are the main cost; fine fasteners remain
subordinate. CPU `preparation-receipt.json` breaks cost down by all 15 groups.

The unchanged flagship layout has **18 pipe-bank instances**, verified against
`output/gauntlet/foundry-round33-attribution.json`. All 18 visible would submit
359,280 triangles per pass, 230,400 more than the predecessor. Culling can lower
that, while shadows and other passes multiply work. This does not establish
40–60fps; actual world capture, timing and blind criticism remain required.

## Execution and preservation

1. Run `validate-preparation.py` locally to verify predecessor hashes, script
   safety, geometry, terminal attribution, reserved-space clearance and the
   external byte-preserving GLB packer. This does not call Blender.
2. Once root releases live Blender work, execute the literal
   `author-pipe-detail-mcp-safe.py` through Blender MCP. It imports only the
   predecessor into a uniquely named new scene, performs the same source checks,
   appends the construction, and keeps the original material read-only.
3. Execute `export-render-pipe-detail-mcp-safe.py` only after successful authoring
   and confirming its versioned paths are unused. It writes one native source
   GLB and three neutral technical renders under `v1/`. No shared blend is saved.
4. Check the native export using `preserve-retained-gltf.py --native PATH
   --check-only --receipt NEW_JSON`. It requires all 7,160 old triangles and
   validates every retained position/normal/color byte. If the native exporter
   introduces representation drift, `--output NEW_GLB --receipt NEW_JSON`
   reconstructs retained records from the preserved original and carries only
   proven additions from native. Both inputs are preserved; all output paths
   are confined to this source folder and created exclusively.
5. Root owns later glTF optimization/validation, public installation, actual
   gameplay capture, full performance evidence and fresh blind criticism.

Both MCP payloads preserve and assert the pre-existing scene/view-layer/active
object/selection and all existing scene/collection memberships. They isolate
temporary review objects and delete them afterward; failed authoring removes
only its owned new stage. The retained normals use FLOAT_VECTOR/CORNER
`custom_normal` directly. The packed `normals_split_custom_set` path is never
used. There are no filesystem reads, open/os/hashlib/Path, dynamic eval/exec,
dunder, lambda, bake or blend-save calls in either MCP payload. File access and
hashing exist only in the external CPU validator/packer.

`geometry-fragment.py` and `authoring-fragment.py` are construction source
fragments embedded literally into the complete MCP author payload; they are
not executed dynamically inside Blender. The complete payload is authoritative
for execution, and its SHA256 is recorded in the CPU receipt.

The CPU packer self-test creates a synthetic in-memory GLB solely to prove
record preservation and rejects reversed/duplicate retained triangles. It uses
dummy normals for additions and is not a Blender artifact, render or acceptance
claim. No candidate GLB was written by that preparation check. The actual Blender
artifact and its separately verified derivative are described below.

## Actual source execution and verification

Root executed the prepared author/export payloads successfully. The preserved
receipts are `v1/mcp-authoring-receipt.json` and
`v1/mcp-export-render-receipt.json`. Authoring reports zero retained Blender
normal delta with direct FLOAT_VECTOR/CORNER storage; the original positions,
colors and winding remain exact in the Blender scene. Both operations confirm
all old scene/collection memberships and the Cruise scene, active object and
15-object selection were restored. Export/review also confirms the authored
source evidence and stage selection were unchanged and its temporary review
scene was removed. No shared blend was saved.

Native file: `v1/pipe-bank-detail-v1-native.glb`, SHA256
`7afc03433332005a2c68d4247ca1a5ddc8c36570426968ec67390cc3ffff20ea`.
The native glTF export matches all 7,160 original oriented triangles with zero
position delta. However, exact source comparison measures 2,451 changed normal
corners, maximum component delta `0.00020159780979156494`, and 21,480 changed
RGB corners, maximum delta `0.004356741905212402`. This is exported attribute
drift despite exact Blender readback; it is retained as evidence in
`v1/native-retained-check.json`.

The copy-ready derivative is **`v1/pipe-bank-detail-v1-exact-retained.glb`**,
SHA256 **`7a28b2e2f3ce25b173ed21033cbe0d28e7341197407b5e86d2400848dba8d946`**,
**1,329,140 bytes, 33,543 vertices, 19,960 triangles**. The tested external packer
restored every original position/normal/color record from the frozen source,
preserved every native addition corner attribute and triangle winding, and
restored the exact original material JSON. It did not modify the frozen source,
native export, added geometry, Blender scene or public files.

Both native and derivative pass Khronos validator `2.0.0-dev.3.10` with zero
errors, warnings, infos or hints. The final derivative retains one primitive and
material, only POSITION/NORMAL/COLOR_0, no textures or animations, identity node
transform, all finite attributes and finite nonzero unit normals. Maximum normal
length error is `1.1152787582346946e-7`, below the `1e-6` unit tolerance. Bounds
remain glTF X `[-47,47]`, Y `[0,51]`, Z `[-23,20.20081901550293]`. Clipping the
**actual exported addition polygons** confirms zero collector-reservation
intersections and clear protected socket slabs; minimum added Blender Z is
`2.0999999046325684`, above the unchanged 1.2 m foundation floor.

The actual records and checks are preserved in:

- `v1/exact-retained-packaging-receipt.json` — observed native drift and direct
  original-record restoration/addition preservation proof.
- `v1/exact-retained-recheck.json` — a fresh final-file comparison, all original
  retained oriented triangles and attribute bytes exact.
- `v1/native-khronos-validation.json` and
  `v1/exact-retained-khronos-validation.json` — zero-issue reports for both files.
- `v1/exact-retained-technical-check.json` — native/final identity, finite unit
  normals, bounds, exact original material, actual reserved-space clipping,
  source-context receipts and hashes of all three technical source images.
- `verify-export.py` — reproducible read-only verification, with an exclusive
  receipt write; it does not call Blender or install the source.

The three neutral images are renders of the native authored source. The restored
derivative was not separately rendered by this verification step. Actual-world
framing, concept parity, blind criticism and 40–60fps acceptance remain pending;
source technical validity does not establish them.
