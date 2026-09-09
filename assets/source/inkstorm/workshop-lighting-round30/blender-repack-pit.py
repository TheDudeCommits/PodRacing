# REJECTED DIAGNOSTIC HISTORY ONLY. This attempt used a stale UV RNA handle
# after edit-mode conversion and failed the source-ID audit. Do not reproduce
# it as part of the delivered pipeline; use uv-xatlas.mjs instead.
import bpy, json
scene=bpy.data.scenes['Inkstorm_Workshop_Round30_PitBake']
obj=bpy.data.objects['Round30_Pit_ExactSource_UVReceiver']
window=bpy.context.window
original_scene=window.scene
original_layer=window.view_layer
active=original_layer.objects.active
selected=[o for o in original_layer.objects if o.select_get(view_layer=original_layer)]
try:
 window.scene=scene
 for o in scene.objects:o.select_set(o==obj)
 window.view_layer.objects.active=obj
 old=obj.data
 ids=old.attributes['_SOURCE_ID']
 source_normals=old.attributes['_SOURCE_NORMAL']
 unique={};vertices=[];old_to_new=[]
 for v in old.vertices:
  key=tuple(v.co)
  if key not in unique:unique[key]=len(vertices);vertices.append(key)
  old_to_new.append(unique[key])
 faces=[[old_to_new[v] for v in p.vertices] for p in old.polygons]
 corner_ids=[ids.data[l.vertex_index].value for l in old.loops]
 corner_normals=[tuple(n.vector) for n in old.corner_normals]
 source_normal_values=[tuple(source_normals.data[l.vertex_index].vector) for l in old.loops]
 mesh=bpy.data.meshes.new('Round30_Pit_UVConnectivity_Only')
 mesh.from_pydata(vertices,[],faces)
 assert len(mesh.polygons)==12012
 assert all(len(p.vertices)==3 for p in mesh.polygons)
 source_id=mesh.attributes.new('_SOURCE_ID','FLOAT','CORNER')
 source_id.data.foreach_set('value',corner_ids)
 source_n=mesh.attributes.new('_SOURCE_NORMAL','FLOAT_VECTOR','CORNER')
 source_n.data.foreach_set('vector',[c for v in source_normal_values for c in v])
 for p in mesh.polygons:p.use_smooth=True
 mesh.normals_split_custom_set(corner_normals)
 mesh.materials.append(bpy.data.materials['Round30_White_Diffuse_BakeOnly'])
 obj.data=mesh
 uv=mesh.uv_layers.new(name='WorkshopDirectUV')
 mesh.uv_layers.active=uv;uv.active_render=True
 bpy.ops.object.mode_set(mode='EDIT')
 bpy.ops.mesh.select_all(action='SELECT')
 bpy.ops.uv.smart_project(angle_limit=1.1519173063162575,island_margin=0,area_weight=0,correct_aspect=True,scale_to_bounds=True)
 bpy.ops.uv.pack_islands(udim_source='CLOSEST_UDIM',rotate=True,margin_method='FRACTION',margin=.017,shape_method='CONVEX')
 bpy.ops.object.mode_set(mode='OBJECT')
 for loop in uv.data:loop.uv=(8/2048+loop.uv.x*(1-16/2048),8/1024+loop.uv.y*(1-16/1024))
 bpy.ops.export_scene.gltf(filepath='/Users/amir/Projects/PodRacing/assets/source/inkstorm/workshop-lighting-round30/pit-complex-uv-export.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_texcoords=True,export_normals=True,export_attributes=True,export_materials='NONE',export_animations=False,export_cameras=False,export_lights=False)
 print(json.dumps({'status':'UV_CONNECTIVITY_ONLY_REPACK_NOT_BAKED','temporaryVertices':len(vertices),'sourceTriangles':len(mesh.polygons),'sourceIDsDomain':source_id.domain,'positionsMergedOnlyWhenExact':True}))
finally:
 if bpy.context.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
 window.scene=original_scene
 window.view_layer=original_layer
 original_layer.objects.active=active
 for o in original_layer.objects:o.select_set(o in selected,view_layer=original_layer)
 snapshot=json.loads(scene['original_memberships_json'])
 assert {s.name:sorted(o.name for o in s.objects) for s in bpy.data.scenes if s.name in snapshot}==snapshot
