# Actual receipt-composed, temporary isolated selection, no material/image payload.
SOURCE=bpy.data.scenes[SOURCE_RECEIPT['scene']]
DAMAGE=bpy.data.scenes[DAMAGE_RECEIPT['scene']]
assert source_signature(SOURCE)==SOURCE_RECEIPT['sourceSignature']
assert source_signature(DAMAGE)==DAMAGE_RECEIPT['damageSignature']
assert bpy.context.mode=='OBJECT' and not bpy.app.is_job_running('RENDER')
STAGE='PodRacing — Teemto V16 geometry export temporary'
assert STAGE not in bpy.data.scenes
OUTPUT='/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/authored-damage-v16/teemto-damage-a-native.glb'
snapshot=global_snapshot()
stage=None
report={'stage':'V16 geometry-only export A','path':OUTPUT,'newTextures':0,'nodes':[]}
try:
    stage=bpy.data.scenes.new(STAGE)
    snapshot['window'].scene=stage;snapshot['window'].view_layer=stage.view_layers[0]
    for expected in DAMAGE_RECEIPT['lineage']:
        original=DAMAGE.objects[expected['object']]
        ob=original.copy();ob.parent=None;ob.matrix_world=original.matrix_world.copy()
        ob.name='V16_EXPORT_'+expected['object'];stage.collection.objects.link(ob)
        ob['runtimeName']=expected['object']
        ob.select_set(True)
        bpy.context.view_layer.objects.active=ob
        report['nodes'].append({'exportName':ob.name,'runtimeName':expected['object'],'pivotGame':expected['pivotGame'],'materialBinding':expected['material'],'triangles':expected['triangles']})
    result=bpy.ops.export_scene.gltf(filepath=OUTPUT,export_format='GLB',use_selection=True,use_active_scene=True,
        export_materials='NONE',export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True)
    assert result=={'FINISHED'}
    report['result']='FINISHED'
finally:
    for ob in list(bpy.data.objects):
        if ob not in snapshot['objects']:bpy.data.objects.remove(ob,do_unlink=True)
    if stage:bpy.data.scenes.remove(stage)
    report['preservation']=verify_global(snapshot)
    report['sourceExact']=source_signature(SOURCE)==SOURCE_RECEIPT['sourceSignature']
    report['damageExact']=source_signature(DAMAGE)==DAMAGE_RECEIPT['damageSignature']
    report['sourceNormalsExact']={o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in SOURCE.objects if o.type=='MESH'}==SOURCE_RECEIPT['sourceCornerNormalSignature']
    report['damageNormalsExact']={o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in DAMAGE.objects if o.type=='MESH'}==DAMAGE_RECEIPT['damageCornerNormalSignature']
    assert report['sourceExact'] and report['damageExact'] and report['sourceNormalsExact'] and report['damageNormalsExact']
    print('TEEMTO_DAMAGE_RECEIPT_BEGIN');print(json.dumps(report,sort_keys=True));print('TEEMTO_DAMAGE_RECEIPT_END')
