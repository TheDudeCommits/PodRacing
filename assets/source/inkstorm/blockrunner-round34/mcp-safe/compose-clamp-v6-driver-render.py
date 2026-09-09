"""External V6 render composition only; no Blender execution."""
import ast
import hashlib
import json
from pathlib import Path
B=Path(__file__).resolve().parent
OUT=B/'14-render-clamp-v6-driver-composed-payload.py'
TOKEN='20260908-round34-clamp-v6'
PNG=B.parent/('paint-v1-driver-'+TOKEN+'.png')
assert not OUT.exists() and not PNG.exists(), 'Do not overwrite an earlier trial.'
def load(name): return json.loads((B/name).read_text())
def take(d,keys): return {k:d[k] for k in keys.split()}
audit=load('audit-receipt.json');fit=load('control-fit-v1-receipt.json');state=load('atlas-clamp-v6-receipt.json');camera=load('atlas-v5-driver-render-receipt.json')
assert state['newSceneRetained'] and state['globalPreservation']['preexistingScenes']==150
assert state['targetScene']=='PodRacing — Blockrunner clamped atlas round34 V6'
assert state['paintSignature']['objectsFnv1a64']=='7b6f7ed91fa70fd6'
assert len(state['materialChanges'])==10 and all(x['afterExtension']=='EXTEND' for x in state['materialChanges'])
values={
 'BLOCKRUNNER_AUDIT':take(audit,'status sourcePreservation sourceUid sourceReference globalPreservation sourceSignature'),
 'BLOCKRUNNER_CONTROL_FIT_RECEIPT':take(fit,'sourceUid sourcePreservation sourceCornerNormalsPreserved newSceneRetained cleanupPreservation cleanupCornerNormalsPreserved status globalPreservation targetScene fitSignature fitCornerNormalSignature'),
 'BLOCKRUNNER_PAINT_STATE':take(state,'sourceUid meshObjects triangles targetScene bodyMeshName pilotMeshName paintSignature paintCornerNormalSignature linkedPaintImages paintAttributeSignatures atlasGraphSignatures atlasPackedImageRecords'),
 'BLOCKRUNNER_SOURCE_RENDER':take(camera,'view sourceUid sourcePreservation camera lighting sourceBounds path'),
 'BLOCKRUNNER_VIEW':'driver','BLOCKRUNNER_RENDER_TOKEN':TOKEN}
