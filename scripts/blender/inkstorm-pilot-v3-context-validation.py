"""Compare only owned PodRacing body copies; restore the exact shared context."""
import bpy
import json
from mathutils import Vector

saved_scene=bpy.context.window.scene
saved_layer=bpy.context.window.view_layer
saved_active=saved_layer.objects.active
saved_selected=list(bpy.context.selected_objects)
original_object_count=len(saved_scene.objects)
result={}
try:
    source=bpy.data.scenes['PodRacing — Teemto material study v1']
    stage=bpy.data.scenes['PodRacing — Teemto pilot construction v3c']
    bpy.context.window.scene=source
    bpy.context.view_layer.update()
    originals=[(o,o.matrix_world.copy()) for o in source.objects
        if o.type=='MESH' and not o.name.startswith('teemto-pilot-')]
    copies=[o for o in stage.objects if o.type=='MESH' and o.name.startswith('pilot-v3-body-')]
    assert len(originals)==len(copies)==71
    largest_error=0
    topology_equal=True
    material_slots_equal=True
    body_triangles=0
    for (original,matrix),copy in zip(originals,copies):
        assert len(original.data.vertices)==len(copy.data.vertices)
        for va,vb in zip(original.data.vertices,copy.data.vertices):
            largest_error=max(largest_error,(matrix@va.co-vb.co).length)
        topology_equal=topology_equal and [tuple(p.vertices) for p in original.data.polygons]==[tuple(p.vertices) for p in copy.data.polygons]
        material_slots_equal=material_slots_equal and list(original.data.materials)==list(copy.data.materials)
        copy.data.calc_loop_triangles()
        body_triangles+=len(copy.data.loop_triangles)
    assert largest_error<.000001 and topology_equal and material_slots_equal
    result={'sourceBodyMeshCount':len(originals),'candidateBodyMeshCount':len(copies),
        'bodyTriangles':body_triangles,'maximumBodyVertexError':largest_error,
        'topologyUnchanged':topology_equal,'sourceMaterialSlotsUnchanged':material_slots_equal,
        'seatAndControlsAndLicensedHoses':'all source body geometry included in this comparison',
        'v2cSourceUntouched':True,'fullBlendSaved':False,'publicAssetsModified':False}
finally:
    bpy.context.window.scene=saved_scene
    bpy.context.window.view_layer=saved_layer
    for obj in saved_layer.objects:
        if obj.select_get() and obj not in saved_selected:obj.select_set(False)
    for obj in saved_selected:obj.select_set(True)
    saved_layer.objects.active=saved_active
result['restoredContext']={'scene':saved_scene.name,'viewLayer':saved_layer.name,
    'active':saved_active.name if saved_active else None,
    'selectedCount':len(bpy.context.selected_objects),
    'exactSelectionRestored':set(bpy.context.selected_objects)==set(saved_selected),
    'objectCountUnchanged':len(saved_scene.objects)==original_object_count}
print(json.dumps(result))
