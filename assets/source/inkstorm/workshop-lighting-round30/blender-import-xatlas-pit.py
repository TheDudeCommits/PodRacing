import bpy,json
scene=bpy.data.scenes['Inkstorm_Workshop_Round30_PitBake']
window=bpy.context.window;previous=window.scene;layer=window.view_layer;active=layer.objects.active;selected=[o for o in layer.objects if o.select_get(view_layer=layer)]
try:
 window.scene=scene
 old=bpy.data.objects['Round30_Pit_ExactSource_UVReceiver'];bpy.data.objects.remove(old,do_unlink=True)
 bpy.ops.import_scene.gltf(filepath='/Users/amir/Projects/PodRacing/assets/source/inkstorm/workshop-lighting-round30/pit-complex-xatlas-2048x2048-priority4-uv-export.glb',merge_vertices=False,import_shading='NORMALS')
 obj=next(o for o in scene.objects if o.type=='MESH');obj.name='Round30_Pit_ExactSource_UVReceiver'
 m=obj.data
 assert len(m.polygons)==12012
 if '_SOURCE_NORMAL' not in m.attributes:
  original=bpy.data.meshes['pit-complex-industrial-revision']
  normal_by_id={int(original.attributes['_SOURCE_ID'].data[v.index].value):tuple(original.attributes['_SOURCE_NORMAL'].data[v.index].vector) for v in original.vertices}
  ids=[int(d.value) for d in m.attributes['_SOURCE_ID'].data]
  attr=m.attributes.new('_SOURCE_NORMAL','FLOAT_VECTOR','POINT')
  attr.data.foreach_set('vector',[c for i in ids for c in normal_by_id[i]])
 m.materials.clear();m.materials.append(bpy.data.materials['Round30_White_Diffuse_BakeOnly'])
 for p in m.polygons:p.material_index=0
 image=bpy.data.images['Round30_Pit_DirectWhite_128s'];image.scale(2048,2048)
 for o in scene.objects:o.select_set(o==obj)
 window.view_layer.objects.active=obj
 print(json.dumps({'status':'VALIDATED_SQUARE_UV_READY_FOR_PIT128','triangles':len(m.polygons),'vertices':len(m.vertices),'sourceNormalDomain':m.attributes['_SOURCE_NORMAL'].domain,'imageSize':list(image.size),'lights':len([o for o in scene.objects if o.type=='LIGHT'])}))
finally:
 window.scene=previous;window.view_layer=layer;layer.objects.active=active
 for o in layer.objects:o.select_set(o in selected,view_layer=layer)
 snapshot=json.loads(scene['original_memberships_json'])
 assert {s.name:sorted(o.name for o in s.objects) for s in bpy.data.scenes if s.name in snapshot}==snapshot