fragment=(B/'render-paint-comparison-v1.py').read_text()
fragment="assert len(bpy.data.scenes) == 151, 'Review changed scene inventory before V6 matched comparison.'\n"+fragment
point='    cleanup_before = source_signature(cleanup)'
assert fragment.count(point)==1
fragment=fragment.replace(point,point+"\n    assert paint_attribute_signatures(cleanup) == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']\n    assert wrap_atlas_graph_signatures(cleanup) == BLOCKRUNNER_PAINT_STATE['atlasGraphSignatures']\n    assert wrap_linked_image_records(cleanup) == BLOCKRUNNER_PAINT_STATE['atlasPackedImageRecords']")
fragment=fragment.replace("    before = source_signature(source)","    before = source_signature(source)\n    original_source_normals = wrap_normal_signatures(source)")
fragment=fragment.replace("        mesh.materials.clear()\n        for slot in original.material_slots:","        for slot_index, slot in enumerate(original.material_slots):")
point='                owned_materials.append(material)'
assert fragment.count(point)==1
fragment=fragment.replace(point,point+"\n                copied_detail = wrap_material_detail(material)\n                copied_detail['name'] = slot.material.name\n                assert copied_detail == wrap_material_detail(slot.material)\n                for atlas_node in material.node_tree.nodes:\n                    if atlas_node.type == 'TEX_IMAGE':\n                        assert atlas_node.extension == 'EXTEND'\n                        assert atlas_node.image == slot.material.node_tree.nodes[atlas_node.name].image")
assert fragment.count('            mesh.materials.append(material)')==1
fragment=fragment.replace('            mesh.materials.append(material)','            mesh.materials[slot_index] = material')
fragment=fragment.replace('        # Clearing slots resets polygon indices on multi-material meshes.\n        # Restore the original assignment only after every copied slot exists.','        # In-place same-count replacement keeps the material-index layer and assignments exact.')
point='        ob.hide_render = original.hide_render'
assert fragment.count(point)==1
fragment=fragment.replace(point,point+"\n        assert wrap_geometry_record(mesh) == wrap_geometry_record(original.data)\n        assert fnv1a64_signature([list(n.vector) for n in mesh.corner_normals]) == cleanup_normals_before[original.name]\n        assert paint_attribute_signatures(stage)[ob.name] == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures'][original.name]")
fragment=fragment.replace("    report['imageGuardScope'] = 'Image identities, dimensions, color spaces and linked material structure; external bake inventory supplies actual image-file hashes.'","    report['imageGuardScope'] = 'Exact actual packed-image records including encoded bytes FNV, plus identities/dimensions/color spaces; explicit shader extension and other graph properties guarded before/after. No image write.'")
point='    print_receipt(report)'
assert fragment.count(point)==1
checks="""    if before is not None:
        report['sourceCornerNormalsPreserved'] = wrap_normal_signatures(source) == original_source_normals
        assert report['sourceCornerNormalsPreserved']
    if cleanup is not None:
        report['parentPaintAttributeValuesPreserved'] = paint_attribute_signatures(cleanup) == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']
        report['atlasGraphSignatures'] = wrap_atlas_graph_signatures(cleanup)
        report['atlasPackedImageRecords'] = wrap_linked_image_records(cleanup)
        report['paintAttributeSignatures'] = paint_attribute_signatures(cleanup)
        report['atlasGraphsPreserved'] = report['atlasGraphSignatures'] == BLOCKRUNNER_PAINT_STATE['atlasGraphSignatures']
        report['atlasPackedImagesPreserved'] = report['atlasPackedImageRecords'] == BLOCKRUNNER_PAINT_STATE['atlasPackedImageRecords']
        assert report['parentPaintAttributeValuesPreserved'] and report['atlasGraphsPreserved'] and report['atlasPackedImagesPreserved']
"""
fragment=fragment.replace(point,checks+point)
assert 'mesh.materials.clear()' not in fragment and 'mesh.materials.append(material)' not in fragment
prefix_names=['00-source-reference.py','01-source-guard.py','13-v4-attribute-signatures.py','14-atlas-wrap-guards.py']
payload='\n'.join((B/name).read_text() for name in prefix_names)+'\n'+'\n'.join(name+' = json.loads('+repr(json.dumps(v,separators=(',',':'),allow_nan=False))+')' for name,v in values.items())+'\n'+fragment
ast_tree=ast.parse(payload)
for node in ast.walk(ast_tree):
 assert not isinstance(node,ast.Lambda)
 if isinstance(node,(ast.Import,ast.ImportFrom)):
  names=([a.name for a in node.names] if isinstance(node,ast.Import) else [node.module]);assert all(n in ['bpy','collections','json','math','mathutils'] for n in names)
 if isinstance(node,ast.Call) and isinstance(node.func,ast.Name): assert node.func.id not in {'open','exec','eval','compile','globals','locals','vars','getattr','setattr','delattr','input','breakpoint'}
 if isinstance(node,ast.Attribute): assert not node.attr.startswith('__')
assert len(payload.encode())<200000
with OUT.open('x') as h: h.write(payload)
record={'status':'Prepared only; actual V6 receipt pinned, no Blender execution.','payload':str(OUT),'payloadBytes':len(payload.encode()),'payloadSha256':hashlib.sha256(payload.encode()).hexdigest(),'expectedOutput':str(PNG),'actualV6ReceiptSha256':hashlib.sha256((B/'atlas-clamp-v6-receipt.json').read_bytes()).hexdigest(),'cameraReceipt':str(B/'atlas-v5-driver-render-receipt.json'),'cameraReceiptSha256':hashlib.sha256((B/'atlas-v5-driver-render-receipt.json').read_bytes()).hexdigest(),'expectedPreservedScenes':151,'astPolicyCheck':'passed'}
(B/'14-clamp-v6-driver-render-preparation.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record,indent=2))
