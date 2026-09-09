"""Disposable MCP probe only: compare packed setter vs float corner normals.
No export, bake, render, file API or shared scene/data edit. Root invokes it.
"""
import bpy
import json
import math
from mathutils import Matrix

SOURCE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/foundry-service-round33/predecessors/foundry-gantry-round32.glb'
STAGE = 'PodRacing — Foundry normal storage probe round33'
assert STAGE not in bpy.data.scenes and bpy.context.mode=='OBJECT'
window = bpy.context.window
old_scene,old_layer = window.scene,window.view_layer
old_active,old_selected = old_layer.objects.active,list(bpy.context.selected_objects)
old_collection = old_layer.active_layer_collection
scenes = {s:(set(s.objects),set(s.collection.children)) for s in bpy.data.scenes}
collections = {c:(set(c.objects),set(c.children)) for c in bpy.data.collections}
old_meshes,old_materials,old_images = set(bpy.data.meshes),set(bpy.data.materials),set(bpy.data.images)
meshes = set(); materials = set(); images = set(); imported_collections = set()
stage = None
report = {'kind':'normal storage probe','blenderVersion':bpy.app.version_string,'rendered':False,'exported':False}


def normal_values(mesh): return [tuple(n.vector) for n in mesh.corner_normals]


def evidence(mesh):
    return (tuple(tuple(v.co) for v in mesh.vertices),
            tuple((tuple(p.vertices),p.material_index,p.use_smooth) for p in mesh.polygons),
            tuple((a.name,a.domain,tuple(tuple(v.color) for v in a.data)) for a in mesh.color_attributes))


def metrics(before,after):
    delta = [max(abs(x-y) for x,y in zip(a,b)) for a,b in zip(before,after)]
    worst = max(range(len(delta)),key=delta.__getitem__)
    return {'maximumComponentDelta':max(delta),'changedCorners':sum(x!=0 for x in delta),
            'cornersOverOriginalGuard':sum(x>=3e-5 for x in delta),'worstCorner':worst,
            'worstBefore':before[worst],'worstAfter':after[worst]}


def storage(mesh):
    return [{'name':a.name,'type':a.data_type,'domain':a.domain} for a in mesh.attributes if a.name=='custom_normal']


try:
    stage = bpy.data.scenes.new(STAGE)
    window.scene = stage; window.view_layer = stage.view_layers[0]
    window.view_layer.active_layer_collection = window.view_layer.layer_collection
    try:
        result = bpy.ops.import_scene.gltf(filepath=SOURCE)
    finally:
        meshes.update(set(bpy.data.meshes)-old_meshes)
        materials.update(set(bpy.data.materials)-old_materials)
        images.update(set(bpy.data.images)-old_images)
        imported_collections.update(set(bpy.data.collections)-set(collections))
    assert 'FINISHED' in result
    objects = [o for o in stage.objects if o.type=='MESH']; assert len(objects)==1
    source = objects[0]
    source.data.transform(source.matrix_world); source.parent = None; source.matrix_world = Matrix.Identity(4)
    source.data.update(); source.data.calc_loop_triangles()
    assert len(source.data.loop_triangles)==6300
    original = normal_values(source.data); original_geometry = evidence(source.data)
    report['sourceStorage'] = storage(source.data)
    packed = source.data.copy(); meshes.add(packed)
    packed.normals_split_custom_set(original); packed.update()
    report['identicalCopyPackedSetter'] = metrics(original,normal_values(packed))
    report['packedStorage'] = storage(packed)
    floating = source.data.copy(); meshes.add(floating)
    attribute = floating.attributes.get('custom_normal')
    if attribute is not None: floating.attributes.remove(attribute)
    attribute = floating.attributes.new(name='custom_normal',type='FLOAT_VECTOR',domain='CORNER')
    assert attribute.name=='custom_normal' and attribute.data_type=='FLOAT_VECTOR'
    attribute.data.foreach_set('vector',[c for normal in original for c in normal])
    floating.update()
    report['identicalCopyFloatCorner'] = metrics(original,normal_values(floating))
    report['floatStorage'] = storage(floating)
    report['sourceGeometryExact'] = evidence(source.data)==original_geometry
    report['copiedGeometryExact'] = evidence(packed)==original_geometry and evidence(floating)==original_geometry
    report['sourceNormalsUntouched'] = normal_values(source.data)==original
    assert report['sourceGeometryExact'] and report['copiedGeometryExact'] and report['sourceNormalsUntouched']
    report['floatMethodPassesUnchangedGuard'] = report['identicalCopyFloatCorner']['maximumComponentDelta']<3e-5
    assert report['floatMethodPassesUnchangedGuard'], report['identicalCopyFloatCorner']
finally:
    window.scene = old_scene; window.view_layer = old_layer
    old_layer.active_layer_collection = old_collection
    if stage is not None:
        for obj in list(stage.objects): bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.scenes.remove(stage)
    for mesh in meshes:
        if mesh.users==0: bpy.data.meshes.remove(mesh)
    for material in materials:
        if material.users==0: bpy.data.materials.remove(material)
    for image in images:
        if image.users==0: bpy.data.images.remove(image)
    for collection in imported_collections:
        if collection.users==0: bpy.data.collections.remove(collection)
    for obj in old_layer.objects: obj.select_set(obj in old_selected,view_layer=old_layer)
    old_layer.objects.active = old_active
    intact = all((set(s.objects),set(s.collection.children))==value for s,value in scenes.items())
    intact_collections = all((set(c.objects),set(c.children))==value for c,value in collections.items())
    context = window.scene==old_scene and window.view_layer==old_layer and old_layer.objects.active==old_active and set(bpy.context.selected_objects)==set(old_selected)
    report['preservation'] = {'allExistingSceneMembershipsExact':intact,'allExistingCollectionMembershipsExact':intact_collections,
                              'contextRestored':context,'scene':old_scene.name,'active':old_active.name if old_active else None,
                              'selectedCount':len(old_selected),'temporaryProbeSceneRemoved':STAGE not in bpy.data.scenes}
    assert intact and intact_collections and context
    print(json.dumps(report,sort_keys=True))
